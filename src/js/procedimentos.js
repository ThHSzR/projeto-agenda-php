async function renderProcedimentos() {
  const lista = await window.api.procedimentos.todos();
  const main  = document.getElementById('main-content');

  main.innerHTML = `
    <div class="page-header">
      <h1>Procedimentos</h1>
      <button class="btn btn-primary" id="btn-novo-procedimento">+ Novo</button>
    </div>
    <table class="tabela">
      <thead><tr>
        <th>Nome</th>
        <th>Duração</th>
        <th>Valor</th>
        <th>Ativo</th>
        <th>Ações</th>
      </tr></thead>
      <tbody id="tbody-procedimentos"></tbody>
    </table>
  `;

  function renderLista(rows) {
    document.getElementById('tbody-procedimentos').innerHTML = rows.map(p => `
      <tr>
        <td>${p.nome}</td>
        <td>${p.duracao_min || 0} min</td>
        <td>${formatarMoeda(p.valor)}</td>
        <td>${p.ativo ? '✅' : '—'}</td>
        <td>
          <button class="btn btn-sm btn-ghost" data-id="${p.id}" data-action="editar">Editar</button>
          <button class="btn btn-sm btn-danger" data-id="${p.id}" data-action="excluir">Desativar</button>
          <button class="btn btn-sm btn-ghost" data-id="${p.id}" data-action="variantes">Variantes</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('[data-action="editar"]').forEach(btn => btn.addEventListener('click', () => abrirModalProcedimento(btn.dataset.id)));
    document.querySelectorAll('[data-action="excluir"]').forEach(btn => btn.addEventListener('click', () => desativarProcedimento(btn.dataset.id)));
    document.querySelectorAll('[data-action="variantes"]').forEach(btn => btn.addEventListener('click', () => abrirModalVariantes(btn.dataset.id)));
  }

  async function desativarProcedimento(id) {
    if (!await confirmar('Desativar este procedimento?')) return;
    const res = await window.api.procedimentos.excluir(id);
    if (res?.ok) { toast('Procedimento desativado'); renderProcedimentos(); }
    else toast(res?.erro || 'Erro ao desativar', 'erro');
  }

  async function abrirModalProcedimento(id = null) {
    const p = id ? lista.find(x => String(x.id) === String(id)) : {};
    const { overlay, fechar } = abrirModal(`
      <h3>${id ? 'Editar' : 'Novo'} Procedimento</h3>
      <div class="form-grid">
        <label>Nome <input id="p-nome" value="${p.nome || ''}" /></label>
        <label>Duração (min) <input type="number" id="p-duracao" value="${p.duracao_min || 60}" /></label>
        <label>Valor <input type="number" step="0.01" id="p-valor" value="${p.valor || 0}" /></label>
        <label class="checkbox-label"><input type="checkbox" id="p-ativo" ${p.ativo !== 0 ? 'checked' : ''}/> Ativo</label>
        <label class="checkbox-label"><input type="checkbox" id="p-laser" ${p.is_laser ? 'checked' : ''}/> É laser</label>
        <label class="checkbox-label"><input type="checkbox" id="p-variantes" ${p.tem_variantes ? 'checked' : ''}/> Tem variantes</label>
        <label class="full">Descrição <textarea id="p-desc">${p.descricao || ''}</textarea></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Cancelar</button>
        <button class="btn btn-primary" id="btn-salvar-proc">Salvar</button>
      </div>
    `);

    overlay.querySelector('#btn-salvar-proc').addEventListener('click', async () => {
      const payload = {
        id: id || undefined,
        nome: overlay.querySelector('#p-nome').value.trim(),
        descricao: overlay.querySelector('#p-desc').value,
        duracao_min: Number(overlay.querySelector('#p-duracao').value || 0),
        valor: Number(overlay.querySelector('#p-valor').value || 0),
        ativo: overlay.querySelector('#p-ativo').checked ? 1 : 0,
        is_laser: overlay.querySelector('#p-laser').checked ? 1 : 0,
        tem_variantes: overlay.querySelector('#p-variantes').checked ? 1 : 0,
      };
      if (!payload.nome) return toast('Nome obrigatório', 'erro');
      const res = await window.api.procedimentos.salvar(payload);
      if (res?.id) {
        toast('Procedimento salvo');
        fechar();
        renderProcedimentos();
      } else {
        toast(res?.erro || 'Erro ao salvar', 'erro');
      }
    });
  }

  async function abrirModalVariantes(procedimentoId) {
    const proc = lista.find(x => String(x.id) === String(procedimentoId));
    const variantes = await window.api.variantes.listar(procedimentoId);

    const { overlay, fechar } = abrirModal(`
      <h3>Variantes — ${proc?.nome || ''}</h3>
      <div id="lista-variantes"></div>
      <hr class="divider"/>
      <div class="form-grid">
        <label>Nome <input id="v-nome" /></label>
        <label>Duração (min) <input type="number" id="v-duracao" value="30" /></label>
        <label>Valor <input type="number" step="0.01" id="v-valor" value="0" /></label>
        <label class="full">Descrição <textarea id="v-desc"></textarea></label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Fechar</button>
        <button class="btn btn-primary" id="btn-add-variante">Adicionar</button>
      </div>
    `);

    function pintarVars(rows) {
      overlay.querySelector('#lista-variantes').innerHTML = rows.map(v => `
        <div class="proc-item">
          <span>${v.nome}</span>
          <span>${v.duracao_min || 0} min</span>
          <span>${formatarMoeda(v.valor)}</span>
          <button class="btn btn-sm btn-danger" data-id="${v.id}">Excluir</button>
        </div>
      `).join('') || '<p>Nenhuma variante cadastrada.</p>';

      overlay.querySelectorAll('[data-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!await confirmar('Excluir variante?')) return;
          const res = await window.api.variantes.excluir(btn.dataset.id);
          if (res?.ok) {
            toast('Variante excluída');
            abrirModalVariantes(procedimentoId);
            fechar();
          }
        });
      });
    }

    pintarVars(variantes);

    overlay.querySelector('#btn-add-variante').addEventListener('click', async () => {
      const payload = {
        procedimento_id: Number(procedimentoId),
        nome: overlay.querySelector('#v-nome').value.trim(),
        descricao: overlay.querySelector('#v-desc').value,
        duracao_min: Number(overlay.querySelector('#v-duracao').value || 0),
        valor: Number(overlay.querySelector('#v-valor').value || 0),
      };
      if (!payload.nome) return toast('Nome obrigatório', 'erro');
      const res = await window.api.variantes.salvar(payload);
      if (res?.id) {
        toast('Variante adicionada');
        abrirModalVariantes(procedimentoId);
        fechar();
      }
    });
  }

  renderLista(lista);
  document.getElementById('btn-novo-procedimento').addEventListener('click', () => abrirModalProcedimento());
}
