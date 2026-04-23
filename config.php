<?php
// ⚠️  Copie este arquivo para config.local.php e preencha com suas credenciais.
// config.local.php está no .gitignore e NUNCA deve ser commitado.

define('DB_HOST',         getenv('DB_HOST')         ?: 'localhost');
define('DB_NAME',         getenv('DB_NAME')         ?: '');
define('DB_USER',         getenv('DB_USER')         ?: '');
define('DB_PASS',         getenv('DB_PASS')         ?: '');
define('DB_CHARSET',      'utf8mb4');
define('SESSION_SECRET',  getenv('SESSION_SECRET')  ?: 'troque-esta-chave');
define('SESSION_LIFETIME', 8 * 60 * 60);

// Carrega override local se existir (nunca vai para o git)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}
