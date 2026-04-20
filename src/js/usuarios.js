async function renderUsuarios() {
  const lista = await window.api.usuarios.listar();
  const main  = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h1>Usuários</h1>
      <button class="btn btn-primary" id="btn-novo-usuario">+ Novo</button>
    </div>
    <table class="tabela">
      <thead><tr><th>Usuário</th><th>Cargo</th><th>Admin</th><th>Ações</th></tr></thead>
      <tbody id="tbody-usuarios"></tbody>
    </table>
  `;

  function renderLista(users) {
    document.getElementById('tbody-usuarios').innerHTML = users.map(u => `
      <tr>
        <td>${u.usuario}</td>
        <td>${u.cargo}</td>
        <td>${u.is_admin ? '✅' : '—'}</td>
        <td>
          <button class="btn btn-sm btn-ghost" data-id="${u.id}" data-action="senha">Senha</button>
          <button class="btn btn-sm btn-danger" data-id="${u.id}" data-action="excluir">Excluir</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('[data-action="senha"]').forEach(btn => {
      btn.addEventListener('click', () => abrirModalSenha(btn.dataset.id));
    });
    document.querySelectorAll('[data-action="excluir"]').forEach(btn => {
      btn.addEventListener('click', () => excluirUsuario(btn.dataset.id, users));
    });
  }

  async function excluirUsuario(id, users) {
    const u = users.find(x => String(x.id) === String(id));
    if (!await confirmar(`Excluir usuário "${u?.usuario}"?`)) return;
    const res = await window.api.usuarios.excluir(id);
    if (res?.ok) { toast('Usuário excluído'); renderUsuarios(); }
    else toast(res?.erro || 'Erro ao excluir', 'erro');
  }

  function abrirModalSenha(id) {
    const { overlay, fechar } = abrirModal(`
      <h3>Trocar Senha</h3>
      <label>Nova senha
        <input type="password" id="inp-nova-senha" minlength="6"/>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Cancelar</button>
        <button class="btn btn-primary" id="btn-salvar-senha">Salvar</button>
      </div>
    `);
    overlay.querySelector('#btn-salvar-senha').addEventListener('click', async () => {
      const senha = overlay.querySelector('#inp-nova-senha').value;
      if (senha.length < 6) { toast('Mínimo 6 caracteres', 'erro'); return; }
      const res = await window.api.usuarios.trocarSenha(id, senha);
      if (res?.ok) { toast('Senha alterada'); fechar(); }
      else toast(res?.erro || 'Erro', 'erro');
    });
  }

  function abrirModalNovo() {
    const { overlay, fechar } = abrirModal(`
      <h3>Novo Usuário</h3>
      <label>Usuário <input type="text" id="inp-usuario-novo"/></label>
      <label>Senha <input type="password" id="inp-senha-novo" minlength="6"/></label>
      <label>Cargo
        <select id="inp-cargo">
          <option value="operador">Operador</option>
          <option value="gerente">Gerente</option>
        </select>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" id="inp-admin"/> Administrador
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Cancelar</button>
        <button class="btn btn-primary" id="btn-criar">Criar</button>
      </div>
    `);
    overlay.querySelector('#btn-criar').addEventListener('click', async () => {
      const usuario  = overlay.querySelector('#inp-usuario-novo').value.trim();
      const senha    = overlay.querySelector('#inp-senha-novo').value;
      const cargo    = overlay.querySelector('#inp-cargo').value;
      const is_admin = overlay.querySelector('#inp-admin').checked;
      if (!usuario || !senha) { toast('Preencha todos os campos', 'erro'); return; }
      const res = await window.api.usuarios.criar({ usuario, senha, cargo, is_admin });
      if (res?.id) { toast('Usuário criado'); fechar(); renderUsuarios(); }
      else toast(res?.erro || 'Erro ao criar', 'erro');
    });
  }

  renderLista(lista);
  document.getElementById('btn-novo-usuario').addEventListener('click', abrirModalNovo);
}
