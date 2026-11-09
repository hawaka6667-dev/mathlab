/**
 * MathLab Hierarchical Favorites Management Module
 * Supports two-level categorization: default, textbook, geometry, singularity
 */

import { t, getLocale } from './i18n.js';

const btnStar = document.getElementById('btnStar');
const btnOpenFavs = document.getElementById('btnOpenFavs');
const btnCloseFavs = document.getElementById('btnCloseFavs');
const favsModal = document.getElementById('favsModal');
const favsList = document.getElementById('favsList');
const favCount = document.getElementById('favCount');
const exprInput = document.getElementById('exprInput');

let favsData = {
  version: "2.0",
  categories: []
};
let activeCategory = "default";
let onSubmitCallback = null;

export function initFavorites(onSubmit) {
  onSubmitCallback = onSubmit;

  if (btnStar) btnStar.addEventListener('click', () => { toggleFavorite(); });
  if (btnOpenFavs) btnOpenFavs.addEventListener('click', () => { 
    favsModal.classList.toggle('open');
    if (favsModal.classList.contains('open')) {
      renderCategoryUI();
    }
  });
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
  const allItems = getAllItems();
  const isStarred = allItems.some(f => f.fn.trim() === current);
  if (isStarred) {
    btnStar.classList.add('starred');
    btnStar.innerText = t('btnStarred');
  } else {
    btnStar.classList.remove('starred');
    btnStar.innerText = t('btnStar');
  }
  if (favCount) favCount.innerText = allItems.length;
}

export function getAllItems() {
  const items = [];
  (favsData.categories || []).forEach(cat => {
    (cat.items || []).forEach(it => items.push(it));
  });
  return items;
}

export async function loadFavorites() {
  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      favsData = await res.json();
      if (Array.isArray(favsData)) {
        favsData = {
          version: "2.0",
          categories: [{ id: "default", name: { zh: "基础常备", en: "Default", zh_en: "基础 Basics" }, items: favsData }]
        };
      }
      renderCategoryUI();
      updateStarStatus();
    }
  } catch (e) {
    const stored = localStorage.getItem('mathlab_favs_v2');
    if (stored) {
      favsData = JSON.parse(stored);
      renderCategoryUI();
      updateStarStatus();
    }
  }
}

export function renderCategoryUI() {
  if (!favsModal) return;

  // Check or create category tabs container
  let tabsBar = document.getElementById('favCategoryTabs');
  if (!tabsBar) {
    tabsBar = document.createElement('div');
    tabsBar.id = 'favCategoryTabs';
    tabsBar.className = 'fav-category-tabs';
    const header = favsModal.querySelector('.fav-header');
    if (header && header.nextSibling) {
      favsModal.insertBefore(tabsBar, header.nextSibling);
    } else {
      favsModal.prepend(tabsBar);
    }
  }

  tabsBar.innerHTML = '';
  const locale = getLocale();
  const cats = favsData.categories || [];

  if (cats.length > 0 && !cats.some(c => c.id === activeCategory)) {
    activeCategory = cats[0].id;
  }

  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `cat-tab-btn ${cat.id === activeCategory ? 'active' : ''}`;
    let catTitle = cat.id;
    if (cat.name) {
      catTitle = (locale === 'en' ? cat.name.en : (locale === 'zh' ? cat.name.zh : (cat.name.zh_en || cat.name.zh))) || cat.id;
    }
    const count = (cat.items || []).length;
    btn.innerHTML = `${catTitle} <span class="cat-badge">${count}</span>`;
    btn.addEventListener('click', () => {
      activeCategory = cat.id;
      renderCategoryUI();
    });
    tabsBar.appendChild(btn);
  });

  renderActiveCategoryList();
}

function renderActiveCategoryList() {
  if (!favsList) return;
  favsList.innerHTML = '';

  const cat = (favsData.categories || []).find(c => c.id === activeCategory);
  const items = cat ? (cat.items || []) : [];

  if (items.length === 0) {
    favsList.innerHTML = `<div style="color:#64748b;font-size:12px;text-align:center;margin-top:28px;">${t('favEmpty')}</div>`;
    return;
  }

  items.forEach(f => {
    const card = document.createElement('div');
    card.className = 'fav-card';
    card.innerHTML = `
      <div class="fav-title">${f.title || f.fn}</div>
      <div class="fav-fn">${f.fn}</div>
      <div class="fav-actions">
        <button class="fav-btn-load" data-fn="${encodeURIComponent(f.fn)}">⚡ ${t('favPlotBtn')}</button>
        <button class="fav-btn-del" data-fn="${encodeURIComponent(f.fn)}" title="${getLocale() === 'en' ? 'Delete' : '删除'}">🗑️</button>
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
  const allItems = getAllItems();
  const isAlready = allItems.some(f => f.fn.trim() === fn);
  const action = forcedAction || (isAlready ? 'remove' : 'add');

  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn, action, category: activeCategory, title: fn })
    });
    if (res.ok) {
      favsData = await res.json();
    }
  } catch (e) {
    // Offline local fallback
    if (action === 'remove') {
      (favsData.categories || []).forEach(c => {
        c.items = (c.items || []).filter(item => item.fn.trim() !== fn);
      });
    } else {
      let targetCat = (favsData.categories || []).find(c => c.id === activeCategory);
      if (!targetCat) {
        targetCat = { id: activeCategory, name: { zh: activeCategory, en: activeCategory }, items: [] };
        favsData.categories.push(targetCat);
      }
      targetCat.items.unshift({ id: 'fav-' + Date.now(), fn, title: fn, createdAt: new Date().toISOString().slice(0,10) });
    }
  }
  localStorage.setItem('mathlab_favs_v2', JSON.stringify(favsData));
  renderCategoryUI();
  updateStarStatus();
}
