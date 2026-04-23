# 💆 Agenda Beauty

Sistema de agendamento para clínicas de estética, desenvolvido em PHP + HTML/CSS/JS puro. Gerencia clientes, procedimentos, agendamentos, promoções, financeiro e muito mais.

**Produção:** [beauty.thsouza.eng.br](https://beauty.thsouza.eng.br)

---

## 🚀 Funcionalidades

- **Autenticação** — login com controle de sessão e níveis de acesso (gerente / funcionário)
- **Agendamentos** — criação, edição, controle de status (agendado / concluído / cancelado) e envio via WhatsApp
- **Clientes** — cadastro completo com histórico de atendimentos
- **Procedimentos** — cadastro com suporte a variantes (ex: Depilação a Laser por região)
- **Promoções** — regras automáticas de desconto aplicadas nos agendamentos
- **Bloqueios de agenda** — bloqueio de horários por período
- **Financeiro** — resumo e detalhamento por período, exportação em CSV
- **Relatórios** — faturamento mensal e clientes mais frequentes
- **Dashboard** — visão geral do dia e indicadores
- **Logs** — registro de ações do sistema
- **Backup** — exportação do banco de dados via painel

---

## 🗂️ Estrutura

```
projeto-agenda-php/
├── api.php          # API REST central (todas as rotas)
├── config.php       # Configurações do banco de dados
├── db.php           # Conexão PDO
├── logger.php       # Registro de logs
├── migrate.sql      # Script de criação do banco
├── .htaccess        # Roteamento e segurança (Apache)
├── debug.php        # Utilitário de diagnóstico
└── src/
    ├── index.html   # SPA principal (autenticada)
    ├── login.html   # Tela de login
    ├── logo.png
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js           # Camada de comunicação com a API
        ├── agendamentos.js
        ├── clientes.js
        ├── procedimentos.js
        ├── promocoes.js
        ├── financeiro.js
        ├── relatorios.js
        ├── bloqueios.js
        ├── usuarios.js
        ├── dashboard.js
        ├── logs.js
        └── main.js          # Roteamento de páginas
```

---

## ⚙️ Instalação

### Pré-requisitos
- PHP 7.4+
- MySQL 5.7+
- Apache com `mod_rewrite` ativo (ou HostGator/cPanel)

### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/ThHSzR/projeto-agenda-php.git
   ```

2. **Crie o banco de dados** e importe o schema:
   ```bash
   mysql -u root -p nome_do_banco < migrate.sql
   ```

3. **Configure o banco** em `config.php`:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'nome_do_banco');
   define('DB_USER', 'usuario');
   define('DB_PASS', 'senha');
   ```

4. **Acesse** `http://localhost/projeto-agenda-php/src/login.html`

### Deploy no HostGator (cPanel)

1. Suba os arquivos via **File Manager** para `public_html/`
2. Crie o banco pelo **MySQL Databases** do cPanel
3. Importe o `migrate.sql` via **phpMyAdmin**
4. Ajuste as credenciais no `config.php`
5. O `.htaccess` já está configurado para produção

---

## 🌿 Branches

| Branch | Descrição |
|---|---|
| `main` | Versão de produção (HostGator) |
| `local-dev` | Versão para desenvolvimento local (XAMPP) |

---

## 🔒 Segurança

- Acesso direto a `config.php`, `db.php`, `logger.php`, arquivos `.sql`, `.log` e `.env` bloqueado via `.htaccess`
- Senhas armazenadas com `password_hash()` (bcrypt)
- Sessões PHP com verificação em cada requisição autenticada

---

## 🛠️ Stack

- **Backend:** PHP puro (sem framework), PDO + MySQL
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla, sem framework)
- **Servidor:** Apache / HostGator Shared Hosting
