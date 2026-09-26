import jwt from "jsonwebtoken";
import { FastifyRequest, FastifyReply } from "fastify";
import { User, Role } from "../shared/types.js";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "opsdesk-insecure-test-secret-key-12345";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Extende a tipagem do FastifyRequest para armazenar o usuario autenticado
declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<User | void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Cabeçalho de autorização ausente ou malformado." });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    reply.status(401).send({ error: "Token inválido ou expirado." });
    return;
  }

  const row = db.prepare("SELECT id, name, email, role, team FROM users WHERE id = ?").get(payload.userId) as User | undefined;

  if (!row) {
    reply.status(401).send({ error: "Usuário não encontrado." });
    return;
  }

  request.user = row;
  return row;
}

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({ error: "Não autenticado." });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({
        error: "Acesso proibido: seu perfil não possui permissão para esta ação.",
      });
      return;
    }
  };
}
