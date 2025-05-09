// netlify/functions/gemini-proxy.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  // Debugging logs
  console.log("Incoming event:", JSON.stringify({
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : null
  }, null, 2));

  // Enhanced CORS headers (reusable)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET"
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    };
  }

  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // Parse and validate body
    if (!event.body) {
      throw new Error("Request body is missing");
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (e) {
      throw new Error("Invalid JSON body");
    }

    const { message, chatHistory = [] } = parsedBody;
    
    if (!message?.trim()) {
      throw new Error("Message cannot be empty");
    }

    // Validate chat history structure
    if (!Array.isArray(chatHistory)) {
      throw new Error("chatHistory must be an array");
    }

   // Inside your exports.handler, modify the chat history preparation:

const chat = model.startChat({
  history: chatHistory
    // Filter out the initial AI greeting if it's first
    .filter((msg, index) => !(index === 0 && msg.sender === 'ai'))
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))
});

    // Add timeout for the API call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const result = await chat.sendMessage(message, { signal: controller.signal });
    clearTimeout(timeout);
    
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        response: text,
        chatHistory: [
          ...chatHistory,
          { sender: 'user', text: message },
          { sender: 'ai', text: text }
        ]
      }),
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    };

  } catch (error) {
    console.error("Full Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    const statusCode = error.message.includes("API key") ? 401 : 
                      error.message.includes("JSON") ? 400 : 
                      error.name === "AbortError" ? 504 : 500;

    return {
      statusCode,
      body: JSON.stringify({ 
        error: error.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: error.stack })
      }),
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    };
  }
};