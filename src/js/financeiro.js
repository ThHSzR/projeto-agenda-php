async function renderFinanceiro() {
  const agora   = new Date();
  const inicio  = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim     = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  const fmtDate = d => d.toISOString().split('T')[0];

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h1>Financeiro</h1>
    </div>
    <div class="filtro-periodo">
      <label>De <input type="date" id="fin-inicio" value="${fmtDate(inicio)}"/></label>
      <label>Até <input type="date" id="fin-fim" value="${fmtDate(fim)}"/></label>
      <button class="btn btn-primary" id="btn-filtrar">Filtrar</button>
    </div>
    <div id="fin-resumo"></div>
    <div id="fin-tabela"></div>
  `;

  async function carregar() {
    const ini = document.getElementById('fin-inicio').value;
    const f   = document.getElementById('fin-fim').value;

    const [resumo, detalhado] = await Promise.all([
      window.api.financeiro.resumo({ inicio: ini, fim: f }),
      window.api.financeiro.detalhado({ inicio: ini, fim: f }),
    ]);

    document.getElementById('fin-resumo').innerHTML = `
      <div class="resumo-cards">
        <div class="card-resumo">
          <span>Agendamentos</span>
          <strong>${resumo.total_agendamentos || 0}</strong>
        </div>
        <div class="card-resumo verde">
          <span>Recebido</span>
          <strong>${formatarMoeda(resumo.recebido)}</strong>
        </div>
        <div class="card-resumo azul">
          <span>A receber</span>
          <strong>${formatarMoeda(resumo.a_receber)}</strong>
        </div>
        <div class="card-resumo vermelho">
          <span>Cancelados</span>
          <strong>${resumo.cancelados || 0}</strong>
        </div>
      </div>
    `;

    const rows = (detalhado || []).map(r => `
      <tr>
        <td>${formatarDataHora(r.data_hora)}</td>
        <td>${r.cliente_nome}</td>
        <td>${r.procedimento_nome || '—'}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${formatarMoeda(r.valor_cobrado)}</td>
      </tr>
    `).join('');

    document.getElementById('fin-tabela').innerHTML = `
      <table class="tabela">
        <thead><tr>
          <th>Data/Hora</th><th>Cliente</th><th>Procedimento</th><th>Status</th><th>Valor</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Nenhum registro</td></tr>'}</tbody>
      </table>
    `;
  }

  carregar();
  document.getElementById('btn-filtrar').addEventListener('click', carregar);
}
