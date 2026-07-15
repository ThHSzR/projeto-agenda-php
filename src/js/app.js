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

function _podeAcessarPagina(pagina) {
  const sessao = window._session;
  if (!sessao) return pagina === 'dashboard';
  if (sessao.is_admin) return true;
  const comuns = ['dashboard', 'calendario', 'agendamentos', 'clientes'];
  if (comuns.includes(pagina)) return true;
  if (sessao.cargo === 'gerente') {
    return ['procedimentos', 'financeiro', 'promocoes', 'bloqueios', 'relatorios'].includes(pagina);
  }
  return false;
}

function navegar(pagina) {
  if (!_podeAcessarPagina(pagina)) {
    toast('Seu perfil não tem acesso a este módulo.', 'error');
    pagina = 'dashboard';
  }
  const pageEl = document.getElementById(`page-${pagina}`);
  const navEl  = document.querySelector(`[data-page="${pagina}"]`);
  if (!pageEl) return;

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.remove('active');
    a.removeAttribute('aria-current');
  });

  pageEl.classList.remove('hidden');
  if (navEl) {
    navEl.classList.add('active');
    navEl.setAttribute('aria-current', 'page');
  }

  paginaAtual = pagina;
  if (paginas[pagina]) paginas[pagina]();
}

// Registra cliques nos links estáticos do HTML
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', event => {
    event.preventDefault();
    navegar(a.dataset.page);
  });
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
  a.href = `#${pagina}`;
  if (opts.style) a.style = opts.style;
  a.innerHTML = `<span class="icon">${uiIcon(icone)}</span> ${label}`;
  a.addEventListener('click', event => {
    event.preventDefault();
    navegar(pagina);
  });
  nav.appendChild(a);
  return a;
}

// Base path para redirecionamentos
const _appCleanPath = location.pathname.replace(/\/+$/, '');
const _appBasePath = (_appCleanPath
  .replace(/\/src(?:\/.*)?$/, '')
  .replace(/\/login$/, '')) || '';

if (/\/src\/index\.html$/.test(location.pathname)) {
  history.replaceState(null, '', `${_appBasePath}/${location.hash}`);
}

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
      ['procedimentos', 'financeiro', 'promocoes'].forEach(p => {
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
        _criarNavLink(nav, 'bloqueios', 'blocks', 'Bloqueios');
      }
      if (isGerente) {
        _criarNavLink(nav, 'relatorios', 'reports', 'Relatórios');
      }
      if (is_admin) {
        _criarNavLink(nav, 'usuarios', 'users', 'Usuários');
      }
      if (is_admin) {
        _criarNavLink(nav, 'logs', 'logs', 'Logs');
      }

      const sep2 = document.createElement('hr');
      sep2.style = 'border:none;border-top:1px solid rgba(255,255,255,0.15);margin:12px 0';
      nav.appendChild(sep2);

      const userInfo = document.createElement('div');
      userInfo.className = 'sidebar-user';
      userInfo.style = 'padding:8px 16px;font-size:11px;color:rgba(255,255,255,0.6)';
      userInfo.innerHTML = `<span class="user-avatar">${escapeHtml(usuario).charAt(0).toUpperCase()}</span><span><strong>${escapeHtml(usuario)}</strong><small>${escapeHtml(cargo || 'admin')}</small></span>`;
      nav.appendChild(userInfo);

      const btnLogout = document.createElement('a');
      btnLogout.className = 'nav-link';
      btnLogout.href = '#sair';
      btnLogout.style = 'color:rgba(255,200,200,0.9);cursor:pointer';
      btnLogout.innerHTML = `<span class="icon">${uiIcon('logout')}</span> Sair`;
      btnLogout.addEventListener('click', async () => {
        await window.api.auth.logout();
        location.href = `${_appBasePath}/login`;
      });
      nav.appendChild(btnLogout);
    }

    navegar('dashboard');
    iniciarMonitorAgendamentos();
  } catch (e) {
    // Não autenticado — redireciona para login
    location.href = `${_appBasePath}/login`;
  }
})();

document.querySelectorAll('[data-icon]').forEach(el => {
  el.innerHTML = uiIcon(el.dataset.icon);
});

document.querySelectorAll('.form-group label:not([for])').forEach(label => {
  const control = label.parentElement?.querySelector('input[id], select[id], textarea[id]');
  if (control?.id) label.htmlFor = control.id;
});
