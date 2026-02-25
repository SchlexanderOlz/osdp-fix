chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) return;

  // Always return true for async response
  handleMessage(message).then(result => sendResponse(result));
  return true;
});

async function handleMessage(message) {
  try {
    if (message.type === "FETCH_URL") {
      // Standard fetch of a URL
      const res = await fetch(message.url);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const text = await res.text();
      return { success: true, data: text };
    }

    if (message.type === "OPENAI_CALL") {
      // Example OpenAI API call
      const apiKey = message.apiKey;
      if (!apiKey) throw new Error("No API key provided");

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: message.model || "gpt-5-nano",
          reasoning: message.reasoning || {"effort": "low"},
          text: message.verbosity || { "verbosity": "low"},
          input: message.messages,
          temperature: message.temperature || 0
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let detail = "";
        try {
          detail = JSON.parse(errorBody)?.error?.message || errorBody;
        } catch (_) {
          detail = errorBody;
        }
        throw new Error(`OpenAI API error (${response.status}): ${detail}`);
      }

      const data = await response.json();
      const content = data?.output?.[1]?.content?.[0]?.text;
      if (!content) {
        throw new Error("Unexpected API response structure: " + JSON.stringify(data).slice(0, 500));
      }
      console.log("Returning content " + JSON.stringify(content))
      return { success: true, data: content };
    }

    if (message.type === "GOOGLE_TRANSLATE") {
      const { text, sourceLang, targetLang } = message;
      if (!text) throw new Error("No text provided for translation");

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang || 'auto'}&tl=${targetLang || 'en'}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Google Translate HTTP error " + res.status);

      const data = await res.json();
      // data[0] is array of translation segments: [[translatedText, sourceText, ...], ...]
      const translated = data[0].map(segment => segment[0]).join('');
      return { success: true, data: translated };
    }

    return { success: false, error: "Unknown message type: " + message.type };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
