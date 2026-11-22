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
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
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
    let result;
    let settled = false;
    const tx = state.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);

    req.onsuccess = () => { result = req.result; };
    req.onerror = () => {
      if (!settled) {
        settled = true;
        reject(req.error || new Error('Falha ao gravar o registro.'));
      }
    };
    tx.oncomplete = () => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    tx.onerror = () => {
      if (!settled) {
        settled = true;
        reject(tx.error || new Error('Erro na transação do banco local.'));
      }
    };
    tx.onabort = () => {
      if (!settled) {
        settled = true;
        reject(tx.error || new Error('A gravação foi cancelada pelo banco local.'));
      }
    };
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

function groupFoodEntriesByMeal(items) {
  const groups = new Map();
  for (const item of items) {
    const mealLabel = String(item.meal || 'Refeição').trim() || 'Refeição';
    const key = String(item.date || '') + '::' + mealLabel.toLocaleLowerCase('pt-BR');
    if (!groups.has(key)) groups.set(key, { date: item.date || '', meal: mealLabel, items: [], calories: 0, protein: 0, carbs: 0, fat: 0 });
    const group = groups.get(key);
    group.items.push(item);
    group.calories += Number(item.calories) || 0;
    group.protein += Number(item.protein) || 0;
    group.carbs += Number(item.carbs) || 0;
    group.fat += Number(item.fat) || 0;
  }
  return [...groups.values()];
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
  const mealsToday = groupFoodEntriesByMeal(foodsToday);
  document.getElementById('dashMeals').textContent = String(mealsToday.length);
  document.getElementById('dashWorkouts').textContent = String(workoutsToday.length);
  document.getElementById('dashWorkoutMin').textContent = `${totalWorkoutMin} min hoje`;
  document.getElementById('dashLatestWeight').textContent = latestWeight;

  // Resumo rápido: agrupa alimentos da mesma refeição e data
  const mealsSummaryEl = document.getElementById('dashMealsSummary');
  if (!mealsToday.length) {
    mealsSummaryEl.innerHTML = '<small>Nenhuma refeição registrada hoje ainda.</small>';
  } else {
    mealsSummaryEl.innerHTML = mealsToday.map(group => `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">${escapeHTML(group.meal)} · ${group.items.length} ${group.items.length === 1 ? 'alimento' : 'alimentos'}</div>
          <div class="record-meta">${group.items.map(item => escapeHTML(item.name)).join(' · ')}</div>
          <div class="record-meta">${Math.round(group.calories)} kcal (P: ${group.protein.toFixed(1)}g · C: ${group.carbs.toFixed(1)}g · G: ${group.fat.toFixed(1)}g)</div>
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
  const calories = Number(document.getElementById('catFoodCalories').value);
  const protein = Number(document.getElementById('catFoodProtein').value) || 0;
  const carbs = Number(document.getElementById('catFoodCarbs').value) || 0;
  const fat = Number(document.getElementById('catFoodFat').value) || 0;

  if (!name) return showToast('Informe o nome do alimento.', 'error');
  if (Number.isNaN(calories) || calories < 0) return showToast('Calorias devem ser zero ou maior.', 'error');

  // Evitar duplicidade exata por nome + unidade ao criar novo
  const editingId = state.editing.catalog_foods;
  const duplicate = state.data.catalog_foods.find(
    x => x.name.toLowerCase() === name.toLowerCase() && (x.unit || '').toLowerCase() === unit.toLowerCase() && x.id !== editingId
  );
  if (duplicate) {
    return showToast('Já existe um alimento cadastrado com esse nome e unidade.', 'error');
  }

  const record = {
    id: editingId || uid(),
    name,
    unit,
    calories,
    protein,
    carbs,
    fat,
    date: todayISO()
  };

  await idbPut('catalog_foods', record);
  state.editing.catalog_foods = null;
  document.getElementById('catalogFoodForm').reset();
  document.getElementById('catFoodSubmitBtn').textContent = 'Salvar no catálogo';
  await refreshAllData();
  renderAll();
  showToast('Alimento salvo no catálogo!', 'success');
}

function editCatalogFood(id) {
  const item = state.data.catalog_foods.find(x => x.id === id);
  if (!item) return;
  state.editing.catalog_foods = id;
  document.getElementById('catFoodName').value = item.name;
  document.getElementById('catFoodUnit').value = item.unit || '';
  document.getElementById('catFoodCalories').value = item.calories ?? 0;
  document.getElementById('catFoodProtein').value = item.protein ?? 0;
  document.getElementById('catFoodCarbs').value = item.carbs ?? 0;
  document.getElementById('catFoodFat').value = item.fat ?? 0;
  document.getElementById('catFoodSubmitBtn').textContent = 'Atualizar alimento';
  showToast('Editando alimento do catálogo.', 'info');
}

function useCatalogFoodInMeal(id) {
  const item = state.data.catalog_foods.find(x => x.id === id);
  if (!item) return;
  document.getElementById('foodName').value = item.name;
  document.getElementById('foodAmount').value = item.unit || '1 porção';
  document.getElementById('foodUnit').value = item.unit || 'porção';
  document.getElementById('foodCalories').value = item.calories ?? 0;
  document.getElementById('protein').value = item.protein ?? 0;
  document.getElementById('carbs').value = item.carbs ?? 0;
  document.getElementById('fat').value = item.fat ?? 0;
  showToast(`"${item.name}" preenchido na refeição.`, 'info');
}

async function saveMeal(e) {
  e.preventDefault();
  try {
    const meal = document.getElementById('meal').value;
    const name = document.getElementById('foodName').value.trim();
    const amount = document.getElementById('foodAmount').value.trim();
    const unit = document.getElementById('foodUnit').value.trim();
    const calories = Number(document.getElementById('foodCalories').value);
    const protein = Number(document.getElementById('protein').value) || 0;
    const carbs = Number(document.getElementById('carbs').value) || 0;
    const fat = Number(document.getElementById('fat').value) || 0;
    const date = document.getElementById('foodDate').value || todayISO();

    if (!name) return showToast('Informe o nome do alimento ou refeição.', 'error');
    if (Number.isNaN(calories) || calories < 0) return showToast('Calorias inválidas.', 'error');

    const editingId = state.editing.foods;
    const record = {
      id: editingId || uid(),
      meal,
      name,
      amount,
      unit,
      calories,
      protein,
      carbs,
      fat,
      source: document.getElementById('foodCalories').dataset.source || '',
      date
    };

    await idbPut('foods', record);
    state.editing.foods = null;
    document.getElementById('foodForm').reset();
    document.getElementById('foodDate').value = date;
    document.getElementById('foodSubmitBtn').textContent = 'Salvar registro de refeição';
    await refreshAllData();
    renderAll();
    showToast(editingId ? 'Refeição atualizada!' : 'Refeição registrada!', 'success');
  } catch (err) {
    console.error('Erro ao salvar refeição:', err);
    showToast(`Não foi possível salvar a refeição: ${err.message || err}`, 'error');
  }
}
function editMeal(id) {
  const item = state.data.foods.find(x => x.id === id);
  if (!item) return;
  state.editing.foods = id;
  document.getElementById('meal').value = item.meal;
  document.getElementById('foodName').value = item.name;
  document.getElementById('foodAmount').value = item.amount || '';
  document.getElementById('foodUnit').value = item.unit || '';
  document.getElementById('foodCalories').value = item.calories ?? 0;
  document.getElementById('protein').value = item.protein ?? 0;
  document.getElementById('carbs').value = item.carbs ?? 0;
  document.getElementById('fat').value = item.fat ?? 0;
  document.getElementById('foodDate').value = item.date || todayISO();
  document.getElementById('foodSubmitBtn').textContent = 'Atualizar refeição';
  showToast('Editando refeição selecionada.', 'info');
}

function renderFoodModule() {
  const selectedDate = document.getElementById('foodFilterDate').value || todayISO();
  const filtered = state.data.foods.filter(x => x.date === selectedDate);

  const kcal = filtered.reduce((s, x) => s + (Number(x.calories) || 0), 0);
  const prot = filtered.reduce((s, x) => s + (Number(x.protein) || 0), 0);
  const carb = filtered.reduce((s, x) => s + (Number(x.carbs) || 0), 0);
  const fat = filtered.reduce((s, x) => s + (Number(x.fat) || 0), 0);

  document.getElementById('foodDayTotals').textContent =
    `Totais de ${formatDateBR(selectedDate)}: ${Math.round(kcal)} kcal · Proteínas: ${prot.toFixed(1)}g · Carboidratos: ${carb.toFixed(1)}g · Gorduras: ${fat.toFixed(1)}g`;

  const listEl = document.getElementById('foodList');
  if (!filtered.length) {
    listEl.innerHTML = '<small>Nenhuma refeição registrada para esta data.</small>';
  } else {
    listEl.innerHTML = filtered.map(item => `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title"><span class="badge">${escapeHTML(item.meal)}</span> ${escapeHTML(item.name)}</div>
          <div class="record-meta">
            Quantidade: ${escapeHTML(item.amount || '—')}${item.unit ? ` (${escapeHTML(item.unit)})` : ''}<br>
            ${Number(item.calories) || 0} kcal · P: ${Number(item.protein) || 0}g · C: ${Number(item.carbs) || 0}g · G: ${Number(item.fat) || 0}g
          </div>
          <div class="record-date">Data: ${formatDateBR(item.date)}</div>
        </div>
        <div class="record-actions">
          <button class="btn-secondary" onclick="editMeal('${item.id}')">Editar</button>
          <button class="btn-danger" onclick="deleteRecord('foods', '${item.id}')">Excluir</button>
        </div>
      </div>
    `).join('');
  }

  const catEl = document.getElementById('catalogFoodList');
  if (!state.data.catalog_foods.length) {
    catEl.innerHTML = '<small>Nenhum alimento cadastrado no catálogo ainda.</small>';
  } else {
    catEl.innerHTML = state.data.catalog_foods.map(c => `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">${escapeHTML(c.name)} <span class="badge">${escapeHTML(c.unit || '100 g')}</span></div>
          <div class="record-meta">${Number(c.calories) || 0} kcal · P: ${Number(c.protein) || 0}g · C: ${Number(c.carbs) || 0}g · G: ${Number(c.fat) || 0}g</div>
        </div>
        <div class="record-actions">
          <button class="btn-secondary" onclick="useCatalogFoodInMeal('${c.id}')">Usar na refeição</button>
          <button class="btn-secondary" onclick="editCatalogFood('${c.id}')">Editar</button>
          <button class="btn-danger" onclick="deleteRecord('catalog_foods', '${c.id}')">Excluir</button>
        </div>
      </div>
    `).join('');
  }
}

/* ---------- 4.3 Plano Alimentar e Nutricionista ---------- */
async function saveMealPlan(e) {
  e.preventDefault();
  const dayLabel = document.getElementById('planDay').value;
  const mealName = document.getElementById('planMealName').value.trim();
  const foodsRecommended = document.getElementById('planFoods').value.trim();
  const quantities = document.getElementById('planQuantities').value.trim();
  const guidance = document.getElementById('planGuidance').value.trim();

  if (!mealName || !foodsRecommended) {
    return showToast('Preencha a refeição e os alimentos recomendados.', 'error');
  }

  const editingId = state.editing.meal_plans;
  const existing = editingId ? state.data.meal_plans.find(x => x.id === editingId) : null;

  const record = {
    id: editingId || uid(),
    dayLabel,
    mealName,
    foodsRecommended,
    quantities,
    guidance,
    completed: existing ? Boolean(existing.completed) : false,
    date: existing ? existing.date : todayISO()
  };

  await idbPut('meal_plans', record);
  state.editing.meal_plans = null;
  document.getElementById('mealPlanForm').reset();
  document.getElementById('planSubmitBtn').textContent = 'Salvar item do plano';
  await refreshAllData();
  renderAll();
  showToast('Plano alimentar salvo!', 'success');
}

function editMealPlan(id) {
  const item = state.data.meal_plans.find(x => x.id === id);
  if (!item) return;
  state.editing.meal_plans = id;
  document.getElementById('planDay').value = item.dayLabel || 'Diário';
  document.getElementById('planMealName').value = item.mealName;
  document.getElementById('planFoods').value = item.foodsRecommended;
  document.getElementById('planQuantities').value = item.quantities || '';
  document.getElementById('planGuidance').value = item.guidance || '';
  document.getElementById('planSubmitBtn').textContent = 'Atualizar item do plano';
  showToast('Editando orientação do plano alimentar.', 'info');
}

async function toggleMealPlanDone(id) {
  const item = state.data.meal_plans.find(x => x.id === id);
  if (!item) return;
  item.completed = !item.completed;
  await idbPut('meal_plans', item);
  await refreshAllData();
  renderAll();
  showToast(item.completed ? 'Refeição marcada como realizada!' : 'Marcação removida.', 'success');
}

function renderMealPlans() {
  const listEl = document.getElementById('mealPlanList');
  if (!state.data.meal_plans.length) {
    listEl.innerHTML = '<small>Nenhuma refeição ou orientação cadastrada no plano alimentar.</small>';
    return;
  }
  listEl.innerHTML = state.data.meal_plans.map(item => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">
          <span class="badge">${escapeHTML(item.dayLabel || 'Diário')}</span>
          ${escapeHTML(item.mealName)}
          <span class="badge ${item.completed ? 'badge-done' : ''}">${item.completed ? '✓ Realizada' : 'Pendente'}</span>
        </div>
        <div class="record-meta">
          <strong>Alimentos recomendados:</strong> ${escapeHTML(item.foodsRecommended)}<br>
          ${item.quantities ? `<strong>Quantidades:</strong> ${escapeHTML(item.quantities)}<br>` : ''}
          ${item.guidance ? `<strong>Orientações:</strong> ${escapeHTML(item.guidance)}` : ''}
        </div>
      </div>
      <div class="record-actions">
        <button class="btn-secondary" onclick="toggleMealPlanDone('${item.id}')">${item.completed ? 'Desmarcar' : 'Marcar realizada'}</button>
        <button class="btn-secondary" onclick="editMealPlan('${item.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteRecord('meal_plans', '${item.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

/* ---------- 4.4 Receitas ---------- */
async function saveRecipe(e) {
  e.preventDefault();
  const title = document.getElementById('recipeTitle').value.trim();
  const category = document.getElementById('recipeCategory').value;
  const prepTime = document.getElementById('recipeTime').value.trim();
  const servings = document.getElementById('recipeServings').value.trim();
  const ingredients = document.getElementById('recipeIngredients').value.trim();
  const instructions = document.getElementById('recipeInstructions').value.trim();
  const nutrition = document.getElementById('recipeNutrition').value.trim();

  if (!title || !ingredients || !instructions) {
    return showToast('Informe nome, ingredientes e modo de preparo.', 'error');
  }

  const editingId = state.editing.recipes;
  const existing = editingId ? state.data.recipes.find(x => x.id === editingId) : null;

  const record = {
    id: editingId || uid(),
    title,
    category,
    prepTime,
    servings,
    ingredients,
    instructions,
    nutrition,
    favorite: existing ? Boolean(existing.favorite) : false,
    date: existing ? existing.date : todayISO()
  };

  await idbPut('recipes', record);
  state.editing.recipes = null;
  document.getElementById('recipeForm').reset();
  document.getElementById('recipeSubmitBtn').textContent = 'Salvar receita';
  await refreshAllData();
  renderAll();
  showToast('Receita salva com sucesso!', 'success');
}

function editRecipe(id) {
  const item = state.data.recipes.find(x => x.id === id);
  if (!item) return;
  state.editing.recipes = id;
  document.getElementById('recipeTitle').value = item.title;
  document.getElementById('recipeCategory').value = item.category || 'Geral';
  document.getElementById('recipeTime').value = item.prepTime || '';
  document.getElementById('recipeServings').value = item.servings || '';
  document.getElementById('recipeIngredients').value = item.ingredients || '';
  document.getElementById('recipeInstructions').value = item.instructions || '';
  document.getElementById('recipeNutrition').value = item.nutrition || '';
  document.getElementById('recipeSubmitBtn').textContent = 'Atualizar receita';
  showToast('Editando receita.', 'info');
}

async function toggleRecipeFavorite(id) {
  const item = state.data.recipes.find(x => x.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  await idbPut('recipes', item);
  await refreshAllData();
  renderAll();
  showToast(item.favorite ? 'Adicionada aos favoritos!' : 'Removida dos favoritos.', 'info');
}

function renderRecipes() {
  const catFilter = document.getElementById('recipeFilterCategory').value;
  const onlyFav = document.getElementById('recipeFilterFav').checked;

  let items = [...state.data.recipes];
  if (catFilter && catFilter !== 'Todas') {
    items = items.filter(r => r.category === catFilter);
  }
  if (onlyFav) {
    items = items.filter(r => r.favorite);
  }

  const listEl = document.getElementById('recipeList');
  if (!items.length) {
    listEl.innerHTML = '<small>Nenhuma receita encontrada com os filtros atuais.</small>';
    return;
  }

  listEl.innerHTML = items.map(r => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">
          ${r.favorite ? '💗 ' : ''}${escapeHTML(r.title)}
          <span class="badge">${escapeHTML(r.category || 'Geral')}</span>
        </div>
        <div class="record-meta">
          ${r.prepTime ? `<strong>Tempo:</strong> ${escapeHTML(r.prepTime)} · ` : ''}
          ${r.servings ? `<strong>Porções:</strong> ${escapeHTML(r.servings)}` : ''}<br>
          <strong>Ingredientes:</strong><br>${escapeHTML(r.ingredients).replace(/\n/g, '<br>')}<br>
          <strong>Modo de preparo:</strong><br>${escapeHTML(r.instructions).replace(/\n/g, '<br>')}
          ${r.nutrition ? `<br><strong>Informações nutricionais:</strong> ${escapeHTML(r.nutrition)}` : ''}
        </div>
      </div>
      <div class="record-actions">
        <button class="btn-secondary" onclick="toggleRecipeFavorite('${r.id}')">${r.favorite ? '★ Favorita' : '☆ Favoritar'}</button>
        <button class="btn-secondary" onclick="editRecipe('${r.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteRecord('recipes', '${r.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

/* ---------- 4.5 Exercícios ---------- */
async function saveWorkout(e) {
  e.preventDefault();
  const name = document.getElementById('workoutName').value.trim();
  const duration = Number(document.getElementById('workoutDuration').value);
  const date = document.getElementById('workoutDate').value || todayISO();
  const time = document.getElementById('workoutTime').value || '';
  const notes = document.getElementById('workoutNotes').value.trim();

  if (!name) return showToast('Informe a modalidade do exercício.', 'error');
  if (!duration || duration <= 0) return showToast('Informe uma duração maior que zero.', 'error');

  const editingId = state.editing.workouts;
  const record = {
    id: editingId || uid(),
    name,
    duration,
    date,
    time,
    notes
  };

  await idbPut('workouts', record);
  state.editing.workouts = null;
  document.getElementById('workoutForm').reset();
  document.getElementById('workoutDate').value = todayISO();
  document.getElementById('workoutSubmitBtn').textContent = 'Registrar atividade';
  await refreshAllData();
  renderAll();
  showToast(editingId ? 'Atividade atualizada!' : 'Atividade registrada!', 'success');
}

function editWorkout(id) {
  const item = state.data.workouts.find(x => x.id === id);
  if (!item) return;
  state.editing.workouts = id;
  document.getElementById('workoutName').value = item.name;
  document.getElementById('workoutDuration').value = item.duration;
  document.getElementById('workoutDate').value = item.date || todayISO();
  document.getElementById('workoutTime').value = item.time || '';
  document.getElementById('workoutNotes').value = item.notes || '';
  document.getElementById('workoutSubmitBtn').textContent = 'Atualizar atividade';
  showToast('Editando atividade física.', 'info');
}

function renderWorkouts() {
  const listEl = document.getElementById('workoutList');
  const sorted = [...state.data.workouts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!sorted.length) {
    listEl.innerHTML = '<small>Nenhuma atividade física registrada ainda.</small>';
    return;
  }
  listEl.innerHTML = sorted.map(w => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">${escapeHTML(w.name)}</div>
        <div class="record-meta">
          Duração: ${Number(w.duration) || 0} minutos${w.time ? ` · Horário: ${escapeHTML(w.time)}` : ''}<br>
          ${w.notes ? `Observações: ${escapeHTML(w.notes)}` : ''}
        </div>
        <div class="record-date">Data: ${formatDateBR(w.date)}</div>
      </div>
      <div class="record-actions">
        <button class="btn-secondary" onclick="editWorkout('${w.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteRecord('workouts', '${w.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

/* ---------- 4.6 Hidratação ---------- */
async function saveWaterGoal(e) {
  e.preventDefault();
  const goalVal = Number(document.getElementById('waterGoalInput').value);
  if (!goalVal || goalVal <= 0) {
    return showToast('Informe uma meta diária em ml maior que zero.', 'error');
  }
  await idbPut('water_goals', { id: 'daily_goal', goalMl: goalVal, updatedAt: todayISO() });
  await refreshAllData();
  renderAll();
  showToast(`Meta diária de hidratação definida em ${goalVal} ml.`, 'success');
}

async function clearWaterGoal() {
  await idbDelete('water_goals', 'daily_goal');
  document.getElementById('waterGoalInput').value = '';
  await refreshAllData();
  renderAll();
  showToast('Meta de hidratação removida.', 'info');
}

async function saveWater(e) {
  e.preventDefault();
  try {
    const amount = Number(document.getElementById('waterAmount').value);
    const date = document.getElementById('waterDate').value || todayISO();
    const time = document.getElementById('waterTime').value || nowTimeHHMM();

    if (!amount || amount <= 0) {
      return showToast('Informe uma quantidade de água válida em ml.', 'error');
    }

    const editingId = state.editing.water;
    const record = {
      id: editingId || uid(),
      amount,
      date,
      time
    };

    await idbPut('water', record);
    state.editing.water = null;
    document.getElementById('waterForm').reset();
    document.getElementById('waterDate').value = todayISO();
    document.getElementById('waterTime').value = nowTimeHHMM();
    document.getElementById('waterSubmitBtn').textContent = 'Registrar água';
    await refreshAllData();
    renderAll();
    showToast(editingId ? 'Registro de água atualizado!' : 'Água registrada!', 'success');
  } catch (err) {
    console.error('Erro ao salvar água:', err);
    showToast(`Não foi possível salvar a água: ${err.message || err}`, 'error');
  }
}
function editWater(id) {
  const item = state.data.water.find(x => x.id === id);
  if (!item) return;
  state.editing.water = id;
  document.getElementById('waterAmount').value = item.amount;
  document.getElementById('waterDate').value = item.date || todayISO();
  document.getElementById('waterTime').value = item.time || '';
  document.getElementById('waterSubmitBtn').textContent = 'Atualizar registro';
  showToast('Editando registro de hidratação.', 'info');
}

function renderWater() {
  const today = todayISO();
  const todayItems = state.data.water.filter(x => x.date === today);
  const totalToday = todayItems.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const goalObj = state.data.water_goals.find(g => g.id === 'daily_goal');
  const goalMl = goalObj && Number(goalObj.goalMl) > 0 ? Number(goalObj.goalMl) : null;
  if (goalMl && document.activeElement !== document.getElementById('waterGoalInput')) {
    document.getElementById('waterGoalInput').value = goalMl;
  }

  const summaryEl = document.getElementById('waterSummaryText');
  const barEl = document.getElementById('waterProgressBar');
  const pctEl = document.getElementById('waterProgressLabel');

  if (goalMl) {
    const pct = Math.min(100, Math.round((totalToday / goalMl) * 100));
    summaryEl.textContent = `Total hoje: ${totalToday} ml de ${goalMl} ml`;
    barEl.style.width = `${pct}%`;
    pctEl.textContent = `${pct}% da meta definida por você`;
  } else {
    summaryEl.textContent = `Total hoje: ${totalToday} ml`;
    barEl.style.width = '0%';
    pctEl.textContent = 'Nenhuma meta definida. Se desejar, informe sua meta acima.';
  }

  const listEl = document.getElementById('waterList');
  const sorted = [...state.data.water].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!sorted.length) {
    listEl.innerHTML = '<small>Nenhum registro de água ainda.</small>';
    return;
  }

  listEl.innerHTML = sorted.map(w => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">${Number(w.amount) || 0} ml de água</div>
        <div class="record-date">Data: ${formatDateBR(w.date)}${w.time ? ` · Horário: ${escapeHTML(w.time)}` : ''}</div>
      </div>
      <div class="record-actions">
        <button class="btn-secondary" onclick="editWater('${w.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteRecord('water', '${w.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

/* ---------- 4.7 Peso e Medidas ---------- */
async function saveBodyMeasurement(e) {
  e.preventDefault();
  const date = document.getElementById('bodyDate').value || todayISO();
  const weight = document.getElementById('weight').value.trim();
  const waist = document.getElementById('waist').value.trim();
  const abdomen = document.getElementById('abdomen').value.trim();
  const hip = document.getElementById('hip').value.trim();
  const arm = document.getElementById('arm').value.trim();
  const thigh = document.getElementById('thigh').value.trim();
  const customLabel = document.getElementById('customMeasureLabel').value.trim();
  const customValue = document.getElementById('customMeasureValue').value.trim();

  const hasAny = [weight, waist, abdomen, hip, arm, thigh, customValue].some(v => v !== '');
  if (!hasAny) {
    return showToast('Preencha pelo menos um campo de peso ou medida.', 'error');
  }

  const editingId = state.editing.body;
  const record = {
    id: editingId || uid(),
    date,
    weight: weight !== '' ? Number(weight) : '',
    waist: waist !== '' ? Number(waist) : '',
    abdomen: abdomen !== '' ? Number(abdomen) : '',
    hip: hip !== '' ? Number(hip) : '',
    arm: arm !== '' ? Number(arm) : '',
    thigh: thigh !== '' ? Number(thigh) : '',
    customLabel,
    customValue: customValue !== '' ? Number(customValue) : ''
  };

  await idbPut('body', record);
  state.editing.body = null;
  document.getElementById('bodyForm').reset();
  document.getElementById('bodyDate').value = todayISO();
  document.getElementById('bodySubmitBtn').textContent = 'Salvar medição';
  await refreshAllData();
  renderAll();
  showToast(editingId ? 'Medição atualizada!' : 'Medição salva!', 'success');
}

function editBodyMeasurement(id) {
  const item = state.data.body.find(x => x.id === id);
  if (!item) return;
  state.editing.body = id;
  document.getElementById('bodyDate').value = item.date || todayISO();
  document.getElementById('weight').value = item.weight ?? '';
  document.getElementById('waist').value = item.waist ?? '';
  document.getElementById('abdomen').value = item.abdomen ?? '';
  document.getElementById('hip').value = item.hip ?? '';
  document.getElementById('arm').value = item.arm ?? '';
  document.getElementById('thigh').value = item.thigh ?? '';
  document.getElementById('customMeasureLabel').value = item.customLabel || '';
  document.getElementById('customMeasureValue').value = item.customValue ?? '';
  document.getElementById('bodySubmitBtn').textContent = 'Atualizar medição';
  showToast('Editando medição corporal.', 'info');
}

function renderLineChartSVG(containerId, points, unit, strokeColor = '#d48d9d') {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!points.length) {
    container.innerHTML = '<small>Sem registros suficientes para exibir gráfico.</small>';
    return;
  }

  const width = 560;
  const height = 210;
  const padL = 48;
  const padR = 24;
  const padT = 22;
  const padB = 38;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const vals = points.map(p => p.value);
  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  if (minV === maxV) {
    minV = minV - 1;
    maxV = maxV + 1;
  }
  const span = maxV - minV;

  const coords = points.map((p, idx) => {
    const x = points.length === 1
      ? padL + plotW / 2
      : padL + (idx / (points.length - 1)) * plotW;
    const y = padT + plotH - ((p.value - minV) / span) * plotH;
    return { ...p, x, y };
  });

  const polylinePts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const circles = coords.map(c => `
    <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.5" fill="${strokeColor}" stroke="#ffffff" stroke-width="2" />
    <text x="${c.x.toFixed(1)}" y="${(c.y - 9).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8e5464" font-weight="600">${c.value}${unit}</text>
    <text x="${c.x.toFixed(1)}" y="${(height - 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="#8a727a">${escapeHTML(c.label)}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de evolução">
      <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="#efd7de" stroke-width="1.5" />
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#efd7de" stroke-width="1.5" />
      <text x="${padL - 8}" y="${padT + 6}" text-anchor="end" font-size="10" fill="#8a727a">${maxV.toFixed(1)}</text>
      <text x="${padL - 8}" y="${padT + plotH}" text-anchor="end" font-size="10" fill="#8a727a">${minV.toFixed(1)}</text>
      ${points.length > 1 ? `<polyline fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePts}" />` : ''}
      ${circles}
    </svg>
  `;
}

function renderBodyModule() {
  // O módulo de medidas pode não estar presente em versões reduzidas da interface.
  const measureSelect = document.getElementById('measureChartSelect');
  const bodyListEl = document.getElementById('bodyList');
  const weightChartEl = document.getElementById('weightChartContainer');
  const measureChartEl = document.getElementById('measureChartContainer');
  if (!measureSelect || !bodyListEl || !weightChartEl || !measureChartEl) return;

  const sorted = [...state.data.body].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const weightPts = sorted
    .filter(x => x.weight !== '' && x.weight !== null && x.weight !== undefined && !Number.isNaN(Number(x.weight)))
    .map(x => ({ label: formatDateBR(x.date).slice(0, 5), value: Number(x.weight) }));

  const metricKey = measureSelect.value;
  const metricPts = sorted
    .filter(x => x[metricKey] !== '' && x[metricKey] !== null && x[metricKey] !== undefined && !Number.isNaN(Number(x[metricKey])))
    .map(x => ({ label: formatDateBR(x.date).slice(0, 5), value: Number(x[metricKey]) }));

  renderLineChartSVG('weightChartContainer', weightPts, 'kg', '#d48d9d');
  renderLineChartSVG('measureChartContainer', metricPts, 'cm', '#9d6372');

  const listEl = bodyListEl;
  const desc = [...sorted].reverse();
  if (!desc.length) {
    listEl.innerHTML = '<small>Nenhuma medição registrada ainda.</small>';
    return;
  }

  listEl.innerHTML = desc.map(m => {
    const parts = [];
    if (m.weight !== '' && m.weight !== undefined) parts.push(`Peso: <strong>${Number(m.weight).toFixed(1)} kg</strong>`);
    if (m.waist !== '' && m.waist !== undefined) parts.push(`Cintura: ${m.waist} cm`);
    if (m.abdomen !== '' && m.abdomen !== undefined) parts.push(`Abdômen: ${m.abdomen} cm`);
    if (m.hip !== '' && m.hip !== undefined) parts.push(`Quadril: ${m.hip} cm`);
    if (m.arm !== '' && m.arm !== undefined) parts.push(`Braços: ${m.arm} cm`);
    if (m.thigh !== '' && m.thigh !== undefined) parts.push(`Coxas: ${m.thigh} cm`);
    if (m.customValue !== '' && m.customValue !== undefined) {
      parts.push(`${escapeHTML(m.customLabel || 'Medida personalizada')}: ${m.customValue}`);
    }

    return `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">Medição · ${formatDateBR(m.date)}</div>
          <div class="record-meta">${parts.join(' · ') || 'Sem valores numéricos'}</div>
        </div>
        <div class="record-actions">
          <button class="btn-secondary" onclick="editBodyMeasurement('${m.id}')">Editar</button>
          <button class="btn-danger" onclick="deleteRecord('body', '${m.id}')">Excluir</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- 4.8 Relatórios ---------- */
function getPeriodRange(periodKey) {
  const now = new Date();
  const endISO = todayISO();
  if (periodKey === 'all') return { startISO: null, endISO };
  const days = periodKey === '7d' ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return { startISO: `${y}-${m}-${d}`, endISO };
}

function inRange(dateStr, startISO, endISO) {
  if (!dateStr) return false;
  if (startISO && dateStr < startISO) return false;
  if (endISO && dateStr > endISO) return false;
  return true;
}

function generateReport() {
  const period = document.getElementById('reportPeriod')?.value || '7d';
  const { startISO, endISO } = getPeriodRange(period);

  const foods = state.data.foods.filter(x => inRange(x.date, startISO, endISO));
  const water = state.data.water.filter(x => inRange(x.date, startISO, endISO));
  const workouts = state.data.workouts.filter(x => inRange(x.date, startISO, endISO));
  const body = state.data.body
    .filter(x => inRange(x.date, startISO, endISO))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const totalKcal = foods.reduce((s, x) => s + (Number(x.calories) || 0), 0);
  const totalProt = foods.reduce((s, x) => s + (Number(x.protein) || 0), 0);
  const totalCarb = foods.reduce((s, x) => s + (Number(x.carbs) || 0), 0);
  const totalFat = foods.reduce((s, x) => s + (Number(x.fat) || 0), 0);
  const totalWater = water.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalWorkoutMin = workouts.reduce((s, x) => s + (Number(x.duration) || 0), 0);
  const mealCount = groupFoodEntriesByMeal(foods).length;

  const weights = body.filter(x => x.weight !== '' && x.weight !== undefined && !Number.isNaN(Number(x.weight)));
  const firstW = weights.length ? Number(weights[0].weight) : null;
  const lastW = weights.length ? Number(weights[weights.length - 1].weight) : null;
  const deltaW = firstW !== null && lastW !== null ? (lastW - firstW).toFixed(1) : null;

  document.getElementById('repKcal').textContent = `${Math.round(totalKcal)} kcal`;
  document.getElementById('repMacros').textContent = `P: ${totalProt.toFixed(1)}g · C: ${totalCarb.toFixed(1)}g · G: ${totalFat.toFixed(1)}g`;
  document.getElementById('repWater').textContent = `${totalWater} ml`;
  document.getElementById('repWorkouts').textContent = `${workouts.length} (${totalWorkoutMin} min)`;
  document.getElementById('repWeightDelta').textContent = deltaW !== null
    ? `${deltaW > 0 ? '+' : ''}${deltaW} kg (${firstW.toFixed(1)} → ${lastW.toFixed(1)})`
    : 'Sem dados suficientes';

  const lines = [
    `RELATÓRIO MY FITNESS JOURNEY V2`,
    `Período: ${period === 'all' ? 'Todos os registros' : period === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'}`,
    `Gerado em: ${formatDateBR(todayISO())}`,
    `----------------------------------------`,
    `ALIMENTAÇÃO (${mealCount} refeições | ${foods.length} alimentos registrados):`,
    `- Calorias registradas: ${Math.round(totalKcal)} kcal`,
    `- Proteínas: ${totalProt.toFixed(1)} g | Carboidratos: ${totalCarb.toFixed(1)} g | Gorduras: ${totalFat.toFixed(1)} g`,
    ``,
    `HIDRATAÇÃO (${water.length} registros):`,
    `- Total consumido no período: ${totalWater} ml`,
    ``,
    `EXERCÍCIOS (${workouts.length} sessões):`,
    `- Tempo total registrado: ${totalWorkoutMin} minutos`,
    ``,
    `PESO E MEDIDAS (${body.length} medições no período):`,
    weights.length
      ? `- Peso inicial: ${firstW.toFixed(1)} kg | Peso mais recente: ${lastW.toFixed(1)} kg | Variação: ${deltaW > 0 ? '+' : ''}${deltaW} kg`
      : `- Nenhum registro de peso no período.`
  ];

  if (body.length) {
    lines.push(`- Última medição (${formatDateBR(body[body.length - 1].date)}): Cintura ${body[body.length - 1].waist || '—'} cm | Abdômen ${body[body.length - 1].abdomen || '—'} cm | Quadril ${body[body.length - 1].hip || '—'} cm`);
  }

  const text = lines.join('\n');
  document.getElementById('reportTextOutput').textContent = text;
  return text;
}

function exportReportTXT() {
  const content = generateReport();
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-fitness-${todayISO()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Relatório exportado em TXT!', 'success');
}

/* ---------- 4.9 Calendário e Lembretes ---------- */
async function saveReminder(e) {
  e.preventDefault();
  const category = document.getElementById('reminderCategory').value;
  const title = document.getElementById('reminderTitle').value.trim();
  const time = document.getElementById('reminderTime').value;
  const notes = document.getElementById('reminderNotes').value.trim();

  if (!title || !time) {
    return showToast('Informe o título e o horário do lembrete.', 'error');
  }

  const editingId = state.editing.reminders;
  const existing = editingId ? state.data.reminders.find(x => x.id === editingId) : null;

  const record = {
    id: editingId || uid(),
    category,
    title,
    time,
    notes,
    active: existing ? existing.active !== false : true,
    date: existing ? existing.date : todayISO()
  };

  await idbPut('reminders', record);
  state.editing.reminders = null;
  document.getElementById('reminderForm').reset();
  document.getElementById('reminderSubmitBtn').textContent = 'Salvar lembrete';
  await refreshAllData();
  renderAll();
  showToast('Lembrete salvo!', 'success');
}

function editReminder(id) {
  const item = state.data.reminders.find(x => x.id === id);
  if (!item) return;
  state.editing.reminders = id;
  document.getElementById('reminderCategory').value = item.category;
  document.getElementById('reminderTitle').value = item.title;
  document.getElementById('reminderTime').value = item.time;
  document.getElementById('reminderNotes').value = item.notes || '';
  document.getElementById('reminderSubmitBtn').textContent = 'Atualizar lembrete';
  showToast('Editando lembrete.', 'info');
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return showToast('Este navegador não suporta notificações nativas. Os alertas visuais funcionam com o app aberto.', 'info');
  }
  const perm = await Notification.requestPermission();
  renderReminderPermissionStatus();
  showToast(perm === 'granted' ? 'Permissão de notificação concedida!' : `Status da permissão: ${perm}`, perm === 'granted' ? 'success' : 'info');
}

function renderReminderPermissionStatus() {
  const el = document.getElementById('notifPermissionStatus');
  if (!el) return;
  if (!('Notification' in window)) {
    el.textContent = 'Notificações do sistema indisponíveis neste navegador (alertas na tela funcionam enquanto o app está aberto).';
    return;
  }
  const map = {
    granted: 'Permitidas (requer permissão do dispositivo e o aplicativo/navegador ativo no horário)',
    denied: 'Bloqueadas nas configurações do dispositivo/navegador',
    default: 'Ainda não solicitadas'
  };
  el.textContent = `Permissão de notificação: ${map[Notification.permission] || Notification.permission}`;
}

function checkDueReminders() {
  const currentHHMM = nowTimeHHMM();
  const today = todayISO();
  for (const r of state.data.reminders) {
    if (r.active === false) continue;
    const key = `${today}_${r.id}_${r.time}`;
    if (r.time === currentHHMM && !state.notifiedToday.has(key)) {
      state.notifiedToday.add(key);
      showToast(`⏰ Lembrete (${r.category}): ${r.title}`, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`My Fitness Journey · ${r.category}`, {
            body: r.title + (r.notes ? ` — ${r.notes}` : '')
          });
        } catch {
          // Falha silenciosa em ambientes restritos
        }
      }
    }
  }
}

function renderCalendarAndReminders() {
  renderReminderPermissionStatus();

  // Algumas versões da interface não incluem o módulo de calendário/lembretes.
  // A ausência desses elementos não pode interromper os demais módulos.
  const calendarDateEl = document.getElementById('calendarDateInput');
  const calendarSummaryEl = document.getElementById('calendarDaySummary');
  const reminderListEl = document.getElementById('reminderList');
  if (!calendarDateEl || !calendarSummaryEl || !reminderListEl) return;

  const selDate = calendarDateEl.value || todayISO();
  const dayFoods = state.data.foods.filter(x => x.date === selDate);
  const dayWater = state.data.water.filter(x => x.date === selDate);
  const dayWorkouts = state.data.workouts.filter(x => x.date === selDate);
  const dayBody = state.data.body.filter(x => x.date === selDate);

  const waterSum = dayWater.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const kcalSum = dayFoods.reduce((s, x) => s + (Number(x.calories) || 0), 0);

  calendarSummaryEl.innerHTML = `
    <div class="metrics-grid-2">
      <div class="metric-box">
        <span class="metric-label">Refeições em ${formatDateBR(selDate)}</span>
        <span class="metric-value">${dayFoods.length}</span>
        <span class="metric-sub">${Math.round(kcalSum)} kcal registrados</span>
      </div>
      <div class="metric-box nude-box">
        <span class="metric-label">Hidratação · Exercícios · Medições</span>
        <span class="metric-value">${waterSum} ml</span>
        <span class="metric-sub">${dayWorkouts.length} exercício(s) · ${dayBody.length} medição(ões)</span>
      </div>
    </div>
  `;

  const listEl = reminderListEl;
  if (!state.data.reminders.length) {
    listEl.innerHTML = '<small>Nenhum lembrete cadastrado ainda.</small>';
    return;
  }

  listEl.innerHTML = state.data.reminders.map(r => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">
          <span class="badge">${escapeHTML(r.time)}</span>
          <span class="badge">${escapeHTML(r.category)}</span>
          ${escapeHTML(r.title)}
        </div>
        ${r.notes ? `<div class="record-meta">${escapeHTML(r.notes)}</div>` : ''}
      </div>
      <div class="record-actions">
        <button class="btn-secondary" onclick="editReminder('${r.id}')">Editar</button>
        <button class="btn-danger" onclick="deleteRecord('reminders', '${r.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

/* ---------- Exclusão Genérica ---------- */
async function deleteRecord(storeName, id) {
  if (!confirm('Deseja realmente excluir este registro?')) return;
  await idbDelete(storeName, id);
  await refreshAllData();
  renderAll();
  showToast('Registro excluído.', 'success');
}

/* ---------- 5. Backup e Restauração JSON ---------- */
function exportBackup() {
  const payload = {
    app: 'My Fitness Journey V2',
    dbVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores: {}
  };
  for (const store of STORES) {
    payload.stores[store] = state.data[store] || [];
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-fitness-journey-v2-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON exportado com sucesso!', 'success');
}

function importBackup() {
  const input = document.getElementById('backupFile');
  const file = input.files && input.files[0];
  if (!file) {
    return showToast('Selecione um arquivo de backup (.json) primeiro.', 'error');
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object' || !parsed.stores || typeof parsed.stores !== 'object') {
        throw new Error('Estrutura de backup inválida.');
      }
      for (const store of STORES) {
        if (!Array.isArray(parsed.stores[store])) {
          throw new Error(`Coleção ausente ou inválida: ${store}`);
        }
      }

      const confirmed = confirm(
        'Atenção: restaurar este backup substituirá todos os registros atuais do aplicativo. Deseja continuar?'
      );
      if (!confirmed) {
        return showToast('Restauração cancelada. Seus dados atuais foram preservados.', 'info');
      }

      for (const store of STORES) {
        await idbClearAndBulkPut(store, parsed.stores[store]);
      }

      input.value = '';
      await refreshAllData();
      renderAll();
      showToast('Backup restaurado com sucesso! Todos os módulos foram atualizados.', 'success');
    } catch (err) {
      showToast(`Não foi possível restaurar: ${err.message || 'arquivo inválido'}. Seus dados atuais não foram alterados.`, 'error');
    }
  };

  reader.onerror = () => {
    showToast('Erro ao ler o arquivo selecionado.', 'error');
  };

  reader.readAsText(file);
}

/* ---------- Renderização Geral & Inicialização ---------- */
function renderAll() {
  renderDashboard();
  renderFoodModule();
  renderMealPlans();
  renderRecipes();
  renderWorkouts();
  renderWater();
  renderBodyModule();
  renderCalendarAndReminders();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Ignora erro se aberto via file:// sem servidor HTTP
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const formattedToday = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  document.getElementById('dashTodayText').textContent = formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1);

  const iso = todayISO();
  document.getElementById('foodDate').value = iso;
  document.getElementById('foodFilterDate').value = iso;
  document.getElementById('workoutDate').value = iso;
  document.getElementById('waterDate').value = iso;
  document.getElementById('waterTime').value = nowTimeHHMM();
  document.getElementById('bodyDate').value = iso;
  const calendarDateInput = document.getElementById('calendarDateInput');
  if (calendarDateInput) calendarDateInput.value = iso;

  // Bind formulários
  document.getElementById('catalogFoodForm').addEventListener('submit', saveCatalogFood);
  document.getElementById('foodForm').addEventListener('submit', saveMeal);
  document.getElementById('mealPlanForm').addEventListener('submit', saveMealPlan);
  document.getElementById('recipeForm').addEventListener('submit', saveRecipe);
  document.getElementById('workoutForm').addEventListener('submit', saveWorkout);
  document.getElementById('waterGoalForm').addEventListener('submit', saveWaterGoal);
  document.getElementById('waterForm').addEventListener('submit', saveWater);
  document.getElementById('bodyForm').addEventListener('submit', saveBodyMeasurement);
  const reminderForm = document.getElementById('reminderForm');
  if (reminderForm) reminderForm.addEventListener('submit', saveReminder);

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  try {
    state.db = await openDatabase();
    await migrateLegacyLocalStorage();
    await refreshAllData();
    renderAll();
    generateReport();
    checkDueReminders();
    setInterval(checkDueReminders, 30000);
    showToast('Dados carregados do armazenamento local (IndexedDB).', 'success');
  } catch (err) {
    showToast(`Erro ao inicializar banco local: ${err.message}`, 'error');
  }

  registerServiceWorker();
});


/* ---------- Busca nutricional: TACO + Open Food Facts ---------- */
const TACO_API_BASE = 'https://brolesi.github.io/taco';
const OFF_SEARCH_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
let tacoFoodIndex = null;

function nutritionNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function normalizeNutritionResult(item, source) {
  return {
    source,
    sourceLabel: source === 'TACO' ? 'TACO · por 100 g' : 'Open Food Facts · por 100 g',
    sourceId: String(item.id ?? item.code ?? ''),
    name: item.description || item.product_name || item.name || 'Alimento sem nome',
    brand: item.brands || '',
    kcal: nutritionNumber(item.energy_kcal ?? item['energy-kcal_100g'] ?? item['energy-kcal']),
    protein: nutritionNumber(item.protein_g ?? item.proteins_100g ?? item.proteins),
    carbs: nutritionNumber(item.carbohydrate_g ?? item.carbohydrates_100g ?? item.carbohydrates),
    fat: nutritionNumber(item.lipids_g ?? item.fat_100g ?? item.fat),
    image: item.image_front_small_url || '',
    barcode: item.code || ''
  };
}

async function searchTacoFoods(query) {
  if (!tacoFoodIndex) {
    const response = await fetch(TACO_API_BASE + '/foods.json');
    if (!response.ok) throw new Error('Não foi possível carregar a base TACO.');
    const data = await response.json();
    tacoFoodIndex = Array.isArray(data.foods) ? data.foods : [];
  }
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return tacoFoodIndex
    .filter(food => (food.description || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized))
    .slice(0, 12)
    .map(food => ({...food, source: 'TACO'}));
}

async function getTacoNutrition(id) {
  const response = await fetch(TACO_API_BASE + '/foods/' + encodeURIComponent(id) + '.json');
  if (!response.ok) throw new Error('Não foi possível consultar a composição deste alimento na TACO.');
  return normalizeNutritionResult(await response.json(), 'TACO');
}

async function searchOpenFoodFacts(query) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '12',
    fields: 'code,product_name,brands,image_front_small_url,nutriments'
  });
  const response = await fetch(OFF_SEARCH_BASE + '?' + params.toString(), {
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error('Não foi possível consultar o Open Food Facts.');
  const data = await response.json();
  return (data.products || []).filter(p => p.product_name && p.nutriments).map(p => {
    const n = p.nutriments || {};
    return normalizeNutritionResult({
      ...p,
      'energy-kcal_100g': n['energy-kcal_100g'] ?? (Number(n['energy_100g']) / 4.184),
      proteins_100g: n.proteins_100g,
      carbohydrates_100g: n.carbohydrates_100g,
      fat_100g: n.fat_100g
    }, 'Open Food Facts');
  }).filter(p => p.kcal || p.protein || p.carbs || p.fat);
}

function renderFoodSearchResults(items) {
  const el = document.getElementById('foodSearchResults');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<small>Nenhum resultado com composição nutricional disponível. Tente outro termo ou cadastre os valores do rótulo manualmente.</small>';
    return;
  }
  el.innerHTML = items.map((item, index) => {
    const safeName = escapeHTML(item.name);
    const safeBrand = escapeHTML(item.brand || '');
    const source = escapeHTML(item.sourceLabel);
    return `
      <div class="record-item">
        <div class="record-body">
          <div class="record-title">${safeName}</div>
          <div class="record-meta">${safeBrand ? safeBrand + ' · ' : ''}${source}<br>
            ${item.kcal.toFixed(1)} kcal · P: ${item.protein.toFixed(1)} g · C: ${item.carbs.toFixed(1)} g · G: ${item.fat.toFixed(1)} g
          </div>
        </div>
        <div class="record-actions">
          <button class="btn-primary" type="button" onclick="useNutritionSearchResult(${index})">Usar</button>
          <button class="btn-secondary" type="button" onclick="favoriteNutritionSearchResult(${index})">♡ Favoritar</button>
        </div>
      </div>`;
  }).join('');
  window.currentNutritionSearchResults = items;
}

function useNutritionSearchResult(index) {
  const item = (window.currentNutritionSearchResults || [])[index];
  if (!item) return;
  document.getElementById('foodName').value = item.name;
  document.getElementById('foodAmount').value = '100';
  document.getElementById('foodUnit').value = 'g';
  document.getElementById('foodCalories').value = item.kcal.toFixed(1);
  document.getElementById('protein').value = item.protein.toFixed(1);
  document.getElementById('carbs').value = item.carbs.toFixed(1);
  document.getElementById('fat').value = item.fat.toFixed(1);
  document.getElementById('foodCalories').dataset.source = item.sourceLabel;
  document.getElementById('foodCalories').dataset.base = String(item.kcal);
  document.getElementById('protein').dataset.base = String(item.protein);
  document.getElementById('carbs').dataset.base = String(item.carbs);
  document.getElementById('fat').dataset.base = String(item.fat);
  document.getElementById('foodSearchStatus').textContent = 'Valores preenchidos para 100 g. Altere a quantidade e ajuste os nutrientes, se necessário, antes de salvar.';
  document.getElementById('foodForm').scrollIntoView({behavior: 'smooth', block: 'start'});
  document.getElementById('foodAmount').focus({preventScroll: true});
}

async function favoriteNutritionSearchResult(index) {
  const item = (window.currentNutritionSearchResults || [])[index];
  if (!item) return;
  const exists = state.data.catalog_foods.some(x => x.name.toLowerCase() === item.name.toLowerCase() && (x.source || '') === item.source);
  if (exists) return showToast('Este alimento já está no seu catálogo.', 'info');
  await idbPut('catalog_foods', {
    id: uid(), name: item.name, unit: '100 g',
    calories: item.kcal, protein: item.protein, carbs: item.carbs, fat: item.fat,
    source: item.sourceLabel, favorite: true, date: todayISO()
  });
  await refreshAllData();
  renderFoodModule();
  renderFoodFavorites();
  showToast('Alimento salvo nos favoritos!', 'success');
}

function renderFoodFavorites() {
  const el = document.getElementById('foodFavorites');
  if (!el) return;
  const favorites = state.data.catalog_foods.filter(x => x.favorite);
  if (!favorites.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<h3 style="margin-top:18px">Meus alimentos favoritos ⭐</h3>' + favorites.map(item => `
    <div class="record-item">
      <div class="record-body">
        <div class="record-title">${escapeHTML(item.name)}</div>
        <div class="record-meta">${Number(item.calories)||0} kcal · P: ${Number(item.protein)||0} g · C: ${Number(item.carbs)||0} g · G: ${Number(item.fat)||0} g · ${escapeHTML(item.source || 'Catálogo pessoal')}</div>
      </div>
      <div class="record-actions"><button class="btn-secondary" type="button" onclick="useCatalogFoodInMeal('${item.id}')">Usar</button></div>
    </div>`).join('');
}

async function handleFoodSearch(event) {
  event.preventDefault();
  const query = document.getElementById('foodSearchQuery').value.trim();
  const source = document.getElementById('foodSearchSource').value;
  const status = document.getElementById('foodSearchStatus');
  const button = document.getElementById('foodSearchButton');
  if (!query) return;
  button.disabled = true;
  status.textContent = 'Buscando na base nutricional…';
  document.getElementById('foodSearchResults').innerHTML = '';
  const results = [];
  const errors = [];
  try {
    if (source === 'all' || source === 'taco') {
      try {
        const tacoMatches = await searchTacoFoods(query);
        const details = await Promise.all(tacoMatches.slice(0, 8).map(x => getTacoNutrition(x.id)));
        results.push(...details);
      } catch (error) { errors.push('TACO: ' + error.message); }
    }
    if (source === 'all' || source === 'off') {
      try { results.push(...await searchOpenFoodFacts(query)); }
      catch (error) { errors.push('Open Food Facts: ' + error.message); }
    }
    renderFoodSearchResults(results);
    status.textContent = results.length
      ? `${results.length} resultado(s). Confira o alimento, a marca e a porção antes de registrar.`
      : (errors.length ? errors.join(' ') : 'Nenhum alimento encontrado. Confira a grafia ou tente outra fonte.');
  } catch (error) {
    status.textContent = 'Não foi possível concluir a busca. Verifique sua conexão e tente novamente.';
  } finally {
    button.disabled = false;
  }
}

function recalculateNutritionForAmount() {
  const amount = Number(document.getElementById('foodAmount').value);
  const unit = document.getElementById('foodUnit').value.trim().toLowerCase();
  if (!Number.isFinite(amount) || amount < 0 || !['g', 'grama', 'gramas'].includes(unit)) return;
  const factor = amount / 100;
  const fields = [
    ['foodCalories', 'base'],
    ['protein', 'base'],
    ['carbs', 'base'],
    ['fat', 'base']
  ];
  fields.forEach(([id, key]) => {
    const field = document.getElementById(id);
    if (field.dataset[key] !== undefined) field.value = (Number(field.dataset[key]) * factor).toFixed(1);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('foodSearchForm');
  if (searchForm) searchForm.addEventListener('submit', handleFoodSearch);
  const amountInput = document.getElementById('foodAmount');
  const unitInput = document.getElementById('foodUnit');
  if (amountInput) amountInput.addEventListener('input', recalculateNutritionForAmount);
  if (unitInput) unitInput.addEventListener('change', recalculateNutritionForAmount);
  renderFoodFavorites();
});
