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
async function getRelevantLabelsFromGPT(tree, htmlContent, title) {
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
You are a deterministic label classification engine.
Your task is to select labels from the provided **Label-List** and **Title** that are explicitly supported by the Article.

You must strictly follow all rules.
If any rule is violated, return: []

---

## 1. General Output Rules
* Output must be a JSON array of objects, where each object has exactly two fields:
  * "label" → the label string (must appear exactly as written in the Label-List)
  * "justification" -> must contain exactly four consecutive words taken verbatim from the Title or Article that clearly indicate the label's relevance. Do not include the label if no suitable snippet exists. The snippet must make sense in context; arbitrary words are invalid. Labels like "News", "Nachrichtenseite", "Blog", and the geographic fallback labels "Global" and "kein Standort" do NOT require a justification.
* Maximum 20 labels.
* Minimum 1 label.
* No duplicates.
* All labels must appear exactly as written in the Label-List.
* All labels must be in German.
* The "justification" field must reference text explicitly present in the Title or Article.

---

## 2. Mandatory Labels
The output must include:
* "News"
* "[S]1 Cyber"
* Exactly ONE of:
  * "Nachrichtenseite"
  * "Blog"
  * Selecting both or neither → return [].
* "geographische Lokation" Lables

---

## 3. Category Minimum Requirements
Label categories are defined by their section in the Label-List.
* Labels under **Cyber-Labels** count as Cyber.
* Labels under **Allgemeine Tags-Labels** count as Allgemeine Tags.
* Labels under **NewsInfo-Labels** and **Struktur-Labels** do NOT count toward Cyber or Allgemeine.

The output must contain:
* At least 4 Cyber labels.
* At least 5 Allgemeine Tags labels.
* If not satisfied → return [].

---

## 4. Geographic Location Rules
A geographic location is valid ONLY if the exact label string appears verbatim in the Article text between BEGIN and END.
The label must match the visible text exactly (case-sensitive match not required, but wording must be identical).
Semantic interpretation, abbreviation expansion, or inference is strictly forbidden.

Examples:
* "U.S." does NOT justify selecting "USA"
* "European" does NOT justify selecting "Europa"
* Article language does NOT justify selecting a geographic Location Tag

If a geographic label is selected without exact textual occurrence → return [{"label": "kein Standort", "justficiation": "Case C"}].
Exactly ONE of the following cases must apply:
### Case A - 1-5 exact matches found
* Include each matching geographic label.
* Minimum 1, maximum 5.

### Case B - More than 5 exact matches found
* Return exactly: [{"label": "Global", "justficiation": "Case B"}]
* No other geographic labels allowed.

### Case C - No exact match found
* Return exactly: [{"label": "kein Standort", "justification": "Case C"}]
* "kein Standort" does NOT require a 4-word justification.
* No other geographic labels allowed.

"Global" and "kein Standort" must not appear together or with any other geographic label.

---

## 5. Relevance Rules
* Only select labels directly and explicitly supported by the Article.
* Do NOT infer, assume, or speculate.
* Ignore navigation, ads, metadata, and irrelevant HTML.
* Classify based only on the Article content and Title between:

BEGIN
...
END

---

## 6. Global Validation
The final output must satisfy ALL of the following:
* 1-20 total labels
* Includes "News"
* Includes "[S]1 Cyber"
* Exactly one source label
* ≥4 Cyber labels
* ≥5 Allgemeine Tags labels
* Exactly one valid geographic case (A, B, or C)
* No duplicates
* All labels contained in the Label-List only

If ANY condition fails → return: []

---

## 7. Controlled Concept Association
### Labels may be assigned if:
* The label appears literally in the Article text, or
* The Article text contains explicit concepts, terms, or phrases that clearly and directly justify the label.
### Do not assign labels based on weak or inferred association.
* Example: “AI agent standards in the U.S.” does not justify AI Act.
* Example: “European AI regulation / European Commission AI law” justifies AI Act.
If unsure, omit the label rather than guessing.

---

## 8. Weighting Rules
* Give more weight to the Title than to the body text when determining relevance.
  * Labels mentioned or strongly implied in the Title are preferred.
* Labels must still have supporting evidence in either the Title or Article.
  * Article body can provide additional context, but cannot justify labels contradicting the Title.

---

Output format:
[{"justification":"U.S. National Institute of","label": "USA"},{"justification":"increasing cyber reliability in","label":"Cyber"}]

Label-List:
Cyber-Lables:
${cyberLables.join("\n")}

Allgemeine Tags-Lables:
${allgemeinLables.join("\n")}

NewsInfo-Lables:
${newsInfoLables.join("\n")}

Struktur-Lables:
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
    messages: [{ role: "user", content: prompt }]
  })
  const data = response.data;
  const cleaned = data
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();


  console.log("Data" + cleaned)

  // Try parsing JSON
  try {
    return JSON.parse(cleaned).map(e => e.label);
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
