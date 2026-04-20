// ── helpers ──────────────────────────────────────────────────
function switchTab(id, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.remove('hidden');
  btn.classList.add('active');
}

async function renderClientes() {
  const lista = await window.api.clientes.listar();
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h1>Clientes</h1>
      <button class="btn btn-primary" id="btn-novo-cliente">+ Novo</button>
    </div>

    <div class="card">
      <input id="busca-cliente" class="input" placeholder="Buscar por nome, CPF, telefone..." />
    </div>

    <table class="tabela">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Telefone</th>
          <th>Cidade/UF</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="tbody-clientes"></tbody>
    </table>
  `;

  const tbody = document.getElementById('tbody-clientes');

  function pintar(rows) {
    tbody.innerHTML = rows.map(c => `
      <tr>
        <td>${c.nome || ''}</td>
        <td>${c.cpf || ''}</td>
        <td>${c.telefone || c.celular || ''}</td>
        <td>${[c.cidade || '', c.uf || ''].filter(Boolean).join('/')}</td>
        <td>
          <button class="btn btn-sm btn-ghost" data-id="${c.id}" data-action="editar">Editar</button>
          <button class="btn btn-sm btn-danger" data-id="${c.id}" data-action="excluir">Excluir</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('[data-action="editar"]').forEach(btn =>
      btn.addEventListener('click', () => abrirModalCliente(btn.dataset.id))
    );
    document.querySelectorAll('[data-action="excluir"]').forEach(btn =>
      btn.addEventListener('click', () => excluirCliente(btn.dataset.id))
    );
  }

  async function excluirCliente(id) {
    if (!await confirmar('Excluir este cliente?')) return;
    const res = await window.api.clientes.excluir(id);
    if (res?.ok) {
      toast('Cliente excluído');
      renderClientes();
    } else {
      toast(res?.erro || 'Erro ao excluir', 'erro');
    }
  }

  const busca = document.getElementById('busca-cliente');
  busca.addEventListener('input', () => {
    const q = busca.value.trim().toLowerCase();
    const filtrados = lista.filter(c =>
      [c.nome, c.cpf, c.telefone, c.celular, c.email].some(v => String(v || '').toLowerCase().includes(q))
    );
    pintar(filtrados);
  });

  document.getElementById('btn-novo-cliente').addEventListener('click', () => abrirModalCliente());

  pintar(lista);
}

async function abrirModalCliente(id = null) {
  const c = id ? await window.api.clientes.buscar(id) : {};
  const procedimentos = await window.api.procedimentos.todos();
  const interesseProc = id ? await window.api.clienteProc.getInteresse(id) : [];
  const interesseVars = id ? await window.api.clienteVariantes.getInteresse(id) : [];

  const { overlay, fechar } = abrirModal(`
    <h3>${id ? 'Editar' : 'Novo'} Cliente</h3>

    <div class="tabs">
      <button class="tab-btn active" data-tab="tab-dados">Dados</button>
      <button class="tab-btn" data-tab="tab-anamnese">Anamnese</button>
      <button class="tab-btn" data-tab="tab-interesses">Interesses</button>
    </div>

    <div id="tab-dados" class="tab-pane">
      <div class="form-grid">
        <label>Nome <input id="c-nome" value="${c.nome || ''}" /></label>
        <label>Data de nascimento <input type="date" id="c-data" value="${c.data_nascimento || ''}" /></label>
        <label>CPF <input id="c-cpf" value="${c.cpf || ''}" /></label>
        <label>E-mail <input id="c-email" value="${c.email || ''}" /></label>
        <label>Telefone <input id="c-telefone" value="${c.telefone || ''}" /></label>
        <label>Celular <input id="c-celular" value="${c.celular || ''}" /></label>
        <label>Endereço <input id="c-endereco" value="${c.endereco || ''}" /></label>
        <label>Cidade <input id="c-cidade" value="${c.cidade || ''}" /></label>
        <label>UF <input id="c-uf" maxlength="2" value="${c.uf || ''}" /></label>
        <label class="full">Áreas a tratar <textarea id="c-areas">${c.areas_tratar || ''}</textarea></label>
      </div>
    </div>

    <div id="tab-anamnese" class="tab-pane hidden">
      <div class="form-grid">
        <label><input type="checkbox" id="c-met-cera" ${c.metodo_dep_cera ? 'checked' : ''}/> Depilação com cera</label>
        <label><input type="checkbox" id="c-met-lamina" ${c.metodo_dep_lamina ? 'checked' : ''}/> Lâmina</label>
        <label><input type="checkbox" id="c-met-laser" ${c.metodo_dep_laser ? 'checked' : ''}/> Laser</label>
        <label><input type="checkbox" id="c-prob-encrav" ${c.prob_encravamento ? 'checked' : ''}/> Encravamento</label>
        <label><input type="checkbox" id="c-prob-manchas" ${c.prob_manchas ? 'checked' : ''}/> Manchas</label>
        <label class="full">Outros problemas <textarea id="c-prob-outros">${c.prob_outros || ''}</textarea></label>
        <label><input type="checkbox" id="c-medicamento" ${c.medicamento_uso ? 'checked' : ''}/> Usa medicamento</label>
        <label class="full">Qual medicamento <textarea id="c-medicamento-qual">${c.medicamento_qual || ''}</textarea></label>
        <label><input type="checkbox" id="c-roacutan" ${c.roacutan ? 'checked' : ''}/> Roacutan</label>
        <label><input type="checkbox" id="c-vitiligo" ${c.tto_vitiligo ? 'checked' : ''}/> Tratamento vitiligo</label>
        <label><input type="checkbox" id="c-alergia" ${c.alergia_medicamento ? 'checked' : ''}/> Alergia medicamento</label>
        <label class="full">Qual alergia <textarea id="c-alergia-qual">${c.alergia_qual || ''}</textarea></label>
        <label><input type="checkbox" id="c-dermato" ${c.tratamento_dermato ? 'checked' : ''}/> Tratamento dermatológico</label>
        <label class="full">Qual tratamento <textarea id="c-dermato-qual">${c.tratamento_dermato_qual || ''}</textarea></label>
        <label><input type="checkbox" id="c-acidos" ${c.usa_acidos ? 'checked' : ''}/> Usa ácidos</label>
        <label><input type="checkbox" id="c-cirurgia" ${c.cirurgia ? 'checked' : ''}/> Cirurgia</label>
        <label class="full">Qual cirurgia <textarea id="c-cirurgia-qual">${c.cirurgia_qual || ''}</textarea></label>
        <label><input type="checkbox" id="c-anti" ${c.anticoncepcional ? 'checked' : ''}/> Anticoncepcional</label>
        <label class="full">Qual anticoncepcional <textarea id="c-anti-qual">${c.anticoncepcional_qual || ''}</textarea></label>
      </div>
    </div>

    <div id="tab-interesses" class="tab-pane hidden">
      <div id="lista-interesses" class="lista-interesses"></div>
    </div>

    <label class="full">Observações <textarea id="c-obs">${c.observacoes || ''}</textarea></label>

    <div class="modal-actions">
      <button class="btn btn-ghost btn-fechar">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-cliente">Salvar</button>
    </div>
  `);

  overlay.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
  });

  const listaInteresses = overlay.querySelector('#lista-interesses');
  listaInteresses.innerHTML = procedimentos.map(p => `
    <div class="interesse-item">
      <label><input type="checkbox" class="chk-proc" value="${p.id}" ${interesseProc.includes(p.id) ? 'checked' : ''}/> ${p.nome}</label>
    </div>
  `).join('');

  overlay.querySelector('#btn-salvar-cliente').addEventListener('click', async () => {
    const payload = {
      id,
      nome: overlay.querySelector('#c-nome').value.trim(),
      data_nascimento: overlay.querySelector('#c-data').value || null,
      cpf: overlay.querySelector('#c-cpf').value,
      email: overlay.querySelector('#c-email').value,
      telefone: overlay.querySelector('#c-telefone').value,
      celular: overlay.querySelector('#c-celular').value,
      endereco: overlay.querySelector('#c-endereco').value,
      cidade: overlay.querySelector('#c-cidade').value,
      uf: overlay.querySelector('#c-uf').value,
      areas_tratar: overlay.querySelector('#c-areas').value,
      metodo_dep_cera: overlay.querySelector('#c-met-cera').checked ? 1 : 0,
      metodo_dep_lamina: overlay.querySelector('#c-met-lamina').checked ? 1 : 0,
      metodo_dep_laser: overlay.querySelector('#c-met-laser').checked ? 1 : 0,
      prob_encravamento: overlay.querySelector('#c-prob-encrav').checked ? 1 : 0,
      prob_manchas: overlay.querySelector('#c-prob-manchas').checked ? 1 : 0,
      prob_outros: overlay.querySelector('#c-prob-outros').value,
      medicamento_uso: overlay.querySelector('#c-medicamento').checked ? 1 : 0,
      medicamento_qual: overlay.querySelector('#c-medicamento-qual').value,
      roacutan: overlay.querySelector('#c-roacutan').checked ? 1 : 0,
      tto_vitiligo: overlay.querySelector('#c-vitiligo').checked ? 1 : 0,
      alergia_medicamento: overlay.querySelector('#c-alergia').checked ? 1 : 0,
      alergia_qual: overlay.querySelector('#c-alergia-qual').value,
      tratamento_dermato: overlay.querySelector('#c-dermato').checked ? 1 : 0,
      tratamento_dermato_qual: overlay.querySelector('#c-dermato-qual').value,
      usa_acidos: overlay.querySelector('#c-acidos').checked ? 1 : 0,
      cirurgia: overlay.querySelector('#c-cirurgia').checked ? 1 : 0,
      cirurgia_qual: overlay.querySelector('#c-cirurgia-qual').value,
      anticoncepcional: overlay.querySelector('#c-anti').checked ? 1 : 0,
      anticoncepcional_qual: overlay.querySelector('#c-anti-qual').value,
      observacoes: overlay.querySelector('#c-obs').value,
    };

    if (!payload.nome) {
      toast('Nome é obrigatório', 'erro');
      return;
    }

    const res = await window.api.clientes.salvar(payload);
    if (!res?.id) {
      toast(res?.erro || 'Erro ao salvar cliente', 'erro');
      return;
    }

    const clienteId = res.id;
    const procedimentoIds = [...overlay.querySelectorAll('.chk-proc:checked')].map(i => Number(i.value));
    await window.api.clienteProc.salvarInteresse({ clienteId, procedimentoIds });
    await window.api.clienteVariantes.salvarInteresse({ clienteId, varianteIds: interesseVars || [] });

    toast('Cliente salvo');
    fechar();
    renderClientes();
  });
}
