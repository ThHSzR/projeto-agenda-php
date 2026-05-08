async function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header">
      <h1>📊 Dashboard</h1>
      <span style="font-size:13px;color:var(--text-muted)">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
    <div id="dash-kpis" class="kpi-grid"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
      <div class="card">
        <div class="card-header">📅 Próximos Agendamentos de Hoje</div>
        <div class="card-body" id="dash-agend-hoje" style="max-height:360px;overflow-y:auto">
          <div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">🏆 Top Procedimentos (Mês)</div>
          <div class="card-body" id="dash-top-procs" style="max-height:180px;overflow-y:auto">
            <div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">🏷️ Promoções Ativas</div>
          <div class="card-body" id="dash-promos" style="max-height:160px;overflow-y:auto">
            <div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const stats = await window.api.dashboard.stats();

    // KPIs
    document.getElementById('dash-kpis').innerHTML = `
      <div class="kpi-card" style="text-align:center;border-top:3px solid var(--info)">
        <div class="kpi-label">📅 Hoje</div>
        <div class="kpi-value" style="color:var(--info)">${stats.agendamentos_hoje}</div>
        <div class="kpi-sub">agendamentos</div>
      </div>
      <div class="kpi-card" style="text-align:center;border-top:3px solid var(--rosa-botao)">
        <div class="kpi-label">📆 Semana</div>
        <div class="kpi-value" style="color:var(--rosa-botao)">${stats.agendamentos_semana || 0}</div>
        <div class="kpi-sub">agendamentos</div>
      </div>
      <div class="kpi-card" style="text-align:center;border-top:3px solid var(--success)">
        <div class="kpi-label">💰 Faturado (Mês)</div>
        <div class="kpi-value" style="color:var(--success)">${fmtMoeda(stats.recebido_mes)}</div>
        <div class="kpi-sub">${stats.taxa_conclusao || 0}% concluídos</div>
      </div>
      <div class="kpi-card" style="text-align:center;border-top:3px solid var(--warning)">
        <div class="kpi-label">👤 Clientes</div>
        <div class="kpi-value" style="color:var(--warning)">${stats.total_clientes}</div>
        <div class="kpi-sub">${stats.promos_ativas} promo(s) ativa(s)</div>
      </div>
    `;

    // Agendamentos de hoje
    const divAgend = document.getElementById('dash-agend-hoje');
    const proximos = stats.proximos_agendamentos || [];
    if (proximos.length === 0) {
      divAgend.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Nenhum agendamento hoje.</p></div>';
    } else {
      divAgend.innerHTML = proximos.map(ag => {
        const statusCfg = { agendado: '🕐', concluido: '✅', cancelado: '❌', atrasado: '⚠️' };
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <strong style="font-size:13px">${ag.cliente_nome}</strong>
            <div style="font-size:11px;color:var(--text-muted)">${fmtMoeda(ag.valor_cobrado)}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:13px;font-weight:600">${_fmtHora(ag.data_hora)}</span>
            <div style="font-size:11px">${statusCfg[ag.status] || ''} ${ag.status}</div>
          </div>
        </div>`;
      }).join('');
    }

    // Top procedimentos
    const divTop = document.getElementById('dash-top-procs');
    const topProcs = stats.top_procedimentos || [];
    if (topProcs.length === 0) {
      divTop.innerHTML = '<div class="empty-state"><div class="icon">🏆</div><p>Sem dados no mês.</p></div>';
    } else {
      const maxTotal = topProcs[0]?.total || 1;
      divTop.innerHTML = topProcs.map((p, i) => {
        const pct = Math.round((p.total / maxTotal) * 100);
        const medals = ['🥇', '🥈', '🥉'];
        const medal = medals[i] || `${i + 1}.`;
        return `
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">
            <span>${medal} ${p.nome}</span>
            <span style="font-weight:600">${p.total}x</span>
          </div>
          <div style="background:var(--surface-2);border-radius:4px;height:6px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:var(--rosa-botao);border-radius:4px;transition:width 0.5s"></div>
          </div>
        </div>`;
      }).join('');
    }

    // Promoções ativas
    const divPromos = document.getElementById('dash-promos');
    try {
      const promos = await window.api.promocoes.listar();
      const ativas = promos.filter(p => p.ativa);
      if (ativas.length === 0) {
        divPromos.innerHTML = '<div class="empty-state"><div class="icon">🏷️</div><p>Nenhuma promoção ativa.</p></div>';
      } else {
        divPromos.innerHTML = ativas.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="font-size:13px">${p.nome}</strong>
              <div style="font-size:11px;color:var(--text-muted)">${_fmtTipoDesconto(p.tipo_desconto, p.valor_desconto)}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:var(--text-muted)">
              ${p.regras?.length || 0} regra(s)
            </div>
          </div>
        `).join('');
      }
    } catch (_) {
      divPromos.innerHTML = '<div class="empty-state"><div class="icon">🔒</div><p>Acesso restrito.</p></div>';
    }
  } catch (e) {
    console.error('Erro ao carregar dashboard:', e);
  }
}

function _fmtHora(dataHora) {
  if (!dataHora) return '—';
  const d = new Date(String(dataHora).replace(' ', 'T'));
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
