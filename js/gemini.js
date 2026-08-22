// ══════════════════════════════════════════════
//  Quallis — Gemini Vision API
//  Sends crop image + metadata and returns
//  analysis in both English and Hindi.
// ══════════════════════════════════════════════

const gemini = (() => {
  const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Analyse a crop image.
   * @param {string} cropName    - e.g. "Wheat"
   * @param {string} quallisCode - decrypted code string
   * @param {string} base64Image - base64-encoded image data (without prefix)
   * @param {string} mimeType    - e.g. "image/jpeg"
   * @returns {{ en: string, hi: string }}
   */
  async function analyzeCrop(cropName, quallisCode, base64Image, mimeType) {
    const prompt = buildPrompt(cropName, quallisCode);

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(
      `${BASE_URL}/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return parseResponse(rawText);
  }

  /** Build the structured prompt */
  function buildPrompt(cropName, quallisCode) {
    return `You are Quallis, an expert agricultural AI assistant serving farmers in India.

A farmer has submitted the following crop scan for analysis:
- Crop: ${cropName}
- Quallis Reference Code: ${quallisCode}

Look carefully at the uploaded crop image. Provide a detailed analysis covering:
1. **Crop Health Status** – Is the crop healthy, stressed, diseased, or pest-affected?
2. **Diagnosis** – Identify any visible disease, deficiency, pest damage, or abiotic stress. Be specific.
3. **Severity** – Rate severity (Mild / Moderate / Severe).
4. **Recommended Actions** – Provide 3–5 specific, actionable treatment or prevention steps that an Indian farmer can realistically implement. Include organic and chemical options where applicable.
5. **Preventive Measures** – Suggest 2–3 steps to prevent recurrence.
6. **Best Time to Act** – When should the farmer take action?

IMPORTANT: Structure your response EXACTLY as follows, with no extra text outside these sections:

===ENGLISH===
[Your full English analysis here using markdown headers and bullet points]

===HINDI===
[Your full Hindi analysis here in Devanagari script using markdown headers and bullet points. Make sure all content is accurately translated and culturally appropriate for Indian farmers.]
===END===`;
  }

  /** Parse "===ENGLISH===...===HINDI===...===END===" format */
  function parseResponse(raw) {
    const enMatch = raw.match(/===ENGLISH===\s*([\s\S]*?)===HINDI===/);
    const hiMatch = raw.match(/===HINDI===\s*([\s\S]*?)===END===/);

    const en = enMatch ? enMatch[1].trim() : raw;
    const hi = hiMatch ? hiMatch[1].trim() : "विश्लेषण उपलब्ध नहीं है।";

    return {
      en: markdownToHtml(en),
      hi: markdownToHtml(hi),
    };
  }

  /** Minimal markdown → HTML converter */
  function markdownToHtml(md) {
    return md
      // Headers
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h2>$1</h2>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Bullet list items
      .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
      // Numbered list items
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>[\s\S]*?<\/li>)(\s*(?!<li>))/g, "<ul>$1</ul>$2")
      // Paragraphs (double newline → <p>)
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/^(.+)$/, "<p>$1</p>")
      // Fix doubled paragraph wrapping around block elements
      .replace(/<p>(<[hul])/g, "$1")
      .replace(/(<\/[hul][^>]*>)<\/p>/g, "$1")
      // Clean up extra whitespace-only paragraphs
      .replace(/<p>\s*<\/p>/g, "")
      .trim();
  }

  return { analyzeCrop };
})();
