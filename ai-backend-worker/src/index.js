export default {
  async fetch(request, env) {
    // حل مشکل CORS برای ارتباط فرانت‌اَند با ورکر
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // پاسخ به درخواست‌های پیش‌پرواز CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const { text, language } = await request.json();

      if (!text || !language) {
        return new Response(JSON.stringify({ error: "Text and Language are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // خواندن امن کلید OpenRouter از متغیرهای محیطی کلودفلر
      const apiKey = env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "API Key is not configured on Worker" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ارسال درخواست به OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "PollyGlot App",
        },
        body: JSON.stringify({
          model: "openrouter/auto",
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following text into ${language}. Only return the direct translation without any extra explanations or notes.`,
            },
            {
              role: "user",
              content: `Translate this to ${language}: ${text}`,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch from OpenRouter");
      }

      const translation = data.choices[0].message.content.trim();

      return new Response(JSON.stringify({ translation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};