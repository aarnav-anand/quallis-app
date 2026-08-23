// ══════════════════════════════════════════════
//  Quallis — Supabase REST Client
//  Uses the Supabase REST API directly (no SDK)
//  so there's zero build step needed.
// ══════════════════════════════════════════════

const db = (() => {
  function headers() {
    return {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      Prefer: "return=representation",
    };
  }

  function url(table, params = "") {
    return `${CONFIG.SUPABASE_URL}/rest/v1/${table}${params}`;
  }

  function isConfigured() {
    return (
      Boolean(CONFIG.SUPABASE_URL) &&
      Boolean(CONFIG.SUPABASE_ANON_KEY) &&
      !CONFIG.SUPABASE_URL.includes("YOUR_PROJECT_ID")
    );
  }

  // Demo state for local testing when backend credentials are not set
  let demoQuallis = 10;

  /**
   * Find a farmer by DIF code.
   * Returns the farmer row (object) or null if not found.
   */
  async function findByDifCode(code) {
    if (!isConfigured()) {
      console.warn("Supabase credentials not configured in js/config.js. Running in demo mode.");
      return {
        id: "demo-farmer-id",
        farmer_name: "Demo Farmer",
        quallis: demoQuallis,
        dif_code: code.toUpperCase(),
        role: "farmer",
      };
    }

    const encoded = encodeURIComponent(code.toUpperCase());
    const res = await fetch(
      url(CONFIG.TABLE_FARMERS, `?dif_code=eq.${encoded}&select=id,farmer_name,quallis,dif_code,role`),
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`DB error: ${res.status}`);
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  }

  /**
   * Decrement the `quallis` credit by 1 for a given farmer id.
   * Returns the updated row.
   */
  async function decrementQuallis(farmerId) {
    if (!isConfigured()) {
      demoQuallis = Math.max(0, demoQuallis - 1);
      return { quallis: demoQuallis };
    }

    // First fetch current value to avoid race conditions
    const res1 = await fetch(
      url(CONFIG.TABLE_FARMERS, `?id=eq.${farmerId}&select=quallis`),
      { headers: headers() }
    );
    if (!res1.ok) throw new Error(`DB error: ${res1.status}`);
    const rows = await res1.json();
    if (!rows.length) throw new Error("Farmer not found");
    const current = rows[0].quallis;
    if (current <= 0) return { quallis: 0 };

    const res2 = await fetch(url(CONFIG.TABLE_FARMERS, `?id=eq.${farmerId}`), {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ quallis: current - 1 }),
    });
    if (!res2.ok) throw new Error(`DB patch error: ${res2.status}`);
    const updated = await res2.json();
    return updated[0] ?? { quallis: current - 1 };
  }

  /**
   * Fetch latest quallis count for a given farmer id.
   */
  async function getQuallis(farmerId) {
    if (!isConfigured()) {
      return demoQuallis;
    }

    const res = await fetch(
      url(CONFIG.TABLE_FARMERS, `?id=eq.${farmerId}&select=quallis`),
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`DB error: ${res.status}`);
    const data = await res.json();
    return data.length > 0 ? data[0].quallis : 0;
  }

  return { findByDifCode, decrementQuallis, getQuallis };
})();
