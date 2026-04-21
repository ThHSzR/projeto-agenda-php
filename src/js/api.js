// ── Base URL dinâmica (sem caminhos hardcoded) ─────────────────
// Funciona em qualquer subpasta sem precisar alterar o código.
// Ex: XAMPP em /projeto-agenda-php/ → _basePath = '/projeto-agenda-php'
//     Produção na raiz             → _basePath = ''
const _isLocal  = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const _basePath = location.pathname.replace(/\/src\/.*$/, '');

const api = {
  async _fetch(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    // localhost  → acessa api.php diretamente com _route= (sem depender do rewrite)
    // produção   → usa a URL amigável via .htaccess
    let fullUrl;
    if (_isLocal) {
      const [path, qs] = url.replace(/^\//, '').split('?');
      fullUrl = `${_basePath}/api.php?_route=${path}${qs ? '&' + qs : ''}`;
    } else {
      fullUrl = '/api' + url;
    }

    const res = await fetch(fullUrl, opts);

    if (res.status === 401) {
      window.location.href = `${_basePath}/src/login.html`;
      return;
    }

    return res.json();
  },

  auth: {
    login:  (usuario, senha) => api._fetch('POST', '/login', { usuario, senha }),
    logout: () => api._fetch('POST', '/logout'),
    me:     () => api._fetch('GET', '/me'),
  },
  usuarios: {
    listar:      () => api._fetch('GET', '/usuarios'),
    criar:       (d) => api._fetch('POST', '/usuarios', d),
    trocarSenha: (id, senha) => api._fetch('PATCH', `/usuarios/${id}/senha`, { senha }),
    excluir:     (id) => api._fetch('DELETE', `/usuarios/${id}`),
  },
  clientes: {
    listar:  () => api._fetch('GET', '/clientes'),
    buscar:  (id) => api._fetch('GET', `/clientes/${id}`),
    salvar:  (dados) => api._fetch('POST', '/clientes', dados),
    excluir: (id) => api._fetch('DELETE', `/clientes/${id}`),
  },
  procedimentos: {
    listar:  () => api._fetch('GET', '/procedimentos'),
    todos:   () => api._fetch('GET', '/procedimentos?todos=1'),
    salvar:  (d) => api._fetch('POST', '/procedimentos', d),
    excluir: (id) => api._fetch('DELETE', `/procedimentos/${id}`),
  },
  variantes: {
    listar:  (procId) => api._fetch('GET', `/variantes/${procId}`),
    salvar:  (d) => api._fetch('POST', '/variantes', d),
    excluir: (id) => api._fetch('DELETE', `/variantes/${id}`),
  },
  agendamentos: {
    listar: (filtro) => {
      const p = new URLSearchParams();
      if (filtro?.data)        p.set('data', filtro.data);
      if (filtro?.data_inicio) p.set('data_inicio', filtro.data_inicio);
      if (filtro?.data_fim)    p.set('data_fim', filtro.data_fim);
      const qs = p.toString();
      return api._fetch('GET', '/agendamentos' + (qs ? '?' + qs : ''));
    },
    buscar:  (id) => api._fetch('GET', `/agendamentos/${id}`),
    salvar:  (dados) => api._fetch('POST', '/agendamentos', dados),
    excluir: (id) => api._fetch('DELETE', `/agendamentos/${id}`),
    status:  ({ id, status }) => api._fetch('PATCH', `/agendamentos/${id}/status`, { status }),
  },
  financeiro: {
    resumo:    (f) => api._fetch('GET', `/financeiro/resumo?inicio=${f.inicio}&fim=${f.fim}`),
    detalhado: (f) => api._fetch('GET', `/financeiro/detalhado?inicio=${f.inicio}&fim=${f.fim}`),
  },
  clienteProc: {
    getInteresse:    (id) => api._fetch('GET', `/cliente-proc/${id}`),
    salvarInteresse: (p)  => api._fetch('POST', '/cliente-proc', p),
  },
  clienteVariantes: {
    getInteresse:    (id) => api._fetch('GET', `/cliente-variantes/${id}`),
    salvarInteresse: (p)  => api._fetch('POST', '/cliente-variantes', p),
  },
};

window.api = api;
