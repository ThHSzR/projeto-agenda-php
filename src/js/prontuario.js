// ══════════════════════════════════════════════════════
// PRONTUÁRIO — módulo completo
// ══════════════════════════════════════════════════════

let _prontClienteId      = null;
let _prontClienteNome    = null;
let _prontFormAbertoPara = null;

// ── Abrir modal ────────────────────────────────────────
async function abrirProntuario(clienteId, clienteNome) {
  _prontClienteId   = clienteId;
  _prontClienteNome = clienteNome;
  _prontFormAbertoPara = null;

  document.getElementById('modal-pront-title').textContent =
    `📋 Prontuário — ${clienteNome}`;

  await _prontCarregar();
  abrirModal('modal-prontuario');
}

// ── Abrir form direto em edição do atendimento recém-criado ──
async function prontAbrirEdicaoAtendimento(agendamentoId, anotacaoAuto, temLaser) {
  // Busca o registro de atendimento para obter o prontuario_id correto
  let prontuarioId = null;
  try {
    const entradas = await window.api.prontuario.listar(_prontClienteId);
    const registro = entradas.find(
      e => e.agendamento_id == agendamentoId && e.tipo === 'atendimento'
    );
    if (registro) prontuarioId = registro.id;
  } catch (e) {
    console.warn('Erro ao buscar registro de atendimento:', e.message);
  }

  _prontAbrirFormNoCard(
    {
      agendamento_id: agendamentoId,
      prontuario_id:  prontuarioId,
      tem_laser:      temLaser ? 1 : 0,
      is_atendimento: true,
    },
    anotacaoAuto || ''
  );
}

// ── Carregar e renderizar timeline ────────────────────
async function _prontCarregar() {
  const timeline = document.getElementById('pront-timeline');
  timeline.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:32px">Carregando...</p>';
  _prontFormAbertoPara = null;

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

    timeline.innerHTML = entradas.map(e => _prontRenderCard(e)).join('');

    timeline.querySelectorAll('[data-pront-adicionar]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cardId   = btn.dataset.prontAdicionar;
        const agendId  = parseInt(btn.dataset.prontAgendId) || null;
        const pronId   = parseInt(btn.dataset.prontId) || null;
        const txt      = btn.dataset.prontTxt || '';
        const temLaser = btn.dataset.prontLaser === '1';
        const fitz     = parseInt(btn.dataset.prontFitz) || 0;
        const isAtend  = btn.dataset.prontIsAtend === '1';
        _prontAbrirFormNoCard(
          { card_id: cardId, agendamento_id: agendId, prontuario_id: pronId, tem_laser: temLaser ? 1 : 0, fitz, is_atendimento: isAtend },
          txt
        );
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

// ── Abre o form inline DENTRO do card correto ─────────
function _prontAbrirFormNoCard(ctx, textoInicial) {
  document.querySelectorAll('.pront-inline-form').forEach(el => el.remove());
  _prontFormAbertoPara = null;

  const cardId = ctx.card_id || (ctx.agendamento_id ? `agend-${ctx.agendamento_id}` : null);
  if (!cardId) return;

  const card = document.querySelector(`[data-card-id="${cardId}"]`);
  if (!card) return;

  _prontFormAbertoPara = cardId;

  const temLaser = !!ctx.tem_laser;
  const fitz     = ctx.fitz || 0;
  const agendId  = ctx.agendamento_id || null;
  const pronId   = ctx.prontuario_id || null;
  const isAtend  = !!ctx.is_atendimento;

  const fitzHtml = temLaser ? `
    <div style="margin-bottom:10px">
      <label style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">
        FITZPATRICK DESTA SESSÃO <span style="font-weight:400;font-style:italic">(visível pois há depilação a laser)</span>
      </label>
      <select id="pront-inline-fitz" style="width:100%;margin-top:4px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;background:var(--surface)">
        <option value="0">— Não informado —</option>
        <option value="1" ${fitz==1?'selected':''}>Tipo I — Muito clara, sempre queima</option>
        <option value="2" ${fitz==2?'selected':''}>Tipo II — Clara, geralmente queima</option>
        <option value="3" ${fitz==3?'selected':''}>Tipo III — Média, às vezes queima</option>
        <option value="4" ${fitz==4?'selected':''}>Tipo IV — Morena, raramente queima</option>
        <option value="5" ${fitz==5?'selected':''}>Tipo V — Escura, muito raramente queima</option>
        <option value="6" ${fitz==6?'selected':''}>Tipo VI — Muito escura, nunca queima</option>
      </select>
    </div>` : '';

  const formHtml = `
    <div class="pront-inline-form" style="
      margin-top:12px;
      padding:14px;
      background:var(--surface);
      border:1.5px solid var(--primary);
      border-radius:var(--radius);
    ">
      ${fitzHtml}
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">ANOTAÇÃO</label>
        <textarea id="pront-inline-texto"
          placeholder="Registre observações, evolução, intercorrências..."
          rows="4"
          style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;resize:vertical;font-family:inherit;background:var(--surface)"
        >${escapeHtml(textoInicial)}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">
        <button class="btn btn-secondary btn-sm" onclick="_prontFecharFormInline()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="_prontSalvarInline(${agendId ?? 'null'}, ${pronId ?? 'null'}, ${isAtend})">
          💾 Salvar
        </button>
      </div>
    </div>`;

  card.insertAdjacentHTML('beforeend', formHtml);

  setTimeout(() => {
    const textarea = document.getElementById('pront-inline-texto');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 80);
}

function _prontFecharFormInline() {
  document.querySelectorAll('.pront-inline-form').forEach(el => el.remove());
  _prontFormAbertoPara = null;
}

// ── Salvar via form inline ─────────────────────────────
//
// Regra simplificada:
//   - isAtendimento=true  → sempre faz PATCH no registro de atendimento (prontuarioId)
//                           salvando anotacao e fitzpatrick diretamente nele.
//                           Nunca cria registro separado.
//   - isAtendimento=false e prontuarioId → PATCH na anotação existente
//   - isAtendimento=false sem prontuarioId → POST (nova anotação avulsa)
async function _prontSalvarInline(agendamentoId, prontuarioId, isAtendimento) {
  const texto = (document.getElementById('pront-inline-texto')?.value || '').trim();
  const fitz  = parseInt(document.getElementById('pront-inline-fitz')?.value || '0') || 0;

  if (!texto) { toast('Escreva algo na anotação', 'error'); return; }

  try {
    if (isAtendimento && prontuarioId) {
      // Salva anotacao e fitzpatrick direto no registro de atendimento
      await window.api.prontuario.editar(prontuarioId, { anotacao: texto, fitzpatrick: fitz });
      toast('Anotação salva!', 'success');

    } else if (prontuarioId) {
      // Edição de anotação avulsa existente
      await window.api.prontuario.editar(prontuarioId, { anotacao: texto, fitzpatrick: fitz });
      toast('Anotação atualizada!', 'success');

    } else {
      // Nova anotação avulsa (sem vínculo com atendimento)
      await window.api.prontuario.criar({
        cliente_id:     _prontClienteId,
        agendamento_id: agendamentoId || null,
        tipo:           'anotacao',
        fitzpatrick:    fitz,
        anotacao:       texto,
      });
      toast('Anotação salva!', 'success');
    }

    await _prontCarregar();
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'error');
    console.error(err);
  }
}

// ── Renderizar card de cada entrada ──────────────────
function _prontRenderCard(e) {
  const isAtendimento = e.tipo === 'atendimento';
  const dataFormatada = e.agend_data_hora
    ? fmtDataHora(e.agend_data_hora)
    : fmtDataHora(e.criado_em);

  const temLaser = !!parseInt(e.agend_tem_laser || 0);
  const cardId   = isAtendimento ? `agend-${e.agendamento_id}` : `nota-${e.id}`;

  // Badge de fitzpatrick: agora aparece na linha de procedimentos
  const fitzBadge = e.fitzpatrick
    ? `<span style="
        display:inline-block;
        background:var(--primary);
        color:var(--text-muted);
        padding:2px 10px;
        border-radius:20px;
        font-size:12px;
        font-weight:800;
        margin-left:8px
      ">Intensidade Tipo ${e.fitzpatrick}</span>`
    : '';

  const procedimentos = e.agend_procedimentos
    ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">
        💆 ${escapeHtml(e.agend_procedimentos)}
        ${fitzBadge}
       </div>`
    : (fitzBadge
        ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${fitzBadge}</div>`
        : '');

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

  const anotacaoEscapada = (e.anotacao || '').replace(/"/g, '&quot;');

  const botoesAcao = isAtendimento
    ? `<button class="btn btn-secondary btn-sm" style="font-size:12px"
         data-pront-adicionar="${cardId}"
         data-pront-agend-id="${e.agendamento_id}"
         data-pront-id="${e.id}"
         data-pront-txt="${anotacaoEscapada}"
         data-pront-fitz="${e.fitzpatrick || 0}"
         data-pront-laser="${temLaser ? '1' : '0'}"
         data-pront-is-atend="1">
         ✏️ ${e.anotacao ? 'Editar Anotação' : 'Adicionar Anotação'}
       </button>`
    : `<button class="btn btn-secondary btn-sm" style="font-size:12px"
         data-pront-adicionar="${cardId}"
         data-pront-id="${e.id}"
         data-pront-fitz="${e.fitzpatrick || 0}"
         data-pront-txt="${anotacaoEscapada}"
         data-pront-laser="0"
         data-pront-is-atend="0">
         ✏️ Editar
       </button>
       <button class="btn btn-danger btn-sm" style="font-size:12px"
         data-pront-excluir="${e.id}">
         🗑️
       </button>`;

  return `
    <div data-card-id="${cardId}" style="
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

// ── Abrir form de nova anotação avulsa ─────────────
function prontAbrirNovaAnotacao() {
  document.querySelectorAll('.pront-inline-form').forEach(el => el.remove());
  _prontFormAbertoPara = null;

  document.getElementById('pront-edit-id').value = '';
  document.getElementById('pront-fitz').value    = '0';
  document.getElementById('pront-texto').value   = '';
  const row = document.getElementById('pront-fitz-row');
  if (row) row.style.display = 'none';
  const form = document.getElementById('pront-form');
  form.style.borderColor = '';
  form.style.background  = '';
  form.classList.remove('hidden');
  document.getElementById('pront-texto').focus();
}

// ── Cancelar form fixo ─────────────────────────────────
function prontCancelarForm() {
  document.getElementById('pront-edit-id').value = '';
  document.getElementById('pront-fitz').value    = '0';
  document.getElementById('pront-texto').value   = '';
  const row = document.getElementById('pront-fitz-row');
  if (row) row.style.display = 'none';
  const form = document.getElementById('pront-form');
  form.style.borderColor = '';
  form.style.background  = '';
  form.classList.add('hidden');
}

// ── Salvar nova anotação avulsa (botão fixo) ────────────────────
async function prontSalvarAnotacao() {
  const texto = document.getElementById('pront-texto').value.trim();
  const fitz  = parseInt(document.getElementById('pront-fitz').value) || 0;

  if (!texto) { toast('Escreva algo na anotação', 'error'); return; }

  try {
    await window.api.prontuario.criar({
      cliente_id:     _prontClienteId,
      agendamento_id: null,
      tipo:           'anotacao',
      fitzpatrick:    fitz,
      anotacao:       texto,
    });
    toast('Anotação salva!', 'success');
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
