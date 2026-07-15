async function renderRelatorios() {
  const page = document.getElementById('page-relatorios');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header">
      <div><span class="page-eyebrow">Indicadores</span><h1>Relatórios</h1></div>
    </div>

    <!-- Faturamento Mensal -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <span>${uiIcon('finance')} Faturamento mensal</span>
        <select id="rel-fat-meses" onchange="_relCarregarFaturamento()" style="padding:4px 8px;border-radius:var(--radius);border:1px solid var(--border)">
          <option value="6">Últimos 6 meses</option>
          <option value="12" selected>Últimos 12 meses</option>
          <option value="24">Últimos 24 meses</option>
        </select>
      </div>
      <div class="card-body" id="rel-fat-body" style="min-height:200px">
        <div class="empty-state"><p>Carregando faturamento...</p></div>
      </div>
    </div>

    <!-- Clientes Frequentes -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <span>${uiIcon('clients')} Clientes mais frequentes</span>
        <select id="rel-cli-limite" onchange="_relCarregarClientes()" style="padding:4px 8px;border-radius:var(--radius);border:1px solid var(--border)">
          <option value="5">Top 5</option>
          <option value="10" selected>Top 10</option>
          <option value="20">Top 20</option>
        </select>
      </div>
      <div class="card-body" id="rel-cli-body" style="min-height:200px">
        <div class="empty-state"><p>Carregando clientes...</p></div>
      </div>
    </div>
  `;

  await Promise.all([_relCarregarFaturamento(), _relCarregarClientes()]);
}

async function _relCarregarFaturamento() {
  const meses = document.getElementById('rel-fat-meses')?.value || 12;
  const body = document.getElementById('rel-fat-body');
  if (!body) return;

  try {
    const dados = await window.api.relatorios.faturamentoMensal(meses);
    if (!dados || dados.length === 0) {
      body.innerHTML = `<div class="empty-state modern-empty">${uiIcon('finance')}<p>Sem dados de faturamento.</p></div>`;
      return;
    }

    const maxVal = Math.max(...dados.map(d => Number(d.faturado || 0)));

    body.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:6px;height:200px;padding:16px 0">
        ${dados.map(d => {
          const total = Number(d.faturado || 0);
          const pct = maxVal > 0 ? Math.max((total / maxVal) * 100, 4) : 4;
          const mesLabel = d.mes.slice(5);
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
              <span style="font-size:10px;font-weight:600;color:var(--success)">${fmtMoeda(total)}</span>
              <div style="width:100%;max-width:48px;height:${pct}%;background:linear-gradient(to top, var(--rosa-botao), var(--rosa-hover));border-radius:4px 4px 0 0;min-height:4px;transition:height 0.5s"></div>
              <span style="font-size:10px;color:var(--text-muted)">${mesLabel}</span>
            </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border);margin-top:8px">
        <span style="font-size:12px;color:var(--text-muted)">Total no período:</span>
        <strong style="color:var(--success)">${fmtMoeda(dados.reduce((s, d) => s + Number(d.faturado || 0), 0))}</strong>
      </div>
    `;
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><p>Erro ao carregar: ${escapeHtml(e.message)}</p></div>`;
  }
}

async function _relCarregarClientes() {
  const limite = document.getElementById('rel-cli-limite')?.value || 10;
  const body = document.getElementById('rel-cli-body');
  if (!body) return;

  try {
    const dados = await window.api.relatorios.clientesFrequentes(limite);
    if (!dados || dados.length === 0) {
      body.innerHTML = `<div class="empty-state modern-empty">${uiIcon('clients')}<p>Sem dados de clientes.</p></div>`;
      return;
    }

    const maxTotal = Number(dados[0]?.total_agendamentos || 1);

    body.innerHTML = `
      <table style="width:100%">
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>Cliente</th>
            <th style="width:100px;text-align:center">Agendamentos</th>
            <th style="width:120px;text-align:right">Total Gasto</th>
            <th style="width:200px">Frequência</th>
          </tr>
        </thead>
        <tbody>
          ${dados.map((c, i) => {
            const totalAgendamentos = Number(c.total_agendamentos || 0);
            const pct = Math.round((totalAgendamentos / maxTotal) * 100);
            const medal = String(i + 1).padStart(2, '0');
            return `
            <tr>
              <td style="font-size:16px;text-align:center">${medal}</td>
              <td><strong>${escapeHtml(c.nome)}</strong></td>
              <td style="text-align:center;font-weight:600">${totalAgendamentos}</td>
              <td style="text-align:right;color:var(--success);font-weight:600">${fmtMoeda(c.total_gasto)}</td>
              <td>
                <div style="background:var(--surface-2);border-radius:4px;height:8px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:var(--rosa-botao);border-radius:4px;transition:width 0.5s"></div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    body.innerHTML = `<div class="empty-state"><p>Erro ao carregar: ${escapeHtml(e.message)}</p></div>`;
  }
}
