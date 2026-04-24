// api.js — centraliza chamadas fetch à API REST

const BASE = '../api.php';

async function _req(method, route, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}?_route=${route}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);
  return data;
}

window.api = {
  // ─ auth
  login:  (u, s) => _req('POST',   'login',  { usuario: u, senha: s }),
  logout: ()     => _req('POST',   'logout'),
  me:     ()     => _req('GET',    'me'),

  // ─ usuários
  usuarios: {
    listar:        ()         => _req('GET',    'usuarios'),
    criar:         (d)        => _req('POST',   'usuarios', d),
    alterarSenha:  (id, s)    => _req('PATCH',  `usuarios/${id}/senha`, { senha: s }),
    alterarCargo:  (id, c)    => _req('PATCH',  `usuarios/${id}/cargo`, { cargo: c }),
    excluir:       (id)       => _req('DELETE', `usuarios/${id}`),
  },

  // ─ clientes
  clientes: {
    listar:   ()   => _req('GET',    'clientes'),
    buscar:   (id) => _req('GET',    `clientes/${id}`),
    salvar:   (d)  => _req('POST',   'clientes', d),
    excluir:  (id) => _req('DELETE', `clientes/${id}`),
    historico:(id) => _req('GET',    `clientes/${id}/historico`),
  },

  // ─ procedimentos
  procedimentos: {
    listar:  (todos) => _req('GET',    `procedimentos${todos ? '?todos=1' : ''}`),
    salvar:  (d)     => _req('POST',   'procedimentos', d),
    excluir: (id)    => _req('DELETE', `procedimentos/${id}`),
  },

  // ─ variantes
  variantes: {
    listar:  (procId) => _req('GET',    `variantes/${procId}`),
    salvar:  (d)      => _req('POST',   'variantes', d),
    excluir: (id)     => _req('DELETE', `variantes/${id}`),
  },

  // ─ agendamentos
  agendamentos: {
    listar:         (p)  => _req('GET',    `agendamentos${p ? '?'+new URLSearchParams(p) : ''}`),
    buscar:         (id) => _req('GET',    `agendamentos/${id}`),
    salvar:         (d)  => _req('POST',   'agendamentos', d),
    excluir:        (id) => _req('DELETE', `agendamentos/${id}`),
    alterarStatus:  (id, status) => _req('PATCH', `agendamentos/${id}/status`, { status }),
  },

  // ─ financeiro
  financeiro: {
    resumo:    (ini, fim) => _req('GET', `financeiro/resumo?inicio=${ini}&fim=${fim}`),
    detalhado: (ini, fim) => _req('GET', `financeiro/detalhado?inicio=${ini}&fim=${fim}`),
  },

  // ─ interesses
  clienteProc: {
    listar:  (cid)      => _req('GET',  `cliente-proc/${cid}`),
    salvar:  (cid, ids) => _req('POST', 'cliente-proc', { clienteId: cid, procedimentoIds: ids }),
  },
  clienteVariantes: {
    listar:  (cid)      => _req('GET',  `cliente-variantes/${cid}`),
    salvar:  (cid, ids) => _req('POST', 'cliente-variantes', { clienteId: cid, varianteIds: ids }),
  },

  // ─ promoções
  promocoes: {
    listar:        ()       => _req('GET',    'promocoes'),
    buscar:        (id)     => _req('GET',    `promocoes/${id}`),
    salvar:        (d)      => _req('POST',   'promocoes', d),
    excluir:       (id)     => _req('DELETE', `promocoes/${id}`),
    calcular:      (d)      => _req('POST',   'promocoes/calcular', d),
  },

  // ─ logs
  logs: {
    listar: (p) => _req('GET', `logs${p ? '?'+new URLSearchParams(p) : ''}`),
  },

  // ─ relatórios
  relatorios: {
    clientes:    (p) => _req('GET', `relatorios/clientes${p ? '?'+new URLSearchParams(p) : ''}`),
    procedimentos:(p)=> _req('GET', `relatorios/procedimentos${p ? '?'+new URLSearchParams(p) : ''}`),
    financeiro:  (p) => _req('GET', `relatorios/financeiro${p ? '?'+new URLSearchParams(p) : ''}`),
  },

  // ─ prontuário (timeline de clientes)
  prontuario: {
    listar:  (clienteId) => _req('GET',    `prontuario?cliente_id=${clienteId}`),
    criar:   (d)         => _req('POST',   'prontuario', d),
    editar:  (id, d)     => _req('PATCH',  `prontuario/${id}`, d),
    excluir: (id)        => _req('DELETE', `prontuario/${id}`),
  },
};
