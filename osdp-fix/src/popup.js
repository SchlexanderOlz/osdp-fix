'use strict';

document.getElementById('runBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'RUN_SCRIPT' },
      response => {
        document.getElementById('output').textContent =
          JSON.stringify(response, null, 2);
      }
    );
  });
});
