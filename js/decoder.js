// ══════════════════════════════════════════════
//  Quallis — Hardware Code Decoder
//  Decodes the QLS-XX-YY-TT-HH-CC code emitted
//  by the Quallis hardware box (ESP32 + sensors).
//  Pure math — no server call needed.
// ══════════════════════════════════════════════

const decoder = (() => {

  // Modified Base-36 alphabet — excludes O and I to avoid LCD ambiguity
  const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 34 chars

  /**
   * Convert a 2-character modified-Base-34 string to an integer (0–1155).
   */
  function fromBase34(str) {
    let result = 0;
    for (const ch of str.toUpperCase()) {
      const idx = ALPHABET.indexOf(ch);
      if (idx === -1) throw new Error(`INVALID_CHAR:${ch}`);
      result = result * 34 + idx;
    }
    return result;
  }

  /**
   * Decode a Quallis hardware code.
   *
   * Expected format: QLS-XX-YY-TT-HH-CC
   *   XX — MQ3 ethanol   (0–500 ppm)
   *   YY — MQ4 methane   (0–10 000 ppm)
   *   TT — Temperature   (0–50 °C)
   *   HH — Humidity      (0–100 %)
   *   CC — Checksum
   *
   * @param {string} raw — code string as typed by user
   * @returns {{ ethanol_ppm: number, methane_ppm: number, temperature_c: number, humidity_pct: number }}
   * @throws Error with a user-friendly message
   */
  function decodeQuallis(raw) {
    const code = raw.trim().toUpperCase();

    // 1. Validate prefix
    if (!code.startsWith("QLS-")) {
      throw new Error("NOT_QUALLIS_CODE");
    }

    // 2. Split and validate segment count
    const parts = code.split("-");
    if (parts.length !== 6) {
      throw new Error("MALFORMED_CODE");
    }

    const [, XX, YY, TT, HH, CC] = parts;

    // 3. Validate all segments are exactly 2 chars
    for (const [name, seg] of [["XX", XX], ["YY", YY], ["TT", TT], ["HH", HH], ["CC", CC]]) {
      if (!seg || seg.length !== 2) {
        throw new Error("MALFORMED_CODE");
      }
    }

    // 4. Decode each segment (will throw INVALID_CHAR if bad character)
    let mq3Scaled, mq4Scaled, tempScaled, humScaled, checksum;
    try {
      mq3Scaled  = fromBase34(XX);
      mq4Scaled  = fromBase34(YY);
      tempScaled = fromBase34(TT);
      humScaled  = fromBase34(HH);
      checksum   = fromBase34(CC);
    } catch (e) {
      if (e.message.startsWith("INVALID_CHAR")) {
        throw new Error("INVALID_CHAR");
      }
      throw e;
    }

    // 5. Validate checksum
    const expected = (mq3Scaled ^ mq4Scaled ^ tempScaled ^ humScaled) % 1156;
    if (checksum !== expected) {
      throw new Error("CHECKSUM_FAIL");
    }

    // 6. Reverse-scale to physical values
    return {
      ethanol_ppm:   +(mq3Scaled  / 1155 * 500).toFixed(2),
      methane_ppm:   +(mq4Scaled  / 1155 * 10000).toFixed(2),
      temperature_c: +(tempScaled / 1155 * 50).toFixed(2),
      humidity_pct:  +(humScaled  / 1155 * 100).toFixed(2),
    };
  }

  /**
   * Returns a human-friendly error message for a given error code.
   * @param {Error} err
   * @param {"en"|"hi"} lang
   */
  function getErrorMessage(err, lang = "en") {
    const messages = {
      en: {
        NOT_QUALLIS_CODE: "Not a valid Quallis code. Must start with QLS-",
        MALFORMED_CODE:   "Code format incorrect — check for missing characters.",
        CHECKSUM_FAIL:    "Code appears corrupted — please re-enter from the display.",
        INVALID_CHAR:     "Invalid character detected — avoid using O or I.",
        DEFAULT:          "Invalid Quallis code. Please check and try again.",
      },
      hi: {
        NOT_QUALLIS_CODE: "यह मान्य Quallis कोड नहीं है। QLS- से शुरू होना चाहिए।",
        MALFORMED_CODE:   "कोड का प्रारूप गलत है — कोई अक्षर छूट गया हो सकता है।",
        CHECKSUM_FAIL:    "कोड दूषित लग रहा है — कृपया डिस्प्ले से दोबारा दर्ज करें।",
        INVALID_CHAR:     "अमान्य अक्षर — O या I का उपयोग न करें।",
        DEFAULT:          "अमान्य Quallis कोड। कृपया जांचें और पुनः प्रयास करें।",
      },
    };
    const map = messages[lang] || messages.en;
    const key = err.message in map ? err.message : "DEFAULT";
    return map[key];
  }

  return { decodeQuallis, getErrorMessage };
})();
