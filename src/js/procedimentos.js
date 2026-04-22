async function renderProcedimentos() {
  const lista = await window.api.procedimentos.todos();
  const page  = document.getElementById('page-procedimentos');

  page.innerHTML = `
    <div class="page-header">
      <h1>💆 Procedimentos</h1>
      <button class="btn btn-primary" onclick="abrirNovoProcedimento()">+ Novo Procedimento</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr><th>Nome</th><th>Duração / Variantes</th><th>Valor Padrão</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${lista.length === 0
            ? `<tr><td colspan="5"><div class="empty-state"><div class="icon">💆</div><p>Nenhum procedimento cadastrado.</p></div></td></tr>`
            : lista.map(p => `
              <tr>
                <td>
                  <strong>${p.nome}</strong>
                  ${p.descricao ? `<br><small style="color:var(--text-muted)">${p.descricao}</small>` : ''}
                </td>
                <td>${p.tem_variantes ? '<em style="color:var(--text-muted)">Ver variantes</em>' : p.duracao_min + ' min'}</td>
                <td>${p.tem_variantes ? '—' : fmtMoeda(p.valor)}</td>
                <td><span class="badge ${p.ativo ? 'badge-concluido' : 'badge-cancelado'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                  <button class="btn btn-info btn-sm" onclick="editarProcedimento(${p.id})">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="inativarProcedimento(${p.id})">${p.ativo ? '🚫 Inativar' : '✅ Ativar'}</button>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── variantes em memória (editadas no modal antes de salvar) ──
let _variantesTemp = [];

function _renderVariantesTemp() {
  const tbody = document.getElementById('variantes-tbody');
  if (!tbody) return;
  if (_variantesTemp.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhuma variante adicionada.</td></tr>`;
    return;
  }
  tbody.innerHTML = _variantesTemp.map((v, i) => `
    <tr>
      <td>${v.nome}</td>
      <td>${v.descricao || '—'}</td>
      <td>${v.duracao_min} min</td>
      <td>${fmtMoeda(v.valor)}</td>
      <td>
        <button class="btn btn-info btn-sm" onclick="_editarVarianteTemp(${i})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="_removerVarianteTemp(${i})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function _editarVarianteTemp(i) {
  const v = _variantesTemp[i];
  document.getElementById('var-idx').value    = i;
  document.getElementById('var-nome').value   = v.nome;
  document.getElementById('var-desc').value   = v.descricao || '';
  document.getElementById('var-dur').value    = v.duracao_min;
  document.getElementById('var-valor').value  = v.valor;
}

function _removerVarianteTemp(i) {
  _variantesTemp.splice(i, 1);
  _renderVariantesTemp();
}

function _adicionarOuEditarVariante() {
  const idx   = document.getElementById('var-idx').value;
  const nome  = document.getElementById('var-nome').value.trim();
  if (!nome) { toast('Nome da variante é obrigatório', 'error'); return; }
  const v = {
    nome,
    descricao:   document.getElementById('var-desc').value.trim(),
    duracao_min: parseInt(document.getElementById('var-dur').value)  || 30,
    valor:       parseFloat(document.getElementById('var-valor').value) || 0,
    ativo: 1,
  };
  if (idx !== '' && _variantesTemp[parseInt(idx)]?.id)
    v.id = _variantesTemp[parseInt(idx)].id;

  if (idx !== '') {
    _variantesTemp[parseInt(idx)] = v;
  } else {
    _variantesTemp.push(v);
  }
  ['var-idx','var-nome','var-desc','var-dur','var-valor'].forEach(id => {
    const e = document.getElementById(id); if (e) e.value = id === 'var-dur' ? '30' : '';
  });
  _renderVariantesTemp();
}

function _toggleVariantes() {
  const temVar = document.getElementById('proc-tem-variantes').checked;
  document.getElementById('proc-campos-fixos').classList.toggle('hidden', temVar);
  document.getElementById('proc-campos-variantes').classList.toggle('hidden', !temVar);
}

function abrirNovoProcedimento() {
  document.getElementById('modal-proc-title').textContent = 'Novo Procedimento';
  document.getElementById('proc-id').value      = '';
  document.getElementById('proc-nome').value    = '';
  document.getElementById('proc-duracao').value = '60';
  document.getElementById('proc-valor').value   = '';
  document.getElementById('proc-desc').value    = '';
  document.getElementById('proc-tem-variantes').checked = false;
  _variantesTemp = [];
  _toggleVariantes();
  _renderVariantesTemp();
  abrirModal('modal-procedimento');
}

async function editarProcedimento(id) {
  const lista = await window.api.procedimentos.todos();
  const p = lista.find(x => x.id === id);
  if (!p) return;

  document.getElementById('modal-proc-title').textContent = 'Editar Procedimento';
  document.getElementById('proc-id').value      = p.id;
  document.getElementById('proc-nome').value    = p.nome;
  document.getElementById('proc-duracao').value = p.duracao_min;
  document.getElementById('proc-valor').value   = p.valor;
  document.getElementById('proc-desc').value    = p.descricao || '';
  document.getElementById('proc-tem-variantes').checked = !!p.tem_variantes;

  _variantesTemp = p.tem_variantes
    ? await window.api.variantes.listar(p.id)
    : [];

  _toggleVariantes();
  _renderVariantesTemp();
  abrirModal('modal-procedimento');
}

async function salvarProcedimento() {
  const nome = document.getElementById('proc-nome').value.trim();
  if (!nome) { toast('Nome é obrigatório', 'error'); return; }

  const temVariantes = document.getElementById('proc-tem-variantes').checked;

  if (temVariantes && _variantesTemp.length === 0) {
    toast('Adicione ao menos uma variante.', 'error'); return;
  }

  const procId = await window.api.procedimentos.salvar({
    id:           document.getElementById('proc-id').value || null,
    nome,
    descricao:    document.getElementById('proc-desc').value,
    duracao_min:  parseInt(document.getElementById('proc-duracao').value) || 60,
    valor:        parseFloat(document.getElementById('proc-valor').value) || 0,
    ativo:        1,
    tem_variantes: temVariantes ? 1 : 0,
  });

  if (temVariantes) {
    const variantesAtuais = await window.api.variantes.listar(procId);
    const idsNovos = _variantesTemp.filter(v => v.id).map(v => v.id);
    for (const va of variantesAtuais) {
      if (!idsNovos.includes(va.id))
        await window.api.variantes.excluir(va.id);
    }
    for (const v of _variantesTemp) {
      await window.api.variantes.salvar({ ...v, procedimento_id: procId });
    }
  }

  fecharModal('modal-procedimento');
  toast('Procedimento salvo!', 'success');
  renderProcedimentos();
}

async function inativarProcedimento(id) {
  const lista = await window.api.procedimentos.todos();
  const p = lista.find(x => x.id === id);
  if (!p) return;
  await window.api.procedimentos.salvar({ ...p, ativo: p.ativo ? 0 : 1 });
  toast(p.ativo ? 'Procedimento inativado.' : 'Procedimento ativado.', 'info');
  renderProcedimentos();
}