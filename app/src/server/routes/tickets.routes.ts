import { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { authenticateRequest, requireRole } from "../auth.js";
import {
  CreateTicketSchema,
  UpdateStatusSchema,
  AddNoteSchema,
  Ticket,
  TicketNote,
  AuditLog,
  Attachment,
} from "../../shared/types.js";

export async function ticketsRoutes(app: FastifyInstance) {
  // Listagem de incidentes com filtros
  app.get(
    "/api/tickets",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { status, severity, service, search } = request.query as {
        status?: string;
        severity?: string;
        service?: string;
        search?: string;
      };

      let query = `
        SELECT 
          t.id, t.ticket_number as ticketNumber, t.title, t.service, t.severity,
          t.status, t.description, t.created_by_id as createdById,
          u1.name as creatorName, t.assigned_to_id as assignedToId,
          u2.name as assigneeName, t.created_at as createdAt,
          t.updated_at as updatedAt, t.resolved_at as resolvedAt,
          t.closed_at as closedAt,
          (SELECT COUNT(*) FROM ticket_notes n WHERE n.ticket_id = t.id) as notesCount,
          (SELECT COUNT(*) FROM attachments a WHERE a.ticket_id = t.id) as attachmentsCount
        FROM tickets t
        LEFT JOIN users u1 ON t.created_by_id = u1.id
        LEFT JOIN users u2 ON t.assigned_to_id = u2.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status && status !== "ALL") {
        query += " AND t.status = ?";
        params.push(status);
      }

      if (severity && severity !== "ALL") {
        query += " AND t.severity = ?";
        params.push(severity);
      }

      if (service && service !== "ALL") {
        query += " AND t.service = ?";
        params.push(service);
      }

      if (search && search.trim() !== "") {
        query += " AND (t.title LIKE ? OR t.description LIKE ? OR t.ticket_number LIKE ?)";
        const term = `%${search.trim()}%`;
        params.push(term, term, term);
      }

      query += " ORDER BY t.created_at DESC";

      const tickets = db.prepare(query).all(...params) as unknown as Ticket[];
      return reply.status(200).send({ tickets });
    }
  );

  // Detalhes de um incidente
  app.get(
    "/api/tickets/:id",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const ticket = db
        .prepare(
          `
        SELECT 
          t.id, t.ticket_number as ticketNumber, t.title, t.service, t.severity,
          t.status, t.description, t.created_by_id as createdById,
          u1.name as creatorName, t.assigned_to_id as assignedToId,
          u2.name as assigneeName, t.created_at as createdAt,
          t.updated_at as updatedAt, t.resolved_at as resolvedAt,
          t.closed_at as closedAt
        FROM tickets t
        LEFT JOIN users u1 ON t.created_by_id = u1.id
        LEFT JOIN users u2 ON t.assigned_to_id = u2.id
        WHERE t.id = ? OR t.ticket_number = ?
      `
        )
        .get(id, id) as Ticket | undefined;

      if (!ticket) {
        return reply.status(404).send({ error: "Incidente não encontrado." });
      }

      // Notas: Se o perfil for REPORTER, notas internas são ocultadas
      let notesQuery = `
        SELECT 
          n.id, n.ticket_id as ticketId, n.author_id as authorId,
          u.name as authorName, u.role as authorRole,
          n.content, n.is_internal as isInternal, n.created_at as createdAt
        FROM ticket_notes n
        JOIN users u ON n.author_id = u.id
        WHERE n.ticket_id = ?
      `;
      const notesParams: any[] = [ticket.id];

      if (user.role === "REPORTER") {
        notesQuery += " AND n.is_internal = 0";
      }

      notesQuery += " ORDER BY n.created_at ASC";
      const notes = db.prepare(notesQuery).all(...notesParams) as unknown as TicketNote[];

      // Anexos
      const attachments = db
        .prepare(
          `
        SELECT 
          id, ticket_id as ticketId, filename, stored_name as storedName,
          mimetype, size_bytes as sizeBytes, uploaded_by as uploadedBy,
          uploaded_at as uploadedAt
        FROM attachments
        WHERE ticket_id = ?
        ORDER BY uploaded_at DESC
      `
        )
        .all(ticket.id) as unknown as Attachment[];

      // Histórico de auditoria
      const auditLogs = db
        .prepare(
          `
        SELECT 
          a.id, a.ticket_id as ticketId, a.actor_id as actorId,
          u.name as actorName, a.action, a.details, a.created_at as createdAt
        FROM audit_logs a
        JOIN users u ON a.actor_id = u.id
        WHERE a.ticket_id = ?
        ORDER BY a.created_at DESC
      `
        )
        .all(ticket.id) as unknown as AuditLog[];

      return reply.status(200).send({
        ticket,
        notes,
        attachments,
        auditLogs,
      });
    }
  );

  // Criação de novo chamado
  app.post(
    "/api/tickets",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const parseResult = CreateTicketSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(422).send({
          error: "Dados do chamado inválidos.",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { title, service, severity, description, assignedToId } =
        parseResult.data;
      const user = request.user!;

      // Gerador sequencial de número do ticket (#INC-XXXX)
      const countRow = db
        .prepare("SELECT COUNT(*) as total FROM tickets")
        .get() as { total: number };
      const nextNum = 1001 + countRow.total;
      const ticketNumber = `#INC-${nextNum}`;
      const ticketId = `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO tickets (
          id, ticket_number, title, service, severity, status, description,
          created_by_id, assigned_to_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)
      `
      ).run(
        ticketId,
        ticketNumber,
        title,
        service,
        severity,
        description,
        user.id,
        assignedToId || null,
        now,
        now
      );

      // Registro de auditoria inicial
      db.prepare(
        `
        INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
        VALUES (?, ?, ?, 'TICKET_CREATED', ?, ?)
      `
      ).run(
        `audit_${Date.now()}`,
        ticketId,
        user.id,
        `Incidente aberto com severidade ${severity} para o serviço ${service}`,
        now
      );

      return reply.status(201).send({
        message: "Incidente aberto com sucesso.",
        ticket: {
          id: ticketId,
          ticketNumber,
          title,
          service,
          severity,
          status: "OPEN",
        },
      });
    }
  );

  // Alteração de status (máquina de estados)
  app.patch(
    "/api/tickets/:id/status",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Regra de negócio: Reporter não altera status de incidentes
      if (user.role === "REPORTER") {
        return reply.status(403).send({
          error: "Apenas analistas e administradores podem alterar o status do incidente.",
        });
      }

      const parseResult = UpdateStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Status fornecido é inválido.",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { status: targetStatus, resolutionNote } = parseResult.data;

      const ticket = db
        .prepare("SELECT * FROM tickets WHERE id = ?")
        .get(id) as any;

      if (!ticket) {
        return reply.status(404).send({ error: "Incidente não encontrado." });
      }

      // Regra de validação: Bloqueia transição direta de OPEN para CLOSED
      if (ticket.status === "OPEN" && targetStatus === "CLOSED") {
        return reply.status(422).send({
          error:
            "Transição inválida: um incidente aberto deve ser investigado e resolvido antes de ser fechado.",
        });
      }

      // Regra de validação: Mudança para RESOLVED exige nota de resolução
      if (targetStatus === "RESOLVED") {
        if (!resolutionNote || resolutionNote.trim().length < 5) {
          return reply.status(422).send({
            error:
              "A resolução do chamado exige uma nota explicativa com no mínimo 5 caracteres.",
          });
        }
      }

      const now = new Date().toISOString();
      let resolvedAt = ticket.resolved_at;
      let closedAt = ticket.closed_at;

      if (targetStatus === "RESOLVED" && !resolvedAt) {
        resolvedAt = now;
      }
      if (targetStatus === "CLOSED" && !closedAt) {
        closedAt = now;
      }

      db.prepare(
        `
        UPDATE tickets 
        SET status = ?, updated_at = ?, resolved_at = ?, closed_at = ?
        WHERE id = ?
      `
      ).run(targetStatus, now, resolvedAt, closedAt, id);

      // Se houver nota de resolução, registra como nota técnica
      if (resolutionNote && resolutionNote.trim().length > 0) {
        db.prepare(
          `
          INSERT INTO ticket_notes (id, ticket_id, author_id, content, is_internal, created_at)
          VALUES (?, ?, ?, ?, 0, ?)
        `
        ).run(
          `note_${Date.now()}`,
          id,
          user.id,
          `Resolução: ${resolutionNote.trim()}`,
          now
        );
      }

      // Registro no histórico de auditoria
      db.prepare(
        `
        INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
        VALUES (?, ?, ?, 'STATUS_CHANGED', ?, ?)
      `
      ).run(
        `audit_${Date.now()}`,
        id,
        user.id,
        `Status alterado de ${ticket.status} para ${targetStatus}`,
        now
      );

      return reply.status(200).send({
        message: "Status atualizado com sucesso.",
        ticketId: id,
        previousStatus: ticket.status,
        currentStatus: targetStatus,
      });
    }
  );

  // Inclusão de notas no chamado
  app.post(
    "/api/tickets/:id/notes",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const ticket = db
        .prepare("SELECT id FROM tickets WHERE id = ?")
        .get(id);
      if (!ticket) {
        return reply.status(404).send({ error: "Incidente não encontrado." });
      }

      const parseResult = AddNoteSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Conteúdo da nota inválido.",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { content, isInternal } = parseResult.data;
      // Regra de negócio: Reporter só pode adicionar notas públicas
      const actualIsInternal = user.role === "REPORTER" ? false : isInternal;

      const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO ticket_notes (id, ticket_id, author_id, content, is_internal, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(noteId, id, user.id, content, actualIsInternal ? 1 : 0, now);

      db.prepare(
        `
        INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
        VALUES (?, ?, ?, 'NOTE_ADDED', ?, ?)
      `
      ).run(
        `audit_${Date.now()}`,
        id,
        user.id,
        `Nota ${actualIsInternal ? "interna" : "pública"} adicionada`,
        now
      );

      return reply.status(201).send({
        message: "Nota registrada com sucesso.",
        note: {
          id: noteId,
          ticketId: id,
          authorId: user.id,
          authorName: user.name,
          content,
          isInternal: actualIsInternal,
          createdAt: now,
        },
      });
    }
  );

  // Exclusão de chamado (apenas Admin)
  app.delete(
    "/api/tickets/:id",
    { preHandler: [authenticateRequest, requireRole(["ADMIN"])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const ticket = db
        .prepare("SELECT id, ticket_number FROM tickets WHERE id = ?")
        .get(id) as any;
      if (!ticket) {
        return reply.status(404).send({ error: "Incidente não encontrado." });
      }

      db.prepare("DELETE FROM tickets WHERE id = ?").run(id);

      return reply.status(200).send({
        message: `Incidente ${ticket.ticket_number} removido com sucesso.`,
      });
    }
  );
}
