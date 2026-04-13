addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed." } }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { message: "Invalid JSON body." } }, 400);
  }

  const messages = body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse(
      { error: { message: "messages must be a non-empty array." } },
      400,
    );
  }

  if (!OPENAI_API_KEY) {
    return jsonResponse(
      { error: { message: "Missing OPENAI_API_KEY in Worker secrets." } },
      500,
    );
  }

  try {
    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature: 0.7,
        }),
      },
    );

    const data = await openAiResponse.json();

    return jsonResponse(data, openAiResponse.status);
  } catch {
    return jsonResponse(
      {
        error: { message: "Could not reach OpenAI from Cloudflare Worker." },
      },
      502,
    );
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
