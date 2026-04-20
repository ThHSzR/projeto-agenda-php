let calView = 'dia';
let calDate = new Date();

async function renderCalendario() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="page-header calendario-header">
      <div>
        <h1>Calendário</h1>
        <p id="cal-subtitulo"></p>
      </div>
      <div class="calendar-controls">
        <button class="btn btn-ghost" id="btn-prev">◀</button>
        <button class="btn btn-ghost" id="btn-today">Hoje</button>
        <button class="btn btn-ghost" id="btn-next">▶</button>
        <select id="cal-view" class="input small">
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mês</option>
        </select>
      </div>
    </div>
    <div id="calendario-wrap"></div>
  `;

  document.getElementById('cal-view').value = calView;
  document.getElementById('btn-prev').onclick = () => navegarCalendario(-1);
  document.getElementById('btn-next').onclick = () => navegarCalendario(1);
  document.getElementById('btn-today').onclick = () => { calDate = new Date(); renderCalendario(); };
  document.getElementById('cal-view').onchange = e => { calView = e.target.value; renderCalendario(); };

  if (calView === 'dia') await renderCalendarioDia();
  if (calView === 'semana') await renderCalendarioSemana();
  if (calView === 'mes') await renderCalendarioMes();
}

function navegarCalendario(delta) {
  if (calView === 'dia') calDate.setDate(calDate.getDate() + delta);
  if (calView === 'semana') calDate.setDate(calDate.getDate() + delta * 7);
  if (calView === 'mes') calDate.setMonth(calDate.getMonth() + delta);
  renderCalendario();
}

async function renderCalendarioDia() {
  const data = calDate.toISOString().split('T')[0];
  const ags = await window.api.agendamentos.listar({ data });
  document.getElementById('cal-subtitulo').textContent = calDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  const horas = Array.from({ length: 13 }, (_, i) => i + 8);
  const html = horas.map(h => {
    const slot = ags.filter(a => new Date(a.data_hora).getHours() === h);
    return `
      <div class="cal-slot">
        <div class="cal-time">${String(h).padStart(2,'0')}:00</div>
        <div class="cal-events">
          ${slot.map(a => cardEvento(a)).join('') || '<span class="muted">Livre</span>'}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('calendario-wrap').innerHTML = `<div class="cal-dia">${html}</div>`;
  bindEventoCalendario();
}

async function renderCalendarioSemana() {
  const start = new Date(calDate);
  const day = start.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const data_inicio = start.toISOString().split('T')[0] + ' 00:00:00';
  const data_fim = end.toISOString().split('T')[0] + ' 23:59:59';
  const ags = await window.api.agendamentos.listar({ data_inicio, data_fim });

  document.getElementById('cal-subtitulo').textContent = `${start.toLocaleDateString('pt-BR')} — ${end.toLocaleDateString('pt-BR')}`;

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const chave = d.toISOString().split('T')[0];
    const itens = ags.filter(a => a.data_hora.startsWith(chave));
    return `
      <div class="cal-coluna">
        <div class="cal-coluna-head">${d.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' })}</div>
        <div class="cal-coluna-body">
          ${itens.map(a => cardEvento(a)).join('') || '<span class="muted">Sem agendamentos</span>'}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('calendario-wrap').innerHTML = `<div class="cal-semana">${dias}</div>`;
  bindEventoCalendario();
}

async function renderCalendarioMes() {
  const ano = calDate.getFullYear();
  const mes = calDate.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const data_inicio = primeiro.toISOString().split('T')[0] + ' 00:00:00';
  const data_fim = ultimo.toISOString().split('T')[0] + ' 23:59:59';
  const ags = await window.api.agendamentos.listar({ data_inicio, data_fim });

  document.getElementById('cal-subtitulo').textContent = primeiro.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

  const inicioSemana = new Date(primeiro);
  const ajuste = inicioSemana.getDay() === 0 ? -6 : 1 - inicioSemana.getDay();
  inicioSemana.setDate(inicioSemana.getDate() + ajuste);

  let html = '<div class="cal-mes-grid">';
  ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].forEach(d => {
    html += `<div class="cal-mes-head">${d}</div>`;
  });

  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    const chave = d.toISOString().split('T')[0];
    const itens = ags.filter(a => a.data_hora.startsWith(chave));
    const outroMes = d.getMonth() !== mes;
    html += `
      <div class="cal-dia-box ${outroMes ? 'outro-mes' : ''}">
        <div class="cal-dia-num">${d.getDate()}</div>
        <div class="cal-dia-itens">
          ${itens.slice(0,3).map(a => `<div class="mini-ev" data-id="${a.id}">${new Date(a.data_hora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} ${a.cliente_nome}</div>`).join('')}
          ${itens.length > 3 ? `<div class="muted">+${itens.length - 3} mais</div>` : ''}
        </div>
      </div>
    `;
  }

  html += '</div>';
  document.getElementById('calendario-wrap').innerHTML = html;
  bindEventoCalendario('.mini-ev');
}

function cardEvento(a) {
  return `
    <div class="cal-evento" data-id="${a.id}">
      <strong>${new Date(a.data_hora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</strong>
      <span>${a.cliente_nome}</span>
      <small>${a.procedimento_nome || 'Procedimento'}</small>
    </div>
  `;
}

function bindEventoCalendario(selector = '.cal-evento') {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('click', async () => {
      const ag = await window.api.agendamentos.buscar(el.dataset.id);
      abrirModal(`
        <h3>Agendamento</h3>
        <p><strong>Cliente:</strong> ${ag.cliente_nome}</p>
        <p><strong>Data/Hora:</strong> ${formatarDataHora(ag.data_hora)}</p>
        <p><strong>Status:</strong> ${ag.status}</p>
        <p><strong>Valor:</strong> ${formatarMoeda(ag.valor_cobrado)}</p>
        <p><strong>Procedimentos:</strong> ${(ag.procs || []).map(p => p.procedimento_nome + (p.variante_nome ? ' — ' + p.variante_nome : '')).join(', ') || '—'}</p>
        <p><strong>Observações:</strong> ${ag.observacoes || '—'}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-fechar">Fechar</button>
        </div>
      `);
    });
  });
}
