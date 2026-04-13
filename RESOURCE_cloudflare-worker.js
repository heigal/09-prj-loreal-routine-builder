export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST for chat requests.
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    const apiKey = env.OPENAI_API_KEY; // Make sure to name your secret OPENAI_API_KEY in the Cloudflare Workers dashboard
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const userInput = await request.json();

    if (!userInput || !Array.isArray(userInput.messages)) {
      return new Response(
        JSON.stringify({
          error: "Request body must include a messages array.",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_completion_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: corsHeaders,
    });
  },
};
