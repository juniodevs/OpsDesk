import { test, expect } from "../fixtures/test-fixtures.js";
import { generateTicketPayload } from "../factories/ticket-factory.js";

test.describe("Ciclo de Vida e Regras de Negócio do Incidente", () => {
  test("deve abrir um novo chamado e exibi-lo corretamente na listagem", async ({
    ticketsListPage,
    newTicketModal,
    page,
  }) => {
    const payload = generateTicketPayload({
      title: "Falha de conectividade com API de conciliação bancária",
      service: "Financeiro",
      severity: "P1",
      description: "Servidor retornando timeout após envio de lote de 1.000 faturas.",
    });

    await ticketsListPage.openCreateModal();
    await newTicketModal.fillForm(payload);
    await newTicketModal.submit();

    // Mensagem de sucesso esperada
    await ticketsListPage.waitForAlert("aberto com sucesso");

    // O chamado recém-criado deve constar na tabela com o título
    await expect(page.locator('[data-testid="tickets-table"]')).toContainText(
      payload.title
    );
  });

  test("deve bloquear transição direta de OPEN para CLOSED sem resolução prévia", async ({
    ticketsListPage,
    ticketDetailPage,
  }) => {
    // #INC-1002 está com status OPEN
    await ticketsListPage.clickTicketByNumber("#INC-1002");

    // O botão de fechar diretamente deve estar desabilitado na interface
    await expect(ticketDetailPage.btnStatusClosed).toBeDisabled();
  });

  test("deve cumprir o fluxo completo de resolução exigindo nota técnica", async ({
    ticketsListPage,
    ticketDetailPage,
    page,
  }) => {
    // Acessa o chamado em investigação #INC-1001
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    // Move para Mitigado
    await ticketDetailPage.changeStatusTo("mitigated");
    await expect(ticketDetailPage.ticketStatus).toHaveText("MITIGATED");

    // Move para Resolvido informando nota de resolução
    await ticketDetailPage.changeStatusTo(
      "resolved",
      "Rota alternativa ativada e timeout reconfigurado no parceiro."
    );
    await expect(ticketDetailPage.ticketStatus).toHaveText("RESOLVED");

    // A nota de resolução deve estar registrada no histórico
    await expect(ticketDetailPage.notesList).toContainText(
      "Rota alternativa ativada"
    );

    // Agora é permitido fechar o chamado
    await ticketDetailPage.changeStatusTo("closed");
    await expect(ticketDetailPage.ticketStatus).toHaveText("CLOSED");

    // A trilha de auditoria deve conter os registros de status
    await expect(ticketDetailPage.auditList).toContainText("STATUS_CHANGED");
  });
});
