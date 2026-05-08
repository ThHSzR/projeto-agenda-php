# Agenda Pessoal — Clínica de Estética (PHP + MySQL)

Sistema completo de agendamento para clínicas de estética e depilação a laser, desenvolvido em **PHP + MySQL** para hospedagem compartilhada (HostGator, Locaweb, etc.).

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs em tempo real: agendamentos do dia/semana, faturamento, taxa de conclusão, top procedimentos |
| **Agendamentos** | CRUD completo com múltiplos procedimentos por sessão, cálculo automático de promoção, envio via WhatsApp |
| **Clientes** | Ficha completa de anamnese (40+ campos), histórico de atendimentos |
| **Procedimentos** | Cadastro com variantes (ex: Depilação a Laser → Axilas, Buço, Costas), preços e durações individuais |
| **Promoções** | Sistema avançado com regras por procedimento/variante, modos lista fechada e quantidade mínima, vigência, dias da semana, limite de usos |
| **Financeiro** | Resumo e detalhado por período, exportação CSV, promoção aplicada por agendamento |
| **Relatórios** | Faturamento mensal (gráfico de barras) e ranking de clientes frequentes |
| **Bloqueios** | Bloqueio de horários (almoço, manutenção, férias) com suporte a recorrência |
| **Usuários** | Controle de acesso por cargo (admin, gerente, operador), troca de cargo inline |
| **Log de Atividades** | Registro automático de todas as ações do sistema |
| **Backup** | Download do banco completo em formato SQL |

## Requisitos

- PHP 7.4+ (recomendado 8.0+)
- MySQL 5.7+ ou MariaDB 10.3+
- Extensão PDO habilitada
- mod_rewrite habilitado (Apache)

---

## Instalação no HostGator

### 1. Criar o banco de dados

Acesse o **phpMyAdmin** pelo cPanel:

1. Vá em **Bancos de Dados MySQL** → crie um banco (ex: `seuusuario_agenda`)
2. Crie um usuário MySQL e associe ao banco com **TODOS OS PRIVILÉGIOS**
3. No phpMyAdmin, selecione o banco e clique em **Importar** → selecione o arquivo `migrate.sql`

### 2. Configurar credenciais

Edite o arquivo `config.php` com as credenciais do seu banco:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'seuusuario_agenda');
define('DB_USER', 'seuusuario_user');
define('DB_PASS', 'sua_senha_segura');
```

### 3. Upload dos arquivos

Via **Gerenciador de Arquivos** do cPanel ou FTP, envie todos os arquivos para a pasta `public_html` (ou subpasta):

```
public_html/
├── .htaccess
├── api.php
├── config.php
├── db.php
├── logger.php
├── migrate.sql
└── src/
    ├── index.html
    ├── login.html
    ├── css/style.css
    └── js/ (todos os .js)
```

### 4. Primeiro acesso

Acesse `https://seudominio.com/src/login.html`

**Credenciais padrão:**
- Usuário: `admin`
- Senha: `admin123`

**Importante:** Troque a senha imediatamente após o primeiro login.

---

## Estrutura do Projeto

```
├── .htaccess          # Rewrite rules e segurança
├── api.php            # Backend: 30+ endpoints REST
├── config.php         # Credenciais do banco
├── db.php             # Conexão PDO singleton
├── logger.php         # Sistema de log
├── migrate.sql        # Schema MySQL (13 tabelas)
└── src/
    ├── index.html     # SPA principal
    ├── login.html     # Tela de login
    ├── css/
    │   └── style.css  # Tema roxo/rosa profissional
    └── js/
        ├── api.js           # Camada de comunicação com backend
        ├── app.js           # Roteamento SPA e sidebar
        ├── agendamentos.js  # CRUD + cálculo automático de promoção
        ├── bloqueios.js     # CRUD de bloqueios de horário
        ├── calendario.js    # Visualização dia/semana/mês
        ├── clientes.js      # Ficha de anamnese completa
        ├── dashboard.js     # KPIs + top procedimentos
        ├── financeiro.js    # Resumo + detalhado + CSV
        ├── logs.js          # Visualização de log de atividades
        ├── procedimentos.js # CRUD com variantes
        ├── promocoes.js     # CRUD com regras de itens
        ├── relatorios.js    # Faturamento mensal + clientes frequentes
        ├── usuarios.js      # CRUD + troca de cargo + backup
        └── utils.js         # Toast, modal, formatação
```

---

## Cargos e Permissões

| Cargo | Pode fazer |
|---|---|
| **admin** | Tudo + gerenciar usuários + backup + logs |
| **gerente** | Tudo exceto gerenciar usuários |
| **operador** | Agendar, consultar clientes, ver procedimentos |

---

## API Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/login` | Autenticação |
| POST | `/logout` | Encerrar sessão |
| GET | `/me` | Dados do usuário logado |
| GET/POST | `/clientes` | CRUD de clientes |
| GET | `/clientes/:id/historico` | Histórico de atendimentos |
| GET/POST | `/cliente-procedimentos` | Procedimentos de interesse |
| GET/POST | `/cliente-variantes` | Variantes de interesse |
| GET/POST/DELETE | `/procedimentos` | CRUD de procedimentos |
| GET/POST/DELETE | `/variantes` | CRUD de variantes |
| GET/POST/DELETE | `/agendamentos` | CRUD de agendamentos |
| PATCH | `/agendamentos/:id/status` | Alterar status |
| GET/POST/DELETE | `/promocoes` | CRUD de promoções |
| POST | `/promocoes/calcular` | Cálculo automático de desconto |
| GET/POST/DELETE | `/bloqueios` | CRUD de bloqueios |
| GET | `/financeiro/resumo` | Resumo financeiro |
| GET | `/financeiro/detalhado` | Detalhado por período |
| GET | `/dashboard` | KPIs e estatísticas |
| GET | `/relatorios/faturamento-mensal` | Gráfico de faturamento |
| GET | `/relatorios/clientes-frequentes` | Ranking de clientes |
| GET | `/logs` | Log de atividades |
| GET | `/backup` | Download SQL do banco |
| GET/POST/DELETE | `/usuarios` | CRUD de usuários |
| PATCH | `/usuarios/:id/cargo` | Trocar cargo |

---

## Bugs Corrigidos nesta Versão

### Críticos

| # | Problema | Correção |
|---|----------|----------|
| 1 | Scripts duplicados no `index.html` → `SyntaxError` fatal | Removida duplicação |
| 2 | `app.js` usava seletores inexistentes (`.nav-btn`) | Corrigido para `.nav-link` |
| 3 | `#main-content` vs `#content` inconsistente | Padronizado para `#main-content` |
| 4 | `GROUP BY` incompleto → `ERROR 1055` no MySQL 5.7+ | Adicionadas colunas faltantes |
| 5 | Agendamentos sem transação PDO | Adicionado `beginTransaction/commit/rollBack` |
| 6 | Edição parcial de agendamento falhava (`cliente_id NULL`) | Busca dados atuais antes do UPDATE |
| 7 | Regras de promoção sem `tipo_regra` → NOT NULL constraint | Inferência automática no backend |

### Melhorias

| # | Melhoria |
|---|----------|
| 1 | `api.js` com `_basePath` dinâmico (funciona em qualquer subpasta) |
| 2 | CORS refletindo `HTTP_ORIGIN` em vez de `*` |
| 3 | Rate limiting em `/login` (5 tentativas/minuto) |
| 4 | Sessão com cookie seguro (`httponly`, `samesite`) |
| 5 | Log de atividades automático em todas as ações |

---

## Diferenças em Relação ao Node.js Original

| Aspecto | Node.js | PHP |
|---------|---------|-----|
| Banco de dados | SQLite (arquivo `clinica.db`) | MySQL/MariaDB |
| Criação de tabelas | Automática na inicialização | Manual via `migrate.sql` |
| Sessões | express-session em memória | PHP nativo (arquivos em `/tmp`) |
| Hash de senha | bcryptjs | `password_hash()` com `PASSWORD_BCRYPT` |
| Transações | `db.transaction()` nativo | PDO `beginTransaction()` |
| Rate limit | express-rate-limit | Arquivo JSON em `/tmp` |

---

## Licença

Projeto privado. Todos os direitos reservados.
