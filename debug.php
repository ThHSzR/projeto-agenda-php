<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (APP_ENV !== 'development' || !in_array($ip, ['127.0.0.1', '::1'], true)) {
    http_response_code(404);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

try {
    $db = getDb();
    $admin = $db->prepare('SELECT id, usuario, cargo, is_admin, senha FROM usuarios WHERE usuario = ?');
    $admin->execute(['admin']);
    $user = $admin->fetch();

    echo json_encode([
        'ambiente' => APP_ENV,
        'php' => PHP_VERSION,
        'banco' => 'ok',
        'admin_existe' => (bool)$user,
        'admin_senha_dev_valida' => $user ? password_verify('admin', $user['senha']) : false,
        'usuarios' => (int)$db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn(),
        'clientes' => (int)$db->query('SELECT COUNT(*) FROM clientes')->fetchColumn(),
        'procedimentos' => (int)$db->query('SELECT COUNT(*) FROM procedimentos')->fetchColumn(),
        'agendamentos' => (int)$db->query('SELECT COUNT(*) FROM agendamentos')->fetchColumn(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['banco' => 'erro', 'mensagem' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
