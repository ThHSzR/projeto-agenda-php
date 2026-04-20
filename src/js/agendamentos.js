async function renderAgendamentos() {
  const lista = await window.api.agendamentos.listar({});
  const clientes = await window.api.clientes.listar();
  const procedimentos = await window.api.procedimentos.listar();

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h1>Agendamentos</h1>
      <button class="btn btn-primary" id="btn-novo-agendamento">+ Novo</button>
    </div>
    <table class="tabela">
      <thead>
        <tr>
          <th>Data/Hora</th>
          <th>Cliente</th>
          <th>Procedimentos</th>
          <th>Status</th>
          <th>Valor</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody id="tbody-agendamentos"></tbody>
    </table>
  `;

  const tbody = document.getElementById('tbody-agendamentos');
  tbody.innerHTML = lista.map(a => `
    <tr>
      <td>${formatarDataHora(a.data_hora)}</td>
      <td>${a.cliente_nome}</td>
      <td>${a.procedimento_nome || '—'}${a.variante_nome ? ' — ' + a.variante_nome : ''}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>${formatarMoeda(a.valor_cobrado)}</td>
      <td>
        <button class="btn btn-sm btn-ghost" data-id="${a.id}" data-action="editar">Editar</button>
        <button class="btn btn-sm btn-danger" data-id="${a.id}" data-action="excluir">Excluir</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('btn-novo-agendamento').addEventListener('click', () => abrirModalAgendamento());
  document.querySelectorAll('[data-action="editar"]').forEach(btn => btn.addEventListener('click', () => abrirModalAgendamento(btn.dataset.id)));
  document.querySelectorAll('[data-action="excluir"]').forEach(btn => btn.addEventListener('click', () => excluirAgendamento(btn.dataset.id)));

  async function excluirAgendamento(id) {
    if (!await confirmar('Excluir este agendamento?')) return;
    const res = await window.api.agendamentos.excluir(id);
    if (res?.ok) { toast('Agendamento excluído'); renderAgendamentos(); }
    else toast(res?.erro || 'Erro ao excluir', 'erro');
  }

  async function abrirModalAgendamento(id = null) {
    let ag = null;
    let procsSelecionados = [];
    if (id) {
      ag = await window.api.agendamentos.buscar(id);
      procsSelecionados = ag.procs || [];
    }

    const { overlay, fechar } = abrirModal(`
      <h3>${id ? 'Editar' : 'Novo'} Agendamento</h3>
      <div class="form-grid">
        <label>Cliente
          <select id="ag-cliente"></select>
        </label>
        <label>Data/Hora
          <input type="datetime-local" id="ag-datahora" />
        </label>
        <label>Status
          <select id="ag-status">
            <option value="agendado">Agendado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
        <label>Valor cobrado
          <input type="number" step="0.01" id="ag-valor" />
        </label>
      </div>
      <div class="ag-procedimentos">
        <div class="linha-proc-add">
          <select id="ag-proc-select"></select>
          <button class="btn btn-ghost" id="btn-add-proc">Adicionar procedimento</button>
        </div>
        <div id="lista-procs-agendamento"></div>
      </div>
      <label>Observações
        <textarea id="ag-observacoes"></textarea>
      </label>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Cancelar</button>
        <button class="btn btn-primary" id="btn-salvar-agendamento">Salvar</button>
      </div>
    `);

    const clienteSel = overlay.querySelector('#ag-cliente');
    clienteSel.innerHTML = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    const procSel = overlay.querySelector('#ag-proc-select');
    procSel.innerHTML = '<option value="">Selecione...</option>' + procedimentos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

    function recalcularValor() {
      const soma = procsSelecionados.reduce((acc, p) => acc + Number(p.valor || 0), 0);
      if (!window.usuarioLogado?.is_admin && window.usuarioLogado?.cargo !== 'gerente') {
        overlay.querySelector('#ag-valor').value = soma.toFixed(2);
      }
    }

    function renderListaProcs() {
      const el = overlay.querySelector('#lista-procs-agendamento');
      el.innerHTML = procsSelecionados.map((p, i) => `
        <div class="proc-item">
          <span>${p.procedimento_nome || p.nome || 'Procedimento'}${p.variante_nome ? ' — ' + p.variante_nome : ''}</span>
          <span>${p.duracao_min || 0} min</span>
          <span>${formatarMoeda(p.valor)}</span>
          <button class="btn btn-sm btn-danger" data-i="${i}">Remover</button>
        </div>
      `).join('');
      el.querySelectorAll('[data-i]').forEach(btn => {
        btn.addEventListener('click', () => {
          procsSelecionados.splice(Number(btn.dataset.i), 1);
          renderListaProcs();
          recalcularValor();
        });
      });
    }

    overlay.querySelector('#btn-add-proc').addEventListener('click', async () => {
      const idProc = procSel.value;
      if (!idProc) return;
      const proc = procedimentos.find(p => String(p.id) === String(idProc));
      if (!proc) return;

      if (proc.tem_variantes) {
        const variantes = await window.api.variantes.listar(proc.id);
        const variante = variantes[0] || null;
        procsSelecionados.push({
          procedimento_id: proc.id,
          procedimento_nome: proc.nome,
          variante_id: variante?.id || null,
          variante_nome: variante?.nome || null,
          valor: Number(variante?.valor ?? proc.valor ?? 0),
          duracao_min: Number(variante?.duracao_min ?? proc.duracao_min ?? 0)
        });
      } else {
        procsSelecionados.push({
          procedimento_id: proc.id,
          procedimento_nome: proc.nome,
          variante_id: null,
          variante_nome: null,
          valor: Number(proc.valor ?? 0),
          duracao_min: Number(proc.duracao_min ?? 0)
        });
      }
      renderListaProcs();
      recalcularValor();
    });

    if (ag) {
      clienteSel.value = ag.cliente_id;
      overlay.querySelector('#ag-datahora').value = ag.data_hora?.slice(0,16) || '';
      overlay.querySelector('#ag-status').value = ag.status || 'agendado';
      overlay.querySelector('#ag-valor').value = ag.valor_cobrado || '';
      overlay.querySelector('#ag-observacoes').value = ag.observacoes || '';
      renderListaProcs();
    }

    if (!ag) recalcularValor();

    if (!window.usuarioLogado?.is_admin && window.usuarioLogado?.cargo !== 'gerente') {
      overlay.querySelector('#ag-valor').setAttribute('readonly', 'readonly');
    }

    overlay.querySelector('#btn-salvar-agendamento').addEventListener('click', async () => {
      const payload = {
        id: id || undefined,
        cliente_id: Number(clienteSel.value),
        data_hora: overlay.querySelector('#ag-datahora').value,
        status: overlay.querySelector('#ag-status').value,
        valor_cobrado: Number(overlay.querySelector('#ag-valor').value || 0),
        observacoes: overlay.querySelector('#ag-observacoes').value,
        procs: procsSelecionados.map(p => ({
          procedimento_id: Number(p.procedimento_id),
          variante_id: p.variante_id ? Number(p.variante_id) : null,
          valor: Number(p.valor || 0),
          duracao_min: Number(p.duracao_min || 0)
        }))
      };
      const res = await window.api.agendamentos.salvar(payload);
      if (res?.id) {
        toast('Agendamento salvo');
        fechar();
        renderAgendamentos();
      } else {
        toast(res?.erro || 'Erro ao salvar', 'erro');
      }
    });
  }
}
