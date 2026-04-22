// ── helpers ──────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.remove('hidden');
  btn.classList.add('active');
}

function _v(id) { const e = document.getElementById(id); return e ? e.value : ''; }
function _set(id, val) { const e = document.getElementById(id); if (e) e.value = val || ''; }
function _chk(id) { const e = document.getElementById(id); return e && e.checked ? 1 : 0; }
function _setChk(id, val) { const e = document.getElementById(id); if (e) e.checked = !!val; }

function _radioVal(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseInt(el.value) : 0;
}
function _setRadio(name, val) {
  const el = document.querySelector(`input[name="${name}"][value="${val ? 1 : 0}"]`);
  if (el) el.checked = true;
}

// ── helpers de checkboxes ─────────────────────────────────────
function _getCheckedIds(containerSelector) {
  return [...document.querySelectorAll(`${containerSelector} input[type=checkbox]:checked`)]
    .map(cb => parseInt(cb.value));
}

function _toggleFitzUI() {
  const temLaser = !!document.querySelector('#cli-proc-interesse-list input[data-laser="1"]:checked');
  document.getElementById('cli-fitz-section').classList.toggle('hidden', !temLaser);
}

// ── render lista ──────────────────────────────────────────────
async function renderClientes() {
  const lista = await window.api.clientes.listar();
  const page = document.getElementById('page-clientes');

  page.innerHTML = `
    <div class="page-header">
      <h1>👤 Clientes</h1>
      <button class="btn btn-primary" onclick="abrirNovoCliente()">+ Nova Ficha</button>
    </div>
    <div class="search-bar">
      <input type="text" id="busca-cliente" placeholder="🔍 Buscar por nome..." oninput="filtrarClientes()"/>
    </div>
    <div class="card">
      <table>
        <thead>
         <tr><th>Nome</th><th>Telefone</th><th>Nascimento</th><th>Fitzpatrick</th><th>Ações</th></tr></thead>
        <tbody id="tbody-clientes">
          ${lista.length === 0
      ? `<tr><td colspan="6"><div class="empty-state"><div class="icon">👤</div><p>Nenhum cliente cadastrado.</p></div></td></tr>`
      : lista.map(c => `
              <tr data-nome="${c.nome.toLowerCase()}">
                <td><strong>${c.nome}</strong></td>
                <td>${c.telefone || '-'}</td>
                <td>${fmtData(c.data_nascimento)}</td>
                <td>${c.fitzpatrick ? 'Tipo ' + c.fitzpatrick : '-'}</td>
                <td>
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

// ── popular checkboxes de procedimentos ───────────────────────
async function _popularProcs() {
  const procs = await window.api.procedimentos.todos();

  const listProc = document.getElementById('cli-proc-interesse-list');
  listProc.innerHTML = procs.map(p => `
    <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--border);border-radius:20px;cursor:pointer">
      <input type="checkbox" value="${p.id}" data-laser="${p.is_laser || 0}"
        onchange="_toggleFitzUI()"/>
      ${p.nome}
    </label>
  `).join('');
}

// ── resetar formulário ────────────────────────────────────────
function _resetForm() {
  _set('cli-id', '');
  ['cli-nome', 'cli-nasc', 'cli-cpf', 'cli-telefone',
    'cli-endereco', 'cli-cidade', 'cli-uf', 'cli-prob-outros',
    'cli-med-qual', 'cli-alergia-qual', 'cli-derm-qual', 'cli-cir-qual',
    'cli-anti-qual', 'cli-onco-qual', 'cli-acomp-qual', 'cli-horm-qual',
    'cli-obs', 'cli-sol-quando'
  ].forEach(id => _set(id, ''));

  // NOVO: reseta os selects para "Selecione"
  ['cli-olhos', 'cli-cabelos', 'cli-pelos'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  ['r-med', 'r-roac', 'r-vitil', 'r-alergia', 'r-derm', 'r-acidos',
    'r-cir', 'r-anti', 'r-onco', 'r-acomp', 'r-epil', 'r-horm',
    'r-hirsu', 'r-gest', 'r-lact', 'r-herpes', 'r-sol'
  ].forEach(name => _setRadio(name, 0));

  document.querySelectorAll('input[name="r-fitz"]').forEach(r => r.checked = false);
  document.querySelectorAll('#cli-proc-interesse-list input').forEach(cb => cb.checked = false);
  _toggleFitzUI();
}

// ── abrir novo ────────────────────────────────────────────────
async function abrirNovoCliente() {
  document.getElementById('modal-cliente-title').textContent = 'Nova Ficha de Anamnese';
  await _popularProcs();
  _resetForm();
  switchTab('tab-dados', document.querySelector('.tab-btn'));
  abrirModal('modal-cliente');
}

// ── editar ────────────────────────────────────────────────────
async function editarCliente(id) {
  const c = await window.api.clientes.buscar(id);
  document.getElementById('modal-cliente-title').textContent = 'Editar Ficha — ' + c.nome;

  await _popularProcs();
  _resetForm();

  // aba 1
  _set('cli-id', c.id);
  _set('cli-nome', c.nome);
  _set('cli-nasc', c.data_nascimento);
  _set('cli-cpf', c.cpf);
  _set('cli-email', c.email);
  _set('cli-telefone', c.telefone);
  _set('cli-celular', c.celular);
  _set('cli-endereco', c.endereco);
  _set('cli-cidade', c.cidade);
  _set('cli-uf', c.uf);

  // aba 2 — procedimentos de interesse
  const procIds = await window.api.clienteProc.getInteresse(id);
  procIds.forEach(pid => {
    const cb = document.querySelector(`#cli-proc-interesse-list input[value="${pid}"]`);
    if (cb) cb.checked = true;
  });
  _toggleFitzUI();

  // aba 3
  _setRadio('r-med', c.medicamento_uso); _set('cli-med-qual', c.medicamento_qual);
  _setRadio('r-roac', c.roacutan);
  _setRadio('r-vitil', c.tto_vitiligo);
  _setRadio('r-alergia', c.alergia_medicamento); _set('cli-alergia-qual', c.alergia_qual);
  _setRadio('r-derm', c.tratamento_dermato); _set('cli-derm-qual', c.tratamento_dermato_qual);
  _setRadio('r-acidos', c.usa_acidos);
  _setRadio('r-cir', c.cirurgia); _set('cli-cir-qual', c.cirurgia_qual);
  _setRadio('r-anti', c.anticoncepcional); _set('cli-anti-qual', c.anticoncepcional_qual);
  _setRadio('r-onco', c.historico_oncologico); _set('cli-onco-qual', c.oncologico_qual);
  _setRadio('r-acomp', c.acompanhamento_medico); _set('cli-acomp-qual', c.acompanhamento_qual);
  _setRadio('r-epil', c.epilepsia);
  _setRadio('r-horm', c.alteracao_hormonal); _set('cli-horm-qual', c.hormonal_qual);
  _setRadio('r-hirsu', c.hirsutismo);
  _setRadio('r-gest', c.gestante);
  _setRadio('r-lact', c.lactante);
  _setRadio('r-herpes', c.herpes);
  _set('cli-obs', c.observacoes);

  // aba 4
  _set('cli-olhos', c.cor_olhos);
  _set('cli-cabelos', c.cor_cabelos);
  _set('cli-pelos', c.cor_pelos);
  _setRadio('r-sol', c.tomou_sol);
  _set('cli-sol-quando', c.sol_quando);
  if (c.fitzpatrick) {
    const fe = document.querySelector(`input[name="r-fitz"][value="${c.fitzpatrick}"]`);
    if (fe) fe.checked = true;
  }

  switchTab('tab-dados', document.querySelector('.tab-btn'));
  abrirModal('modal-cliente');
}

// ── salvar ────────────────────────────────────────────────────
async function salvarCliente() {
  const nome = _v('cli-nome').trim();
  if (!nome) { toast('Nome é obrigatório', 'error'); return; }
  if (!_v('cli-cpf').trim()) { toast('CPF é obrigatório', 'error'); return; }
  if (!_v('cli-telefone').trim()) { toast('Telefone é obrigatório', 'error'); return; }

  // CORRIGIDO: declarar temLaser aqui
  const temLaser = !!document.querySelector('#cli-proc-interesse-list input[data-laser="1"]:checked');

  const dados = {
    id: _v('cli-id') || null,
    nome,
    data_nascimento: _v('cli-nasc'),
    cpf: _v('cli-cpf'),
    email: '',
    telefone: _v('cli-telefone'),
    celular: '',
    endereco: _v('cli-endereco'),
    cidade: _v('cli-cidade'),
    uf: _v('cli-uf'),
    areas_tratar: '',
    metodo_dep_cera: 0, metodo_dep_lamina: 0, metodo_dep_laser: 0,
    prob_encravamento: 0, prob_manchas: 0, prob_outros: '',
    medicamento_uso: _radioVal('r-med'),
    medicamento_qual: _v('cli-med-qual'),
    roacutan: _radioVal('r-roac'),
    tto_vitiligo: _radioVal('r-vitil'),
    alergia_medicamento: _radioVal('r-alergia'),
    alergia_qual: _v('cli-alergia-qual'),
    tratamento_dermato: _radioVal('r-derm'),
    tratamento_dermato_qual: _v('cli-derm-qual'),
    usa_acidos: _radioVal('r-acidos'),
    cirurgia: _radioVal('r-cir'),
    cirurgia_qual: _v('cli-cir-qual'),
    anticoncepcional: _radioVal('r-anti'),
    anticoncepcional_qual: _v('cli-anti-qual'),
    historico_oncologico: _radioVal('r-onco'),
    oncologico_qual: _v('cli-onco-qual'),
    acompanhamento_medico: _radioVal('r-acomp'),
    acompanhamento_qual: _v('cli-acomp-qual'),
    epilepsia: _radioVal('r-epil'),
    alteracao_hormonal: _radioVal('r-horm'),
    hormonal_qual: _v('cli-horm-qual'),
    hirsutismo: _radioVal('r-hirsu'),
    gestante: _radioVal('r-gest'),
    herpes: _radioVal('r-herpes'),
    lactante: _radioVal('r-lact'),
    cor_olhos: _v('cli-olhos'),
    cor_cabelos: _v('cli-cabelos'),
    cor_pelos: _v('cli-pelos'),
    tomou_sol: _radioVal('r-sol'),
    sol_quando: _v('cli-sol-quando'),
    fitzpatrick: temLaser ? _radioVal('r-fitz') : 0,
    termo_assinado: 0,
    observacoes: _v('cli-obs'),
  };

  await window.api.clientes.salvar(dados);
  const clienteId = dados.id || await _getLastInsertedClienteId();

  const procIds = _getCheckedIds('#cli-proc-interesse-list');
  await window.api.clienteProc.salvarInteresse({ clienteId, procedimentoIds: procIds });

  fecharModal('modal-cliente');
  toast('Ficha salva com sucesso!', 'success');
  renderClientes();
}

async function _getLastInsertedClienteId() {
  const lista = await window.api.clientes.listar();
  return lista[lista.length - 1]?.id;
}

// ── excluir ───────────────────────────────────────────────────
async function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  await window.api.clientes.excluir(id);
  toast('Cliente excluído.', 'info');
  renderClientes();
}