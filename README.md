# Agenda PHP — Versão Corrigida

## Bugs corrigidos

### 🔴 Críticos (app não funcionava)

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| 1 | `src/index.html` | `utils.js`, `api.js` e `calendario.js` carregados **2×** → `SyntaxError` fatal | Removida a primeira tripla de `<script>` duplicada |
| 2 | `src/js/app.js` | Usava `.nav-btn` (inexistente); `#usuario-logado` e `#btn-logout` não existiam no HTML | Seletores corrigidos para `.nav-link`; elementos adicionados ao HTML |
| 3 | `src/index.html` + todos os `*.js` | Render functions buscavam `#main-content` inexistente (`<main id="content">` no HTML) | `<main id="content">` renomeado para `<main id="main-content">` |
| 4 | `src/index.html` | Abas Procedimentos/Financeiro/Usuários visíveis para todos os cargos | Adicionadas classes `gerente-only hidden` e `admin-only hidden` nos links corretos |

### 🟠 Graves (funcionalidades quebradas)

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| 5 | `api.php` | `GROUP BY a.id` sem as demais colunas → `ERROR 1055` no MySQL 5.7+ (ONLY_FULL_GROUP_BY) | Adicionado `GROUP BY a.id, a.data_hora, a.status, a.valor_cobrado, c.nome` |
| 6 | `api.php` | Save de agendamentos sem transação PDO → dados inconsistentes em caso de falha | Adicionados `beginTransaction()` / `commit()` / `rollBack()` |
| 7 | `logout.php` | `session_destroy()` não remove o cookie — browser mantinha sessão fantasma | Adicionado `setcookie()` para expirar o cookie + `$_SESSION = []` |

### 🟡 Médios (robustez e deployment)

| # | Arquivo | Problema | Correção |
|---|---------|----------|----------|
| 8 | `src/js/api.js` | Caminho `/projeto-agenda-php/` hardcoded → quebra ao renomear a pasta | `_basePath` calculado dinamicamente via `location.pathname` |
| 9 | `src/login.html` | Usava URL via rewrite (`/api/me`) dependendo do `.htaccess`; API JS usava `api.php?_route=` diretamente → inconsistência | Padronizado para usar `api.php?_route=` diretamente (igual ao `api.js`) |
| 10 | `src/login.html` | Sem `.catch()` no fetch inicial → falha silenciosa de rede | Adicionado `try/catch` com mensagem de erro ao usuário |
| 11 | `api.php` | CORS `Access-Control-Allow-Origin: *` — qualquer origem podia chamar a API | Refletido o `HTTP_ORIGIN` do request (mais seguro em produção) |

---

## Instalação e configuração

### 1. Banco de dados

Execute o arquivo `migrate.sql` no seu banco MySQL/MariaDB:

```bash
# Via CLI
mysql -u root -p agenda_local < migrate.sql

# Ou importe pelo phpMyAdmin em: http://localhost/phpmyadmin
```

Crie o banco antes se necessário:
```sql
CREATE DATABASE agenda_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configuração da conexão

Edite `config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'agenda_local');
define('DB_USER', 'root');
define('DB_PASS', '');          // Sua senha do MySQL
```

### 3. Servidor web

#### XAMPP (desenvolvimento local)
1. Coloque a pasta dentro de `htdocs/` (ex: `htdocs/projeto-agenda-php/`)
2. Abra `src/index.html` — pelo `http://localhost/projeto-agenda-php/src/index.html`
3. **Descomente** a linha `RewriteBase` no `.htaccess`:
   ```
   RewriteBase /projeto-agenda-php/
   ```
   (substitua pelo nome da sua pasta se for diferente)

#### Produção (Apache na raiz do domínio)
1. Suba os arquivos para a raiz do domínio
2. Deixe `RewriteBase` comentado no `.htaccess`
3. Garanta que `mod_rewrite` está ativo:
   ```
   a2enmod rewrite
   ```

### 4. Primeiro acesso

- URL: `http://localhost/projeto-agenda-php/src/index.html`
- Usuário padrão criado automaticamente no **primeiro login**:
  - **Usuário:** `admin`
  - **Senha:** `admin123`
- **Troque a senha imediatamente** em Usuários → Alterar senha

---

## Estrutura de arquivos

```
projeto-agenda-php/
├── api.php          ← API REST principal (todos os endpoints)
├── config.php       ← Credenciais do banco e configurações
├── db.php           ← Conexão PDO singleton
├── logger.php       ← Log para app.log
├── login.php        ← Redirect para src/login.html
├── logout.php       ← Destrói sessão + cookie e redireciona
├── migrate.sql      ← Cria todas as tabelas no MySQL
├── .htaccess        ← Rotas amigáveis (Apache mod_rewrite)
└── src/
    ├── index.html   ← SPA principal
    ├── login.html   ← Tela de login
    ├── logo.png
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js           ← Camada de fetch para a API
        ├── app.js           ← Inicialização, auth, navegação
        ├── calendario.js    ← Visão dia/semana/mês
        ├── agendamentos.js  ← CRUD de agendamentos
        ├── clientes.js      ← CRUD de clientes + anamnese
        ├── procedimentos.js ← CRUD de procedimentos e variantes
        ├── financeiro.js    ← Resumo e detalhamento financeiro
        ├── usuarios.js      ← Gestão de usuários (admin)
        └── utils.js         ← Toast, modal, formatação
```

---

## Como testar cada funcionalidade

### ✅ Autenticação
```
1. Acesse /src/login.html
2. Login com admin / admin123
3. Deve redirecionar para index.html e mostrar "admin" na sidebar
4. Logout → volta para login.html (verifique que não consegue voltar com F5)
```

### ✅ Controle de acesso por cargo
```
Crie 3 usuários: um operador, um gerente, um admin.
- Operador: NÃO vê Procedimentos nem Financeiro na sidebar
- Gerente:  VÊ Procedimentos e Financeiro; NÃO vê Usuários
- Admin:    VÊ tudo, incluindo Usuários
```

### ✅ Calendário
```
Clique em Calendário → deve exibir visão "Dia" por padrão.
Alterne para Semana e Mês. Use ◀ ▶ para navegar.
```

### ✅ Clientes
```
Clique em Clientes → + Novo → preencha Nome e salve.
Edite o cliente → aba Anamnese → marque checkboxes → salve.
Busca por nome/CPF/telefone deve filtrar a lista.
```

### ✅ Procedimentos (requer cargo gerente ou admin)
```
+ Novo procedimento → preencha → salve.
Clique Variantes em um procedimento → adicione variantes.
```

### ✅ Agendamentos
```
+ Novo agendamento → selecione cliente, data/hora → adicione procedimento → salve.
Verifique que o agendamento aparece no Calendário.
Mude status para "concluído".
```

### ✅ Financeiro (requer cargo gerente ou admin)
```
Selecione um período com agendamentos → Filtrar.
"Recebido" conta só status=concluído.
"A receber" conta só status=agendado.
```

### ✅ Transação de agendamentos (teste de integridade)
```
Via phpMyAdmin, verifique que ao salvar um agendamento com múltiplos
procedimentos, a tabela agendamento_procedimentos contém as linhas corretas
e que não existem agendamentos "órfãos" sem procedimentos.
```

---

## Diferenças arquiteturais em relação ao Node.js original

| Aspecto | Node.js | PHP |
|---------|---------|-----|
| Banco de dados | SQLite (arquivo `clinica.db`) | MySQL/MariaDB |
| Criação de tabelas | Automática na inicialização | Manual via `migrate.sql` |
| Sessões | express-session em memória | PHP nativo (arquivos em `/tmp`) |
| Hash de senha | bcryptjs | `password_hash()` com `PASSWORD_BCRYPT` |
| Transações | `db.transaction()` nativo | PDO `beginTransaction()` |
| Rate limit | express-rate-limit | Arquivo JSON em `/tmp` |
| Navegação SPA | `navegar()` com show/hide de `#page-*` | `navegarPara()` substitui `#main-content` |
