async function renderBloqueios() {
  const page = document.getElementById('page-bloqueios');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header">
      <div><span class="page-eyebrow">Disponibilidade</span><h1>Bloqueios de horário</h1></div>
      <button class="btn btn-primary" onclick="abrirNovoBloqueio()">+ Novo Bloqueio</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr><th>Título</th><th>Início</th><th>Fim</th><th>Motivo</th><th>Recorrente</th><th>Ações</th></tr>
        </thead>
        <tbody id="tbody-bloqueios">
          <tr><td colspan="6"><div class="empty-state"><p>Carregando bloqueios...</p></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  await _carregarBloqueios();
}

async function _carregarBloqueios() {
  try {
    const lista = await window.api.bloqueios.listar({});
    const tbody = document.getElementById('tbody-bloqueios');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>Nenhum bloqueio cadastrado.</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(b => `
      <tr>
        <td><strong>${escapeHtml(b.titulo || 'Bloqueado')}</strong></td>
        <td>${fmtDataHora(b.data_hora_inicio)}</td>
        <td>${fmtDataHora(b.data_hora_fim)}</td>
        <td style="color:var(--text-muted);font-size:12px">${escapeHtml(b.motivo || '—')}</td>
        <td>${b.recorrente ? '<span class="badge badge-agendado">Semanal</span>' : 'Não'}</td>
        <td>
          <button class="btn btn-info btn-sm" onclick="editarBloqueio(${b.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluirBloqueio(${b.id})">Excluir</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar bloqueios:', e);
  }
}

function abrirNovoBloqueio() {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
  if (start.getHours() >= 21) {
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const localValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  document.getElementById('bloqueio-id').value = '';
  document.getElementById('bloqueio-titulo').value = '';
  document.getElementById('bloqueio-inicio').value = localValue(start);
  document.getElementById('bloqueio-fim').value = localValue(end);
  document.getElementById('bloqueio-motivo').value = '';
  document.getElementById('bloqueio-recorrente').checked = false;
  document.getElementById('modal-bloqueio-title').textContent = 'Novo Bloqueio';
  abrirModal('modal-bloqueio');
}

document.addEventListener('change', event => {
  if (event.target?.id !== 'bloqueio-inicio') return;
  const start = new Date(event.target.value);
  const endInput = document.getElementById('bloqueio-fim');
  if (!endInput || Number.isNaN(start.getTime())) return;
  const currentEnd = new Date(endInput.value);
  if (!endInput.value || currentEnd <= start) {
    const suggestedEnd = new Date(start.getTime() + 60 * 60 * 1000);
    endInput.value = `${suggestedEnd.getFullYear()}-${String(suggestedEnd.getMonth() + 1).padStart(2, '0')}-${String(suggestedEnd.getDate()).padStart(2, '0')}T${String(suggestedEnd.getHours()).padStart(2, '0')}:${String(suggestedEnd.getMinutes()).padStart(2, '0')}`;
    refreshTemporalInputs(document.getElementById('modal-bloqueio'));
  }
});

async function editarBloqueio(id) {
  try {
    const lista = await window.api.bloqueios.listar({});
    const b = lista.find(x => x.id === id);
    if (!b) return;

    document.getElementById('bloqueio-id').value = b.id;
    document.getElementById('bloqueio-titulo').value = b.titulo || '';
    document.getElementById('bloqueio-inicio').value = toInputDatetime(b.data_hora_inicio);
    document.getElementById('bloqueio-fim').value = toInputDatetime(b.data_hora_fim);
    document.getElementById('bloqueio-motivo').value = b.motivo || '';
    document.getElementById('bloqueio-recorrente').checked = !!b.recorrente;
    document.getElementById('modal-bloqueio-title').textContent = 'Editar Bloqueio';
    abrirModal('modal-bloqueio');
  } catch (e) {
    toast('Erro ao carregar bloqueio.', 'error');
  }
}

async function salvarBloqueio() {
  const inicio = document.getElementById('bloqueio-inicio').value;
  const fim = document.getElementById('bloqueio-fim').value;
  if (!inicio || !fim) { toast('Preencha início e fim.', 'error'); return; }
  if (new Date(fim) <= new Date(inicio)) {
    toast('O fim do bloqueio deve ser posterior ao início.', 'error');
    return;
  }

  try {
    await window.api.bloqueios.salvar({
      id: document.getElementById('bloqueio-id').value || null,
      titulo: document.getElementById('bloqueio-titulo').value || 'Bloqueado',
      data_hora_inicio: toDbDatetime(inicio),
      data_hora_fim: toDbDatetime(fim),
      motivo: document.getElementById('bloqueio-motivo').value || null,
      recorrente: document.getElementById('bloqueio-recorrente').checked ? 1 : 0,
    });
    fecharModal('modal-bloqueio');
    toast('Bloqueio salvo!', 'success');
    await _carregarBloqueios();
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
  }
}

async function excluirBloqueio(id) {
  if (!confirm('Excluir este bloqueio?')) return;
  try {
    await window.api.bloqueios.excluir(id);
    toast('Bloqueio excluído.', 'info');
    await _carregarBloqueios();
  } catch (e) {
    toast('Erro ao excluir.', 'error');
  }
}
