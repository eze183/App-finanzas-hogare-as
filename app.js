const STORAGE_KEY = "home-expenses-v1";
const APP_VERSION = "2026-06-19-nombres-v2";
const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const chartColors = ["#2c6f5a", "#d1893d", "#5178a8", "#a84f55", "#7d679d", "#6f7f3e"];
const categories = ["Comida", "Servicios", "Limpieza", "Alquiler", "Transporte", "Otro"];
const sharedExpenseKeywords = [
  "seguro",
  "integrity",
  "cia seg la mer",
  "galicia seguro",
  "galicia seguros",
  "auto",
  "hogar",
  "moto",
  "netflix",
  "spotify",
  "disney",
  "prime",
  "amazon",
  "max",
  "hbo",
  "paramount",
  "youtube",
  "flow",
  "internet",
  "movistar",
  "telecentro",
  "claro",
  "edenor",
  "edesur",
  "aysa",
  "metrogas",
];
const ignoredStatementKeywords = [
  "pago",
  "saldo",
  "interes",
  "intereses",
  "financiacion",
  "financiación",
  "iva",
  "impuesto",
  "sellos",
  "resumen",
  "vencimiento",
  "debito automatico pago",
];
const defaultState = {
  people: ["Persona 1", "Persona 2"],
  deviceOwner: "Persona 1",
  expenses: [],
  personalExpenses: [],
  settlements: [],
  recurringExpenses: [],
  budgets: {},
};

const elements = {
  weekStart: document.querySelector("#weekStart"),
  currentWeekButton: document.querySelector("#currentWeekButton"),
  settingsOpenButton: document.querySelector("#settingsOpenButton"),
  settingsCloseButton: document.querySelector("#settingsCloseButton"),
  dailyView: document.querySelector("#dailyView"),
  settingsView: document.querySelector("#settingsView"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  importBackupInput: document.querySelector("#importBackupInput"),
  backupStatus: document.querySelector("#backupStatus"),
  peopleForm: document.querySelector("#peopleForm"),
  personAInput: document.querySelector("#personAInput"),
  personBInput: document.querySelector("#personBInput"),
  deviceOwnerSelect: document.querySelector("#deviceOwnerSelect"),
  commonPayerLabel: document.querySelector("#commonPayerLabel"),
  personalOwnerLabel: document.querySelector("#personalOwnerLabel"),
  personANameSummary: document.querySelector("#personANameSummary"),
  personBNameSummary: document.querySelector("#personBNameSummary"),
  totalAmount: document.querySelector("#totalAmount"),
  personATotal: document.querySelector("#personATotal"),
  personBTotal: document.querySelector("#personBTotal"),
  settlementText: document.querySelector("#settlementText"),
  settlementDetailIntro: document.querySelector("#settlementDetailIntro"),
  settlementBreakdown: document.querySelector("#settlementBreakdown"),
  monthRangeLabel: document.querySelector("#monthRangeLabel"),
  monthlySummary: document.querySelector("#monthlySummary"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseDate: document.querySelector("#expenseDate"),
  expensePayer: document.querySelector("#expensePayer"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expensePaymentMethod: document.querySelector("#expensePaymentMethod"),
  expenseNote: document.querySelector("#expenseNote"),
  commonTabButton: document.querySelector("#commonTabButton"),
  personalTabButton: document.querySelector("#personalTabButton"),
  commonExpenseSection: document.querySelector("#commonExpenseSection"),
  personalExpenseSection: document.querySelector("#personalExpenseSection"),
  personalExpenseForm: document.querySelector("#personalExpenseForm"),
  personalExpenseDate: document.querySelector("#personalExpenseDate"),
  personalExpenseOwner: document.querySelector("#personalExpenseOwner"),
  personalExpenseCategory: document.querySelector("#personalExpenseCategory"),
  personalExpenseAmount: document.querySelector("#personalExpenseAmount"),
  personalExpensePaymentMethod: document.querySelector("#personalExpensePaymentMethod"),
  personalExpenseNote: document.querySelector("#personalExpenseNote"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetCategory: document.querySelector("#budgetCategory"),
  budgetAmount: document.querySelector("#budgetAmount"),
  budgetList: document.querySelector("#budgetList"),
  recurringForm: document.querySelector("#recurringForm"),
  recurringNote: document.querySelector("#recurringNote"),
  recurringPayer: document.querySelector("#recurringPayer"),
  recurringCategory: document.querySelector("#recurringCategory"),
  recurringAmount: document.querySelector("#recurringAmount"),
  recurringFrequency: document.querySelector("#recurringFrequency"),
  recurringList: document.querySelector("#recurringList"),
  applyRecurringButton: document.querySelector("#applyRecurringButton"),
  documentFile: document.querySelector("#documentFile"),
  receiptPreviewWrap: document.querySelector("#receiptPreviewWrap"),
  receiptPreview: document.querySelector("#receiptPreview"),
  receiptStatus: document.querySelector("#receiptStatus"),
  statementReview: document.querySelector("#statementReview"),
  voiceExpenseButton: document.querySelector("#voiceExpenseButton"),
  voiceTextForm: document.querySelector("#voiceTextForm"),
  voiceTextInput: document.querySelector("#voiceTextInput"),
  voiceStatus: document.querySelector("#voiceStatus"),
  categoryList: document.querySelector("#categoryList"),
  expensesTable: document.querySelector("#expensesTable"),
  emptyState: document.querySelector("#emptyState"),
  weekRangeLabel: document.querySelector("#weekRangeLabel"),
  exportButton: document.querySelector("#exportButton"),
  settleWeekButton: document.querySelector("#settleWeekButton"),
  clearWeekButton: document.querySelector("#clearWeekButton"),
  filterForm: document.querySelector("#filterForm"),
  searchInput: document.querySelector("#searchInput"),
  filterPayer: document.querySelector("#filterPayer"),
  filterCategory: document.querySelector("#filterCategory"),
  filterPaymentMethod: document.querySelector("#filterPaymentMethod"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  personalWeekLabel: document.querySelector("#personalWeekLabel"),
  personalWeekTotal: document.querySelector("#personalWeekTotal"),
  personalExpensesTable: document.querySelector("#personalExpensesTable"),
  personalEmptyState: document.querySelector("#personalEmptyState"),
  settlementHistory: document.querySelector("#settlementHistory"),
  categoryChart: document.querySelector("#categoryChart"),
  chartLegend: document.querySelector("#chartLegend"),
  barChartButton: document.querySelector("#barChartButton"),
  pieChartButton: document.querySelector("#pieChartButton"),
};

let state = loadState();
let chartType = "bar";
let voiceRecognition = null;
let isListeningForExpense = false;
let selectedDocumentFile = null;
let statementCandidates = [];
window.APP_FINANZAS_VERSION = APP_VERSION;
const filters = {
  search: "",
  payer: "",
  category: "",
  paymentMethod: "",
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);

    return normalizeState({
      people: Array.isArray(saved.people) && saved.people.length === 2 ? saved.people : defaultState.people,
      deviceOwner: saved.deviceOwner || saved.people?.[0] || defaultState.deviceOwner,
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      personalExpenses: Array.isArray(saved.personalExpenses) ? saved.personalExpenses : [],
      settlements: Array.isArray(saved.settlements) ? saved.settlements : [],
      recurringExpenses: Array.isArray(saved.recurringExpenses) ? saved.recurringExpenses : [],
      budgets: saved.budgets && typeof saved.budgets === "object" ? saved.budgets : {},
    });
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(value) {
  return {
    people: Array.isArray(value.people) && value.people.length === 2 ? value.people : [...defaultState.people],
    deviceOwner:
      Array.isArray(value.people) && value.people.includes(value.deviceOwner) ? value.deviceOwner : value.people?.[0] || defaultState.deviceOwner,
    expenses: Array.isArray(value.expenses) ? value.expenses.map(normalizeExpense).filter(Boolean) : [],
    personalExpenses: Array.isArray(value.personalExpenses)
      ? value.personalExpenses.map(normalizePersonalExpense).filter(Boolean)
      : [],
    settlements: Array.isArray(value.settlements) ? value.settlements : [],
    recurringExpenses: Array.isArray(value.recurringExpenses)
      ? value.recurringExpenses.map(normalizeRecurringExpense).filter(Boolean)
      : [],
    budgets: value.budgets && typeof value.budgets === "object" ? sanitizeBudgets(value.budgets) : {},
  };
}

function normalizePersonalExpense(expense) {
  if (!expense || !expense.date || !expense.owner || !expense.category) return null;
  const amount = Number(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: expense.id || createId(),
    date: expense.date,
    owner: expense.owner,
    category: expense.category,
    paymentMethod: expense.paymentMethod || "",
    amount,
    note: expense.note || "",
    createdAt: Number(expense.createdAt) || Date.now(),
  };
}

function normalizeExpense(expense) {
  if (!expense || !expense.date || !expense.payer || !expense.category) return null;
  const amount = Number(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: expense.id || createId(),
    date: expense.date,
    payer: expense.payer,
    category: expense.category,
    paymentMethod: expense.paymentMethod || "",
    amount,
    note: expense.note || "",
    recurringId: expense.recurringId || "",
    createdAt: Number(expense.createdAt) || Date.now(),
  };
}

function normalizeRecurringExpense(expense) {
  if (!expense || !expense.payer || !expense.category || !expense.note) return null;
  const amount = Number(expense.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: expense.id || createId(),
    payer: expense.payer,
    category: expense.category,
    paymentMethod: expense.paymentMethod || "",
    amount,
    note: expense.note,
    frequency: expense.frequency === "monthly" ? "monthly" : "weekly",
    createdAt: Number(expense.createdAt) || Date.now(),
  };
}

function sanitizeBudgets(budgets) {
  return Object.fromEntries(
    Object.entries(budgets)
      .map(([category, amount]) => [category, Number(amount)])
      .filter(([, amount]) => Number.isFinite(amount) && amount > 0),
  );
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toISODate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function getWeekEnd(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return end;
}

function getSelectedWeekRange() {
  const start = parseISODate(elements.weekStart.value);
  const end = getWeekEnd(start);
  return { start, end };
}

function getSelectedWeekKey() {
  return elements.weekStart.value;
}

function isExpenseInSelectedWeek(expense) {
  const { start, end } = getSelectedWeekRange();
  const expenseDate = parseISODate(expense.date);
  return expenseDate >= start && expenseDate <= end;
}

function getCurrentWeekExpenses() {
  return state.expenses
    .filter(isExpenseInSelectedWeek)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function getCurrentWeekPersonalExpenses() {
  return state.personalExpenses
    .filter(isExpenseInSelectedWeek)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function getFilteredExpenses(expenses) {
  const normalizedSearch = normalizeText(filters.search);

  return expenses.filter((expense) => {
    const paymentMethod = expense.paymentMethod || "Sin especificar";
    const searchableText = normalizeText(`${expense.note || ""} ${expense.category} ${expense.payer} ${paymentMethod}`);

    return (
      (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
      (!filters.payer || expense.payer === filters.payer) &&
      (!filters.category || expense.category === filters.category) &&
      (!filters.paymentMethod || paymentMethod === filters.paymentMethod)
    );
  });
}

function getCurrentMonthExpenses() {
  const selected = parseISODate(elements.weekStart.value);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  return state.expenses.filter((expense) => {
    const expenseDate = parseISODate(expense.date);
    return expenseDate.getFullYear() === year && expenseDate.getMonth() === month;
  });
}

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0);
}

function getDeviceOwner() {
  return state.people.includes(state.deviceOwner) ? state.deviceOwner : state.people[0];
}

function formatUsd(amount) {
  return `USD ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseAmountInput(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return NaN;

  const normalizedValue = cleanValue
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  return Number(normalizedValue);
}

function renderPeople() {
  const [personA, personB] = state.people;
  const deviceOwner = getDeviceOwner();
  elements.commonPayerLabel.textContent = deviceOwner;
  elements.personalOwnerLabel.textContent = deviceOwner;
  elements.personANameSummary.textContent = `${personA} pagó`;
  elements.personBNameSummary.textContent = `${personB} pagó`;

  const peopleOptions = state.people
    .map((person) => `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`)
    .join("");
  elements.expensePayer.innerHTML = peopleOptions;

  elements.recurringPayer.innerHTML = elements.expensePayer.innerHTML;
  elements.expensePayer.value = deviceOwner;
  if (!elements.personalExpenseOwner.value) {
    elements.personalExpenseOwner.value = deviceOwner;
  }
  elements.filterPayer.innerHTML = [
    `<option value="">Todas</option>`,
    ...state.people.map((person) => `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`),
  ].join("");
  elements.filterPayer.value = filters.payer;
}

function populateSettingsForm() {
  const [personA, personB] = state.people;
  const deviceOwner = getDeviceOwner();
  const peopleOptions = state.people
    .map((person) => `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`)
    .join("");

  elements.personAInput.value = personA;
  elements.personBInput.value = personB;
  elements.deviceOwnerSelect.innerHTML = peopleOptions;
  elements.deviceOwnerSelect.value = deviceOwner;
}

function renderSummary(expenses) {
  const settlement = calculateSettlement(expenses);
  const [personA, personB] = state.people;

  elements.totalAmount.textContent = formatMoney(settlement.total);
  elements.personATotal.textContent = formatMoney(settlement.totals[personA] || 0);
  elements.personBTotal.textContent = formatMoney(settlement.totals[personB] || 0);

  if (settlement.total === 0) {
    elements.settlementText.textContent = "Sin gastos esta semana";
  } else if (settlement.amount < 0.01) {
    elements.settlementText.textContent = "Ya están parejos";
  } else {
    elements.settlementText.textContent = `${settlement.debtor} le pasa ${formatMoney(settlement.amount)} a ${settlement.creditor}`;
  }
}

function renderSettlementDetail(expenses) {
  const settlement = calculateSettlement(expenses);
  const [personA, personB] = state.people;
  const half = settlement.total / 2;
  const personATotal = settlement.totals[personA] || 0;
  const personBTotal = settlement.totals[personB] || 0;

  elements.settlementDetailIntro.textContent = settlement.total
    ? "Así queda la cuenta si dividen el total en partes iguales."
    : "Todavía no hay gastos para calcular el cierre semanal.";

  const movement = settlement.amount
    ? `${escapeHtml(settlement.debtor)} le pasa ${formatMoney(settlement.amount)} a ${escapeHtml(settlement.creditor)}`
    : settlement.total
      ? "No hace falta transferencia"
      : "Sin movimiento";

  elements.settlementBreakdown.innerHTML = `
    <div class="breakdown-item">
      <span>Total</span>
      <strong>${formatMoney(settlement.total)}</strong>
    </div>
    <div class="breakdown-item">
      <span>Mitad para cada uno</span>
      <strong>${formatMoney(half)}</strong>
    </div>
    <div class="breakdown-item">
      <span>${escapeHtml(personA)} pagó</span>
      <strong>${formatMoney(personATotal)}</strong>
    </div>
    <div class="breakdown-item">
      <span>${escapeHtml(personB)} pagó</span>
      <strong>${formatMoney(personBTotal)}</strong>
    </div>
    <div class="breakdown-item wide">
      <span>Resultado</span>
      <strong>${movement}</strong>
    </div>
  `;
}

function renderMonthlySummary() {
  const monthExpenses = getCurrentMonthExpenses();
  const selected = parseISODate(elements.weekStart.value);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(selected);
  const monthlyTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = Object.entries(getCategoryTotals(monthExpenses)).sort((a, b) => b[1] - a[1]);
  const topCategory = categoryTotals[0];
  const weeksWithExpenses = new Set(monthExpenses.map((expense) => toISODate(getWeekStart(parseISODate(expense.date)))));

  elements.monthRangeLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  elements.monthlySummary.innerHTML = `
    <div class="metric-row">
      <span>Total mensual</span>
      <strong>${formatMoney(monthlyTotal)}</strong>
    </div>
    <div class="metric-row">
      <span>Gastos cargados</span>
      <strong>${monthExpenses.length}</strong>
    </div>
    <div class="metric-row">
      <span>Semanas con gastos</span>
      <strong>${weeksWithExpenses.size}</strong>
    </div>
    <div class="metric-row">
      <span>Categoría principal</span>
      <strong>${topCategory ? `${escapeHtml(topCategory[0])} · ${formatMoney(topCategory[1])}` : "Sin datos"}</strong>
    </div>
  `;
}

function calculateSettlement(expenses) {
  const [personA, personB] = state.people;
  const totals = Object.fromEntries(state.people.map((person) => [person, 0]));

  for (const expense of expenses) {
    totals[expense.payer] = (totals[expense.payer] || 0) + expense.amount;
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const half = total / 2;
  const difference = Math.abs((totals[personA] || 0) - half);

  if (total === 0 || difference < 0.01) {
    return { total, totals, amount: 0, debtor: "", creditor: "" };
  }

  const debtor = (totals[personA] || 0) < half ? personA : personB;
  const creditor = debtor === personA ? personB : personA;
  return { total, totals, amount: difference, debtor, creditor };
}

function renderCategories(expenses) {
  const categories = getCategoryTotals(expenses);

  const rows = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, amount]) => `
        <div class="category-row">
          <span>${escapeHtml(category)}</span>
          <strong>${formatMoney(amount)}</strong>
        </div>
      `,
    );

  elements.categoryList.innerHTML = rows.length
    ? rows.join("")
    : `<p class="empty-state">Sin categorías todavía.</p>`;
}

function renderBudgets(expenses) {
  const weeklyTotals = getCategoryTotals(expenses);
  const budgetEntries = categories.filter((category) => state.budgets[category]);

  if (!budgetEntries.length) {
    elements.budgetList.innerHTML = `<p class="empty-state">Sin presupuestos cargados.</p>`;
    return;
  }

  elements.budgetList.innerHTML = budgetEntries
    .map((category) => {
      const budget = state.budgets[category];
      const spent = weeklyTotals[category] || 0;
      const percent = Math.min(100, Math.round((spent / budget) * 100));
      const isOver = spent > budget;

      return `
        <div class="budget-row ${isOver ? "is-over" : ""}">
          <div>
            <strong>${escapeHtml(category)}</strong>
            <span>${formatMoney(spent)} de ${formatMoney(budget)}</span>
          </div>
          <div class="budget-progress" aria-label="${percent}% usado">
            <span style="width:${percent}%"></span>
          </div>
          <button class="delete-row" type="button" data-budget-category="${escapeHtml(category)}">Borrar</button>
        </div>
      `;
    })
    .join("");
}

function renderRecurringExpenses() {
  if (!state.recurringExpenses.length) {
    elements.recurringList.innerHTML = `<p class="empty-state">Sin gastos recurrentes guardados.</p>`;
    return;
  }

  elements.recurringList.innerHTML = state.recurringExpenses
    .map(
      (expense) => `
        <div class="recurring-item">
          <div>
            <strong>${escapeHtml(expense.note)}</strong>
            <span>${escapeHtml(expense.category)} · ${escapeHtml(expense.payer)} · ${expense.frequency === "monthly" ? "Mensual" : "Semanal"}</span>
          </div>
          <strong>${formatMoney(expense.amount)}</strong>
          <button class="delete-row" type="button" data-recurring-id="${expense.id}">Borrar</button>
        </div>
      `,
    )
    .join("");
}

function getCategoryTotals(expenses) {
  return expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
}

function getCategoryChartData(expenses) {
  return Object.entries(getCategoryTotals(expenses))
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], index) => ({
      category,
      amount,
      color: chartColors[index % chartColors.length],
    }));
}

function renderChart(expenses) {
  const chartData = getCategoryChartData(expenses);
  renderChartLegend(chartData);
  elements.barChartButton.classList.toggle("is-active", chartType === "bar");
  elements.pieChartButton.classList.toggle("is-active", chartType === "pie");

  const canvas = elements.categoryChart;
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!chartData.length) {
    drawEmptyChart(context, width, height);
    return;
  }

  if (chartType === "pie") {
    drawPieChart(context, chartData, width, height);
  } else {
    drawBarChart(context, chartData, width, height);
  }
}

function renderChartLegend(chartData) {
  if (!chartData.length) {
    elements.chartLegend.innerHTML = `<p class="empty-state">Cargá gastos para ver el gráfico.</p>`;
    return;
  }

  const total = chartData.reduce((sum, item) => sum + item.amount, 0);
  elements.chartLegend.innerHTML = chartData
    .map((item) => {
      const percent = Math.round((item.amount / total) * 100);
      return `
        <div class="legend-row">
          <span class="legend-swatch" style="background:${item.color}"></span>
          <span>${escapeHtml(item.category)} · ${percent}%</span>
          <strong>${formatMoney(item.amount)}</strong>
        </div>
      `;
    })
    .join("");
}

function drawEmptyChart(context, width, height) {
  context.fillStyle = getThemeColor("--muted", "#98aaa2");
  context.font = "700 16px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Sin datos para graficar esta semana", width / 2, height / 2);
}

function drawBarChart(context, chartData, width, height) {
  const padding = { top: 24, right: 24, bottom: 58, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxAmount = Math.max(...chartData.map((item) => item.amount));
  const gap = 14;
  const barWidth = Math.min(120, Math.max(20, (plotWidth - gap * (chartData.length - 1)) / chartData.length));
  const totalBarsWidth = barWidth * chartData.length + gap * (chartData.length - 1);
  const startX = padding.left + Math.max(0, (plotWidth - totalBarsWidth) / 2);

  context.strokeStyle = getThemeColor("--muted", "#98aaa2");
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + plotHeight);
  context.lineTo(width - padding.right, padding.top + plotHeight);
  context.stroke();

  chartData.forEach((item, index) => {
    const barHeight = (item.amount / maxAmount) * plotHeight;
    const x = startX + index * (barWidth + gap);
    const y = padding.top + plotHeight - barHeight;

    context.fillStyle = item.color;
    roundRect(context, x, y, barWidth, barHeight, 7);
    context.fill();

    context.fillStyle = getThemeColor("--muted", "#98aaa2");
    context.font = "700 12px Inter, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(shortenLabel(item.category, 12), x + barWidth / 2, height - 18);
  });
}

function drawPieChart(context, chartData, width, height) {
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  let startAngle = -Math.PI / 2;

  chartData.forEach((item) => {
    const sliceAngle = (item.amount / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    context.closePath();
    context.fillStyle = item.color;
    context.fill();
    startAngle += sliceAngle;
  });

  context.beginPath();
  context.arc(centerX, centerY, radius * 0.48, 0, Math.PI * 2);
  context.fillStyle = getThemeColor("--surface-tint", "#121c18");
  context.fill();

  context.fillStyle = getThemeColor("--ink", "#eef7f2");
  context.font = "800 18px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(formatMoney(total), centerX, centerY);
}

function getThemeColor(variableName, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || fallback;
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function shortenLabel(label, maxLength) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function renderTable(expenses) {
  elements.expensesTable.innerHTML = expenses
    .map(
      (expense) => `
        <tr>
          <td>${dateFormatter.format(parseISODate(expense.date))}</td>
          <td>${escapeHtml(expense.payer)}</td>
          <td>${escapeHtml(expense.category)}</td>
          <td>${escapeHtml(expense.paymentMethod || "Sin especificar")}</td>
          <td>${escapeHtml(expense.note || "-")}</td>
          <td class="amount-cell">${formatMoney(expense.amount)}</td>
          <td class="amount-cell">
            <button class="delete-row" type="button" data-id="${expense.id}">Borrar</button>
          </td>
        </tr>
      `,
    )
    .join("");

  elements.emptyState.classList.toggle("is-hidden", expenses.length > 0);
}

function renderPersonalExpenses(expenses) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  elements.personalWeekLabel.textContent = elements.weekRangeLabel.textContent;
  elements.personalWeekTotal.textContent = formatMoney(total);
  elements.personalExpensesTable.innerHTML = expenses
    .map(
      (expense) => `
        <tr>
          <td>${dateFormatter.format(parseISODate(expense.date))}</td>
          <td>${escapeHtml(expense.owner)}</td>
          <td>${escapeHtml(expense.category)}</td>
          <td>${escapeHtml(expense.paymentMethod || "Sin especificar")}</td>
          <td>${escapeHtml(expense.note || "-")}</td>
          <td class="amount-cell">${formatMoney(expense.amount)}</td>
          <td class="amount-cell">
            <button class="delete-row" type="button" data-personal-id="${expense.id}">Borrar</button>
          </td>
        </tr>
      `,
    )
    .join("");
  elements.personalEmptyState.classList.toggle("is-hidden", expenses.length > 0);
}

function renderFilterValues() {
  elements.searchInput.value = filters.search;
  elements.filterPayer.value = filters.payer;
  elements.filterCategory.value = filters.category;
  elements.filterPaymentMethod.value = filters.paymentMethod;
}

function renderWeekLabel() {
  const { start, end } = getSelectedWeekRange();
  elements.weekRangeLabel.textContent = `${dateFormatter.format(start)} al ${dateFormatter.format(end)}`;
  if (!elements.personalExpenseDate.value || !isExpenseInSelectedWeek({ date: elements.personalExpenseDate.value })) {
    elements.personalExpenseDate.value = getSelectedWeekKey();
  }
}

function renderSettlementHistory() {
  const settlements = [...state.settlements].sort((a, b) => b.settledAt.localeCompare(a.settledAt));

  if (!settlements.length) {
    elements.settlementHistory.innerHTML = `<p class="empty-state">Todavía no hay semanas saldadas.</p>`;
    return;
  }

  elements.settlementHistory.innerHTML = settlements
    .map((settlement) => {
      const movement = settlement.amount
        ? `${settlement.debtor} le pasó ${formatMoney(settlement.amount)} a ${settlement.creditor}`
        : "No hizo falta compensación";

      return `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(settlement.weekLabel)}</strong>
            <span>Saldada el ${dateFormatter.format(parseISODate(settlement.settledAt))} · ${escapeHtml(movement)}</span>
          </div>
          <div class="history-total">${formatMoney(settlement.total)}</div>
        </article>
      `;
    })
    .join("");
}

function render() {
  const expenses = getCurrentWeekExpenses();
  const personalExpenses = getCurrentWeekPersonalExpenses();
  const filteredExpenses = getFilteredExpenses(expenses);
  renderPeople();
  renderFilterValues();
  renderWeekLabel();
  renderSummary(expenses);
  renderSettlementDetail(expenses);
  renderMonthlySummary();
  renderCategories(expenses);
  renderBudgets(expenses);
  renderRecurringExpenses();
  renderChart(expenses);
  renderTable(filteredExpenses);
  renderPersonalExpenses(personalExpenses);
  renderSettlementHistory();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setReceiptStatus(message, tone = "") {
  elements.receiptStatus.textContent = message;
  elements.receiptStatus.className = `receipt-status ${tone}`.trim();
}

function setVoiceStatus(message, tone = "") {
  elements.voiceStatus.textContent = message;
  elements.voiceStatus.className = `voice-status ${tone}`.trim();
}

async function handleDocumentFileChange(event) {
  const [file] = event.target.files;
  selectedDocumentFile = file || null;
  clearStatementReview();

  if (!selectedDocumentFile) {
    elements.receiptPreviewWrap.classList.add("is-hidden");
    elements.receiptPreview.removeAttribute("src");
    setReceiptStatus("");
    return;
  }

  if (selectedDocumentFile.type.startsWith("image/")) {
    elements.receiptPreview.src = URL.createObjectURL(selectedDocumentFile);
    elements.receiptPreviewWrap.classList.remove("is-hidden");
  } else {
    elements.receiptPreviewWrap.classList.add("is-hidden");
    elements.receiptPreview.removeAttribute("src");
  }

  await processDocumentFile(selectedDocumentFile);
}

async function processDocumentFile(file) {
  setReceiptStatus("Leyendo archivo... puede tardar unos segundos.");

  try {
    const text = await extractTextFromDocument(file);
    const documentType = detectDocumentType(text);

    if (documentType === "statement") {
      const candidates = extractStatementCandidates(text);
      renderStatementReview(candidates);
      return;
    }

    const extracted = extractExpenseFromReceiptText(text);
    fillExpenseFromReceipt(extracted);
  } catch (error) {
    console.error(error);
    setReceiptStatus("No pude leer bien ese archivo. Probá con una imagen más nítida, un PDF con texto o cargá los datos manualmente.", "error");
  }
}

async function extractTextFromDocument(file) {
  if (file.type.startsWith("image/")) {
    if (!window.Tesseract) {
      throw new Error("Tesseract no disponible");
    }

    const result = await Tesseract.recognize(file, "spa+eng", {
      logger: (progress) => {
        if (progress.status === "recognizing text") {
          const percent = Math.round((progress.progress || 0) * 100);
          setReceiptStatus(`Leyendo imagen... ${percent}%`);
        }
      },
    });
    return result.data.text;
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }

  return file.text();
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js no disponible");
  }

  const buffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    setReceiptStatus(`Leyendo PDF... página ${pageNumber} de ${pdf.numPages}`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(groupPdfTextItemsByLine(content.items));
  }

  return pages.join("\n");
}

function groupPdfTextItemsByLine(items) {
  const lineMap = new Map();

  for (const item of items) {
    const text = String(item.str || "").trim();
    if (!text) continue;

    const x = item.transform?.[4] || 0;
    const y = Math.round(item.transform?.[5] || 0);
    const key = String(y);
    const line = lineMap.get(key) || [];
    line.push({ x, text });
    lineMap.set(key, line);
  }

  return [...lineMap.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, line]) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .join("\n");
}

function detectDocumentType(text) {
  const normalizedText = normalizeText(text);
  const datedLines = text.split(/\r?\n/).filter((line) => /\d{1,2}[\/.-]\d{1,2}/.test(line)).length;
  const statementWords = ["resumen", "tarjeta", "visa", "mastercard", "amex", "consumos", "cupon", "comprobante"];
  const hasStatementWord = statementWords.some((word) => normalizedText.includes(word));

  return hasStatementWord || datedLines >= 3 ? "statement" : "receipt";
}

function extractExpenseFromReceiptText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    amount: extractReceiptAmount(lines),
    date: extractReceiptDate(text),
    note: extractReceiptNote(lines),
  };
}

function extractReceiptAmount(lines) {
  const amountPattern = /(?:\$|\bARS\b)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+[.,][0-9]{2})/gi;
  const priorityWords = ["total", "importe", "monto", "pagar", "pagado", "venta"];
  const candidates = [];

  lines.forEach((line, lineIndex) => {
    const normalizedLine = normalizeText(line);
    const priority = priorityWords.some((word) => normalizedLine.includes(word)) ? 2 : 0;
    const matches = [...line.matchAll(amountPattern)];

    matches.forEach((match) => {
      const amount = parseReceiptAmount(match[1]);
      if (amount > 0) {
        candidates.push({ amount, priority, lineIndex });
      }
    });
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.priority - a.priority || b.amount - a.amount || b.lineIndex - a.lineIndex);
  return candidates[0].amount;
}

function parseReceiptAmount(value) {
  const cleanValue = value.replace(/[^\d.,]/g, "");
  const lastComma = cleanValue.lastIndexOf(",");
  const lastDot = cleanValue.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex === -1) return Number(cleanValue);

  const integerPart = cleanValue.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimalPart = cleanValue.slice(decimalIndex + 1);
  return Number(`${integerPart}.${decimalPart}`);
}

function extractReceiptDate(text) {
  const datePatterns = [
    /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/,
    /\b(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const isYearFirst = match[1].length === 4;
    const year = normalizeReceiptYear(isYearFirst ? match[1] : match[3]);
    const month = Number(isYearFirst ? match[2] : match[2]);
    const day = Number(isYearFirst ? match[3] : match[1]);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return toISODate(date);
    }
  }

  return null;
}

function normalizeReceiptYear(value) {
  const year = Number(value);
  return year < 100 ? 2000 + year : year;
}

function extractReceiptNote(lines) {
  const ignoredWords = ["factura", "ticket", "consumidor", "cuit", "iva", "inicio", "total"];
  const noteLine = lines.find((line) => {
    const normalizedLine = normalizeText(line);
    return (
      line.length >= 4 &&
      /[a-zA-Z]/.test(line) &&
      !ignoredWords.some((word) => normalizedLine.includes(word)) &&
      !/[0-9]{1,2}[\/.-][0-9]{1,2}[\/.-][0-9]{2,4}/.test(line)
    );
  });

  return noteLine ? noteLine.slice(0, 80) : "Ticket o factura";
}

function extractStatementCandidates(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const owner = detectStatementOwner(text);
  const common = [];
  const personal = [];

  for (const line of lines) {
    const candidate = extractStatementLine(line);
    if (!candidate) continue;
    if (candidate.isCommon) {
      common.push(candidate);
    } else {
      personal.push(candidate);
    }
  }

  return { owner, common, personal };
}

function extractStatementLine(line) {
  const dateMatch = line.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (!dateMatch) return null;

  const amountMatches = [...line.matchAll(/(?:\$|\bARS\b)?\s*(-?[0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|-?[0-9]+[.,][0-9]{2})/gi)];
  if (!amountMatches.length) return null;

  const amount = parseReceiptAmount(amountMatches.at(-1)[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedLine = normalizeText(line);
  if (ignoredStatementKeywords.some((keyword) => normalizedLine.includes(normalizeText(keyword)))) return null;

  const matchedKeyword = sharedExpenseKeywords.find((keyword) => normalizedLine.includes(normalizeText(keyword)));

  const selected = parseISODate(elements.weekStart.value || toISODate(new Date()));
  const year = dateMatch[3] ? normalizeReceiptYear(dateMatch[3]) : selected.getFullYear();
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const rawDescription = line
    .replace(dateMatch[0], "")
    .replace(amountMatches.at(-1)[0], "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    id: createId(),
    date: toISODate(date),
    note: cleanStatementDescription(rawDescription || line),
    amount,
    currency: normalizedLine.includes("usd") ? "USD" : "ARS",
    category: matchedKeyword ? inferCategoryFromStatementLine(normalizedLine, matchedKeyword) : inferPersonalCategoryFromStatementLine(normalizedLine),
    keyword: matchedKeyword || "personal",
    isCommon: Boolean(matchedKeyword),
  };
}

function detectStatementOwner(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const patterns = [
    /(?:titular|socio|cliente|se(?:ñ|n)or(?:a)?|nombre)\s*:?\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,'.-]{5,})/i,
    /\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})\b/,
  ];
  const ignored = ["RESUMEN", "TARJETA", "VISA", "MASTERCARD", "GALICIA", "FECHA", "REFERENCIA", "PESOS", "DOLARES"];

  for (const line of lines.slice(0, 40)) {
    const normalizedLine = normalizeText(line);
    if (ignored.some((word) => normalizedLine.includes(normalizeText(word)))) continue;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      const name = match?.[1]?.replace(/[,.;]+$/g, "").trim();
      if (name && name.length >= 6 && /[A-ZÁÉÍÓÚÑ]/i.test(name)) {
        return titleCaseName(name);
      }
    }
  }

  return getDeviceOwner();
}

function titleCaseName(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanStatementDescription(value) {
  return value
    .replace(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function inferCategoryFromStatementLine(normalizedLine, keyword) {
  if (["integrity", "cia seg la mer"].some((word) => normalizedLine.includes(word))) {
    return "Transporte";
  }

  if (["galicia seguro", "galicia seguros"].some((word) => normalizedLine.includes(word))) {
    return "Servicios";
  }

  if (["netflix", "spotify", "disney", "prime", "amazon", "max", "hbo", "paramount", "youtube"].some((word) => normalizedLine.includes(word))) {
    return "Servicios";
  }

  if (["auto", "moto"].some((word) => normalizedLine.includes(word))) {
    return "Transporte";
  }

  if (["internet", "movistar", "personal", "telecentro", "claro", "edenor", "edesur", "aysa", "metrogas"].some((word) => normalizedLine.includes(word))) {
    return "Servicios";
  }

  if (normalizeText(keyword).includes("seguro")) {
    return normalizedLine.includes("hogar") ? "Servicios" : "Transporte";
  }

  return "Otro";
}

function inferPersonalCategoryFromStatementLine(normalizedLine) {
  if (["farmacia", "medic", "salud"].some((word) => normalizedLine.includes(word))) return "Salud";
  if (["ropa", "indumentaria", "zapato"].some((word) => normalizedLine.includes(word))) return "Ropa";
  if (["resto", "bar", "cafe", "cine", "steam", "google", "capcut"].some((word) => normalizedLine.includes(word))) return "Ocio";
  if (["super", "mercado", "kiosco"].some((word) => normalizedLine.includes(word))) return "Comida";
  return "Otro";
}

function renderStatementReview(result) {
  const commonCandidates = result.common || [];
  const personalCandidates = result.personal || [];
  const allCandidates = [...commonCandidates, ...personalCandidates];
  statementCandidates = allCandidates;

  if (!allCandidates.length) {
    clearStatementReview();
    setReceiptStatus("Detecté un resumen, pero no encontré consumos claros para importar. Podés cargar el gasto manualmente.", "error");
    return;
  }

  elements.statementReview.classList.remove("is-hidden");
  const hasUsd = allCandidates.some((candidate) => candidate.currency === "USD");
  elements.statementReview.innerHTML = `
    <div class="statement-heading">
      <strong>Resumen detectado</strong>
      <span>${allCandidates.length} movimiento${allCandidates.length === 1 ? "" : "s"} para revisar</span>
    </div>
    <p class="statement-note">Se van a cargar en la semana seleccionada: ${escapeHtml(elements.weekRangeLabel.textContent || getSelectedWeekKey())}. La fecha original queda guardada en la descripción.</p>
    <label class="statement-rate">
      Titular detectado
      <input id="statementOwnerInput" type="text" maxlength="50" value="${escapeHtml(result.owner || getDeviceOwner())}" />
    </label>
    ${
      hasUsd
        ? `
          <label class="statement-rate">
            Cotización USD
            <input id="statementUsdRate" type="text" inputmode="decimal" placeholder="Ej: 1250,00" />
          </label>
        `
        : ""
    }
    ${renderStatementCandidateGroup("Comunes para repartir", commonCandidates, "common")}
    ${renderStatementCandidateGroup("Personales", personalCandidates, "personal")}
    <div id="statementImportTotal" class="statement-import-total"></div>
    <button id="addStatementExpensesButton" type="button">Agregar seleccionados</button>
  `;
  updateStatementImportTotal();
  setReceiptStatus(
    `Detecté un resumen de tarjeta. Revisá los movimientos antes de agregarlos.${
      hasUsd ? " Si querés incluir dólares, marcá esos consumos e indicá la cotización." : ""
    }`,
    "success",
  );
}

function renderStatementCandidateGroup(title, candidates, kind) {
  if (!candidates.length) return "";

  return `
    <div class="statement-group">
      <div class="statement-group-title">
        <strong>${title}</strong>
        <span>${candidates.length}</span>
      </div>
      <div class="statement-list">
        ${candidates
          .map(
            (candidate) => `
              <label class="statement-item ${kind === "personal" ? "is-personal" : ""}">
                <input type="checkbox" data-statement-id="${candidate.id}" checked />
                <span>
                  <strong>${escapeHtml(candidate.note)}</strong>
                  <small>${dateFormatter.format(parseISODate(candidate.date))} · ${escapeHtml(candidate.category)}${candidate.currency === "USD" ? " · importe en USD" : ""}</small>
                </span>
                <b>${candidate.currency === "USD" ? formatUsd(candidate.amount) : formatMoney(candidate.amount)}</b>
              </label>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function clearStatementReview() {
  statementCandidates = [];
  elements.statementReview.classList.add("is-hidden");
  elements.statementReview.innerHTML = "";
}

function handleStatementReviewClick(event) {
  const button = event.target.closest("#addStatementExpensesButton");
  if (!button) return;

  const selectedIds = [...elements.statementReview.querySelectorAll("input[data-statement-id]:checked")].map(
    (input) => input.dataset.statementId,
  );
  const selectedItems = statementCandidates.filter((candidate) => selectedIds.includes(candidate.id));

  if (!selectedItems.length) {
    alert("Seleccioná al menos un gasto para agregar.");
    return;
  }

  const usdRate = getStatementUsdRate();
  if (selectedItems.some((item) => item.currency === "USD") && !usdRate) {
    alert("Indicá la cotización USD para convertir esos consumos a pesos.");
    return;
  }

  const payer = elements.expensePayer.value || getDeviceOwner();
  const owner = elements.statementReview.querySelector("#statementOwnerInput")?.value.trim() || payer;
  const now = Date.now();
  const importDate = getSelectedWeekKey();
  const importedCommonExpenses = selectedItems.filter((candidate) => candidate.isCommon).map((candidate, index) => {
    const convertedAmount = getStatementCandidateAmount(candidate, usdRate);
    const originalDateLabel = dateFormatter.format(parseISODate(candidate.date));
    const sourceNote = `${candidate.note} (consumo ${originalDateLabel})`;
    return {
      id: createId(),
      date: importDate,
      payer,
      category: candidate.category,
      paymentMethod: "Tarjeta de crédito",
      amount: convertedAmount,
      note:
        candidate.currency === "USD"
          ? `${sourceNote} · ${formatUsd(candidate.amount)} x ${formatMoney(usdRate)}`
          : sourceNote,
      createdAt: now + index,
    };
  });
  const importedPersonalExpenses = selectedItems.filter((candidate) => !candidate.isCommon).map((candidate, index) => {
    const convertedAmount = getStatementCandidateAmount(candidate, usdRate);
    const originalDateLabel = dateFormatter.format(parseISODate(candidate.date));
    const sourceNote = `${candidate.note} (consumo ${originalDateLabel})`;
    return {
      id: createId(),
      date: importDate,
      owner,
      category: candidate.category,
      paymentMethod: "Tarjeta de crédito",
      amount: convertedAmount,
      note:
        candidate.currency === "USD"
          ? `${sourceNote} · ${formatUsd(candidate.amount)} x ${formatMoney(usdRate)}`
          : sourceNote,
      createdAt: now + importedCommonExpenses.length + index,
    };
  });
  state.expenses.push(...importedCommonExpenses);
  state.personalExpenses.push(...importedPersonalExpenses);

  const importedTotal = [...importedCommonExpenses, ...importedPersonalExpenses].reduce((sum, expense) => sum + expense.amount, 0);
  elements.weekStart.value = importDate;
  saveState();
  clearStatementReview();
  setReceiptStatus(
    `Agregué ${importedCommonExpenses.length} común${importedCommonExpenses.length === 1 ? "" : "es"} y ${importedPersonalExpenses.length} personal${importedPersonalExpenses.length === 1 ? "" : "es"} por ${formatMoney(importedTotal)} en la semana seleccionada.`,
    "success",
  );
  render();
}

function handleStatementReviewInput(event) {
  if (
    event.target.matches("#statementUsdRate") ||
    event.target.matches("input[data-statement-id]")
  ) {
    updateStatementImportTotal();
  }
}

function getStatementUsdRate() {
  const input = elements.statementReview.querySelector("#statementUsdRate");
  if (!input) return null;
  const value = parseAmountInput(input.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getStatementCandidateAmount(candidate, usdRate = getStatementUsdRate()) {
  if (candidate.currency !== "USD") return candidate.amount;
  return usdRate ? candidate.amount * usdRate : 0;
}

function updateStatementImportTotal() {
  const totalElement = elements.statementReview.querySelector("#statementImportTotal");
  if (!totalElement) return;

  const selectedIds = [...elements.statementReview.querySelectorAll("input[data-statement-id]:checked")].map(
    (input) => input.dataset.statementId,
  );
  const usdRate = getStatementUsdRate();
  const selectedItems = statementCandidates.filter((candidate) => selectedIds.includes(candidate.id));
  const hasSelectedUsd = selectedItems.some((candidate) => candidate.currency === "USD");
  const commonTotal = selectedItems
    .filter((candidate) => candidate.isCommon)
    .reduce((sum, candidate) => sum + getStatementCandidateAmount(candidate, usdRate), 0);
  const personalTotal = selectedItems
    .filter((candidate) => !candidate.isCommon)
    .reduce((sum, candidate) => sum + getStatementCandidateAmount(candidate, usdRate), 0);
  const total = commonTotal + personalTotal;

  totalElement.innerHTML = `
    <span>Total a importar</span>
    <strong>${formatMoney(total)}</strong>
    <small>Comunes: ${formatMoney(commonTotal)} · Personales: ${formatMoney(personalTotal)}</small>
    ${hasSelectedUsd && !usdRate ? `<small>Falta cotización para convertir los importes en USD.</small>` : ""}
  `;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setupVoiceExpenseCapture() {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    elements.voiceExpenseButton.disabled = true;
    setVoiceStatus("Tu navegador no permite dictado desde esta app. Podés escribir la frase y tocar Interpretar.", "error");
    return;
  }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = "es-AR";
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;

  voiceRecognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    fillExpenseFromVoice(transcript);
  });

  voiceRecognition.addEventListener("error", () => {
    isListeningForExpense = false;
    elements.voiceExpenseButton.textContent = "Dictar gasto";
    setVoiceStatus("No pude escuchar el audio. Revisá el permiso del micrófono o escribí la frase abajo.", "error");
  });

  voiceRecognition.addEventListener("end", () => {
    isListeningForExpense = false;
    elements.voiceExpenseButton.textContent = "Dictar gasto";
  });
}

function handleVoiceTextSubmit(event) {
  event.preventDefault();
  const text = elements.voiceTextInput.value.trim();
  if (!text) {
    setVoiceStatus("Escribí una frase con monto y descripción para interpretarla.", "error");
    return;
  }

  fillExpenseFromVoice(text);
  elements.voiceTextInput.value = "";
}

function handleVoiceExpenseClick() {
  if (!voiceRecognition) {
    setVoiceStatus("El dictado no está disponible en este navegador.", "error");
    return;
  }

  if (isListeningForExpense) {
    voiceRecognition.stop();
    return;
  }

  try {
    isListeningForExpense = true;
    elements.voiceExpenseButton.textContent = "Escuchando...";
    setVoiceStatus("Te escucho. Decí el monto, la categoría y, si querés, quién pagó.", "");
    voiceRecognition.start();
  } catch {
    isListeningForExpense = false;
    elements.voiceExpenseButton.textContent = "Dictar gasto";
    setVoiceStatus("No pude iniciar el dictado. Probá de nuevo en unos segundos.", "error");
  }
}

function fillExpenseFromVoice(transcript) {
  const parsed = parseVoiceExpense(transcript);
  const amountStatus = parsed.amount ? "" : " No encontré el monto, completalo manualmente.";

  if (parsed.isPersonal) {
    setEntryMode("personal");
    elements.personalExpenseDate.value = getSelectedWeekKey();
    elements.personalExpenseOwner.value = parsed.person || elements.personalExpenseOwner.value || getDeviceOwner();
    if (parsed.category) setSelectValueIfAvailable(elements.personalExpenseCategory, parsed.category);
    if (parsed.amount) elements.personalExpenseAmount.value = parsed.amount.toFixed(2);
    if (parsed.note) elements.personalExpenseNote.value = parsed.note;
    setVoiceStatus(
      `Escuché: "${transcript}". Completé el gasto personal para revisar antes de agregarlo.${amountStatus}`,
      parsed.amount ? "success" : "error",
    );
    elements.personalExpenseAmount.focus();
    return;
  }

  setEntryMode("common");
  elements.expenseDate.value = getSelectedWeekKey();
  if (parsed.person && state.people.includes(parsed.person)) elements.expensePayer.value = parsed.person;
  if (parsed.category) setSelectValueIfAvailable(elements.expenseCategory, parsed.category);
  if (parsed.amount) elements.expenseAmount.value = parsed.amount.toFixed(2);
  if (parsed.note) elements.expenseNote.value = parsed.note;
  setVoiceStatus(
    `Escuché: "${transcript}". Completé el gasto común para revisar antes de agregarlo.${amountStatus}`,
    parsed.amount ? "success" : "error",
  );
  elements.expenseAmount.focus();
}

function parseVoiceExpense(transcript) {
  const normalized = normalizeText(transcript);
  const amount = extractVoiceAmount(normalized);
  const category = detectVoiceCategory(normalized);
  const person = detectVoicePerson(normalized);
  const isPersonal = /\b(personal|mio|mia|propio|propia|para mi)\b/.test(normalized);
  const note = cleanVoiceNote(transcript, { amount, category, person, isPersonal });

  return { amount, category, person, isPersonal, note };
}

function extractVoiceAmount(text) {
  const textWithoutPeople = state.people.reduce(
    (currentText, person) => currentText.replaceAll(normalizeText(person), " "),
    text,
  );
  const digitMatch = textWithoutPeople.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\b|\b\d+(?:[.,]\d{1,2})?\b/);
  if (digitMatch) {
    const parsedAmount = parseAmountInput(digitMatch[0]);
    if (Number.isFinite(parsedAmount) && parsedAmount > 0) return parsedAmount;
  }

  return parseSpanishNumberWords(textWithoutPeople);
}

function parseSpanishNumberWords(text) {
  const units = {
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
  };
  const specials = {
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciseis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
    veintiuno: 21,
    veintidos: 22,
    veintitres: 23,
    veinticuatro: 24,
    veinticinco: 25,
    veintiseis: 26,
    veintisiete: 27,
    veintiocho: 28,
    veintinueve: 29,
  };
  const tens = {
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
  };
  const hundreds = {
    cien: 100,
    ciento: 100,
    doscientos: 200,
    trescientos: 300,
    cuatrocientos: 400,
    quinientos: 500,
    seiscientos: 600,
    setecientos: 700,
    ochocientos: 800,
    novecientos: 900,
  };
  const stopWords = new Set([
    "pesos",
    "peso",
    "en",
    "de",
    "por",
    "gasto",
    "gaste",
    "pague",
    "pago",
    "comun",
    "personal",
  ]);
  const tokens = text
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  let found = false;

  for (const token of tokens) {
    if (units[token]) {
      current += units[token];
      found = true;
    } else if (specials[token]) {
      current += specials[token];
      found = true;
    } else if (tens[token]) {
      current += tens[token];
      found = true;
    } else if (hundreds[token]) {
      current += hundreds[token];
      found = true;
    } else if (token === "mil") {
      total += (current || 1) * 1000;
      current = 0;
      found = true;
    } else if (token === "millon" || token === "millones") {
      total += (current || 1) * 1000000;
      current = 0;
      found = true;
    } else if (token === "y" || stopWords.has(token)) {
      continue;
    } else if (found) {
      break;
    }
  }

  const amount = total + current;
  return found && amount > 0 ? amount : null;
}

function detectVoiceCategory(text) {
  const categoryRules = [
    ["Comida", ["comida", "supermercado", "verduleria", "carniceria", "almacen", "delivery", "restaurante"]],
    ["Servicios", ["servicio", "servicios", "luz", "gas", "agua", "internet", "seguro", "telefono", "streaming"]],
    ["Limpieza", ["limpieza", "lavandina", "detergente", "jabon"]],
    ["Alquiler", ["alquiler", "expensas"]],
    ["Transporte", ["transporte", "nafta", "combustible", "sube", "taxi", "uber", "peaje"]],
    ["Salud", ["salud", "farmacia", "medico", "remedio", "prepaga"]],
    ["Ropa", ["ropa", "zapatillas", "zapatos", "remera", "pantalon"]],
    ["Ocio", ["ocio", "cine", "salida", "juego", "bar"]],
    ["Otro", ["otro", "varios"]],
  ];
  const match = categoryRules.find(([, words]) => words.some((word) => text.includes(word)));
  return match ? match[0] : "";
}

function setSelectValueIfAvailable(select, value) {
  const hasOption = [...select.options].some((option) => option.value === value);
  if (hasOption) select.value = value;
}

function detectVoicePerson(text) {
  return state.people.find((person) => text.includes(normalizeText(person))) || "";
}

function cleanVoiceNote(transcript, { amount, category, person, isPersonal }) {
  let note = transcript.trim();
  const normalizedPerson = person ? normalizeText(person) : "";
  const numberWords = new Set([
    "un",
    "uno",
    "una",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciseis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
    "veinte",
    "veintiuno",
    "veintidos",
    "veintitres",
    "veinticuatro",
    "veinticinco",
    "veintiseis",
    "veintisiete",
    "veintiocho",
    "veintinueve",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
    "cien",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
    "mil",
    "millon",
    "millones",
    "y",
  ]);

  note = note.replace(/\b(comun|común|personal|gasto|gast[eé]|pagu[eé]|pag[oó]|monto|pesos?)\b/gi, " ");
  if (amount) {
    note = note.replace(new RegExp(String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, "[.,]?"), "g"), " ");
  }
  if (category) {
    note = note.replace(new RegExp(category, "gi"), " ");
  }
  if (person && normalizedPerson) note = note.replace(new RegExp(escapeRegExp(person), "gi"), " ");
  if (isPersonal) note = note.replace(/\b(m[ií]o|m[ií]a|propio|propia|para m[ií]|para)\b/gi, " ");
  note = note
    .split(/\s+/)
    .filter((word) => !numberWords.has(normalizeText(word)))
    .join(" ");

  return note.replace(/\s+/g, " ").trim().slice(0, 100) || "Gasto dictado por voz";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fillExpenseFromReceipt({ amount, date, note }) {
  const filledFields = [];

  if (date) {
    elements.expenseDate.value = date;
    filledFields.push("fecha");
  }

  if (amount) {
    elements.expenseAmount.value = amount.toFixed(2);
    filledFields.push("monto");
  }

  if (note) {
    elements.expenseNote.value = note;
    filledFields.push("descripción");
  }

  if (!filledFields.length) {
    setReceiptStatus("Leí el ticket, pero no encontré datos claros. Podés completar el gasto manualmente.", "error");
    return;
  }

  setReceiptStatus(`Completé ${filledFields.join(", ")}. Revisá los datos antes de agregar el gasto.`, "success");
  elements.expenseAmount.focus();
}

function handlePeopleSubmit(event) {
  event.preventDefault();
  const personA = elements.personAInput.value.trim();
  const personB = elements.personBInput.value.trim();
  const selectedDeviceOwner = elements.deviceOwnerSelect.value;

  if (!personA || !personB || personA === personB) {
    alert("Cargá dos nombres distintos.");
    return;
  }

  const previousPeople = state.people;
  const previousDeviceOwnerIndex = previousPeople.indexOf(state.deviceOwner);
  state.people = [personA, personB];
  state.deviceOwner =
    selectedDeviceOwner === previousPeople[1] || previousDeviceOwnerIndex === 1 ? personB : personA;
  state.expenses = state.expenses.map((expense) => {
    if (expense.payer === previousPeople[0]) return { ...expense, payer: personA };
    if (expense.payer === previousPeople[1]) return { ...expense, payer: personB };
    return expense;
  });
  state.personalExpenses = state.personalExpenses.map((expense) => {
    if (expense.owner === previousPeople[0]) return { ...expense, owner: personA };
    if (expense.owner === previousPeople[1]) return { ...expense, owner: personB };
    return expense;
  });
  state.recurringExpenses = state.recurringExpenses.map((expense) => {
    if (expense.payer === previousPeople[0]) return { ...expense, payer: personA };
    if (expense.payer === previousPeople[1]) return { ...expense, payer: personB };
    return expense;
  });

  saveState();
  elements.expensePayer.value = getDeviceOwner();
  elements.personalExpenseOwner.value = getDeviceOwner();
  render();
  closeSettings();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const amount = parseAmountInput(elements.expenseAmount.value);
  const expenseDate = elements.expenseDate.value || toISODate(new Date());
  const payer = elements.expensePayer.value || getDeviceOwner();

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("El monto tiene que ser mayor que cero.");
    return;
  }

  state.expenses.push({
    id: createId(),
    date: expenseDate,
    payer,
    category: elements.expenseCategory.value,
    paymentMethod: elements.expensePaymentMethod.value,
    amount,
    note: elements.expenseNote.value.trim(),
    createdAt: Date.now(),
  });

  saveState();
  elements.expenseForm.reset();
  elements.expenseDate.value = toISODate(new Date());
  elements.expensePayer.value = getDeviceOwner();
  elements.weekStart.value = toISODate(getWeekStart(parseISODate(expenseDate)));
  setReceiptStatus("Gasto agregado. Te llevé a la semana correspondiente para que lo veas en el resumen.", "success");
  render();
  elements.expenseAmount.focus();
}

function handlePersonalExpenseSubmit(event) {
  event.preventDefault();
  const amount = parseAmountInput(elements.personalExpenseAmount.value);
  const expenseDate = elements.personalExpenseDate.value || getSelectedWeekKey();
  const owner = elements.personalExpenseOwner.value.trim() || getDeviceOwner();

  if (!owner) {
    alert("Indicá para quién es el gasto personal.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("El monto tiene que ser mayor que cero.");
    return;
  }

  state.personalExpenses.push({
    id: createId(),
    date: expenseDate,
    owner,
    category: elements.personalExpenseCategory.value,
    paymentMethod: elements.personalExpensePaymentMethod.value,
    amount,
    note: elements.personalExpenseNote.value.trim(),
    createdAt: Date.now(),
  });

  saveState();
  elements.personalExpenseForm.reset();
  elements.personalExpenseDate.value = getSelectedWeekKey();
  elements.personalExpenseOwner.value = getDeviceOwner();
  elements.weekStart.value = toISODate(getWeekStart(parseISODate(expenseDate)));
  render();
  elements.personalExpenseAmount.focus();
}

function setEntryMode(mode) {
  const isPersonal = mode === "personal";
  elements.commonTabButton.classList.toggle("is-active", !isPersonal);
  elements.personalTabButton.classList.toggle("is-active", isPersonal);
  elements.commonExpenseSection.classList.toggle("is-hidden", isPersonal);
  elements.personalExpenseSection.classList.toggle("is-hidden", !isPersonal);
}

function openSettings() {
  populateSettingsForm();
  elements.settingsView.classList.remove("is-hidden");
  elements.settingsOpenButton.setAttribute("aria-expanded", "true");
}

function closeSettings() {
  elements.settingsView.classList.add("is-hidden");
  elements.settingsOpenButton.setAttribute("aria-expanded", "false");
}

function handleSettingsOverlayClick(event) {
  if (event.target === elements.settingsView) closeSettings();
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape" && !elements.settingsView.classList.contains("is-hidden")) {
    closeSettings();
  }
}

function handleWindowResize() {
  if (!elements.settingsView.classList.contains("is-hidden")) return;
  render();
}

function handleBudgetSubmit(event) {
  event.preventDefault();
  const amount = parseAmountInput(elements.budgetAmount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("El presupuesto tiene que ser mayor que cero.");
    return;
  }

  state.budgets[elements.budgetCategory.value] = amount;
  saveState();
  elements.budgetForm.reset();
  render();
}

function handleRecurringSubmit(event) {
  event.preventDefault();
  const amount = parseAmountInput(elements.recurringAmount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("El monto recurrente tiene que ser mayor que cero.");
    return;
  }

  state.recurringExpenses.push({
    id: createId(),
    payer: elements.recurringPayer.value,
    category: elements.recurringCategory.value,
    paymentMethod: "",
    amount,
    note: elements.recurringNote.value.trim(),
    frequency: elements.recurringFrequency.value,
    createdAt: Date.now(),
  });

  saveState();
  elements.recurringForm.reset();
  render();
}

function handleApplyRecurring() {
  if (!state.recurringExpenses.length) {
    alert("Primero guardá algún gasto recurrente.");
    return;
  }

  const weekKey = getSelectedWeekKey();
  const { start } = getSelectedWeekRange();
  let added = 0;

  for (const recurring of state.recurringExpenses) {
    const shouldApply = recurring.frequency === "weekly" || isFirstWeekOfMonth(start);
    const alreadyApplied = state.expenses.some(
      (expense) => expense.recurringId === recurring.id && toISODate(getWeekStart(parseISODate(expense.date))) === weekKey,
    );

    if (!shouldApply || alreadyApplied) continue;

    state.expenses.push({
      id: createId(),
      date: weekKey,
      payer: recurring.payer,
      category: recurring.category,
      paymentMethod: recurring.paymentMethod || "",
      amount: recurring.amount,
      note: recurring.note,
      recurringId: recurring.id,
      createdAt: Date.now() + added,
    });
    added += 1;
  }

  if (!added) {
    alert("No hay recurrentes nuevos para aplicar en esta semana.");
    return;
  }

  saveState();
  render();
}

function isFirstWeekOfMonth(weekStart) {
  const firstDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  return toISODate(getWeekStart(firstDay)) === toISODate(weekStart);
}

function handleExportBackup() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "gastos-del-hogar",
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-gastos-hogar-${toISODate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setBackupStatus("Backup exportado.", "success");
}

async function handleImportBackup(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const importedState = normalizeState(parsed.data || parsed);
    const confirmed = confirm("Esto reemplazará los datos guardados en este navegador. ¿Querés importar el backup?");
    if (!confirmed) return;

    state = importedState;
    saveState();
    render();
    setBackupStatus("Backup importado correctamente.", "success");
  } catch (error) {
    console.error(error);
    setBackupStatus("No pude importar ese archivo. Revisá que sea un backup JSON válido.", "error");
  } finally {
    elements.importBackupInput.value = "";
  }
}

function setBackupStatus(message, tone = "") {
  elements.backupStatus.textContent = message;
  elements.backupStatus.className = `inline-status ${tone}`.trim();
}

function handleFiltersChange() {
  filters.search = elements.searchInput.value.trim();
  filters.payer = elements.filterPayer.value;
  filters.category = elements.filterCategory.value;
  filters.paymentMethod = elements.filterPaymentMethod.value;
  render();
}

function handleClearFilters() {
  filters.search = "";
  filters.payer = "";
  filters.category = "";
  filters.paymentMethod = "";
  render();
}

function handleSettleWeek() {
  const expenses = getCurrentWeekExpenses();
  if (!expenses.length) {
    alert("Primero cargá algún gasto para esta semana.");
    return;
  }

  const weekKey = getSelectedWeekKey();
  const existingSettlement = state.settlements.find((settlement) => settlement.weekKey === weekKey);
  if (existingSettlement) {
    const confirmed = confirm("Esta semana ya figura como saldada. ¿Querés actualizar el cierre?");
    if (!confirmed) return;
  }

  const { start, end } = getSelectedWeekRange();
  const settlement = calculateSettlement(expenses);
  const record = {
    id: existingSettlement?.id || createId(),
    weekKey,
    weekLabel: `${dateFormatter.format(start)} al ${dateFormatter.format(end)}`,
    settledAt: toISODate(new Date()),
    total: settlement.total,
    amount: settlement.amount,
    debtor: settlement.debtor,
    creditor: settlement.creditor,
    people: [...state.people],
  };

  state.settlements = [
    record,
    ...state.settlements.filter((settlementItem) => settlementItem.weekKey !== weekKey),
  ];
  saveState();
  render();
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function handleTableClick(event) {
  const expenseButton = event.target.closest("button[data-id]");
  if (!expenseButton) return;

  state.expenses = state.expenses.filter((expense) => expense.id !== expenseButton.dataset.id);
  saveState();
  render();
}

function handlePersonalTableClick(event) {
  const expenseButton = event.target.closest("button[data-personal-id]");
  if (!expenseButton) return;

  state.personalExpenses = state.personalExpenses.filter((expense) => expense.id !== expenseButton.dataset.personalId);
  saveState();
  render();
}

function handleBudgetListClick(event) {
  const button = event.target.closest("button[data-budget-category]");
  if (!button) return;

  delete state.budgets[button.dataset.budgetCategory];
  saveState();
  render();
}

function handleRecurringListClick(event) {
  const button = event.target.closest("button[data-recurring-id]");
  if (!button) return;

  state.recurringExpenses = state.recurringExpenses.filter((expense) => expense.id !== button.dataset.recurringId);
  saveState();
  render();
}

function handleClearWeek() {
  const expenses = getCurrentWeekExpenses();
  if (!expenses.length) return;

  const confirmed = confirm("¿Querés borrar todos los gastos de esta semana?");
  if (!confirmed) return;

  const idsToDelete = new Set(expenses.map((expense) => expense.id));
  state.expenses = state.expenses.filter((expense) => !idsToDelete.has(expense.id));
  saveState();
  render();
}

function handleExport() {
  const expenses = getCurrentWeekExpenses();
  const header = ["Fecha", "Pago", "Categoria", "Forma de pago", "Descripcion", "Monto"];
  const rows = expenses.map((expense) => [
    expense.date,
    expense.payer,
    expense.category,
    expense.paymentMethod || "Sin especificar",
    expense.note || "",
    expense.amount.toFixed(2),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gastos-${elements.weekStart.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function init() {
  elements.weekStart.value = toISODate(getWeekStart());
  elements.expenseDate.value = toISODate(new Date());
  elements.personalExpenseDate.value = getSelectedWeekKey();

  elements.exportBackupButton.addEventListener("click", handleExportBackup);
  elements.importBackupInput.addEventListener("change", handleImportBackup);
  elements.settingsOpenButton.addEventListener("click", openSettings);
  elements.settingsCloseButton.addEventListener("click", closeSettings);
  elements.settingsView.addEventListener("click", handleSettingsOverlayClick);
  window.addEventListener("keydown", handleGlobalKeydown);
  elements.peopleForm.addEventListener("submit", handlePeopleSubmit);
  elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
  elements.personalExpenseForm.addEventListener("submit", handlePersonalExpenseSubmit);
  elements.commonTabButton.addEventListener("click", () => setEntryMode("common"));
  elements.personalTabButton.addEventListener("click", () => setEntryMode("personal"));
  elements.voiceExpenseButton.addEventListener("click", handleVoiceExpenseClick);
  elements.voiceTextForm.addEventListener("submit", handleVoiceTextSubmit);
  elements.budgetForm.addEventListener("submit", handleBudgetSubmit);
  elements.budgetList.addEventListener("click", handleBudgetListClick);
  elements.recurringForm.addEventListener("submit", handleRecurringSubmit);
  elements.recurringList.addEventListener("click", handleRecurringListClick);
  elements.applyRecurringButton.addEventListener("click", handleApplyRecurring);
  elements.documentFile.addEventListener("change", handleDocumentFileChange);
  elements.statementReview.addEventListener("click", handleStatementReviewClick);
  elements.statementReview.addEventListener("input", handleStatementReviewInput);
  elements.statementReview.addEventListener("change", handleStatementReviewInput);
  elements.expensesTable.addEventListener("click", handleTableClick);
  elements.personalExpensesTable.addEventListener("click", handlePersonalTableClick);
  elements.weekStart.addEventListener("change", render);
  elements.currentWeekButton.addEventListener("click", () => {
    elements.weekStart.value = toISODate(getWeekStart());
    render();
  });
  elements.clearWeekButton.addEventListener("click", handleClearWeek);
  elements.settleWeekButton.addEventListener("click", handleSettleWeek);
  elements.exportButton.addEventListener("click", handleExport);
  elements.searchInput.addEventListener("input", handleFiltersChange);
  elements.filterPayer.addEventListener("change", handleFiltersChange);
  elements.filterCategory.addEventListener("change", handleFiltersChange);
  elements.filterPaymentMethod.addEventListener("change", handleFiltersChange);
  elements.clearFiltersButton.addEventListener("click", handleClearFilters);
  elements.barChartButton.addEventListener("click", () => {
    chartType = "bar";
    render();
  });
  elements.pieChartButton.addEventListener("click", () => {
    chartType = "pie";
    render();
  });
  window.addEventListener("resize", handleWindowResize);

  closeSettings();
  setupVoiceExpenseCapture();
  render();
}

init();
