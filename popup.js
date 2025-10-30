// popup.js — Final: Popup + New Tab (Copy works everywhere)
(async () => {
  console.log("POPUP: Script loaded");

  const statusEl = document.getElementById('status');
  const urlEl = document.getElementById('url');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('http')) {
    statusEl.innerHTML = '<div class="empty">Cannot scan this page</div>';
    return;
  }

  urlEl.textContent = tab.url;

  const run = async () => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const manifest = window.__BUILD_MANIFEST || 
            (window.__NEXT_DATA__ && window.__NEXT_DATA__.props?.pageProps?.__N_SSG && 
             Object.keys(window.__NEXT_DATA__.props.pageProps).filter(k => k.startsWith('/')));
          if (!manifest || !manifest.sortedPages) return null;

          const p = manifest.sortedPages;
          const api = p.filter(r => r.startsWith('/api'));
          const dynamic = p.filter(r => r.includes('[') && !r.startsWith('/api') && !r.includes('[...'));
          const catchAll = p.filter(r => r.includes('[...]'));
          const stat = p.filter(r => !r.includes('[') && !r.startsWith('/api'));

          return { p, api, dynamic, catchAll, stat, total: p.length };
        },
        world: 'MAIN'
      });

      const data = results[0]?.result;
      if (!data) {
        statusEl.innerHTML = '<div class="empty">No Next.js manifest found</div>';
        return;
      }

      const { p, api, dynamic, catchAll, stat, total } = data;
      const origin = new URL(tab.url).origin;

      const createLinks = (routes) => {
        if (routes.length === 0) return 'No API routes';
        return routes.map(r => `<a href="${origin}${r}" target="_blank" style="color: #0070f3; text-decoration: none;">${r}</a>`).join('<br>');
      };

      statusEl.innerHTML = `
        <div style="margin: 8px 0 12px; font-size: 13px; color: #0070f3; font-weight: 600;">
          Total: ${total} endpoints
        </div>
        
        <div class="section">
          <div class="header">
            <span>API Routes (${api.length})</span>
            <span class="arrow">▼</span>
          </div>
          <div class="content" id="api-content">
            <pre>${createLinks(api)}</pre>
          </div>
        </div>
        
        <div class="section">
          <div class="header">
            <span>Dynamic Routes (${dynamic.length})</span>
            <span class="arrow">▼</span>
          </div>
          <div class="content" id="dynamic-content">
            <pre>${createLinks(dynamic)}</pre>
          </div>
        </div>
        
        <div class="section">
          <div class="header">
            <span>Catch-All Routes (${catchAll.length})</span>
            <span class="arrow">▼</span>
          </div>
          <div class="content" id="catchall-content">
            <pre>${createLinks(catchAll)}</pre>
          </div>
        </div>
        
        <div class="section">
          <div class="header">
            <span>Static Pages (${stat.length})</span>
            <span class="arrow">▼</span>
          </div>
          <div class="content" id="static-content">
            <pre>${createLinks(stat)}</pre>
          </div>
        </div>
      `;

      // COPY BUTTONS (Popup)
      document.getElementById('copyAll').onclick = () => copyToClipboard(p.join('\n'), 'All routes');
      document.getElementById('copyAPI').onclick = () => copyToClipboard(api.join('\n'), 'API routes');

      // OPEN IN NEW TAB
      document.getElementById('openNewTab').onclick = () => openInNewTab(data, tab.url, origin);

      // ADD EVENT LISTENERS FOR TOGGLE
      document.querySelectorAll('.header').forEach(header => {
        header.addEventListener('click', () => {
          const content = header.nextElementSibling;
          const arrow = header.querySelector('.arrow');
          const isVisible = content.style.display === 'block';
          content.style.display = isVisible ? 'none' : 'block';
          arrow.textContent = isVisible ? '▼' : '▲';
        });
      });

      // SHOW FIRST SECTION INITIALLY
      const firstContent = document.getElementById('api-content');
      if (firstContent) {
        firstContent.style.display = 'block';
        firstContent.previousElementSibling.querySelector('.arrow').textContent = '▲';
      }

    } catch (error) {
      console.error("POPUP: Error:", error);
      statusEl.innerHTML = `<div class="empty">Error: ${error.message}</div>`;
    }
  };

  // COPY FUNCTION (Popup)
  function copyToClipboard(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showSuccess(`Copied ${label}!`);
      }).catch(() => {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showSuccess(`Copied ${label}!`);
    } catch (err) {
      alert(`Failed to copy ${label}`);
    }
    document.body.removeChild(textarea);
  }

  function showSuccess(msg) {
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.style.cssText = `
      position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
      background: #28a745; color: white; padding: 8px 16px; border-radius: 4px;
      font-size: 12px; z-index: 10000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
  }

  // OPEN IN NEW TAB (Copy works via execCommand)
  function openInNewTab(data, url, origin) {
    const { p, api, dynamic, catchAll, stat, total } = data;

    const createLinks = (routes) => {
        if (routes.length === 0) return 'None';
        return routes.map(r => `<a href="${origin}${r}" target="_blank" style="color: #0070f3; text-decoration: none;">${r}</a>`).join('<br>');
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Next.js Routes - ${url}</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #fff; padding: 30px; line-height: 1.6; color: #1a1a1a; }
    h1 { color: #0070f3; border-bottom: 2px solid #0070f3; padding-bottom: 10px; font-size: 24px; }
    h2 { color: #0070f3; margin-top: 30px; font-size: 18px; }
    pre { background: #f5f5f5; padding: 16px; border-left: 5px solid #0070f3; overflow-x: auto; white-space: pre-wrap; font-size: 13px; margin: 10px 0; line-height: 1.8; }
    .btn { background: #0070f3; color: white; border: none; padding: 10px 18px; margin: 6px; cursor: pointer; border-radius: 6px; font-size: 14px; }
    .btn:hover { opacity: 0.9; }
    .btn.green { background: #28a745; }
    .info { font-size: 14px; color: #555; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Next.js Routes</h1>
  <p class="info"><strong>Target:</strong> ${url}</p>
  <p class="info"><strong>Total Endpoints:</strong> ${total}</p>

  <button class="btn" onclick="copyAll()">Copy All Routes</button>
  <button class="btn" onclick="copyAPI()">Copy API Routes</button>

  <h2>API Routes (${api.length})</h2>
  <pre>${createLinks(api)}</pre>

  <h2>Dynamic Routes (${dynamic.length})</h2>
  <pre>${createLinks(dynamic)}</pre>

  <h2>Catch-All Routes (${catchAll.length})</h2>
  <pre>${createLinks(catchAll)}</pre>

  <h2>Static Pages (${stat.length})</h2>
  <pre>${createLinks(stat)}</pre>

  <script>
    const allRoutes = ${JSON.stringify(p)};
    const apiRoutes = ${JSON.stringify(api)};

    function copyText(text, successMsg) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert(successMsg);
        } else {
          alert('Copy failed — please select and copy manually');
        }
      } catch (err) {
        alert('Copy failed: ' + err.message);
      }

      document.body.removeChild(textarea);
    }

    function copyAll() {
      copyText(allRoutes.join('\n'), 'Copied all routes!');
    }

    function copyAPI() {
      copyText(apiRoutes.join('\n'), 'Copied API routes!');
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    chrome.tabs.create({ url: blobUrl });
  }

  run();

})();
