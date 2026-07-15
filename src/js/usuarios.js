async function renderUsuarios() {
  const lista = await window.api.usuarios.listar();
  const page  = document.getElementById('page-usuarios');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header">
      <div><span class="page-eyebrow">Administração</span><h1>Usuários</h1></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="fazerBackup()">${uiIcon('database')} Backup do banco</button>
        <button class="btn btn-primary" onclick="abrirNovoUsuario()">+ Novo Usuário</button>
      </div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr><th>Usuário</th><th>Cargo</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${lista.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.usuario)}</strong></td>
              <td>
                <select class="btn btn-secondary btn-sm" style="padding:4px 8px;font-size:12px"
                  onchange="trocarCargo(${u.id}, this.value)"
                  ${u.is_admin ? '' : ''}>
                  <option value="operador" ${u.cargo === 'operador' ? 'selected' : ''}>Operador</option>
                  <option value="gerente"  ${u.cargo === 'gerente'  ? 'selected' : ''}>Gerente</option>
                  <option value="admin"    ${u.cargo === 'admin'    ? 'selected' : ''}>Admin</option>
                </select>
              </td>
              <td>
                <button class="btn btn-info btn-sm btn-icon" onclick="abrirTrocarSenha(${u.id}, decodeURIComponent('${encodeURIComponent(u.usuario)}'))" title="Trocar senha" aria-label="Trocar senha">${uiIcon('lock')}</button>
                <button class="btn btn-danger btn-sm btn-icon" onclick="excluirUsuario(${u.id}, decodeURIComponent('${encodeURIComponent(u.usuario)}'))" title="Excluir usuário" aria-label="Excluir usuário">${uiIcon('trash')}</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Modal novo usuário -->
    <div id="modal-usuario" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header">
          <h2>Novo Usuário</h2>
          <button class="modal-close" aria-label="Fechar" onclick="fecharModal('modal-usuario')"></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Usuário *</label>
            <input type="text" id="nou-usuario" autocomplete="off"/>
          </div>
          <div class="form-group">
            <label>Senha * (mín. 8 caracteres)</label>
            <input type="password" id="nou-senha" autocomplete="new-password"/>
          </div>
          <div class="form-group">
            <label>Confirmar Senha *</label>
            <input type="password" id="nou-senha2" autocomplete="new-password"/>
          </div>
          <div class="form-group">
            <label>Cargo *</label>
            <select id="nou-cargo">
              <option value="operador">Operador — acesso geral</option>
              <option value="gerente">Gerente — acesso geral + editar procedimentos/promoções</option>
              <option value="admin">Administrador — acesso total</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modal-usuario')">Cancelar</button>
          <button class="btn btn-primary" onclick="salvarUsuario()">Salvar usuário</button>
        </div>
      </div>
    </div>

    <!-- Modal trocar senha -->
    <div id="modal-senha" class="modal-overlay hidden">
      <div class="modal">
        <div class="modal-header">
          <h2 id="modal-senha-title">Trocar Senha</h2>
          <button class="modal-close" aria-label="Fechar" onclick="fecharModal('modal-senha')"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="troca-id"/>
          <div class="form-group">
            <label>Nova senha * (mín. 8 caracteres)</label>
            <input type="password" id="troca-senha" autocomplete="new-password"/>
          </div>
          <div class="form-group">
            <label>Confirmar Nova Senha *</label>
            <input type="password" id="troca-senha2" autocomplete="new-password"/>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="fecharModal('modal-senha')">Cancelar</button>
          <button class="btn btn-primary" onclick="confirmarTrocarSenha()">Salvar nova senha</button>
        </div>
      </div>
    </div>
  `;
}

function abrirNovoUsuario() {
  document.getElementById('nou-usuario').value = '';
  document.getElementById('nou-senha').value   = '';
  document.getElementById('nou-senha2').value  = '';
  document.getElementById('nou-cargo').value   = 'operador';
  abrirModal('modal-usuario');
}

async function salvarUsuario() {
  const usuario = document.getElementById('nou-usuario').value.trim();
  const senha   = document.getElementById('nou-senha').value;
  const senha2  = document.getElementById('nou-senha2').value;
  const cargo   = document.getElementById('nou-cargo').value;

  if (!usuario)           { toast('Informe o usuário', 'error');          return; }
  if (senha.length < 8)   { toast('Senha mínima: 8 caracteres', 'error'); return; }
  if (senha !== senha2)   { toast('As senhas não conferem', 'error');      return; }

  try {
    const is_admin = cargo === 'admin';
    await window.api.usuarios.criar({ usuario, senha, is_admin, cargo });
    fecharModal('modal-usuario');
    toast('Usuário criado!', 'success');
    renderUsuarios();
  } catch (e) {
    toast(e.message || 'Erro ao criar usuário', 'error');
  }
}

function abrirTrocarSenha(id, nome) {
  document.getElementById('troca-id').value     = id;
  document.getElementById('troca-senha').value  = '';
  document.getElementById('troca-senha2').value = '';
  document.getElementById('modal-senha-title').textContent = `Trocar senha — ${nome}`;
  abrirModal('modal-senha');
}

async function confirmarTrocarSenha() {
  const id     = document.getElementById('troca-id').value;
  const senha  = document.getElementById('troca-senha').value;
  const senha2 = document.getElementById('troca-senha2').value;

  if (senha.length < 8) { toast('Senha mínima: 8 caracteres', 'error'); return; }
  if (senha !== senha2)  { toast('As senhas não conferem', 'error');      return; }

  try {
    await window.api.usuarios.trocarSenha(id, senha);
    fecharModal('modal-senha');
    toast('Senha alterada!', 'success');
  } catch (e) {
    toast(e.message || 'Erro ao trocar senha', 'error');
  }
}

async function trocarCargo(id, novoCargo) {
  try {
    await window.api.usuarios.trocarCargo(id, novoCargo);
    toast(`Cargo alterado para ${novoCargo}!`, 'success');
  } catch (e) {
    toast(e.message || 'Erro ao alterar cargo', 'error');
    renderUsuarios(); // reverter UI
  }
}

async function excluirUsuario(id, nome) {
  if (!confirm(`Excluir o usuário "${nome}"?`)) return;
  try {
    await window.api.usuarios.excluir(id);
    toast('Usuário removido', 'success');
    renderUsuarios();
  } catch (e) {
    toast(e.message || 'Erro ao excluir', 'error');
  }
}

function fazerBackup() {
  window.api.backup.download();
  toast('Download do backup iniciado!', 'info');
}
