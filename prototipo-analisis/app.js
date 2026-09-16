const STORAGE_KEY = "gastos-hogar-prototipo-analisis-v1";

const demo = {
  source: "demo",
  people: ["Eze", "Tami"],
  deviceOwner: "Eze",
  expenses: [
    ["Servicios", 546916.5], ["Supermercado", 375718], ["Otros", 274174.12],
    ["Tarjeta de credito", 223125], ["Despensa", 93079], ["Combustible", 84000],
    ["Verduleria", 74700], ["Polleria/Pescaderia", 49000], ["Fiambreria", 43900],
    ["Dietetica", 35680], ["Carniceria", 29300],
  ].map(([category, amount], index) => ({ id: `demo-c-${index}`, date: "2026-08-15", payer: index % 3 ? "Tami" : "Eze", category, amount })),
  personalExpenses: [
    { id: "demo-p-1", date: "2026-08-10", owner: "Eze", category: "Servicios", amount: 228000, note: "Caja previsión", installments: 1, firstInstallmentMonth: "2026-08" },
    { id: "demo-p-2", date: "2026-08-10", owner: "Eze", category: "Servicios", amount: 130000, note: "Contadora", installments: 1, firstInstallmentMonth: "2026-08" },
    { id: "demo-p-3", date: "2026-08-03", owner: "Eze", category: "Otros", amount: 71850, note: "Consumos personales", installments: 1, firstInstallmentMonth: "2026-08" },
    { id: "demo-p-4", date: "2026-08-20", owner: "Eze", category: "Farmacia", amount: 12000, note: "Desodorante", installments: 1, firstInstallmentMonth: "2026-08" },
    { id: "demo-p-5", date: "2026-08-24", owner: "Eze", category: "Despensa", amount: 19000, note: "Compras personales", installments: 1, firstInstallmentMonth: "2026-08" },
    { id: "demo-p-6", date: "2026-08-31", owner: "Tami", category: "Libros", amount: 60000, note: "Libros", installments: 1, firstInstallmentMonth: "2026-08" },
  ],
};

let state = loadState();
let selectedMonth = availableMonths()[0] || "2026-08";
let activeView = "common";
let activeSection = "summary";
let movementSort = "date-desc";
let movementCategory = "";
let movementPerson = "";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const percent = (value) => Number.isFinite(value) ? `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%` : "Sin ingreso";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.data?.people?.length) return saved;
  } catch (_) {}
  return { data: structuredClone(demo), incomes: { Eze: 0, Tami: 0 } };
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function active(list) { return (list || []).filter((item) => !item.deletedAt && Number(item.amount) > 0); }
function monthIndex(key) { const [year, month] = key.split("-").map(Number); return year * 12 + month - 1; }
function monthLabel(key) { const [year, month] = key.split("-").map(Number); return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1)); }
function availableMonths() {
  const keys = new Set([...active(state.data.expenses), ...active(state.data.personalExpenses)].map((item) => item.date?.slice(0, 7)).filter(Boolean));
  return [...keys].sort().reverse();
}

function personalAmountInMonth(expense, key) {
  const installments = Math.max(1, Math.floor(Number(expense.installments) || 1));
  if (installments === 1) return expense.date?.startsWith(key) ? Number(expense.amount) : 0;
  const first = expense.firstInstallmentMonth || expense.date?.slice(0, 7);
  if (!first) return 0;
  const position = monthIndex(key) - monthIndex(first) + 1;
  return position >= 1 && position <= installments ? Number(expense.amount) / installments : 0;
}

function snapshot() {
  const people = state.data.people.slice(0, 2);
  const owner = people.includes(state.data.deviceOwner) ? state.data.deviceOwner : people[0];
  const common = active(state.data.expenses).filter((item) => item.date?.startsWith(selectedMonth));
  const commonTotal = common.reduce((sum, item) => sum + Number(item.amount), 0);
  const categoryMap = new Map();
  common.forEach((item) => categoryMap.set(item.category || "Sin categoría", (categoryMap.get(item.category || "Sin categoría") || 0) + Number(item.amount)));
  const categories = [...categoryMap].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  const personal = active(state.data.personalExpenses);
  const perPerson = Object.fromEntries(people.map((person) => {
    const items = personal.map((item) => ({ ...item, monthAmount: personalAmountInMonth(item, selectedMonth) })).filter((item) => item.owner === person && item.monthAmount > 0);
    return [person, { items, total: items.reduce((sum, item) => sum + item.monthAmount, 0) }];
  }));
  return { people, owner, commonTotal, categories, perPerson };
}

function render() {
  const data = snapshot();
  document.querySelector("#monthSelect").innerHTML = availableMonths().map((key) => `<option value="${key}" ${key === selectedMonth ? "selected" : ""}>${escapeHtml(monthLabel(key))}</option>`).join("");
  document.querySelector("#dataStatus").textContent = state.data.source === "demo" ? "Está mostrando una demostración basada en agosto de 2026." : "Está analizando el respaldo importado. Los datos quedan aislados de la app actual.";
  document.querySelector("#personalTabOwner").textContent = `· ${data.owner}`;
  document.querySelector("#privateOwner").textContent = data.owner;
  document.querySelector("#commonView").classList.toggle("is-hidden", activeView !== "common");
  document.querySelector("#personalView").classList.toggle("is-hidden", activeView !== "personal");
  document.querySelector("#commonTab").classList.toggle("is-active", activeView === "common");
  document.querySelector("#personalTab").classList.toggle("is-active", activeView === "personal");
  renderIncomes(data);
  renderHeadline(data);
  renderPersonalHeadline(data);
  renderCategories(data);
  renderPersonal(data);
  renderComparison(data);
  renderNavigation(data);
  renderEntryForm(data);
  renderMovements(data);
  renderInstallments(data);
  renderSettlements(data);
  document.querySelector("#settingsPeople").textContent = `${data.people.join(" y ")}. Este dispositivo pertenece a ${data.owner}.`;
}

function renderNavigation(data) {
  if ((activeSection === "installments" && activeView !== "personal") || (activeSection === "history" && activeView !== "common")) activeSection = "summary";
  document.querySelectorAll(".app-section").forEach((section) => section.classList.add("is-hidden"));
  const sectionId = activeSection === "summary" && activeView === "personal" ? "personalView" : `${activeSection}Section`;
  document.querySelector(`#${sectionId}`)?.classList.remove("is-hidden");
  document.querySelectorAll(".app-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === activeSection);
    button.classList.toggle("is-private", activeView === "personal");
  });
  document.querySelector("#installmentsTab").classList.toggle("is-hidden", activeView !== "personal");
  document.querySelector("#historyTab").classList.toggle("is-hidden", activeView !== "common");
}

function renderEntryForm({ people, owner }) {
  const personal = activeView === "personal";
  document.querySelector("#entryTitle").textContent = personal ? `Cargar gasto personal de ${owner}` : "Cargar gasto común";
  document.querySelector("#entryDescription").textContent = personal ? "Sólo afecta el ingreso y el resto del dueño." : "Se divide entre las personas del hogar.";
  document.querySelector(".entry-panel").classList.toggle("is-personal", personal);
  document.querySelector("#personField").firstChild.textContent = personal ? "Dueño" : "Pagó";
  document.querySelector("#expensePerson").innerHTML = (personal ? [owner] : people).map((person) => `<option>${escapeHtml(person)}</option>`).join("");
  const commonCategories = ["Supermercado", "Despensa", "Verduleria", "Carniceria", "Polleria/Pescaderia", "Fiambreria", "Dietetica", "Servicios", "Combustible", "Salud", "Mascotas", "Ocio", "Otros"];
  const personalCategories = ["Compras personales", "Cuotas", "Salud personal", "Gastos profesionales", "Impuestos y aportes", "Suscripciones", "Formación", "Regalos", "Ocio personal", "Otros"];
  document.querySelector("#expenseCategory").innerHTML = (personal ? personalCategories : commonCategories).map((category) => `<option>${escapeHtml(category)}</option>`).join("");
  document.querySelector("#cardOptions").classList.toggle("is-hidden", !personal);
  document.querySelector("#statementButton").classList.toggle("is-hidden", !personal);
  document.querySelector("#helperTitle").textContent = personal ? `Privado de ${owner}` : "Gasto del hogar";
  const illustration = document.querySelector("#helperIllustration");
  illustration.classList.toggle("personal-illustration", personal);
  illustration.innerHTML = personal ? `<strong>1</strong><span>solo dueño</span>` : `<strong>50%</strong><span>para cada persona</span>`;
  document.querySelector("#helperList").innerHTML = personal ? `<li>No aparece en cierres comunes.</li><li>Las cuotas impactan mes a mes.</li><li>Ingreso y resto quedan privados.</li>` : `<li>Forma parte de los cierres.</li><li>Aparece en el análisis por categoría.</li><li>No revela ingresos individuales.</li>`;
  if (!document.querySelector("#expenseDate").value) document.querySelector("#expenseDate").value = `${selectedMonth}-15`;
  if (!document.querySelector("#expenseFirstMonth").value) document.querySelector("#expenseFirstMonth").value = selectedMonth;
}

function renderIncomes({ owner }) {
  document.querySelector("#incomeFields").innerHTML = [owner].map((person) => `
    <div class="income-field">
      <label for="income-${escapeHtml(person)}">${escapeHtml(person)}<small>Ingreso disponible del mes</small></label>
      <div class="money-input"><span>$</span><input id="income-${escapeHtml(person)}" data-income="${escapeHtml(person)}" type="number" min="0" step="1000" value="${Number(state.incomes[person]) || ""}" placeholder="0" /></div>
    </div>`).join("");
  document.querySelectorAll("[data-income]").forEach((input) => input.addEventListener("input", () => {
    state.incomes[input.dataset.income] = Number(input.value) || 0; persist(); renderHeadline(snapshot()); renderPersonalHeadline(snapshot()); renderCategories(snapshot()); renderComparison(snapshot());
  }));
}

function renderHeadline(data) {
  const share = data.people.length ? data.commonTotal / data.people.length : 0;
  document.querySelector("#headlineCards").innerHTML = `
    <article class="metric-card primary"><span>Gasto común total</span><strong>${money.format(data.commonTotal)}</strong><small>${data.categories.length} categorías en ${escapeHtml(monthLabel(selectedMonth))}</small></article>
    <article class="metric-card"><span>Parte común por persona</span><strong>${money.format(share)}</strong><small>Reparto igualitario entre ${data.people.length} personas</small></article>
    <article class="metric-card"><span>Categoría principal</span><strong>${escapeHtml(data.categories[0]?.name || "Sin datos")}</strong><small>${data.categories[0] ? `${money.format(data.categories[0].amount)} · ${percent(data.categories[0].amount / data.commonTotal * 100)}` : "Sin movimientos"}</small></article>`;
}

function renderPersonalHeadline(data) {
  const owner = data.owner;
  const income = Number(state.incomes[owner]) || 0;
  const commonShare = data.people.length ? data.commonTotal / data.people.length : 0;
  const personal = data.perPerson[owner]?.total || 0;
  const remaining = income - commonShare - personal;
  document.querySelector("#personalHeadline").innerHTML = `
    <article class="metric-card primary"><span>Ingreso de ${escapeHtml(owner)}</span><strong>${income ? money.format(income) : "Sin cargar"}</strong><small>Dato privado de este dispositivo</small></article>
    <article class="metric-card"><span>Parte de gastos comunes</span><strong>${money.format(commonShare)}</strong><small>${percent(income ? commonShare / income * 100 : NaN)} del ingreso</small></article>
    <article class="metric-card"><span>Gastos personales del mes</span><strong>${money.format(personal)}</strong><small>${percent(income ? personal / income * 100 : NaN)} del ingreso</small></article>
    <article class="metric-card"><span>Resto estimado</span><strong>${income ? money.format(remaining) : "Sin calcular"}</strong><small>${income ? `${percent(remaining / income * 100)} del ingreso` : "Cargá tu ingreso"}</small></article>`;
}

function renderCategories(data) {
  const share = data.people.length ? 1 / data.people.length : 0;
  const max = data.categories[0]?.amount || 1;
  document.querySelector("#commonSubtitle").textContent = `Cada persona absorbe ${percent(share * 100)} del total común.`;
  document.querySelector("#categoryBars").innerHTML = data.categories.slice(0, 7).map((category) => `
    <div class="bar-line"><div class="bar-label"><span>${escapeHtml(category.name)}</span><span>${percent(category.amount / data.commonTotal * 100)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${category.amount / max * 100}%"></div></div></div>`).join("") || `<p class="empty">No hay gastos comunes en este mes.</p>`;
  document.querySelector("#categoryHead").innerHTML = `<tr><th>Categoría</th><th>Total</th><th>% del hogar</th><th>Parte por persona</th></tr>`;
  document.querySelector("#categoryTable").innerHTML = data.categories.map((category) => `<tr><td>${escapeHtml(category.name)}</td><td>${money.format(category.amount)}</td><td>${percent(category.amount / data.commonTotal * 100)}</td><td>${money.format(category.amount * share)}</td></tr>`).join("");
}

function renderPersonal({ owner, perPerson }) {
  document.querySelector("#personalColumns").innerHTML = [owner].map((person) => {
    const summary = perPerson[person];
    return `<article class="person-card"><div class="person-card-head"><div><h3>${escapeHtml(person)}</h3><span>Sólo movimientos personales</span></div><strong>${money.format(summary.total)}</strong></div><div class="person-card-body">${summary.items.length ? summary.items.sort((a, b) => b.monthAmount - a.monthAmount).slice(0, 8).map((item) => `<div class="personal-row"><div><strong>${escapeHtml(item.note || item.category || "Sin detalle")}</strong><span>${escapeHtml(item.category || "Sin categoría")}${Number(item.installments) > 1 ? ` · cuota de ${item.installments}` : ""}</span></div><strong>${money.format(item.monthAmount)}</strong></div>`).join("") : `<p class="empty">Sin gastos personales en el mes.</p>`}</div></article>`;
  }).join("");
}

function renderComparison({ people, owner, commonTotal, perPerson }) {
  const commonShare = people.length ? commonTotal / people.length : 0;
  document.querySelector("#comparisonRows").innerHTML = [owner].map((person) => {
    const income = Number(state.incomes[person]) || 0;
    const personal = perPerson[person]?.total || 0;
    const total = commonShare + personal;
    const scale = income || Math.max(...people.map((name) => commonShare + (perPerson[name]?.total || 0)), 1);
    const commonWidth = Math.min(100, commonShare / scale * 100);
    const personalWidth = Math.min(100 - commonWidth, personal / scale * 100);
    const remaining = income ? income - total : null;
    return `<div class="comparison-row"><h3>${escapeHtml(person)}</h3><div class="stack" aria-label="Comunes ${money.format(commonShare)}, personales ${money.format(personal)}"><div class="stack-common" style="width:${commonWidth}%"></div><div class="stack-personal" style="width:${personalWidth}%"></div></div><div class="impact-copy"><strong>${income ? `${percent(total / income * 100)} del ingreso` : money.format(total)}</strong><span>${income ? `Le quedarían ${money.format(remaining)}` : "Cargá el ingreso para comparar"}</span></div></div>`;
  }).join("") + `<div class="legend"><span><i style="background:var(--common)"></i>Gastos comunes</span><span><i style="background:var(--personal)"></i>Gastos personales</span></div>`;
}

function renderMovements(data) {
  const personal = activeView === "personal";
  const baseList = personal
    ? active(state.data.personalExpenses).filter((item) => item.owner === data.owner && item.date?.startsWith(selectedMonth))
    : active(state.data.expenses).filter((item) => item.date?.startsWith(selectedMonth));
  const categories = [...new Set(baseList.map((item) => item.category || "Sin categoría"))].sort((a, b) => a.localeCompare(b, "es"));
  const people = [...new Set(baseList.map((item) => personal ? item.owner : item.payer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  if (movementCategory && !categories.includes(movementCategory)) movementCategory = "";
  if (movementPerson && !people.includes(movementPerson)) movementPerson = "";
  const categorySelect = document.querySelector("#movementCategoryFilter");
  categorySelect.innerHTML = `<option value="">Todas</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  categorySelect.value = movementCategory;
  const personSelect = document.querySelector("#movementPersonFilter");
  personSelect.innerHTML = `<option value="">Todas</option>${people.map((person) => `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`).join("")}`;
  personSelect.value = movementPerson;
  document.querySelector("#movementPersonFilterWrap").classList.toggle("is-hidden", personal);
  document.querySelector("#movementSort").value = movementSort;
  const list = baseList.filter((item) => (!movementCategory || (item.category || "Sin categoría") === movementCategory) && (!movementPerson || (personal ? item.owner : item.payer) === movementPerson));
  const comparators = {
    "date-desc": (a, b) => b.date.localeCompare(a.date) || Number(b.amount) - Number(a.amount),
    "date-asc": (a, b) => a.date.localeCompare(b.date) || Number(a.amount) - Number(b.amount),
    "amount-desc": (a, b) => Number(b.amount) - Number(a.amount) || b.date.localeCompare(a.date),
    "amount-asc": (a, b) => Number(a.amount) - Number(b.amount) || a.date.localeCompare(b.date),
  };
  list.sort(comparators[movementSort] || comparators["date-desc"]);
  const total = list.reduce((sum, item) => sum + Number(item.amount), 0);
  document.querySelector("#movementsTitle").textContent = personal ? `Movimientos personales de ${data.owner}` : "Movimientos comunes";
  document.querySelector("#movementSummary").innerHTML = `<div><span>${movementCategory || movementPerson ? "Total filtrado" : "Total cargado"}</span><strong>${money.format(total)}</strong></div><div><span>Movimientos visibles</span><strong>${list.length} de ${baseList.length}</strong></div><div><span>Mes</span><strong>${escapeHtml(monthLabel(selectedMonth))}</strong></div>`;
  document.querySelector("#movementList").innerHTML = list.length ? list.slice(0, 50).map((item) => `
    <div class="movement-item"><span class="movement-date">${escapeHtml(item.date.slice(8, 10))}/${escapeHtml(item.date.slice(5, 7))}</span><div class="movement-main"><strong>${escapeHtml(item.note || item.category || "Sin detalle")}</strong><span>${escapeHtml(item.category || "Sin categoría")} · ${escapeHtml(personal ? item.owner : item.payer)} · ${escapeHtml(item.paymentMethod || "Sin especificar")}</span></div><span class="movement-amount">${money.format(Number(item.amount))}</span></div>`).join("") : `<p class="empty">No hay movimientos para este mes.</p>`;
}

function getInstallmentPlans(owner) {
  const current = monthIndex(selectedMonth);
  return active(state.data.personalExpenses).filter((item) => item.owner === owner && Number(item.installments) > 1).map((item) => {
    const count = Number(item.installments);
    const first = monthIndex(item.firstInstallmentMonth || item.date.slice(0, 7));
    const number = current - first + 1;
    return { ...item, count, number, monthly: Number(item.amount) / count, remaining: Math.max(0, count - number + 1) };
  }).filter((item) => item.number >= 1 && item.number <= item.count).sort((a, b) => b.monthly - a.monthly);
}

function renderInstallments({ owner }) {
  const plans = getInstallmentPlans(owner);
  const total = plans.reduce((sum, item) => sum + item.monthly, 0);
  const debt = plans.reduce((sum, item) => sum + item.monthly * item.remaining, 0);
  document.querySelector("#installmentsOwner").textContent = owner;
  document.querySelector("#installmentMetrics").innerHTML = `<article class="metric-card primary"><span>Cuotas de este mes</span><strong>${money.format(total)}</strong><small>${plans.length} compras activas</small></article><article class="metric-card"><span>Deuda pendiente</span><strong>${money.format(debt)}</strong><small>Incluye la cuota actual</small></article><article class="metric-card"><span>Tarjetas activas</span><strong>${new Set(plans.map((item) => item.card || "Sin tarjeta")).size}</strong><small>Sólo tarjetas de ${escapeHtml(owner)}</small></article>`;
  document.querySelector("#installmentList").innerHTML = plans.length ? plans.map((item) => `<div class="movement-item"><span class="movement-date">${item.number}/${item.count}</span><div class="movement-main"><strong>${escapeHtml(item.note || item.category)}</strong><span>${escapeHtml(item.card || "Tarjeta sin especificar")} · faltan ${item.remaining} cuotas</span><div class="installment-progress"><span style="width:${item.number / item.count * 100}%"></span></div></div><span class="movement-amount">${money.format(item.monthly)}<small>/mes</small></span></div>`).join("") : `<p class="empty">No hay compras en cuotas activas en este mes.</p>`;
}

function renderSettlements() {
  const settlements = active(state.data.settlements || []).sort((a, b) => String(b.settledAt).localeCompare(String(a.settledAt))).slice(0, 8);
  document.querySelector("#settlementList").innerHTML = settlements.length ? settlements.map((item) => {
    const stale = item.weekKey === "2026-08-17_2026-08-26";
    return `<div class="settlement-item${stale ? " is-stale" : ""}"><div><strong>${escapeHtml(item.weekLabel)}</strong><span>${stale ? "Cierre desactualizado · requiere ajuste" : `Saldado el ${escapeHtml(item.settledAt || "")}`}</span><span>${escapeHtml(item.debtor)} le pasa ${money.format(Number(item.amount))} a ${escapeHtml(item.creditor)}</span></div><div class="settlement-total"><strong>${money.format(Number(item.total))}</strong><span>Total del período</span></div></div>`;
  }).join("") : `<p class="empty">La demostración no contiene cierres. Importá un respaldo para verlos.</p>`;
}

function updateInstallmentPreview() {
  const amount = Number(document.querySelector("#expenseAmount").value) || 0;
  const count = Number(document.querySelector("#expenseInstallments").value) || 1;
  document.querySelector("#installmentPreview").textContent = amount ? `${count} cuotas de ${money.format(amount / count)} desde ${monthLabel(document.querySelector("#expenseFirstMonth").value || selectedMonth)}` : "Ingresá el importe para ver el valor de cada cuota.";
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#demoToast"); toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

document.querySelector("#monthSelect").addEventListener("change", (event) => { selectedMonth = event.target.value; render(); });
document.querySelector("#commonTab").addEventListener("click", () => { activeView = "common"; render(); });
document.querySelector("#personalTab").addEventListener("click", () => { activeView = "personal"; render(); });
document.querySelectorAll(".app-tab").forEach((button) => button.addEventListener("click", () => { activeSection = button.dataset.section; render(); }));
document.querySelector("#movementCategoryFilter").addEventListener("change", (event) => { movementCategory = event.target.value; renderMovements(snapshot()); });
document.querySelector("#movementPersonFilter").addEventListener("change", (event) => { movementPerson = event.target.value; renderMovements(snapshot()); });
document.querySelector("#movementSort").addEventListener("change", (event) => { movementSort = event.target.value; renderMovements(snapshot()); });
document.querySelector("#clearMovementFilters").addEventListener("click", () => { movementCategory = ""; movementPerson = ""; movementSort = "date-desc"; renderMovements(snapshot()); });
document.querySelector("#installmentToggle").addEventListener("change", (event) => { document.querySelector("#installmentFields").classList.toggle("is-hidden", !event.target.checked); updateInstallmentPreview(); });
document.querySelector("#expenseAmount").addEventListener("input", updateInstallmentPreview);
document.querySelector("#expenseInstallments").addEventListener("change", updateInstallmentPreview);
document.querySelector("#expenseFirstMonth").addEventListener("change", updateInstallmentPreview);
document.querySelectorAll("[data-demo-action]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.demoAction === "voice" ? "En la app final se abre el dictado por voz actual." : button.dataset.demoAction === "ticket" ? "En la app final se conserva la lectura de tickets actual." : "En la app final se conserva la lectura de resúmenes de tarjeta.")));
document.querySelector("#expenseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.querySelector("#expenseAmount").value);
  const date = document.querySelector("#expenseDate").value;
  const base = { id: `prototype-${Date.now()}`, amount, date, category: document.querySelector("#expenseCategory").value, paymentMethod: document.querySelector("#expenseMethod").value, note: document.querySelector("#expenseNote").value, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null };
  if (activeView === "personal") {
    const installment = document.querySelector("#installmentToggle").checked;
    state.data.personalExpenses.push({ ...base, owner: snapshot().owner, installments: installment ? Number(document.querySelector("#expenseInstallments").value) : 1, firstInstallmentMonth: installment ? document.querySelector("#expenseFirstMonth").value : date.slice(0, 7), card: installment ? document.querySelector("#expenseCard").value : "" });
  } else state.data.expenses.push({ ...base, payer: document.querySelector("#expensePerson").value });
  persist(); event.target.reset(); document.querySelector("#installmentFields").classList.add("is-hidden"); showToast("Gasto guardado solamente en la prueba."); render();
});
document.querySelector("#backupInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const data = parsed.data || parsed;
    if (!Array.isArray(data.people) || !Array.isArray(data.expenses) || !Array.isArray(data.personalExpenses)) throw new Error("Formato no reconocido");
    state.data = { ...data, source: "backup" };
    state.incomes = Object.fromEntries(data.people.slice(0, 2).map((person) => [person, Number(state.incomes[person]) || 0]));
    selectedMonth = availableMonths()[0] || selectedMonth; persist(); render();
  } catch (error) { alert(`No se pudo leer el respaldo: ${error.message}`); }
  event.target.value = "";
});
document.querySelector("#resetButton").addEventListener("click", () => {
  state = { data: structuredClone(demo), incomes: { Eze: 0, Tami: 0 } }; selectedMonth = "2026-08"; activeView = "common"; activeSection = "summary"; persist(); render();
});

render();
