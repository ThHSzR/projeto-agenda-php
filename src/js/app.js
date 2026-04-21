// ── Configuração de navegação ─────────────────────────────────
const _isLocalApp = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const _basePath   = location.pathname.replace(/\/src\/.*$/, '');
const _LOGIN_URL  = `${_basePath}/src/login.html`;

const paginas = {
  calendario:    renderCalendario,
  agendamentos:  renderAgendamentos,
  clientes:      renderClientes,
  procedimentos: renderProcedimentos,
  financeiro:    renderFinanceiro,
  usuarios:      renderUsuarios,
};

let paginaAtual = null;

// ── Inicialização ─────────────────────────────────────────────
async function init() {
  const me = await window.api.auth.me().catch(() => null);
  if (!me || !me.usuario) {
    window.location.href = _LOGIN_URL;
    return;
  }

  // Exibe nome do usuário logado
  const elUsuario = document.getElementById('usuario-logado');
  if (elUsuario) elUsuario.textContent = me.usuario;

  // Mostra itens conforme permissão
  if (me.is_admin || me.cargo === 'gerente') {
    document.querySelectorAll('.gerente-only').forEach(el => el.classList.remove('hidden'));
  }
  if (me.is_admin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  // Guarda dados do usuário globalmente
  window.usuarioLogado = me;

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await window.api.auth.logout().catch(() => {});
      window.location.href = _LOGIN_URL;
    });
  }

  // Navegação — usa '.nav-link' que já existe no index.html
  document.querySelectorAll('.nav-link[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-page]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      navegarPara(btn.dataset.page);
    });
  });

  // Página inicial
  navegarPara('calendario');
}

// ── Navegação ─────────────────────────────────────────────────
function navegarPara(pagina) {
  paginaAtual = pagina;

  // Marca link ativo na sidebar
  document.querySelectorAll('.nav-link[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pagina);
  });

  const fn = paginas[pagina];
  if (fn) fn();
}

init();
