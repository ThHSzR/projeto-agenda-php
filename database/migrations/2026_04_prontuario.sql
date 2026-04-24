-- =============================================================================
-- MIGRAÇÃO: Módulo Prontuário / Timeline de Clientes
-- Aplicar em ambiente dev (branch: dev)
-- Data: 2026-04-24
-- =============================================================================

CREATE TABLE IF NOT EXISTS prontuario (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id     INT UNSIGNED NOT NULL,
    agendamento_id INT UNSIGNED DEFAULT NULL,
    tipo           ENUM('atendimento', 'anotacao') NOT NULL DEFAULT 'anotacao',
    fitzpatrick    TINYINT UNSIGNED NOT NULL DEFAULT 0
                   COMMENT '0 = nao registrado; 1-6 = tipo Fitzpatrick',
    anotacao       TEXT DEFAULT NULL,
    criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pront_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pront_agend
        FOREIGN KEY (agendamento_id)
        REFERENCES agendamentos(id)
        ON DELETE SET NULL,

    -- impede duplicar a entrada de atendimento para o mesmo agendamento
    UNIQUE KEY uq_pront_atendimento (agendamento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Prontuario / timeline de atendimentos e anotacoes por cliente';

-- Indices auxiliares
CREATE INDEX IF NOT EXISTS idx_pront_cliente ON prontuario (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pront_criado  ON prontuario (criado_em);

-- =============================================================================
-- NOTA:
-- O campo fitzpatrick permanece em clientes para compatibilidade retroativa.
-- Novos registros de Fitzpatrick devem usar prontuario.fitzpatrick.
-- A aba "Fisico/Pele" da ficha foi fundida com "Saude".
-- =============================================================================
