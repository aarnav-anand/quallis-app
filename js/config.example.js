// ══════════════════════════════════════════════
//  Quallis — Configuration
//  ⚠️  Replace the placeholder values below with
//      your actual credentials before deploying.
// ══════════════════════════════════════════════

const CONFIG = {
  // ── Supabase ──────────────────────────────────
  // Get these from: Supabase Dashboard → Project Settings → API
  SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",

  // ── Gemini ────────────────────────────────────
  // Get this from: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY",

  // ── Gemini Model ─────────────────────────────
  GEMINI_MODEL: "gemini-1.5-flash",

  // ── App Settings ─────────────────────────────
  TABLE_FARMERS: "farmers",
};

// Freeze to prevent accidental mutation
Object.freeze(CONFIG);
