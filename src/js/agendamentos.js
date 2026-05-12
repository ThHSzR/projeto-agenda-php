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
  document.getElementById('agend-whatsapp-btn').style.display  = 'none';
  _agendClienteTelefone = null;
  _agendClienteNome     = null;
  _agendFecharDropdown();
}

function _agendSelecionarCliente(id, nome, telefone) {
  document.getElementById('agend-cliente').value       = id;
  document.getElementById('agend-cliente-input').value = nome;
  document.getElementById('agend-cliente-clear').style.display = '';
  _agendClienteTelefone = telefone || null;
  _agendClienteNome     = nome;
  const btn = document.getElementById('agend-whatsapp-btn');
  btn.style.display = _agendClienteTelefone ? '' : 'none';
  _agendFecharDropdown();
}

function _agendFiltrarClientes(query) {
  const dd = document.getElementById('agend-cliente-dropdown');
  const q  = (query || '').trim().toLowerCase();
  const lista = q
    ? _agendClientesCache.filter(c => c.nome.toLowerCase().includes(q))
    : _agendClientesCache;

  if (!lista.length) {
    dd.innerHTML = `<div class="cliente-option" style="color:var(--text-muted);cursor:default">Nenhum cliente encontrado</div>`;
    dd.classList.add('open');
    return;
  }

  dd.innerHTML = lista.map((c, i) => {
    const nomeSafe = c.nome.replace(/</g, '&lt;');
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
    const tel = c.telefone ? `<span class="sub">${c.telefone}</span>` : '';
    return `<div class="cliente-option" data-idx="${i}"
      onmousedown="_agendSelecionarCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}'.trim(), '${(c.telefone||'').replace(/'/g,"\\'")}')"
    >${nomeHtml}${tel}</div>`;
  }).join('');

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
  const lista = await window.api.agendamentos.listar({});
  const page = document.getElementById('page-agendamentos');

  page.innerHTML = `
    <div class="page-header">
      <h1>📋 Agendamentos</h1>
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
  agendado:  { label: 'Agendado',   emoji: '🕐' },
  atrasado:  { label: 'Atrasado',   emoji: '⚠️' },
  concluido: { label: 'Concluído',  emoji: '✅' },
  cancelado: { label: 'Cancelado',  emoji: '❌' },
};

function renderLinhasAgend(lista) {
  if (lista.length === 0)
    return `<tr><td colspan="6"><div class="empty-state"><div class="icon">📋</div><p>Nenhum agendamento encontrado.</p></div></td></tr>`;
  return lista.map(a => {
    const statusReal = calcularStatus(a);
    const cfg = STATUS_CONFIG[statusReal];
    const nomeProcedimento = a.procedimento_nome || '—';
    const opcoesHtml = Object.entries(STATUS_CONFIG).map(([val, c]) => `
      <div class="status-dropdown-item" onclick="alterarStatusAgend(${a.id},'${val}');fecharTodosDropdowns()">
        <span class="status-dot dot-${val}"></span> ${c.emoji} ${c.label}
      </div>`).join('');
    return `
    <tr>
      <td>${fmtDataHora(a.data_hora)}</td>
      <td><strong>${a.cliente_nome}</strong></td>
      <td>${nomeProcedimento}</td>
      <td>${fmtMoeda(a.valor_cobrado)}</td>
      <td>
        <div class="status-wrapper">
          <div class="status-pill status-pill-${statusReal}" onclick="toggleStatusDropdown(this)">
            ${cfg.emoji} ${cfg.label}
          </div>
          <div class="status-dropdown">${opcoesHtml}</div>
        </div>
      </td>
      <td>
        <button class="btn btn-whatsapp btn-sm"
          onclick="abrirWhatsApp('${a.cliente_telefone}', '${a.data_hora}', '${a.cliente_nome}')"
          title="Confirmar via WhatsApp">💬</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirProntuarioAgend(${a.id})" title="Abrir Prontuário">📋</button>
        <button class="btn btn-info btn-sm" onclick="editarAgendamento(${a.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="excluirAgend(${a.id})">🗑️</button>
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
  return procs.some(p => {
    const nome = (p.procedimento_nome || p.nome || '').toLowerCase();
    return nome.includes('laser');
  });
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
    document.getElementById('agend-valor-label').textContent = 'Valor cobrado (R$) 🔒';
  } else {
    campoValor.readOnly = false;
    campoValor.style.background = '';
    campoValor.style.cursor     = '';
    document.getElementById('agend-valor-label').textContent = 'Valor cobrado (R$) ✏️';
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
        🏷️ <strong>${calc.promocao_aplicada.nome}</strong><br>
        <span style="color:var(--text-muted)">
          Subtotal do combo: ${fmtMoeda(calc.promocao_aplicada.subtotal_casado)} →
          desconto: <strong style="color:var(--success)">−${fmtMoeda(calc.promocao_aplicada.desconto)}</strong>
        </span>
      </div>`;
  }
  if (calc.aviso_outra_promocao) {
    html += `
      <div style="background:#fff8e1;border:1px solid var(--warning);border-radius:var(--radius);padding:10px 14px;margin-top:6px;font-size:13px">
        ${calc.aviso_outra_promocao}
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
      ${procs.map(p => `<option value="${p.id}" data-valor="${p.valor}" data-duracao="${p.duracao_min}" data-tem-variantes="${p.tem_variantes}"
        ${p.id === procIdSel ? 'selected' : ''}>${p.nome}</option>`).join('')}
    </select>
    <select id="agend-var-sel-${idx}" style="flex:2;display:none"
      onchange="_agendOnVarChange(${idx})"></select>
    <span id="agend-proc-info-${idx}" style="flex:1;font-size:12px;color:var(--text-muted)"></span>
    <button class="btn btn-danger btn-sm" onclick="_agendRemoverProc(${idx})">✕</button>
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
  const varSel  = document.getElementById(`agend-var-sel-${idx}`);

  if (temVar) {
    const vars = await window.api.variantes.listar(procId);
    varSel.innerHTML = vars.map(v =>
      `<option value="${v.id}" data-valor="${v.valor}" data-duracao="${v.duracao_min}"
        ${v.id === varianteIdSel ? 'selected' : ''}>${v.nome} — ${fmtMoeda(v.valor)}</option>`
    ).join('');
    varSel.style.display = '';
    _agendOnVarChange(idx);
  } else {
    varSel.style.display = 'none';
    varSel.innerHTML     = '';
    const valor   = parseFloat(opt.dataset.valor)  || 0;
    const duracao = parseInt(opt.dataset.duracao)   || 0;
    _agendProcsModal[idx] = { procId, varianteId: null, valor, duracao, nome: opt.text, varianteNome: null };
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
  const valor   = parseFloat(vOpt?.dataset.valor)  || 0;
  const duracao = parseInt(vOpt?.dataset.duracao)   || 0;
  _agendProcsModal[idx] = {
    procId, varianteId, valor, duracao,
    nome: procSel.options[procSel.selectedIndex]?.text || '',
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
  abrirWhatsApp(_agendClienteTelefone, _agendDataHora, _agendClienteNome);
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

async function abrirNovoAgendamento(dataHoraPre) {
  _agendClientesCache = await window.api.clientes.listar();
  if (_agendClientesCache.length === 0) { toast('Cadastre um cliente primeiro.', 'error'); return; }

  document.getElementById('modal-agend-title').textContent    = 'Novo Agendamento';
  document.getElementById('agend-id').value                   = '';
  document.getElementById('agend-status').value               = 'agendado';
  document.getElementById('agend-obs').value                  = '';
  document.getElementById('agend-valor').value                = '';
  document.getElementById('agend-data-hora').value            = dataHoraPre || '';
  document.getElementById('agend-procs-lista').innerHTML      = '';
  document.getElementById('agend-whatsapp-btn').style.display = 'none';

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

  document.getElementById('agend-cliente').value               = a.cliente_id;
  document.getElementById('agend-cliente-input').value         = a.cliente_nome;
  document.getElementById('agend-cliente-clear').style.display = '';
  _agendFecharDropdown();

  _agendClienteTelefone = a.cliente_telefone;
  _agendClienteNome     = a.cliente_nome;
  _agendDataHora        = a.data_hora;

  const btnWa = document.getElementById('agend-whatsapp-btn');
  btnWa.style.display = _agendClienteTelefone ? '' : 'none';

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
  const clienteId  = document.getElementById('agend-cliente').value;
  const dataHora   = document.getElementById('agend-data-hora').value;
  const statusNovo = document.getElementById('agend-status').value;
  if (!clienteId || !dataHora) { toast('Preencha os campos obrigatórios.', 'error'); return; }

  const procsValidos = _agendProcsModal.filter(p => p && p.procId);
  if (procsValidos.length === 0) { toast('Adicione ao menos um procedimento.', 'error'); return; }

  await _agendRecalcularPromocao();

  const clienteNomeAtual = _agendClienteNome;
  const temLaser         = procsValidos.some(p => (p.nome || '').toLowerCase().includes('laser'));
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
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
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