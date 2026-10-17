import fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { initDb } from "./db.js";
import { authRoutes } from "./routes/auth.routes.js";
import { ticketsRoutes } from "./routes/tickets.routes.js";
import { attachmentsRoutes } from "./routes/attachments.routes.js";
import { testRoutes } from "./routes/test.routes.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

export async function createServer() {
  const app = fastify({
    logger: false, // Menos poluição nos logs de teste
  });

  // Inicializa o banco de dados
  initDb();

  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
    },
  });

  // Rotas de API
  await app.register(authRoutes);
  await app.register(ticketsRoutes);
  await app.register(attachmentsRoutes);
  await app.register(testRoutes);

  // Servir arquivos estáticos do frontend
  const clientDir = path.resolve(process.cwd(), "app", "src", "client");
  if (fs.existsSync(clientDir)) {
    await app.register(fastifyStatic, {
      root: clientDir,
      prefix: "/",
    });

    // Fallback SPA para navegação direta de rotas
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "Endpoint não encontrado." });
      }
      return reply.sendFile("index.html", clientDir);
    });
  }

  return app;
}

const app = await createServer();
app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
  console.log(`[OpsDesk AUT] Servidor operacional rodando em: http://${HOST}:${PORT}`);
});

