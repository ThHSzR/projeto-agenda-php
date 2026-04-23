<?php
function logApp(string $nivel, string $msg, array $ctx = []): void {
    $linha = sprintf(
        "[%s] [%s] %s %s\n",
        date('Y-m-d H:i:s'),
        strtoupper($nivel),
        $msg,
        $ctx ? json_encode($ctx, JSON_UNESCAPED_UNICODE) : ''
    );
    file_put_contents(__DIR__ . '/app.log', $linha, FILE_APPEND | LOCK_EX);
}