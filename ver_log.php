<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (APP_ENV !== 'development' || !in_array($ip, ['127.0.0.1', '::1'], true)) {
    http_response_code(404);
    exit;
}

$logPath = __DIR__ . '/app.log';
$lines = is_file($logPath) ? array_slice(file($logPath, FILE_IGNORE_NEW_LINES) ?: [], -150) : [];
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="3">
  <title>Logs de desenvolvimento</title>
  <style>
    body { margin: 0; padding: 20px; background: #161219; color: #eee; font: 13px/1.55 ui-monospace, monospace; }
    h1 { font: 600 18px system-ui; }
    pre { margin: 0; padding: 5px 0; white-space: pre-wrap; overflow-wrap: anywhere; border-bottom: 1px solid #2d2531; }
    .error { color: #ff8d8d; }
    .warn { color: #ffd27d; }
    .empty { color: #9e91a4; }
  </style>
</head>
<body>
  <h1>app.log — últimas <?= count($lines) ?> linhas</h1>
  <?php if (!$lines): ?>
    <p class="empty">O log ainda está vazio.</p>
  <?php else: ?>
    <?php foreach (array_reverse($lines) as $line): ?>
      <?php $class = str_contains($line, '[ERROR]') ? 'error' : (str_contains($line, '[WARN]') ? 'warn' : ''); ?>
      <pre class="<?= $class ?>"><?= htmlspecialchars($line, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></pre>
    <?php endforeach; ?>
  <?php endif; ?>
</body>
</html>
