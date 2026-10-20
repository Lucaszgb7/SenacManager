-- RESTRICT preserva o histórico: registros vinculados devem ser desativados.
-- campos e ordem preservam campos opcionais e a ordem dos arrays do modo JSON.
CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY, nome VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL, perfil ENUM('professor','aluno','administrador') NOT NULL,
  ativo BOOL NULL DEFAULT TRUE, criado_em DATETIME(3) NULL, disciplinas JSON NULL,
  titulacao VARCHAR(255) NULL, curso VARCHAR(255) NULL, turma VARCHAR(255) NULL,
  matricula VARCHAR(100) NULL, nivel_acesso VARCHAR(100) NULL, departamento VARCHAR(255) NULL,
  telefone VARCHAR(100) NULL, foto_url VARCHAR(1024) NULL, campos JSON NULL, ordem INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS salas (
  id CHAR(36) PRIMARY KEY, nome VARCHAR(255) NOT NULL, predio VARCHAR(255) NOT NULL,
  andar VARCHAR(100) NULL, capacidade INT UNSIGNED NOT NULL, recursos JSON NULL,
  ativa BOOL NULL DEFAULT TRUE, criado_em DATETIME(3) NULL, campos JSON NULL, ordem INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reservas (
  id CHAR(36) PRIMARY KEY, professor_id CHAR(36) NOT NULL, sala_id CHAR(36) NOT NULL,
  data DATE NOT NULL, horario_inicio TIME NOT NULL, horario_fim TIME NOT NULL,
  status ENUM('confirmada','cancelada') NOT NULL, turma VARCHAR(255) NOT NULL,
  disciplina VARCHAR(255) NOT NULL, observacoes TEXT NULL, criado_em DATETIME(3) NULL,
  campos JSON NULL, ordem INT NOT NULL DEFAULT 0,
  INDEX idx_reserva_sala_data (sala_id, data), INDEX idx_reserva_professor (professor_id),
  FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS aulas_grade (
  id CHAR(36) PRIMARY KEY, professor_id CHAR(36) NOT NULL, sala_id CHAR(36) NOT NULL,
  disciplina VARCHAR(255) NOT NULL, dia_semana ENUM('segunda','terca','quarta','quinta','sexta','sabado') NOT NULL,
  horario_inicio TIME NOT NULL, horario_fim TIME NOT NULL, turma VARCHAR(255) NOT NULL,
  semestre VARCHAR(6) NULL, is_noa BOOL NULL DEFAULT FALSE, vagas_total INT NULL,
  ativa BOOL NULL DEFAULT TRUE, criado_em DATETIME(3) NULL, descricao TEXT NULL,
  campos JSON NULL, ordem INT NOT NULL DEFAULT 0,
  FOREIGN KEY (professor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS inscricoes_noa (
  id CHAR(36) PRIMARY KEY, aluno_id CHAR(36) NOT NULL, aula_id CHAR(36) NOT NULL,
  criado_em DATETIME(3) NULL, campos JSON NULL, ordem INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_inscricao_aluno_aula (aluno_id, aula_id),
  FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (aula_id) REFERENCES aulas_grade(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
