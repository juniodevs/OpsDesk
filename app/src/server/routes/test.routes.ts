import { FastifyInstance } from "fastify";
import { resetDb } from "../db.js";

export async function testRoutes(app: FastifyInstance) {
  // Reset do banco para estado limpo inicial
  app.post("/api/test/reset", async (request, reply) => {
    resetDb();
    return reply.status(200).send({ message: "Banco de dados resetado com sucesso." });
  });

  // Healthcheck simples
  app.get("/api/health", async (request, reply) => {
    return reply.status(200).send({ status: "ok", timestamp: new Date().toISOString() });
  });
}
