import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { generateToken, authenticateRequest } from "../auth.js";
import { LoginSchema, User } from "../../shared/types.js";

interface DbUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  team: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const parseResult = LoginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Dados de login inválidos.",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;

    const row = db
      .prepare("SELECT id, name, email, password_hash, role, team FROM users WHERE email = ?")
      .get(email.toLowerCase().trim()) as DbUserRow | undefined;

    if (!row) {
      return reply.status(401).send({ error: "Credenciais inválidas." });
    }

    const passwordMatch = bcrypt.compareSync(password, row.password_hash);
    if (!passwordMatch) {
      return reply.status(401).send({ error: "Credenciais inválidas." });
    }

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as User["role"],
      team: row.team,
    };

    const token = generateToken(user);

    return reply.status(200).send({
      token,
      user,
    });
  });

  app.get("/api/auth/me", { preHandler: authenticateRequest }, async (request, reply) => {
    return reply.status(200).send({ user: request.user });
  });
}
