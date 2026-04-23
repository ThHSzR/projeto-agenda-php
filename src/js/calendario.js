let calView = 'dia';
let calDate = new Date();

async function renderCalendario() {
  const container = document.getElementById('page-calendario');

  // Toolbar
  const mesNome = calDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  container.innerHTML = `
    <div class="page-header">
      <h1>📅 Calendário</h1>
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
    const evHtml  = eventos.slice(0,3).map(a =>
      `<div class="cal-evento ${a.status}" title="${a.cliente_nome} - ${a.procedimento_nome}" onclick="event.stopPropagation();editarAgendamento(${a.id})">${fmtHora(a.data_hora)} ${a.cliente_nome}</div>`
    ).join('') + (eventos.length > 3 ? `<div style="font-size:10px;color:var(--text-muted)">+${eventos.length-3} mais</div>` : '');

    html += `<div class="cal-day${isHoje?' hoje':''}" onclick="calIrDia('${dataStr}')">
      <div class="dia-num">${d}</div>${evHtml}</div>`;
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

  const inicio = diasSemana[0].toISOString().slice(0,10);
  const fim    = diasSemana[6].toISOString().slice(0,10);
  const ags    = await window.api.agendamentos.listar({
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

  let html = `
    <div class="cal-week-wrap">
      <table class="cal-week-table">
        <thead>
          <tr>
            <th class="cal-week-th-hora"></th>
            ${diasSemana.map((d, i) => {
              const ds = d.toISOString().slice(0,10);
              const isHoje = ds === hojeStr;
              return `<th class="cal-week-th-dia${isHoje ? ' hoje' : ''}">
                <span>${dias[i]}</span>
                <strong>${String(d.getDate()).padStart(2,'0')}</strong>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 15 }, (_, idx) => {
            const h = idx + 7;
            return `
              <tr>
                <td class="cal-week-hora">${String(h).padStart(2,'0')}:00</td>
                ${diasSemana.map(d => {
                  const ds = d.toISOString().slice(0,10);
                  const eventos = (agMap[ds] && agMap[ds][h]) || [];
                  return `<td class="cal-week-cell">
                    ${eventos.map(a => `
                      <div class="cal-agend-block" onclick="editarAgendamento(${a.id})">
                        ${fmtHora(a.data_hora)} ${a.cliente_nome}
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
  const dataStr = calDate.toISOString().slice(0,10);
  const ags     = await window.api.agendamentos.listar({ data: dataStr });

  let html = `<div class="cal-week">
    <div class="cal-week-header" style="grid-template-columns: 52px 1fr">
      <div></div>
      <div style="text-align:center">${calDate.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
    </div>
    <div style="display:block;overflow-y:auto;max-height:600px">`;

  for (let h = 7; h <= 21; h++) {
    const eventos = ags.filter(a => parseInt(a.data_hora.slice(11,13)) === h);
    html += `<div style="display:grid;grid-template-columns:52px 1fr;border-bottom:1px solid var(--border);min-height:52px">
      <div class="cal-hour-label" style="padding-top:6px">${String(h).padStart(2,'0')}:00</div>
      <div style="padding:4px">${eventos.map(a =>
        `<div class="cal-agend-block" onclick="editarAgendamento(${a.id})">
          ${fmtHora(a.data_hora)} — <strong>${a.cliente_nome}</strong> · ${a.procedimento_nome} · ${fmtMoeda(a.valor_cobrado)}
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
