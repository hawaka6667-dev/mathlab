/**
 * MathLab HUD Diagnostics & Runtime Logger
 */

// DOM References
const btnToggleConsole = document.getElementById('btnToggleConsole');
const consoleDrawer = document.getElementById('consoleDrawer');
const btnCloseConsole = document.getElementById('btnCloseConsole');
const consoleBody = document.getElementById('consoleBody');
const logBadge = document.getElementById('logBadge');
const hudEngineStatus = document.getElementById('hudEngineStatus');
const hudActiveVar = document.getElementById('hudActiveVar');
const btnRefreshLogs = document.getElementById('btnRefreshLogs');
const btnClearLogs = document.getElementById('btnClearLogs');
const btnCopyLogs = document.getElementById('btnCopyLogs');
const consoleTabs = document.querySelectorAll('.c-tab');

// Diagnostics Store
let localLogs = [];
let currentFilter = 'ALL';
let unreadErrors = 0;

function formatTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function addLog(level, category, message, meta) {
  const timeStr = formatTime(new Date());
  const entry = { time: timeStr, level, category, message, meta: meta || {} };
  localLogs.push(entry);
  if (localLogs.length > 300) localLogs.shift();

  if (level === 'ERROR') {
    unreadErrors++;
    if (logBadge) logBadge.classList.add('has-error');
  }
  if (logBadge) logBadge.innerText = localLogs.length;

  renderLogs();
}

export function renderLogs() {
  if (!consoleBody) return;
  const filtered = localLogs.filter(item => {
    if (currentFilter === 'ALL') return true;
    if (currentFilter === 'ERRORS') return item.level === 'ERROR' || item.level === 'WARN';
    return item.category === currentFilter || item.level === currentFilter;
  });

  consoleBody.innerHTML = filtered.map(item => `
    <div class="log-row">
      <span class="log-time">[${item.time}]</span>
      <span class="log-lvl lvl-${item.level}">${item.level}</span>
      <span class="log-cat">${item.category}:</span>
      <span class="log-msg">${escapeHtml(item.message)}</span>
    </div>
  `).join('');

  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function openConsole() {
  if (!consoleDrawer) return;
  consoleDrawer.classList.add('open');
  unreadErrors = 0;
  if (logBadge) logBadge.classList.remove('has-error');
  renderLogs();
}

export function toggleConsole() {
  if (!consoleDrawer) return;
  if (consoleDrawer.classList.contains('open')) {
    consoleDrawer.classList.remove('open');
  } else {
    openConsole();
  }
}

export function updateEngineHUD(status, varName) {
  if (hudEngineStatus && status) hudEngineStatus.innerText = status;
  if (hudActiveVar && varName) hudActiveVar.innerText = 'Var: ' + varName;
}

// Bind HUD controls
if (btnToggleConsole) btnToggleConsole.addEventListener('click', toggleConsole);
if (btnCloseConsole) btnCloseConsole.addEventListener('click', () => consoleDrawer.classList.remove('open'));

consoleTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    consoleTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-filter');
    renderLogs();
  });
});

if (btnClearLogs) {
  btnClearLogs.addEventListener('click', () => {
    localLogs = [];
    if (logBadge) {
      logBadge.innerText = '0';
      logBadge.classList.remove('has-error');
    }
    if (consoleBody) consoleBody.innerHTML = '<div style="color:#64748b;padding:8px;">(Logs cleared)</div>';
    fetch('/api/logs/clear', { method: 'POST' }).catch(() => {});
  });
}

if (btnRefreshLogs) {
  btnRefreshLogs.addEventListener('click', () => {
    fetch('/api/logs')
      .then(r => r.json())
      .then(serverEntries => {
        if (Array.isArray(serverEntries)) {
          serverEntries.forEach(se => {
            if (!localLogs.some(l => l.message === se.message && l.category === se.category)) {
              addLog(se.level || 'INFO', se.category || 'SERVER', se.message, se.meta);
            }
          });
        }
      })
      .catch(err => addLog('WARN', 'LOGS', 'Failed to pull server logs: ' + err.message));
  });
}

if (btnCopyLogs) {
  btnCopyLogs.addEventListener('click', () => {
    const text = localLogs.map(l => `[${l.time}] [${l.level}] [${l.category}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      btnCopyLogs.innerText = '✓ 已复制';
      setTimeout(() => { btnCopyLogs.innerText = '📋 复制'; }, 1500);
    });
  });
}

// Global Keybinding for Console (~ or `)
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if ((e.key === '`' || e.key === '~') && activeTag !== 'input') {
    e.preventDefault();
    toggleConsole();
  }
});

// Intercept Window Errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
  addLog('ERROR', 'RUNTIME', `${msg} (${url ? url.split('/').pop() : ''}:${lineNo}:${columnNo})`);
};
window.onunhandledrejection = function(e) {
  addLog('ERROR', 'PROMISE', e.reason ? (e.reason.message || e.reason) : 'Unhandled rejection');
};
