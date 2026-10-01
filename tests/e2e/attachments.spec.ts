import { test, expect } from "../fixtures/test-fixtures.js";
import path from "node:path";

test.describe("Upload e Gerenciamento de Anexos Técnicos", () => {
  const validLogPath = path.resolve(process.cwd(), "tests/fixtures/sample-error.log");
  const forbiddenExePath = path.resolve(process.cwd(), "tests/fixtures/unauthorized.exe");

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
