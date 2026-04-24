// ── prontuario.js ────────────────────────────────────────────────────────────

const FITZ_LABELS = {
  1: 'Tipo I — Sempre queima, nunca bronzeia',
  2: 'Tipo II — Sempre queima, bronzeia com dificuldade',
  3: 'Tipo III — Às vezes queima, sempre bronzeia',
  4: 'Tipo IV — Raramente queima, bronzeia facilmente',
  5: 'Tipo V — Queima muito raramente, bronzeia muito facilmente',
  6: 'Tipo VI — Nunca queima, bronzeia muito facilmente',
};

let _prontClienteId   = null;
let _prontClienteNome = null;

// ── abrir modal ───────────────────────────────────────────────────────────────
async function abrirProntuario(clienteId, clienteNome) {
  _prontClienteId   = clienteId;
  _prontClienteNome = clienteNome;

  document.getElementById('modal-pront-title').textContent = '📋 Prontuário — ' + clienteNome;
  document.getElementById('pront-loading').classList.remove('hidden');
  document.getElementById('pront-timeline').innerHTML = '';
  document.getElementById('pront-form-nova').classList.add('hidden');

  abrirModal('modal-prontuario');
  await _prontCarregar();
}

// ── carregar timeline ─────────────────────────────────────────────────────────
async function _prontCarregar() {
  document.getElementById('pront-loading').classList.remove('hidden');
  try {
    const lista = await window.api.prontuario.listar(_prontClienteId);
    _prontRenderTimeline(lista);
  } catch (e) {
    toast('Erro ao carregar prontuário: ' + e.message, 'error');
  } finally {
    document.getElementById('pront-loading').classList.add('hidden');
  }
}

// ── render timeline ───────────────────────────────────────────────────────────
function _prontRenderTimeline(lista) {
  const container = document.getElementById('pront-timeline');

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 0">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <p style="color:var(--text-muted)">Nenhum registro no prontuário ainda.<br>Os atendimentos concluídos aparecerão aqui automaticamente.</p>
      </div>`;
    return;
  }

  container.innerHTML = lista.map(entry => {
    const isAtend  = entry.tipo === 'atendimento';
    const dataExib = entry.agendamento_data
      ? fmtDataHora(entry.agendamento_data)
      : fmtDataHora(entry.criado_em);

    const fitzBadge = entry.fitzpatrick && entry.fitzpatrick > 0
      ? `<span class="badge-fitz">🔬 ${FITZ_LABELS[entry.fitzpatrick] || 'Tipo ' + entry.fitzpatrick}</span>`
      : '';

    const procsExib = (isAtend && entry.procedimentos)
      ? `<div class="pront-procs">💆 ${entry.procedimentos}</div>`
      : '';

    const anotacaoExib = entry.anotacao
      ? `<div class="pront-anotacao">${escHtml(entry.anotacao)}</div>`
      : (isAtend ? `<div class="pront-anotacao pront-sem-nota" onclick="_prontAbrirEdicaoAtend(${entry.id}, ${entry.fitzpatrick || 0}, '')">＋ Adicionar anotação...</div>` : '');

    const acoes = isAtend
      ? `<button class="btn btn-secondary btn-sm" onclick="_prontAbrirEdicaoAtend(${entry.id}, ${entry.fitzpatrick || 0}, ${JSON.stringify(entry.anotacao || '')})">✏️ Editar</button>`
      : `<button class="btn btn-secondary btn-sm" onclick="_prontAbrirEdicaoAvulsa(${entry.id}, ${entry.fitzpatrick || 0}, ${JSON.stringify(entry.anotacao || '')})">✏️ Editar</button>
         <button class="btn btn-danger btn-sm" onclick="_prontExcluir(${entry.id})">🗑️</button>`;

    return `
      <div class="pront-card ${isAtend ? 'pront-card-atend' : 'pront-card-nota'}" id="pront-entry-${entry.id}">
        <div class="pront-card-header">
          <span class="pront-tipo-badge">${isAtend ? '📅 Atendimento' : '📝 Anotação'}</span>
          <span class="pront-data">${dataExib}</span>
          <div class="pront-acoes">${acoes}</div>
        </div>
        ${procsExib}
        ${fitzBadge}
        <div class="pront-corpo" id="pront-corpo-${entry.id}">
          ${anotacaoExib}
        </div>
      </div>`;
  }).join('');
}

// ── mostrar/ocultar formulário de nova anotação ───────────────────────────────
function _prontMostrarFormNova() {
  const form = document.getElementById('pront-form-nova');
  form.classList.toggle('hidden');
  document.getElementById('pront-nova-texto').value = '';
  document.getElementById('pront-nova-fitz').value  = '0';
}

async function _prontSalvarNova() {
  const texto = document.getElementById('pront-nova-texto').value.trim();
  const fitz  = parseInt(document.getElementById('pront-nova-fitz').value) || 0;

  if (!texto) { toast('Escreva uma anotação antes de salvar.', 'error'); return; }

  try {
    await window.api.prontuario.criar({
      cliente_id:  _prontClienteId,
      tipo:        'anotacao',
      anotacao:    texto,
      fitzpatrick: fitz,
    });
    document.getElementById('pront-form-nova').classList.add('hidden');
    toast('Anotação salva!', 'success');
    await _prontCarregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
}

// ── editar entrada de atendimento (fitz + anotação) ───────────────────────────
function _prontAbrirEdicaoAtend(id, fitzAtual, anotacaoAtual) {
  const corpo = document.getElementById('pront-corpo-' + id);
  if (!corpo) return;
  corpo.innerHTML = _htmlFormEdicao(id, fitzAtual, anotacaoAtual, true);
}

// ── editar anotação avulsa ────────────────────────────────────────────────────
function _prontAbrirEdicaoAvulsa(id, fitzAtual, anotacaoAtual) {
  const corpo = document.getElementById('pront-corpo-' + id);
  if (!corpo) return;
  corpo.innerHTML = _htmlFormEdicao(id, fitzAtual, anotacaoAtual, false);
}

function _htmlFormEdicao(id, fitzAtual, anotacaoAtual, mostrarFitz) {
  const fitzOptions = Object.entries(FITZ_LABELS).map(([v, l]) =>
    `<option value="${v}" ${parseInt(fitzAtual) === parseInt(v) ? 'selected' : ''}>${l}</option>`
  ).join('');

  const fitzHtml = mostrarFitz ? `
    <div class="form-group" style="margin-bottom:8px">
      <label style="font-size:12px;margin-bottom:4px;display:block">🔬 Fitzpatrick</label>
      <select id="pront-edit-fitz-${id}" style="width:100%">
        <option value="0">— Não registrado —</option>
        ${fitzOptions}
      </select>
    </div>` : '';

  return `
    <div class="pront-edit-form">
      ${fitzHtml}
      <textarea id="pront-edit-texto-${id}" rows="3" placeholder="Anotação sobre este atendimento..."
        style="width:100%;resize:vertical">${escHtml(anotacaoAtual)}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
        <button class="btn btn-secondary btn-sm" onclick="_prontCarregar()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="_prontSalvarEdicao(${id}, ${mostrarFitz})">💾 Salvar</button>
      </div>
    </div>`;
}

async function _prontSalvarEdicao(id, comFitz) {
  const texto = document.getElementById('pront-edit-texto-' + id)?.value ?? '';
  const fitz  = comFitz ? (parseInt(document.getElementById('pront-edit-fitz-' + id)?.value) || 0) : undefined;

  const payload = { anotacao: texto };
  if (fitz !== undefined) payload.fitzpatrick = fitz;

  try {
    await window.api.prontuario.editar(id, payload);
    toast('Salvo!', 'success');
    await _prontCarregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
}

// ── excluir anotação avulsa ───────────────────────────────────────────────────
async function _prontExcluir(id) {
  if (!confirm('Excluir esta anotação?')) return;
  try {
    await window.api.prontuario.excluir(id);
    toast('Anotação excluída.', 'info');
    await _prontCarregar();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
}

// ── helper: escape HTML ───────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}
