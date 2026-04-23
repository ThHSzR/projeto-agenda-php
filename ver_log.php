<?php
// ver_log.php — APAGUE após debug!
$log = __DIR__ . '/app.log';
$linhas = file_exists($log) ? array_slice(file($log), -100) : ['(log vazio ainda)'];
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Log em tempo real</title>
<style>
  body { background:#111; color:#0f0; font-family:monospace; font-size:13px; padding:16px; }
  .error { color:#f55; }
  .warn  { color:#fa0; }
  .info  { color:#0f0; }
  pre    { margin:2px 0; white-space:pre-wrap; word-break:break-all; }
</style>
</head>
<body>
<h3 style="color:#fff">📋 app.log — últimas 100 linhas <small style="color:#888">(atualiza a cada 2s)</small></h3>
<div id="log">
<?php foreach (array_reverse($linhas) as $l): ?>
  <pre class="<?= str_contains($l,'ERROR') ? 'error' : (str_contains($l,'WARN') ? 'warn' : 'info') ?>">
    <?= htmlspecialchars($l) ?>
  </pre>
<?php endforeach; ?>
</div>
<script>
setInterval(() => {
  fetch(location.href + '?t=' + Date.now())
    .then(r => r.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      document.getElementById('log').innerHTML = doc.getElementById('log').innerHTML;
    });
}, 2000);
</script>
</body>
</html>