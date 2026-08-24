// ══════════════════════════════════════════════
//  Quallis — Gemini Vision API
//  Sends post-harvest crop image + decoded sensor
//  data and returns quality analysis in the requested language.
// ══════════════════════════════════════════════

const gemini = (() => {
  const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Analyse a post-harvest crop image.
   * @param {string} cropName       - e.g. "Wheat"
   * @param {object} sensorData     - decoded sensor object from decoder.js
   *   { ethanol_ppm, methane_ppm, temperature_c, humidity_pct }
   * @param {string} base64Image    - base64-encoded image data (without prefix)
   * @param {string} mimeType       - e.g. "image/jpeg"
   * @param {string} lang           - "en" | "hi"
   * @returns {{ html: string }}
   */
  async function analyzeCrop(cropName, sensorData, base64Image, mimeType, lang = "en") {
    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY")) {
      console.warn("Gemini API key missing in js/config.js. Returning simulated analysis.");
      const demoHtml = lang === "hi"
        ? `<h3>${cropName} की गुणवत्ता रिपोर्ट (डेमो मोड)</h3><p><strong>कुल ग्रेड:</strong> B — स्वीकार्य</p><p><strong>नोट:</strong> लाइव AI विश्लेषण के लिए <code>js/config.js</code> में <code>GEMINI_API_KEY</code> सेट करें।</p><ul><li>इथेनॉल स्तर स्वीकार्य सीमा में है।</li><li>शेल्फ लाइफ बढ़ाने के लिए 15°C से नीचे ठंडी, सूखी जगह पर रखें।</li></ul>`
        : `<h3>Quality Report for ${cropName} (Demo Mode)</h3><p><strong>Overall Grade:</strong> B — Acceptable</p><p><strong>Note:</strong> Set <code>GEMINI_API_KEY</code> in <code>js/config.js</code> for live AI analysis.</p><ul><li>Ethanol levels within acceptable post-harvest range.</li><li>Store in a cool, dry location below 15°C to extend shelf life.</li></ul>`;
      return { html: demoHtml };
    }

    const prompt = buildPrompt(cropName, sensorData, lang);

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
        maxOutputTokens: 8192,
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
    const candidate = data?.candidates?.[0];
    const rawText = (candidate?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");

    let html = markdownToHtml(rawText);
    if (candidate?.finishReason === "MAX_TOKENS") {
      html += lang === "hi"
        ? `<p class="truncation-note">⚠️ रिपोर्ट लंबी होने के कारण यहीं रोक दी गई है। कृपया दोबारा स्कैन करें।</p>`
        : `<p class="truncation-note">⚠️ The report was cut short because it exceeded the response limit. Please run the scan again.</p>`;
    }

    return { html };
  }

  /** Build the structured post-harvest quality assessment prompt in the target language */
  function buildPrompt(cropName, sensorData, lang) {
    const { ethanol_ppm, methane_ppm, temperature_c, humidity_pct } = sensorData;
    const isHindi = lang === "hi";

    const langInstruction = isHindi
      ? "CRITICAL REQUIREMENT: You MUST write your ENTIRE response in HINDI using Devanagari script (देवनागरी). All section titles, descriptions, recommendations, and analysis must be in clear, culturally appropriate Hindi for Indian farmers."
      : "CRITICAL REQUIREMENT: You MUST write your ENTIRE response in ENGLISH.";

    return `You are Quallis, an expert post-harvest crop quality AI assistant serving farmers and agri-businesses in India.

${langInstruction}

A farmer has submitted the following post-harvest crop sample for quality assessment:

**Crop:** ${cropName}

**Sensor Readings (from Quallis hardware box):**
- Ethanol (MQ3): ${ethanol_ppm} ppm  — indicator of fermentation / spoilage onset
- Methane (MQ4): ${methane_ppm} ppm  — indicator of anaerobic decomposition
- Temperature:   ${temperature_c} °C — storage/ambient temperature at time of scan
- Humidity:      ${humidity_pct} %   — relative humidity at time of scan

**Uploaded Image:** (see attached crop photo)

Based on the sensor data AND the visual appearance of the crop in the image, provide a comprehensive post-harvest quality report covering:

1. **Overall Quality Grade** — Grade A (Excellent) / B (Good) / C (Acceptable) / D (Poor) / F (Reject). Justify clearly.
2. **Visual Assessment** — Describe what you see: colour, texture, signs of mould, shrivelling, bruising, insect damage, moisture damage, or discolouration.
3. **Sensor Interpretation** — Interpret the ethanol and methane readings in the context of this crop. Are they within safe limits? Do they indicate early fermentation, spoilage, or anaerobic rot?
4. **Storage Suitability** — Is this batch suitable for short-term storage, long-term storage, or should it be sold/processed immediately?
5. **Market Grading Advice** — What market grade (AGMARK or equivalent) does this batch likely qualify for? Should it be separated or blended?
6. **Recommended Actions** — 3–5 specific, actionable steps the farmer should take immediately regarding storage, treatment, or sale.
7. **Preventive Measures for Next Harvest** — 2–3 steps to improve post-harvest quality in the future.

Ensure all markdown headers and bullet points are cleanly formatted in the requested language (${isHindi ? "Hindi" : "English"}).

FORMAT RULES:
- Use "## " for each section heading and "- " for bullet points. Put every bullet on its own line.
- Keep each section to at most 4 short bullets or 3 short sentences.
- Keep the complete report under 550 words so it is never cut off, and always finish the final section.`;
  }

  /** Escape HTML so model output can never inject markup */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /** Inline markdown (bold, italic, code) → HTML */
  function inlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>");
  }

  /**
   * Minimal markdown → HTML converter.
   * Line-based so that list markers (-, *, •, 1.) are never mistaken for
   * inline emphasis and every bullet ends up on its own line.
   */
  function markdownToHtml(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let listType = null;   // "ul" | "ol" | null
    let paragraph = [];

    const closeParagraph = () => {
      if (paragraph.length) {
        out.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    };
    const closeList = () => {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
    };
    const openList = (type) => {
      if (listType !== type) {
        closeList();
        out.push(`<${type}>`);
        listType = type;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        closeParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        closeParagraph();
        closeList();
        const level = Math.min(Math.max(heading[1].length, 2), 4);
        out.push(`<h${level}>${inlineMarkdown(heading[2].replace(/[*#]+$/, "").trim())}</h${level}>`);
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
        closeParagraph();
        closeList();
        out.push("<hr />");
        continue;
      }

      const bullet = line.match(/^[-*•]\s+(.+)$/);
      if (bullet) {
        closeParagraph();
        openList("ul");
        out.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
        continue;
      }

      const numbered = line.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        closeParagraph();
        openList("ol");
        out.push(`<li>${inlineMarkdown(numbered[1])}</li>`);
        continue;
      }

      closeList();
      paragraph.push(line);
    }

    closeParagraph();
    closeList();

    return out.join("").trim();
  }

  return { analyzeCrop };
})();
