// what-is-this.js — Drop-in "What is this?" overlay for any Quilt app
// Usage: <script src="what-is-this.js"></script>
//
// Adds itself: pink "?" badge in bottom-right, click → modal with plain-English
// explanations of every Quilt term. No deps. Safe to add to any page.

(function() {
  if (window.__quiltWhatIsThisLoaded) return;
  window.__quiltWhatIsThisLoaded = true;

  var CSS = [
    '#quilt-help-btn{position:fixed;bottom:24px;right:24px;z-index:99998;',
    'width:52px;height:52px;border-radius:50%;',
    'background:linear-gradient(135deg,#ff80c0,#ff5fa8);color:#fff;',
    'border:none;font-size:24px;font-weight:bold;cursor:pointer;',
    'box-shadow:0 4px 20px rgba(255,128,192,.5);',
    'transition:transform .2s;font-family:Georgia,serif;',
    'animation:quilt-help-pulse 3s ease-in-out infinite}',
    '#quilt-help-btn:hover{transform:scale(1.1)}',
    '@keyframes quilt-help-pulse{0%,100%{box-shadow:0 4px 20px rgba(255,128,192,.5)}',
    '50%{box-shadow:0 4px 30px rgba(255,128,192,.8)}}',
    '#quilt-help-overlay{position:fixed;inset:0;z-index:99999;',
    'background:rgba(0,0,0,.78);backdrop-filter:blur(8px);',
    'display:none;align-items:center;justify-content:center;padding:2rem}',
    '#quilt-help-overlay.show{display:flex}',
    '#quilt-help-modal{background:#0d1220;color:#e8ecf4;',
    'border:1px solid #1a2238;border-radius:12px;',
    'max-width:780px;width:100%;max-height:85vh;overflow-y:auto;',
    'padding:2rem;font-family:-apple-system,Inter,sans-serif;',
    'box-shadow:0 20px 60px rgba(0,0,0,.6)}',
    '#quilt-help-modal h2{color:#00ff9d;margin:0 0 .5rem;font-size:1.5rem;',
    'font-weight:600}',
    '#quilt-help-modal h3{color:#00d4ff;margin:1.5rem 0 .4rem;font-size:1.05rem;',
    'font-weight:600}',
    '#quilt-help-modal p{margin:0 0 .7rem;line-height:1.55;color:#a8b2c8;font-size:.92rem}',
    '#quilt-help-modal code{background:#131a2b;color:#00d4ff;',
    'padding:.1em .4em;border-radius:4px;font-size:.85em;',
    'font-family:SF Mono,Monaco,monospace;border:1px solid #1a2238}',
    '#quilt-help-modal dl{display:grid;grid-template-columns:minmax(120px,max-content) 1fr;',
    'gap:.6rem 1rem;margin:1rem 0}',
    '#quilt-help-modal dt{color:#00d4ff;font-family:SF Mono,monospace;',
    'font-size:.85rem;font-weight:700}',
    '#quilt-help-modal dd{margin:0;color:#a8b2c8;font-size:.88rem;line-height:1.5}',
    '.quilt-help-close{position:sticky;top:0;float:right;',
    'background:transparent;color:#5a6580;border:1px solid #1a2238;',
    'padding:.4rem .8rem;border-radius:6px;cursor:pointer;font-size:.85rem;',
    'margin:-1rem -1rem 1rem 0;font-family:inherit}',
    '.quilt-help-close:hover{color:#ff4d6d;border-color:#ff4d6d}',
    '.quilt-help-copy{margin-top:1rem;padding:1rem;background:#06080f;',
    'border-radius:8px;border:1px dashed #283352}',
    '.quilt-help-copy pre{margin:0;color:#a8b2c8;font-size:.78rem;',
    'overflow-x:auto;font-family:SF Mono,monospace}',
    '.quilt-help-copy button{background:#00ff9d;color:#000;border:none;',
    'padding:.4rem .8rem;border-radius:4px;cursor:pointer;',
    'font-weight:600;font-size:.8rem;margin-bottom:.7rem}',
    '.quilt-help-copy button:hover{background:#3dffb7}'
  ].join('');

  var STYLE = document.createElement('style');
  STYLE.textContent = CSS;
  document.head.appendChild(STYLE);

  var BTN = document.createElement('button');
  BTN.id = 'quilt-help-btn';
  BTN.setAttribute('aria-label', 'What is this?');
  BTN.title = 'What is this? Click to learn what Quilt is and how this app works.';
  BTN.textContent = '?';
  BTN.onclick = toggleOverlay;
  document.body.appendChild(BTN);

  var OVERLAY = document.createElement('div');
  OVERLAY.id = 'quilt-help-overlay';
  OVERLAY.onclick = function(e) { if (e.target === OVERLAY) toggleOverlay(); };
  OVERLAY.innerHTML = modalContent();
  document.body.appendChild(OVERLAY);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && OVERLAY.classList.contains('show')) toggleOverlay();
  });

  function toggleOverlay() {
    OVERLAY.classList.toggle('show');
  }

  function modalContent() {
    return '<div id="quilt-help-modal">' +
      '<button class="quilt-help-close" onclick="document.getElementById(\'quilt-help-overlay\').classList.remove(\'show\')">✕ close (esc)</button>' +
      '<h2>What is this?</h2>' +
      '<p>This is a Quilt app. Quilt is a reactive-cell spreadsheet runtime — a spreadsheet where every cell is a live, addressable capability. The grid <em>is</em> the program.</p>' +
      '<p>Below: every technical term on this page, defined in plain English.</p>' +
      '<dl>' +
        term('Quilt', 'A spreadsheet that thinks. Every cell is a live, addressable capability.') +
        term('Cell', 'The smallest unit. A 16-dial vector, addressable by path. Can be a value, formula, listener, AI call, sensor, or actuator.') +
        term('16-dial vector', 'Each cell carries 16 signed 16-bit integers (Q1.15 fixed point). The first dial is the "mood"; the others are kind-specific.') +
        term('FNV-1a hash', 'The state hash. The canonical constant <code>0xbf27a3631cdee337</code> is what every port agrees on across 13 languages.') +
        term('Polyformalism', 'The same cell model expressed in many languages, byte-exact via the FNV-1a hash. JS, Python, C, Rust no_std, Verilog, VHDL, Go, Haskell, J, Lua, Zig, Forth, SubLEQ.') +
        term('L1–L8 architecture', 'The 8-layer stack of the Quilt repo ecosystem. L1 is hygiene (LICENSE, CI). L8 is community and cross-refs. Most apps use L1–L4.') +
        term('JEV', 'Joint Embedding Validator. Picks the best of N candidates per prompt moment. Lives in <code>substrate-llm-client</code>.') +
        term('Pincher', 'A tiered cache. Frequently-seen prompts skip the LLM and return a stored response in &lt;16ms.') +
        term('F-number', 'Lab-notebook shorthand. F161 = Conservation Laws. F170 = Federated TinyML Vessel. Like "equation 17" in a physics paper.') +
        term('Tile', 'A compiled reflex. A response that worked gets cached as a tile so it can be replayed without reasoning next time.') +
        term('Deadband', 'The waterline between reflex (under 16ms) and reason (over 100ms). Below, the body answers. Above, the cortex thinks.') +
      '</dl>' +
      '<h3>How to use this app</h3>' +
      '<p>Every app on this site runs on the same Quilt substrate. Change a cell; everything that depends on it recomputes. Press the <code>?</code> button (bottom-right) on any page to see this help again.</p>' +
      '<div class="quilt-help-copy">' +
        '<button onclick="copyEmbed()">📋 Copy embed snippet</button>' +
        '<pre id="embed-snippet">&lt;script src="what-is-this.js"&gt;&lt;/script&gt;</pre>' +
        '<p style="margin:.7rem 0 0;font-size:.85rem">Add this single line to any HTML page to enable the in-app help overlay. No build step. No dependencies. Self-contained.</p>' +
      '</div>' +
    '</div>';
  }

  function term(name, def) {
    return '<dt>' + name + '</dt><dd>' + def + '</dd>';
  }

  window.copyEmbed = function() {
    var code = document.getElementById('embed-snippet').textContent;
    navigator.clipboard.writeText(code).then(function() {
      var btn = event.target;
      var orig = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(function() { btn.textContent = orig; }, 2000);
    }).catch(function() {
      alert('Copy failed. Snippet: ' + code);
    });
  };
})();
