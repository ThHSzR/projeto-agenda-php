<?php
// ─── Configurações do banco de dados MySQL ───────────────────────────────────
// Edite estas variáveis antes de fazer o deploy na HostGator
define('DB_HOST',     'localhost');
define('DB_NAME',     'SEU_BANCO_AQUI');      // ex: usuario_agenda
define('DB_USER',     'SEU_USUARIO_AQUI');    // ex: usuario_agenda_user
define('DB_PASS',     'SUA_SENHA_AQUI');
define('DB_CHARSET',  'utf8mb4');

// Segredo da sessão — troque por um valor aleatório longo
define('SESSION_SECRET', 'troque-este-segredo-por-algo-aleatorio-longo');

// Tempo de sessão em segundos (8 horas)
define('SESSION_LIFETIME', 8 * 60 * 60);
