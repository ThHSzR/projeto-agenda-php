let calView = 'dia';
let calDate = new Date();

function _calDateTimeLocal(value) {
  return new Date(String(value).replace(' ', 'T'));
}

function _calTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function _calDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function _calVisibleHours(appointments, blocks) {
  let firstHour = 7;
  let lastHour = 21;
  appointments.forEach(item => {
    const hour = Number(String(item.data_hora).slice(11, 13));
    if (Number.isInteger(hour)) {
      firstHour = Math.min(firstHour, hour);
      lastHour = Math.max(lastHour, hour);
    }
  });
  blocks.forEach(block => {
    firstHour = Math.min(firstHour, block.occurrenceStart.getHours());
    const endHour = block.occurrenceEnd.getHours() + (block.occurrenceEnd.getMinutes() > 0 ? 1 : 0);
    lastHour = Math.max(lastHour, Math.min(23, endHour));
  });
  return { firstHour: Math.max(0, firstHour), lastHour: Math.min(23, lastHour) };
}

function _calBlocksOnDate(blocks, dateStr) {
  const target = new Date(`${dateStr}T12:00:00`);
  return blocks.flatMap(block => {
    const originalStart = _calDateTimeLocal(block.data_hora_inicio);
    const originalEnd = _calDateTimeLocal(block.data_hora_fim);
    if (Number.isNaN(originalStart.getTime()) || Number.isNaN(originalEnd.getTime())) return [];

    if (!Number(block.recorrente)) {
      const dayStart = new Date(`${dateStr}T00:00:00`);
      const dayEnd = new Date(`${dateStr}T23:59:59`);
      return originalStart <= dayEnd && originalEnd >= dayStart ? [{ ...block, occurrenceStart: originalStart, occurrenceEnd: originalEnd }] : [];
    }

    if (originalStart.getDay() !== target.getDay()) return [];
    const duration = originalEnd.getTime() - originalStart.getTime();
    const occurrenceStart = new Date(target);
    occurrenceStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    if (occurrenceStart < originalStart) return [];
    return [{ ...block, occurrenceStart, occurrenceEnd: new Date(occurrenceStart.getTime() + duration) }];
  });
}

function _calPrefill(dateStr, hour = 9) {
  abrirNovoAgendamento(`${dateStr}T${String(hour).padStart(2, '0')}:00`);
}

async function renderCalendario() {
  const container = document.getElementById('page-calendario');

  // Toolbar
  const mesNome = calDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  container.innerHTML = `
    <div class="page-header">
      <div><span class="page-eyebrow">Agenda</span><h1>Calendário</h1></div>
      <button class="btn btn-primary" onclick="abrirNovoAgendamento()">+ Novo Agendamento</button>
    </div>
    <div id="calendario-container">
      <div class="cal-toolbar">
        <button class="btn btn-secondary btn-sm" onclick="calNav(-1)">‹ Anterior</button>
        <h2 id="cal-titulo" style="text-transform:capitalize">${mesNome}</h2>
        <button class="btn btn-secondary btn-sm" onclick="calNav(1)">Próximo ›</button>
        <div class="cal-view-btns">
          <button onclick="calMudarView('dia')"    class="${calView==='dia'?'active':''}">Dia</button>
          <button onclick="calMudarView('semana')" class="${calView==='semana'?'active':''}">Semana</button>
          <button onclick="calMudarView('mes')"    class="${calView==='mes'?'active':''}">Mês</button>
        </div>
        <button class="btn btn-rosa btn-sm" onclick="calHoje()">Hoje</button>
      </div>
      <div id="cal-body"></div>
    </div>
  `;

  await renderCalBody();
}

async function renderCalBody() {
  if (calView === 'mes')    await renderMes();
  if (calView === 'semana') await renderSemana();
  if (calView === 'dia')    await renderDia();
}

// ── MÊS ──────────────────────────────────────────────────────
async function renderMes() {
  const ano = calDate.getFullYear(), mes = calDate.getMonth();
  const inicio = `${ano}-${String(mes+1).padStart(2,'0')}-01`;
  const fim    = `${ano}-${String(mes+1).padStart(2,'0')}-31`;
  const ags    = await window.api.agendamentos.listar({ data_inicio: inicio + ' 00:00:00', data_fim: fim + ' 23:59:59' });
  const blocks = await window.api.bloqueios.listar({ data_inicio: inicio + ' 00:00:00', data_fim: fim + ' 23:59:59' });

  const agMap = {};
  ags.forEach(a => {
    const d = a.data_hora.slice(0,10);
    if (!agMap[d]) agMap[d] = [];
    agMap[d].push(a);
  });

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias   = new Date(ano, mes + 1, 0).getDate();
  const hojeStr     = hoje();
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  let html = `<div class="cal-month">
    <div class="cal-month-header">${dias.map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="cal-month-grid">`;

  // Dias do mês anterior
  const diasAnt = new Date(ano, mes, 0).getDate();
  for (let i = primeiroDia - 1; i >= 0; i--) {
    html += `<div class="cal-day outro-mes"><div class="dia-num">${diasAnt - i}</div></div>`;
  }

  for (let d = 1; d <= totalDias; d++) {
    const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isHoje  = dataStr === hojeStr;
    const eventos = agMap[dataStr] || [];
    const dayBlocks = _calBlocksOnDate(blocks, dataStr);
    const blockHtml = dayBlocks.slice(0, 2).map(b =>
      `<div class="cal-blocked" title="${escapeHtml(b.motivo || b.titulo || 'Horário bloqueado')}">${_calTime(b.occurrenceStart)} ${escapeHtml(b.titulo || 'Bloqueado')}</div>`
    ).join('');
    const evHtml  = eventos.slice(0,3).map(a =>
      `<div class="cal-evento ${a.status}" title="${escapeHtml(a.cliente_nome)} - ${escapeHtml(a.procedimento_nome)}" onclick="event.stopPropagation();editarAgendamento(${a.id})">${fmtHora(a.data_hora)} ${escapeHtml(a.cliente_nome)}</div>`
    ).join('') + (eventos.length > 3 ? `<div style="font-size:10px;color:var(--text-muted)">+${eventos.length-3} mais</div>` : '');

    html += `<div class="cal-day${isHoje?' hoje':''}" onclick="calIrDia('${dataStr}')">
      <div class="dia-num">${d}</div>${blockHtml}${evHtml}</div>`;
  }

  // Completar última semana
  const restante = (7 - ((primeiroDia + totalDias) % 7)) % 7;
  for (let i = 1; i <= restante; i++) {
    html += `<div class="cal-day outro-mes"><div class="dia-num">${i}</div></div>`;
  }

  html += `</div></div>`;
  document.getElementById('cal-body').innerHTML = html;
}

// ── SEMANA ───────────────────────────────────────────────────
async function renderSemana() {
  const diaSemana = calDate.getDay();
  const diasSemana = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(calDate);
    d.setDate(calDate.getDate() - diaSemana + i);
    diasSemana.push(d);
  }

  const inicio = _calDateKey(diasSemana[0]);
  const fim    = _calDateKey(diasSemana[6]);
  const ags    = await window.api.agendamentos.listar({
    data_inicio: inicio + ' 00:00:00',
    data_fim: fim + ' 23:59:59'
  });
  const blocks = await window.api.bloqueios.listar({
    data_inicio: inicio + ' 00:00:00',
    data_fim: fim + ' 23:59:59'
  });

  const agMap = {};
  ags.forEach(a => {
    const d = a.data_hora.slice(0,10);
    const h = parseInt(a.data_hora.slice(11,13));
    if (!agMap[d]) agMap[d] = {};
    if (!agMap[d][h]) agMap[d][h] = [];
    agMap[d][h].push(a);
  });

  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hojeStr = hoje();
  const weekBlocks = diasSemana.flatMap(date => _calBlocksOnDate(blocks, _calDateKey(date)));
  const { firstHour, lastHour } = _calVisibleHours(ags, weekBlocks);

  let html = `
    <div class="cal-week-wrap">
      <table class="cal-week-table">
        <thead>
          <tr>
            <th class="cal-week-th-hora"></th>
            ${diasSemana.map((d, i) => {
              const ds = _calDateKey(d);
              const isHoje = ds === hojeStr;
              return `<th class="cal-week-th-dia${isHoje ? ' hoje' : ''}">
                <span>${dias[i]}</span>
                <strong>${String(d.getDate()).padStart(2,'0')}</strong>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: lastHour - firstHour + 1 }, (_, idx) => {
            const h = idx + firstHour;
            return `
              <tr>
                <td class="cal-week-hora">${String(h).padStart(2,'0')}:00</td>
                ${diasSemana.map(d => {
                  const ds = _calDateKey(d);
                  const eventos = (agMap[ds] && agMap[ds][h]) || [];
                  const blocked = _calBlocksOnDate(blocks, ds).filter(b => b.occurrenceStart.getHours() === h);
                  return `<td class="cal-week-cell" onclick="_calPrefill('${ds}', ${h})">
                    ${blocked.map(b => `<div class="cal-blocked" onclick="event.stopPropagation()">${_calTime(b.occurrenceStart)} ${escapeHtml(b.titulo || 'Bloqueado')}</div>`).join('')}
                    ${eventos.map(a => `
                      <div class="cal-agend-block" onclick="event.stopPropagation();editarAgendamento(${a.id})">
                        ${fmtHora(a.data_hora)} ${escapeHtml(a.cliente_nome)}
                      </div>
                    `).join('')}
                  </td>`;
                }).join('')}
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('cal-body').innerHTML = html;
}

// ── DIA ───────────────────────────────────────────────────────
async function renderDia() {
  const dataStr = _calDateKey(calDate);
  const ags     = await window.api.agendamentos.listar({ data: dataStr });
  const blocks  = await window.api.bloqueios.listar({ data_inicio: dataStr + ' 00:00:00', data_fim: dataStr + ' 23:59:59' });
  const dayBlocks = _calBlocksOnDate(blocks, dataStr);
  const { firstHour, lastHour } = _calVisibleHours(ags, dayBlocks);

  let html = `<div class="cal-day-wrap">
    <div class="cal-week-header" style="grid-template-columns: 52px 1fr">
      <div></div>
      <div style="text-align:center">${calDate.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
    </div>
    <div class="cal-day-scroll">`;

  for (let h = firstHour; h <= lastHour; h++) {
    const eventos = ags.filter(a => parseInt(a.data_hora.slice(11,13)) === h);
    const blocked = dayBlocks.filter(b => b.occurrenceStart.getHours() === h);
    html += `<div class="cal-day-row">
      <div class="cal-hour-label">${String(h).padStart(2,'0')}:00</div>
      <div class="cal-day-slot" onclick="_calPrefill('${dataStr}', ${h})">
      ${blocked.map(b => `<div class="cal-blocked" onclick="event.stopPropagation()">${_calTime(b.occurrenceStart)}–${_calTime(b.occurrenceEnd)} · ${escapeHtml(b.titulo || 'Bloqueado')}</div>`).join('')}
      ${eventos.map(a =>
        `<div class="cal-agend-block" onclick="event.stopPropagation();editarAgendamento(${a.id})">
          ${fmtHora(a.data_hora)} — <strong>${escapeHtml(a.cliente_nome)}</strong> · ${escapeHtml(a.procedimento_nome)} · ${fmtMoeda(a.valor_cobrado)}
          <span class="badge badge-${a.status}" style="margin-left:6px">${a.status}</span>
        </div>`
      ).join('')}</div>
    </div>`;
  }
  html += `</div></div>`;
  document.getElementById('cal-body').innerHTML = html;
}

// ── NAVEGAÇÃO ────────────────────────────────────────────────
function calNav(dir) {
  if (calView === 'mes')    calDate.setMonth(calDate.getMonth() + dir);
  if (calView === 'semana') calDate.setDate(calDate.getDate() + dir * 7);
  if (calView === 'dia')    calDate.setDate(calDate.getDate() + dir);
  renderCalendario();
}

function calHoje() { calDate = new Date(); renderCalendario(); }

function calMudarView(v) { calView = v; renderCalendario(); }

function calIrDia(dataStr) {
  calDate = new Date(dataStr + 'T12:00');
  calView = 'dia';
  renderCalendario();
}
