# Beauty & Beauty — Agenda

Aplicação web para agenda, clientes, prontuário, procedimentos, promoções e gestão financeira de uma clínica de estética. O backend é PHP/PDO com MySQL ou MariaDB; o frontend é uma SPA em JavaScript sem dependências de build.

## Requisitos

- PHP 8.0 ou superior com PDO MySQL
- MySQL 5.7+ ou MariaDB 10.3+
- Apache com `mod_rewrite`, `mod_headers`, `mod_expires` e `mod_deflate`

## Instalação

1. Crie um banco com charset `utf8mb4` e importe `migrate.sql`.
2. Copie `config.local.php.example` para `config.local.php` e informe as credenciais. O arquivo local não é versionado. Também é possível usar `DB_HOST`, `DB_NAME`, `DB_USER` e `DB_PASS` no ambiente.
3. Crie o primeiro administrador apenas pela linha de comando:

```bash
php bin/create-admin.php administrador "uma-senha-segura"
```

4. Aponte o Apache para o diretório do projeto e acesse `/src/login.html`.

Não existe criação automática de administrador em produção. Em produção, use HTTPS e mantenha `config.local.php` fora do controle de versão.

## Perfis de acesso

| Perfil | Permissões |
|---|---|
| Administrador | Acesso completo, usuários, logs e backup |
| Gerente | Operação, cadastros, promoções, financeiro, bloqueios e relatórios |
| Operador | Calendário, agendamentos, clientes e prontuário |

As permissões são verificadas na API; ocultar um item da interface não é usado como controle de segurança.

## Estrutura

```text
api.php                 API e regras de negócio
config.php              configuração por ambiente
config.local.php.example modelo de configuração local
db.php                  conexão PDO
logger.php              integração com o log do PHP/servidor
migrate.sql             esquema e atualizações idempotentes
bin/create-admin.php     criação segura do primeiro administrador
src/                    interface web
```

## Verificações locais

```powershell
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { C:\xampp\php\php.exe -l $_.FullName }
Get-ChildItem src\js -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Para uma regressão de volume, o script abaixo cria 300 agendamentos e 24 clientes temporários, testa bloqueio semanal e remove toda a massa ao terminar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\stress-api.ps1 -Count 300
```

Use `-KeepData` somente quando precisar inspecionar a carga manualmente no navegador. Bloqueios e colisões de horário são validados na API, inclusive ao editar ou reativar um agendamento cancelado.

Em `APP_ENV=development`, duas ferramentas restritas a localhost ficam disponíveis:

- `/debug.php`: estado do PHP, banco e credenciais locais `admin/admin`.
- `/ver_log.php`: últimas linhas do `app.log`, atualizado a cada três segundos.

O banco de desenvolvimento pode usar `admin/admin`. Essas credenciais não devem ser copiadas para produção.

A migração pode ser reaplicada: ela cria tabelas ausentes e atualiza as colunas e relações necessárias para versões anteriores do banco.

## Segurança operacional

- Sessões usam cookies `HttpOnly`, `SameSite=Strict` e `Secure` quando HTTPS está ativo.
- A API aceita apenas a mesma origem; não há CORS reflexivo.
- Configurações, SQL, logs, documentação e arquivos de ambiente são bloqueados pelo Apache.
- Logs técnicos vão para o log configurado do PHP e não para um arquivo público.
- Backups contêm dados pessoais e devem ser armazenados e transmitidos com proteção adequada.
