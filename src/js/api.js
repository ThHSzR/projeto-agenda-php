// api.js — detecta ambiente local (subpasta /agenda) vs produção (raiz)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/agenda/api'
    : '/api';

const LOGIN_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/agenda/src/login.html'
    : '/src/login.html';

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
            window.location.href = LOGIN_URL;
            return;
        }
        return res.json();
    },

    auth: {
        login:  (usuario, senha) => api._fetch('POST', `${API_BASE}/login`, { usuario, senha }),
        logout: () => api._fetch('POST', `${API_BASE}/logout`),
        me:     () => api._fetch('GET',  `${API_BASE}/me`),
    },
    usuarios: {
        listar:      () => api._fetch('GET',    `${API_BASE}/usuarios`),
        criar:       (d) => api._fetch('POST',  `${API_BASE}/usuarios`, d),
        trocarSenha: (id, senha) => api._fetch('PATCH',  `${API_BASE}/usuarios/${id}/senha`, { senha }),
        excluir:     (id) => api._fetch('DELETE', `${API_BASE}/usuarios/${id}`),
    },
    clientes: {
        listar: ()    => api._fetch('GET',    `${API_BASE}/clientes`),
        buscar: (id)  => api._fetch('GET',    `${API_BASE}/clientes/${id}`),
        salvar: (d)   => api._fetch('POST',   `${API_BASE}/clientes`, d),
        excluir:(id)  => api._fetch('DELETE', `${API_BASE}/clientes/${id}`),
    },
    procedimentos: {
        listar: ()    => api._fetch('GET',    `${API_BASE}/procedimentos`),
        todos:  ()    => api._fetch('GET',    `${API_BASE}/procedimentos?todos=1`),
        salvar: (d)   => api._fetch('POST',   `${API_BASE}/procedimentos`, d),
        excluir:(id)  => api._fetch('DELETE', `${API_BASE}/procedimentos/${id}`),
    },
    variantes: {
        listar: (procId) => api._fetch('GET',    `${API_BASE}/variantes/${procId}`),
        salvar: (d)      => api._fetch('POST',   `${API_BASE}/variantes`, d),
        excluir:(id)     => api._fetch('DELETE', `${API_BASE}/variantes/${id}`),
    },
    agendamentos: {
        listar: (filtro) => {
            const p = new URLSearchParams();
            if (filtro?.data)        p.set('data',        filtro.data);
            if (filtro?.data_inicio) p.set('data_inicio', filtro.data_inicio);
            if (filtro?.data_fim)    p.set('data_fim',    filtro.data_fim);
            return api._fetch('GET', `${API_BASE}/agendamentos?` + p.toString());
        },
        buscar: (id)    => api._fetch('GET',    `${API_BASE}/agendamentos/${id}`),
        salvar: (d)     => api._fetch('POST',   `${API_BASE}/agendamentos`, d),
        excluir:(id)    => api._fetch('DELETE', `${API_BASE}/agendamentos/${id}`),
        status: ({ id, status }) => api._fetch('PATCH', `${API_BASE}/agendamentos/${id}/status`, { status }),
    },
    financeiro: {
        resumo:    (f) => api._fetch('GET', `${API_BASE}/financeiro/resumo?inicio=${f.inicio}&fim=${f.fim}`),
        detalhado: (f) => api._fetch('GET', `${API_BASE}/financeiro/detalhado?inicio=${f.inicio}&fim=${f.fim}`),
    },
    clienteProc: {
        getInteresse:    (id) => api._fetch('GET',  `${API_BASE}/cliente-proc/${id}`),
        salvarInteresse: (p)  => api._fetch('POST', `${API_BASE}/cliente-proc`, p),
    },
    clienteVariantes: {
        getInteresse:    (id) => api._fetch('GET',  `${API_BASE}/cliente-variantes/${id}`),
        salvarInteresse: (p)  => api._fetch('POST', `${API_BASE}/cliente-variantes`, p),
    },
};

window.api = api;
