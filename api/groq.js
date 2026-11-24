/**
 * Vercel Serverless Function: Groq API Reverse Proxy
 * Resolves CORS restrictions and provides dynamic model discovery & automatic fallback.
 */

// In-memory cache for available models per API key
const modelsCache = new Map();

async function getAvailableModelsForApiKey(apiKey) {
  const cached = modelsCache.get(apiKey);
  if (cached && cached.timestamp > Date.now() - 1000 * 60 * 10) {
    return cached.models;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        // Filter out audio (whisper) and safeguard models, keep text/chat models
        const chatModels = data.data
          .map(m => m.id)
          .filter(id => !id.includes('whisper') && !id.includes('guard'));

        if (chatModels.length > 0) {
          modelsCache.set(apiKey, { models: chatModels, timestamp: Date.now() });
          return chatModels;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch available Groq models:', err);
  }

  // Fallback defaults in order of preference
  return [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile'
  ];
}

export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract API key from Authorization header or fallback to environment variables
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || '';
    const incomingKey = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

    const serverKey =
      process.env.GROQ_API_KEY ||
      process.env.VITE_GROQ_API_KEY ||
      process.env.VITE_GROQ_API_KEY_FALLBACK ||
      process.env.VITE_GROQ_API_KEY_3 ||
      process.env.VITE_GROQ_API_KEY_4 || '';

    const apiKey = incomingKey || serverKey;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: 'Groq API key not found. Please provide an Authorization header or set GROQ_API_KEY in your Vercel project environment variables.'
        }
      });
    }

    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        // use as-is
      }
    }

    const requestedModel =
      payload.model ||
      process.env.GROQ_MODEL ||
      process.env.VITE_GROQ_MODEL ||
      'openai/gpt-oss-20b';

    // Helper to execute chat completion call
    const executeCall = async (modelToUse) => {
      const currentPayload = {
        ...payload,
        model: modelToUse
      };

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentPayload)
      });

      const responseText = await groqRes.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { text: responseText };
      }

      return { res: groqRes, data, text: responseText };
    };

    // 1. Attempt with requested model
    let result = await executeCall(requestedModel);

    if (result.res.ok) {
      return res.status(200).json(result.data);
    }

    // 2. Check if the error is specifically that the model doesn't exist or access is denied
    const errMsg = (result.data?.error?.message || result.text || '').toLowerCase();
    const isModelError =
      result.res.status === 404 ||
      errMsg.includes('does not exist or you do not have access') ||
      errMsg.includes('model_not_found') ||
      errMsg.includes('decommissioned');

    if (isModelError) {
      console.warn(`Model ${requestedModel} not accessible: ${errMsg}. Discovering active models for API key...`);

      // Dynamically discover models supported by this specific API key
      const availableModels = await getAvailableModelsForApiKey(apiKey);

      const preferredFallbacks = [
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b',
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile'
      ];

      const orderedCandidates = [
        ...preferredFallbacks.filter(m => availableModels.includes(m) && m !== requestedModel),
        ...availableModels.filter(m => m !== requestedModel)
      ];

      const modelsToTry = [...new Set(orderedCandidates)];

      for (const fallbackModel of modelsToTry) {
        console.warn(`Retrying with discovered model: ${fallbackModel}...`);
        const fallbackResult = await executeCall(fallbackModel);
        if (fallbackResult.res.ok) {
          return res.status(200).json(fallbackResult.data);
        }
        result = fallbackResult;
      }
    }

    return res.status(result.res.status).json(result.data);
  } catch (error) {
    console.error('Groq proxy error:', error);
    return res.status(500).json({
      error: {
        message: error?.message || 'Internal proxy error connecting to Groq API'
      }
    });
  }
}
