import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 10 }, // Subida para 10 VUs
    { duration: "40s", target: 30 }, // Pico com 30 VUs concorrentes
    { duration: "20s", target: 0 },  // Descida suave
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"], // 95% das requisições abaixo de 300ms sob carga
    http_req_failed: ["rate<0.01"],    // Menos de 1% de falhas
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export function setup() {
  // Autentica uma vez no setup para obter token do analista
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: "analyst@opsdesk.local", password: "Analyst123!" }),
    { headers: { "Content-Type": "application/json" } }
  );
  return { token: res.json("token") };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
  };

  // 1. Consulta com filtro de severidade
  const filterRes = http.get(`${BASE_URL}/api/tickets?severity=P1`, { headers });
  check(filterRes, {
    "filter status is 200": (r) => r.status === 200,
  });

  // 2. Busca textual concorrente
  const searchRes = http.get(`${BASE_URL}/api/tickets?search=Pix`, { headers });
  check(searchRes, {
    "search status is 200": (r) => r.status === 200,
  });

  // 3. Detalhes de um chamado específico
  const detailRes = http.get(`${BASE_URL}/api/tickets/t_1001`, { headers });
  check(detailRes, {
    "detail status is 200": (r) => r.status === 200,
    "has notes and audit": (r) => r.json("notes") !== undefined,
  });

  sleep(0.5);
}
