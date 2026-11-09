/**
 * MathLab Favorites Management Module
 */

const btnStar = document.getElementById('btnStar');
const btnOpenFavs = document.getElementById('btnOpenFavs');
const btnCloseFavs = document.getElementById('btnCloseFavs');
const favsModal = document.getElementById('favsModal');
const favsList = document.getElementById('favsList');
const favCount = document.getElementById('favCount');
const exprInput = document.getElementById('exprInput');

let favorites = [];
let onSubmitCallback = null;

export function initFavorites(onSubmit) {
  onSubmitCallback = onSubmit;

  if (btnStar) btnStar.addEventListener('click', () => { toggleFavorite(); });
  if (btnOpenFavs) btnOpenFavs.addEventListener('click', () => { favsModal.classList.toggle('open'); });
  if (btnCloseFavs) btnCloseFavs.addEventListener('click', () => { favsModal.classList.remove('open'); });

  document.addEventListener('click', (e) => {
    if (favsModal && favsModal.classList.contains('open') && !favsModal.contains(e.target) && e.target !== btnOpenFavs) {
      favsModal.classList.remove('open');
    }
  });

  loadFavorites();
}

export function updateStarStatus() {
  if (!exprInput || !btnStar) return;
  const current = exprInput.value.trim();
  const isStarred = favorites.some(f => f.fn.trim() === current);
  if (isStarred) {
    btnStar.classList.add('starred');
    btnStar.innerText = '★ 已收藏';
  } else {
    btnStar.classList.remove('starred');
    btnStar.innerText = '☆ 收藏';
  }
  if (favCount) favCount.innerText = favorites.length;
}

export async function loadFavorites() {
  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      favorites = await res.json();
      renderFavoritesList();
      updateStarStatus();
    }
  } catch (e) {
    const stored = localStorage.getItem('mathlab_favs');
    if (stored) {
      favorites = JSON.parse(stored);
      renderFavoritesList();
      updateStarStatus();
    }
  }
}

function renderFavoritesList() {
  if (!favsList) return;
  favsList.innerHTML = '';
  if (favorites.length === 0) {
    favsList.innerHTML = `<div style="color:#64748b;font-size:12px;text-align:center;margin-top:20px;">暂无收藏，点击顶部 ☆ 收藏即可保存函数</div>`;
    return;
  }
  favorites.forEach(f => {
    const card = document.createElement('div');
    card.className = 'fav-card';
    card.innerHTML = `
      <div class="fav-title">${f.title || '收藏函数'}</div>
      <div class="fav-fn">${f.fn}</div>
      <div class="fav-actions">
        <button class="fav-btn-load" data-fn="${encodeURIComponent(f.fn)}">⚡ 绘制</button>
        <button class="fav-btn-del" data-fn="${encodeURIComponent(f.fn)}">🗑️</button>
      </div>
    `;
    favsList.appendChild(card);
  });

  favsList.querySelectorAll('.fav-btn-load').forEach(btn => {
    btn.addEventListener('click', () => {
      const fn = decodeURIComponent(btn.getAttribute('data-fn'));
      if (exprInput) exprInput.value = fn;
      if (favsModal) favsModal.classList.remove('open');
      if (onSubmitCallback) onSubmitCallback(fn);
    });
  });

  favsList.querySelectorAll('.fav-btn-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fn = decodeURIComponent(btn.getAttribute('data-fn'));
      await toggleFavorite(fn, 'remove');
    });
  });

  updateStarStatus();
}

export async function toggleFavorite(targetFn, forcedAction) {
  const fn = targetFn || (exprInput ? exprInput.value.trim() : '');
  if (!fn) return;
  const isAlready = favorites.some(f => f.fn.trim() === fn);
  const action = forcedAction || (isAlready ? 'remove' : 'add');

  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn, action, title: fn })
    });
    if (res.ok) {
      favorites = await res.json();
    }
  } catch (e) {
    if (action === 'remove') {
      favorites = favorites.filter(f => f.fn.trim() !== fn);
    } else {
      favorites.unshift({ id: 'fav-' + Date.now(), fn, title: fn });
    }
  }
  localStorage.setItem('mathlab_favs', JSON.stringify(favorites));
  renderFavoritesList();
  updateStarStatus();
}
