'use strict';

document.getElementById('runBtn').addEventListener('click', () => {
  const statusMessage = document.getElementById("statusMessage");
  const output = document.getElementById("output");

  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
    const { selected_model, selected_service_tier } = await chrome.storage.local.get(["selected_model", "selected_service_tier"]);

    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type: 'RUN_SCRIPT',
        model: selected_model || "gpt-5-nano",
        serviceTier: selected_service_tier || "default",
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
    );
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
  const serviceTierSelect = document.getElementById("serviceTierSelect");
  const serviceTierIndicator = document.getElementById("serviceTierIndicator");


  // Auth mode elements
  const tabApiKey = document.getElementById("tabApiKey");
  const tabChatGPT = document.getElementById("tabChatGPT");
  const sectionApiKey = document.getElementById("sectionApiKey");
  const sectionChatGPT = document.getElementById("sectionChatGPT");
  const chatgptConnectBtn = document.getElementById("chatgptConnectBtn");
  const chatgptDisconnectBtn = document.getElementById("chatgptDisconnectBtn");
  const chatgptDisconnected = document.getElementById("chatgptDisconnected");
  const chatgptConnected = document.getElementById("chatgptConnected");
  const chatgptUserEmail = document.getElementById("chatgptUserEmail");

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

  // -------------------------
  // Auth mode tab switching
  // -------------------------
  function switchAuthTab(mode) {
    if (mode === 'chatgpt') {
      tabApiKey.classList.remove("tab-active");
      tabChatGPT.classList.add("tab-active");
      sectionApiKey.classList.add("hidden");
      sectionChatGPT.classList.remove("hidden");
    } else {
      tabChatGPT.classList.remove("tab-active");
      tabApiKey.classList.add("tab-active");
      sectionChatGPT.classList.add("hidden");
      sectionApiKey.classList.remove("hidden");
    }
    chrome.storage.local.set({ auth_mode: mode });
  }

  tabApiKey.addEventListener("click", () => switchAuthTab("api_key"));
  tabChatGPT.addEventListener("click", () => switchAuthTab("chatgpt"));

  // -------------------------
  // Load stored settings
  // -------------------------
  const stored = await chrome.storage.local.get([
    "openai_api_key",
    "auth_mode",
    "chatgpt_access_token",
    "chatgpt_user_email"
  ]);

  if (stored.openai_api_key) {
    apiKeyInput.value = stored.openai_api_key;
    showIndicator(keyIndicator);
  }

  const authMode = stored.auth_mode || "api_key";
  switchAuthTab(authMode);

  if (stored.chatgpt_access_token) {
    chatgptDisconnected.classList.add("hidden");
    chatgptConnected.classList.remove("hidden");
    chatgptUserEmail.textContent = stored.chatgpt_user_email || "";
  }

  // -------------------------
  // Load stored model
  // -------------------------
  const modelResult = await chrome.storage.local.get("selected_model");

  if (modelResult.selected_model) {
    modelSelect.value = modelResult.selected_model;
    showIndicator(modelIndicator);
  } else {
    modelSelect.value = "gpt-5-nano";
    await chrome.storage.local.set({ selected_model: "gpt-5-nano" });
  }

  const serviceTierResult = await chrome.storage.local.get("selected_service_tier");
  if (serviceTierResult.selected_service_tier) {
    serviceTierSelect.value = serviceTierResult.selected_service_tier;
    showIndicator(serviceTierIndicator);
  } else {
    serviceTierSelect.value = "default";
    await chrome.storage.local.set({ selected_service_tier: "default" });
  }

  // -------------------------
  // Save API key
  // -------------------------
  saveKeyBtn.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showStatus("API key cannot be empty.", "error");
      return;
    }

    await chrome.storage.local.set({ openai_api_key: key });
    showIndicator(keyIndicator);
    showStatus("API key saved successfully.", "success");
  });

  // -------------------------
  // ChatGPT Connect
  // -------------------------
  chatgptConnectBtn.addEventListener("click", () => {
    showStatus("Connecting...", "info");
    chatgptConnectBtn.disabled = true;

    chrome.runtime.sendMessage({ type: 'GET_CHATGPT_SESSION' }, (response) => {
      chatgptConnectBtn.disabled = false;
      if (response?.success) {
        chatgptDisconnected.classList.add("hidden");
        chatgptConnected.classList.remove("hidden");
        chatgptUserEmail.textContent = response.userEmail || "";
        showStatus("Connected to ChatGPT.", "success");
      } else {
        showStatus("Failed: " + (response?.error || "Unknown error"), "error");
      }
    });
  });

  // -------------------------
  // ChatGPT Disconnect
  // -------------------------
  chatgptDisconnectBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(['chatgpt_access_token', 'chatgpt_token_expiry', 'chatgpt_user_email']);
    chatgptConnected.classList.add("hidden");
    chatgptDisconnected.classList.remove("hidden");
    showStatus("Disconnected.", "info");
  });

  // -------------------------
  // Auto-save model on change
  // -------------------------
  modelSelect.addEventListener("change", async () => {
    await chrome.storage.local.set({ selected_model: modelSelect.value });
    showIndicator(modelIndicator);
  });

  serviceTierSelect.addEventListener("change", async () => {
    await chrome.storage.local.set({ selected_service_tier: serviceTierSelect.value });
    showIndicator(serviceTierIndicator);
  });

  // -------------------------
  // Run button validation
  // -------------------------
  runBtn.addEventListener("click", async () => {
    hideStatus();
    output.textContent = "";

    const result = await chrome.storage.local.get(["openai_api_key", "auth_mode", "chatgpt_access_token"]);
    const mode = result.auth_mode || "api_key";

    if (mode === "api_key" && !result.openai_api_key) {
      showStatus("No API key found. Please add one first.", "error");
      return;
    }

    if (mode === "chatgpt" && !result.chatgpt_access_token) {
      showStatus("Not connected. Click 'Connect ChatGPT Session' first.", "error");
      return;
    }

    showStatus("Running...", "info");
  });
});
