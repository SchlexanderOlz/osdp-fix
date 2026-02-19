'use strict';

document.getElementById('runBtn').addEventListener('click', () => {
  const statusMessage = document.getElementById("statusMessage");
  const output = document.getElementById("output");
  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'RUN_SCRIPT' },
      r => {
        output.textContent = JSON.stringify(r);
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

  console.log("Setting up handlers")
  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  function hideStatus() {
    statusMessage.classList.add("hidden");
  }

  function showIndicator() {
    keyIndicator.classList.remove("hidden");
  }

  function hideIndicator() {
    keyIndicator.classList.add("hidden");
  }

  // Load stored key
  const result = await chrome.storage.local.get("openai_api_key");
  if (result.openai_api_key) {
    apiKeyInput.value = result.openai_api_key;
    showIndicator();
  }

  // Save key
  saveKeyBtn.addEventListener("click", async () => {
    console.log("API Key saved")
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus("API key cannot be empty.", "error");
      hideIndicator();
      return;
    }

    await chrome.storage.local.set({ openai_api_key: key });

    showIndicator();
    showStatus("API key saved successfully.", "success");
  });

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
