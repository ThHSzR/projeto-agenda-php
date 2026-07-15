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
function abrirModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  enhanceCrudUI(modal);
  refreshTemporalInputs(modal);
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}
function fecharModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  document.body.classList.toggle('modal-open', !!document.querySelector('.modal-overlay:not(.hidden)'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Fecha modal clicando fora
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    if (e.target.id === 'modal-agendamento-alerta') return;
    e.target.classList.add('hidden');
    document.body.classList.toggle('modal-open', !!document.querySelector('.modal-overlay:not(.hidden)'));
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
function dataLocal(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function hoje() {
  return dataLocal();
}

function toInputDatetime(iso) {
  if (!iso) return '';
  return iso.replace(' ', 'T').slice(0, 16);
}

function toDbDatetime(inputVal) {
  return inputVal.replace('T', ' ') + ':00';
}

function abrirWhatsApp(telefone, dataHoraAgend, nomeCliente, isLaser = false) {
  if (!telefone) { toast('Cliente sem telefone cadastrado.', 'error'); return; }

  const digitos = telefone.replace(/\D/g, '');
  const num = digitos.startsWith('55') && digitos.length >= 12 ? digitos : `55${digitos}`;

  const horaAtual = new Date().getHours();
  const saudacao  = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = nomeCliente ? ', ' + nomeCliente.trim().split(' ')[0] : '';

  let refDia = '';
  let textoLaser = '';
  if (dataHoraAgend) {
    const agora = new Date();
    const dAgend = new Date(dataHoraAgend.replace(' ', 'T'));
    const hojeLocal = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const diaAgendLocal = new Date(dAgend.getFullYear(), dAgend.getMonth(), dAgend.getDate());
    const diferencaDias = Math.round((diaAgendLocal - hojeLocal) / 86400000);
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const hora = dAgend.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = dAgend.toLocaleDateString('pt-BR');
    const relativo = diferencaDias === 0 ? 'hoje'
      : diferencaDias === 1 ? 'amanhã'
      : diferencaDias === 2 ? 'depois de amanhã'
      : null;

    refDia = relativo
      ? `${relativo} às ${hora}`
      : `dia ${data}, ${diasSemana[dAgend.getDay()].toLowerCase()}, às ${hora}`;

    const [horaParte, minutoParte] = hora.split(':');
    const horaLaser = minutoParte === '00' ? `${horaParte}h` : `${horaParte}h${minutoParte}`;
    const referenciaLaser = relativo ? `${data}, ${relativo}` : data;
    textoLaser = `${saudacao}${primeiroNome}! Tudo bem?\n\n`
      + `Gostaríamos de confirmar a sua sessão de depilação a laser, dia ${referenciaLaser}, ${diasSemana[dAgend.getDay()]}, às ${horaLaser}.\n\n`
      + 'Obs.: lembrando de depilar com a lâmina antes de vir para o procedimento de depilação a laser.';
  }

  const textoPadrao = refDia
    ? `${saudacao}${primeiroNome}! Passando para confirmar o seu horário ${refDia}. Tudo certo?`
    : `${saudacao}${primeiroNome}!`;
  const texto = isLaser && textoLaser ? textoLaser : textoPadrao;

  window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, '_blank');
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
const UI_ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  appointments: '<path d="M8 4h13v16H8z"/><path d="M3 8h5M3 12h5M3 16h5M12 9h5M12 13h5"/>',
  clients: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  procedures: '<path d="M6 3v7a6 6 0 0 0 12 0V3M6 7h12M12 16v5"/>',
  finance: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
  promos: '<path d="M20.6 13.6 12 22.2 2 12.2V2h10.2l8.4 8.4a2.3 2.3 0 0 1 0 3.2Z"/><circle cx="7" cy="7" r="1"/>',
  blocks: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
  logs: '<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M14 4h6v16h-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9M15 6h6v6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  save: '<path d="M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7"/>',
  whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.6 2.7 2.2 4.3 5 5"/>',
  health: '<path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/><path d="M9 12h6M12 9v6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
};

function uiIcon(name, className = '') {
  const paths = UI_ICON_PATHS[name] || UI_ICON_PATHS.star;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const CRUD_MODAL_META = {
  'modal-agendamento': { icon: 'appointments', subtitle: 'Defina cliente, horário e serviços com segurança.' },
  'modal-cliente': { icon: 'clients', subtitle: 'Dados pessoais, preferências e histórico clínico.' },
  'modal-procedimento': { icon: 'procedures', subtitle: 'Configure duração, valor e possíveis variações.' },
  'modal-promocao': { icon: 'promos', subtitle: 'Crie regras comerciais claras e com vigência definida.' },
  'modal-bloqueio': { icon: 'blocks', subtitle: 'Reserve períodos que não podem receber atendimentos.' },
  'modal-prontuario': { icon: 'logs', subtitle: 'Acompanhe a evolução e as anotações do cliente.' },
  'modal-usuario': { icon: 'users', subtitle: 'Defina credenciais e nível de acesso.' },
  'modal-senha': { icon: 'lock', subtitle: 'Escolha uma nova senha segura para este usuário.' },
};

function _temporalLabel(source) {
  return source.closest('.form-group')?.querySelector('label')?.textContent.replace('*', '').trim() || 'Data e hora';
}

function _timeOptions(currentValue = '') {
  const values = [];
  for (let minutes = 6 * 60; minutes <= 22 * 60; minutes += 15) {
    values.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  if (currentValue && !values.includes(currentValue)) values.push(currentValue);
  values.sort();
  return '<option value="">Selecione</option>' + values.map(value => `<option value="${value}">${value}</option>`).join('');
}

function enhanceTemporalInputs(root = document) {
  root.querySelectorAll('input[type="datetime-local"]:not([data-smart-temporal])').forEach(source => {
    source.dataset.smartTemporal = '1';
    source.classList.add('temporal-source');
    source.type = 'hidden';
    source.setAttribute('aria-hidden', 'true');
    source.tabIndex = -1;

    const label = _temporalLabel(source);
    const control = document.createElement('div');
    control.className = 'smart-datetime';
    control.innerHTML = `
      <div class="smart-datetime-fields">
        <label class="smart-temporal-part">
          <span>Data</span>
          <input type="date" class="smart-date-input" aria-label="${escapeHtml(label)}: data">
        </label>
        <label class="smart-temporal-part smart-time-part">
          <span>Horário</span>
          <select class="smart-time-input" aria-label="${escapeHtml(label)}: horário"></select>
        </label>
      </div>
      <div class="smart-temporal-shortcuts">
        <button type="button" data-days="0">Hoje</button>
        <button type="button" data-days="1">Amanhã</button>
      </div>`;
    source.insertAdjacentElement('afterend', control);

    const dateInput = control.querySelector('.smart-date-input');
    const timeInput = control.querySelector('.smart-time-input');
    const syncToSource = () => {
      source.value = dateInput.value && timeInput.value ? `${dateInput.value}T${timeInput.value}` : '';
      source.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const syncFromSource = () => {
      const [date = '', timePart = ''] = String(source.value || '').split('T');
      const time = timePart.slice(0, 5);
      dateInput.value = date;
      timeInput.innerHTML = _timeOptions(time);
      timeInput.value = time;
    };
    dateInput.addEventListener('change', syncToSource);
    timeInput.addEventListener('change', syncToSource);
    control.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
      const date = new Date();
      date.setDate(date.getDate() + Number(button.dataset.days));
      dateInput.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      syncToSource();
    }));
    source._smartTemporal = { syncFromSource, dateInput, timeInput };
    syncFromSource();
  });

  root.querySelectorAll('input[type="date"]:not(.smart-date-input):not([data-smart-date])').forEach(input => {
    input.dataset.smartDate = '1';
    input.classList.add('smart-date-only');
  });
}

function refreshTemporalInputs(root = document) {
  root.querySelectorAll('input[data-smart-temporal]').forEach(source => source._smartTemporal?.syncFromSource());
}

function enhanceCrudUI(root = document) {
  enhanceTemporalInputs(root);
  root.querySelectorAll('.modal-overlay').forEach(overlay => {
    const modal = overlay.querySelector('.modal');
    const header = overlay.querySelector('.modal-header');
    const title = header?.querySelector('h2');
    if (!modal || !header || !title || header.dataset.enhanced) return;
    header.dataset.enhanced = '1';
    modal.classList.add('crud-modal');
    const meta = CRUD_MODAL_META[overlay.id] || { icon: 'edit', subtitle: 'Revise os dados antes de confirmar.' };
    const copy = document.createElement('div');
    copy.className = 'modal-title-group';
    title.parentNode.insertBefore(copy, title);
    copy.innerHTML = `<span class="modal-title-icon">${uiIcon(meta.icon)}</span><span class="modal-title-copy"></span>`;
    const titleCopy = copy.querySelector('.modal-title-copy');
    titleCopy.appendChild(title);
    title.insertAdjacentHTML('afterend', `<small>${escapeHtml(meta.subtitle)}</small>`);
    const close = header.querySelector('.modal-close');
    if (close) {
      close.innerHTML = uiIcon('close');
      close.setAttribute('aria-label', 'Fechar');
      close.title = 'Fechar';
    }
  });
}

queueMicrotask(() => enhanceCrudUI(document));
const crudObserver = new MutationObserver(mutations => {
  if (mutations.some(mutation => mutation.addedNodes.length)) queueMicrotask(() => enhanceCrudUI(document));
});
crudObserver.observe(document.body, { childList: true, subtree: true });
