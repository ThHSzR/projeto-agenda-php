// clientes.js

let _clientesLista = [];

async function carregarClientes() {
  _clientesLista = await window.api.clientes.listar();
  renderClientes(_clientesLista);
}

function renderClientes(lista) {
  document.getElementById('section-clientes').innerHTML = `
    <div class="section-header">
      <h2>Clientes</h2>
      <button class="btn btn-primary" onclick="abrirFormCliente()">+ Novo Cliente</button>
    </div>
    <div class="toolbar">
      <input type="text" id="busca-cliente" placeholder="🔍 Buscar por nome..." oninput="filtrarClientes()"/>
    </div>
    <div class="card">
      <table>
        <thead>
         <tr><th>Nome</th><th>Telefone</th><th>Nascimento</th><th>Ações</th></tr></thead>
        <tbody id="tbody-clientes">
          ${lista.length === 0
      ? `<tr><td colspan="5"><div class="empty-state"><div class="icon">👤</div><p>Nenhum cliente cadastrado.</p></div></td></tr>`
      : lista.map(c => `
              <tr data-nome="${c.nome.toLowerCase()}">
                <td><strong>${c.nome}</strong></td>
                <td>${c.telefone || '-'}</td>
                <td>${fmtData(c.data_nascimento)}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="abrirProntuario(${c.id}, '${c.nome.replace(/'/g, "'")}')">&#x1F4CB; Prontuário</button>
                  <button class="btn btn-info btn-sm" onclick="editarCliente(${c.id})">✏️ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="excluirCliente(${c.id})">🗑️</button>
                  <button class="btn btn-whatsapp btn-sm"
                    onclick="abrirWhatsApp('${c.telefone}', null)"
                    title="Abrir WhatsApp">
                    💬
                    </button>
                  </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function filtrarClientes() {
  const q = document.getElementById('busca-cliente').value.toLowerCase();
  document.querySelectorAll('#tbody-clientes tr[data-nome]').forEach(tr => {
    tr.style.display = tr.dataset.nome.includes(q) ? '' : 'none';
  });
}

function abrirFormCliente(preenchido) {
  const modal = document.getElementById('modal-cliente');
  modal.classList.remove('hidden');
  modal.querySelector('.modal-body').scrollTop = 0;
  // resetar abas
  modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  modal.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  modal.querySelector('.tab-btn[data-tab="tab-dados"]')?.classList.add('active');
  modal.querySelector('#tab-dados')?.classList.remove('hidden');

  // ativar primeira aba manualmente (caso sem data-tab)
  const firstTabBtn = modal.querySelector('.tab-btn');
  const firstTabPanel = modal.querySelector('.tab-content');
  if (firstTabBtn) firstTabBtn.classList.add('active');
  if (firstTabPanel) firstTabPanel.classList.remove('hidden');

  // limpar form
  modal.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
    else el.value = '';
  });
  document.getElementById('cli-id').value = '';
  document.getElementById('cli-modal-title') &&
    (document.getElementById('cli-modal-title').textContent = 'Novo Cliente');
  document.getElementById('modal-cliente-title') &&
    (document.getElementById('modal-cliente-title').textContent = 'Nova Ficha de Anamnese');

  if (preenchido) _preencherFormCliente(preenchido);
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}

function _setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function _setRadio(name, val) {
  const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (el) el.checked = true;
}

function _radioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function _preencherFormCliente(c) {
  document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
  document.getElementById('cli-id').value = c.id;
  _set('cli-nome', c.nome); _set('cli-nasc', c.data_nascimento?.substring(0,10));
  _set('cli-cpf', c.cpf);   _set('cli-email', c.email);
  _set('cli-telefone', c.telefone); _set('cli-cel', c.celular);
  _set('cli-endereco', c.endereco); _set('cli-cidade', c.cidade); _set('cli-uf', c.uf);
  _set('cli-obs', c.observacoes);
  _setCheck('cli-termo', c.termo_assinado);

  // saúde
  _setRadio('r-med', c.medicamento_uso ? '1' : '0');
  _set('cli-med-qual', c.medicamento_qual);
  _setRadio('r-roac', c.roacutan ? '1' : '0');
  _setRadio('r-vitil', c.tto_vitiligo ? '1' : '0');
  _setRadio('r-alergia', c.alergia_medicamento ? '1' : '0');
  _set('cli-alergia-qual', c.alergia_qual);
  _setRadio('r-derm', c.tratamento_dermato ? '1' : '0');
  _set('cli-derm-qual', c.tratamento_dermato_qual);
  _setRadio('r-acidos', c.usa_acidos ? '1' : '0');
  _setRadio('r-cir', c.cirurgia ? '1' : '0');
  _set('cli-cir-qual', c.cirurgia_qual);
  _setRadio('r-anti', c.anticoncepcional ? '1' : '0');
  _set('cli-anti-qual', c.anticoncepcional_qual);
  _setRadio('r-onco', c.historico_oncologico ? '1' : '0');
  _set('cli-onco-qual', c.oncologico_qual);
  _setRadio('r-acomp', c.acompanhamento_medico ? '1' : '0');
  _set('cli-acomp-qual', c.acompanhamento_qual);
  _setRadio('r-epil', c.epilepsia ? '1' : '0');
  _setRadio('r-horm', c.alteracao_hormonal ? '1' : '0');
  _set('cli-horm-qual', c.hormonal_qual);
  _setRadio('r-hirsu', c.hirsutismo ? '1' : '0');
  _setRadio('r-gest', c.gestante ? '1' : '0');
  _setRadio('r-herpes', c.herpes ? '1' : '0');
  _setRadio('r-lact', c.lactante ? '1' : '0');

  // físico/pele (agora dentro da aba Saúde)
  _set('cli-olhos', c.cor_olhos);
  _set('cli-cabelos', c.cor_cabelos);
  _set('cli-pelos', c.cor_pelos);
  _setRadio('r-sol', c.tomou_sol ? '1' : '0');
  _set('cli-sol-quando', c.sol_quando);

  // laser
  const temLaser = !!c.metodo_dep_laser;
  const tabBtnLaser = document.getElementById('tab-btn-laser');
  if (tabBtnLaser) tabBtnLaser.style.display = temLaser ? '' : 'none';
  if (temLaser) _preencherInteresses(c.id);
}

async function _preencherInteresses(clienteId) {
  try {
    const [procIds, varIds] = await Promise.all([
      window.api.clienteProc.listar(clienteId),
      window.api.clienteVariantes.listar(clienteId),
    ]);
    procIds.forEach(id => {
      const cb = document.getElementById(`laser-proc-${id}`);
      if (cb) cb.checked = true;
    });
    varIds.forEach(id => {
      const cb = document.getElementById(`laser-var-${id}`);
      if (cb) cb.checked = true;
    });
  } catch (e) {}
}

async function editarCliente(id) {
  try {
    const c = await window.api.clientes.buscar(id);
    abrirFormCliente(c);
  } catch (e) {
    toast('Erro ao carregar cliente', 'error');
  }
}

async function salvarCliente() {
  const id = document.getElementById('cli-id').value;
  const temLaser = document.getElementById('dep-laser')?.checked;

  const dados = {
    id:               id ? parseInt(id) : undefined,
    nome:             document.getElementById('cli-nome').value.trim(),
    data_nascimento:  document.getElementById('cli-nasc').value || null,
    cpf:              document.getElementById('cli-cpf')?.value.trim(),
    email:            document.getElementById('cli-email')?.value.trim(),
    telefone:         document.getElementById('cli-telefone').value.trim(),
    celular:          document.getElementById('cli-cel')?.value.trim(),
    endereco:         document.getElementById('cli-endereco')?.value.trim(),
    cidade:           document.getElementById('cli-cidade')?.value.trim(),
    uf:               document.getElementById('cli-uf')?.value.trim(),
    areas_tratar:     document.getElementById('cli-areas')?.value.trim(),
    metodo_dep_cera:  document.getElementById('dep-cera')?.checked ? 1 : 0,
    metodo_dep_lamina:document.getElementById('dep-lamina')?.checked ? 1 : 0,
    metodo_dep_laser: temLaser ? 1 : 0,
    prob_encravamento:document.getElementById('prob-enc')?.checked ? 1 : 0,
    prob_manchas:     document.getElementById('prob-man')?.checked ? 1 : 0,
    prob_outros:      document.getElementById('prob-out')?.checked ? 1 : 0,
    // saúde
    medicamento_uso:        _radioVal('r-med') === '1' ? 1 : 0,
    medicamento_qual:       document.getElementById('cli-med-qual')?.value.trim(),
    roacutan:               _radioVal('r-roac') === '1' ? 1 : 0,
    tto_vitiligo:           _radioVal('r-vitil') === '1' ? 1 : 0,
    alergia_medicamento:    _radioVal('r-alergia') === '1' ? 1 : 0,
    alergia_qual:           document.getElementById('cli-alergia-qual')?.value.trim(),
    tratamento_dermato:     _radioVal('r-derm') === '1' ? 1 : 0,
    tratamento_dermato_qual:document.getElementById('cli-derm-qual')?.value.trim(),
    usa_acidos:             _radioVal('r-acidos') === '1' ? 1 : 0,
    cirurgia:               _radioVal('r-cir') === '1' ? 1 : 0,
    cirurgia_qual:          document.getElementById('cli-cir-qual')?.value.trim(),
    anticoncepcional:       _radioVal('r-anti') === '1' ? 1 : 0,
    anticoncepcional_qual:  document.getElementById('cli-anti-qual')?.value.trim(),
    historico_oncologico:   _radioVal('r-onco') === '1' ? 1 : 0,
    oncologico_qual:        document.getElementById('cli-onco-qual')?.value.trim(),
    acompanhamento_medico:  _radioVal('r-acomp') === '1' ? 1 : 0,
    acompanhamento_qual:    document.getElementById('cli-acomp-qual')?.value.trim(),
    epilepsia:              _radioVal('r-epil') === '1' ? 1 : 0,
    alteracao_hormonal:     _radioVal('r-horm') === '1' ? 1 : 0,
    hormonal_qual:          document.getElementById('cli-horm-qual')?.value.trim(),
    hirsutismo:             _radioVal('r-hirsu') === '1' ? 1 : 0,
    gestante:               _radioVal('r-gest') === '1' ? 1 : 0,
    herpes:                 _radioVal('r-herpes') === '1' ? 1 : 0,
    lactante:               _radioVal('r-lact') === '1' ? 1 : 0,
    // físico/pele (agora na aba Saúde)
    cor_olhos:   document.getElementById('cli-olhos')?.value || null,
    cor_cabelos: document.getElementById('cli-cabelos')?.value || null,
    cor_pelos:   document.getElementById('cli-pelos')?.value || null,
    tomou_sol:   _radioVal('r-sol') === '1' ? 1 : 0,
    sol_quando:  document.getElementById('cli-sol-quando')?.value.trim(),
    // fitzpatrick gerenciado pelo prontuário
    fitzpatrick: 0,
    termo_assinado: document.getElementById('cli-termo')?.checked ? 1 : 0,
    observacoes: document.getElementById('cli-obs')?.value.trim(),
  };

  if (!dados.nome) { toast('Nome é obrigatório', 'error'); return; }
  if (!dados.telefone) { toast('Telefone é obrigatório', 'error'); return; }

  try {
    const res = await window.api.clientes.salvar(dados);
    const clienteId = res.id || parseInt(id);

    if (temLaser) {
      const procIds = [...document.querySelectorAll('#cli-proc-interesse-list input[type=checkbox]:checked')]
        .map(el => parseInt(el.dataset.procId)).filter(Boolean);
      const varIds = [...document.querySelectorAll('#cli-proc-interesse-list input[type=checkbox][data-var-id]:checked')]
        .map(el => parseInt(el.dataset.varId)).filter(Boolean);
      await window.api.clienteProc.salvar({ clienteId, procedimentoIds: procIds });
      if (varIds.length) await window.api.clienteVariantes.salvar({ clienteId, varianteIds: varIds });
    }

    fecharModal('modal-cliente');
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
    await carregarClientes();
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
  }
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return;
  try {
    await window.api.clientes.excluir(id);
    toast('Cliente excluído.', 'info');
    await carregarClientes();
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
}