async function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  if (!page) return;

  const isOperador = !window._session?.is_admin && window._session?.cargo !== 'gerente';
  page.innerHTML = `
    <div class="page-header dashboard-heading">
      <div>
        <span class="page-eyebrow">Visão geral</span>
        <h1>${_dashboardSaudacao()}, ${escapeHtml(window._session?.usuario || 'equipe')}</h1>
      </div>
      <span class="dashboard-current-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
    <div id="dash-kpis" class="kpi-grid ${isOperador ? 'dashboard-operator-kpis' : ''}"></div>
    <div id="dash-content" class="dashboard-main-grid ${isOperador ? 'is-operator' : ''}">
      <div class="card dashboard-appointments-card">
        <div class="card-header dashboard-card-header">
          <span>${uiIcon('calendar')} Próximos atendimentos</span>
          <small>Até o fim desta semana</small>
        </div>
        <div class="card-body dashboard-appointment-list" id="dash-agend-semana">
          <div class="empty-state"><p>Carregando agenda...</p></div>
        </div>
      </div>
      ${isOperador ? '' : `
        <div class="dashboard-insights">
          <div class="card">
            <div class="card-header">${uiIcon('trend')} Procedimentos em destaque</div>
            <div class="card-body" id="dash-top-procs"></div>
          </div>
          <div class="card">
            <div class="card-header">${uiIcon('promos')} Promoções ativas</div>
            <div class="card-body" id="dash-promos"></div>
          </div>
        </div>`}
    </div>`;

  try {
    const stats = await window.api.dashboard.dados();
    _dashboardRenderKpis(stats, isOperador);
    _dashboardRenderAgendamentos(stats.proximos_agendamentos || []);
    if (!isOperador) await _dashboardRenderGerencial(stats);
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    document.getElementById('dash-agend-semana').innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function _dashboardSaudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

function _dashboardRenderKpis(stats, isOperador) {
  const cards = [
    `<div class="kpi-card kpi-blue">
      <div class="kpi-icon">${uiIcon('calendar')}</div><div class="kpi-label">Hoje</div>
      <div class="kpi-value" style="color:var(--info)">${stats.agendamentos_hoje || 0}</div>
      <div class="kpi-sub">agendamentos</div>
    </div>`,
    `<div class="kpi-card kpi-purple">
      <div class="kpi-icon">${uiIcon('appointments')}</div><div class="kpi-label">Esta semana</div>
      <div class="kpi-value" style="color:var(--rosa-botao)">${stats.agendamentos_semana || 0}</div>
      <div class="kpi-sub">agendamentos</div>
    </div>`,
  ];

  if (!isOperador) {
    cards.push(
      `<div class="kpi-card kpi-green">
        <div class="kpi-icon">${uiIcon('finance')}</div><div class="kpi-label">Faturado no mês</div>
        <div class="kpi-value" style="color:var(--success)">${fmtMoeda(stats.recebido_mes)}</div>
        <div class="kpi-sub">${stats.taxa_conclusao || 0}% concluídos</div>
      </div>`,
      `<div class="kpi-card kpi-rose">
        <div class="kpi-icon">${uiIcon('clients')}</div><div class="kpi-label">Clientes</div>
        <div class="kpi-value" style="color:var(--warning)">${stats.total_clientes || 0}</div>
        <div class="kpi-sub">${stats.promos_ativas || 0} promo(s) ativa(s)</div>
      </div>`
    );
  }
  document.getElementById('dash-kpis').innerHTML = cards.join('');
}

function _dashboardRenderAgendamentos(agendamentos) {
  const container = document.getElementById('dash-agend-semana');
  if (!agendamentos.length) {
    container.innerHTML = `<div class="empty-state modern-empty">${uiIcon('calendar')}<strong>Agenda livre por aqui</strong><p>Nenhum atendimento restante nesta semana.</p></div>`;
    return;
  }

  container.innerHTML = agendamentos.map(agendamento => `
    <article class="dashboard-appointment-item">
      <div class="dashboard-appointment-date">
        <strong>${_dashboardDiaCurto(agendamento.data_hora)}</strong>
        <span>${_fmtHora(agendamento.data_hora)}</span>
      </div>
      <div class="dashboard-appointment-main">
        <strong>${escapeHtml(agendamento.cliente_nome)}</strong>
        <span>${escapeHtml(agendamento.procedimento_nome || 'Procedimento não informado')}</span>
      </div>
      <div class="dashboard-appointment-actions">
        <button type="button" class="btn btn-whatsapp btn-sm"
          onclick="abrirWhatsApp(decodeURIComponent('${encodeURIComponent(agendamento.cliente_telefone || '')}'), '${agendamento.data_hora}', decodeURIComponent('${encodeURIComponent(agendamento.cliente_nome || '')}'), ${Number(agendamento.is_laser) === 1})"
          title="Enviar confirmação pelo WhatsApp">
          ${uiIcon('whatsapp')} <span>Confirmar</span>
        </button>
        <button type="button" class="btn btn-info btn-sm btn-icon" onclick="editarAgendamento(${agendamento.id})" title="Alterar data ou atendimento" aria-label="Editar agendamento">
          ${uiIcon('edit')}
        </button>
        <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="dashboardCancelarAgendamento(${agendamento.id})" title="Cancelar agendamento" aria-label="Cancelar agendamento">
          ${uiIcon('close')}
        </button>
      </div>
    </article>`).join('');
}

async function _dashboardRenderGerencial(stats) {
  const topContainer = document.getElementById('dash-top-procs');
  const topProcedimentos = stats.top_procedimentos || [];
  if (!topProcedimentos.length) {
    topContainer.innerHTML = `<div class="empty-state modern-empty">${uiIcon('trend')}<p>Sem dados no mês.</p></div>`;
  } else {
    const maiorTotal = Number(topProcedimentos[0]?.total) || 1;
    topContainer.innerHTML = topProcedimentos.map((procedimento, index) => `
      <div class="dashboard-procedure-rank">
        <div><span>${String(index + 1).padStart(2, '0')} ${escapeHtml(procedimento.nome)}</span><strong>${procedimento.total}x</strong></div>
        <div class="dashboard-rank-track"><span style="width:${Math.round((procedimento.total / maiorTotal) * 100)}%"></span></div>
      </div>`).join('');
  }

  const promoContainer = document.getElementById('dash-promos');
  const promocoes = (await window.api.promocoes.listar()).filter(promocao => promocao.ativa);
  promoContainer.innerHTML = promocoes.length ? promocoes.map(promocao => `
    <div class="dashboard-promo-row">
      <div><strong>${escapeHtml(promocao.nome)}</strong><span>${_fmtTipoDesconto(promocao.tipo_desconto, promocao.valor_desconto)}</span></div>
      <small>${promocao.regras?.length || 0} regra(s)</small>
    </div>`).join('') : `<div class="empty-state modern-empty">${uiIcon('promos')}<p>Nenhuma promoção ativa.</p></div>`;
}

async function dashboardCancelarAgendamento(id) {
  if (!confirm('Cancelar este agendamento?')) return;
  try {
    await window.api.agendamentos.status({ id, status: 'cancelado' });
    toast('Agendamento cancelado.', 'success');
    await renderDashboard();
  } catch (error) {
    toast(error.message || 'Não foi possível cancelar o agendamento.', 'error');
  }
}

function _dashboardDiaCurto(dataHora) {
  const data = new Date(String(dataHora).replace(' ', 'T'));
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diferenca = Math.round((inicioData - inicioHoje) / 86400000);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Amanhã';
  if (diferenca === 2) return 'Depois de amanhã';
  return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
}

function _fmtHora(dataHora) {
  if (!dataHora) return '—';
  const data = new Date(String(dataHora).replace(' ', 'T'));
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
