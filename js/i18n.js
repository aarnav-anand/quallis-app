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
      analyze: "Analyze",
      back2: "Back",

      // Validation
      enterCrop: "Please enter the crop name.",
      enterQuallis: "Please enter your Quallis code.",
      chooseImage: "Please choose an image.",
      invalidQuallis: "Quallis code not recognized. Please check and try again.",

      // Results
      analyzing: "Analyzing your crop…",
      done: "Done",

      // Credits
      creditsLabel: "credits",
      creditsExhausted: 'Credits exhausted. Please purchase more scans from <a href="https://agrifusion-hub.vercel.app" target="_blank">agrifusion-hub.vercel.app</a>',
      scanDisabled: "No credits remaining",
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
      analyze: "विश्लेषण करें",
      back2: "वापस",

      // Validation
      enterCrop: "कृपया फसल का नाम दर्ज करें।",
      enterQuallis: "कृपया अपना Quallis कोड दर्ज करें।",
      chooseImage: "कृपया एक छवि चुनें।",
      invalidQuallis: "Quallis कोड मान्यता नहीं मिली। कृपया जांचें और पुनः प्रयास करें।",

      // Results
      analyzing: "आपकी फसल का विश्लेषण हो रहा है…",
      done: "हो गया",

      // Credits
      creditsLabel: "क्रेडिट",
      creditsExhausted: 'क्रेडिट समाप्त। कृपया <a href="https://agrifusion-hub.vercel.app" target="_blank">agrifusion-hub.vercel.app</a> से अधिक स्कैन खरीदें',
      scanDisabled: "क्रेडिट समाप्त",
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
      cropInput.placeholder = current === "hi" ? "जैसे गेहूं, चावल, कपास…" : "e.g. Wheat, Rice, Cotton…";
    }
    const quallisInput = document.getElementById("input-quallis-code");
    if (quallisInput) {
      quallisInput.placeholder = current === "hi" ? "अपना Quallis कोड दर्ज करें" : "Enter your Quallis code";
    }

    // Sync lang-pill active state across all toggles
    document.querySelectorAll(".lang-pill").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === current);
    });
  }

  return { t, setLang, getLang, applyToDOM };
})();
