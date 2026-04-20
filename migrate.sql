-- migrate.sql
-- Execute este arquivo no phpMyAdmin (ou via CLI: mysql -u user -p banco < migrate.sql)
-- para criar todas as tabelas necessárias.

SET NAMES utf8mb4;

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
  valor         DECIMAL(10,2) DEFAULT 0,
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
  valor           DECIMAL(10,2) DEFAULT 0,
  ativo           TINYINT      DEFAULT 1,
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agendamentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id      INT          NOT NULL,
  procedimento_id INT,
  variante_id     INT,
  data_hora       DATETIME     NOT NULL,
  status          VARCHAR(20)  DEFAULT 'agendado',
  valor_cobrado   DECIMAL(10,2),
  observacoes     TEXT,
  criado_em       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS agendamento_procedimentos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  agendamento_id  INT          NOT NULL,
  procedimento_id INT          NOT NULL,
  variante_id     INT,
  valor           DECIMAL(10,2) DEFAULT 0,
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
