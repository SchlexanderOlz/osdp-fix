chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) return;

  handleMessage(message).then(result => sendResponse(result));
  return true;
});

async function handleMessage(message) {
  try {
    if (message.type === "FETCH_URL") {
      const res = await fetch(message.url);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const text = await res.text();
      return { success: true, data: text };
    }

    if (message.type === "OPENAI_CALL") {
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
          reasoning: message.reasoning || { "effort": "low" },
          text: message.verbosity || { "verbosity": "low" },
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
      console.log("Returning content " + JSON.stringify(content));
      return { success: true, data: content };
    }

    if (message.type === "GOOGLE_TRANSLATE") {
      const { text, sourceLang, targetLang } = message;
      if (!text) throw new Error("No text provided for translation");

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang || 'auto'}&tl=${targetLang || 'en'}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Google Translate HTTP error " + res.status);

      const data = await res.json();
      const translated = data[0].map(segment => segment[0]).join('');
      return { success: true, data: translated };
    }

    if (message.type === "GET_CHATGPT_SESSION") {
      return await fetchChatGPTSession();
    }

    if (message.type === "CHATGPT_CALL") {
      return await callChatGPT(message.prompt, message.model);
    }

    if (message.type === "CHATGPT_SESSION") {
      return await getChatGPTSession();
    }

    if (message.type === "CHATGPT_COMPLETE")  {
      return await completeChatGPT(message.token, message.body, message.headers);
    }

    return { success: false, error: "Unknown message type: " + message.type };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
    async function getChatGPTSession() {
        return (await (await fetch("https://chatgpt.com/api/auth/session")).json())
    }


// ---- ChatGPT Session ----
async function completeChatGPT(token, body, headers) {
 return await fetch("https://chatgpt.com/backend-api/conversation", {
          "headers": {
            "accept": "text/event-stream",
            "accept-language": "en-US,en;q=0.9",
            "authorization": "Bearer " + token,
            "content-type": "application/json",
            
            ...(headers)
          },
          body: body,
          "method": "POST",
          "mode": "cors",
          "credentials": "include"
        })
}

async function fetchChatGPTSession() {
  const res = await fetch('https://chatgpt.com/api/auth/session', {
    credentials: 'include'
  });

  if (!res.ok) throw new Error('Session fetch failed (' + res.status + ')');

  const data = await res.json();
  if (!data?.accessToken) {
    throw new Error('Not logged in to ChatGPT — please open chatgpt.com and sign in first');
  }

  const expiry = data.expires ? new Date(data.expires).getTime() : null;

  await chrome.storage.local.set({
    chatgpt_access_token: data.accessToken,
    chatgpt_user_email: data.user?.email || null,
    chatgpt_token_expiry: expiry
  });

  return { success: true, userEmail: data.user?.email || null };
}

// ---- ChatGPT Conversation API ----

// Map extension model names to chatgpt.com model slugs
const CHATGPT_MODEL_MAP = {
  'gpt-5-nano': 'gpt-4o-mini',
  'gpt-5-mini': 'gpt-4o'
};
// Source - https://stackoverflow.com/a/79154577
// Posted by B''H Bi'ezras -- Boruch Hashem, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-26, License - CC BY-SA 4.0


async function callChatGPT(prompt, model) {
  // Fetch fresh session if token is missing or expired
  let stored = await chrome.storage.local.get(['chatgpt_access_token', 'chatgpt_token_expiry']);
  const isExpired = stored.chatgpt_token_expiry && Date.now() >= stored.chatgpt_token_expiry;

  if (!stored.chatgpt_access_token || isExpired) {
    const session = await fetchChatGPTSession();
    if (!session.success) throw new Error(session.error);
    stored = await chrome.storage.local.get('chatgpt_access_token');
  }

  const accessToken = stored.chatgpt_access_token;
  const chatgptModel = CHATGPT_MODEL_MAP[model] || 'gpt-4o-mini';

  const proof_token = "gAAAAACWzMwMDAsIlRodSBGZWIgMjYgMjAyNiAxMDo1MjozNSBHTVQrMDEwMCAoQ2VudHJhbCBFdXJvcGVhbiBTdGFuZGFyZCBUaW1lKSIsNDI5NDk2NzI5NiwxLCJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xNDUuMC4wLjAgU2FmYXJpLzUzNy4zNiIsbnVsbCwicHJvZC1jODMxN2VlMTRjMTc4ZjU4NzM0YTdjM2ZlNDFiY2ZhY2E4MTU2ZWQxIiwiZW4tVVMiLCJlbi1VUyxlbiIsMC4yOTk5OTk5OTcwMTk3Njc3NiwiZGVwcmVjYXRlZFJ1bkFkQXVjdGlvbkVuZm9yY2VzS0Fub255bWl0eeKIkmZhbHNlIiwiX19yZWFjdENvbnRhaW5lciRzZDQ2c2Vra3M2ZSIsIl9fb2FpX3NvX3N4MCIsNjE5OTk0Ny42MDAwMDAwMDE1LCI0ZjE4ZDIxZi0xN2I0LTQ0ODQtYjJlMS1mMzc1NzE4NjFhZjMiLCIiLDEyLDE3NzIwOTMzNTU1NTMuOSwwLDAsMCwwLDAsMCwwXQ==";
  const prepare = await fetch('https://chatgpt.com/backend-api/sentinel/chat-requirements/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': '*/*',
    },
    body: JSON.stringify({p: proof_token})
  })

  const prepare_response = await prepare.json()
  const turnstile_token = prepare_response.turnstile.dx
  const prepare_token = prepare_response.prepare_token

  console.log(prepare_response.prepare_token)

  const response = await fetch('https://chatgpt.com/backend-api/f/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'text/event-stream',
      'oai-language': 'en-US',
      'openai-sentinel-proof-token': proof_token,
      'openai-sentinel-chat-requirements-prepare-token': prepare_token,
      'openai-sentinel-turnstile-token': turnstile_token,
      'oai-device-id': '8366e870-35a0-4de5-b1ad-489b3ebb9633',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    },
    credentials: 'include',
    body: JSON.stringify({
      action: 'next',
      messages: [{
        id: crypto.randomUUID(),
        author: { role: 'user' },
        content: { content_type: 'text', parts: [prompt] },
        metadata: {}
      }],
      model: 'auto',
      parent_message_id: "client-created-root",
      conversation_id: null,
      timezone_offset_min: new Date().getTimezoneOffset(),
      history_and_training_disabled: false,
      conversation_mode: { kind: 'primary_assistant' }
    })
  }
  );
 
  if (!response.ok) {
    const errText = await response.text();
    // Token may have expired mid-session — clear it so next call re-fetches
    if (response.status === 401) {
      await chrome.storage.local.remove(['chatgpt_access_token', 'chatgpt_token_expiry']);
    }
    throw new Error(`ChatGPT error (${response.status}): ${errText.slice(0, 300)}`);
  }

  // Parse SSE stream — collect the last complete text chunk
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;

      try {
        const parsed = JSON.parse(raw);
        const parts = parsed?.message?.content?.parts;
        if (Array.isArray(parts) && typeof parts[0] === 'string' && parts[0]) {
          lastText = parts[0];
        }
      } catch { /* ignore incomplete JSON chunks */ }
    }
  }

  if (!lastText) throw new Error('Empty response from ChatGPT');
  return { success: true, data: lastText };
}
