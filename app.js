/* My Fitness Journey V2 — Aplicação Offline com IndexedDB */

const DB_NAME = 'MyFitnessJourneyDB';
const DB_VERSION = 2;

const STORES = [
  'foods',
  'catalog_foods',
  'water',
  'water_goals',
  'workouts',
  'body',
  'meal_plans',
  'recipes',
  'reminders',
  'settings'
];

const state = {
  db: null,
  activeTab: 'inicio',
  data: {
    foods: [],
    catalog_foods: [],
    water: [],
    water_goals: [],
    workouts: [],
    body: [],
    meal_plans: [],
    recipes: [],
    reminders: [],
    settings: []
  },
  editing: {
    foods: null,
    catalog_foods: null,
    water: null,
    workouts: null,
    body: null,
    meal_plans: null,
    recipes: null,
    reminders: null
  },
  notifiedToday: new Set()
};

/* ---------- Utilitários de Data e Validação ---------- */
function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatDateBR(isoOrStr) {
  if (!isoOrStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrStr)) {
    const [y, m, d] = isoOrStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return isoOrStr;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3600);
}

/* ---------- IndexedDB + Migração de Versões + Legado localStorage ---------- */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = event => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          if (storeName !== 'settings') {
            store.createIndex('date', 'date', { unique: false });
          }
        }
      });

      if (oldVersion < 2 && event.target.transaction) {
        const tx = event.target.transaction;
        ['foods', 'water', 'workouts', 'body', 'meal_plans', 'recipes', 'reminders'].forEach(name => {
          if (db.objectStoreNames.contains(name)) {
            const st = tx.objectStore(name);
            if (!st.indexNames.contains('date')) {
              st.createIndex('date', 'date', { unique: false });
            }
          }
        });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB'));
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbClearAndBulkPut(storeName, items) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function parseLegacyDate(dateStr) {
  if (!dateStr) return todayISO();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = String(dateStr).split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return todayISO();
}

async function migrateLegacyLocalStorage() {
  const legacyMap = {
    foods: 'mfj_foods',
    water: 'mfj_water',
    workouts: 'mfj_workouts',
    body: 'mfj_body'
  };

  for (const [storeName, lsKey] of Object.entries(legacyMap)) {
    const raw = localStorage.getItem(lsKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existing = await idbGetAll(storeName);
        const existingIds = new Set(existing.map(x => x.id));
        for (const item of parsed) {
          const normalized = {
            ...item,
            id: item.id || uid(),
            date: parseLegacyDate(item.date)
          };
          if (!existingIds.has(normalized.id)) {
            await idbPut(storeName, normalized);
          }
        }
      }
      localStorage.removeItem(lsKey);
    } catch {
      // Ignora dado legado malformado sem interromper o carregamento
    }
  }
}

async function refreshAllData() {
  for (const store of STORES) {
    state.data[store] = await idbGetAll(store);
  }
}

/* ---------- Navegação e Status de Rede ---------- */
function showTab(tabId, btnEl = null) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === tabId);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isTarget = btn === btnEl || btn.dataset.tab === tabId;
    btn.classList.toggle('active', isTarget);
  });
  if (tabId === 'relatorios') {
    generateReport();
  }
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNetworkStatus() {
  const el = document.getElementById('networkStatus');
  if (!el) return;
  if (navigator.onLine) {
    el.textContent = '🌐 Online · Dados salvos localmente';
  } else {
    el.textContent = '🌸 Modo Offline ativo · Tudo salvo no dispositivo';
  }
}

/* ---------- 4.1 Dashboard ---------- */
function renderDashboard() {
  const today = todayISO();
  const foodsToday = state.data.foods.filter(x => x.date === today);
  const waterToday = state.data.water.filter(x => x.date === today);
  const workoutsToday = state.data.workouts.filter(x => x.date === today);

  const totalKcal = foodsToday.reduce((s, x) => s + (Number(x.calories) || 0), 0);
  const totalProt = foodsToday.reduce((s, x) => s + (Number(x.protein) || 0), 0);
  const totalCarb = foodsToday.reduce((s, x) => s + (Number(x.carbs) || 0), 0);
  const totalFat = foodsToday.reduce((s, x) => s + (Number(x.fat) || 0), 0);
  const totalWater = waterToday.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalWorkoutMin = workoutsToday.reduce((s, x) => s + (Number(x.duration) || 0), 0);

  const sortedBody = [...state.data.body]
    .filter(x => x.weight !== '' && x.weight !== null && x.weight !== undefined && !Number.isNaN(Number(x.weight)))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latestWeight = sortedBody.length ? `${Number(sortedBody[sortedBody.length - 1].weight).toFixed(1)} kg` : '—';

  const waterGoalObj = state.data.water_goals.find(g => g.id === 'daily_goal');
  const waterGoal = waterGoalObj && Number(waterGoalObj.goalMl) > 0 ? Number(waterGoalObj.goalMl) : null;

  document.getElementById('dashCalories').textContent = `${Math.round(totalKcal)} kcal`;
  document.getElementById('dashMacros').textContent = `P: ${totalProt.toFixed(1)}g · C: ${totalCarb.toFixed(1)}g · G: ${totalFat.toFixed(1)}g`;
  document.getElementById('dashWater').textContent = `${totalWater} ml`;
  document.getElementById('dashWaterGoal').textContent = waterGoal ? `Meta definida: ${waterGoal} ml (${Math.min(100, Math.round((totalWater / waterGoal) * 100))}%)` : 'Sem meta definida';
  document.getElementById('dashMeals').textContent = String(foodsToday.length);
  document.getElementById('dashWorkouts').textContent = String(workoutsToday.length);
  document.getElementById('dashWorkoutMin').textContent = `${totalWorkoutMin} min hoje`;
  document.getElementById('dashLatestWeight').textContent = latestWeight;

  // Resumo rápido do dia
  const mealsSummaryEl = document.getElementById('dashMealsSummary');
  if (!foodsToday.length) {
    mealsSummaryEl.innerHTML = '<small>Nenhuma refeição registrada hoje ainda.</small>';
  } else {
    mealsSummaryEl.innerHTML = foodsToday.map(f => `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">${escapeHTML(f.meal)} · ${escapeHTML(f.name)}</div>
          <div class="record-meta">${escapeHTML(f.amount || 'Porção não informada')} — ${Number(f.calories) || 0} kcal (P: ${Number(f.protein) || 0}g · C: ${Number(f.carbs) || 0}g · G: ${Number(f.fat) || 0}g)</div>
        </div>
      </div>
    `).join('');
  }

  const workoutsSummaryEl = document.getElementById('dashWorkoutsSummary');
  if (!workoutsToday.length) {
    workoutsSummaryEl.innerHTML = '<small>Nenhuma atividade física registrada hoje.</small>';
  } else {
    workoutsSummaryEl.innerHTML = workoutsToday.map(w => `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">${escapeHTML(w.name)}</div>
          <div class="record-meta">${Number(w.duration) || 0} min${w.time ? ` · ${escapeHTML(w.time)}` : ''}${w.notes ? ` · ${escapeHTML(w.notes)}` : ''}</div>
        </div>
      </div>
    `).join('');
  }
}

/* ---------- 4.2 Diário Alimentar + Cadastro de Alimentos ---------- */
async function saveCatalogFood(e) {
  e.preventDefault();
  const name = document.getElementById('catFoodName').value.trim();
  const unit = document.getElementById('catFoodUnit').value.trim() || '100 g';
  const calories = Number(document.getElementById('
