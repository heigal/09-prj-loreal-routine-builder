# Project 9: L'Oréal Routine Builder

L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Setup Instructions

### 1. Set up your environment

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and replace `sk-proj-your-api-key-here` with your actual OpenAI API key.

### 2. Start the backend server

The backend proxy handles OpenAI API calls securely (avoiding CORS issues):

```bash
node server.js
```

You should see: `Backend server running on http://localhost:3000`

### 3. Open the app

The app runs as a static site. If using GitHub Pages or a local server, the frontend will connect to your backend at `http://localhost:3000/api/chat`.

**Note:** The backend server must be running for the app to work properly.
