// ══════════════════════════════════════════════
//  Quallis — Gemini Vision API
//  Sends post-harvest crop image + decoded sensor
//  data (BME280, MQ138, TCS34725) and returns quality analysis.
// ══════════════════════════════════════════════

const gemini = (() => {
  const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

  /**
   * Analyse a post-harvest crop image.
   * @param {string} cropName       - e.g. "Wheat"
   * @param {object} sensorData     - decoded sensor object from decoder.js
   *   { voc_level, temperature_c, humidity_pct, color_value }
   * @param {string} base64Image    - base64-encoded image data (without prefix)
   * @param {string} mimeType       - e.g. "image/jpeg"
   * @param {string} lang           - "en" | "hi"
   * @returns {{ html: string }}
   */
  async function analyzeCrop(cropName, sensorData, base64Image, mimeType, lang = "en") {
    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes("YOUR_GEMINI_API_KEY")) {
      console.warn("Gemini API key missing in js/config.js. Returning simulated analysis.");
      const demoHtml = lang === "hi"
        ? `<h3>${cropName} - फसल विश्लेषण (डेमो मोड)</h3><p><strong>स्पॉइलेज जोखिम (Spoilage Risk):</strong> LOW SPOILAGE RISK</p><p><strong>नोट:</strong> लाइव AI विश्लेषण के लिए <code>js/config.js</code> में <code>GEMINI_API_KEY</code> सेट करें।</p><h4>सेंसर डेटा</h4><ul><li>तापमान: ${sensorData?.temperature_c ?? 28.4} °C</li><li>आर्द्रता: ${sensorData?.humidity_pct ?? 64.2} %</li><li>VOC स्तर: ${sensorData?.voc_level ?? 245}</li><li>रंग प्रतिक्रिया: ${sensorData?.color_value ?? 520}</li></ul>`
        : `<h3>${cropName} - CROP ANALYSIS (Demo Mode)</h3><p><strong>Spoilage Risk:</strong> LOW SPOILAGE RISK</p><p><strong>Note:</strong> Set <code>GEMINI_API_KEY</code> in <code>js/config.js</code> for live AI analysis.</p><h4>SENSOR DATA</h4><ul><li>Temperature: ${sensorData?.temperature_c ?? 28.4} °C</li><li>Humidity: ${sensorData?.humidity_pct ?? 64.2} %</li><li>VOC Level: ${sensorData?.voc_level ?? 245}</li><li>Color Response: ${sensorData?.color_value ?? 520}</li></ul>`;
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
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return { html: markdownToHtml(rawText) };
  }

  /** Build the structured post-harvest quality assessment prompt in the target language */
  function buildPrompt(cropName, sensorData, lang) {
    const { voc_level, temperature_c, humidity_pct, color_value } = sensorData;
    const isHindi = lang === "hi";

    const langInstruction = isHindi
      ? "CRITICAL REQUIREMENT: You MUST write your ENTIRE response in HINDI using Devanagari script (देवनागरी). All headings, descriptions, analyses, and recommendations must be in clear, culturally appropriate Hindi for Indian farmers."
      : "CRITICAL REQUIREMENT: You MUST write your ENTIRE response in ENGLISH.";

    return `You are Quallis, an expert post-harvest crop quality AI assistant serving farmers and agri-businesses in India.

${langInstruction}

A farmer has submitted the following post-harvest crop sample for quality assessment:

**Crop:** ${cropName}

**Sensor Readings (from Quallis hardware box):**
- Temperature (BME280): ${temperature_c} °C
- Humidity (BME280): ${humidity_pct} %
- VOC Level (MQ138 broad-response gas/VOC sensor): ${voc_level}
- Color Response (TCS34725 color sensor index): ${color_value}

**Uploaded Image:** (see attached crop photo)

CRITICAL SENSOR & ASSESSMENT CONSTRAINTS:
1. The MQ138 is a broad-response gas/VOC sensor. Its reading MUST NOT be interpreted as a specific methane, acetone, ethanol, or other gas concentration. Do NOT identify a specific gas from the MQ138 reading alone.
2. Sensor readings are supporting evidence and should NOT be treated as definitive proof of spoilage.
3. Clearly distinguish between VISUAL OBSERVATION (what you see in the crop photo) and SENSOR OBSERVATION (sensor readings). Do NOT claim that an image proves a particular gas is present.
4. Categorize overall spoilage risk strictly into one of these 4 categories:
   - LOW SPOILAGE RISK
   - MODERATE SPOILAGE RISK
   - HIGH SPOILAGE RISK
   - REQUIRES INSPECTION

Provide your report structured cleanly with these exact sections:

### CROP ANALYSIS
- Crop: ${cropName}

### SENSOR DATA
- Temperature: ${temperature_c} °C
- Humidity: ${humidity_pct} %
- VOC Level: ${voc_level}
- Color Response: ${color_value}

### VISUAL ANALYSIS
[Your detailed visual assessment of the uploaded crop image: colour, texture, signs of mould, shrivelling, bruising, moisture damage, or discolouration]

### SENSOR ANALYSIS
[Interpretation of temperature, humidity, VOC level, and color response in the context of this specific crop, observing all constraints]

### OVERALL ASSESSMENT
- Spoilage Risk: [LOW SPOILAGE RISK / MODERATE SPOILAGE RISK / HIGH SPOILAGE RISK / REQUIRES INSPECTION]
[Detailed explanation of the risk reasoning]

### RECOMMENDATION
[Specific, actionable steps the farmer should take immediately regarding storage, treatment, sale, or drying]

FORMATTING REQUIREMENT: Keep each point crisp, concise, and direct. Ensure all sections are fully answered and concluded without truncation.`;
  }

  /** Robust markdown → HTML converter */
  function markdownToHtml(md) {
    if (!md) return "";

    // 1. Normalize line endings and clean up stray markers
    let text = md.replace(/\r\n/g, "\n").trim();

    // 2. Process line by line
    const lines = text.split("\n");
    let html = "";
    let inList = false;

    // Helper for inline bold, italic, code
    const formatInline = (str) => {
      return str
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.*?)__/g, "<strong>$1</strong>")
        .replace(/(^|\s)\*(?!\s)(.*?)(?<!\s)\*($|\s)/g, "$1<em>$2</em>$3")
        .replace(/`(.*?)`/g, "<code>$1</code>");
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      if (!trimmed) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        continue;
      }

      // Horizontal rule
      if (/^---+$|^===+$/.test(trimmed)) {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<hr>";
        continue;
      }

      // Markdown Headers (### or ## or #)
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        if (inList) { html += "</ul>"; inList = false; }
        const level = Math.min(headerMatch[1].length + 1, 4);
        html += `<h${level}>${formatInline(headerMatch[2])}</h${level}>`;
        continue;
      }

      // Bullet list items (* item or - item or • item)
      const bulletMatch = trimmed.match(/^[\*\-•]\s+(.+)$/);
      if (bulletMatch) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${formatInline(bulletMatch[1])}</li>`;
        continue;
      }

      // Regular paragraph line
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${formatInline(trimmed)}</p>`;
    }

    if (inList) {
      html += "</ul>";
    }

    return html;
  }

  return { analyzeCrop };
})();
