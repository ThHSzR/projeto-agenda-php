// ── estado do autocomplete de clientes ───────────────────────────────────
let _agendClientesCache  = [];
let _agendSearchFocusIdx = -1;

function _agendFecharDropdown() {
  const dd = document.getElementById('agend-cliente-dropdown');
  if (dd) { dd.classList.remove('open'); dd.innerHTML = ''; }
  _agendSearchFocusIdx = -1;
}

function _agendLimparCliente() {
  document.getElementById('agend-cliente').value       = '';
  document.getElementById('agend-cliente-input').value = '';
  document.getElementById('agend-cliente-clear').style.display = 'none';
  _agendClienteTelefone = null;
  _agendClienteNome     = null;
  _agendDefinirModoModal(document.getElementById('modal-agendamento').dataset.mode || 'create');
  _agendFecharDropdown();
}

function _agendSelecionarCliente(id, nome, telefone) {
  document.getElementById('agend-cliente').value       = id;
  document.getElementById('agend-cliente-input').value = nome;
  document.getElementById('agend-cliente-clear').style.display = '';
  _agendClienteTelefone = telefone || null;
  _agendClienteNome     = nome;
  _agendDefinirModoModal(
    document.getElementById('modal-agendamento').dataset.mode || 'create',
    Boolean(_agendClienteTelefone)
  );
  _agendFecharDropdown();
}

function _agendFiltrarClientes(query) {
  const dd = document.getElementById('agend-cliente-dropdown');
  const q  = (query || '').trim().toLowerCase();
  const encontrados = q
    ? _agendClientesCache.filter(c => `${c.nome} ${c.telefone || ''} ${c.celular || ''}`.toLowerCase().includes(q))
    : _agendClientesCache;
  const lista = encontrados.slice(0, 20);

  if (!lista.length) {
    dd.innerHTML = `<div class="cliente-option" style="color:var(--text-muted);cursor:default">Nenhum cliente encontrado</div>`;
    dd.classList.add('open');
    return;
  }

  dd.innerHTML = lista.map((c, i) => {
    const nomeSafe = escapeHtml(c.nome);
    let nomeHtml   = nomeSafe;
    if (q) {
      const idx = nomeSafe.toLowerCase().indexOf(q);
      if (idx >= 0) {
        nomeHtml =
          nomeSafe.slice(0, idx) +
          `<span class="match">${nomeSafe.slice(idx, idx + q.length)}</span>` +
          nomeSafe.slice(idx + q.length);
      }
    }
    const tel = c.telefone ? `<span class="sub">${escapeHtml(c.telefone)}</span>` : '';
    return `<div class="cliente-option" data-idx="${i}"
      onmousedown="_agendSelecionarCliente(${c.id}, decodeURIComponent('${encodeURIComponent(c.nome)}').trim(), decodeURIComponent('${encodeURIComponent(c.telefone || '')}'))"
    >${nomeHtml}${tel}</div>`;
  }).join('') + (encontrados.length > lista.length
    ? `<div style="padding:10px 14px;color:var(--text-muted);font-size:12px">Mais ${encontrados.length - lista.length} resultado(s). Continue digitando para refinar.</div>`
    : '');

  dd.classList.add('open');
  _agendSearchFocusIdx = -1;
}

function _agendSearchKeydown(e) {
  const dd    = document.getElementById('agend-cliente-dropdown');
  const items = dd.querySelectorAll('.cliente-option');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _agendSearchFocusIdx = Math.min(_agendSearchFocusIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _agendSearchFocusIdx = Math.max(_agendSearchFocusIdx - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_agendSearchFocusIdx >= 0) items[_agendSearchFocusIdx].dispatchEvent(new MouseEvent('mousedown'));
    return;
  } else if (e.key === 'Escape') {
    _agendFecharDropdown();
    return;
  } else {
    return;
  }
  items.forEach((el, i) => el.classList.toggle('focused', i === _agendSearchFocusIdx));
  items[_agendSearchFocusIdx]?.scrollIntoView({ block: 'nearest' });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.cliente-search-wrapper')) _agendFecharDropdown();
});

async function renderAgendamentos() {
  const lista = await window.api.agendamentos.listar({ data: hoje() });
  const page = document.getElementById('page-agendamentos');

  page.innerHTML = `
    <div class="page-header">
      <div><span class="page-eyebrow">Operação</span><h1>Agendamentos</h1></div>
      <button class="btn btn-primary" onclick="abrirNovoAgendamento()">+ Novo Agendamento</button>
    </div>
    <div class="search-bar" style="align-items:center">
      <button class="btn btn-secondary btn-sm" onclick="agendHoje()">Hoje</button>
      <input type="date" id="filtro-data" value="${hoje()}" onchange="filtrarAgendPorData()"/>
      <button class="btn btn-secondary btn-sm" onclick="limparFiltroAgend()">Todos</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr><th>Data/Hora</th><th>Cliente</th><th>Procedimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody id="tbody-agend">
          ${renderLinhasAgend(lista)}
        </tbody>
      </table>
    </div>`;
}

function calcularStatus(a) {
  if (a.status === 'concluido' || a.status === 'cancelado') return a.status;
  const agora  = new Date();
  const dataAg = new Date(a.data_hora.replace(' ', 'T'));
  if (dataAg < agora) return 'atrasado';
  return a.status;
}

const STATUS_CONFIG = {
  agendado:  { label: 'Agendado' },
  atrasado:  { label: 'Atrasado' },
  concluido: { label: 'Concluído' },
  cancelado: { label: 'Cancelado' },
};

function renderLinhasAgend(lista) {
  if (lista.length === 0)
    return `<tr><td colspan="6"><div class="empty-state"><p>Nenhum agendamento encontrado.</p></div></td></tr>`;
  return lista.map(a => {
    const podeExcluir = Boolean(window._session?.is_admin || window._session?.cargo === 'gerente');
    const statusReal = calcularStatus(a);
    const cfg = STATUS_CONFIG[statusReal];
    const nomeProcedimento = a.procedimento_nome || '—';
    const opcoesHtml = Object.entries(STATUS_CONFIG).map(([val, c]) => `
      <div class="status-dropdown-item" onclick="alterarStatusAgend(${a.id},'${val}');fecharTodosDropdowns()">
        <span class="status-dot dot-${val}"></span> ${c.label}
      </div>`).join('');
    return `
    <tr>
      <td>${fmtDataHora(a.data_hora)}</td>
      <td><strong>${escapeHtml(a.cliente_nome)}</strong></td>
      <td>${escapeHtml(nomeProcedimento)}</td>
      <td>${fmtMoeda(a.valor_cobrado)}</td>
      <td>
        <div class="status-wrapper">
          <div class="status-pill status-pill-${statusReal}" onclick="toggleStatusDropdown(this)">
            <span class="status-dot dot-${statusReal}"></span> ${cfg.label}
          </div>
          <div class="status-dropdown">${opcoesHtml}</div>
        </div>
      </td>
      <td>
        <button class="btn btn-whatsapp btn-sm btn-icon"
          onclick="abrirWhatsApp(decodeURIComponent('${encodeURIComponent(a.cliente_telefone || '')}'), '${a.data_hora}', decodeURIComponent('${encodeURIComponent(a.cliente_nome || '')}'), ${a.is_laser ? 'true' : 'false'})"
          title="Confirmar via WhatsApp" aria-label="Confirmar via WhatsApp">${uiIcon('whatsapp')}</button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="abrirProntuarioAgend(${a.id})" title="Abrir prontuário" aria-label="Abrir prontuário">${uiIcon('logs')}</button>
        <button class="btn btn-info btn-sm btn-icon" onclick="editarAgendamento(${a.id})" title="Editar" aria-label="Editar">${uiIcon('edit')}</button>
        ${podeExcluir ? `<button class="btn btn-danger btn-sm btn-icon" onclick="excluirAgend(${a.id})" title="Excluir" aria-label="Excluir">${uiIcon('trash')}</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function toggleStatusDropdown(pill) {
  fecharTodosDropdowns();
  const dropdown = pill.nextElementSibling;
  const rect = pill.getBoundingClientRect();
  dropdown.style.top  = (rect.bottom + 4) + 'px';
  dropdown.style.left = rect.left + 'px';
  dropdown.classList.add('open');
  setTimeout(() => document.addEventListener('click', fecharTodosDropdowns, { once: true }), 10);
}

function fecharTodosDropdowns() {
  document.querySelectorAll('.status-dropdown.open').forEach(d => d.classList.remove('open'));
}

// ── Detecta se algum procedimento é depilação a laser ─────────────────────
function _agendTemLaser(procs) {
  if (!procs || !procs.length) return false;
  return procs.some(p => Number(p.is_laser ?? p.isLaser ?? 0) === 1);
}

// ── Monta anotação automática a partir dos procs (modal) ──────────────────
function _agendMontarAnotacaoAutoModal() {
  const validos = _agendProcsModal.filter(Boolean);
  if (!validos.length) return null;

  const grupos = {};
  validos.forEach(p => {
    const chave = p.nome || 'Procedimento';
    if (!grupos[chave]) grupos[chave] = [];
    if (p.varianteNome) grupos[chave].push(p.varianteNome);
  });

  return Object.entries(grupos).map(([proc, variantes]) => {
    if (variantes.length > 0) return `${proc}: ${variantes.join(', ')}`;
    return proc;
  }).join('\n');
}

// ── Monta anotação automática a partir do objeto agendamento (API) ────────
function _agendMontarAnotacaoAuto(agendamento) {
  const procs = agendamento.procs;
  if (!procs || procs.length === 0) return agendamento.procedimento_nome || null;

  const grupos = {};
  procs.forEach(p => {
    const chave = p.procedimento_nome || 'Procedimento';
    if (!grupos[chave]) grupos[chave] = [];
    if (p.variante_nome) grupos[chave].push(p.variante_nome);
  });

  return Object.entries(grupos).map(([proc, variantes]) => {
    if (variantes.length > 0) return `${proc}: ${variantes.join(', ')}`;
    return proc;
  }).join('\n');
}

// ── Abre prontuário ao concluir (dropdown da tabela) ──────────────────────
const _agendAlertQueue = [];
const _agendAlertIds = new Set();
let _agendAlertCurrent = null;
let _agendMonitorTimer = null;
let _agendMonitorBusy = false;

function iniciarMonitorAgendamentos() {
  if (_agendMonitorTimer) return;
  _agendVerificarVencidos();
  _agendMonitorTimer = window.setInterval(_agendVerificarVencidos, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _agendVerificarVencidos();
  });
}

async function _agendVerificarVencidos() {
  if (_agendMonitorBusy || document.visibilityState === 'hidden') return;
  _agendMonitorBusy = true;
  try {
    const resultado = await window.api.agendamentos.processarVencidos();
    (resultado?.agendamentos || []).forEach(agendamento => {
      const id = Number(agendamento.id);
      if (_agendAlertIds.has(id)) return;
      _agendAlertIds.add(id);
      _agendAlertQueue.push(agendamento);
    });
    _agendMostrarProximoAlerta();

    if (resultado?.atualizados > 0 && !_agendHaModalOperacionalAberto()) {
      await _agendAtualizarPaginaVisivel();
    }
  } catch (error) {
    console.warn('Monitor de agendamentos:', error.message);
  } finally {
    _agendMonitorBusy = false;
  }
}

function _agendHaModalOperacionalAberto() {
  return !!document.querySelector('.modal-overlay:not(.hidden):not(#modal-agendamento-alerta)');
}

async function _agendAtualizarPaginaVisivel() {
  if (typeof paginaAtual === 'undefined') return;
  if (paginaAtual === 'agendamentos') await renderAgendamentos();
  if (paginaAtual === 'calendario') await renderCalendario();
  if (paginaAtual === 'dashboard') await renderDashboard();
}

function _agendMostrarProximoAlerta() {
  if (_agendAlertCurrent || !_agendAlertQueue.length) return;
  _agendAlertCurrent = _agendAlertQueue.shift();

  const agendamento = _agendAlertCurrent;
  const restantes = _agendAlertQueue.length;
  const queueEl = document.getElementById('agend-alert-queue');
  queueEl.textContent = restantes ? `Mais ${restantes} na fila` : '';
  queueEl.classList.toggle('hidden', !restantes);

  document.getElementById('agend-alert-title').textContent = agendamento.cliente_nome || 'Atendimento agendado';
  document.getElementById('agend-alert-procedure').textContent = agendamento.procedimento_nome || 'Procedimento não informado';
  const timeEl = document.getElementById('agend-alert-time');
  timeEl.textContent = fmtDataHora(agendamento.data_hora);
  timeEl.dateTime = String(agendamento.data_hora || '').replace(' ', 'T');

  document.getElementById('agend-alert-primary').classList.remove('hidden');
  document.getElementById('agend-alert-whatsapp').classList.add('hidden');
  document.querySelectorAll('.appointment-alert-action').forEach(button => { button.disabled = false; });
  document.getElementById('modal-agendamento-alerta').classList.remove('hidden');
  document.body.classList.add('modal-open');
}

async function _agendResponderAlerta(status) {
  if (!_agendAlertCurrent) return;
  const botoes = document.querySelectorAll('.appointment-alert-action');
  botoes.forEach(button => { button.disabled = true; });

  try {
    if (status === 'atrasado') {
      toast('Agendamento definido como atrasado.', 'success');
      document.getElementById('agend-alert-primary').classList.add('hidden');
      document.getElementById('agend-alert-whatsapp').classList.remove('hidden');
      const temTelefone = !!String(_agendAlertCurrent.cliente_telefone || '').replace(/\D/g, '');
      const sendButton = document.getElementById('agend-alert-send-whatsapp');
      sendButton.disabled = !temTelefone;
      document.getElementById('agend-alert-whatsapp-copy').textContent = temTelefone
        ? `O atendimento de ${_agendAlertCurrent.cliente_nome} continuará como atrasado. Podemos abrir uma mensagem pronta.`
        : 'Este cliente não possui telefone cadastrado. O atendimento continuará como atrasado.';
      return;
    }

    await window.api.agendamentos.status({ id: _agendAlertCurrent.id, status });
    if (status === 'concluido') {
      await _agendGarantirProntuarioConcluido(_agendAlertCurrent.id, false);
      toast('Atendimento concluído.', 'success');
    } else {
      toast('Agendamento cancelado por não comparecimento.', 'success');
    }
    await _agendFinalizarAlerta();
  } catch (error) {
    botoes.forEach(button => { button.disabled = false; });
    toast(error.message || 'Não foi possível atualizar o agendamento.', 'error');
  }
}

function _agendEnviarWhatsAppAlerta() {
  if (!_agendAlertCurrent) return;
  const telefone = String(_agendAlertCurrent.cliente_telefone || '').replace(/\D/g, '');
  if (!telefone) {
    toast('Cliente sem telefone cadastrado.', 'error');
    return;
  }
  const primeiroNome = String(_agendAlertCurrent.cliente_nome || '').trim().split(' ')[0];
  const texto = `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Notamos que o horário do seu atendimento chegou. Você está a caminho?`;
  window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`, '_blank');
  _agendFinalizarAlerta();
}

async function _agendFinalizarAlerta() {
  document.getElementById('modal-agendamento-alerta').classList.add('hidden');
  _agendAlertCurrent = null;
  document.body.classList.toggle('modal-open', !!document.querySelector('.modal-overlay:not(.hidden)'));
  await _agendAtualizarPaginaVisivel();
  _agendMostrarProximoAlerta();
}

async function _agendGarantirProntuarioConcluido(id, abrirEdicao = true) {
  const agend = await window.api.agendamentos.buscar(id);
  const anotacaoAuto = _agendMontarAnotacaoAuto(agend);
  const temLaser = _agendTemLaser(agend.procs || []);
  const entradasExistentes = await window.api.prontuario.listar(agend.cliente_id);
  const jaExiste = entradasExistentes.some(
    entrada => entrada.agendamento_id == id && entrada.tipo === 'atendimento'
  );

  if (!jaExiste) {
    try {
      await window.api.prontuario.criar({
        cliente_id: agend.cliente_id,
        agendamento_id: id,
        tipo: 'atendimento',
        fitzpatrick: 0,
        anotacao: null,
      });
    } catch (error) {
      if (error.status !== 409) throw error;
    }
  }

  if (abrirEdicao) {
    await abrirProntuario(agend.cliente_id, agend.cliente_nome);
    prontAbrirEdicaoAtendimento(id, anotacaoAuto, temLaser);
  }
}

async function alterarStatusAgend(id, status) {
  await window.api.agendamentos.status({ id, status });
  toast(`Status atualizado para "${status}".`, 'success');

  if (status === 'concluido') {
    try {
      const agend = await window.api.agendamentos.buscar(id);
      const anotacaoAuto = _agendMontarAnotacaoAuto(agend);
      const temLaser     = _agendTemLaser(agend.procs || []);

      // Verifica se já existe entrada de atendimento para este agendamento
      const entradasExistentes = await window.api.prontuario.listar(agend.cliente_id);
      const jaExiste = entradasExistentes.some(
        e => e.agendamento_id == id && e.tipo === 'atendimento'
      );

      if (!jaExiste) {
        try {
          await window.api.prontuario.criar({
            cliente_id:     agend.cliente_id,
            agendamento_id: id,
            tipo:           'atendimento',
            fitzpatrick:    0,
            anotacao:       null,
          });
        } catch (e) {
          if (!e.message?.includes('409')) console.warn('Prontuário:', e.message);
        }
      }

      // Abre o modal e depois o form inline diretamente no card do agendamento
      await abrirProntuario(agend.cliente_id, agend.cliente_nome);
      prontAbrirEdicaoAtendimento(id, anotacaoAuto, temLaser);
    } catch (e) {
      console.warn('Erro ao abrir prontuário após conclusão:', e.message);
    }
  }

  const filtroData = document.getElementById('filtro-data')?.value;
  if (filtroData) {
    filtrarAgendPorData();
  } else {
    const lista = await window.api.agendamentos.listar({});
    const tbody = document.getElementById('tbody-agend');
    if (tbody) tbody.innerHTML = renderLinhasAgend(lista);
  }
}

async function filtrarAgendPorData() {
  const data  = document.getElementById('filtro-data').value;
  const lista = await window.api.agendamentos.listar({ data });
  document.getElementById('tbody-agend').innerHTML = renderLinhasAgend(lista);
}

async function limparFiltroAgend() {
  document.getElementById('filtro-data').value = '';
  const lista = await window.api.agendamentos.listar({});
  document.getElementById('tbody-agend').innerHTML = renderLinhasAgend(lista);
}

// ── estado interno do modal ───────────────────────────────────────────────
let _agendProcsModal      = [];
let _agendClienteTelefone = null;
let _agendClienteNome     = null;
let _agendDataHora        = null;
let _agendPromocaoAtual   = null;
let _agendAplicarPromoAuto = true;
let _agendPromoOverrideId  = null;

function _isGerente() {
  const s = window._session;
  return s && (s.is_admin || s.cargo === 'gerente');
}

function _agendRecalcular() {
  let totalValor = 0, totalDur = 0;
  _agendProcsModal.forEach(p => {
    if (!p) return;
    totalValor += parseFloat(p.valor)  || 0;
    totalDur   += parseInt(p.duracao)  || 0;
  });
  document.getElementById('agend-total-valor').textContent   = fmtMoeda(totalValor);
  document.getElementById('agend-total-duracao').textContent = totalDur + ' min';

  const campoValor = document.getElementById('agend-valor');
  if (!_isGerente()) {
    campoValor.readOnly = true;
    campoValor.style.background = 'var(--surface-2)';
    campoValor.style.cursor     = 'not-allowed';
    document.getElementById('agend-valor-label').textContent = 'Valor cobrado (R$) — calculado automaticamente';
  } else {
    campoValor.readOnly = false;
    campoValor.style.background = '';
    campoValor.style.cursor     = '';
    document.getElementById('agend-valor-label').textContent = 'Valor cobrado (R$) — editável';
  }
}

async function _agendRecalcularPromocao() {
  const itens = _agendProcsModal.filter(Boolean).map(p => ({
    procedimento_id: p.procId,
    variante_id:     p.varianteId || null,
    valor:           p.valor      || 0,
    duracao_min:     p.duracao    || 0,
  }));

  const dataHoraInput = document.getElementById('agend-data-hora').value;
  const promoBox      = document.getElementById('agend-promo-info');

  if (!itens.length || !dataHoraInput) {
    _agendPromocaoAtual = null;
    promoBox.innerHTML  = '';
    _agendRecalcular();
    return;
  }

  const payload = {
    itens,
    data_hora:          toDbDatetime(dataHoraInput),
    aplicar_automatico: _agendAplicarPromoAuto ? 1 : 0,
    promocao_id:        _agendPromoOverrideId  || null,
  };

  let calc;
  try {
    calc = await window.api.promocoes.calcular(payload);
  } catch (e) {
    console.warn('Erro ao calcular promoção:', e.message);
    _agendPromocaoAtual = null;
    promoBox.innerHTML  = '';
    _agendRecalcular();
    const subtotal = itens.reduce((s, it) => s + (parseFloat(it.valor) || 0), 0);
    const campoValor = document.getElementById('agend-valor');
    if (!campoValor.dataset.manualOverride || campoValor.dataset.manualOverride !== '1') {
      campoValor.value = subtotal.toFixed(2);
    }
    return;
  }
  _agendPromocaoAtual = calc.promocao_aplicada;

  let html = '';
  if (calc.promocao_aplicada) {
    html += `
      <div style="background:#f0fdf4;border:1px solid var(--success);border-radius:var(--radius);padding:10px 14px;margin-top:8px;font-size:13px">
        ${uiIcon('promos')} <strong>${escapeHtml(calc.promocao_aplicada.nome)}</strong><br>
        <span style="color:var(--text-muted)">
          Subtotal do combo: ${fmtMoeda(calc.promocao_aplicada.subtotal_casado)} →
          desconto: <strong style="color:var(--success)">−${fmtMoeda(calc.promocao_aplicada.desconto)}</strong>
        </span>
      </div>`;
  }
  if (calc.aviso_outra_promocao) {
    html += `
      <div style="background:#fff8e1;border:1px solid var(--warning);border-radius:var(--radius);padding:10px 14px;margin-top:6px;font-size:13px">
        ${escapeHtml(calc.aviso_outra_promocao)}
      </div>`;
  }
  promoBox.innerHTML = html;

  const total      = Number(calc.total || 0);
  const campoValor = document.getElementById('agend-valor');
  if (!_isGerente()) {
    campoValor.value = total.toFixed(2);
  } else {
    if (!campoValor.dataset.manualOverride || campoValor.dataset.manualOverride !== '1') {
      campoValor.value = total.toFixed(2);
    }
  }
  _agendRecalcular();
}

async function _agendAdicionarProc(procIdSel = null, varianteIdSel = null) {
  const procs = await window.api.procedimentos.listar();
  const idx   = _agendProcsModal.length;

  const linha = document.createElement('div');
  linha.id    = `agend-proc-linha-${idx}`;
  linha.style = 'display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:8px';

  const placeholderOpt = procIdSel === null
    ? `<option value="" disabled selected>— Selecione um procedimento —</option>`
    : '';

  linha.innerHTML = `
    <select id="agend-proc-sel-${idx}" style="flex:2"
      onchange="_agendOnProcChange(${idx})">
      ${placeholderOpt}
      ${procs.map(p => `<option value="${p.id}" data-valor="${p.valor}" data-duracao="${p.duracao_min}" data-tem-variantes="${p.tem_variantes}" data-is-laser="${p.is_laser || 0}"
        ${p.id === procIdSel ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('')}
    </select>
    <select id="agend-var-sel-${idx}" style="flex:2;display:none"
      onchange="_agendOnVarChange(${idx})"></select>
    <span id="agend-proc-info-${idx}" style="flex:1;font-size:12px;color:var(--text-muted)"></span>
    <button class="btn btn-danger btn-sm btn-icon" onclick="_agendRemoverProc(${idx})" title="Remover procedimento" aria-label="Remover procedimento">${uiIcon('trash')}</button>
  `;

  document.getElementById('agend-procs-lista').appendChild(linha);
  _agendProcsModal.push({ procId: null, varianteId: null, valor: 0, duracao: 0 });

  if (procIdSel !== null) {
    await _agendOnProcChange(idx, varianteIdSel);
  }
}

async function _agendOnProcChange(idx, varianteIdSel = null) {
  const sel   = document.getElementById(`agend-proc-sel-${idx}`);
  const opt   = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  const procId = parseInt(sel.value);
  const temVar  = opt.dataset.temVariantes === '1';
  const isLaser = opt.dataset.isLaser === '1';
  const varSel  = document.getElementById(`agend-var-sel-${idx}`);

  if (temVar) {
    const vars = await window.api.variantes.listar(procId);
    varSel.innerHTML = vars.map(v =>
      `<option value="${v.id}" data-valor="${v.valor}" data-duracao="${v.duracao_min}"
        ${v.id === varianteIdSel ? 'selected' : ''}>${escapeHtml(v.nome)} — ${fmtMoeda(v.valor)}</option>`
    ).join('');
    varSel.style.display = '';
    _agendOnVarChange(idx);
  } else {
    varSel.style.display = 'none';
    varSel.innerHTML     = '';
    const valor   = parseFloat(opt.dataset.valor)  || 0;
    const duracao = parseInt(opt.dataset.duracao)   || 0;
    _agendProcsModal[idx] = { procId, varianteId: null, valor, duracao, nome: opt.text, varianteNome: null, isLaser };
    document.getElementById(`agend-proc-info-${idx}`).textContent = `${duracao}min · ${fmtMoeda(valor)}`;
    await _agendRecalcularPromocao();
  }
}

async function _agendOnVarChange(idx) {
  const varSel  = document.getElementById(`agend-var-sel-${idx}`);
  const procSel = document.getElementById(`agend-proc-sel-${idx}`);
  const vOpt    = varSel.options[varSel.selectedIndex];
  const procId     = parseInt(procSel.value);
  const varianteId = parseInt(varSel.value);
  const isLaser    = procSel.options[procSel.selectedIndex]?.dataset.isLaser === '1';
  const valor   = parseFloat(vOpt?.dataset.valor)  || 0;
  const duracao = parseInt(vOpt?.dataset.duracao)   || 0;
  _agendProcsModal[idx] = {
    procId, varianteId, valor, duracao,
    nome: procSel.options[procSel.selectedIndex]?.text || '',
    isLaser,
    varianteNome: vOpt?.text?.split('—')[0]?.trim() || null,
  };
  document.getElementById(`agend-proc-info-${idx}`).textContent = `${duracao}min · ${fmtMoeda(valor)}`;
  await _agendRecalcularPromocao();
}

async function _agendRemoverProc(idx) {
  const linha = document.getElementById(`agend-proc-linha-${idx}`);
  if (linha) linha.remove();
  _agendProcsModal[idx] = null;
  await _agendRecalcularPromocao();
}

function _agendWhatsApp() {
  abrirWhatsApp(
    _agendClienteTelefone,
    _agendDataHora,
    _agendClienteNome,
    _agendProcsModal.filter(Boolean).some(proc => proc.isLaser)
  );
}

function _agendResetPromo() {
  _agendPromocaoAtual    = null;
  _agendAplicarPromoAuto = true;
  _agendPromoOverrideId  = null;
  const promoBox = document.getElementById('agend-promo-info');
  if (promoBox) promoBox.innerHTML = '';
  const campoValor = document.getElementById('agend-valor');
  if (campoValor) campoValor.dataset.manualOverride = '0';

  const ctrlPromo = document.getElementById('agend-promo-controles');
  if (ctrlPromo) {
    ctrlPromo.style.display = _isGerente() ? '' : 'none';
  }
}

function _agendProximoHorario() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15);
  if (date.getHours() < 7) date.setHours(9, 0, 0, 0);
  if (date.getHours() >= 21) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function _agendDefinirModoModal(mode, hasWhatsApp = false) {
  const modal = document.getElementById('modal-agendamento');
  const btnWhatsApp = document.getElementById('agend-whatsapp-btn');
  modal.dataset.mode = mode;
  btnWhatsApp.classList.toggle('hidden', mode !== 'edit' || !hasWhatsApp);
}

async function abrirNovoAgendamento(dataHoraPre) {
  _agendClientesCache = await window.api.clientes.listar();
  if (_agendClientesCache.length === 0) { toast('Cadastre um cliente primeiro.', 'error'); return; }

  document.getElementById('modal-agend-title').textContent    = 'Novo Agendamento';
  document.getElementById('agend-id').value                   = '';
  document.getElementById('agend-status').value               = 'agendado';
  document.getElementById('agend-obs').value                  = '';
  document.getElementById('agend-valor').value                = '';
  document.getElementById('agend-data-hora').value            = dataHoraPre || _agendProximoHorario();
  document.getElementById('agend-procs-lista').innerHTML      = '';
  _agendDefinirModoModal('create');
  const conflictAlert = document.getElementById('agend-conflict-alert');
  if (conflictAlert) {
    conflictAlert.classList.add('hidden');
    conflictAlert.textContent = '';
  }

  document.getElementById('agend-cliente').value               = '';
  document.getElementById('agend-cliente-input').value         = '';
  document.getElementById('agend-cliente-clear').style.display = 'none';
  _agendFecharDropdown();

  _agendProcsModal      = [];
  _agendClienteTelefone = null;
  _agendClienteNome     = null;
  _agendDataHora        = null;
  _agendResetPromo();

  await _agendAdicionarProc();
  _agendRecalcular();
  abrirModal('modal-agendamento');
}

async function editarAgendamento(id) {
  const a = await window.api.agendamentos.buscar(id);
  if (!a) return;

  _agendClientesCache = await window.api.clientes.listar();

  document.getElementById('modal-agend-title').textContent = 'Editar Agendamento';
  document.getElementById('agend-id').value        = a.id;
  document.getElementById('agend-data-hora').value = toInputDatetime(a.data_hora);
  document.getElementById('agend-status').value    = a.status;
  document.getElementById('agend-obs').value       = a.observacoes || '';
  document.getElementById('agend-valor').value     = a.valor_cobrado || '';
  document.getElementById('agend-procs-lista').innerHTML = '';
  const conflictAlert = document.getElementById('agend-conflict-alert');
  if (conflictAlert) {
    conflictAlert.classList.add('hidden');
    conflictAlert.textContent = '';
  }

  document.getElementById('agend-cliente').value               = a.cliente_id;
  document.getElementById('agend-cliente-input').value         = a.cliente_nome;
  document.getElementById('agend-cliente-clear').style.display = '';
  _agendFecharDropdown();

  _agendClienteTelefone = a.cliente_telefone;
  _agendClienteNome     = a.cliente_nome;
  _agendDataHora        = a.data_hora;

  _agendDefinirModoModal('edit', Boolean(_agendClienteTelefone));

  _agendProcsModal = [];
  _agendResetPromo();

  // Restaurar manualOverride se gerente havia digitado valor customizado
  if (a.valor_manual_gerente) {
    const campoValorLoad = document.getElementById('agend-valor');
    if (campoValorLoad) campoValorLoad.dataset.manualOverride = '1';
  }

  if (a.promocao_uso && !a.promocao_uso.promo_recusada) {
    // Promoção foi aplicada e não foi cancelada pelo gerente — reidrata
    _agendAplicarPromoAuto = false;
    _agendPromoOverrideId  = a.promocao_uso.promocao_id;
  } else if (a.promocao_uso && a.promocao_uso.promo_recusada) {
    // Gerente cancelou a promoção intencionalmente — não reaplicar
    _agendAplicarPromoAuto = false;
    _agendPromoOverrideId  = null;
  }

  const procsExistentes = Array.isArray(a.procs) && a.procs.length > 0
    ? a.procs
    : (a.procedimento_id ? [{ procedimento_id: a.procedimento_id, variante_id: a.variante_id || null }] : []);

  if (procsExistentes.length > 0) {
    for (const p of procsExistentes) {
      await _agendAdicionarProc(p.procedimento_id, p.variante_id || null);
    }
  } else {
    await _agendAdicionarProc();
  }

  await _agendRecalcularPromocao();
  abrirModal('modal-agendamento');
}

async function salvarAgendamento() {
  const conflictAlert = document.getElementById('agend-conflict-alert');
  if (conflictAlert) {
    conflictAlert.classList.add('hidden');
    conflictAlert.textContent = '';
  }
  const clienteId  = document.getElementById('agend-cliente').value;
  const dataHora   = document.getElementById('agend-data-hora').value;
  const statusNovo = document.getElementById('agend-status').value;
  if (!clienteId || !dataHora) { toast('Preencha os campos obrigatórios.', 'error'); return; }

  const procsValidos = _agendProcsModal.filter(p => p && p.procId);
  if (procsValidos.length === 0) { toast('Adicione ao menos um procedimento.', 'error'); return; }

  await _agendRecalcularPromocao();

  const clienteNomeAtual = _agendClienteNome;
  const temLaser         = procsValidos.some(p => p.isLaser);
  const anotacaoAuto     = statusNovo === 'concluido' ? _agendMontarAnotacaoAutoModal() : null;

  try {
    const resultado = await window.api.agendamentos.salvar({
      id:               document.getElementById('agend-id').value || null,
      cliente_id:       parseInt(clienteId),
      data_hora:        toDbDatetime(dataHora),
      status:           statusNovo,
      valor_cobrado:         parseFloat(document.getElementById('agend-valor').value) || 0,
      valor_manual_gerente:  document.getElementById('agend-valor').dataset.manualOverride === '1' ? 1 : 0,
      observacoes:      document.getElementById('agend-obs').value,
      promocao_aplicada: _agendPromocaoAtual,
      promo_recusada:    (!_agendPromocaoAtual && !_agendAplicarPromoAuto && _agendPromoOverrideId === null) ? 1 : 0,
      procs: procsValidos.map(p => ({
        procedimento_id: p.procId,
        variante_id:     p.varianteId || null,
        valor:           p.valor,
        duracao_min:     p.duracao,
      })),
    });

    fecharModal('modal-agendamento');
    toast('Agendamento salvo!', 'success');

    if (statusNovo === 'concluido' && parseInt(clienteId)) {
      try {
        await window.api.prontuario.criar({
          cliente_id:     parseInt(clienteId),
          agendamento_id: resultado.id,   // id do AGENDAMENTO
          tipo:           'atendimento',
          fitzpatrick:    0,
          anotacao:       null,
        });
      } catch (e) {
        if (!e.message?.includes('409')) console.warn('Prontuário:', e.message);
      }

      await abrirProntuario(parseInt(clienteId), clienteNomeAtual);
      // Passa o id do AGENDAMENTO para localizar o card na timeline
      prontAbrirEdicaoAtendimento(resultado.id, anotacaoAuto, temLaser);
    }

    const paginaAtiva = document.querySelector('.page:not(.hidden)');
    if (paginaAtiva?.id === 'page-agendamentos') renderAgendamentos();
    if (paginaAtiva?.id === 'page-calendario')   renderCalendario();
    if (paginaAtiva?.id === 'page-dashboard')    renderDashboard();
  } catch (e) {
    if (e.code === 'HORARIO_INDISPONIVEL' && conflictAlert) {
      const detail = e.details;
      const interval = detail?.inicio && detail?.fim
        ? ` Intervalo indisponível: ${fmtDataHora(detail.inicio)} até ${fmtHora(detail.fim)}.`
        : '';
      conflictAlert.textContent = e.message + interval + ' Escolha outra data ou horário.';
      conflictAlert.classList.remove('hidden');
      conflictAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast(e.message, 'error');
    console.error('Erro ao salvar agendamento:', e);
  }
}

async function excluirAgend(id) {
  if (!confirm('Excluir este agendamento?')) return;
  await window.api.agendamentos.excluir(id);
  toast('Agendamento excluído.', 'info');
  renderAgendamentos();
}

function agendHoje() {
  document.getElementById('filtro-data').value = hoje();
  filtrarAgendPorData();
}

// ── Abre prontuário direto da linha do agendamento ────────────────────────
async function abrirProntuarioAgend(id) {
  try {
    const agend = await window.api.agendamentos.buscar(id);
    const anotacaoAuto = _agendMontarAnotacaoAuto(agend);
    const temLaser     = _agendTemLaser(agend.procs || []);

    const entradasExistentes = await window.api.prontuario.listar(agend.cliente_id);
    const jaExiste = entradasExistentes.some(
      e => e.agendamento_id == id && e.tipo === 'atendimento'
    );

    if (!jaExiste) {
      try {
        await window.api.prontuario.criar({
          cliente_id:     agend.cliente_id,
          agendamento_id: id,
          tipo:           'atendimento',
          fitzpatrick:    0,
          anotacao:       null,
        });
      } catch (e) {
        if (!e.message?.includes('409')) console.warn('Prontuário:', e.message);
      }
    }

    await abrirProntuario(agend.cliente_id, agend.cliente_nome);
    prontAbrirEdicaoAtendimento(id, anotacaoAuto, temLaser);
  } catch (e) {
    toast('Erro ao abrir prontuário: ' + e.message, 'error');
  }
}
