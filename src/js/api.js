// ── Base URL dinâmica (sem caminhos hardcoded) ───────────────────────────────
const _basePath = location.pathname.replace(/\/src\/.*$/, '').replace(/\/index\.html$/, '');

const api = {
  async _fetch(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const [path, qs] = url.replace(/^\//, '').split('?');
    const fullUrl = `${_basePath}/api.php?_route=${path}${qs ? '&' + qs : ''}`;

    const res = await fetch(fullUrl, opts);

    if (res.status === 401) {
      window.location.href = `${_basePath}/src/login.html`;
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || `Erro HTTP ${res.status}`);
    return data;
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
    trocarCargo: (id, cargo) => api._fetch('PATCH', `/usuarios/${id}/cargo`, { cargo }),
    excluir:     (id) => api._fetch('DELETE', `/usuarios/${id}`),
  },
  clientes: {
    listar:    () => api._fetch('GET', '/clientes'),
    buscar:    (id) => api._fetch('GET', `/clientes/${id}`),
    salvar:    (dados) => api._fetch('POST', '/clientes', dados),
    excluir:   (id) => api._fetch('DELETE', `/clientes/${id}`),
    historico: (id) => api._fetch('GET', `/clientes/${id}/historico`),
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
  promocoes: {
    listar:   () => api._fetch('GET', '/promocoes'),
    buscar:   (id) => api._fetch('GET', `/promocoes/${id}`),
    salvar:   (d) => api._fetch('POST', '/promocoes', d),
    excluir:  (id) => api._fetch('DELETE', `/promocoes/${id}`),
    calcular: (payload) => api._fetch('POST', '/promocoes/calcular', payload),
  },
  bloqueios: {
    listar:  (filtro) => {
      const p = new URLSearchParams();
      if (filtro?.data_inicio) p.set('data_inicio', filtro.data_inicio);
      if (filtro?.data_fim)    p.set('data_fim', filtro.data_fim);
      const qs = p.toString();
      return api._fetch('GET', '/bloqueios' + (qs ? '?' + qs : ''));
    },
    salvar:  (d) => api._fetch('POST', '/bloqueios', d),
    excluir: (id) => api._fetch('DELETE', `/bloqueios/${id}`),
  },
  relatorios: {
    faturamentoMensal:  (meses) => api._fetch('GET', `/relatorios/faturamento-mensal?meses=${meses || 6}`),
    clientesFrequentes: () => api._fetch('GET', '/relatorios/clientes-frequentes'),
  },
  logs: {
    listar: (limite) => api._fetch('GET', `/logs?limite=${limite || 100}`),
  },
  dashboard: {
    dados: () => api._fetch('GET', '/dashboard'),
  },
  backup: {
    download: () => {
      window.open(`${_basePath}/api.php?_route=backup`, '_blank');
    },
  },
  clienteProc: {
    getInteresse:    (id) => api._fetch('GET', `/cliente-proc/${id}`),
    salvarInteresse: (p)  => api._fetch('POST', '/cliente-proc', p),
  },
  clienteVariantes: {
    getInteresse:    (id) => api._fetch('GET', `/cliente-variantes/${id}`),
    salvarInteresse: (p)  => api._fetch('POST', '/cliente-variantes', p),
  },
  prontuario: {
    listar:  (clienteId) => api._fetch('GET', `/prontuario?cliente_id=${clienteId}`),
    criar:   (d) => api._fetch('POST', '/prontuario', d),
    editar:  (id, d) => api._fetch('PATCH', `/prontuario/${id}`, d),
    excluir: (id) => api._fetch('DELETE', `/prontuario/${id}`),
  },
};

window.api = api;
