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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini-2025-08-07",
          messages: message.messages, // array of messages
          temperature: message.temperature || 0
        })
      });

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      console.log("Returning content " + content)
      return { success: true, data: content };
    }

    return { success: false, error: "Unknown message type: " + message.type };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
