-- migrate.sql
-- Execute este arquivo no phpMyAdmin (ou via CLI: mysql -u user -p banco < migrate.sql)
-- para criar todas as tabelas necessárias.

SET NAMES utf8mb4;

-- ══════════════════════════════════════════════════════════════
-- TABELAS BASE
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usuarios (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  usuario   VARCHAR(100)  NOT NULL UNIQUE,
  senha     VARCHAR(255)  NOT NULL,
  is_admin  TINYINT       NOT NULL DEFAULT 0,
  cargo     VARCHAR(50)   DEFAULT 'operador',
  criado_em DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clientes (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  nome                    VARCHAR(200) NOT NULL,
  data_nascimento         DATE,
  cpf                     VARCHAR(20),
  email                   VARCHAR(200),
  telefone                VARCHAR(30),
  celular                 VARCHAR(30),
  endereco                VARCHAR(300),
  cidade                  VARCHAR(100),
  uf                      VARCHAR(2),
  areas_tratar            TEXT,
  metodo_dep_cera         TINYINT DEFAULT 0,
  metodo_dep_lamina       TINYINT DEFAULT 0,
  metodo_dep_laser        TINYINT DEFAULT 0,
  prob_encravamento       TINYINT DEFAULT 0,
  prob_manchas            TINYINT DEFAULT 0,
  prob_outros             TEXT,
  medicamento_uso         TINYINT DEFAULT 0,
  medicamento_qual        TEXT,
  roacutan                TINYINT DEFAULT 0,
  tto_vitiligo            TINYINT DEFAULT 0,
  alergia_medicamento     TINYINT DEFAULT 0,
  alergia_qual            TEXT,
  tratamento_dermato      TINYINT DEFAULT 0,
  tratamento_dermato_qual TEXT,
  usa_acidos              TINYINT DEFAULT 0,
  cirurgia                TINYINT DEFAULT 0,
  cirurgia_qual           TEXT,
  anticoncepcional        TINYINT DEFAULT 0,
  anticoncepcional_qual   TEXT,
  historico_oncologico    TINYINT DEFAULT 0,
  oncologico_qual         TEXT,
  acompanhamento_medico   TINYINT DEFAULT 0,
  acompanhamento_qual     TEXT,
  epilepsia               TINYINT DEFAULT 0,
  alteracao_hormonal      TINYINT DEFAULT 0,
  hormonal_qual           TEXT,
  hirsutismo              TINYINT DEFAULT 0,
  gestante                TINYINT DEFAULT 0,
  herpes                  TINYINT DEFAULT 0,
  lactante                TINYINT DEFAULT 0,
  cor_olhos               VARCHAR(50),
  cor_cabelos             VARCHAR(50),
  cor_pelos               VARCHAR(50),
  tomou_sol               TINYINT DEFAULT 0,
  sol_quando              TEXT,
  fitzpatrick             TINYINT DEFAULT 0,
  termo_assinado          TINYINT DEFAULT 0,
  observacoes             TEXT,
  criado_em               DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedimentos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(200) NOT NULL,
  descricao     TEXT,
  duracao_min   INT          DEFAULT 60,
  valor         DECIMAL(10,2) DEFAULT 0.00,
  ativo         TINYINT      DEFAULT 1,
  is_laser      TINYINT      DEFAULT 0,
  tem_variantes TINYINT      DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedimento_variantes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  procedimento_id INT          NOT NULL,
  nome            VARCHAR(200) NOT NULL,
  descricao       TEXT,
  duracao_min     INT          DEFAULT 30,
  valor           DECIMAL(10,2) DEFAULT 0.00,
  ativo           TINYINT      DEFAULT 1,
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agendamentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id      INT          NOT NULL,
  procedimento_id INT          NULL,
  variante_id     INT          NULL,
  data_hora       DATETIME     NOT NULL,
  status          VARCHAR(20)  DEFAULT 'agendado',
  valor_cobrado   DECIMAL(10,2),
  valor_manual_gerente TINYINT NOT NULL DEFAULT 0,
  observacoes     TEXT,
  criado_em       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agendamento_procedimentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id  INT          NOT NULL,
  procedimento_id INT          NOT NULL,
  variante_id     INT          NULL,
  valor           DECIMAL(10,2) DEFAULT 0.00,
  duracao_min     INT          DEFAULT 0,
  FOREIGN KEY (agendamento_id)  REFERENCES agendamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cliente_procedimentos_interesse (
  cliente_id      INT NOT NULL,
  procedimento_id INT NOT NULL,
  PRIMARY KEY (cliente_id, procedimento_id),
  FOREIGN KEY (cliente_id)      REFERENCES clientes(id)      ON DELETE CASCADE,
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cliente_variantes_interesse (
  cliente_id  INT NOT NULL,
  variante_id INT NOT NULL,
  PRIMARY KEY (cliente_id, variante_id),
  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)                ON DELETE CASCADE,
  FOREIGN KEY (variante_id) REFERENCES procedimento_variantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════
-- TABELAS NOVAS — Promoções, Bloqueios, Logs
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promocoes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(200) NOT NULL,
  tipo_desconto   VARCHAR(30)  NOT NULL DEFAULT 'percentual',
  valor_desconto  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  modo_itens      VARCHAR(30)  NOT NULL DEFAULT 'lista_fechada',
  quantidade_min  INT          NULL,
  ativa           TINYINT      NOT NULL DEFAULT 1,
  data_inicio     DATE         NULL,
  data_fim        DATE         NULL,
  dias_semana     VARCHAR(100) DEFAULT '[]',
  limite_usos     INT          NULL,
  usos            INT          NOT NULL DEFAULT 0,
  criado_em       DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promocao_regras (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  promocao_id     INT          NOT NULL,
  tipo_regra      VARCHAR(30)  NOT NULL,
  procedimento_id INT          NULL,
  variante_id     INT          NULL,
  quantidade      INT          NOT NULL DEFAULT 1,
  FOREIGN KEY (promocao_id)     REFERENCES promocoes(id) ON DELETE CASCADE,
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id),
  FOREIGN KEY (variante_id)     REFERENCES procedimento_variantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promocao_usos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  promocao_id       INT          NULL,
  agendamento_id    INT          NOT NULL,
  desconto_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  promo_recusada    TINYINT      NOT NULL DEFAULT 0,
  criado_em         DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (promocao_id)    REFERENCES promocoes(id)    ON DELETE CASCADE,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compatibilidade para bancos criados por versoes anteriores.
SET @tem_valor_manual_gerente = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'agendamentos'
    AND COLUMN_NAME = 'valor_manual_gerente'
);
SET @sql_valor_manual_gerente = IF(
  @tem_valor_manual_gerente = 0,
  'ALTER TABLE agendamentos ADD COLUMN valor_manual_gerente TINYINT NOT NULL DEFAULT 0 AFTER valor_cobrado',
  'SELECT 1'
);
PREPARE stmt_valor_manual_gerente FROM @sql_valor_manual_gerente;
EXECUTE stmt_valor_manual_gerente;
DEALLOCATE PREPARE stmt_valor_manual_gerente;

ALTER TABLE promocao_usos
  MODIFY COLUMN promocao_id INT NULL;

SET @tem_promo_recusada = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'promocao_usos'
    AND COLUMN_NAME = 'promo_recusada'
);
SET @sql_promo_recusada = IF(
  @tem_promo_recusada = 0,
  'ALTER TABLE promocao_usos ADD COLUMN promo_recusada TINYINT NOT NULL DEFAULT 0 AFTER desconto_aplicado',
  'SELECT 1'
);
PREPARE stmt_promo_recusada FROM @sql_promo_recusada;
EXECUTE stmt_promo_recusada;
DEALLOCATE PREPARE stmt_promo_recusada;

CREATE TABLE IF NOT EXISTS bloqueios_horario (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  titulo           VARCHAR(200) NOT NULL DEFAULT 'Bloqueado',
  data_hora_inicio DATETIME     NOT NULL,
  data_hora_fim    DATETIME     NOT NULL,
  motivo           TEXT,
  recorrente       TINYINT      DEFAULT 0,
  criado_em        DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS log_atividades (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT          NULL,
  acao        VARCHAR(100) NOT NULL,
  entidade    VARCHAR(100) NULL,
  entidade_id INT          NULL,
  detalhes    TEXT,
  criado_em   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Atualiza a regra de exclusao mesmo em bancos ja existentes.
SET @fk_log_usuario = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'log_atividades'
    AND COLUMN_NAME = 'usuario_id'
    AND REFERENCED_TABLE_NAME = 'usuarios'
  LIMIT 1
);
SET @sql_drop_fk = IF(
  @fk_log_usuario IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE log_atividades DROP FOREIGN KEY `', @fk_log_usuario, '`')
);
PREPARE stmt_drop_fk FROM @sql_drop_fk;
EXECUTE stmt_drop_fk;
DEALLOCATE PREPARE stmt_drop_fk;
ALTER TABLE log_atividades
  ADD CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════════
-- PRONTUÁRIO — Histórico clínico por cliente
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prontuario (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id     INT          NOT NULL,
  agendamento_id INT          NULL,
  tipo           VARCHAR(20)  NOT NULL DEFAULT 'anotacao',
  -- tipo = 'atendimento' → criado automaticamente ao concluir agendamento (imutável)
  -- tipo = 'anotacao'    → criado/editado/deletado manualmente pelo usuário
  fitzpatrick    TINYINT      DEFAULT 0,
  anotacao       TEXT,
  criado_em      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id)     REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Corrige cadastros antigos cujo nome deixa inequivoco que o procedimento e laser.
-- Depois desta normalizacao, a classificacao deve ser mantida pelo checkbox do CRUD.
UPDATE procedimentos
SET is_laser = 1
WHERE LOWER(TRIM(nome)) IN ('laser', 'depilacao a laser', 'depilação a laser');

-- ============================================================================
-- HARDENING DO ESQUEMA (2026-07-14)
-- Compativel com MySQL 5.7+/8 e MariaDB 10.3+.
-- Esta secao pode ser reaplicada: colunas, indices e constraints sao criados
-- somente quando ainda nao existem.
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  versao       VARCHAR(50)  NOT NULL PRIMARY KEY,
  descricao    VARCHAR(255) NOT NULL,
  aplicado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS _agenda_exec_if_missing;
DELIMITER //
CREATE PROCEDURE _agenda_exec_if_missing(
  IN p_kind VARCHAR(20),
  IN p_table VARCHAR(64),
  IN p_name VARCHAR(64),
  IN p_ddl TEXT
)
BEGIN
  DECLARE item_count INT DEFAULT 0;

  IF p_kind = 'COLUMN' THEN
    SELECT COUNT(*) INTO item_count
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table
       AND COLUMN_NAME = p_name;
  ELSEIF p_kind = 'INDEX' THEN
    SELECT COUNT(*) INTO item_count
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table
       AND INDEX_NAME = p_name;
  ELSEIF p_kind = 'CONSTRAINT' THEN
    SELECT COUNT(*) INTO item_count
      FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = p_table
       AND CONSTRAINT_NAME = p_name;
  END IF;

  IF item_count = 0 THEN
    SET @agenda_ddl = p_ddl;
    PREPARE agenda_stmt FROM @agenda_ddl;
    EXECUTE agenda_stmt;
    DEALLOCATE PREPARE agenda_stmt;
  END IF;
END//
DELIMITER ;

-- Rastreabilidade de alteracoes nos registros mutaveis.
CALL _agenda_exec_if_missing('COLUMN', 'clientes', 'atualizado_em',
  'ALTER TABLE clientes ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em');
CALL _agenda_exec_if_missing('COLUMN', 'procedimentos', 'atualizado_em',
  'ALTER TABLE procedimentos ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL _agenda_exec_if_missing('COLUMN', 'procedimento_variantes', 'atualizado_em',
  'ALTER TABLE procedimento_variantes ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL _agenda_exec_if_missing('COLUMN', 'agendamentos', 'atualizado_em',
  'ALTER TABLE agendamentos ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em');
CALL _agenda_exec_if_missing('COLUMN', 'promocoes', 'atualizado_em',
  'ALTER TABLE promocoes ADD COLUMN atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em');

-- Chave calculada: permite varias anotacoes, mas somente um atendimento por agenda.
CALL _agenda_exec_if_missing('COLUMN', 'prontuario', 'atendimento_agendamento_id',
  'ALTER TABLE prontuario ADD COLUMN atendimento_agendamento_id INT GENERATED ALWAYS AS (CASE WHEN tipo = ''atendimento'' THEN agendamento_id ELSE NULL END) STORED');

-- Indices orientados as consultas reais da aplicacao.
CALL _agenda_exec_if_missing('INDEX', 'clientes', 'idx_clientes_nome',
  'ALTER TABLE clientes ADD INDEX idx_clientes_nome (nome)');
CALL _agenda_exec_if_missing('INDEX', 'clientes', 'idx_clientes_telefone',
  'ALTER TABLE clientes ADD INDEX idx_clientes_telefone (telefone)');
CALL _agenda_exec_if_missing('INDEX', 'agendamentos', 'idx_agendamentos_data_status',
  'ALTER TABLE agendamentos ADD INDEX idx_agendamentos_data_status (data_hora, status)');
CALL _agenda_exec_if_missing('INDEX', 'agendamentos', 'idx_agendamentos_cliente_data',
  'ALTER TABLE agendamentos ADD INDEX idx_agendamentos_cliente_data (cliente_id, data_hora)');
CALL _agenda_exec_if_missing('INDEX', 'agendamento_procedimentos', 'idx_agendamento_proc_variante',
  'ALTER TABLE agendamento_procedimentos ADD INDEX idx_agendamento_proc_variante (variante_id, procedimento_id)');
CALL _agenda_exec_if_missing('INDEX', 'procedimentos', 'idx_procedimentos_ativo_nome',
  'ALTER TABLE procedimentos ADD INDEX idx_procedimentos_ativo_nome (ativo, nome)');
CALL _agenda_exec_if_missing('INDEX', 'procedimento_variantes', 'idx_variantes_proc_ativo_nome',
  'ALTER TABLE procedimento_variantes ADD INDEX idx_variantes_proc_ativo_nome (procedimento_id, ativo, nome)');
CALL _agenda_exec_if_missing('INDEX', 'procedimento_variantes', 'uq_variantes_id_procedimento',
  'ALTER TABLE procedimento_variantes ADD UNIQUE INDEX uq_variantes_id_procedimento (id, procedimento_id)');
CALL _agenda_exec_if_missing('INDEX', 'bloqueios_horario', 'idx_bloqueios_intervalo',
  'ALTER TABLE bloqueios_horario ADD INDEX idx_bloqueios_intervalo (data_hora_inicio, data_hora_fim)');
CALL _agenda_exec_if_missing('INDEX', 'prontuario', 'idx_prontuario_cliente_data',
  'ALTER TABLE prontuario ADD INDEX idx_prontuario_cliente_data (cliente_id, criado_em)');
CALL _agenda_exec_if_missing('INDEX', 'prontuario', 'uq_prontuario_atendimento_agenda',
  'ALTER TABLE prontuario ADD UNIQUE INDEX uq_prontuario_atendimento_agenda (atendimento_agendamento_id)');
CALL _agenda_exec_if_missing('INDEX', 'promocoes', 'idx_promocoes_ativa_periodo',
  'ALTER TABLE promocoes ADD INDEX idx_promocoes_ativa_periodo (ativa, data_inicio, data_fim)');
CALL _agenda_exec_if_missing('INDEX', 'promocao_usos', 'uq_promocao_usos_agendamento',
  'ALTER TABLE promocao_usos ADD UNIQUE INDEX uq_promocao_usos_agendamento (agendamento_id)');
CALL _agenda_exec_if_missing('INDEX', 'log_atividades', 'idx_logs_criado_em',
  'ALTER TABLE log_atividades ADD INDEX idx_logs_criado_em (criado_em)');
CALL _agenda_exec_if_missing('INDEX', 'log_atividades', 'idx_logs_entidade_data',
  'ALTER TABLE log_atividades ADD INDEX idx_logs_entidade_data (entidade, entidade_id, criado_em)');

-- A variante gravada precisa pertencer ao procedimento informado.
CALL _agenda_exec_if_missing('CONSTRAINT', 'agendamento_procedimentos', 'fk_agendamento_item_variante_procedimento',
  'ALTER TABLE agendamento_procedimentos ADD CONSTRAINT fk_agendamento_item_variante_procedimento FOREIGN KEY (variante_id, procedimento_id) REFERENCES procedimento_variantes (id, procedimento_id)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'promocao_regras', 'fk_promocao_regra_variante_procedimento',
  'ALTER TABLE promocao_regras ADD CONSTRAINT fk_promocao_regra_variante_procedimento FOREIGN KEY (variante_id, procedimento_id) REFERENCES procedimento_variantes (id, procedimento_id)');

-- Dominios e invariantes simples. Em MySQL 5.7 os CHECKs sao aceitos e
-- documentados; MySQL 8 e MariaDB fazem a validacao efetiva.
CALL _agenda_exec_if_missing('CONSTRAINT', 'usuarios', 'ck_usuarios_cargo',
  'ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_cargo CHECK (cargo IN (''operador'', ''gerente'', ''admin''))');
CALL _agenda_exec_if_missing('CONSTRAINT', 'usuarios', 'ck_usuarios_admin',
  'ALTER TABLE usuarios ADD CONSTRAINT ck_usuarios_admin CHECK ((cargo = ''admin'' AND is_admin = 1) OR (cargo <> ''admin'' AND is_admin = 0))');
CALL _agenda_exec_if_missing('CONSTRAINT', 'agendamentos', 'ck_agendamentos_status',
  'ALTER TABLE agendamentos ADD CONSTRAINT ck_agendamentos_status CHECK (status IN (''agendado'', ''atrasado'', ''concluido'', ''cancelado''))');
CALL _agenda_exec_if_missing('CONSTRAINT', 'agendamentos', 'ck_agendamentos_valor',
  'ALTER TABLE agendamentos ADD CONSTRAINT ck_agendamentos_valor CHECK (valor_cobrado IS NULL OR valor_cobrado >= 0)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'agendamentos', 'ck_agendamentos_manual',
  'ALTER TABLE agendamentos ADD CONSTRAINT ck_agendamentos_manual CHECK (valor_manual_gerente IN (0, 1))');
CALL _agenda_exec_if_missing('CONSTRAINT', 'agendamento_procedimentos', 'ck_agendamento_item_valores',
  'ALTER TABLE agendamento_procedimentos ADD CONSTRAINT ck_agendamento_item_valores CHECK (valor >= 0 AND duracao_min > 0)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'procedimentos', 'ck_procedimentos_valores',
  'ALTER TABLE procedimentos ADD CONSTRAINT ck_procedimentos_valores CHECK (valor >= 0 AND duracao_min > 0)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'procedimento_variantes', 'ck_variantes_valores',
  'ALTER TABLE procedimento_variantes ADD CONSTRAINT ck_variantes_valores CHECK (valor >= 0 AND duracao_min > 0)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'bloqueios_horario', 'ck_bloqueios_intervalo',
  'ALTER TABLE bloqueios_horario ADD CONSTRAINT ck_bloqueios_intervalo CHECK (data_hora_fim > data_hora_inicio)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'prontuario', 'ck_prontuario_tipo_agenda',
  'ALTER TABLE prontuario ADD CONSTRAINT ck_prontuario_tipo_agenda CHECK ((tipo = ''atendimento'' AND agendamento_id IS NOT NULL) OR (tipo = ''anotacao'' AND agendamento_id IS NULL))');
CALL _agenda_exec_if_missing('CONSTRAINT', 'prontuario', 'ck_prontuario_fitzpatrick',
  'ALTER TABLE prontuario ADD CONSTRAINT ck_prontuario_fitzpatrick CHECK (fitzpatrick BETWEEN 0 AND 6)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'clientes', 'ck_clientes_fitzpatrick',
  'ALTER TABLE clientes ADD CONSTRAINT ck_clientes_fitzpatrick CHECK (fitzpatrick BETWEEN 0 AND 6)');
CALL _agenda_exec_if_missing('CONSTRAINT', 'promocao_usos', 'ck_promocao_usos_valores',
  'ALTER TABLE promocao_usos ADD CONSTRAINT ck_promocao_usos_valores CHECK (desconto_aplicado >= 0 AND promo_recusada IN (0, 1))');

DROP PROCEDURE IF EXISTS _agenda_exec_if_missing;

-- Regras relacionais que nao podem ser expressas apenas com uma FK simples.
DROP TRIGGER IF EXISTS trg_prontuario_validar_insert;
DROP TRIGGER IF EXISTS trg_prontuario_validar_update;
DROP TRIGGER IF EXISTS trg_agendamento_preservar_atendimento_update;
DROP TRIGGER IF EXISTS trg_agendamento_preservar_atendimento_delete;
DELIMITER //
CREATE TRIGGER trg_prontuario_validar_insert
BEFORE INSERT ON prontuario
FOR EACH ROW
BEGIN
  IF NEW.agendamento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM agendamentos a
     WHERE a.id = NEW.agendamento_id
       AND a.cliente_id = NEW.cliente_id
       AND (NEW.tipo <> 'atendimento' OR a.status = 'concluido')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Prontuario incompativel com cliente ou status do agendamento';
  END IF;
END//

CREATE TRIGGER trg_prontuario_validar_update
BEFORE UPDATE ON prontuario
FOR EACH ROW
BEGIN
  IF NEW.agendamento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM agendamentos a
     WHERE a.id = NEW.agendamento_id
       AND a.cliente_id = NEW.cliente_id
       AND (NEW.tipo <> 'atendimento' OR a.status = 'concluido')
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Prontuario incompativel com cliente ou status do agendamento';
  END IF;
END//

CREATE TRIGGER trg_agendamento_preservar_atendimento_update
BEFORE UPDATE ON agendamentos
FOR EACH ROW
BEGIN
  IF NEW.status <> 'concluido' AND EXISTS (
    SELECT 1 FROM prontuario p
     WHERE p.agendamento_id = OLD.id AND p.tipo = 'atendimento'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Agendamento com atendimento registrado deve permanecer concluido';
  END IF;
END//

CREATE TRIGGER trg_agendamento_preservar_atendimento_delete
BEFORE DELETE ON agendamentos
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM prontuario p
     WHERE p.agendamento_id = OLD.id AND p.tipo = 'atendimento'
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Agendamento com atendimento registrado nao pode ser excluido';
  END IF;
END//
DELIMITER ;

INSERT INTO schema_migrations (versao, descricao)
VALUES ('20260714_01', 'Indices, constraints, auditoria temporal e integridade do prontuario')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao);
