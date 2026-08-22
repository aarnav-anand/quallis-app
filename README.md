# Quallis — Crop Intelligence Platform
> A product by AgriFusion

A mobile-first web app for AI-powered crop scan analysis using Supabase and Google Gemini.

---

## 🚀 Setup Instructions

### 1. Configure API Keys

Open **`js/config.js`** and replace the placeholder values:

```js
const CONFIG = {
  SUPABASE_URL:      "https://YOUR_PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  GEMINI_API_KEY:    "YOUR_GEMINI_API_KEY",
};
```

#### Getting your Supabase credentials
1. Go to [supabase.com](https://supabase.com) → your project
2. Click **Project Settings → API**
3. Copy **Project URL** → `SUPABASE_URL`
4. Copy **anon/public key** → `SUPABASE_ANON_KEY`

#### Getting your Gemini API key
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a new key → paste into `GEMINI_API_KEY`

---

### 2. Supabase Database Schema

Your `public.farmers` table should have these columns:

| Column        | Type          | Notes                              |
|---------------|---------------|------------------------------------|
| `id`          | uuid (PK)     | Auto-generated                     |
| `created_at`  | timestamptz   | Auto-generated                     |
| `farmer_name` | text          | Display name                       |
| `phone_number`| text          | Optional                           |
| `dif_code`    | varchar       | 4-character code, e.g. `SV69`      |
| `quallis`     | int4          | Scan credit counter                |
| `role`        | text          | `admin` or `farmer`                |
| `is_verified` | bool          |                                    |
| `password_hash`| text         |                                    |
| `croplens`    | int4          |                                    |
| `senseorbit`  | int4          |                                    |
| `dizmatrix`   | int4          |                                    |

> **Note:** The `dif_code` login lookup is case-insensitive — the app uppercases input automatically.

#### RLS Policy (recommended)
If you have RLS enabled, add a policy to allow `anon` to SELECT from `farmers` where `dif_code = <value>`, and UPDATE the `quallis` field.

Sample SQL:
```sql
-- Allow anon to read farmers by dif_code
CREATE POLICY "anon read by dif_code" ON public.farmers
  FOR SELECT TO anon
  USING (true);

-- Allow anon to update quallis
CREATE POLICY "anon update quallis" ON public.farmers
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
```

---

### 3. Deploy

The app is **pure HTML/CSS/JS** — no build step needed.

**Options:**
- Drag the folder into [Netlify Drop](https://app.netlify.com/drop)
- Push to GitHub and connect to [Vercel](https://vercel.com)
- Serve with any static host (Nginx, Apache, GitHub Pages)

---

## 📱 Features

- **DIF Code Login** — 4-digit PIN entry with auto-focus
- **Quallis Credits** — displayed live; decremented after each successful scan
- **3-Step Scan Wizard** — crop name → Quallis code → image upload
- **Gemini Vision AI** — analyses the crop photo and returns advice
- **Bilingual Output** — English & Hindi with toggle
- **Mobile-First** — responsive down to 360px, touch-friendly
- **Credits Exhausted** — shows purchase link when counter hits 0

---

## 🗂 File Structure

```
agrifusion/
├── index.html          # Main HTML
├── css/
│   └── style.css       # All styles
├── js/
│   ├── config.js       # ← PUT YOUR KEYS HERE
│   ├── i18n.js         # Hindi/English translations
│   ├── supabase.js     # Database client (REST, no SDK)
│   ├── gemini.js       # Gemini Vision API
│   └── app.js          # Main app controller
└── README.md
```

---

## ⚠️ Security Note

This app uses your Supabase **anon** key (safe for client-side) and Gemini API key. For production:
- Enable **RLS** on your Supabase table so users can only update their own row
- Consider proxying the Gemini API call through a serverless function to hide the key
