import { FastifyInstance } from "fastify";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { db } from "../db.js";
import { authenticateRequest } from "../auth.js";
import { Attachment } from "../../shared/types.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = [".log", ".txt", ".pdf", ".png", ".jpg", ".jpeg"];
const FORBIDDEN_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".dll", ".bin"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function attachmentsRoutes(app: FastifyInstance) {
  // Upload de anexo em um ticket
  app.post(
    "/api/tickets/:id/attachments",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id: ticketId } = request.params as { id: string };
      const user = request.user!;

      const ticket = db.prepare("SELECT id FROM tickets WHERE id = ?").get(ticketId);
      if (!ticket) {
        return reply.status(404).send({ error: "Incidente não encontrado." });
      }

      const data = await request.file({
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
      });

      if (!data) {
        return reply.status(400).send({ error: "Nenhum arquivo enviado na requisição." });
      }

      const originalFilename = data.filename;
      const ext = path.extname(originalFilename).toLowerCase();

      // Validação de extensão proibida
      if (FORBIDDEN_EXTENSIONS.includes(ext) || !ALLOWED_EXTENSIONS.includes(ext)) {
        return reply.status(400).send({
          error: `Formato de arquivo '${ext}' não é permitido. Extensões válidas: ${ALLOWED_EXTENSIONS.join(", ")}`,
        });
      }

      const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const storedName = `${attachmentId}_${path.basename(originalFilename)}`;
      const destinationPath = path.join(UPLOADS_DIR, storedName);

      try {
        await pipeline(data.file, fs.createWriteStream(destinationPath));

        // Checagem de tamanho real após o stream
        const stats = fs.statSync(destinationPath);
        if (stats.size > MAX_FILE_SIZE_BYTES) {
          fs.unlinkSync(destinationPath);
          return reply.status(413).send({
            error: "O arquivo excede o limite máximo permitido de 10 MB.",
          });
        }

        const now = new Date().toISOString();

        db.prepare(
          `
          INSERT INTO attachments (
            id, ticket_id, filename, stored_name, mimetype, size_bytes, uploaded_by, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          attachmentId,
          ticketId,
          originalFilename,
          storedName,
          data.mimetype || "application/octet-stream",
          stats.size,
          user.id,
          now
        );

        db.prepare(
          `
          INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
          VALUES (?, ?, ?, 'ATTACHMENT_UPLOADED', ?, ?)
        `
        ).run(
          `audit_${Date.now()}`,
          ticketId,
          user.id,
          `Arquivo anexado: ${originalFilename} (${(stats.size / 1024).toFixed(1)} KB)`,
          now
        );

        return reply.status(201).send({
          message: "Arquivo anexado com sucesso.",
          attachment: {
            id: attachmentId,
            ticketId,
            filename: originalFilename,
            sizeBytes: stats.size,
            uploadedAt: now,
          },
        });
      } catch (err: any) {
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
        return reply.status(500).send({
          error: "Falha ao gravar arquivo em disco.",
          message: err.message,
        });
      }
    }
  );

  // Download de anexo
  app.get(
    "/api/attachments/:id/download",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const att = db
        .prepare("SELECT * FROM attachments WHERE id = ?")
        .get(id) as any;

      if (!att) {
        return reply.status(404).send({ error: "Anexo não encontrado." });
      }

      const filePath = path.join(UPLOADS_DIR, att.stored_name);
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "Arquivo físico não encontrado no servidor." });
      }

      const stream = fs.createReadStream(filePath);
      reply.header("Content-Disposition", `attachment; filename="${att.filename}"`);
      reply.header("Content-Type", att.mimetype);
      return reply.send(stream);
    }
  );

  // Exclusão de anexo
  app.delete(
    "/api/attachments/:id",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Reporter não pode deletar anexos
      if (user.role === "REPORTER") {
        return reply.status(403).send({
          error: "Você não tem permissão para remover anexos.",
        });
      }

      const att = db
        .prepare("SELECT * FROM attachments WHERE id = ?")
        .get(id) as any;

      if (!att) {
        return reply.status(404).send({ error: "Anexo não encontrado." });
      }

      const filePath = path.join(UPLOADS_DIR, att.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.prepare("DELETE FROM attachments WHERE id = ?").run(id);

      db.prepare(
        `
        INSERT INTO audit_logs (id, ticket_id, actor_id, action, details, created_at)
        VALUES (?, ?, ?, 'ATTACHMENT_DELETED', ?, ?)
      `
      ).run(
        `audit_${Date.now()}`,
        att.ticket_id,
        user.id,
        `Arquivo removido: ${att.filename}`,
        new Date().toISOString()
      );

      return reply.status(200).send({
        message: "Anexo removido com sucesso.",
      });
    }
  );
}
