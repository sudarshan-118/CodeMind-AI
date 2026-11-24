/**
 * Centralized Groq AI Configuration & Helpers
 * Handles base URL selection, model selection, and API key management across development and production environments.
 */

export const getGroqBaseUrl = (): string => {
  // In development, Vite dev server proxies /api-groq to https://api.groq.com.
  // In Vercel production, vercel.json rewrites /api-groq to the /api/groq serverless function,
  // completely avoiding browser CORS restrictions.
  return '/api-groq';
};

/**
 * Default Groq model.
 * Defaults to 'openai/gpt-oss-20b', which is active and available on Groq Free and Developer tiers.
 * Can be customized via VITE_GROQ_MODEL in environment variables.
 */
export const getGroqModel = (): string => {
  return (
    import.meta.env.VITE_GROQ_MODEL ||
    'openai/gpt-oss-20b'
  );
};

export const getGroqApiKeys = (): string[] => {
  return [
    import.meta.env.VITE_GROQ_API_KEY,
    import.meta.env.VITE_GROQ_API_KEY_FALLBACK,
    import.meta.env.VITE_GROQ_API_KEY_3,
    import.meta.env.VITE_GROQ_API_KEY_4
  ].filter((k): k is string => typeof k === 'string' && k.trim() !== '');
};

/**
 * Returns keys to try. If client-side VITE keys are empty, returns a single empty string
 * so the serverless proxy on Vercel can use server-side GROQ_API_KEY from environment variables.
 */
export const getGroqExecutionKeys = (): string[] => {
  const keys = getGroqApiKeys();
  return keys.length > 0 ? keys : [''];
};
