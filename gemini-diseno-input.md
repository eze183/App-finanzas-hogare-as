# Pedido para Gemini: propuesta de diseño estetico

Quiero mejorar el diseño estetico de esta app web local de finanzas hogareñas. Es una app para cargar gastos comunes, gastos personales, leer tickets/resumenes de tarjeta, ver cierre semanal 50/50, presupuestos, recurrentes, tablas y resumen mensual.

Necesito que me propongas un rediseño visual mas ordenado, moderno y facil de usar, sin cambiar la logica de JavaScript. Trabaja principalmente sobre estructura HTML semantica si hace falta y CSS. Priorizá:

- Mejor jerarquia visual.
- Menos sensacion de desorden.
- Secciones mas claras.
- Buen diseño mobile.
- Formularios y tablas mas faciles de leer.
- Estilo de dashboard hogareño/finanzas, sobrio pero agradable.
- Evitar una landing page; tiene que seguir siendo una herramienta usable desde el primer pantallazo.
- No quitar ids existentes porque el JavaScript depende de ellos.
- Mantener compatibilidad con app local abierta desde index.html.

Devolveme una propuesta concreta con HTML/CSS actualizado o instrucciones de cambios por archivo.

---

## index.html actual

``html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gastos del hogar</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="app-shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Cierre semanal compartido</p>
          <h1>Gastos del hogar</h1>
          <p class="subtitle">
            Registren lo que paga cada persona y vean al instante cómo queda el
            reparto para que ambos aporten lo mismo.
          </p>
        </div>
        <div class="week-card" aria-label="Semana seleccionada">
          <label for="weekStart">Semana desde</label>
          <input id="weekStart" type="date" />
          <button id="currentWeekButton" type="button">Semana actual</button>
        </div>
      </section>

      <section class="panel data-panel" aria-label="Respaldo de datos">
        <div class="panel-heading">
          <div>
            <h2>Datos y respaldo</h2>
            <p>Guardá una copia para mover tus gastos entre computadoras o restaurarlos cuando haga falta.</p>
          </div>
          <div class="table-actions">
            <button id="exportBackupButton" type="button">Exportar backup</button>
            <label class="file-picker secondary">
              Importar backup
              <input id="importBackupInput" type="file" accept="application/json,.json" />
            </label>
          </div>
        </div>
        <p id="backupStatus" class="inline-status" aria-live="polite"></p>
      </section>

      <section class="summary-grid" aria-label="Resumen semanal">
        <article class="summary-card">
          <span>Total semanal</span>
          <strong id="totalAmount">$0</strong>
        </article>
        <article class="summary-card">
          <span id="personANameSummary">Persona 1 pagó</span>
          <strong id="personATotal">$0</strong>
        </article>
        <article class="summary-card">
          <span id="personBNameSummary">Persona 2 pagó</span>
          <strong id="personBTotal">$0</strong>
        </article>
        <article class="summary-card highlight">
          <span>Para emparejar</span>
          <strong id="settlementText">Sin gastos esta semana</strong>
        </article>
      </section>

      <section class="detail-grid" aria-label="Detalle de cierre">
        <article class="panel settlement-detail">
          <div class="panel-heading">
            <div>
              <h2>Detalle del cierre</h2>
              <p id="settlementDetailIntro"></p>
            </div>
          </div>
          <div id="settlementBreakdown" class="breakdown-grid"></div>
        </article>

        <article class="panel monthly-panel">
          <div class="panel-heading">
            <div>
              <h2>Vista mensual</h2>
              <p id="monthRangeLabel"></p>
            </div>
          </div>
          <div id="monthlySummary" class="monthly-summary"></div>
        </article>
      </section>

      <section class="panel chart-panel" aria-label="Gráfico de gastos por categoría">
        <div class="panel-heading chart-heading">
          <div>
            <h2>Gastos por categoría</h2>
            <p>Visualizá cómo se reparte el total semanal.</p>
          </div>
          <div class="chart-toggle" role="group" aria-label="Tipo de gráfico">
            <button id="barChartButton" class="is-active" type="button">Barras</button>
            <button id="pieChartButton" type="button">Torta</button>
          </div>
        </div>
        <div class="chart-layout">
          <canvas id="categoryChart" width="720" height="320" aria-label="Gráfico de gastos por categoría"></canvas>
          <div id="chartLegend" class="chart-legend"></div>
        </div>
      </section>

      <section class="workspace">
        <aside class="panel settings-panel">
          <h2>Personas</h2>
          <form id="peopleForm" class="stacked-form">
            <label>
              Persona 1
              <input id="personAInput" type="text" maxlength="30" required />
            </label>
            <label>
              Persona 2
              <input id="personBInput" type="text" maxlength="30" required />
            </label>
            <button type="submit">Guardar nombres</button>
          </form>

          <div class="category-summary budget-panel">
            <h2>Presupuestos</h2>
            <form id="budgetForm" class="stacked-form">
              <label>
                Categoría
                <select id="budgetCategory">
                  <option value="Comida">Comida</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>
                Límite semanal
                <input id="budgetAmount" type="text" inputmode="decimal" placeholder="0,00" />
              </label>
              <button type="submit">Guardar presupuesto</button>
            </form>
            <div id="budgetList" class="budget-list"></div>
          </div>

          <div class="category-summary">
            <h2>Por categoría</h2>
            <div id="categoryList" class="category-list"></div>
          </div>
        </aside>

        <section class="panel expense-panel">
          <div class="panel-heading">
            <div>
              <h2>Agregar gasto</h2>
              <p>Cargá gastos comunes para el reparto o personales para tu control.</p>
            </div>
          </div>

          <div class="receipt-reader" aria-label="Cargar comprobante o resumen">
            <div>
              <h3>Desde archivo</h3>
              <p>Subí un ticket, factura o resumen de tarjeta. La app detecta el tipo y te deja revisar antes de guardar.</p>
            </div>
            <div class="receipt-controls">
              <label class="file-picker">
                Elegir archivo
                <input id="documentFile" type="file" accept="image/*,application/pdf,text/plain,.txt,.csv" />
              </label>
            </div>
            <div id="receiptPreviewWrap" class="receipt-preview-wrap is-hidden">
              <img id="receiptPreview" alt="Vista previa del ticket cargado" />
            </div>
            <p id="receiptStatus" class="receipt-status" aria-live="polite"></p>
            <div id="statementReview" class="statement-review is-hidden"></div>
          </div>

          <div class="entry-tabs" role="tablist" aria-label="Tipo de gasto">
            <button id="commonTabButton" class="is-active" type="button">Comunes</button>
            <button id="personalTabButton" type="button">Personales</button>
          </div>

          <section id="commonExpenseSection" class="expense-mode-panel">
            <form id="expenseForm" class="expense-form">
              <label>
                Fecha
                <input id="expenseDate" type="date" required />
              </label>
              <label>
                Pagó
                <select id="expensePayer" required></select>
              </label>
              <label>
                Categoría
                <select id="expenseCategory" required>
                  <option value="Comida">Comida</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>
                Monto
                <input id="expenseAmount" type="text" inputmode="decimal" placeholder="0,00" required />
              </label>
              <label>
                Forma de pago
                <select id="expensePaymentMethod">
                  <option value="">Sin especificar</option>
                  <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                  <option value="Tarjeta de débito">Tarjeta de débito</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </label>
              <label class="wide">
                Descripción
                <input id="expenseNote" type="text" maxlength="80" placeholder="Ej: compra supermercado" />
              </label>
              <button type="submit">Agregar gasto</button>
            </form>
          </section>

          <section id="personalExpenseSection" class="expense-mode-panel is-hidden">
            <form id="personalExpenseForm" class="expense-form">
              <label>
                Fecha
                <input id="personalExpenseDate" type="date" required />
              </label>
              <label>
                Persona
                <input id="personalExpenseOwner" type="text" maxlength="50" required />
              </label>
              <label>
                Categoría
                <select id="personalExpenseCategory" required>
                  <option value="Comida">Comida</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Salud">Salud</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Ocio">Ocio</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>
                Monto
                <input id="personalExpenseAmount" type="text" inputmode="decimal" placeholder="0,00" required />
              </label>
              <label>
                Forma de pago
                <select id="personalExpensePaymentMethod">
                  <option value="">Sin especificar</option>
                  <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                  <option value="Tarjeta de débito">Tarjeta de débito</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </label>
              <label class="wide">
                Descripción
                <input id="personalExpenseNote" type="text" maxlength="100" placeholder="Ej: compra personal" />
              </label>
              <button type="submit">Agregar personal</button>
            </form>
          </section>

          <div class="recurring-block">
            <div class="panel-heading">
              <div>
                <h3>Gastos recurrentes</h3>
                <p>Guardá alquiler, servicios u otros gastos que se repiten.</p>
              </div>
            </div>
            <form id="recurringForm" class="expense-form compact-form">
              <label>
                Descripción
                <input id="recurringNote" type="text" maxlength="80" placeholder="Ej: internet" required />
              </label>
              <label>
                Pagó
                <select id="recurringPayer" required></select>
              </label>
              <label>
                Categoría
                <select id="recurringCategory" required>
                  <option value="Comida">Comida</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>
              <label>
                Monto
                <input id="recurringAmount" type="text" inputmode="decimal" placeholder="0,00" required />
              </label>
              <label>
                Frecuencia
                <select id="recurringFrequency">
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </label>
              <button type="submit">Guardar recurrente</button>
            </form>
            <div id="recurringList" class="recurring-list"></div>
          </div>
        </section>
      </section>

      <section class="panel table-panel">
        <div class="panel-heading table-heading">
          <div>
            <h2>Gastos de la semana</h2>
            <p id="weekRangeLabel"></p>
          </div>
          <div class="table-actions">
            <button id="exportButton" type="button">Exportar</button>
            <button id="applyRecurringButton" type="button">Aplicar recurrentes</button>
            <button id="settleWeekButton" type="button">Marcar saldada</button>
            <button id="clearWeekButton" class="danger" type="button">Borrar semana</button>
          </div>
        </div>

        <form id="filterForm" class="filter-bar">
          <label>
            Buscar
            <input id="searchInput" type="search" placeholder="Descripción o texto" />
          </label>
          <label>
            Persona
            <select id="filterPayer"></select>
          </label>
          <label>
            Categoría
            <select id="filterCategory">
              <option value="">Todas</option>
              <option value="Comida">Comida</option>
              <option value="Servicios">Servicios</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Alquiler">Alquiler</option>
              <option value="Transporte">Transporte</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
          <label>
            Forma de pago
            <select id="filterPaymentMethod">
              <option value="">Todas</option>
              <option value="Tarjeta de crédito">Tarjeta de crédito</option>
              <option value="Tarjeta de débito">Tarjeta de débito</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Sin especificar">Sin especificar</option>
            </select>
          </label>
          <button id="clearFiltersButton" class="secondary-button" type="button">Limpiar filtros</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pagó</th>
                <th>Categoría</th>
                <th>Forma de pago</th>
                <th>Descripción</th>
                <th class="amount-cell">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="expensesTable"></tbody>
          </table>
          <p id="emptyState" class="empty-state">Todavía no hay gastos cargados para esta semana.</p>
        </div>
      </section>

      <section class="panel table-panel">
        <div class="panel-heading table-heading">
          <div>
            <h2>Gastos personales de la semana</h2>
            <p id="personalWeekLabel"></p>
          </div>
          <div class="personal-total">
            <span>Total personal</span>
            <strong id="personalWeekTotal">$0</strong>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Persona</th>
                <th>Categoría</th>
                <th>Forma de pago</th>
                <th>Descripción</th>
                <th class="amount-cell">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="personalExpensesTable"></tbody>
          </table>
          <p id="personalEmptyState" class="empty-state">Todavía no hay gastos personales para esta semana.</p>
        </div>
      </section>

      <section class="panel history-panel">
        <div class="panel-heading">
          <div>
            <h2>Historial de cuentas saldadas</h2>
            <p>Registro de las semanas que ya cerraron entre ustedes.</p>
          </div>
        </div>
        <div id="settlementHistory" class="history-list"></div>
      </section>
    </main>

    <script type="module">
      import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
      window.pdfjsLib = pdfjsLib;
    </script>
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
    <script src="./app.js"></script>
  </body>
</html>

``

---

## styles.css actual

``css
:root {
  --bg: #f3f5f3;
  --surface: #ffffff;
  --surface-soft: #eef2f0;
  --surface-tint: #f8faf9;
  --ink: #16201c;
  --muted: #66736e;
  --line: #d9e0dc;
  --accent: #28745f;
  --accent-strong: #174d40;
  --accent-soft: #dcefe7;
  --blue: #385f8d;
  --blue-soft: #e4ecf6;
  --amber: #a86522;
  --amber-soft: #f4eadc;
  --danger: #a63b3b;
  --shadow: 0 14px 34px rgba(25, 43, 35, 0.08);
  --shadow-soft: 0 8px 20px rgba(25, 43, 35, 0.05);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--bg);
  color: var(--ink);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0) 280px),
    repeating-linear-gradient(90deg, rgba(22, 32, 28, 0.025) 0 1px, transparent 1px 72px);
}

button,
input,
select {
  font: inherit;
}

button {
  border: 0;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  min-height: 40px;
  padding: 0 16px;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

button:hover {
  background: var(--accent-strong);
}

button:active {
  transform: translateY(1px);
}

button.danger {
  background: #fff;
  border: 1px solid #e7c9c9;
  color: var(--danger);
}

button.danger:hover {
  background: #fff1f1;
}

button.secondary-button,
.file-picker.secondary {
  background: #fff;
  border: 1px solid var(--line);
  color: var(--accent-strong);
}

button.secondary-button:hover,
.file-picker.secondary:hover {
  background: var(--surface-soft);
}

input,
select {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: var(--ink);
  padding: 0 12px;
}

input:focus,
select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(44, 111, 90, 0.13);
  outline: 0;
}

.app-shell {
  position: relative;
  width: min(1240px, calc(100% - 32px));
  margin: 0 auto;
  padding: 22px 0 32px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  align-items: center;
  padding: 10px 0 18px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--blue);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1;
  letter-spacing: 0;
}

h2 {
  margin-bottom: 10px;
  font-size: 1.05rem;
  letter-spacing: 0;
}

.subtitle {
  max-width: 620px;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.45;
  margin-bottom: 0;
}

.week-card,
.panel,
.summary-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.week-card {
  display: grid;
  gap: 9px;
  padding: 14px;
  box-shadow: var(--shadow-soft);
}

.data-panel {
  background: var(--surface-tint);
  margin-bottom: 18px;
  box-shadow: var(--shadow-soft);
}

.data-panel .panel-heading {
  margin-bottom: 0;
}

.inline-status {
  min-height: 22px;
  color: var(--muted);
  font-weight: 700;
  margin: 0;
}

.inline-status.success {
  color: var(--accent-strong);
}

.inline-status.error {
  color: var(--danger);
}

label {
  display: grid;
  gap: 7px;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr 1.25fr;
  gap: 12px;
  margin-bottom: 18px;
}

.summary-card {
  min-height: 108px;
  padding: 16px;
  box-shadow: var(--shadow-soft);
}

.summary-card span {
  display: block;
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.summary-card strong {
  display: block;
  font-size: clamp(1.4rem, 3vw, 2rem);
  line-height: 1.1;
}

.summary-card.highlight {
  background: var(--blue-soft);
  border-color: #cbd9ea;
}

.summary-card.highlight strong {
  color: var(--blue);
  font-size: clamp(1.05rem, 2.2vw, 1.55rem);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 18px;
  margin-bottom: 18px;
}

.breakdown-grid,
.monthly-summary {
  display: grid;
  gap: 10px;
}

.breakdown-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.breakdown-item,
.metric-row {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  padding: 11px 12px;
}

.breakdown-item.wide {
  grid-column: 1 / -1;
  background: var(--accent-soft);
  border-color: #c4dfd1;
}

.breakdown-item span,
.metric-row span {
  display: block;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.breakdown-item strong,
.metric-row strong {
  display: block;
  font-size: 1rem;
  line-height: 1.25;
}

.workspace {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

.panel {
  padding: 18px;
}

.chart-panel {
  margin-bottom: 18px;
}

.settings-panel {
  align-self: start;
  position: sticky;
  top: 12px;
  box-shadow: var(--shadow-soft);
}

.chart-heading {
  align-items: center;
}

.chart-toggle {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-soft);
  padding: 4px;
}

.chart-toggle button {
  min-height: 36px;
  background: transparent;
  color: var(--muted);
  padding: 0 14px;
}

.chart-toggle button.is-active,
.chart-toggle button:hover {
  background: var(--accent);
  color: #fff;
}

.chart-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 18px;
  align-items: center;
}

#categoryChart {
  width: 100%;
  height: 250px;
  min-height: 250px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
}

.chart-legend {
  display: grid;
  gap: 10px;
}

.legend-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  color: var(--muted);
  font-size: 0.9rem;
}

.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.legend-row span:nth-child(2) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-row strong {
  color: var(--ink);
  font-size: 0.9rem;
  white-space: nowrap;
}

.stacked-form {
  display: grid;
  gap: 12px;
}

.category-summary {
  margin-top: 28px;
}

.budget-panel {
  border-top: 1px solid var(--line);
  padding-top: 24px;
}

.category-list {
  display: grid;
  gap: 8px;
}

.category-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  border-radius: 7px;
  background: var(--surface-soft);
  padding: 10px 12px;
}

.category-row span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-row strong {
  font-size: 0.95rem;
}

.budget-list,
.recurring-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.budget-row,
.recurring-item {
  display: grid;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  padding: 12px;
}

.budget-row strong,
.recurring-item strong {
  display: block;
}

.budget-row span,
.recurring-item span {
  color: var(--muted);
  font-size: 0.86rem;
}

.budget-row.is-over {
  border-color: #e7c9c9;
  background: #fff8f8;
}

.budget-progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-soft);
}

.budget-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.budget-row.is-over .budget-progress span {
  background: var(--danger);
}

.recurring-item {
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-heading p {
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.expense-form {
  display: grid;
  grid-template-columns: repeat(5, minmax(118px, 1fr));
  gap: 12px;
  align-items: end;
}

.receipt-reader {
  display: grid;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-tint);
  margin-bottom: 18px;
  padding: 14px;
}

.receipt-reader h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.receipt-reader p {
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.receipt-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.file-picker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-weight: 800;
  padding: 0 16px;
}

.file-picker:hover {
  background: var(--accent-strong);
}

.file-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.receipt-preview-wrap {
  max-width: 280px;
  border: 1px solid var(--line);
  border-radius: 7px;
  overflow: hidden;
  background: #fff;
}

.receipt-preview-wrap img {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.receipt-status {
  min-height: 22px;
  color: var(--muted);
  font-weight: 700;
}

.receipt-status.success {
  color: var(--accent-strong);
}

.receipt-status.error {
  color: var(--danger);
}

.entry-tabs {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-soft);
  margin-bottom: 16px;
  padding: 4px;
}

.entry-tabs button {
  min-height: 36px;
  background: transparent;
  color: var(--muted);
  padding: 0 14px;
}

.entry-tabs button.is-active,
.entry-tabs button:hover {
  background: var(--accent);
  color: #fff;
}

.expense-mode-panel {
  display: block;
}

.statement-review {
  display: grid;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  padding: 14px;
}

.statement-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.statement-heading span {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.statement-note {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  margin: 0;
}

.statement-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
}

.statement-rate {
  max-width: 240px;
}

.statement-group {
  display: grid;
  gap: 8px;
}

.statement-group-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 0.86rem;
}

.statement-group-title strong {
  color: var(--ink);
}

.statement-item {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  color: var(--ink);
  padding: 10px;
}

.statement-item.is-personal {
  background: #fffdfa;
}

.statement-item input {
  width: 18px;
  min-height: 18px;
}

.statement-item strong,
.statement-item small {
  display: block;
}

.statement-item small {
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
  margin-top: 3px;
}

.statement-item b {
  white-space: nowrap;
}

.statement-import-total {
  display: grid;
  gap: 3px;
  border: 1px solid #c4dfd1;
  border-radius: 7px;
  background: var(--accent-soft);
  padding: 10px 12px;
}

.statement-import-total span,
.statement-import-total small {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.statement-import-total strong {
  color: var(--accent-strong);
  font-size: 1.08rem;
}

.personal-total {
  display: grid;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  padding: 10px 12px;
  min-width: 180px;
}

.personal-total span {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.personal-total strong {
  color: var(--accent-strong);
}

.expense-form .wide {
  grid-column: span 4;
}

.recurring-block {
  border-top: 1px solid var(--line);
  margin-top: 20px;
  padding-top: 20px;
}

.recurring-block h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.compact-form {
  grid-template-columns: repeat(5, minmax(120px, 1fr));
}

.table-heading {
  align-items: center;
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) repeat(3, minmax(150px, 1fr)) auto;
  gap: 12px;
  align-items: end;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  margin-bottom: 16px;
  padding: 12px;
}

.table-wrap {
  position: relative;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

th,
td {
  border-bottom: 1px solid var(--line);
  padding: 11px 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  background: var(--surface-tint);
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

td {
  font-size: 0.95rem;
}

.amount-cell {
  text-align: right;
  white-space: nowrap;
}

.delete-row {
  min-height: 36px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--line);
  color: var(--danger);
}

.delete-row:hover {
  background: #fff1f1;
}

.empty-state {
  color: var(--muted);
  margin: 18px 0 0;
  text-align: center;
}

.history-panel {
  margin-top: 18px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fbfcfa;
  padding: 14px;
}

.history-item strong {
  display: block;
  margin-bottom: 4px;
}

.history-item span {
  color: var(--muted);
  font-size: 0.9rem;
}

.history-item .history-total {
  color: var(--accent-strong);
  font-weight: 800;
  white-space: nowrap;
}

.is-hidden {
  display: none;
}

@media (max-width: 900px) {
  .hero,
  .workspace,
  .summary-grid,
  .detail-grid,
  .chart-layout {
    grid-template-columns: 1fr;
  }

  .expense-form,
  .compact-form,
  .filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .expense-form .wide {
    grid-column: span 2;
  }

  .filter-bar button {
    grid-column: 1 / -1;
  }
}

@media (max-width: 580px) {
  .app-shell {
    width: min(100% - 20px, 1180px);
    padding: 16px 0 24px;
  }

  .panel-heading,
  .table-heading,
  .chart-heading {
    display: grid;
  }

  .chart-toggle {
    width: 100%;
  }

  .expense-form {
    grid-template-columns: 1fr;
  }

  .expense-form .wide,
  .filter-bar button {
    grid-column: auto;
  }

  .breakdown-grid,
  .filter-bar,
  .compact-form {
    grid-template-columns: 1fr;
  }

  .table-actions {
    justify-content: stretch;
  }

  .table-actions button {
    flex: 1 1 150px;
  }

  .table-wrap {
    overflow: visible;
    border: 0;
    background: transparent;
  }

  table {
    min-width: 0;
  }

  thead {
    display: none;
  }

  tbody {
    display: grid;
    gap: 10px;
  }

  tr {
    display: grid;
    gap: 8px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    padding: 12px;
    box-shadow: var(--shadow-soft);
  }

  td {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 10px;
    border-bottom: 0;
    padding: 0;
    font-size: 0.92rem;
  }

  td::before {
    color: var(--muted);
    content: "";
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  td:nth-child(1)::before {
    content: "Fecha";
  }

  td:nth-child(2)::before {
    content: "Persona";
  }

  td:nth-child(3)::before {
    content: "Categoría";
  }

  td:nth-child(4)::before {
    content: "Pago";
  }

  td:nth-child(5)::before {
    content: "Descripción";
  }

  td:nth-child(6)::before {
    content: "Monto";
  }

  td.amount-cell {
    text-align: left;
  }

  td:last-child {
    display: block;
  }

  td:last-child .delete-row {
    width: 100%;
  }

  .receipt-controls {
    display: grid;
  }

  .history-item {
    grid-template-columns: 1fr;
  }

  .statement-heading,
  .statement-item {
    display: grid;
    grid-template-columns: 1fr;
  }

  .statement-item input {
    justify-self: start;
  }

  .recurring-item {
    grid-template-columns: 1fr;
  }
}

``
