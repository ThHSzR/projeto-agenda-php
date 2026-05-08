<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/logger.php';

// ── Sessão ──────────────────────────────────────────────────────────────────
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');
session_set_cookie_params(['lifetime' => SESSION_LIFETIME, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

// ── Log da requisição ───────────────────────────────────────────────────────
$_rawBody = file_get_contents('php://input');
logApp('info', '── REQUISIÇÃO ──', [
    'method'  => $_SERVER['REQUEST_METHOD'],
    'route'   => $_GET['_route'] ?? '/',
    'ip'      => $_SERVER['REMOTE_ADDR'],
    'logado'  => $_SESSION['logado'] ?? false,
]);

// ── CORS ────────────────────────────────────────────────────────────────────
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Helpers ─────────────────────────────────────────────────────────────────
function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    global $_rawBody;
    return json_decode($_rawBody ?? '', true) ?? [];
}

function auth_required(): void {
    if (empty($_SESSION['logado'])) json_out(['erro' => 'Não autenticado'], 401);
}

function admin_required(): void {
    auth_required();
    if (empty($_SESSION['is_admin'])) json_out(['erro' => 'Acesso negado'], 403);
}

function gerente_required(): void {
    auth_required();
    if (empty($_SESSION['is_admin']) && ($_SESSION['cargo'] ?? '') !== 'gerente')
        json_out(['erro' => 'Acesso negado'], 403);
}

function check_rate_limit(string $ip): bool {
    $file = sys_get_temp_dir() . '/agenda_rl_' . md5($ip) . '.json';
    $data = file_exists($file)
        ? (json_decode(file_get_contents($file), true) ?? ['count' => 0, 'reset' => time() + 900])
        : ['count' => 0, 'reset' => time() + 900];
    if (time() > $data['reset']) $data = ['count' => 0, 'reset' => time() + 900];
    if ($data['count'] >= 10) return false;
    $data['count']++;
    file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

function logAtividade(PDO $db, ?int $userId, string $acao, ?string $entidade = null, ?int $entidadeId = null, ?string $detalhes = null): void {
    try {
        $db->prepare('INSERT INTO log_atividades (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?,?,?,?,?)')
           ->execute([$userId, $acao, $entidade, $entidadeId, $detalhes]);
    } catch (Exception $e) {}
}

// ── Roteamento ──────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$route  = trim($_GET['_route'] ?? '', '/');
if (($qpos = strpos($route, '?')) !== false) $route = substr($route, 0, $qpos);
$parts = explode('/', $route);

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════
if ($route === 'login' && $method === 'POST') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    if (!check_rate_limit($ip))
        json_out(['erro' => 'Muitas tentativas. Aguarde 15 minutos.'], 429);

    $b       = body();
    $usuario = trim($b['usuario'] ?? '');
    $senha   = $b['senha'] ?? '';

    if (!$usuario || !$senha)
        json_out(['erro' => 'Preencha usuário e senha'], 400);

    try {
        $db    = getDb();
        $total = $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();

        if ($total == 0) {
            $hash = password_hash('admin123', PASSWORD_BCRYPT);
            $db->prepare('INSERT INTO usuarios (usuario, senha, is_admin, cargo) VALUES (?,?,1,"admin")')
               ->execute(['admin', $hash]);
        }

        $stmt = $db->prepare('SELECT * FROM usuarios WHERE usuario = ?');
        $stmt->execute([$usuario]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($senha, $user['senha']))
            json_out(['erro' => 'Usuário ou senha incorretos'], 401);

        session_regenerate_id(true);
        $_SESSION['logado']    = true;
        $_SESSION['userId']    = (int)$user['id'];
        $_SESSION['usuario']   = $user['usuario'];
        $_SESSION['is_admin']  = (bool)$user['is_admin'];
        $_SESSION['cargo']     = $user['cargo'] ?? 'operador';

        logAtividade($db, (int)$user['id'], 'login', 'usuarios', (int)$user['id'], null);
        json_out(['ok' => true, 'is_admin' => (bool)$user['is_admin'], 'cargo' => $_SESSION['cargo']]);

    } catch (Exception $e) {
        logApp('error', 'Exceção no login', ['msg' => $e->getMessage()]);
        json_out(['erro' => 'Erro interno'], 500);
    }
}

if ($route === 'logout' && $method === 'POST') {
    auth_required();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

if ($route === 'me' && $method === 'GET') {
    if (empty($_SESSION['logado'])) json_out(['erro' => 'Não autenticado'], 401);
    json_out([
        'usuario'  => $_SESSION['usuario'],
        'is_admin' => (bool)$_SESSION['is_admin'],
        'cargo'    => $_SESSION['cargo'] ?? 'operador',
    ]);
}

// ══════════════════════════════════════════════════════════════════════════════
//  USUÁRIOS
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'usuarios') {
    $db = getDb();

    if ($method === 'GET' && count($parts) === 1) {
        admin_required();
        json_out($db->query('SELECT id, usuario, is_admin, cargo FROM usuarios ORDER BY usuario')->fetchAll());
    }

    if ($method === 'POST' && count($parts) === 1) {
        admin_required();
        $b        = body();
        $usuario  = trim($b['usuario'] ?? '');
        $senha    = $b['senha'] ?? '';
        $is_admin = !empty($b['is_admin']) ? 1 : 0;
        $cargo    = $is_admin ? 'admin' : (($b['cargo'] ?? '') === 'gerente' ? 'gerente' : 'operador');
        if (!$usuario || !$senha) json_out(['erro' => 'Usuário e senha são obrigatórios'], 400);
        if (strlen($senha) < 6)   json_out(['erro' => 'Senha mínima: 6 caracteres'], 400);
        $exists = $db->prepare('SELECT id FROM usuarios WHERE usuario = ?');
        $exists->execute([$usuario]);
        if ($exists->fetch()) json_out(['erro' => 'Usuário já existe'], 409);
        $hash = password_hash($senha, PASSWORD_BCRYPT);
        $db->prepare('INSERT INTO usuarios (usuario, senha, is_admin, cargo) VALUES (?,?,?,?)')
           ->execute([$usuario, $hash, $is_admin, $cargo]);
        $newId = (int)$db->lastInsertId();
        logAtividade($db, $_SESSION['userId'] ?? null, 'criar_usuario', 'usuarios', $newId, $usuario);
        json_out(['id' => $newId]);
    }

    if ($method === 'PATCH' && count($parts) === 3 && $parts[2] === 'senha') {
        admin_required();
        $id    = (int)$parts[1];
        $senha = body()['senha'] ?? '';
        if (strlen($senha) < 6) json_out(['erro' => 'Senha mínima: 6 caracteres'], 400);
        $db->prepare('UPDATE usuarios SET senha = ? WHERE id = ?')
           ->execute([password_hash($senha, PASSWORD_BCRYPT), $id]);
        json_out(['ok' => true]);
    }

    if ($method === 'PATCH' && count($parts) === 3 && $parts[2] === 'cargo') {
        admin_required();
        $id    = (int)$parts[1];
        $cargo = body()['cargo'] ?? '';
        $cargosValidos = ['operador', 'gerente', 'admin'];
        if (!in_array($cargo, $cargosValidos)) json_out(['erro' => 'Cargo inválido'], 400);
        $isAdmin = $cargo === 'admin' ? 1 : 0;
        $db->prepare('UPDATE usuarios SET cargo = ?, is_admin = ? WHERE id = ?')
           ->execute([$cargo, $isAdmin, $id]);
        json_out(['ok' => true]);
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        admin_required();
        $id  = (int)$parts[1];
        $q   = $db->prepare('SELECT usuario, is_admin FROM usuarios WHERE id = ?');
        $q->execute([$id]);
        $row = $q->fetch();
        if (!$row) json_out(['erro' => 'Não encontrado'], 404);
        if ($row['usuario'] === $_SESSION['usuario'])
            json_out(['erro' => 'Você não pode excluir sua própria conta'], 400);
        if ($row['is_admin'] && $db->query('SELECT COUNT(*) FROM usuarios WHERE is_admin=1')->fetchColumn() <= 1)
            json_out(['erro' => 'Não é possível remover o único administrador'], 400);
        $db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'clientes') {
    auth_required();
    $db = getDb();

    // GET /clientes/:id/historico
    if ($method === 'GET' && count($parts) === 3 && $parts[2] === 'historico') {
        $cid = (int)$parts[1];
        $s = $db->prepare(
            "SELECT a.id, a.data_hora, a.status, a.valor_cobrado,
                    GROUP_CONCAT(p.nome ORDER BY p.nome SEPARATOR ', ') as procedimentos
             FROM agendamentos a
             LEFT JOIN agendamento_procedimentos ap ON ap.agendamento_id = a.id
             LEFT JOIN procedimentos p ON p.id = ap.procedimento_id
             WHERE a.cliente_id = ?
             GROUP BY a.id, a.data_hora, a.status, a.valor_cobrado
             ORDER BY a.data_hora DESC
             LIMIT 50"
        );
        $s->execute([$cid]);
        json_out($s->fetchAll());
    }

    if ($method === 'GET' && count($parts) === 1)
        json_out($db->query('SELECT * FROM clientes ORDER BY nome')->fetchAll());

    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare('SELECT * FROM clientes WHERE id = ?');
        $s->execute([(int)$parts[1]]);
        $r = $s->fetch();
        $r ? json_out($r) : json_out(['erro' => 'Não encontrado'], 404);
    }

    if ($method === 'POST' && count($parts) === 1) {
        $d = body();
        $fields = [
            'nome','data_nascimento','cpf','email','telefone','celular','endereco','cidade','uf',
            'areas_tratar','metodo_dep_cera','metodo_dep_lamina','metodo_dep_laser',
            'prob_encravamento','prob_manchas','prob_outros',
            'medicamento_uso','medicamento_qual','roacutan','tto_vitiligo',
            'alergia_medicamento','alergia_qual','tratamento_dermato','tratamento_dermato_qual','usa_acidos',
            'cirurgia','cirurgia_qual','anticoncepcional','anticoncepcional_qual',
            'historico_oncologico','oncologico_qual','acompanhamento_medico','acompanhamento_qual',
            'epilepsia','alteracao_hormonal','hormonal_qual','hirsutismo',
            'gestante','herpes','lactante','cor_olhos','cor_cabelos','cor_pelos',
            'tomou_sol','sol_quando','fitzpatrick','termo_assinado','observacoes'
        ];
        $vals = array_map(fn($f) => $d[$f] ?? null, $fields);
        $idx = array_search('data_nascimento', $fields);
        if ($idx !== false && empty($vals[$idx])) $vals[$idx] = null;

        if (!empty($d['id'])) {
            $set = implode(',', array_map(fn($f) => "$f = ?", $fields));
            $db->prepare("UPDATE clientes SET $set WHERE id = ?")->execute([...$vals, (int)$d['id']]);
            logAtividade($db, $_SESSION['userId'] ?? null, 'editar_cliente', 'clientes', (int)$d['id'], $d['nome'] ?? null);
            json_out(['id' => (int)$d['id']]);
        } else {
            $cols = implode(',', $fields);
            $plh  = implode(',', array_fill(0, count($fields), '?'));
            $db->prepare("INSERT INTO clientes ($cols) VALUES ($plh)")->execute($vals);
            $newId = (int)$db->lastInsertId();
            logAtividade($db, $_SESSION['userId'] ?? null, 'criar_cliente', 'clientes', $newId, $d['nome'] ?? null);
            json_out(['id' => $newId]);
        }
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        $db->prepare('DELETE FROM clientes WHERE id = ?')->execute([(int)$parts[1]]);
        logAtividade($db, $_SESSION['userId'] ?? null, 'excluir_cliente', 'clientes', (int)$parts[1], null);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROCEDIMENTOS
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'procedimentos') {
    auth_required();
    $db = getDb();

    if ($method === 'GET' && count($parts) === 1) {
        $todos = ($_GET['todos'] ?? '') === '1';
        $sql   = $todos ? 'SELECT * FROM procedimentos ORDER BY nome'
                        : 'SELECT * FROM procedimentos WHERE ativo = 1 ORDER BY nome';
        json_out($db->query($sql)->fetchAll());
    }

    if ($method === 'POST' && count($parts) === 1) {
        gerente_required();
        $d = body();
        if (!empty($d['id'])) {
            $db->prepare('UPDATE procedimentos SET nome=?,descricao=?,duracao_min=?,valor=?,ativo=?,is_laser=?,tem_variantes=? WHERE id=?')
               ->execute([$d['nome'], $d['descricao'] ?? null, $d['duracao_min'] ?? 60, $d['valor'] ?? 0,
                           $d['ativo'] ?? 1, $d['is_laser'] ?? 0, $d['tem_variantes'] ?? 0, (int)$d['id']]);
            json_out(['id' => (int)$d['id']]);
        } else {
            $db->prepare('INSERT INTO procedimentos (nome,descricao,duracao_min,valor,is_laser,tem_variantes) VALUES (?,?,?,?,?,?)')
               ->execute([$d['nome'], $d['descricao'] ?? null, $d['duracao_min'] ?? 60, $d['valor'] ?? 0,
                           $d['is_laser'] ?? 0, $d['tem_variantes'] ?? 0]);
            json_out(['id' => (int)$db->lastInsertId()]);
        }
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        gerente_required();
        $db->prepare('UPDATE procedimentos SET ativo = 0 WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  VARIANTES
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'variantes') {
    auth_required();
    $db = getDb();

    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare('SELECT * FROM procedimento_variantes WHERE procedimento_id = ? ORDER BY nome');
        $s->execute([(int)$parts[1]]);
        json_out($s->fetchAll());
    }

    if ($method === 'POST' && count($parts) === 1) {
        gerente_required();
        $d = body();
        if (!empty($d['id'])) {
            $db->prepare('UPDATE procedimento_variantes SET nome=?,descricao=?,duracao_min=?,valor=?,ativo=? WHERE id=?')
               ->execute([$d['nome'], $d['descricao'] ?? null, $d['duracao_min'] ?? 30,
                           $d['valor'] ?? 0, $d['ativo'] ?? 1, (int)$d['id']]);
            json_out(['id' => (int)$d['id']]);
        } else {
            $db->prepare('INSERT INTO procedimento_variantes (procedimento_id,nome,descricao,duracao_min,valor) VALUES (?,?,?,?,?)')
               ->execute([$d['procedimento_id'], $d['nome'], $d['descricao'] ?? null,
                           $d['duracao_min'] ?? 30, $d['valor'] ?? 0]);
            json_out(['id' => (int)$db->lastInsertId()]);
        }
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        gerente_required();
        $db->prepare('DELETE FROM procedimento_variantes WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  AGENDAMENTOS
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'agendamentos') {
    auth_required();
    $db = getDb();

    // GET /agendamentos — lista com filtros e procedimentos enriquecidos
    if ($method === 'GET' && count($parts) === 1) {
        $sql    = 'SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone
                   FROM agendamentos a
                   JOIN clientes c ON c.id = a.cliente_id';
        $params = [];
        if (!empty($_GET['data_inicio']) && !empty($_GET['data_fim'])) {
            $sql   .= ' WHERE a.data_hora BETWEEN ? AND ?';
            $params = [$_GET['data_inicio'], $_GET['data_fim']];
        } elseif (!empty($_GET['data'])) {
            $sql   .= ' WHERE DATE(a.data_hora) = ?';
            $params = [$_GET['data']];
        }
        $sql .= ' ORDER BY a.data_hora';
        $s = $db->prepare($sql);
        $s->execute($params);
        $agendamentos = $s->fetchAll();

        // Enriquecer com procedimentos e promoção
        $stmtProcs = $db->prepare(
            "SELECT p.nome FROM agendamento_procedimentos ap
             JOIN procedimentos p ON p.id = ap.procedimento_id
             WHERE ap.agendamento_id = ? ORDER BY ap.id"
        );
        $stmtPromo = $db->prepare(
            "SELECT pu.desconto_aplicado, pr.nome as promocao_nome
             FROM promocao_usos pu
             JOIN promocoes pr ON pr.id = pu.promocao_id
             WHERE pu.agendamento_id = ?"
        );

        foreach ($agendamentos as &$ag) {
            $stmtProcs->execute([$ag['id']]);
            $nomes = array_column($stmtProcs->fetchAll(), 'nome');
            $ag['procedimento_nome'] = $nomes ? implode(', ', $nomes) : '—';

            $stmtPromo->execute([$ag['id']]);
            $ag['promocao'] = $stmtPromo->fetch() ?: null;
        }
        unset($ag);

        json_out($agendamentos);
    }

    // GET /agendamentos/:id — busca com procedimentos
    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare(
            'SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone
             FROM agendamentos a
             JOIN clientes c ON c.id = a.cliente_id
             WHERE a.id = ?'
        );
        $s->execute([(int)$parts[1]]);
        $agend = $s->fetch();
        if (!$agend) json_out(['erro' => 'Não encontrado'], 404);

        $ps = $db->prepare(
            'SELECT ap.*, p.nome as procedimento_nome, p.tem_variantes, p.is_laser,
                    v.nome as variante_nome
             FROM agendamento_procedimentos ap
             JOIN procedimentos p ON p.id = ap.procedimento_id
             LEFT JOIN procedimento_variantes v ON v.id = ap.variante_id
             WHERE ap.agendamento_id = ? ORDER BY ap.id'
        );
        $ps->execute([(int)$parts[1]]);
        $agend['procs'] = $ps->fetchAll();

        // Promoção aplicada
        $pu = $db->prepare(
            'SELECT pu.desconto_aplicado, pr.nome as promocao_nome
             FROM promocao_usos pu
             JOIN promocoes pr ON pr.id = pu.promocao_id
             WHERE pu.agendamento_id = ?'
        );
        $pu->execute([(int)$parts[1]]);
        $agend['promocao_uso'] = $pu->fetch() ?: null;

        json_out($agend);
    }

    // POST /agendamentos — criar ou atualizar (com TRANSAÇÃO)
    if ($method === 'POST' && count($parts) === 1) {
        $d      = body();
        $procs  = is_array($d['procs'] ?? null) ? $d['procs'] : [];
        $somaV  = array_sum(array_column($procs, 'valor'));
        $isGer  = !empty($_SESSION['is_admin']) || ($_SESSION['cargo'] ?? '') === 'gerente';
        $valorF = ($isGer && isset($d['valor_cobrado'])) ? (float)$d['valor_cobrado'] : (float)$somaV;

        try {
            $db->beginTransaction();

            if (!empty($d['id'])) {
                // Buscar dados atuais para mesclar (edição parcial)
                $stAtual = $db->prepare('SELECT * FROM agendamentos WHERE id = ?');
                $stAtual->execute([(int)$d['id']]);
                $atual = $stAtual->fetch();
                if (!$atual) { $db->rollBack(); json_out(['erro' => 'Agendamento não encontrado'], 404); }

                $clienteId = $d['cliente_id'] ?? $atual['cliente_id'];
                $dataHora  = $d['data_hora']  ?? $atual['data_hora'];
                $status    = $d['status']     ?? $atual['status'];
                $obs       = array_key_exists('observacoes', $d) ? $d['observacoes'] : $atual['observacoes'];
                $valorUpd  = ($isGer && isset($d['valor_cobrado'])) ? (float)$d['valor_cobrado']
                           : (count($procs) > 0 ? (float)$somaV : (float)$atual['valor_cobrado']);

                $db->prepare(
                    'UPDATE agendamentos
                     SET cliente_id=?, data_hora=?, status=?, valor_cobrado=?, observacoes=?,
                         procedimento_id=NULL, variante_id=NULL
                     WHERE id=?'
                )->execute([$clienteId, $dataHora, $status, $valorUpd, $obs, (int)$d['id']]);
                $agendId = (int)$d['id'];
            } else {
                $db->prepare(
                    'INSERT INTO agendamentos (cliente_id, data_hora, status, valor_cobrado, observacoes)
                     VALUES (?,?,?,?,?)'
                )->execute([$d['cliente_id'], $d['data_hora'], $d['status'] ?? 'agendado',
                             $valorF, $d['observacoes'] ?? null]);
                $agendId = (int)$db->lastInsertId();
            }

            // Recria lista de procedimentos (apenas se enviados)
            if (count($procs) > 0) {
                $db->prepare('DELETE FROM agendamento_procedimentos WHERE agendamento_id = ?')
                   ->execute([$agendId]);

                $ins = $db->prepare(
                    'INSERT INTO agendamento_procedimentos
                     (agendamento_id, procedimento_id, variante_id, valor, duracao_min)
                     VALUES (?,?,?,?,?)'
                );
                foreach ($procs as $p) {
                    $ins->execute([
                        $agendId,
                        (int)$p['procedimento_id'],
                        isset($p['variante_id']) && $p['variante_id'] ? (int)$p['variante_id'] : null,
                        (float)($p['valor'] ?? 0),
                        (int)($p['duracao_min'] ?? 0),
                    ]);
                }
            }

            // Persistir promoção aplicada
            if (!empty($d['promocao_aplicada'])) {
                $pa = $d['promocao_aplicada'];
                $db->prepare('DELETE FROM promocao_usos WHERE agendamento_id = ?')->execute([$agendId]);
                $db->prepare(
                    'INSERT INTO promocao_usos (promocao_id, agendamento_id, desconto_aplicado) VALUES (?,?,?)'
                )->execute([(int)$pa['id'], $agendId, (float)($pa['desconto'] ?? 0)]);
            }

            $db->commit();
            logAtividade($db, $_SESSION['userId'] ?? null,
                empty($d['id']) ? 'criar_agendamento' : 'editar_agendamento',
                'agendamentos', $agendId, null);
            json_out(['id' => $agendId]);

        } catch (Exception $e) {
            $db->rollBack();
            logApp('error', 'Erro ao salvar agendamento', ['msg' => $e->getMessage()]);
            json_out(['erro' => 'Erro ao salvar agendamento: ' . $e->getMessage()], 500);
        }
    }

    // DELETE /agendamentos/:id
    if ($method === 'DELETE' && count($parts) === 2) {
        $db->prepare('DELETE FROM agendamentos WHERE id = ?')->execute([(int)$parts[1]]);
        logAtividade($db, $_SESSION['userId'] ?? null, 'excluir_agendamento', 'agendamentos', (int)$parts[1], null);
        json_out(['ok' => true]);
    }

    // PATCH /agendamentos/:id/status
    if ($method === 'PATCH' && count($parts) === 3 && $parts[2] === 'status') {
        $status = body()['status'] ?? '';
        $db->prepare('UPDATE agendamentos SET status = ? WHERE id = ?')
           ->execute([$status, (int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRONTUÁRIO
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'prontuario') {
    auth_required();
    $db = getDb();

    // GET /prontuario?cliente_id=X
    if ($method === 'GET' && count($parts) === 1) {
        $cid = (int)($_GET['cliente_id'] ?? 0);
        if (!$cid) json_out(['erro' => 'cliente_id obrigatório'], 400);

        $s = $db->prepare("
            SELECT
                pr.id,
                pr.cliente_id,
                pr.agendamento_id,
                pr.tipo,
                pr.fitzpatrick,
                pr.anotacao,
                pr.criado_em,
                a.data_hora        AS agend_data_hora,
                a.status           AS agend_status,
                a.valor_cobrado    AS agend_valor,
                GROUP_CONCAT(p.nome ORDER BY p.nome SEPARATOR ', ') AS agend_procedimentos
            FROM prontuario pr
            LEFT JOIN agendamentos a ON a.id = pr.agendamento_id
            LEFT JOIN agendamento_procedimentos ap ON ap.agendamento_id = a.id
            LEFT JOIN procedimentos p ON p.id = ap.procedimento_id
            WHERE pr.cliente_id = ?
            GROUP BY pr.id, pr.cliente_id, pr.agendamento_id, pr.tipo,
                     pr.fitzpatrick, pr.anotacao, pr.criado_em,
                     a.data_hora, a.status, a.valor_cobrado
            ORDER BY pr.criado_em DESC
        ");
        $s->execute([$cid]);
        json_out($s->fetchAll());
    }

    // POST /prontuario
    if ($method === 'POST' && count($parts) === 1) {
        $d = body();
        $cid   = (int)($d['cliente_id'] ?? 0);
        $tipo  = in_array($d['tipo'] ?? '', ['atendimento', 'anotacao']) ? $d['tipo'] : 'anotacao';
        $agId  = !empty($d['agendamento_id']) ? (int)$d['agendamento_id'] : null;
        $fitz  = (int)($d['fitzpatrick'] ?? 0);
        $nota  = trim($d['anotacao'] ?? '');
        if (!$cid) json_out(['erro' => 'cliente_id obrigatório'], 400);

        // Impedir duplicata: um agendamento só pode gerar UMA entrada tipo 'atendimento'
        if ($tipo === 'atendimento' && $agId) {
            $chk = $db->prepare("SELECT id FROM prontuario WHERE agendamento_id = ? AND tipo = 'atendimento'");
            $chk->execute([$agId]);
            if ($chk->fetch()) json_out(['erro' => 'Atendimento já registrado no prontuário'], 409);
        }

        $db->prepare(
            "INSERT INTO prontuario (cliente_id, agendamento_id, tipo, fitzpatrick, anotacao)
             VALUES (?, ?, ?, ?, ?)"
        )->execute([$cid, $agId, $tipo, $fitz, $nota ?: null]);
        $newId = (int)$db->lastInsertId();
        logAtividade($db, $_SESSION['userId'] ?? null, 'criar_prontuario', 'prontuario', $newId, null);
        json_out(['id' => $newId]);
    }

    // PATCH /prontuario/:id
    if ($method === 'PATCH' && count($parts) === 2) {
        $pid = (int)$parts[1];
        $d   = body();

        $chk = $db->prepare("SELECT tipo FROM prontuario WHERE id = ?");
        $chk->execute([$pid]);
        $row = $chk->fetch();
        if (!$row) json_out(['erro' => 'Entrada não encontrada'], 404);

        $fields = [];
        $values = [];
        if (array_key_exists('fitzpatrick', $d)) {
            $fields[] = 'fitzpatrick = ?';
            $values[] = (int)$d['fitzpatrick'];
        }
        if (array_key_exists('anotacao', $d)) {
            if ($row['tipo'] !== 'anotacao') json_out(['erro' => 'Não é possível editar o texto de um atendimento'], 403);
            $fields[] = 'anotacao = ?';
            $values[] = trim($d['anotacao'] ?? '');
        }
        if (empty($fields)) json_out(['erro' => 'Nenhum campo para atualizar'], 400);
        $values[] = $pid;
        $db->prepare("UPDATE prontuario SET " . implode(', ', $fields) . " WHERE id = ?")->execute($values);
        json_out(['ok' => true]);
    }

    // DELETE /prontuario/:id
    if ($method === 'DELETE' && count($parts) === 2) {
        $pid = (int)$parts[1];
        $chk = $db->prepare("SELECT tipo FROM prontuario WHERE id = ?");
        $chk->execute([$pid]);
        $row = $chk->fetch();
        if (!$row) json_out(['erro' => 'Entrada não encontrada'], 404);
        if ($row['tipo'] !== 'anotacao') json_out(['erro' => 'Registros de atendimento não podem ser excluídos'], 403);
        $db->prepare("DELETE FROM prontuario WHERE id = ?")->execute([$pid]);
        logAtividade($db, $_SESSION['userId'] ?? null, 'excluir_prontuario', 'prontuario', $pid, null);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  FINANCEIRO
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'financeiro') {
    gerente_required();
    $db  = getDb();
    $ini = $_GET['inicio'] ?? '';
    $fim = $_GET['fim']    ?? '';

    if (($parts[1] ?? '') === 'resumo' && $method === 'GET') {
        $s = $db->prepare(
            "SELECT COUNT(*) as total_agendamentos,
                    COALESCE(SUM(CASE WHEN status='concluido' THEN valor_cobrado ELSE 0 END), 0) as recebido,
                    COALESCE(SUM(CASE WHEN status='agendado'  THEN valor_cobrado ELSE 0 END), 0) as a_receber,
                    SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END) as cancelados
             FROM agendamentos
             WHERE DATE(data_hora) BETWEEN ? AND ?"
        );
        $s->execute([$ini, $fim]);
        json_out($s->fetch());
    }

    if (($parts[1] ?? '') === 'detalhado' && $method === 'GET') {
        $s = $db->prepare(
            "SELECT a.id, a.data_hora, a.status, a.valor_cobrado,
                    c.nome as cliente_nome,
                    GROUP_CONCAT(p2.nome ORDER BY p2.nome SEPARATOR ', ') as procedimento_nome,
                    pu.desconto_aplicado as promo_desconto,
                    pr.nome as promo_nome
             FROM agendamentos a
             JOIN clientes c ON c.id = a.cliente_id
             LEFT JOIN agendamento_procedimentos ap2 ON ap2.agendamento_id = a.id
             LEFT JOIN procedimentos p2 ON p2.id = ap2.procedimento_id
             LEFT JOIN promocao_usos pu ON pu.agendamento_id = a.id
             LEFT JOIN promocoes pr ON pr.id = pu.promocao_id
             WHERE DATE(a.data_hora) BETWEEN ? AND ?
             GROUP BY a.id, a.data_hora, a.status, a.valor_cobrado, c.nome, pu.desconto_aplicado, pr.nome
             ORDER BY a.data_hora"
        );
        $s->execute([$ini, $fim]);
        json_out($s->fetchAll());
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  INTERESSES (Procedimentos e Variantes por Cliente)
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'cliente-proc') {
    auth_required();
    $db = getDb();
    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare('SELECT procedimento_id FROM cliente_procedimentos_interesse WHERE cliente_id = ?');
        $s->execute([(int)$parts[1]]);
        json_out(array_column($s->fetchAll(), 'procedimento_id'));
    }
    if ($method === 'POST' && count($parts) === 1) {
        $b       = body();
        $cid     = (int)($b['clienteId'] ?? 0);
        $procIds = $b['procedimentoIds'] ?? [];
        $db->prepare('DELETE FROM cliente_procedimentos_interesse WHERE cliente_id = ?')->execute([$cid]);
        $ins = $db->prepare('INSERT INTO cliente_procedimentos_interesse (cliente_id, procedimento_id) VALUES (?,?)');
        foreach ($procIds as $pid) $ins->execute([$cid, (int)$pid]);
        json_out(['ok' => true]);
    }
}

if ($parts[0] === 'cliente-variantes') {
    auth_required();
    $db = getDb();
    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare('SELECT variante_id FROM cliente_variantes_interesse WHERE cliente_id = ?');
        $s->execute([(int)$parts[1]]);
        json_out(array_column($s->fetchAll(), 'variante_id'));
    }
    if ($method === 'POST' && count($parts) === 1) {
        $b      = body();
        $cid    = (int)($b['clienteId'] ?? 0);
        $varIds = $b['varianteIds'] ?? [];
        $db->prepare('DELETE FROM cliente_variantes_interesse WHERE cliente_id = ?')->execute([$cid]);
        $ins = $db->prepare('INSERT IGNORE INTO cliente_variantes_interesse (cliente_id, variante_id) VALUES (?,?)');
        foreach ($varIds as $vid) $ins->execute([$cid, (int)$vid]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROMOÇÕES — Helpers de cálculo
// ══════════════════════════════════════════════════════════════════════════════
function _estaNaVigencia(array $prom, string $dataHora): bool {
    $data = substr($dataHora, 0, 10);
    if (!empty($prom['data_inicio']) && $data < $prom['data_inicio']) return false;
    if (!empty($prom['data_fim'])    && $data > $prom['data_fim'])    return false;
    if (!empty($prom['dias_semana'])) {
        $dias = json_decode($prom['dias_semana'], true);
        if (is_array($dias) && count($dias) > 0) {
            $dow = (int)date('w', strtotime(str_replace(' ', 'T', $dataHora)));
            if (!in_array($dow, $dias)) return false;
        }
    }
    return true;
}

function _subtotalItens(array $itens): float {
    return array_sum(array_map(fn($it) => (float)($it['valor'] ?? 0), $itens));
}

function _clonarItens(array $itens): array {
    return array_map(function($it, $idx) {
        $it['_idx']   = $idx;
        $it['_usado'] = false;
        return $it;
    }, $itens, array_keys($itens));
}

function _matchRegraEmItem(array $regra, array $item): bool {
    if ($regra['tipo_regra'] === 'categoria_laser') return ((int)($item['is_laser'] ?? 0)) === 1;
    if ($regra['tipo_regra'] === 'procedimento')    return (int)($item['procedimento_id'] ?? 0) === (int)($regra['procedimento_id'] ?? 0);
    if ($regra['tipo_regra'] === 'variante')        return (int)($item['variante_id'] ?? 0) === (int)($regra['variante_id'] ?? 0);
    return false;
}

function _consumirListaFechada(array $regras, array &$pool): ?array {
    $usados = [];
    foreach ($regras as $regra) {
        $faltam = (int)($regra['quantidade'] ?? 1);
        foreach ($pool as &$item) {
            if ($item['_usado']) continue;
            if (_matchRegraEmItem($regra, $item)) {
                $item['_usado'] = true;
                $usados[] = $item;
                $faltam--;
                if ($faltam <= 0) break;
            }
        }
        unset($item);
        if ($faltam > 0) return null;
    }
    return $usados;
}

function _consumirMinimo(array $regras, int $quantMin, array &$pool): ?array {
    $elegiveis = [];
    foreach ($pool as &$it) {
        if ($it['_usado']) continue;
        foreach ($regras as $r) {
            if (_matchRegraEmItem($r, $it)) {
                $elegiveis[] = &$it;
                break;
            }
        }
    }
    unset($it);
    if (count($elegiveis) < $quantMin) return null;
    $usados = array_slice($elegiveis, 0, $quantMin);
    foreach ($usados as &$u) { $u['_usado'] = true; }
    unset($u);
    return $usados;
}

function _calcDesconto(string $tipo, $valorDesc, float $subtotalCasado): float {
    $vd  = (float)$valorDesc;
    $sub = $subtotalCasado;
    if ($tipo === 'percentual')                          return max(0, $sub * $vd / 100);
    if ($tipo === 'reais')                               return max(0, min($vd, $sub));
    if ($tipo === 'fixo' || $tipo === 'valor_fixo')      return max(0, $sub - $vd);
    return 0;
}

function _tentarPromo(PDO $db, array $prom, array $itens, string $dataHora): ?array {
    if (!_estaNaVigencia($prom, $dataHora)) return null;
    $usos = $db->prepare('SELECT COUNT(*) FROM promocao_usos WHERE promocao_id = ?');
    $usos->execute([$prom['id']]);
    $nUsos = (int)$usos->fetchColumn();
    if ($prom['limite_usos'] !== null && $nUsos >= (int)$prom['limite_usos']) return null;

    $stRegras = $db->prepare('SELECT * FROM promocao_regras WHERE promocao_id = ? ORDER BY id');
    $stRegras->execute([$prom['id']]);
    $regras = $stRegras->fetchAll();
    if (empty($regras)) return null;

    $pool = _clonarItens($itens);

    $usados = $prom['modo_itens'] === 'lista_fechada'
        ? _consumirListaFechada($regras, $pool)
        : _consumirMinimo($regras, (int)($prom['quantidade_min'] ?? 1), $pool);

    if (!$usados || count($usados) === 0) return null;

    $subtotalCasado = _subtotalItens($usados);
    $desconto       = _calcDesconto($prom['tipo_desconto'], $prom['valor_desconto'], $subtotalCasado);
    $valorAplicado  = max(0, $subtotalCasado - $desconto);
    return [
        'promocao'        => $prom,
        'usados'          => $usados,
        'subtotal_casado' => $subtotalCasado,
        'valor_aplicado'  => $valorAplicado,
        'desconto'        => $desconto,
    ];
}

function _buscarPromoAuto(PDO $db, array $itens, string $dataHora, ?int $ignorarId = null): ?array {
    $proms = $db->query('SELECT * FROM promocoes WHERE ativa = 1 ORDER BY id')->fetchAll();
    foreach ($proms as $prom) {
        if ($ignorarId && (int)$prom['id'] === $ignorarId) continue;
        $res = _tentarPromo($db, $prom, $itens, $dataHora);
        if ($res) return $res;
    }
    return null;
}

function _enriquecerItens(PDO $db, array $itensRaw): array {
    $result = [];
    foreach ($itensRaw as $it) {
        if (!empty($it['variante_id'])) {
            $s = $db->prepare(
                'SELECT pv.id as variante_id, pv.valor, pv.duracao_min,
                        p.id as procedimento_id, p.nome as procedimento_nome, p.is_laser,
                        pv.nome as variante_nome
                 FROM procedimento_variantes pv
                 JOIN procedimentos p ON p.id = pv.procedimento_id
                 WHERE pv.id = ?'
            );
            $s->execute([$it['variante_id']]);
            $row = $s->fetch();
            if ($row) {
                $result[] = [
                    'procedimento_id'   => (int)$row['procedimento_id'],
                    'procedimento_nome' => $row['procedimento_nome'],
                    'variante_id'       => (int)$row['variante_id'],
                    'variante_nome'     => $row['variante_nome'],
                    'valor'             => (float)($it['valor'] ?? $row['valor'] ?? 0),
                    'duracao_min'       => (int)($it['duracao_min'] ?? $row['duracao_min'] ?? 0),
                    'is_laser'          => (int)($row['is_laser'] ?? 0),
                ];
                continue;
            }
        }
        $s = $db->prepare('SELECT * FROM procedimentos WHERE id = ?');
        $s->execute([$it['procedimento_id'] ?? 0]);
        $proc = $s->fetch();
        $result[] = [
            'procedimento_id'   => (int)($it['procedimento_id'] ?? 0),
            'procedimento_nome' => $proc['nome'] ?? '',
            'variante_id'       => null,
            'variante_nome'     => null,
            'valor'             => (float)($it['valor'] ?? $proc['valor'] ?? 0),
            'duracao_min'       => (int)($it['duracao_min'] ?? $proc['duracao_min'] ?? 0),
            'is_laser'          => (int)($proc['is_laser'] ?? 0),
        ];
    }
    return $result;
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROMOÇÕES — CRUD
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'promocoes') {
    $db = getDb();

    // POST /promocoes/calcular — cálculo automático (acessível por todos os autenticados)
    if ($method === 'POST' && count($parts) === 2 && $parts[1] === 'calcular') {
        auth_required();
        try {
            $payload = body();
            $itens   = _enriquecerItens($db, $payload['itens'] ?? []);
            $subtotal = _subtotalItens($itens);

            $aplicada = null;
            if (!empty($payload['promocao_id'])) {
                $s = $db->prepare('SELECT * FROM promocoes WHERE id = ? AND ativa = 1');
                $s->execute([$payload['promocao_id']]);
                $prom = $s->fetch();
                if ($prom) $aplicada = _tentarPromo($db, $prom, $itens, $payload['data_hora'] ?? date('Y-m-d H:i'));
            } elseif (($payload['aplicar_automatico'] ?? 1) !== 0) {
                $aplicada = _buscarPromoAuto($db, $itens, $payload['data_hora'] ?? date('Y-m-d H:i'));
            }

            $alternativa = $aplicada
                ? _buscarPromoAuto($db, $itens, $payload['data_hora'] ?? date('Y-m-d H:i'), (int)$aplicada['promocao']['id'])
                : null;

            $total = $aplicada ? $subtotal - $aplicada['desconto'] : $subtotal;

            json_out([
                'subtotal' => $subtotal,
                'total'    => $total,
                'promocao_aplicada' => $aplicada ? [
                    'id'              => (int)$aplicada['promocao']['id'],
                    'nome'            => $aplicada['promocao']['nome'],
                    'tipo_desconto'   => $aplicada['promocao']['tipo_desconto'],
                    'valor_desconto'  => $aplicada['promocao']['valor_desconto'],
                    'subtotal_casado' => $aplicada['subtotal_casado'],
                    'valor_aplicado'  => $aplicada['valor_aplicado'],
                    'desconto'        => $aplicada['desconto'],
                    'usados'          => $aplicada['usados'],
                ] : null,
                'aviso_outra_promocao' => $alternativa
                    ? 'Outra promoção também era aplicável: "' . $alternativa['promocao']['nome'] . '". Apenas uma promoção por agendamento.'
                    : null,
            ]);
        } catch (Exception $e) {
            logApp('error', 'Erro ao calcular promoção', ['msg' => $e->getMessage()]);
            json_out(['erro' => 'Erro ao calcular promoção'], 500);
        }
    }

    // GET /promocoes — listar todas com regras
    if ($method === 'GET' && count($parts) === 1) {
        auth_required();
        $promos = $db->query('SELECT * FROM promocoes ORDER BY criado_em DESC')->fetchAll();
        $stRegras = $db->prepare(
            'SELECT r.*, p.nome as procedimento_nome, v.nome as variante_nome
             FROM promocao_regras r
             LEFT JOIN procedimentos p ON p.id = r.procedimento_id
             LEFT JOIN procedimento_variantes v ON v.id = r.variante_id
             WHERE r.promocao_id = ? ORDER BY r.id'
        );
        foreach ($promos as &$p) {
            $stRegras->execute([$p['id']]);
            $p['regras'] = $stRegras->fetchAll();
        }
        unset($p);
        json_out($promos);
    }

    // GET /promocoes/:id
    if ($method === 'GET' && count($parts) === 2) {
        auth_required();
        $s = $db->prepare('SELECT * FROM promocoes WHERE id = ?');
        $s->execute([(int)$parts[1]]);
        $promo = $s->fetch();
        if (!$promo) json_out(['erro' => 'Não encontrado'], 404);
        $stRegras = $db->prepare(
            'SELECT r.*, p.nome as procedimento_nome, v.nome as variante_nome
             FROM promocao_regras r
             LEFT JOIN procedimentos p ON p.id = r.procedimento_id
             LEFT JOIN procedimento_variantes v ON v.id = r.variante_id
             WHERE r.promocao_id = ? ORDER BY r.id'
        );
        $stRegras->execute([$promo['id']]);
        $promo['regras'] = $stRegras->fetchAll();
        json_out($promo);
    }

    // POST /promocoes — criar ou atualizar
    if ($method === 'POST' && count($parts) === 1) {
        gerente_required();
        $d = body();
        if (empty(trim($d['nome'] ?? '')))
            json_out(['erro' => 'Nome é obrigatório'], 400);

        $campos = ['nome','tipo_desconto','valor_desconto','modo_itens',
                    'quantidade_min','ativa','data_inicio','data_fim',
                    'dias_semana','limite_usos'];

        try {
            $db->beginTransaction();

            if (!empty($d['id'])) {
                $set = implode(',', array_map(fn($c) => "$c = ?", $campos));
                $vals = array_map(fn($c) => $d[$c] ?? null, $campos);
                $vals[] = (int)$d['id'];
                $db->prepare("UPDATE promocoes SET $set WHERE id = ?")->execute($vals);
                $promoId = (int)$d['id'];
            } else {
                $cols = implode(',', $campos);
                $plh  = implode(',', array_fill(0, count($campos), '?'));
                $vals = array_map(fn($c) => $d[$c] ?? null, $campos);
                $db->prepare("INSERT INTO promocoes ($cols) VALUES ($plh)")->execute($vals);
                $promoId = (int)$db->lastInsertId();
            }

            // Regras
            $db->prepare('DELETE FROM promocao_regras WHERE promocao_id = ?')->execute([$promoId]);
            $insRegra = $db->prepare(
                'INSERT INTO promocao_regras (promocao_id, tipo_regra, procedimento_id, variante_id, quantidade) VALUES (?,?,?,?,?)'
            );
            $regras = is_array($d['regras'] ?? null) ? $d['regras'] : [];
            foreach ($regras as $r) {
                $tipo = $r['tipo_regra'] ?? null;
                if (!$tipo) {
                    if (!empty($r['variante_id']))         $tipo = 'variante';
                    elseif (!empty($r['procedimento_id'])) $tipo = 'procedimento';
                    else                                    $tipo = 'categoria_laser';
                }
                $insRegra->execute([
                    $promoId,
                    $tipo,
                    !empty($r['procedimento_id']) ? (int)$r['procedimento_id'] : null,
                    !empty($r['variante_id'])     ? (int)$r['variante_id']     : null,
                    (int)($r['quantidade'] ?? 1),
                ]);
            }

            $db->commit();
            json_out(['id' => $promoId]);

        } catch (Exception $e) {
            $db->rollBack();
            logApp('error', 'Erro ao salvar promoção', ['msg' => $e->getMessage()]);
            json_out(['erro' => 'Erro ao salvar promoção: ' . $e->getMessage()], 500);
        }
    }

    // DELETE /promocoes/:id
    if ($method === 'DELETE' && count($parts) === 2) {
        gerente_required();
        $db->prepare('DELETE FROM promocoes WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  BLOQUEIOS DE HORÁRIO
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'bloqueios') {
    gerente_required();
    $db = getDb();

    if ($method === 'GET' && count($parts) === 1) {
        $sql    = 'SELECT * FROM bloqueios_horario';
        $params = [];
        if (!empty($_GET['data_inicio']) && !empty($_GET['data_fim'])) {
            $sql   .= ' WHERE data_hora_inicio <= ? AND data_hora_fim >= ?';
            $params = [$_GET['data_fim'], $_GET['data_inicio']];
        }
        $sql .= ' ORDER BY data_hora_inicio';
        $s = $db->prepare($sql);
        $s->execute($params);
        json_out($s->fetchAll());
    }

    if ($method === 'POST' && count($parts) === 1) {
        $d = body();
        if (empty($d['data_hora_inicio']) || empty($d['data_hora_fim']))
            json_out(['erro' => 'Datas de início e fim são obrigatórias'], 400);

        if (!empty($d['id'])) {
            $db->prepare('UPDATE bloqueios_horario SET titulo=?, data_hora_inicio=?, data_hora_fim=?, motivo=?, recorrente=? WHERE id=?')
               ->execute([$d['titulo'] ?? 'Bloqueado', $d['data_hora_inicio'], $d['data_hora_fim'],
                           $d['motivo'] ?? null, $d['recorrente'] ?? 0, (int)$d['id']]);
            json_out(['id' => (int)$d['id']]);
        } else {
            $db->prepare('INSERT INTO bloqueios_horario (titulo, data_hora_inicio, data_hora_fim, motivo, recorrente) VALUES (?,?,?,?,?)')
               ->execute([$d['titulo'] ?? 'Bloqueado', $d['data_hora_inicio'], $d['data_hora_fim'],
                           $d['motivo'] ?? null, $d['recorrente'] ?? 0]);
            json_out(['id' => (int)$db->lastInsertId()]);
        }
    }

    if ($method === 'DELETE' && count($parts) === 2) {
        $db->prepare('DELETE FROM bloqueios_horario WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOG DE ATIVIDADES
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'logs' && $method === 'GET' && count($parts) === 1) {
    admin_required();
    $db  = getDb();
    $lim = min((int)($_GET['limite'] ?? 100), 500);
    $s   = $db->prepare(
        'SELECT l.*, u.usuario
         FROM log_atividades l
         LEFT JOIN usuarios u ON u.id = l.usuario_id
         ORDER BY l.criado_em DESC
         LIMIT ?'
    );
    $s->bindValue(1, $lim, PDO::PARAM_INT);
    $s->execute();
    json_out($s->fetchAll());
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'dashboard' && $method === 'GET') {
    auth_required();
    $db = getDb();
    $hoje     = date('Y-m-d');
    $mesAtual = date('Y-m');

    $agendHoje = $db->prepare('SELECT COUNT(*) FROM agendamentos WHERE DATE(data_hora) = ?');
    $agendHoje->execute([$hoje]);

    $totalClientes = $db->query('SELECT COUNT(*) FROM clientes')->fetchColumn();

    $recebidoMes = $db->prepare(
        "SELECT COALESCE(SUM(valor_cobrado), 0) FROM agendamentos
         WHERE status='concluido' AND DATE_FORMAT(data_hora, '%Y-%m') = ?"
    );
    $recebidoMes->execute([$mesAtual]);

    $promosAtivas = $db->query('SELECT COUNT(*) FROM promocoes WHERE ativa = 1')->fetchColumn();

    $agendSemana = $db->prepare(
        'SELECT COUNT(*) FROM agendamentos
         WHERE DATE(data_hora) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()'
    );
    $agendSemana->execute();

    $taxaConclusao = $db->prepare(
        "SELECT CASE WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(100.0 * SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) / COUNT(*), 1)
                END
         FROM agendamentos
         WHERE DATE_FORMAT(data_hora, '%Y-%m') = ?"
    );
    $taxaConclusao->execute([$mesAtual]);

    $proximosAgend = $db->prepare(
        "SELECT a.id, a.data_hora, a.status, a.valor_cobrado, c.nome as cliente_nome
         FROM agendamentos a
         JOIN clientes c ON c.id = a.cliente_id
         WHERE DATE(a.data_hora) = ? AND a.status = 'agendado'
         ORDER BY a.data_hora
         LIMIT 10"
    );
    $proximosAgend->execute([$hoje]);

    $topProc = $db->prepare(
        "SELECT p.nome, COUNT(*) as total
         FROM agendamento_procedimentos ap
         JOIN procedimentos p ON p.id = ap.procedimento_id
         JOIN agendamentos a ON a.id = ap.agendamento_id
         WHERE DATE_FORMAT(a.data_hora, '%Y-%m') = ?
         GROUP BY p.id, p.nome
         ORDER BY total DESC
         LIMIT 5"
    );
    $topProc->execute([$mesAtual]);

    json_out([
        'agendamentos_hoje'    => (int)$agendHoje->fetchColumn(),
        'agendamentos_semana'  => (int)$agendSemana->fetchColumn(),
        'total_clientes'       => (int)$totalClientes,
        'recebido_mes'         => (float)$recebidoMes->fetchColumn(),
        'promos_ativas'        => (int)$promosAtivas,
        'taxa_conclusao'       => (float)$taxaConclusao->fetchColumn(),
        'proximos_agendamentos'=> $proximosAgend->fetchAll(),
        'top_procedimentos'    => $topProc->fetchAll(),
    ]);
}

// ══════════════════════════════════════════════════════════════════════════════
//  RELATÓRIOS
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'relatorios') {
    gerente_required();
    $db = getDb();

    if (($parts[1] ?? '') === 'faturamento-mensal' && $method === 'GET') {
        $qtd = min((int)($_GET['meses'] ?? 6), 24);
        $s = $db->prepare(
            "SELECT DATE_FORMAT(data_hora, '%Y-%m') as mes,
                    COUNT(*) as total_agendamentos,
                    COALESCE(SUM(CASE WHEN status='concluido' THEN valor_cobrado ELSE 0 END), 0) as faturado,
                    SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END) as cancelados
             FROM agendamentos
             WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
             GROUP BY mes
             ORDER BY mes"
        );
        $s->execute([$qtd]);
        json_out($s->fetchAll());
    }

    if (($parts[1] ?? '') === 'clientes-frequentes' && $method === 'GET') {
        $s = $db->query(
            "SELECT c.id, c.nome, c.telefone, COUNT(a.id) as total_agendamentos,
                    COALESCE(SUM(CASE WHEN a.status='concluido' THEN a.valor_cobrado ELSE 0 END), 0) as total_gasto,
                    MAX(a.data_hora) as ultimo_agendamento
             FROM clientes c
             JOIN agendamentos a ON a.cliente_id = c.id
             GROUP BY c.id, c.nome, c.telefone
             ORDER BY total_agendamentos DESC
             LIMIT 20"
        );
        json_out($s->fetchAll());
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  BACKUP (MySQL dump via PHP)
// ══════════════════════════════════════════════════════════════════════════════
if ($parts[0] === 'backup' && $method === 'GET') {
    admin_required();
    try {
        $db = getDb();
        $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $timestamp = date('Y-m-d_H-i-s');

        header('Content-Type: application/sql');
        header("Content-Disposition: attachment; filename=\"backup_{$timestamp}.sql\"");

        echo "-- Backup gerado em {$timestamp}\n";
        echo "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n";

        foreach ($tables as $table) {
            $create = $db->query("SHOW CREATE TABLE `{$table}`")->fetch();
            echo "DROP TABLE IF EXISTS `{$table}`;\n";
            echo $create['Create Table'] . ";\n\n";

            $rows = $db->query("SELECT * FROM `{$table}`")->fetchAll();
            foreach ($rows as $row) {
                $vals = array_map(function($v) use ($db) {
                    if ($v === null) return 'NULL';
                    return $db->quote($v);
                }, $row);
                echo "INSERT INTO `{$table}` VALUES (" . implode(',', $vals) . ");\n";
            }
            echo "\n";
        }

        echo "SET FOREIGN_KEY_CHECKS = 1;\n";
        exit;

    } catch (Exception $e) {
        json_out(['erro' => 'Erro ao gerar backup: ' . $e->getMessage()], 500);
    }
}

// ── Rota não encontrada ─────────────────────────────────────────────────────
json_out(['erro' => 'Rota não encontrada: ' . $route], 404);
