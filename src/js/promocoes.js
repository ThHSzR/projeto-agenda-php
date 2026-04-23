// ─── Estado interno ───────────────────────────────────────────
let _promoLista  = [];
let _promoRegras = [];
let _promoProcsCached = null;

// ─── Render principal ─────────────────────────────────────────
async function renderPromocoes() {
  const page = document.getElementById('page-promocoes');
  page.innerHTML = `
    <div class="page-header">
      <h1>🏷️ Promoções</h1>
      <button class="btn btn-primary" onclick="abrirNovaPromocao()">+ Nova Promoção</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Desconto</th>
            <th>Vigência</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="tbody-promocoes">
          <tr><td colspan="5"><div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div></td></tr>
        </tbody>
      </table>
    </div>`;

  await _carregarPromocoes();
}

async function _carregarPromocoes() {
  _promoLista = await window.api.promocoes.listar();
  _renderTbodyPromocoes();
}

function _renderTbodyPromocoes() {
  const tbody = document.getElementById('tbody-promocoes');
  if (!tbody) return;

  if (!_promoLista || _promoLista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="icon">🏷️</div>
        <p>Nenhuma promoção cadastrada.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = _promoLista.map(p => {
    const ativa    = p.ativa
      ? '<span style="color:var(--success);font-weight:600">✅ Ativa</span>'
      : '<span style="color:var(--text-muted)">⏸ Inativa</span>';
    const vigencia = [p.data_inicio, p.data_fim].filter(Boolean).join(' → ') || '—';
    const desconto = _fmtTipoDesconto(p.tipo_desconto, p.valor_desconto);

    return `
    <tr>
      <td><strong>${p.nome}</strong></td>
      <td>${desconto}</td>
      <td style="font-size:12px;color:var(--text-muted)">${vigencia}</td>
      <td>${ativa}</td>
      <td>
        <button class="btn btn-info btn-sm"   onclick="editarPromocao(${p.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="excluirPromocao(${p.id})">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

// Formata o tipo de desconto para exibição na tabela
function _fmtTipoDesconto(tipo, valor) {
  if (tipo === 'percentual')  return `${valor}% de desconto`;
  if (tipo === 'reais')       return `− ${fmtMoeda(valor)}`;
  if (tipo === 'valor_fixo')  return `Valor fixo: ${fmtMoeda(valor)}`;
  return fmtMoeda(valor);
}

// ─── Carregar procedimentos no select do formulário ───────────
async function _promoCarregarProcsNoSelect() {
  if (!_promoProcsCached) {
    _promoProcsCached = await window.api.procedimentos.listar();
  }
  const sel = document.getElementById('promo-regra-proc');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Selecione —</option>' +
    _promoProcsCached.map(p =>
      `<option value="${p.id}" data-tem-variantes="${p.tem_variantes}">${p.nome}</option>`
    ).join('');

  const selVar = document.getElementById('promo-regra-var');
  if (selVar) selVar.innerHTML = '<option value="">— Nenhuma / Qualquer variante —</option>';
}

async function _promoOnProcChange() {
  const sel    = document.getElementById('promo-regra-proc');
  const selVar = document.getElementById('promo-regra-var');
  if (!sel || !selVar) return;

  const opt    = sel.options[sel.selectedIndex];
  const procId = parseInt(sel.value) || null;
  const temVar = opt?.dataset?.temVariantes === '1';

  selVar.innerHTML = '<option value="">— Nenhuma / Qualquer variante —</option>';

  if (procId && temVar) {
    const vars = await window.api.variantes.listar(procId);
    vars.forEach(v => {
      const o = document.createElement('option');
      o.value = v.id;
      o.textContent = `${v.nome} — ${fmtMoeda(v.valor)}`;
      selVar.appendChild(o);
    });
  }
}

// ─── Abrir modal ──────────────────────────────────────────────
async function abrirNovaPromocao() {
  _promoResetModal();
  _promoProcsCached = null;
  await _promoCarregarProcsNoSelect();
  document.getElementById('modal-promo-title').textContent = 'Nova Promoção';
  abrirModal('modal-promocao');
}

async function editarPromocao(id) {
  const p = await window.api.promocoes.buscar(id);
  if (!p) return;

  _promoResetModal();
  _promoProcsCached = null;
  await _promoCarregarProcsNoSelect();

  document.getElementById('modal-promo-title').textContent  = 'Editar Promoção';
  document.getElementById('promo-id').value                 = p.id;
  document.getElementById('promo-nome').value               = p.nome || '';
  document.getElementById('promo-tipo-desconto').value      = p.tipo_desconto || 'percentual';
  document.getElementById('promo-valor-desconto').value     = p.valor_desconto ?? '';
  document.getElementById('promo-modo-itens').value         = p.modo_itens || 'lista_fechada';
  document.getElementById('promo-qtd-min').value            = p.quantidade_min ?? '';
  document.getElementById('promo-ativa').checked            = !!p.ativa;
  document.getElementById('promo-data-inicio').value        = p.data_inicio || '';
  document.getElementById('promo-data-fim').value           = p.data_fim    || '';
  document.getElementById('promo-limite-usos').value        = p.limite_usos ?? '';

  // Atualiza label do campo de valor conforme tipo
  _promoAtualizarLabelValor();

  // Dias da semana
  const dias = typeof p.dias_semana === 'string'
    ? JSON.parse(p.dias_semana || '[]')
    : (p.dias_semana || []);
  document.querySelectorAll('#promo-dias-semana input[type=checkbox]').forEach(cb => {
    cb.checked = dias.includes(parseInt(cb.value));
  });

  // Regras
  _promoRegras = Array.isArray(p.regras) ? p.regras.map(r => ({ ...r })) : [];
  await _promoEnriquecerRegras();
  _renderTbodyRegras();

  abrirModal('modal-promocao');
}

// Atualiza o label do campo valor conforme o tipo selecionado
function _promoAtualizarLabelValor() {
  const tipo  = document.getElementById('promo-tipo-desconto')?.value;
  const label = document.getElementById('promo-label-valor');
  const input = document.getElementById('promo-valor-desconto');
  if (!label || !input) return;
  if (tipo === 'percentual') {
    label.textContent  = 'Percentual de Desconto (%)';
    input.placeholder  = 'Ex: 10 (= 10%)';
  } else if (tipo === 'reais') {
    label.textContent  = 'Valor a Subtrair (R$)';
    input.placeholder  = 'Ex: 50,00';
  } else if (tipo === 'valor_fixo') {
    label.textContent  = 'Valor Fixo Cobrado (R$)';
    input.placeholder  = 'Ex: 200,00';
  }
}

// Enriquece regras salvas com nomes legíveis
async function _promoEnriquecerRegras() {
  for (const r of _promoRegras) {
    if (r._proc_nome) continue;
    const procs = _promoProcsCached || await window.api.procedimentos.listar();
    _promoProcsCached = procs;
    const proc = procs.find(p => p.id === r.procedimento_id);
    r._proc_nome = proc?.nome || `Proc #${r.procedimento_id}`;

    if (r.variante_id) {
      try {
        const vars = await window.api.variantes.listar(r.procedimento_id);
        const v    = vars.find(x => x.id === r.variante_id);
        r._var_nome = v?.nome || `Variante #${r.variante_id}`;
      } catch (_) {
        r._var_nome = `Variante #${r.variante_id}`;
      }
    } else {
      r._var_nome = null;
    }
  }
}

// ─── Regras ───────────────────────────────────────────────────
function _promoResetModal() {
  document.getElementById('promo-id').value              = '';
  document.getElementById('promo-nome').value            = '';
  document.getElementById('promo-tipo-desconto').value   = 'percentual';
  document.getElementById('promo-valor-desconto').value  = '';
  document.getElementById('promo-modo-itens').value      = 'lista_fechada';
  document.getElementById('promo-qtd-min').value         = '';
  document.getElementById('promo-ativa').checked         = true;
  document.getElementById('promo-data-inicio').value     = '';
  document.getElementById('promo-data-fim').value        = '';
  document.getElementById('promo-limite-usos').value     = '';
  document.querySelectorAll('#promo-dias-semana input[type=checkbox]').forEach(cb => cb.checked = false);
  _promoAtualizarLabelValor();
  _promoRegras = [];
  _renderTbodyRegras();
}

function _renderTbodyRegras() {
  const tbody = document.getElementById('promo-regras-tbody');
  if (!tbody) return;

  if (_promoRegras.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-muted);font-size:12px;text-align:center;padding:10px">
      Nenhum item adicionado ainda.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = _promoRegras.map((r, i) => `
    <tr>
      <td style="font-size:13px">${r._proc_nome || '—'}</td>
      <td style="font-size:13px;color:var(--text-muted)">${r._var_nome || '<em>Qualquer variante</em>'}</td>
      <td style="text-align:center;font-size:13px">${r.quantidade ?? 1}</td>
      <td><button class="btn btn-danger btn-sm" onclick="_promoRemoverRegra(${i})">✕</button></td>
    </tr>`).join('');
}

async function _promoAdicionarRegra() {
  const selProc = document.getElementById('promo-regra-proc');
  const selVar  = document.getElementById('promo-regra-var');
  const qtd     = parseInt(document.getElementById('promo-regra-qtd').value) || 1;

  const procId  = parseInt(selProc.value) || null;
  const varId   = parseInt(selVar.value)  || null;

  if (!procId) { toast('Selecione um procedimento.', 'error'); return; }

  const procOpt = selProc.options[selProc.selectedIndex];
  const varOpt  = selVar.options[selVar.selectedIndex];

  // Infere tipo_regra com base na seleção: se há variante → 'variante'; se há proc → 'procedimento'
  const tipoRegra = varId ? 'variante' : 'procedimento';

  _promoRegras.push({
    tipo_regra:      tipoRegra,
    procedimento_id: procId,
    variante_id:     varId || null,
    quantidade:      qtd,
    _proc_nome:      procOpt?.text || `Proc #${procId}`,
    _var_nome:       varId ? (varOpt?.text || `Variante #${varId}`) : null,
  });

  _renderTbodyRegras();

  selProc.value = '';
  selVar.innerHTML = '<option value="">— Nenhuma / Qualquer variante —</option>';
  document.getElementById('promo-regra-qtd').value = '1';
}

function _promoRemoverRegra(idx) {
  _promoRegras.splice(idx, 1);
  _renderTbodyRegras();
}

// ─── Salvar ───────────────────────────────────────────────────
async function salvarPromocao() {
  const nome = document.getElementById('promo-nome').value.trim();
  if (!nome) { toast('Informe o nome da promoção.', 'error'); return; }

  const diasChecados = [];
  document.querySelectorAll('#promo-dias-semana input[type=checkbox]:checked').forEach(cb => {
    diasChecados.push(parseInt(cb.value));
  });

  const payload = {
    id:             document.getElementById('promo-id').value || null,
    nome,
    tipo_desconto:  document.getElementById('promo-tipo-desconto').value,
    valor_desconto: parseFloat(document.getElementById('promo-valor-desconto').value) || 0,
    modo_itens:     document.getElementById('promo-modo-itens').value,
    quantidade_min: parseInt(document.getElementById('promo-qtd-min').value)    || null,
    ativa:          document.getElementById('promo-ativa').checked ? 1 : 0,
    data_inicio:    document.getElementById('promo-data-inicio').value || null,
    data_fim:       document.getElementById('promo-data-fim').value    || null,
    dias_semana:    JSON.stringify(diasChecados),
    limite_usos:    parseInt(document.getElementById('promo-limite-usos').value) || null,
    regras:         _promoRegras.map(({ _proc_nome, _var_nome, ...r }) => r),
  };

  try {
    await window.api.promocoes.salvar(payload);
    fecharModal('modal-promocao');
    toast('Promoção salva!', 'success');
    await _carregarPromocoes();
  } catch (e) {
    toast('Erro ao salvar promoção.', 'error');
    console.error(e);
  }
}

// ─── Excluir ──────────────────────────────────────────────────
async function excluirPromocao(id) {
  if (!confirm('Excluir esta promoção?')) return;
  try {
    await window.api.promocoes.excluir(id);
    toast('Promoção excluída.', 'info');
    await _carregarPromocoes();
  } catch (e) {
    toast('Erro ao excluir.', 'error');
  }
}
