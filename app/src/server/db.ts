import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

// Determina se roda em memória (testes) ou arquivo local de persistência
const DB_PATH = process.env.TEST_DB === "memory"
  ? ":memory:"
  : path.resolve(process.cwd(), "dev.db");

export let db: DatabaseSync;

export function initDb(dbPath = DB_PATH): DatabaseSync {
  db = new DatabaseSync(dbPath);

  // Ativa verificação de integridade referencial
  db.exec("PRAGMA foreign_keys = ON;");

  createTables();
  seedInitialData();

  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      service TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      created_by_id TEXT NOT NULL,
      assigned_to_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE RESTRICT,
      FOREIGN KEY (assigned_to_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_notes (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_severity ON tickets(severity);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by_id);
    CREATE INDEX IF NOT EXISTS idx_notes_ticket_id ON ticket_notes(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_audit_ticket_id ON audit_logs(ticket_id);
  `);
}

export function seedInitialData() {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) return; // Ja populado

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync("Admin123!", salt);
  const analystPass = bcrypt.hashSync("Analyst123!", salt);
  const reporterPass = bcrypt.hashSync("Reporter123!", salt);

  const now = new Date().toISOString();

  // Inserção dos usuários de teste
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, team, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run("user_admin_1", "Carlos Rocha", "admin@opsdesk.local", adminPass, "ADMIN", "Infraestrutura", now);
  insertUser.run("user_analyst_1", "Mariana Souza", "analyst@opsdesk.local", analystPass, "ANALYST", "Suporte N2", now);
  insertUser.run("user_reporter_1", "Lucas Lima", "reporter@opsdesk.local", reporterPass, "REPORTER", "Faturamento", now);

  // Inserção de chamados de demonstração
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      id, ticket_number, title, service, severity, status, description,
      created_by_id, assigned_to_id, created_at, updated_at, resolved_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTicket.run(
    "t_1001",
    "#INC-1001",
    "Queda no Gateway de Pagamento Pix",
    "Pagamentos",
    "P1",
    "INVESTIGATING",
    "Transações Pix retornando timeout HTTP 504 no parceiro bancário.",
    "user_reporter_1",
    "user_analyst_1",
    new Date(Date.now() - 3600000 * 2).toISOString(),
    new Date(Date.now() - 1800000).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1002",
    "#INC-1002",
    "Lentidão na fila de mensageria RabbitMQ",
    "Mensageria",
    "P2",
    "OPEN",
    "Consumo de mensagens acumulando na fila de notificações de cobrança.",
    "user_reporter_1",
    null,
    new Date(Date.now() - 3600000 * 5).toISOString(),
    new Date(Date.now() - 3600000 * 5).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1003",
    "#INC-1003",
    "Erro 404 intermitente no download de faturas PDF",
    "Faturamento",
    "P3",
    "RESOLVED",
    "Link de download de faturas apontando para bucket antigo.",
    "user_reporter_1",
    "user_analyst_1",
    new Date(Date.now() - 86400000).toISOString(),
    new Date(Date.now() - 43200000).toISOString(),
    new Date(Date.now() - 43200000).toISOString(),
    null
  );

  insertTicket.run(
    "t_1004",
    "#INC-1004",
    "Certificado SSL expirando em staging",
    "DevOps",
    "P4",
    "CLOSED",
    "Certificado de staging expira em menos de 15 dias.",
    "user_admin_1",
    "user_admin_1",
    new Date(Date.now() - 86400000 * 3).toISOString(),
    new Date(Date.now() - 86400000 * 2).toISOString(),
    new Date(Date.now() - 86400000 * 2).toISOString(),
    new Date(Date.now() - 86400000 * 2).toISOString()
  );

  insertTicket.run(
    "t_1005",
    "#INC-1005",
    "Alto consumo de conexões na réplica de leitura do PostgreSQL",
    "Banco de Dados",
    "P1",
    "MITIGATED",
    "Pool de conexões do PgBouncer atingiu 98% da capacidade após pico de relatórios.",
    "user_reporter_1",
    "user_admin_1",
    new Date(Date.now() - 3600000 * 4).toISOString(),
    new Date(Date.now() - 3600000 * 1).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1006",
    "#INC-1006",
    "Falha na sincronização de webhooks de cobrança",
    "Financeiro",
    "P2",
    "OPEN",
    "Eventos de confirmação de pagamento com atraso superior a 15 minutos.",
    "user_reporter_1",
    null,
    new Date(Date.now() - 3600000 * 6).toISOString(),
    new Date(Date.now() - 3600000 * 6).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1007",
    "#INC-1007",
    "Atraso na entrega de e-mails transacionais",
    "Notificações",
    "P3",
    "INVESTIGATING",
    "Fila de envio de e-mails de redefinição de senha com retenção anômala.",
    "user_reporter_1",
    "user_analyst_1",
    new Date(Date.now() - 3600000 * 8).toISOString(),
    new Date(Date.now() - 3600000 * 2).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1008",
    "#INC-1008",
    "Esgotamento de memória no cluster Redis de sessões",
    "Infraestrutura",
    "P2",
    "TRIAGED",
    "Alerta de maxmemory atingido em nó primário do Redis com evicção volátil.",
    "user_admin_1",
    "user_admin_1",
    new Date(Date.now() - 3600000 * 12).toISOString(),
    new Date(Date.now() - 3600000 * 10).toISOString(),
    null,
    null
  );

  insertTicket.run(
    "t_1009",
    "#INC-1009",
    "Ajuste de regras de WAF no Cloudflare para ambiente de produção",
    "Segurança",
    "P4",
    "CLOSED",
    "Regras de rate limit aplicadas nos endpoints de login e checkout.",
    "user_admin_1",
    "user_admin_1",
    new Date(Date.now() - 86400000 * 5).toISOString(),
    new Date(Date.now() - 86400000 * 4).toISOString(),
    new Date(Date.now() - 86400000 * 4).toISOString(),
    new Date(Date.now() - 86400000 * 4).toISOString()
  );

  insertTicket.run(
    "t_1010",
    "#INC-1010",
    "Inconsistência no cálculo de alíquotas em relatórios contábeis",
    "Fiscal",
    "P3",
    "RESOLVED",
    "Divergência de arredondamento de centavos em exportações CSV de fechamento.",
    "user_reporter_1",
    "user_analyst_1",
    new Date(Date.now() - 86400000 * 2).toISOString(),
    new Date(Date.now() - 3600000 * 14).toISOString(),
    new Date(Date.now() - 3600000 * 14).toISOString(),
    null
  );

  // Inserção de notas e histórico
  const insertNote = db.prepare(`
    INSERT INTO ticket_notes (id, ticket_id, author_id, content, is_internal, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNote.run(
    "note_1",
    "t_1001",
    "user_analyst_1",
    "Acionado time de conectividade do parceiro bancário. Protocolo #BR-88219 aberto.",
    1,
    new Date(Date.now() - 1800000).toISOString()
  );

  insertNote.run(
    "note_2",
    "t_1005",
    "user_admin_1",
    "Limite de conexões temporariamente aumentado no PgBouncer de 150 para 300.",
    1,
    new Date(Date.now() - 3600000 * 2).toISOString()
  );

  insertNote.run(
    "note_3",
    "t_1010",
    "user_analyst_1",
    "Resolução: Função de cálculo alterada para usar precisão de 4 casas decimais antes do truncamento.",
    0,
    new Date(Date.now() - 3600000 * 14).toISOString()
  );

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    "audit_1",
    "t_1001",
    "user_reporter_1",
    "TICKET_CREATED",
    "Incidente aberto com severidade P1 para o serviço Pagamentos",
    new Date(Date.now() - 3600000 * 2).toISOString()
  );

  insertAudit.run(
    "audit_2",
    "t_1001",
    "user_analyst_1",
    "STATUS_CHANGED",
    "Status alterado de OPEN para INVESTIGATING",
    new Date(Date.now() - 1800000).toISOString()
  );

  insertAudit.run(
    "audit_3",
    "t_1005",
    "user_admin_1",
    "STATUS_CHANGED",
    "Status alterado de OPEN para MITIGATED",
    new Date(Date.now() - 3600000 * 1).toISOString()
  );
}

// Limpa e repopula o banco para execução de testes determinísticos
export function resetDb() {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM attachments;
    DELETE FROM ticket_notes;
    DELETE FROM tickets;
    DELETE FROM users;
  `);
  seedInitialData();
}
