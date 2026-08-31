// ══════════════════════════════════════════════
//  Quallis — i18n (Hindi / English)
// ══════════════════════════════════════════════

const i18n = (() => {
  let current = "en";

  // Strings that are set dynamically (not via data attributes)
  const strings = {
    en: {
      // Login
      verifying: "Verifying…",
      verify: "Verify & Enter",
      loginError: "Invalid DIF code. Please try again.",
      networkError: "Network error. Please check your connection.",

      // Modal steps
      step1Title: "Step 1 of 3 — Crop Name",
      step2Title: "Step 2 of 3 — Quallis Code",
      step3Title: "Step 3 of 3 — Upload Photo",
      next: "Next",
      back: "Back",
      analyze: "Analyze Quality",
      back2: "Back",

      // Validation
      enterCrop: "Please enter the crop name.",
      enterQuallis: "Please enter your Quallis hardware code.",
      chooseImage: "Please choose an image.",
      invalidQuallis: "Invalid Quallis code. Please check and try again.",

      // Sensor card
      sensorDecoded: "Sensor Readings Decoded",
      vocLevel: "VOC Level",
      temperature: "Temperature",
      humidity: "Humidity",
      colorResponse: "Color Response",

      // Results
      analyzing: "Analyzing post-harvest quality…",
      done: "Done",

      // Credits
      creditsLabel: "scans",
      creditsExhausted: 'Scans exhausted. Please purchase more from <a href="https://agrifusion-hub.vercel.app" target="_blank">agrifusion-hub.vercel.app</a>',
      scanDisabled: "No scans remaining",
    },
    hi: {
      // Login
      verifying: "सत्यापन हो रहा है…",
      verify: "सत्यापित करें और प्रवेश करें",
      loginError: "अमान्य DIF कोड। कृपया पुनः प्रयास करें।",
      networkError: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।",

      // Modal steps
      step1Title: "चरण 1 / 3 — फसल का नाम",
      step2Title: "चरण 2 / 3 — Quallis कोड",
      step3Title: "चरण 3 / 3 — तस्वीर अपलोड करें",
      next: "अगला",
      back: "वापस",
      analyze: "गुणवत्ता जांचें",
      back2: "वापस",

      // Validation
      enterCrop: "कृपया फसल का नाम दर्ज करें।",
      enterQuallis: "कृपया अपना Quallis हार्डवेयर कोड दर्ज करें।",
      chooseImage: "कृपया एक छवि चुनें।",
      invalidQuallis: "अमान्य Quallis कोड। कृपया जांचें और पुनः प्रयास करें।",

      // Sensor card
      sensorDecoded: "सेंसर रीडिंग डिकोड हुई",
      vocLevel: "VOC स्तर",
      temperature: "तापमान",
      humidity: "आर्द्रता",
      colorResponse: "रंग प्रतिक्रिया",

      // Results
      analyzing: "फसल की गुणवत्ता का विश्लेषण हो रहा है…",
      done: "हो गया",

      // Credits
      creditsLabel: "स्कैन",
      creditsExhausted: 'स्कैन समाप्त। कृपया <a href="https://agrifusion-hub.vercel.app" target="_blank">agrifusion-hub.vercel.app</a> से अधिक खरीदें',
      scanDisabled: "स्कैन समाप्त",
    },
  };

  function t(key) {
    return strings[current]?.[key] ?? strings.en[key] ?? key;
  }

  function setLang(lang) {
    current = lang;
    applyToDOM();
  }

  function getLang() {
    return current;
  }

  /** Walk all [data-en] / [data-hi] elements and update textContent / innerHTML */
  function applyToDOM() {
    document.querySelectorAll("[data-en]").forEach((el) => {
      const val = el.getAttribute(`data-${current}`) ?? el.getAttribute("data-en");
      // Use innerHTML only for elements that may contain HTML (links)
      if (val && val.includes("<")) {
        el.innerHTML = val;
      } else if (val) {
        el.textContent = val;
      }
    });

    // Update placeholders on inputs
    const cropInput = document.getElementById("input-crop");
    if (cropInput) {
      cropInput.placeholder = current === "hi" ? "जैसे गेहूं, चावल, मक्का…" : "e.g. Wheat, Rice, Maize…";
    }
    const quallisInput = document.getElementById("input-quallis-code");
    if (quallisInput) {
      quallisInput.placeholder = current === "hi" ? "जैसे QLS-3A-K2-1F-G7-M4" : "e.g. QLS-3A-K2-1F-G7-M4";
    }

    // Sync lang-pill active state across all toggles
    document.querySelectorAll(".lang-pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === current);
    });
  }

  return { t, setLang, getLang, applyToDOM };
})();
