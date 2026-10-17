import { test, expect } from "../fixtures/test-fixtures.js";
import path from "node:path";
import fs from "node:fs";

test.describe("Upload e Gerenciamento de Anexos Técnicos", () => {
  const fixturesDir = path.resolve(process.cwd(), "tests/fixtures");
  const validLogPath = path.resolve(fixturesDir, "sample-error.log");
  const forbiddenExePath = path.resolve(fixturesDir, "unauthorized.exe");

  test.beforeAll(() => {
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(validLogPath)) {
      fs.writeFileSync(validLogPath, "[ERROR] 2026-10-17 12:00:00 Connection timeout in database pool\n", "utf8");
    }
    if (!fs.existsSync(forbiddenExePath)) {
      fs.writeFileSync(forbiddenExePath, "MZ fake executable binary for upload rejection testing", "utf8");
    }
  });

  test("deve permitir upload de arquivo .log e exibi-lo na lista de anexos", async ({
    ticketsListPage,
    ticketDetailPage,
  }) => {
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    await ticketDetailPage.uploadAttachment(validLogPath);

    // Mensagem de sucesso
    await expect(ticketDetailPage.uploadFeedback).toContainText("sucesso");

    // Anexo deve constar na listagem lateral
    await expect(ticketDetailPage.attachmentsList).toContainText("sample-error.log");

    // Histórico de auditoria deve registrar o upload
    await expect(ticketDetailPage.auditList).toContainText("ATTACHMENT_UPLOADED");
  });

  test("deve rejeitar upload de extensão executável proibida (.exe)", async ({
    ticketsListPage,
    ticketDetailPage,
  }) => {
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    await ticketDetailPage.uploadAttachment(forbiddenExePath);

    // Feedback de erro deve ser exibido ao usuário
    await expect(ticketDetailPage.uploadFeedback).toContainText("não é permitido");

    // O arquivo não deve constar na lista de anexos válidos
    await expect(ticketDetailPage.attachmentsList).not.toContainText("unauthorized.exe");
  });
});
