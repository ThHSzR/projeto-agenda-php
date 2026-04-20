// ── TOAST ──────────────────────────────────────────────────────────
function toast(msg, tipo = 'sucesso') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── MODAL ──────────────────────────────────────────────────────────
function abrirModal(html, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(overlay);

  const fechar = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  overlay.addEventListener('click', e => {
    if (e.target === overlay) fechar();
  });

  overlay.querySelector('.btn-fechar')?.addEventListener('click', fechar);

  return { overlay, fechar };
}

// ── CONFIRM ─────────────────────────────────────────────────────────
function confirmar(msg) {
  return new Promise(resolve => {
    const { overlay, fechar } = abrirModal(`
      <h3>Confirmar</h3>
      <p>${msg}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-fechar">Cancelar</button>
        <button class="btn btn-danger" id="btn-confirmar">Confirmar</button>
      </div>
    `);
    overlay.querySelector('#btn-confirmar').addEventListener('click', () => {
      fechar();
      resolve(true);
    });
    overlay.querySelector('.btn-fechar').addEventListener('click', () => resolve(false));
  });
}

// ── FORMATO MOEDA ──────────────────────────────────────────────────
function formatarMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

// ── FORMATO DATA ────────────────────────────────────────────────────
function formatarData(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatarDataHora(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── LOADING ──────────────────────────────────────────────────────────
function mostrarLoading(container) {
  container.innerHTML = '<div class="loading">Carregando...</div>';
}
