// netlify/functions/gemini-proxy.js
exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Dynamically import node-fetch
    const fetch = (await import('node-fetch')).default;
    
    const { message } = JSON.parse(event.body);
    
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message format');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message
            }]
          }],
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ],
          generationConfig: {
            temperature: 0.9,
            topP: 1,
            topK: 40,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const responseData = await response.json();
    
    // Extract the generated text safely
    const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || 
                         "I couldn't generate a response. Please try again.";

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        response: generatedText
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Internal Server Error' 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};