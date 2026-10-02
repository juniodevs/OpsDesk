import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<200"], // 95% das requisições devem responder em menos de 200ms
    http_req_failed: ["rate<0.01"],    // Taxa de erro menor que 1%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // 1. Healthcheck
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "health response is ok": (r) => r.json("status") === "ok",
  });

  // 2. Login
  const loginPayload = JSON.stringify({
    email: "admin@opsdesk.local",
    password: "Admin123!",
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { "Content-Type": "application/json" },
  });

  check(loginRes, {
    "login status is 200": (r) => r.status === 200,
    "token is present": (r) => r.json("token") !== undefined,
  });

  const token = loginRes.json("token");

  // 3. Listagem de chamados
  const ticketsRes = http.get(`${BASE_URL}/api/tickets`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  check(ticketsRes, {
    "tickets status is 200": (r) => r.status === 200,
    "tickets list is array": (r) => Array.isArray(r.json("tickets")),
  });

  sleep(1);
}
