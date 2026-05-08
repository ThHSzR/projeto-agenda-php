async function renderLogs() {
  const page = document.getElementById('page-logs');
  if (!page) return;

  page.innerHTML = `
    <div class="page-header">
      <h1>📝 Log de Atividades</h1>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="log-limite" onchange="_carregarLogs()" style="padding:6px 10px;border-radius:var(--radius);border:1px solid var(--border)">
          <option value="50">Últimos 50</option>
          <option value="100" selected>Últimos 100</option>
          <option value="200">Últimos 200</option>
          <option value="500">Últimos 500</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="_carregarLogs()">🔄 Atualizar</button>
      </div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th style="width:150px">Data/Hora</th>
            <th style="width:120px">Usuário</th>
            <th style="width:120px">Ação</th>
            <th style="width:120px">Entidade</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="tbody-logs">
          <tr><td colspan="5"><div class="empty-state"><div class="icon">⏳</div><p>Carregando...</p></div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  await _carregarLogs();
}

async function _carregarLogs() {
  const limite = document.getElementById('log-limite')?.value || 100;
  const tbody = document.getElementById('tbody-logs');
  if (!tbody) return;

  try {
    const logs = await window.api.logs.listar(limite);

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">📝</div><p>Nenhuma atividade registrada.</p></div></td></tr>`;
      return;
    }

    const ACAO_ICONS = {
      criar: '🆕', editar: '✏️', excluir: '🗑️',
      login: '🔑', logout: '🚪', status: '🔄',
      concluir: '✅', cancelar: '❌',
    };

    const ENTIDADE_LABELS = {
      agendamento: '📅 Agendamento',
      cliente: '👤 Cliente',
      procedimento: '💆 Procedimento',
      promocao: '🏷️ Promoção',
      usuario: '👤 Usuário',
      bloqueio: '🚫 Bloqueio',
    };

    tbody.innerHTML = logs.map(l => {
      const icon = ACAO_ICONS[l.acao] || '📋';
      const entLabel = ENTIDADE_LABELS[l.entidade] || l.entidade || '—';
      const dt = l.criado_em ? fmtDataHora(l.criado_em) : '—';
      return `
        <tr>
          <td style="font-size:12px;color:var(--text-muted)">${dt}</td>
          <td><strong style="font-size:12px">${l.usuario || 'Sistema'}</strong></td>
          <td>${icon} <span style="font-size:12px">${l.acao || '—'}</span></td>
          <td style="font-size:12px">${entLabel}${l.entidade_id ? ` #${l.entidade_id}` : ''}</td>
          <td style="font-size:11px;color:var(--text-muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(l.detalhes || '').replace(/"/g, '&quot;')}">${l.detalhes || '—'}</td>
        </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="icon">❌</div><p>Erro: ${e.message}</p></div></td></tr>`;
  }
}
