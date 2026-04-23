async function renderFinanceiro() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const ultimoDia  = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const page = document.getElementById('page-financeiro');
  page.innerHTML = `
    <div class="page-header">
      <h1>💰 Financeiro</h1>
    </div>
    <div class="search-bar" style="align-items:center;gap:12px;flex-wrap:wrap">
      <label style="font-size:12px;color:var(--text-muted)">Período:</label>
      <input type="date" id="fin-inicio" value="${primeiroDia}" onchange="atualizarFinanceiro()"/>
      <span style="color:var(--text-muted)">até</span>
      <input type="date" id="fin-fim" value="${ultimoDia}" onchange="atualizarFinanceiro()"/>
      <button class="btn btn-secondary btn-sm" onclick="finMesAtual()">Este mês</button>
      <button class="btn btn-secondary btn-sm" onclick="finHoje()">Hoje</button>
    </div>

    <!-- KPIs -->
    <div id="fin-kpis" class="kpi-grid"></div>

    <!-- Tabela detalhada -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)">
        <h3 style="font-size:14px;font-weight:600">Detalhamento</h3>
        <button class="btn btn-secondary btn-sm" onclick="exportarFinanceiro()">⬇️ Exportar CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Cliente</th>
            <th>Procedimento</th>
            <th>Promoção</th>
            <th>Status</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody id="fin-tbody">
          <tr><td colspan="6"><div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  await atualizarFinanceiro();
}

async function atualizarFinanceiro() {
  const inicio = document.getElementById('fin-inicio')?.value;
  const fim    = document.getElementById('fin-fim')?.value;
  if (!inicio || !fim) return;

  try {
    const [resumo, detalhado] = await Promise.all([
      window.api.financeiro.resumo({ inicio, fim }),
      window.api.financeiro.detalhado({ inicio, fim }),
    ]);

    // ── KPIs ──────────────────────────────────────────────
    const kpisEl = document.getElementById('fin-kpis');
    if (kpisEl) {
      const recebido   = parseFloat(resumo?.recebido  || 0);
      const aReceber   = parseFloat(resumo?.a_receber || 0);
      const totalAg    = parseInt(resumo?.total_agendamentos || 0);
      const cancelados = parseInt(resumo?.cancelados   || 0);

      kpisEl.innerHTML = `
        ${kpiCard('✅ Recebido',       fmtMoeda(recebido),       'var(--success)')}
        ${kpiCard('🕐 A Receber',      fmtMoeda(aReceber),       'var(--rosa-botao)')}
        ${kpiCard('📋 Agendamentos',   totalAg,                  'var(--info)')}
        ${kpiCard('❌ Cancelamentos',  cancelados,               'var(--danger)')}
      `;
    }

    // ── Tabela ────────────────────────────────────────────
    const tbody = document.getElementById('fin-tbody');
    if (!tbody) return;

    if (!detalhado || detalhado.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <div class="icon">💰</div>
          <p>Nenhum agendamento no período.</p>
        </div>
      </td></tr>`;
      return;
    }

    const STATUS_LABEL = {
      agendado:  '🕐 Agendado',
      concluido: '✅ Concluído',
      cancelado: '❌ Cancelado',
    };

    tbody.innerHTML = detalhado.map(ag => {
      const promoCell = ag.promocao
        ? `<span style="font-size:11px;background:#e8f5e9;color:var(--success);padding:2px 6px;border-radius:20px">
             🏷️ ${ag.promocao.promocao_nome} (−${fmtMoeda(ag.promocao.desconto_aplicado)})
           </span>`
        : `<span style="color:var(--text-muted);font-size:11px">—</span>`;

      return `
      <tr>
        <td>${fmtDataHora(ag.data_hora)}</td>
        <td>${ag.cliente_nome}</td>
        <td>${ag.procedimento_nome || '—'}</td>
        <td>${promoCell}</td>
        <td><span class="status-pill status-pill-${ag.status}" style="font-size:11px">${STATUS_LABEL[ag.status] ?? ag.status}</span></td>
        <td><strong>${fmtMoeda(ag.valor_cobrado)}</strong></td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('Erro ao carregar financeiro:', e);
    toast('Erro ao carregar dados financeiros.', 'error');
  }
}

function kpiCard(titulo, valor, cor) {
  return `
  <div class="kpi-card" style="text-align:center;border-top:3px solid ${cor}">
    <div class="kpi-label">${titulo}</div>
    <div class="kpi-value" style="color:${cor}">${valor}</div>
  </div>`;
}

function finMesAtual() {
  const h = new Date();
  document.getElementById('fin-inicio').value = new Date(h.getFullYear(), h.getMonth(), 1).toISOString().slice(0, 10);
  document.getElementById('fin-fim').value    = new Date(h.getFullYear(), h.getMonth() + 1, 0).toISOString().slice(0, 10);
  atualizarFinanceiro();
}

function finHoje() {
  const d = hoje();
  document.getElementById('fin-inicio').value = d;
  document.getElementById('fin-fim').value    = d;
  atualizarFinanceiro();
}

async function exportarFinanceiro() {
  const inicio = document.getElementById('fin-inicio')?.value;
  const fim    = document.getElementById('fin-fim')?.value;
  if (!inicio || !fim) return;

  try {
    const detalhado = await window.api.financeiro.detalhado({ inicio, fim });
    if (!detalhado || detalhado.length === 0) {
      toast('Nenhum dado para exportar.', 'error');
      return;
    }

    const linhas = [
      ['Data/Hora', 'Cliente', 'Procedimento', 'Promoção', 'Desconto', 'Status', 'Valor'].join(';'),
      ...detalhado.map(ag => [
        ag.data_hora,
        ag.cliente_nome,
        ag.procedimento_nome || '',
        ag.promocao?.promocao_nome || '',
        ag.promocao?.desconto_aplicado ?? '',
        ag.status,
        String(ag.valor_cobrado ?? '').replace('.', ','),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    ];

    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `financeiro_${inicio}_${fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado com sucesso!', 'success');
  } catch (e) {
    toast('Erro ao exportar.', 'error');
    console.error(e);
  }
}
