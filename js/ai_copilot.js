/**
 * MathLab Gemini AI Copilot Sidecar Module
 * Inspired by NotebookLM / Google Drive AI Sidecar
 */

import { addLog } from './hud_logger.js';

let onStateUpdateCallback = null;
let onModeSwitchCallback = null;
let chatHistory = [];

const btnToggleAI = document.getElementById('btnToggleAI');
const aiSidecar = document.getElementById('aiSidecar');
const btnCloseAI = document.getElementById('btnCloseAI');
const aiChatThread = document.getElementById('aiChatThread');
const aiInput = document.getElementById('aiInput');
const btnSendAI = document.getElementById('btnSendAI');
const btnConfigKey = document.getElementById('btnConfigKey');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnSaveKey = document.getElementById('btnSaveKey');
const btnCloseKeyModal = document.getElementById('btnCloseKeyModal');
const aiStatusBadge = document.getElementById('aiStatusBadge');

export function initAICopilot(onStateUpdate, onModeSwitch) {
  onStateUpdateCallback = onStateUpdate;
  onModeSwitchCallback = onModeSwitch;

  // Restore stored API Key
  const storedKey = localStorage.getItem('mathlab_gemini_key');
  if (storedKey && apiKeyInput) {
    apiKeyInput.value = storedKey;
  }
  checkKeyStatus();

  // Event Listeners
  if (btnToggleAI) btnToggleAI.addEventListener('click', toggleAISidecar);
  if (btnCloseAI) btnCloseAI.addEventListener('click', () => aiSidecar.classList.remove('open'));

  if (btnConfigKey) {
    btnConfigKey.addEventListener('click', () => {
      if (apiKeyModal) apiKeyModal.classList.add('open');
    });
  }
  if (btnCloseKeyModal) {
    btnCloseKeyModal.addEventListener('click', () => {
      if (apiKeyModal) apiKeyModal.classList.remove('open');
    });
  }
  if (btnSaveKey) {
    btnSaveKey.addEventListener('click', () => {
      const k = apiKeyInput.value.trim();
      if (k) {
        localStorage.setItem('mathlab_gemini_key', k);
        fetch('/api/ai/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: k })
        }).then(() => checkKeyStatus());
      } else {
        localStorage.removeItem('mathlab_gemini_key');
        checkKeyStatus();
      }
      if (apiKeyModal) apiKeyModal.classList.remove('open');
      addLog('INFO', 'AI_CONFIG', 'API Key updated');
    });
  }

  if (btnSendAI) {
    btnSendAI.addEventListener('click', () => sendAIMessage());
  }
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });
  }

  // Quick prompt chips
  document.querySelectorAll('.ai-quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt && aiInput) {
        aiInput.value = prompt;
        sendAIMessage();
      }
    });
  });
}

function checkKeyStatus() {
  fetch('/api/ai/config')
    .then(r => r.json())
    .then(data => {
      const hasKey = data.hasKey || Boolean(localStorage.getItem('mathlab_gemini_key'));
      if (aiStatusBadge) {
        if (hasKey) {
          aiStatusBadge.innerText = 'Gemini 3.8 Flash (Active)';
          aiStatusBadge.className = 'ai-badge active';
        } else {
          aiStatusBadge.innerText = 'Local Planner (Click 🔑 to set Key)';
          aiStatusBadge.className = 'ai-badge local';
        }
      }
    })
    .catch(() => {});
}

export function toggleAISidecar() {
  if (!aiSidecar) return;
  aiSidecar.classList.toggle('open');
  if (aiSidecar.classList.contains('open') && aiInput) {
    aiInput.focus();
  }
}

export async function sendAIMessage(explicitText) {
  const text = explicitText || (aiInput ? aiInput.value.trim() : '');
  if (!text) return;

  if (aiInput) aiInput.value = '';
  appendUserMessage(text);
  chatHistory.push({ role: 'user', content: text });

  // Loading state
  const loadingBubble = appendLoadingBubble();
  if (btnSendAI) {
    btnSendAI.disabled = true;
    btnSendAI.innerText = '...';
  }

  const storedKey = localStorage.getItem('mathlab_gemini_key') || '';
  addLog('INFO', 'AI_COPILOT', `Sending chat prompt: "${text.slice(0, 35)}..."`);

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(-8),
        apiKey: storedKey
      })
    });

    const data = await res.json();
    loadingBubble.remove();

    if (!res.ok) {
      appendAIMessage(`⚠️ **请求异常**: ${data.error || 'Server error'}`, []);
      return;
    }

    // Execute state & mode updates if returned by AI tools
    if (data.actions && data.actions.length > 0) {
      data.actions.forEach(a => {
        addLog('INFO', 'AI_ACTION', `Tool [${a.tool}]: ${a.result}`);
        if (a.tool === 'set_term_density' && window.mathlabSetTermDensity) {
          window.mathlabSetTermDensity(a.args.density);
        }
        if (a.tool === 'set_theme' && window.mathlabSetTheme) {
          window.mathlabSetTheme(a.args.theme);
        }
        if (a.tool === 'set_locale' && window.mathlabSetLocale) {
          window.mathlabSetLocale(a.args.locale);
        }
      });
    }

    if (data.state && onStateUpdateCallback) {
      onStateUpdateCallback(data.state);
    }
    if (data.mode && onModeSwitchCallback) {
      onModeSwitchCallback(data.mode);
    }

    appendAIMessage(data.reply, data.actions || []);
    chatHistory.push({ role: 'model', content: data.reply });

  } catch (err) {
    if (loadingBubble) loadingBubble.remove();
    appendAIMessage(`⚠️ **网络或解析错误**: ${err.message}`, []);
    addLog('ERROR', 'AI_COPILOT', err.message);
  } finally {
    if (btnSendAI) {
      btnSendAI.disabled = false;
      btnSendAI.innerText = '发送';
    }
  }
}

function appendUserMessage(text) {
  if (!aiChatThread) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-msg user';
  msgDiv.innerHTML = `<div class="ai-msg-bubble">${escapeHtml(text)}</div>`;
  aiChatThread.appendChild(msgDiv);
  aiChatThread.scrollTop = aiChatThread.scrollHeight;
}

function appendAIMessage(markdownText, actions) {
  if (!aiChatThread) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-msg model';

  let actionsHtml = '';
  if (actions && actions.length > 0) {
    actionsHtml = actions.map(a => `
      <div class="ai-tool-pill">
        <span class="pill-tag">⚡ ACTION</span>
        <span class="pill-name">${escapeHtml(a.tool)}</span>
        <span class="pill-res">${escapeHtml(a.result)}</span>
      </div>
    `).join('');
  }

  const formatted = renderSimpleMarkdown(markdownText);
  msgDiv.innerHTML = `
    <div class="ai-msg-bubble">
      ${actionsHtml}
      <div class="ai-text-content">${formatted}</div>
    </div>
  `;
  aiChatThread.appendChild(msgDiv);
  aiChatThread.scrollTop = aiChatThread.scrollHeight;
}

function appendLoadingBubble() {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'ai-msg model loading';
  msgDiv.innerHTML = `
    <div class="ai-msg-bubble">
      <span class="ai-dot-pulse"></span> 思考与调度中...
    </div>
  `;
  aiChatThread.appendChild(msgDiv);
  aiChatThread.scrollTop = aiChatThread.scrollHeight;
  return msgDiv;
}

function renderSimpleMarkdown(s) {
  let html = escapeHtml(s);
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  // Inline code / math
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\$([^$]+)\$/g, '<code class="math-tex">$1</code>');
  // Alert blocks
  html = html.replace(/&gt;\s*\[!(TIP|NOTE|WARNING|CAUTION)\]\s*(.*?)(?=\n|$)/g, '<div class="alert-box alert-$1"><b>$1:</b> $2</div>');
  // Line breaks
  html = html.replace(/\n\n/g, '<p style="margin:6px 0;"></p>').replace(/\n/g, '<br>');
  return html;
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
