// COMPANION :: OPS — Cloudflare Worker
// Proxies requests to Groq API, keeps your API key secure server-side

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // Replace this after deployment
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

// CORS headers — allow requests from your Netlify domain
// Change '*' to your actual domain once deployed e.g. 'https://companion-ops.netlify.app'
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default {
  async fetch(request) {

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS });
    }

    const { system, messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: CORS });
    }

    // Build Groq payload
    const payload = {
      model: GROQ_MODEL,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system || 'You are a helpful gaming assistant.' },
        ...messages,
      ],
    };

    try {
      const groqResp = await fetch(GROQ_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!groqResp.ok) {
        const err = await groqResp.text();
        return new Response(JSON.stringify({ error: `Groq error ${groqResp.status}: ${err}` }), { status: 502, headers: CORS });
      }

      const data = await groqResp.json();
      const content = data?.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ content }), { status: 200, headers: CORS });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to reach Groq: ' + err.message }), { status: 502, headers: CORS });
    }
  }
};
