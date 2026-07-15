<?php
declare(strict_types=1);

function logApp(string $nivel, string $msg, array $ctx = []): void
{
    $linha = sprintf(
        '[%s] [%s] %s %s',
        date('Y-m-d H:i:s'),
        strtoupper($nivel),
        $msg,
        $ctx ? json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : ''
    );

    error_log($linha);

    if (defined('APP_ENV') && APP_ENV === 'development') {
        file_put_contents(__DIR__ . '/app.log', $linha . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}
