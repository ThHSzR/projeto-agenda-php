<?php
// debug.php — APAGUE este arquivo depois dos testes!
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h2>1. Teste de PHP</h2>";
echo "PHP OK — versão: " . PHP_VERSION . "<br>";

echo "<h2>2. Teste de sessão</h2>";
session_start();
$_SESSION['teste'] = 'ok';
echo "Sessão OK — ID: " . session_id() . "<br>";

echo "<h2>3. Teste de conexão com o banco</h2>";
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
try {
    $db = getDb();
    echo "Conexão com MySQL OK!<br>";

    $usuarios = $db->query('SELECT id, usuario, cargo, is_admin FROM usuarios')->fetchAll();
    echo "<br><strong>Usuários no banco (" . count($usuarios) . "):</strong><br>";
    foreach ($usuarios as $u) {
        echo "— ID {$u['id']}: {$u['usuario']} | cargo: {$u['cargo']} | admin: {$u['is_admin']}<br>";
    }

    $clientes = $db->query('SELECT COUNT(*) as total FROM clientes')->fetch();
    echo "<br>Clientes: {$clientes['total']}<br>";

    $procs = $db->query('SELECT COUNT(*) as total FROM procedimentos')->fetch();
    echo "Procedimentos: {$procs['total']}<br>";

    $agends = $db->query('SELECT COUNT(*) as total FROM agendamentos')->fetch();
    echo "Agendamentos: {$agends['total']}<br>";

} catch (Exception $e) {
    echo "<span style='color:red'>ERRO no banco: " . $e->getMessage() . "</span><br>";
}

echo "<h2>4. Teste de login manual</h2>";
$usuario = 'admin';
$senha   = 'admin123';
try {
    $db   = getDb();
    $stmt = $db->prepare('SELECT * FROM usuarios WHERE usuario = ?');
    $stmt->execute([$usuario]);
    $user = $stmt->fetch();
    if (!$user) {
        echo "<span style='color:red'>Usuário '$usuario' NÃO encontrado no banco!</span><br>";
    } else {
        echo "Usuário encontrado: {$user['usuario']}<br>";
        echo "Hash no banco: {$user['senha']}<br>";
        $ok = password_verify($senha, $user['senha']);
        echo "Senha '$senha' bate com o hash? <strong>" . ($ok ? 'SIM ✅' : 'NÃO ❌') . "</strong><br>";
    }
} catch (Exception $e) {
    echo "<span style='color:red'>ERRO: " . $e->getMessage() . "</span><br>";
}

echo "<h2>5. Teste do endpoint /api/me via include</h2>";
echo "Session logado: " . (isset($_SESSION['logado']) ? 'sim' : 'não') . "<br>";
echo "Cookies: " . (empty($_COOKIE) ? 'nenhum' : implode(', ', array_keys($_COOKIE))) . "<br>";

echo "<hr><p style='color:gray'>Acesse: <a href='/agenda/api.php?_route=login' style='color:blue'>/agenda/api.php?_route=me</a></p>";