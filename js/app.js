// ══════════════════════════════════════════════
//  Quallis — Main App Controller
// ══════════════════════════════════════════════

(() => {
  // ── State ─────────────────────────────────────
  const state = {
    farmer: null,      // { id, farmer_name, quallis, dif_code }
    quallis: 0,        // live credit count
    wizardStep: 1,     // 1 | 2 | 3
    cropName: "",
    quallisCode: "",
    imageBase64: "",
    imageMime: "",
  };

  // ── DOM references ─────────────────────────────
  const $ = (id) => document.getElementById(id);

  const screens = {
    login: $("screen-login"),
    main: $("screen-main"),
  };

  // Login
  const difBoxes = Array.from(document.querySelectorAll(".dif-box"));
  const btnLogin = $("btn-login");
  const loginError = $("login-error");
  const loginSpinner = $("login-spinner");

  // Main
  const creditsDisplay = $("credits-display");
  const creditsBadge = $("credits-badge");
  const exhaustedBanner = $("credits-exhausted-banner");
  const btnOpenScan = $("btn-open-scan");

  // Scan modal
  const modalScan = $("modal-scan");
  const btnCloseScan = $("btn-close-modal");
  const btnNext = $("btn-next");
  const btnPrev = $("btn-prev");
  const btnNextLabel = $("btn-next-label");
  const modalError = $("modal-error");
  const progressFill = $("progress-fill");
  const inputCrop = $("input-crop");
  const inputQuallisCode = $("input-quallis-code");
  const quallisResult = $("quallis-result");
  const uploadZone = $("upload-zone");
  const inputImage = $("input-image");
  const uploadPlaceholder = $("upload-placeholder");
  const previewImg = $("preview-img");

  // Results modal
  const modalResults = $("modal-results");
  const btnCloseResults = $("btn-close-results");
  const analyzingState = $("analyzing-state");
  const resultContent = $("result-content");
  const resultEnDiv = $("result-en");
  const resultHiDiv = $("result-hi");
  const resultCropLabel = $("result-crop-label");
  const btnResultDone = $("btn-result-done");
  const rlEn = $("rl-en");
  const rlHi = $("rl-hi");

  // ── Language ──────────────────────────────────
  document.querySelectorAll(".lang-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      i18n.setLang(btn.dataset.lang);
      updateModalStepUI();
    });
  });

  // ── DIF Code input logic ───────────────────────
  difBoxes.forEach((box, idx) => {
    box.addEventListener("input", (e) => {
      // Keep only last character (handles paste of >1 char)
      const val = e.target.value.toString().replace(/\D/g, "").slice(-1);
      e.target.value = val;
      e.target.classList.toggle("filled", val !== "");

      if (val && idx < difBoxes.length - 1) {
        difBoxes[idx + 1].focus();
      }
      clearError(loginError);
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && idx > 0) {
        difBoxes[idx - 1].focus();
        difBoxes[idx - 1].value = "";
        difBoxes[idx - 1].classList.remove("filled");
      }
      if (e.key === "Enter") handleLogin();
    });

    // Handle paste of 4 digits
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 4);
      pasted.split("").forEach((ch, i) => {
        if (difBoxes[i]) {
          difBoxes[i].value = ch;
          difBoxes[i].classList.add("filled");
        }
      });
      const last = Math.min(pasted.length, difBoxes.length - 1);
      difBoxes[last].focus();
    });
  });

  // ── Login ──────────────────────────────────────
  btnLogin.addEventListener("click", handleLogin);

  async function handleLogin() {
    const code = difBoxes.map((b) => b.value).join("").toUpperCase();
    if (code.length < 4) {
      showError(loginError, i18n.t("loginError"));
      return;
    }

    setLoading(btnLogin, loginSpinner, true);
    clearError(loginError);

    try {
      const farmer = await db.findByDifCode(code);
      if (!farmer) {
        showError(loginError, i18n.t("loginError"));
        return;
      }
      state.farmer = farmer;
      state.quallis = farmer.quallis ?? 0;
      showMainScreen();
    } catch (err) {
      console.error(err);
      showError(loginError, i18n.t("networkError"));
    } finally {
      setLoading(btnLogin, loginSpinner, false);
    }
  }

  // ── Main Screen ────────────────────────────────
  function showMainScreen() {
    screens.login.classList.remove("active");
    screens.login.classList.add("hidden");
    screens.main.classList.remove("hidden");
    screens.main.classList.add("active");
    updateCreditsUI();
    i18n.applyToDOM();
  }

  function updateCreditsUI() {
    creditsDisplay.textContent = state.quallis;

    if (state.quallis <= 0) {
      exhaustedBanner.classList.remove("hidden");
      btnOpenScan.disabled = true;
      creditsBadge.style.borderColor = "rgba(217,83,79,0.4)";
      creditsBadge.style.background = "rgba(217,83,79,0.1)";
      creditsDisplay.style.color = "#f8a09d";
    } else {
      exhaustedBanner.classList.add("hidden");
      btnOpenScan.disabled = false;
      creditsBadge.style.borderColor = "";
      creditsBadge.style.background = "";
      creditsDisplay.style.color = "";
    }
  }

  // ── Scan Modal ────────────────────────────────
  btnOpenScan.addEventListener("click", openScanModal);
  btnCloseScan.addEventListener("click", closeScanModal);
  modalScan.addEventListener("click", (e) => {
    if (e.target === modalScan) closeScanModal();
  });

  function openScanModal() {
    if (state.quallis <= 0) return;
    state.wizardStep = 1;
    state.cropName = "";
    state.quallisCode = "";
    state.imageBase64 = "";
    state.imageMime = "";
    inputCrop.value = "";
    inputQuallisCode.value = "";
    inputImage.value = "";
    previewImg.src = "";
    previewImg.classList.add("hidden");
    uploadPlaceholder.classList.remove("hidden");
    uploadZone.classList.remove("has-image");
    quallisResult.classList.add("hidden");
    clearError(modalError);
    modalScan.classList.remove("hidden");
    modalScan.classList.add("active");
    updateModalStepUI();
    setTimeout(() => inputCrop.focus(), 300);
  }

  function closeScanModal() {
    modalScan.classList.remove("active");
    modalScan.classList.add("hidden");
  }

  // ── Wizard navigation ──────────────────────────
  btnNext.addEventListener("click", handleNext);
  btnPrev.addEventListener("click", handlePrev);

  // Allow Enter key to advance
  [inputCrop, inputQuallisCode].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleNext();
    });
  });

  async function handleNext() {
    clearError(modalError);

    if (state.wizardStep === 1) {
      const val = inputCrop.value.trim();
      if (!val) { showError(modalError, i18n.t("enterCrop")); return; }
      state.cropName = val;
      goToStep(2);

    } else if (state.wizardStep === 2) {
      const val = inputQuallisCode.value.trim();
      if (!val) { showError(modalError, i18n.t("enterQuallis")); return; }
      state.quallisCode = val;
      goToStep(3);

    } else if (state.wizardStep === 3) {
      if (!state.imageBase64) { showError(modalError, i18n.t("chooseImage")); return; }
      // Kick off analysis
      closeScanModal();
      openResultsModal();
      await runAnalysis();
    }
  }

  function handlePrev() {
    if (state.wizardStep > 1) goToStep(state.wizardStep - 1);
  }

  function goToStep(n) {
    // Hide current
    $(`step-${state.wizardStep}`).classList.remove("active");
    $(`step-${state.wizardStep}`).classList.add("hidden");
    $(`ps${state.wizardStep}`).classList.remove("active");

    state.wizardStep = n;

    // Show new
    $(`step-${n}`).classList.remove("hidden");
    $(`step-${n}`).classList.add("active");
    $(`ps${n}`).classList.add("active");

    updateModalStepUI();

    // Auto-focus
    if (n === 1) setTimeout(() => inputCrop.focus(), 100);
    if (n === 2) setTimeout(() => inputQuallisCode.focus(), 100);
  }

  function updateModalStepUI() {
    const stepTitles = [
      i18n.t("step1Title"),
      i18n.t("step2Title"),
      i18n.t("step3Title"),
    ];
    $("modal-step-title").textContent = stepTitles[state.wizardStep - 1];

    const fills = ["33%", "66%", "100%"];
    progressFill.style.width = fills[state.wizardStep - 1];

    btnPrev.disabled = state.wizardStep === 1;

    if (state.wizardStep === 3) {
      btnNextLabel.textContent = i18n.t("analyze");
    } else {
      btnNextLabel.textContent = i18n.t("next");
    }
  }

  // ── Image Upload ──────────────────────────────
  inputImage.addEventListener("change", handleImageChange);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // Extract base64 and mime
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      state.imageBase64 = b64;
      state.imageMime = mime;

      previewImg.src = dataUrl;
      previewImg.classList.remove("hidden");
      uploadPlaceholder.classList.add("hidden");
      uploadZone.classList.add("has-image");
      clearError(modalError);
    };
    reader.readAsDataURL(file);
  }

  // ── Results Modal ─────────────────────────────
  btnCloseResults.addEventListener("click", closeResultsModal);
  btnResultDone.addEventListener("click", closeResultsModal);
  modalResults.addEventListener("click", (e) => {
    if (e.target === modalResults) closeResultsModal();
  });

  // Result language toggle
  rlEn.addEventListener("click", () => switchResultLang("en"));
  rlHi.addEventListener("click", () => switchResultLang("hi"));

  function switchResultLang(lang) {
    rlEn.classList.toggle("active", lang === "en");
    rlHi.classList.toggle("active", lang === "hi");
    resultEnDiv.classList.toggle("hidden", lang !== "en");
    resultHiDiv.classList.toggle("hidden", lang !== "hi");
  }

  function openResultsModal() {
    resultCropLabel.textContent = state.cropName;
    analyzingState.classList.remove("hidden");
    resultContent.classList.add("hidden");
    btnResultDone.classList.add("hidden");
    resultEnDiv.innerHTML = "";
    resultHiDiv.innerHTML = "";
    modalResults.classList.remove("hidden");
    modalResults.classList.add("active");
    // Default result lang to app lang
    switchResultLang(i18n.getLang());
  }

  function closeResultsModal() {
    modalResults.classList.remove("active");
    modalResults.classList.add("hidden");
  }

  // ── Run Analysis ──────────────────────────────
  async function runAnalysis() {
    try {
      const { en, hi } = await gemini.analyzeCrop(
        state.cropName,
        state.quallisCode,
        state.imageBase64,
        state.imageMime
      );

      // Decrement credit AFTER successful analysis
      try {
        const updated = await db.decrementQuallis(state.farmer.id);
        state.quallis = updated.quallis ?? Math.max(0, state.quallis - 1);
      } catch (dbErr) {
        // Credit decrement failed — still show result but log
        console.warn("Failed to decrement quallis:", dbErr);
        state.quallis = Math.max(0, state.quallis - 1);
      }
      updateCreditsUI();

      resultEnDiv.innerHTML = en;
      resultHiDiv.innerHTML = hi;
      analyzingState.classList.add("hidden");
      resultContent.classList.remove("hidden");
      btnResultDone.classList.remove("hidden");

    } catch (err) {
      console.error("Analysis failed:", err);
      const errMsg = `<p style="color:var(--error)">⚠️ Analysis failed: ${err.message}<br>Please try again.</p>`;
      resultEnDiv.innerHTML = errMsg;
      resultHiDiv.innerHTML = `<p style="color:var(--error)">⚠️ विश्लेषण विफल: ${err.message}<br>कृपया पुनः प्रयास करें।</p>`;
      analyzingState.classList.add("hidden");
      resultContent.classList.remove("hidden");
      btnResultDone.classList.remove("hidden");
    }
  }

  // ── Helpers ───────────────────────────────────
  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function clearError(el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
  function setLoading(btn, spinner, loading) {
    btn.disabled = loading;
    spinner.classList.toggle("hidden", !loading);
  }

  // ── Init ──────────────────────────────────────
  i18n.applyToDOM();
  difBoxes[0].focus();
})();
