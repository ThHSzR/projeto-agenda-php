// ── TOAST ──────────────────────────────────────────────────
function toast(msg, tipo = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── MODAL ──────────────────────────────────────────────────
function abrirModal(id) { document.getElementById(id).classList.remove('hidden'); }
function fecharModal(id) { document.getElementById(id).classList.add('hidden'); }

// Fecha modal clicando fora
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ── FORMATAÇÃO ─────────────────────────────────────────────
function fmtData(iso) {
  if (!iso) return '-';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00');
  return d.toLocaleDateString('pt-BR');
}

function fmtDataHora(iso) {
  if (!iso) return '-';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoeda(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── DATE HELPERS ───────────────────────────────────────────
function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function toInputDatetime(iso) {
  if (!iso) return '';
  return iso.replace(' ', 'T').slice(0, 16);
}

function toDbDatetime(inputVal) {
  return inputVal.replace('T', ' ') + ':00';
}

function abrirWhatsApp(telefone, dataHoraAgend, nomeCliente) {
  if (!telefone) { toast('Cliente sem telefone cadastrado.', 'error'); return; }

  const num = telefone.replace(/\D/g, '');

  const horaAtual = new Date().getHours();
  const saudacao  = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';

  // Primeiro nome apenas: "Maria Silva" → "Maria"
  const primeiroNome = nomeCliente ? ', ' + nomeCliente.trim().split(' ')[0] : '';

  let refDia = '';
  if (dataHoraAgend) {
    const agora     = new Date();
    const dAgend    = new Date(dataHoraAgend.replace(' ', 'T'));
    const hojeStr   = agora.toISOString().slice(0, 10);
    const agendStr  = dAgend.toISOString().slice(0, 10);

    const amanhaDate = new Date(agora);
    amanhaDate.setDate(agora.getDate() + 1);
    const amanhaStr = amanhaDate.toISOString().slice(0, 10);

    const diasSemana = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    const hora       = dAgend.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const diaSemNome = diasSemana[dAgend.getDay()];
    const diaNum     = String(dAgend.getDate()).padStart(2, '0');
    const mesNum     = String(dAgend.getMonth() + 1).padStart(2, '0');

    if (agendStr === hojeStr) {
      refDia = `hoje às ${hora}`;
    } else if (agendStr === amanhaStr) {
      refDia = `amanhã às ${hora}`;
    } else {
      refDia = `${diaSemNome}, dia ${diaNum}/${mesNum}, às ${hora}`;
    }
  }

  const texto = refDia
    ? `${saudacao}${primeiroNome}! 😊 Passando para confirmar o seu horário ${refDia}. Tudo certo?`
    : `${saudacao}${primeiroNome}! 😊`;

  window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank');
}

function formatarTelefone(input) {
  // Remove tudo que não for dígito
  let v = input.value.replace(/\D/g, '');

  // Limita a 11 dígitos (DDD + 9 dígitos)
  if (v.length > 11) v = v.slice(0, 11);

  // Formata progressivamente
  if (v.length <= 2) {
    v = v.replace(/^(\d{0,2})/, '($1');
  } else if (v.length <= 6) {
    v = v.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
  } else if (v.length <= 10) {
    // Fixo: (00) 0000-0000
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else {
    // Celular: (00) 00000-0000
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  }

  input.value = v;
}

function formatarCPF(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length <= 3) {
    v = v.replace(/^(\d{0,3})/, '$1');
  } else if (v.length <= 6) {
    v = v.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
  } else if (v.length <= 9) {
    v = v.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
  } else {
    v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  }

  input.value = v;
}

// ── LOG ────────────────────────────────────────────────────
const Log = {
  _fmt(nivel, ...args) {
    const ts = new Date().toLocaleTimeString('pt-BR');
    const prefix = `[${ts}] [${nivel}]`;
    switch (nivel) {
      case 'ERROR': console.error(prefix, ...args); break;
      case 'WARN':  console.warn(prefix, ...args);  break;
      case 'INFO':  console.info(prefix, ...args);  break;
      default:      console.log(prefix, ...args);
    }
  },
  info:  (...args) => Log._fmt('INFO',  ...args),
  warn:  (...args) => Log._fmt('WARN',  ...args),
  error: (...args) => Log._fmt('ERROR', ...args),
  debug: (...args) => Log._fmt('DEBUG', ...args),
};