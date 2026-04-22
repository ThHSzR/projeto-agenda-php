const paginas = {
  dashboard:     renderDashboard,
  calendario:    renderCalendario,
  agendamentos:  renderAgendamentos,
  clientes:      renderClientes,
  procedimentos: renderProcedimentos,
  financeiro:    renderFinanceiro,
  promocoes:     renderPromocoes,
  bloqueios:     renderBloqueios,
  relatorios:    renderRelatorios,
  usuarios:      renderUsuarios,
  logs:          renderLogs,
};

let paginaAtual = 'dashboard';

function navegar(pagina) {
  const pageEl = document.getElementById(`page-${pagina}`);
  const navEl  = document.querySelector(`[data-page="${pagina}"]`);
  if (!pageEl) return;

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));

  pageEl.classList.remove('hidden');
  if (navEl) navEl.classList.add('active');

  paginaAtual = pagina;
  if (paginas[pagina]) paginas[pagina]();
}

// Registra cliques nos links estáticos do HTML
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', () => navegar(a.dataset.page));
});

// Helper: cria um link de navegação na sidebar
function _criarNavLink(nav, pagina, icone, label, opts = {}) {
  if (!document.getElementById(`page-${pagina}`)) {
    const main = document.getElementById('content');
    const div = document.createElement('div');
    div.id = `page-${pagina}`;
    div.className = 'page hidden';
    main.appendChild(div);
  }

  const a = document.createElement('a');
  a.className = 'nav-link';
  a.dataset.page = pagina;
  if (opts.style) a.style = opts.style;
  a.innerHTML = `<span class="icon">${icone}</span> ${label}`;
  a.addEventListener('click', () => navegar(pagina));
  nav.appendChild(a);
  return a;
}

// Base path para redirecionamentos
const _appBasePath = location.pathname.replace(/\/src\/.*$/, '');

// Verificação de sessão + montagem dinâmica da sidebar
(async () => {
  try {
    const data = await window.api.auth.me();
    const { usuario, is_admin, cargo } = data;
    window._session = { usuario, is_admin, cargo };

    const isOperador = !is_admin && cargo !== 'gerente';
    const isGerente  = is_admin || cargo === 'gerente';

    // Esconde abas restritas para operadores
    if (isOperador) {
      ['dashboard', 'procedimentos', 'financeiro', 'promocoes'].forEach(p => {
        const link = document.querySelector(`[data-page="${p}"]`);
        if (link) link.style.display = 'none';
      });
    }

    const nav = document.querySelector('#sidebar nav');
    if (nav) {
      const sep = document.createElement('hr');
      sep.style = 'border:none;border-top:1px solid rgba(255,255,255,0.15);margin:12px 0';
      nav.appendChild(sep);

      if (isGerente) {
        _criarNavLink(nav, 'bloqueios', '🚫', 'Bloqueios');
      }
      if (isGerente) {
        _criarNavLink(nav, 'relatorios', '📈', 'Relatórios');
      }
      if (is_admin) {
        _criarNavLink(nav, 'usuarios', '⚙️', 'Usuários');
      }
      if (is_admin) {
        _criarNavLink(nav, 'logs', '📝', 'Logs');
      }

      const sep2 = document.createElement('hr');
      sep2.style = 'border:none;border-top:1px solid rgba(255,255,255,0.15);margin:12px 0';
      nav.appendChild(sep2);

      const userInfo = document.createElement('div');
      userInfo.style = 'padding:8px 16px;font-size:11px;color:rgba(255,255,255,0.6)';
      userInfo.innerHTML = `👤 ${usuario} <span style="opacity:0.5">(${cargo || 'admin'})</span>`;
      nav.appendChild(userInfo);

      const btnLogout = document.createElement('a');
      btnLogout.className = 'nav-link';
      btnLogout.style = 'color:rgba(255,200,200,0.9);cursor:pointer';
      btnLogout.innerHTML = '<span class="icon">🚪</span> Sair';
      btnLogout.addEventListener('click', async () => {
        await window.api.auth.logout();
        location.href = `${_appBasePath}/src/login.html`;
      });
      nav.appendChild(btnLogout);
    }

    navegar(isOperador ? 'calendario' : 'dashboard');
  } catch (e) {
    // Não autenticado — redireciona para login
    location.href = `${_appBasePath}/src/login.html`;
  }
})();
