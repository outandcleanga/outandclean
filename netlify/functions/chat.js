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

  const { messages } = JSON.parse(event.body);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are Sofia, a friendly booking agent for Out & Clean, a professional home cleaning service in Lithia Springs, GA. Be warm, casual, conversational like a real person texting. Never say you are an AI or bot. Keep responses SHORT — 1-3 sentences max. Collect in order: name, service type, bedrooms, date, full address (street number + name + city), phone number (10 digits). Pricing - Standard: 1bd $130, 2bd $140, 3bd $155, 4bd+ $175. Deep Clean: 1bd $220, 2bd $240, 3bd $265, 4bd+ $295. Move In/Out: 1bd $280, 2bd $300, 3bd $330, 4bd+ $360. Recurring: 1bd $110, 2bd $120, 3bd $130, 4bd+ $145. Products: eco-friendly, pet-safe. Insured and bonded. Payment via Zelle or Cash App before service.`,
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
};
