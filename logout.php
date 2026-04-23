<?php
// ── Logout seguro: destrói sessão no servidor E remove o cookie no browser ──
session_start();

// Limpa todos os dados da sessão
$_SESSION = [];

// Remove o cookie de sessão do browser
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// Destrói a sessão no servidor
session_destroy();

// Redireciona para login (caminho relativo ao domínio)
$base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
header('Location: ' . $base . '/src/login.html');
exit;
