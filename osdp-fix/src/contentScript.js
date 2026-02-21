'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RUN_SCRIPT') {
    runExtensionLogic().then(result => {
      sendResponse(result);
    });

    return true; // Required for async response
  }
});
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
  const editor = document.getElementById("editck")
  const editorInner = editor.querySelector('div[role="textbox"]')
  return editorInner.textContent
}

async function getArticleTitleFromTextField() {
  const header = document.getElementById("mat-input-1")
  return header.value
}

async function runExtensionLogic() {
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
      const linearLabels = await getRelevantLabelsFromGPT(treeStructure, relevantText, title);
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

    } catch (err) {
      result.status = "error"
      result.labelsLinear = "Failed to extract labels: " + err.message;
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

Only select a geographic label if its exact wording appears in the Article (between BEGIN and END).
No inference, no abbreviation expansion.

If ZERO exact geographic matches are found:
Add "kein Standort" as the only geographic label.

If 1–5 exact matches:
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

  const apiKey = (await chrome.storage.local.get("openai_api_key")).openai_api_key;

  // Example using OpenAI fetch endpoint
  // Replace with your GPT API call
  const response = await chrome.runtime.sendMessage({
    type: "OPENAI_CALL",
    apiKey: apiKey,
    model: model,
    messages: [{ role: "user", content: prompt}],
    temperature: 1
  })
  const data = response.data;
  const cleaned = data
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();


  console.log("Data" + cleaned)

  // Try parsing JSON
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // fallback: split by line
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  }
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
