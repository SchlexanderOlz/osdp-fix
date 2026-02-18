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
function markRelevantLabelsInMatTree(labels) {
  if (!labels || labels.length === 0) return;

  const nodes = document.querySelectorAll('mat-tree-node');

  nodes.forEach(node => {
    const labelSpan = node.querySelector('.mat-checkbox-label');
    const label = labelSpan ? labelSpan.innerText.trim() : null;
    if (!label) return;

    if (labels.includes(label)) {
      // Find the input inside the mat-tree-checkbox and click it if not already checked
      const checkboxInput = node.querySelector('mat-checkbox input[type="checkbox"]');
      if (checkboxInput && !checkboxInput.checked) {
        checkboxInput.click(); // triggers Angular change detection
      }
    }
  });
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
        toggleBtn.click();
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

async function runExtensionLogic() {
  const result = {
    fetchedContent: null,
    matTreeStructure: null,
    labelsLinear: null
  };

  // -------------------------------
  // STEP 0 — Expand mat-tree fully
  // -------------------------------
  await expandAllMatTreeNodes();

  // -------------------------------
// STEP 1 — Fetch source HTML
// -------------------------------
const sourceInput = document.querySelector('input[name="source"]');
let fetchedHTML = null;
let relevantText = null;

if (sourceInput && sourceInput.value) {
  try {
    fetchedHTML = await fetchViaBackground(sourceInput.value);
    result.fetchedContent = fetchedHTML;
    console.log("Fetched Content:", fetchedHTML);

    // Extract only the relevant text using the tree labels as keywords
    const keywords = treeStructure ? flattenTreeLabels(treeStructure) : [];
    relevantText = extractRelevantText(fetchedHTML.data || fetchedHTML, keywords);
    console.log("Relevant Text Extracted:", relevantText);

  } catch (err) {
    result.fetchedContent = "Fetch failed: " + err.message;
  }
} else {
  result.fetchedContent = "No input[name='source'] found.";
}



  // -------------------------------
  // STEP 2 — Build hierarchical mat-tree
  // -------------------------------
  const matTree = document.querySelector('mat-tree');
  let treeStructure = null;

  if (matTree) {
    treeStructure = buildMatTree();
    result.matTreeStructure = treeStructure;
    console.log("Mat Tree Structure:", treeStructure);
  } else {
    result.matTreeStructure = "No <mat-tree> found.";
  }

  // -------------------------------
// STEP 3 — Extract relevant labels via GPT
// -------------------------------
if (treeStructure && fetchedHTML) {
  try {
    const linearLabels = await getRelevantLabelsFromGPT(treeStructure, relevantText);
    result.labelsLinear = linearLabels;
    console.log("Linear Labels:", linearLabels);

    // -------------------------------
    // STEP 4 — Mark labels in mat-tree
    // -------------------------------
    markRelevantLabelsInMatTree(linearLabels);

  } catch (err) {
    result.labelsLinear = "Failed to extract labels: " + err.message;
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
  const tree = [];
  const stack = [];

  nodes.forEach(node => {
    const labelSpan = node.querySelector('.mat-checkbox-label');
    const label = labelSpan ? labelSpan.innerText.trim() : null;
    if (!label || label === "InnoTech" || label === "KriMiSi") return;

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
async function getRelevantLabelsFromGPT(tree, htmlContent) {
  const flattenedLabels = flattenTreeLabels(tree);

  // Construct prompt for GPT
  const prompt = `
You are given a list of labels from a mat-tree and an HTML article.
Return a flat list of all labels that are relevant to the article content.
Do not include labels unrelated to the article.

Labels:
${flattenedLabels.join('\n')}

HTML content:
${htmlContent}

Return the result as a JSON array of strings.
`;

  // Example using OpenAI fetch endpoint
  // Replace with your GPT API call
  chrome.runtime.sendMessage({
  type: "OPENAI_CALL",
  apiKey: "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",
  messages: [{ role: "user", content: prompt }]
}).then(res => console.log(res));


  const data = await response.json();

  console.log(data)
  const text = data?.choices?.[0]?.message?.content;

  // Try parsing JSON
  try {
    return JSON.parse(text);
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
  const elements = Array.from(doc.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6"));

  // Filter elements that contain at least one keyword
  const matched = elements.filter(el => {
    const text = el.textContent.trim().toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });

  // Join the matched texts
  return matched.map(el => el.textContent.trim()).join("\n\n");
}
