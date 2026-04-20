// api.js — adaptado para PHP (mesma interface de chamada, URLs apontando para api.php)
const api = {
    async _fetch(method, url, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        if (res.status === 401) {
            window.location.href = '/src/login.html';
            return;
        }
        return res.json();
    },

    auth: {
        login:  (usuario, senha) => api._fetch('POST', '/api/login', { usuario, senha }),
        logout: () => api._fetch('POST', '/api/logout'),
        me:     () => api._fetch('GET', '/api/me'),
    },
    usuarios: {
        listar:      () => api._fetch('GET', '/api/usuarios'),
        criar:       (d) => api._fetch('POST', '/api/usuarios', d),
        trocarSenha: (id, senha) => api._fetch('PATCH', `/api/usuarios/${id}/senha`, { senha }),
        excluir:     (id) => api._fetch('DELETE', `/api/usuarios/${id}`),
    },
    clientes: {
        listar: () => api._fetch('GET', '/api/clientes'),
        buscar: (id) => api._fetch('GET', `/api/clientes/${id}`),
        salvar: (dados) => api._fetch('POST', '/api/clientes', dados),
        excluir:(id) => api._fetch('DELETE', `/api/clientes/${id}`),
    },
    procedimentos: {
        listar: () => api._fetch('GET', '/api/procedimentos'),
        todos:  () => api._fetch('GET', '/api/procedimentos?todos=1'),
        salvar: (d) => api._fetch('POST', '/api/procedimentos', d),
        excluir:(id) => api._fetch('DELETE', `/api/procedimentos/${id}`),
    },
    variantes: {
        listar: (procId) => api._fetch('GET', `/api/variantes/${procId}`),
        salvar: (d) => api._fetch('POST', '/api/variantes', d),
        excluir:(id) => api._fetch('DELETE', `/api/variantes/${id}`),
    },
    agendamentos: {
        listar: (filtro) => {
            const p = new URLSearchParams();
            if (filtro?.data)        p.set('data', filtro.data);
            if (filtro?.data_inicio) p.set('data_inicio', filtro.data_inicio);
            if (filtro?.data_fim)    p.set('data_fim', filtro.data_fim);
            return api._fetch('GET', '/api/agendamentos?' + p.toString());
        },
        buscar: (id) => api._fetch('GET', `/api/agendamentos/${id}`),
        salvar: (dados) => api._fetch('POST', '/api/agendamentos', dados),
        excluir:(id) => api._fetch('DELETE', `/api/agendamentos/${id}`),
        status: ({ id, status }) => api._fetch('PATCH', `/api/agendamentos/${id}/status`, { status }),
    },
    financeiro: {
        resumo:    (f) => api._fetch('GET', `/api/financeiro/resumo?inicio=${f.inicio}&fim=${f.fim}`),
        detalhado: (f) => api._fetch('GET', `/api/financeiro/detalhado?inicio=${f.inicio}&fim=${f.fim}`),
    },
    clienteProc: {
        getInteresse:    (id) => api._fetch('GET', `/api/cliente-proc/${id}`),
        salvarInteresse: (p)  => api._fetch('POST', '/api/cliente-proc', p),
    },
    clienteVariantes: {
        getInteresse:    (id) => api._fetch('GET', `/api/cliente-variantes/${id}`),
        salvarInteresse: (p)  => api._fetch('POST', '/api/cliente-variantes', p),
    },
};

window.api = api;
