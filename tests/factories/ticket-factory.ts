export function generateTicketPayload(overrides?: Partial<{
  title: string;
  service: string;
  severity: "P1" | "P2" | "P3" | "P4";
  description: string;
}>) {
  const timestamp = Date.now();
  return {
    title: overrides?.title || `Falha no serviço de telemetria ${timestamp}`,
    service: overrides?.service || "Infraestrutura",
    severity: overrides?.severity || "P2",
    description:
      overrides?.description ||
      "Pico de latência detectado pelo monitoramento com mais de 500ms nas requisições da fila.",
  };
}
