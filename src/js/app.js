const _isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const _LOGIN_URL = _isLocal ? '/projeto-agenda-php/src/login.html' : '/src/login.html';

const paginas = {
  calendario: renderCalendario,
  agendamentos: renderAgendamentos,
  clientes: renderClientes,
  procedimentos: renderProcedimentos,
  financeiro: renderFinanceiro,
  usuarios: renderUsuarios,
};

let paginaAtual = null;

async function init() {
  // Verifica autenticação
  const me = await window.api.auth.me().catch(() => null);
  if (!me || !me.usuario) {
    window.location.href = _LOGIN_URL;
    return;
  }

  document.getElementById('usuario-logado').textContent = me.usuario;

  // Mostra itens conforme permissão
  if (me.is_admin || me.cargo === 'gerente') {
    document.querySelectorAll('.gerente-only').forEach(el => el.classList.remove('hidden'));
  }
  if (me.is_admin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  // Guarda dados do usuário globalmente
  window.usuarioLogado = me;

  // Navegação
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      navegarPara(btn.dataset.page);
    });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await window.api.auth.logout();
    window.location.href = _LOGIN_URL;
  });

  // Página inicial
  navegarPara('calendario');
}

function navegarPara(pagina) {
  paginaAtual = pagina;
  const fn = paginas[pagina];
  if (fn) fn();
}

init();
