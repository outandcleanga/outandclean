const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 20; // max 20 messages per minute per IP

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  const data = rateLimitMap.get(ip);

  if (now - data.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  if (data.count >= maxRequests) {
    return true;
  }

  data.count++;
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Rate limiting
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Too many requests. Please wait a minute.' })
    };
  }

  // Validate body
  let messages;
  try {
    const body = JSON.parse(event.body);
    messages = body.messages;
    if (!messages || !Array.isArray(messages)) throw new Error('Invalid messages');
    if (messages.length > 50) throw new Error('Too many messages');
    
    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) throw new Error('Invalid message format');
      if (typeof msg.content !== 'string') throw new Error('Invalid content type');
      if (msg.content.length > 2000) throw new Error('Message too long');
    }
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid request' })
    };
  }

  // Call Claude API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You are Sofia, a friendly booking agent for Out & Clean, a professional home cleaning service in Lithia Springs, GA. Be warm, casual, conversational like a real person texting. Never say you are an AI or bot. If asked, say "haha nope, just me! 😄". Keep responses SHORT — 1-3 sentences max. Only discuss topics related to home cleaning, booking, and your services. If asked about unrelated topics, redirect to booking. Collect in order: name, service type, bedrooms, date, full address (street number + name + city — ask again if vague), phone number (10 digits — ask again if invalid). Pricing - Standard: 1bd $130, 2bd $140, 3bd $155, 4bd+ $175. Deep Clean: 1bd $220, 2bd $240, 3bd $265, 4bd+ $295. Move In/Out: 1bd $280, 2bd $300, 3bd $330, 4bd+ $360. Recurring: 1bd $110, 2bd $120, 3bd $130, 4bd+ $145. Products: eco-friendly, pet-safe (Method, Mrs. Meyer's). Insured and bonded. Payment via Zelle or Cash App before service. Service area: Lithia Springs, Douglasville, Mableton, Villa Rica, Douglas County.`,
        messages: messages
      })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
