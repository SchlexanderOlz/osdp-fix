'use strict';

document.getElementById('runBtn').addEventListener('click', () => {
  const statusMessage = document.getElementById("statusMessage");
  const output = document.getElementById("output");

  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {

    const { selected_model } = await chrome.storage.local.get("selected_model");

    chrome.tabs.sendMessage(
      tabs[0].id,
      { 
        type: 'RUN_SCRIPT',
        model: selected_model || "gpt-5-nano"
      },
      r => {
        if (!r) {
          output.textContent = "";
          showStatus("No response. Make sure you are on an OSDP article page.", "error");
          return;
        }
        output.textContent = JSON.stringify(r, null, 2);
        showStatus(r.message, r.status);
      }
    )
  });
});


document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveKeyBtn = document.getElementById("saveKeyBtn");
  const runBtn = document.getElementById("runBtn");
  const output = document.getElementById("output");
  const statusMessage = document.getElementById("statusMessage");
  const keyIndicator = document.getElementById("keyIndicator");

  const modelSelect = document.getElementById("modelSelect");
  const modelIndicator = document.getElementById("modelIndicator");

  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  function hideStatus() {
    statusMessage.classList.add("hidden");
  }

  function showIndicator(el) {
    el.classList.remove("hidden");
  }

  function hideIndicator(el) {
    el.classList.add("hidden");
  }

  // -------------------------
  // Load stored API key
  // -------------------------
  const keyResult = await chrome.storage.local.get("openai_api_key");
  if (keyResult.openai_api_key) {
    apiKeyInput.value = keyResult.openai_api_key;
    showIndicator(keyIndicator);
  }

  // -------------------------
  // Load stored model
  // -------------------------
  const modelResult = await chrome.storage.local.get("selected_model");

  if (modelResult.selected_model) {
    modelSelect.value = modelResult.selected_model;
    showIndicator(modelIndicator);
  } else {
    // default
    modelSelect.value = "gpt-5-nano";
    await chrome.storage.local.set({ selected_model: "gpt-5-nano" });
  }

  // -------------------------
  // Save API key (manual)
  // -------------------------
  saveKeyBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus("API key cannot be empty.", "error");
      hideIndicator(keyIndicator);
      return;
    }

    await chrome.storage.local.set({ openai_api_key: key });

    showIndicator(keyIndicator);
    showStatus("API key saved successfully.", "success");
  });

  // -------------------------
  // Auto-save model on change
  // -------------------------
  modelSelect.addEventListener("change", async () => {
    const selectedModel = modelSelect.value;

    await chrome.storage.local.set({
      selected_model: selectedModel
    });

    showIndicator(modelIndicator);
  });

  // -------------------------
  // Run button validation
  // -------------------------
  runBtn.addEventListener("click", async () => {
    hideStatus();
    output.textContent = "";

    const result = await chrome.storage.local.get("openai_api_key");

    if (!result.openai_api_key) {
      showStatus("No API key found. Please add one first.", "error");
      return;
    }

    showStatus("Running...", "info");
  });
});
