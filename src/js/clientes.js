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
  modal.querySelector('.tab-btn[data-tab="tab-dados"]').classList.add('active');
  modal.querySelector('#tab-dados').classList.remove('hidden');

  // limpar form
  modal.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
    else el.value = '';
  });
  document.getElementById('cli-id').value = '';
  document.getElementById('cli-modal-title').textContent = 'Novo Cliente';

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
  document.getElementById('cli-modal-title').textContent = 'Editar Cliente';
  document.getElementById('cli-id').value = c.id;
  _set('cli-nome', c.nome); _set('cli-nasc', c.data_nascimento?.substring(0,10));
  _set('cli-cpf', c.cpf);   _set('cli-email', c.email);
  _set('cli-tel', c.telefone); _set('cli-cel', c.celular);
  _set('cli-end', c.endereco); _set('cli-cid', c.cidade); _set('cli-uf', c.uf);
  _set('cli-obs', c.observacoes);
  _setCheck('cli-termo', c.termo_assinado);

  // areas
  _setCheck('dep-cera', c.metodo_dep_cera); _setCheck('dep-lamina', c.metodo_dep_lamina);
  _setCheck('dep-laser', c.metodo_dep_laser);
  _setCheck('prob-enc', c.prob_encravamento); _setCheck('prob-man', c.prob_manchas);
  _setCheck('prob-out', c.prob_outros); _set('cli-areas', c.areas_tratar);

  // saúde
  _setCheck('med-uso', c.medicamento_uso); _set('med-qual', c.medicamento_qual);
  _setCheck('cli-roacutan', c.roacutan); _setCheck('cli-vitiligo', c.tto_vitiligo);
  _setCheck('ali-med', c.alergia_medicamento); _set('ali-qual', c.alergia_qual);
  _setCheck('tto-derm', c.tratamento_dermato); _set('tto-derm-qual', c.tratamento_dermato_qual);
  _setCheck('cli-acidos', c.usa_acidos);
  _setCheck('cli-cirurgia', c.cirurgia); _set('cli-cirurgia-qual', c.cirurgia_qual);
  _setCheck('cli-antico', c.anticoncepcional); _set('cli-antico-qual', c.anticoncepcional_qual);
  _setCheck('cli-onco', c.historico_oncologico); _set('cli-onco-qual', c.oncologico_qual);
  _setCheck('cli-acomp', c.acompanhamento_medico); _set('cli-acomp-qual', c.acompanhamento_qual);
  _setCheck('cli-epilepsia', c.epilepsia); _setCheck('cli-hormonal', c.alteracao_hormonal);
  _set('cli-hormonal-qual', c.hormonal_qual);
  _setCheck('cli-hirsutismo', c.hirsutismo); _setCheck('cli-gestante', c.gestante);
  _setCheck('cli-herpes', c.herpes); _setCheck('cli-lactante', c.lactante);

  // físico/pele (agora dentro da aba Saúde)
  _setRadio('r-olhos', c.cor_olhos); _setRadio('r-cabelos', c.cor_cabelos);
  _setRadio('r-pelos', c.cor_pelos);
  _setCheck('cli-sol', c.tomou_sol); _set('cli-sol-quando', c.sol_quando);

  // laser
  const temLaser = !!c.metodo_dep_laser;
  document.getElementById('tab-btn-laser').style.display = temLaser ? '' : 'none';
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
  const temLaser = document.getElementById('dep-laser').checked;

  const dados = {
    id:               id ? parseInt(id) : undefined,
    nome:             document.getElementById('cli-nome').value.trim(),
    data_nascimento:  document.getElementById('cli-nasc').value || null,
    cpf:              document.getElementById('cli-cpf').value.trim(),
    email:            document.getElementById('cli-email').value.trim(),
    telefone:         document.getElementById('cli-tel').value.trim(),
    celular:          document.getElementById('cli-cel').value.trim(),
    endereco:         document.getElementById('cli-end').value.trim(),
    cidade:           document.getElementById('cli-cid').value.trim(),
    uf:               document.getElementById('cli-uf').value.trim(),
    areas_tratar:     document.getElementById('cli-areas').value.trim(),
    metodo_dep_cera:  document.getElementById('dep-cera').checked ? 1 : 0,
    metodo_dep_lamina:document.getElementById('dep-lamina').checked ? 1 : 0,
    metodo_dep_laser: temLaser ? 1 : 0,
    prob_encravamento:document.getElementById('prob-enc').checked ? 1 : 0,
    prob_manchas:     document.getElementById('prob-man').checked ? 1 : 0,
    prob_outros:      document.getElementById('prob-out').checked ? 1 : 0,
    // saúde
    medicamento_uso:       document.getElementById('med-uso').checked ? 1 : 0,
    medicamento_qual:      document.getElementById('med-qual').value.trim(),
    roacutan:              document.getElementById('cli-roacutan').checked ? 1 : 0,
    tto_vitiligo:          document.getElementById('cli-vitiligo').checked ? 1 : 0,
    alergia_medicamento:   document.getElementById('ali-med').checked ? 1 : 0,
    alergia_qual:          document.getElementById('ali-qual').value.trim(),
    tratamento_dermato:    document.getElementById('tto-derm').checked ? 1 : 0,
    tratamento_dermato_qual:document.getElementById('tto-derm-qual').value.trim(),
    usa_acidos:            document.getElementById('cli-acidos').checked ? 1 : 0,
    cirurgia:              document.getElementById('cli-cirurgia').checked ? 1 : 0,
    cirurgia_qual:         document.getElementById('cli-cirurgia-qual').value.trim(),
    anticoncepcional:      document.getElementById('cli-antico').checked ? 1 : 0,
    anticoncepcional_qual: document.getElementById('cli-antico-qual').value.trim(),
    historico_oncologico:  document.getElementById('cli-onco').checked ? 1 : 0,
    oncologico_qual:       document.getElementById('cli-onco-qual').value.trim(),
    acompanhamento_medico: document.getElementById('cli-acomp').checked ? 1 : 0,
    acompanhamento_qual:   document.getElementById('cli-acomp-qual').value.trim(),
    epilepsia:             document.getElementById('cli-epilepsia').checked ? 1 : 0,
    alteracao_hormonal:    document.getElementById('cli-hormonal').checked ? 1 : 0,
    hormonal_qual:         document.getElementById('cli-hormonal-qual').value.trim(),
    hirsutismo:            document.getElementById('cli-hirsutismo').checked ? 1 : 0,
    gestante:              document.getElementById('cli-gestante').checked ? 1 : 0,
    herpes:                document.getElementById('cli-herpes').checked ? 1 : 0,
    lactante:              document.getElementById('cli-lactante').checked ? 1 : 0,
    // físico/pele (agora na aba Saúde)
    cor_olhos:   _radioVal('r-olhos'),
    cor_cabelos: _radioVal('r-cabelos'),
    cor_pelos:   _radioVal('r-pelos'),
    tomou_sol:   document.getElementById('cli-sol').checked ? 1 : 0,
    sol_quando:  document.getElementById('cli-sol-quando').value.trim(),
    fitzpatrick: 0, // gerenciado pelo prontuário
    termo_assinado: document.getElementById('cli-termo').checked ? 1 : 0,
    observacoes:    document.getElementById('cli-obs').value.trim(),
  };

  if (!dados.nome) { toast('Nome é obrigatório', 'error'); return; }

  try {
    const resp = await window.api.clientes.salvar(dados);
    const cid  = resp.id || parseInt(id);

    if (temLaser) {
      const procIds = [...document.querySelectorAll('.laser-proc-cb:checked')].map(el => parseInt(el.value));
      const varIds  = [...document.querySelectorAll('.laser-var-cb:checked')].map(el => parseInt(el.value));
      await Promise.all([
        window.api.clienteProc.salvar(cid, procIds),
        window.api.clienteVariantes.salvar(cid, varIds),
      ]);
    }

    fecharModal('modal-cliente');
    toast('Cliente salvo!', 'success');
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
    toast('Erro: ' + e.message, 'error');
  }
}
