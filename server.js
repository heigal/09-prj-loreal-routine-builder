// Simple backend proxy server to handle OpenAI API calls
// This avoids CORS issues by making requests server-to-server

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Read .env file to get configuration
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, value] = trimmed.split("=");
        if (key) {
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

loadEnv();

// Get API key from environment variable (more secure than hardcoding)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is not set");
  console.error("Make sure .env file exists with OPENAI_API_KEY defined");
  process.exit(1);
}

// Create and start the server
const server = http.createServer((req, res) => {
  // Enable CORS for requests from GitHub Pages
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API requests
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const requestData = JSON.parse(body);

        // Forward the request to OpenAI
        const openaiRequest = https.request(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
          },
          (openaiResponse) => {
            let openaiBody = "";

            openaiResponse.on("data", (chunk) => {
              openaiBody += chunk.toString();
            });

            openaiResponse.on("end", () => {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(openaiBody);
            });
          },
        );

        openaiRequest.on("error", (error) => {
          console.error("Error calling OpenAI API:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to call OpenAI API" }));
        });

        // Send the request body to OpenAI
        openaiRequest.write(JSON.stringify(requestData));
        openaiRequest.end();
      } catch (error) {
        console.error("Error parsing request:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/chat`);
});
