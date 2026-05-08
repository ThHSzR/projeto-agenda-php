// ══════════════════════════════════════════════════════
// PRONTUÁRIO — módulo completo
// ══════════════════════════════════════════════════════

let _prontClienteId      = null;
let _prontClienteNome    = null;
let _prontEditandoId     = null;
let _prontTemLaser       = false; // controla exibição do Fitzpatrick

// ── Abrir modal ────────────────────────────────────────
async function abrirProntuario(clienteId, clienteNome) {
  _prontClienteId   = clienteId;
  _prontClienteNome = clienteNome;
  _prontEditandoId  = null;

  document.getElementById('modal-pront-title').textContent =
    `📋 Prontuário — ${clienteNome}`;

  prontCancelarForm();
  await _prontCarregar();
  abrirModal('modal-prontuario');
}

// ── Controla visibilidade do Fitzpatrick ───────────────
function _prontSetFitzVisivel(visivel) {
  const row = document.getElementById('pront-fitz-row');
  if (row) row.style.display = visivel ? '' : 'none';
  if (!visivel) {
    const sel = document.getElementById('pront-fitz');
    if (sel) sel.value = '0';
  }
}

// ── Verifica se lista de procs contém laser ────────────
function _temLaser(procsStr) {
  if (!procsStr) return false;
  return procsStr.toLowerCase().includes('laser');
}

// ── Abrir form direto em edição do atendimento recém-criado ──
function prontAbrirEdicaoAtendimento(prontuarioId, anotacaoAuto, temLaser) {
  _prontEditandoId = prontuarioId;
  _prontTemLaser   = !!temLaser;

  document.getElementById('pront-edit-id').value = prontuarioId;
  document.getElementById('pront-fitz').value    = '0';
  document.getElementById('pront-texto').value   = anotacaoAuto || '';

  _prontSetFitzVisivel(_prontTemLaser);

  const form = document.getElementById('pront-form');
  form.style.borderColor = 'var(--primary, #01696f)';
  form.style.background  = 'var(--surface, #fff)';
  form.classList.remove('hidden');

  setTimeout(() => {
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('pront-texto').focus();
  }, 120);
}

// ── Carregar e renderizar timeline ────────────────────
async function _prontCarregar() {
  const timeline = document.getElementById('pront-timeline');
  timeline.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px">Carregando...</p>';

  try {
    const entradas = await window.api.prontuario.listar(_prontClienteId);

    if (!entradas || entradas.length === 0) {
      timeline.innerHTML = `
        <div style="text-align:center;padding:48px 16px;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">📋</div>
          <p style="font-size:15px">Nenhum registro ainda.</p>
          <p style="font-size:13px;margin-top:4px">Os atendimentos concluídos aparecerão aqui automaticamente.</p>
        </div>`;
      return;
    }

    // guarda dados em atributos para evitar quebra de inline JSON
    timeline.innerHTML = entradas.map(e => _prontRenderCard(e)).join('');

    // vincula listeners depois de injetar o HTML
    timeline.querySelectorAll('[data-pront-editar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = parseInt(btn.dataset.prontEditar);
        const fitz = parseInt(btn.dataset.prontFitz) || 0;
        const txt  = btn.dataset.prontTxt || '';
        const laser = btn.dataset.prontLaser === '1';
        prontEditarEntrada(id, fitz, txt, laser);
      });
    });
    timeline.querySelectorAll('[data-pront-excluir]').forEach(btn => {
      btn.addEventListener('click', () => {
        prontExcluirAnotacao(parseInt(btn.dataset.prontExcluir));
      });
    });

  } catch (err) {
    timeline.innerHTML = `<p style="color:var(--error);text-align:center;padding:32px">Erro ao carregar prontuário.</p>`;
    console.error(err);
  }
}

// ── Renderizar card de cada entrada ──────────────────
function _prontRenderCard(e) {
  const isAtendimento = e.tipo === 'atendimento';
  const dataFormatada = e.agend_data_hora
    ? fmtDataHora(e.agend_data_hora)
    : fmtDataHora(e.criado_em);

  const laser = _temLaser(e.agend_procedimentos);

  const fitzLabel = e.fitzpatrick
    ? `<span style="
        display:inline-block;
        background:var(--primary);
        color:#fff;
        padding:2px 10px;
        border-radius:20px;
        font-size:12px;
        font-weight:600;
        margin-left:8px
      ">Fitz Tipo ${e.fitzpatrick}</span>`
    : '';

  const procedimentos = e.agend_procedimentos
    ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">
        💆 ${escapeHtml(e.agend_procedimentos)}
       </div>`
    : '';

  const valor = e.agend_valor && parseFloat(e.agend_valor) > 0
    ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px">
        💰 ${fmtMoeda(e.agend_valor)}
       </span>`
    : '';

  const anotacaoHtml = e.anotacao
    ? `<div style="
        margin-top:12px;
        padding:10px 12px;
        background:var(--surface);
        border-radius:var(--radius);
        font-size:14px;
        line-height:1.6;
        white-space:pre-wrap;
        border-left:3px solid var(--primary)
      ">${escapeHtml(e.anotacao)}</div>`
    : (isAtendimento
        ? `<div style="margin-top:10px;font-size:13px;color:var(--text-muted);font-style:italic">
             Sem anotação registrada.
           </div>`
        : '');

  // Usa data-attributes para evitar SyntaxError com aspas/caracteres especiais
  const anotacaoEscapada = (e.anotacao || '').replace(/"/g, '&quot;');

  const botoesAcao = isAtendimento
    ? `<button class="btn btn-secondary btn-sm" style="font-size:12px"
         data-pront-editar="${e.id}"
         data-pront-fitz="${e.fitzpatrick || 0}"
         data-pront-txt="${anotacaoEscapada}"
         data-pront-laser="${laser ? '1' : '0'}">
         ✏️ ${e.anotacao ? 'Editar Anotação' : 'Adicionar Anotação'}
       </button>`
    : `<button class="btn btn-secondary btn-sm" style="font-size:12px"
         data-pront-editar="${e.id}"
         data-pront-fitz="${e.fitzpatrick || 0}"
         data-pront-txt="${anotacaoEscapada}"
         data-pront-laser="0">
         ✏️ Editar
       </button>
       <button class="btn btn-danger btn-sm" style="font-size:12px"
         data-pront-excluir="${e.id}">
         🗑️
       </button>`;

  return `
    <div style="
      border:1px solid var(--border);
      border-radius:var(--radius);
      padding:14px 16px;
      margin-bottom:14px;
      background:var(--surface-2)
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:13px;font-weight:600;color:var(--text)">
            ${isAtendimento ? '📅 Atendimento' : '📝 Anotação'}
          </span>
          <span style="font-size:13px;color:var(--text-muted);margin-left:8px">${dataFormatada}</span>
          ${fitzLabel}
          ${valor}
        </div>
        <div style="display:flex;gap:6px">${botoesAcao}</div>
      </div>
      ${procedimentos}
      ${anotacaoHtml}
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Abrir form de nova anotação avulsa ─────────────────
function prontAbrirNovaAnotacao() {
  _prontEditandoId = null;
  _prontTemLaser   = false;
  document.getElementById('pront-edit-id').value = '';
  document.getElementById('pront-fitz').value    = '0';
  document.getElementById('pront-texto').value   = '';
  // Anotação avulsa: Fitzpatrick sempre visível (opcional)
  _prontSetFitzVisivel(true);
  const form = document.getElementById('pront-form');
  form.style.borderColor = '';
  form.style.background  = '';
  form.classList.remove('hidden');
  document.getElementById('pront-texto').focus();
}

// ── Abrir form de edição de entrada existente ──────────
function prontEditarEntrada(id, fitzpatrick, anotacao, temLaser) {
  _prontEditandoId = id;
  _prontTemLaser   = !!temLaser;
  document.getElementById('pront-edit-id').value = id;
  document.getElementById('pront-fitz').value    = fitzpatrick || 0;
  document.getElementById('pront-texto').value   = anotacao || '';
  _prontSetFitzVisivel(_prontTemLaser);
  const form = document.getElementById('pront-form');
  form.style.borderColor = '';
  form.style.background  = '';
  form.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('pront-texto').focus();
}

// ── Cancelar form ──────────────────────────────────────
function prontCancelarForm() {
  _prontEditandoId = null;
  _prontTemLaser   = false;
  document.getElementById('pront-edit-id').value = '';
  document.getElementById('pront-fitz').value    = '0';
  document.getElementById('pront-texto').value   = '';
  _prontSetFitzVisivel(false);
  const form = document.getElementById('pront-form');
  form.style.borderColor = '';
  form.style.background  = '';
  form.classList.add('hidden');
}

// ── Salvar anotação (nova ou edição) ───────────────────
async function prontSalvarAnotacao() {
  const texto  = document.getElementById('pront-texto').value.trim();
  const fitz   = parseInt(document.getElementById('pront-fitz').value) || 0;
  const editId = _prontEditandoId;

  try {
    if (editId) {
      await window.api.prontuario.editar(editId, {
        fitzpatrick: fitz,
        anotacao:    texto,
      });
      toast('Anotação atualizada!', 'success');
    } else {
      if (!texto) { toast('Escreva algo na anotação', 'error'); return; }
      await window.api.prontuario.criar({
        cliente_id:     _prontClienteId,
        agendamento_id: null,
        tipo:           'anotacao',
        fitzpatrick:    fitz,
        anotacao:       texto,
      });
      toast('Anotação salva!', 'success');
    }

    prontCancelarForm();
    await _prontCarregar();
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
    console.error(err);
  }
}

// ── Excluir anotação ───────────────────────────────────
async function prontExcluirAnotacao(id) {
  if (!confirm('Excluir esta anotação?')) return;
  try {
    await window.api.prontuario.excluir(id);
    toast('Anotação excluída.', 'info');
    await _prontCarregar();
  } catch (err) {
    toast('Erro ao excluir: ' + err.message, 'error');
  }
}
