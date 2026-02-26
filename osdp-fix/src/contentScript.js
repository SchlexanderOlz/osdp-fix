'use strict';
import * as g from "./vendor/i5bamk05qmvsi6c3.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RUN_SCRIPT') {
    runExtensionLogic(msg.model).then(result => {
      sendResponse(result);
    });

    return true; // Required for async response
  }
});

// -------------------------------
// TRANSLATE BUTTON HOOK
// -------------------------------
function hookTranslateButton() {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const span = btn.querySelector('span');
    if (span && span.textContent.trim() === 'Translate') {
      if (btn.dataset.translateHooked) return; // already hooked
      btn.dataset.translateHooked = 'true';

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        await handleTranslate();
      }, true); // capture phase to run before other handlers

      console.log('[OSDP Fix] Hooked Translate button');
      return;
    }
  }
}

async function translateText(text, targetLang = 'en') {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'GOOGLE_TRANSLATE', text, sourceLang: 'auto', targetLang },
      response => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Translation failed'));
        }
      }
    );
  });
}

async function handleTranslate() {
  try {
    console.log('[OSDP Fix] Starting translation...');

    // Gather source fields
    const titleEl = document.getElementById('mat-input-1') || document.getElementById('mat-input-4');
    const subtitleEl = document.querySelector('input[name="subtitle"]');
    const contentEditor = document.getElementById('editck') || document.getElementById('editck2');
    const contentTextbox = contentEditor?.querySelector('div[role="textbox"]');

    const title = titleEl?.value || '';
    const subtitle = subtitleEl?.value || '';
    const content = contentTextbox?.innerHTML || '';

    console.log(title)
    console.log(subtitle)
    console.log(content)
    if (!title && !content) {
      console.warn('[OSDP Fix] No title or content to translate');
      return;
    }

    // Translate all fields in parallel
    const [translatedTitle, translatedSubtitle, translatedContent] = await Promise.all([
      title ? translateText(title) : Promise.resolve(''),
      subtitle ? translateText(subtitle) : Promise.resolve(''),
      content ? translateText(content) : Promise.resolve('')
    ]);

    console.log(translatedTitle)

    // Click the "Translated" tab
    const tabs = document.querySelectorAll('div[role="tab"]');
    for (const tab of tabs) {
      const child = tab.querySelector('div');
      if (child && child.textContent.trim().includes('Translated')) {
        tab.click();
        break;
      }
    }

    // Wait for tab content to render
    await new Promise(r => setTimeout(r, 500));

    // Fill in translated fields
    const translatedTitleEl = document.getElementById('mat-input-4');
    const translatedSubtitleEl = document.getElementById('mat-input-5');
    const translatedContentEditor = document.getElementById('editck2');

    if (translatedTitleEl) {
      setNativeInputValue(translatedTitleEl, translatedTitle);
      console.log('[OSDP Fix] Set translated title');
    }

    if (translatedSubtitleEl) {
      setNativeInputValue(translatedSubtitleEl, translatedSubtitle);
      console.log('[OSDP Fix] Set translated subtitle');
    }

    if (translatedContentEditor) {
      console.log(translatedContent)
      const textbox = translatedContentEditor.querySelector('div[role="textbox"]');
      if (textbox) {
          textbox.focus();
          const dataTransfer = new DataTransfer();
          dataTransfer.setData('text/html', translatedContent);
          dataTransfer.setData('text/plain', translatedContent.replace(/<[^>]+>/g, ''));

          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dataTransfer
          });

          textbox.dispatchEvent(pasteEvent);

      }
    }

    console.log('[OSDP Fix] Translation workflow complete');
  } catch (err) {
    console.error('[OSDP Fix] Translation error:', err);
  }
}

// Set value on Angular Material input and trigger change detection
function setNativeInputValue(el, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// Observe DOM to hook the Translate button when it appears
const translateObserver = new MutationObserver(() => {
  hookTranslateButton();
});
translateObserver.observe(document.body, { childList: true, subtree: true });
// Also try immediately
hookTranslateButton();
// -------------------------------
// STEP 4 — Check relevant labels in the mat-tree
// -------------------------------
async function markRelevantLabelsInMatTree(labels) {
  if (!labels || labels.length === 0) return;

  labels = [...labels]; // avoid mutating original

  while (labels.length > 0) {
    const targetLabel = labels.pop();

    let foundAndClicked = false;

    const nodes = document.querySelectorAll('mat-tree-node');

    for (const node of nodes) {
      const labelSpan = node.querySelector('.mat-checkbox-label');
      const label = labelSpan?.innerText.trim();
      if (!label) continue;

      if (label === targetLabel) {
        const checkbox = node.querySelector('mat-checkbox');
        const checkboxInput = node.querySelector('input[type="checkbox"]');

        if (checkbox && checkboxInput && !checkboxInput.checked) {
          console.log("Clicking:", label);

          checkbox.dispatchEvent(
            new MouseEvent('click', {
              bubbles: false,  // 🔥 critical
              cancelable: true
            })
          );

          await expandAllMatTreeNodes()


          // allow Angular to re-render
          await new Promise(r => setTimeout(r, 40));
        }

        foundAndClicked = true;
        break;
      }
    }

    // If Angular re-rendered, loop continues naturally
    // and fresh DOM will be queried in next iteration
  }
}



async function openTags() {
  const tab = document.getElementById("mat-tab-label-1-1")
  tab.click()
}



async function expandAllMatTreeNodes() {
  let expandedSomething = true;

  while (expandedSomething) {
    expandedSomething = false;
    const nodes = document.querySelectorAll('mat-tree-node');

    for (const node of nodes) {
      const toggleBtn = node.querySelector('button');
      if (!toggleBtn) continue;

      const isExpanded = node.getAttribute('aria-expanded') === 'true';

      if (!isExpanded) {
        toggleBtn.dispatchEvent(
          new MouseEvent('click', {
            bubbles: false,  // 🔥 critical
            cancelable: true
          })

        );

        expandedSomething = true;
      }
    }
  }
  console.log("All mat-tree nodes expanded.");
}

async function fetchViaBackground(url) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_URL', url },
      response => resolve(response)
    );
  });
}

async function getArticleContentFromTextField() {
  const editor = document.getElementById("editck") || document.getElementById("editck2")
  const editorInner = editor.querySelector('div[role="textbox"]')
  return editorInner.textContent
}

async function getArticleTitleFromTextField() {
  const header = document.getElementById("mat-input-1") ?? document.getElementById("mat-input-4")
  console.log(header)
  return header.value
}

async function runExtensionLogic(model) {
  const result = {
    status: "success",
    fetchedContent: null,
    matTreeStructure: null,
    labelsLinear: null,
    message: "Run finished"
  };

  await openTags();
  // -------------------------------
  // STEP 0 — Expand mat-tree fully
  // -------------------------------
  await expandAllMatTreeNodes();

  // -------------------------------
  // STEP 1 — Fetch source HTML
  // -------------------------------
  // const sourceInput = document.querySelector('input[name="source"]');
  // let fetchedHTML = null;
  let relevantText = await getArticleContentFromTextField();
  let title = await getArticleTitleFromTextField()

  let treeStructure = null;


  if (!relevantText) {
      result.fetchedContent = "Missing Content";
      result.status = "error"
      result.message = result.fetchedContent;
      return result;
  }
  if (!title) {
      result.fetchedContent = "Missing Title";
      result.status = "error"
      result.message = result.fetchedContent;
      return result;
  }

      console.log("Relevant Text Extracted:", relevantText);
    try {
      /*
      fetchedHTML = await fetchViaBackground(sourceInput.value);
      result.fetchedContent = fetchedHTML;
      console.log("Fetched Content:", fetchedHTML);

      // Extract only the relevant text using the tree labels as keywords
      const keywords = treeStructure ? flattenTreeLabels(treeStructure) : [];
      relevantText = extractRelevantText(fetchedHTML.data || fetchedHTML, keywords);
      
      */
    } catch (err) {
      result.status = "error"
      result.fetchedContent = "Fetch failed: " + err.message;
      result.message = result.fetchedContent;
    }


  // -------------------------------
  // STEP 2 — Build hierarchical mat-tree
  // -------------------------------
  const matTree = document.querySelector('mat-tree');

  if (matTree) {
    treeStructure = buildMatTree();
    result.matTreeStructure = treeStructure;
    console.log("Mat Tree Structure:", treeStructure);
  } else {
    result.status = "error"
    result.matTreeStructure = "No <mat-tree> found.";
    result.message = "No <mat-tree> found.";
  }

  // -------------------------------
  // STEP 3 — Extract relevant labels via GPT
  // -------------------------------
  if (treeStructure) {
    try {
      const { labels: linearLabels, warnings } = await getRelevantLabelsFromGPT(treeStructure, relevantText, title, model);
      result.labelsLinear = linearLabels;
      console.log("Linear Labels:", linearLabels);

      if (linearLabels.length == 0) {
        result.status = "error";
        result.message = "Article not relevant for Cyberdefense! (Response was empty)"
        return result
      }

      // -------------------------------
      // STEP 4 — Mark labels in mat-tree
      // -------------------------------
      await markRelevantLabelsInMatTree(linearLabels);

      if (warnings.length > 0) {
        result.status = "warning";
        result.message = "Tags added with warnings:\n" + warnings.join("\n");
      }

    } catch (err) {
      result.status = "error"
      result.labelsLinear = "Failed to extract labels: " + err;
      result.message = result.labelsLinear;
      return result
    }
  }


  return result;
}

// -------------------------------
// Build hierarchical tree from mat-tree
// -------------------------------
function buildMatTree() {
  const matTree = document.querySelector('mat-tree');
  if (!matTree) return null;

  const nodes = Array.from(matTree.querySelectorAll('mat-tree-node'));
  let tree = [];
  const stack = [];

  nodes.forEach(node => {
    const labelSpan = node.querySelector('.mat-checkbox-label');
    const label = labelSpan ? labelSpan.innerText.trim() : null;
    if (!label) return;

    const level = parseInt(node.getAttribute('aria-level') || '1', 10);
    const newNode = { label, children: [] };

    if (level === 1) {
      tree.push(newNode);
      stack[1] = newNode;
    } else {
      const parentNode = stack[level - 1];
      if (parentNode) parentNode.children.push(newNode);
      stack[level] = newNode;
    }

    stack.length = level + 1;
  });

  console.log(tree)

  tree = tree.filter(node =>
    !["InnoTech", "KriMiSi", "Auftragstags"].includes(node.label)
  );


  return tree;
}

// -------------------------------
// Flatten tree into 1D array
// -------------------------------
function flattenTreeLabels(tree) {
  const labels = [];
  function traverse(node) {
    labels.push(node.label);
    if (node.children) node.children.forEach(traverse);
  }
  tree.forEach(traverse);
  return labels;
}

// -------------------------------
// Dispatch prompt to the active auth backend
// -------------------------------
async function callLLM(prompt, model) {
  const { auth_mode } = await chrome.storage.local.get("auth_mode");
  const mode = auth_mode || "api_key";

  if (mode === "chatgpt") {
    await AwtsmoosGPTify("Prompt", "asdasd", "dfsdf")
    return chrome.runtime.sendMessage({ type: "CHATGPT_CALL", prompt, model });
  }

  const { openai_api_key } = await chrome.storage.local.get("openai_api_key");
  return chrome.runtime.sendMessage({
    type: "OPENAI_CALL",
    apiKey: openai_api_key,
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 1
  });
}

// -------------------------------
// Send both tree and HTML to GPT
// -------------------------------
async function getRelevantLabelsFromGPT(tree, htmlContent, title, model = "gpt-5-nano") {
  const flattenedLabels = flattenTreeLabels(tree);

  let strukturLables
  let cyberLables;
  let allgemeinLables;
  let newsInfoLables;

  tree.forEach(node => {
    console.log(node)
    let elements = flattenTreeLabels(node.children);
    switch (node.label) {
      case "Struktur": {
        strukturLables = elements;
      }
      case "Cyber": {
        cyberLables = elements;
      }
      case "Allgemeine Tags": {
        allgemeinLables = elements;
      }
      case "Newsinfo": {
        newsInfoLables = elements;
      }

    }
  })

  // Construct prompt for GPT
    const prompt = `
You are a label classifier.

Return a JSON array (1–20 labels) taken exactly from the Label-List.
No duplicates.

Required labels:
- "News"
- "[S]1 Cyber"
- Exactly ONE of: "Nachrichtenseite" OR "Blog"

Category minimums:
- At least 4 Cyber labels
- At least 5 Allgemeine Tags labels

Geographic rule (VERY IMPORTANT):

Select a geographic label only if the exact country name appears in the text (between BEGIN and END), or the text explicitly contains the full name of a known organization, city, or state that belongs to that country (e.g., "FBI" → USA, "New York" → USA).
For the USA: US = USA
Do not infer.
If ZERO matches are found, output "kein Standort" as the only geographic Label.

If 1-5 exact matches:
Include those labels.

If more than 5 exact matches:
Add "Global" as the only geographic label.

"Global" and "kein Standort" must not appear with other geographic labels.

Relevance:
Select only labels clearly supported by the Title or Article.
Do not guess.

Output example:
["News","[S]1 Cyber",...]

Label-List:

Cyber:
${cyberLables.join("\n")}

Allgemeine:
${allgemeinLables.join("\n")}

NewsInfo:
${newsInfoLables.join("\n")}

Struktur:
${strukturLables.join("\n")}

Article:
BEGIN
Title: ${title}
${htmlContent}
END
  `;

  const response = await callLLM(prompt, model);

  if (!response || !response.success) {
    throw new Error(response?.error || "No response from API");
  }

  const data = response.data;
  const cleaned = data
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();


  console.log("Data" + cleaned)

  // Try parsing JSON
  let labels;
  try {
    labels = JSON.parse(cleaned);
  } catch (err) {
    // fallback: split by line
    labels = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  }

  // Validate required tags (warn but don't block)
  const warnings = validateRequiredTags(labels, cyberLables, allgemeinLables);

  return { labels, warnings };
}

// -------------------------------
// Validate required tags in LLM output
// -------------------------------
function validateRequiredTags(labels, cyberLabels, allgemeineLabels) {
  const errors = [];

  if (!Array.isArray(labels)) {
    return ["Response is not an array of labels."];
  }

  // "News" must be present
  if (!labels.includes("News")) {
    errors.push('Missing required label: "News"');
  }

  // "[S]1 Cyber" must be present
  if (!labels.includes("[S]1 Cyber")) {
    errors.push('Missing required label: "[S]1 Cyber"');
  }

  // Exactly one of "Nachrichtenseite" or "Blog"
  const hasNachrichtenseite = labels.includes("Nachrichtenseite");
  const hasBlog = labels.includes("Blog");
  if (!hasNachrichtenseite && !hasBlog) {
    errors.push('Missing required label: must include "Nachrichtenseite" or "Blog"');
  } else if (hasNachrichtenseite && hasBlog) {
    errors.push('Must include exactly ONE of "Nachrichtenseite" or "Blog", not both');
  }

  // At least 4 Cyber labels
  const cyberCount = labels.filter(l => cyberLabels.includes(l)).length;
  if (cyberCount < 4) {
    errors.push(`Need at least 4 Cyber labels, got ${cyberCount}`);
  }

  // At least 5 Allgemeine Tags labels
  const allgemeineCount = labels.filter(l => allgemeineLabels.includes(l)).length;
  if (allgemeineCount < 5) {
    errors.push(`Need at least 5 Allgemeine Tags labels, got ${allgemeineCount}`);
  }

  return errors;
}

/**
 * Extract the most relevant text from HTML content.
 * Only keeps text, strips tags, and tries to find paragraphs containing keywords.
 *
 * @param {string} htmlContent - full HTML string
 * @param {string[]} keywords - keywords to search for
 * @returns {string} relevant text
 */
function extractRelevantText(htmlContent, keywords = []) {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Get all visible text elements (p, li, h1-h6)
  const elements = Array.from(doc.querySelectorAll("p, h1"));
  console.log(elements)

  // Filter elements that contain at least one keyword

  // Join the matched texts
  return elements.map(el => el.textContent.trim()).join("\n\n");
}

async function AwtsmoosGPTify({
    prompt = "Hi! Tell me about the Atzmut, but spell it Awtsmoos",
    parent_message_id,
    conversation_id,
    callback = null
}) {

  let return_data = ""
    var session  =await getSession()

    var token = session.accessToken;
    console.log(session)

    
    async function getSession() {
      return chrome.runtime.sendMessage({ type: "CHATGPT_SESSION" })
    }
    async function awtsmoosifyTokens() {
        console.log("Awtmossing tokens")


        console.log("Importet")

        var z = await g.bk() //chat requirements

        var r =  await g.bi(z.turnstile.bx) //turnstyle token
        var arkose = await g.bl.getEnforcementToken(z)
        var p = await g.bm.getEnforcementToken(z) //p token

        //A = fo(e.chatReq, l ?? e.arkoseToken, e.turnstileToken, e.proofToken, null)

        return g.fX(z,arkose, r, p, null)
    }
    console.log("Before T")
    console.log(prompt)
    const t = {
        "action": "next",
        "messages": [
            {
                "id": generateUID(),
                "author": {
                    "role": "user"
                },
                "content": {
                    "content_type": "text",
                    "parts": [
                        prompt
                    ]
                },
                "metadata": {
                    "serialization_metadata": {
                        "custom_symbol_offsets": []
                    }
                },
                "create_time": performance.now()
            }
        ],
        conversation_id,
        parent_message_id,
        "model": "auto",
        "timezone_offset_min": 300,
        "timezone": "America/New_York",
        "suggestions": [],
        "history_and_training_disabled": false,
        "conversation_mode": {
            "kind": "primary_assistant",
            "plugin_ids": null
        },
        "force_paragen": false,
        "force_paragen_model_slug": "",
        "force_rate_limit": false,
        "reset_rate_limits": false,
        "system_hints": [],
        "force_use_sse": true,
        "supported_encodings": [
            "v1"
        ],
        "conversation_origin": null,
        "client_contextual_info": {
            "is_dark_mode": false,
            "time_since_loaded": 121,
            "page_height": 625,
            "page_width": 406,
            "pixel_ratio": 1,
            "screen_height": 768,
            "screen_width": 1366
        },
        "paragen_stream_type_override": null,
        "paragen_cot_summary_display_override": "allow",
        "supports_buffering": true
    }

    console.log("Defineid t")

    function generateUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    await sendIt(await awtsmoosifyTokens(), t)

   
    async function sendIt(headers, body) {
        var g = chrome.runtime.sendMessage({type:"CHATGPT_COMPLETE", body: JSON.stringify(t), headers: headers, token: token});
        console.log(g)
        await logStream(g)
    }

    async function logStream(response) {
       var hasCallback = typeof(callback) == "function"
       var myCallback =  hasCallback ? callback : () => {};
        // Check if the response is okay
        if (!response.ok) {
            console.error('Network response was not ok:', response.statusText);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';
        var curEvent = null;
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.log('Stream finished');
                break;
            }

            // Decode the current chunk and add to the buffer
            buffer += decoder.decode(value, { stream: true });

            // Split buffer into lines
            const lines = buffer.split('\n');

            // Process each line
            for (let line of lines) {
                line = line.trim(); // Remove whitespace

                // Check if the line starts with "event:" or "data:"
                if (line.startsWith('event:')) {
                    const event = line.substring(6).trim(); // Extract event type
                    curEvent = event;
                    
                } else if (line.startsWith('data:')) {
                    const data = line.substring(5).trim(); // Extract data
                    
                    
                    // Attempt to parse the data as JSON
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(jsonData.v[0].v)
                        return_data += jsonData.v[0].v
                        if(!hasCallback)
                            console.log('Parsed JSON Data:', jsonData);
                        myCallback?.({data:jsonData, event: curEvent})
                    } catch (e) {
                        if(!hasCallback)
                            console.warn('Data is not valid JSON:', data);
                        myCallback({dataNoJSON: data,  event: curEvent, error:e})
                    }
                }
            }

            // Clear the buffer if the last line was complete
            if (lines[lines.length - 1].trim() === '') {
                buffer = '';
            } else {
                // Retain incomplete line for next iteration
                buffer = lines[lines.length - 1];
            }
        }
    }
    console.log(return_data)
    return return_data
}