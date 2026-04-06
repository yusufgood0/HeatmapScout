// config.ts - safe access to Vite environment variables

// Ensure Vite env is defined (only true in Vite bundles)
if (!import.meta.env) {
  throw new Error(
    "import.meta.env is undefined. Make sure you are running this code through Vite (npm run dev or npm run build)."
  );
}

// Load and validate variables
const API_KEY = import.meta.env.VITE_API_KEY;
const SHEET_ID = import.meta.env.VITE_SHEET_ID;

if (!API_KEY) {
  throw new Error(
    "VITE_API_KEY is not defined! Add it to your .env file (local) or GitHub Secrets (CI) with the VITE_ prefix."
  );
}

if (!SHEET_ID) {
  throw new Error(
    "VITE_SHEET_ID is not defined! Add it to your .env file (local) or GitHub Secrets (CI) with the VITE_ prefix."
  );
}

// Export constants safely
export { API_KEY, SHEET_ID };