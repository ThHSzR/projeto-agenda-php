<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/logger.php';

// ── Sessão PRIMEIRO ──────────────────────────────────────────────────────────
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');
session_set_cookie_params(['lifetime' => SESSION_LIFETIME, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

// ── Log da requisição ────────────────────────────────────────────────────────
logApp('info', '── REQUISIÇÃO ──', [
    'method'  => $_SERVER['REQUEST_METHOD'],
    'route'   => $_GET['_route'] ?? '/',
    'ip'      => $_SERVER['REMOTE_ADDR'],
    'session' => session_id(),
    'logado'  => $_SESSION['logado'] ?? false,
]);

// Lê o body UMA única vez
$_rawBody = file_get_contents('php://input');
if ($_rawBody) {
    $_bodyLog = json_decode($_rawBody, true) ?? [];
    unset($_bodyLog['senha']);
    logApp('info', 'BODY recebido', $_bodyLog);
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// Em produção, substitua '*' pelo domínio real (ex: 'https://suaagenda.com.br')
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Roteamento ───────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$route  = trim($_GET['_route'] ?? '', '/');
if (($qpos = strpos($route, '?')) !== false) $route = substr($route, 0, $qpos);
$parts = explode('/', $route);

// ── AUTH ─────────────────────────────────────────────────────────────────────
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
            logApp('info', 'Admin padrão criado automaticamente');
        }

        $stmt = $db->prepare('SELECT * FROM usuarios WHERE usuario = ?');
        $stmt->execute([$usuario]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($senha, $user['senha'])) {
            logApp('warn', 'Login inválido', ['usuario' => $usuario]);
            json_out(['erro' => 'Usuário ou senha incorretos'], 401);
        }

        session_regenerate_id(true);
        $_SESSION['logado']   = true;
        $_SESSION['usuario']  = $user['usuario'];
        $_SESSION['is_admin'] = (bool)$user['is_admin'];
        $_SESSION['cargo']    = $user['cargo'] ?? 'operador';

        logApp('info', 'Login bem-sucedido', ['usuario' => $usuario]);
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

// ── USUÁRIOS ──────────────────────────────────────────────────────────────────
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
        json_out(['id' => $db->lastInsertId()]);
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

// ── CLIENTES ─────────────────────────────────────────────────────────────────
if ($parts[0] === 'clientes') {
    auth_required();
    $db = getDb();
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
        // Garante que data_nascimento vazia vira NULL (evita erro de conversão no MySQL)
        $idx = array_search('data_nascimento', $fields);
        if ($idx !== false && empty($vals[$idx])) $vals[$idx] = null;
        if (!empty($d['id'])) {
            $set = implode(',', array_map(fn($f) => "$f = ?", $fields));
            $db->prepare("UPDATE clientes SET $set WHERE id = ?")->execute([...$vals, (int)$d['id']]);
            json_out(['id' => (int)$d['id']]);
        } else {
            $cols = implode(',', $fields);
            $plh  = implode(',', array_fill(0, count($fields), '?'));
            $db->prepare("INSERT INTO clientes ($cols) VALUES ($plh)")->execute($vals);
            json_out(['id' => $db->lastInsertId()]);
        }
    }
    if ($method === 'DELETE' && count($parts) === 2) {
        $db->prepare('DELETE FROM clientes WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ── PROCEDIMENTOS ─────────────────────────────────────────────────────────────
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
            json_out(['id' => $db->lastInsertId()]);
        }
    }
    if ($method === 'DELETE' && count($parts) === 2) {
        gerente_required();
        $db->prepare('UPDATE procedimentos SET ativo = 0 WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ── VARIANTES ─────────────────────────────────────────────────────────────────
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
            json_out(['id' => $db->lastInsertId()]);
        }
    }
    if ($method === 'DELETE' && count($parts) === 2) {
        gerente_required();
        $db->prepare('DELETE FROM procedimento_variantes WHERE id = ?')->execute([(int)$parts[1]]);
        json_out(['ok' => true]);
    }
}

// ── AGENDAMENTOS ──────────────────────────────────────────────────────────────
if ($parts[0] === 'agendamentos') {
    auth_required();
    $db = getDb();

    // GET /agendamentos — lista com filtros opcionais
    if ($method === 'GET' && count($parts) === 1) {
        $sql    = 'SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
                          p.nome as procedimento_nome, v.nome as variante_nome
                   FROM agendamentos a
                   JOIN clientes c ON c.id = a.cliente_id
                   LEFT JOIN procedimentos p ON p.id = a.procedimento_id
                   LEFT JOIN procedimento_variantes v ON v.id = a.variante_id';
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
        json_out($s->fetchAll());
    }

    // GET /agendamentos/:id — busca com procedimentos
    if ($method === 'GET' && count($parts) === 2) {
        $s = $db->prepare(
            'SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
                    p.nome as procedimento_nome, p.tem_variantes, v.nome as variante_nome
             FROM agendamentos a
             JOIN clientes c ON c.id = a.cliente_id
             LEFT JOIN procedimentos p ON p.id = a.procedimento_id
             LEFT JOIN procedimento_variantes v ON v.id = a.variante_id
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
                $db->prepare(
                    'UPDATE agendamentos
                     SET cliente_id=?, data_hora=?, status=?, valor_cobrado=?, observacoes=?,
                         procedimento_id=NULL, variante_id=NULL
                     WHERE id=?'
                )->execute([$d['cliente_id'], $d['data_hora'], $d['status'] ?? 'agendado',
                             $valorF, $d['observacoes'] ?? null, (int)$d['id']]);
                $agendId = (int)$d['id'];
            } else {
                $db->prepare(
                    'INSERT INTO agendamentos (cliente_id, data_hora, status, valor_cobrado, observacoes)
                     VALUES (?,?,?,?,?)'
                )->execute([$d['cliente_id'], $d['data_hora'], $d['status'] ?? 'agendado',
                             $valorF, $d['observacoes'] ?? null]);
                $agendId = (int)$db->lastInsertId();
            }

            // Recria lista de procedimentos do agendamento
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

            $db->commit();
            json_out(['id' => $agendId]);

        } catch (Exception $e) {
            $db->rollBack();
            logApp('error', 'Erro ao salvar agendamento', ['msg' => $e->getMessage()]);
            json_out(['erro' => 'Erro ao salvar agendamento'], 500);
        }
    }

    // DELETE /agendamentos/:id
    if ($method === 'DELETE' && count($parts) === 2) {
        $db->prepare('DELETE FROM agendamentos WHERE id = ?')->execute([(int)$parts[1]]);
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

// ── FINANCEIRO ─────────────────────────────────────────────────────────────────
if ($parts[0] === 'financeiro') {
    gerente_required();
    $db  = getDb();
    $ini = $_GET['inicio'] ?? '';
    $fim = $_GET['fim']    ?? '';

    if (($parts[1] ?? '') === 'resumo' && $method === 'GET') {
        $s = $db->prepare(
            "SELECT COUNT(*) as total_agendamentos,
                    SUM(CASE WHEN status='concluido' THEN valor_cobrado ELSE 0 END) as recebido,
                    SUM(CASE WHEN status='agendado'  THEN valor_cobrado ELSE 0 END) as a_receber,
                    SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END)             as cancelados
             FROM agendamentos
             WHERE DATE(data_hora) BETWEEN ? AND ?"
        );
        $s->execute([$ini, $fim]);
        json_out($s->fetch());
    }

    if (($parts[1] ?? '') === 'detalhado' && $method === 'GET') {
        // CORRIGIDO: GROUP BY inclui todas as colunas não-agregadas (MySQL strict mode)
        $s = $db->prepare(
            "SELECT a.id, a.data_hora, a.status, a.valor_cobrado,
                    c.nome as cliente_nome,
                    GROUP_CONCAT(p2.nome ORDER BY p2.nome SEPARATOR ', ') as procedimento_nome
             FROM agendamentos a
             JOIN clientes c ON c.id = a.cliente_id
             LEFT JOIN agendamento_procedimentos ap2 ON ap2.agendamento_id = a.id
             LEFT JOIN procedimentos p2 ON p2.id = ap2.procedimento_id
             WHERE DATE(a.data_hora) BETWEEN ? AND ?
             GROUP BY a.id, a.data_hora, a.status, a.valor_cobrado, c.nome
             ORDER BY a.data_hora"
        );
        $s->execute([$ini, $fim]);
        json_out($s->fetchAll());
    }
}

// ── CLIENTE-PROC ──────────────────────────────────────────────────────────────
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

// ── CLIENTE-VARIANTES ─────────────────────────────────────────────────────────
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

// ── Rota não encontrada ───────────────────────────────────────────────────────
json_out(['erro' => 'Rota não encontrada: ' . $route], 404);
