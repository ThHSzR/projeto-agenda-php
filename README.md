# Agenda Pessoal — PHP + MySQL

Conversão completa do projeto [agenda-pessoal](https://github.com/ThHSzR/agenda-pessoal) de Node.js/SQLite para **PHP puro + MySQL**, compatível com hospedagem compartilhada (HostGator, cPanel).

## Estrutura

```
/
├── config.php          ← Configurações do banco (edite antes do deploy)
├── db.php              ← Conexão PDO MySQL
├── api.php             ← Roteador central da API (substitui server.js)
├── login.php           ← Redireciona para src/login.html
├── logout.php          ← Destroi sessão e redireciona
├── .htaccess           ← mod_rewrite: /api/* → api.php
├── migrate.sql         ← Cria todas as tabelas no MySQL
└── src/
    ├── index.html      ← SPA principal (sem mudanças)
    ├── login.html      ← Login (ajuste de URL)
    ├── logo.png        ← Logo original
    ├── css/style.css   ← CSS original
    └── js/
        ├── api.js      ← Adaptado para PHP (única mudança no frontend)
        ├── app.js
        ├── agendamentos.js
        ├── clientes.js
        ├── procedimentos.js
        ├── financeiro.js
        ├── usuarios.js
        ├── calendario.js
        └── utils.js
```

## Deploy na HostGator (passo a passo)

### 1. Criar banco MySQL no cPanel
1. cPanel → **MySQL Databases**
2. Crie o banco (ex: `usuario_agenda`)
3. Crie o usuário e uma senha forte
4. Adicione o usuário ao banco com **ALL PRIVILEGES**
5. No **phpMyAdmin**, selecione o banco e execute o `migrate.sql`

### 2. Configurar `config.php`
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'usuario_agenda');     // nome do banco criado
define('DB_USER', 'usuario_agenda_user');// usuário criado
define('DB_PASS', 'sua_senha_aqui');     // senha do usuário
```

### 3. Upload dos arquivos
Envie **todos os arquivos** para `public_html/` via File Manager ou FTP.

### 4. Acessar
- `https://seudominio.com.br` → abre a agenda
- Login padrão inicial: **admin / admin123** (troque imediatamente!)

## Requisitos do servidor
- PHP 7.4+ (ou 8.x)
- Extensões: `pdo_mysql`, `json`, `session` (padrão na HostGator)
- `mod_rewrite` habilitado (padrão cPanel)

## Decisões técnicas

| Aspecto | Original (Node.js) | PHP convertido |
|---|---|---|
| Servidor | Express.js | PHP nativo (`api.php`) |
| Banco | SQLite (`better-sqlite3`) | MySQL via PDO |
| Sessão | `express-session` | `$_SESSION` nativo |
| Hash senha | `bcryptjs` | `password_hash()` |
| Rate limiting | `express-rate-limit` | Arquivo temporário por IP |
| Frontend | — | Inalterado (só `api.js`) |
