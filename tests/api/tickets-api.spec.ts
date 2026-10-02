import { test, expect } from "@playwright/test";
import { z } from "zod";

// Schemas Zod para teste de contrato de API
const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(["ADMIN", "ANALYST", "REPORTER"]),
    team: z.string(),
  }),
});

const TicketItemSchema = z.object({
  id: z.string(),
  ticketNumber: z.string().regex(/^#INC-\d+$/),
  title: z.string(),
  service: z.string(),
  severity: z.enum(["P1", "P2", "P3", "P4"]),
  status: z.enum(["OPEN", "TRIAGED", "INVESTIGATING", "MITIGATED", "RESOLVED", "CLOSED"]),
  createdById: z.string(),
  creatorName: z.string(),
  createdAt: z.string(),
});

test.describe("Testes de Contrato e Segurança da API REST", () => {
  let adminToken: string;
  let reporterToken: string;

  test.beforeAll(async ({ request }) => {
    // Reseta banco para estado inicial limpo
    await request.post("/api/test/reset");

    // Login como Admin
    const adminRes = await request.post("/api/auth/login", {
      data: { email: "admin@opsdesk.local", password: "Admin123!" },
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // Login como Reporter
    const repRes = await request.post("/api/auth/login", {
      data: { email: "reporter@opsdesk.local", password: "Reporter123!" },
    });
    const repData = await repRes.json();
    reporterToken = repData.token;
  });

  test("POST /api/auth/login - deve validar contrato da resposta de autenticação", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "admin@opsdesk.local", password: "Admin123!" },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const validation = AuthResponseSchema.safeParse(body);
    expect(validation.success).toBe(true);
  });

  test("GET /api/tickets - deve exigir autenticação (401 se ausente)", async ({
    request,
  }) => {
    const res = await request.get("/api/tickets");
    expect(res.status()).toBe(401);
  });

  test("GET /api/tickets - deve retornar lista e cumprir contrato de schema", async ({
    request,
  }) => {
    const res = await request.get("/api/tickets", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.tickets)).toBe(true);
    expect(body.tickets.length).toBeGreaterThan(0);

    const firstTicket = body.tickets[0];
    const validation = TicketItemSchema.safeParse(firstTicket);
    expect(validation.success).toBe(true);
  });

  test("POST /api/tickets - deve rejeitar payloads sem campos obrigatórios com 422", async ({
    request,
  }) => {
    const res = await request.post("/api/tickets", {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        title: "T", // Menor que 5 caracteres
        // service faltando
        severity: "P1",
      },
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.details).toHaveProperty("title");
    expect(body.details).toHaveProperty("service");
  });

  test("PATCH /api/tickets/:id/status - deve bloquear alteração de status por Reporter com 403", async ({
    request,
  }) => {
    const res = await request.patch("/api/tickets/t_1001/status", {
      headers: { Authorization: `Bearer ${reporterToken}` },
      data: { status: "RESOLVED", resolutionNote: "Tentativa de fechar" },
    });

    expect(res.status()).toBe(403);
  });

  test("DELETE /api/tickets/:id - deve bloquear exclusão por não-administradores com 403", async ({
    request,
  }) => {
    const res = await request.delete("/api/tickets/t_1001", {
      headers: { Authorization: `Bearer ${reporterToken}` },
    });

    expect(res.status()).toBe(403);
  });

  test("GET /api/tickets - deve sanitizar caracteres especiais e evitar SQL Injection", async ({
    request,
  }) => {
    // Parâmetro malicioso comum em testes de injeção
    const maliciousTerm = "' OR '1'='1' --";
    const res = await request.get(`/api/tickets?search=${encodeURIComponent(maliciousTerm)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // A busca sanitizada não deve retornar todos os registros do banco, mas sim 0 registros
    expect(body.tickets.length).toBe(0);
  });
});
