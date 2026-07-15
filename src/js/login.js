'use strict';

function publicBasePath(pathname = location.pathname) {
  const cleanPath = pathname.replace(/\/+$/, '');
  const base = cleanPath
    .replace(/\/src(?:\/.*)?$/, '')
    .replace(/\/login$/, '');
  return base === '/' ? '' : base;
}

const basePath = publicBasePath();
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

if (/\/src\/login\.html$/.test(location.pathname)) {
  history.replaceState(null, '', `${basePath}/login`);
}

function loginApiUrl(route) {
  return isLocal
    ? `${basePath}/api.php?_route=${encodeURIComponent(route)}`
    : `${basePath}/api/${route}`;
}

function showLoginError(message) {
  const error = document.getElementById('erro');
  error.textContent = message;
  error.classList.add('visible');
}

async function checkSession() {
  try {
    const response = await fetch(loginApiUrl('me'), { credentials: 'same-origin' });
    if (response.ok) location.replace(`${basePath}/`);
  } catch {
    // A tela continua utilizavel e exibira o erro se o login for tentado.
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const userInput = document.getElementById('usuario');
  const passwordInput = document.getElementById('senha');
  const button = document.getElementById('btn-entrar');
  const error = document.getElementById('erro');
  const usuario = userInput.value.trim();
  const senha = passwordInput.value;

  error.textContent = '';
  error.classList.remove('visible');

  if (!usuario || !senha) {
    showLoginError('Preencha usuário e senha.');
    (!usuario ? userInput : passwordInput).focus();
    return;
  }

  button.disabled = true;
  button.textContent = 'Entrando…';

  try {
    const response = await fetch(loginApiUrl('login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ usuario, senha }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showLoginError(data.erro || 'Não foi possível entrar. Tente novamente.');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    location.replace(`${basePath}/`);
  } catch {
    showLoginError('Não foi possível conectar ao servidor.');
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
}

document.getElementById('login-form').addEventListener('submit', handleLogin);
checkSession();
