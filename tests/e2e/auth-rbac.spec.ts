import { test, expect } from "../fixtures/test-fixtures.js";

test.describe("Matriz de Autenticação e Controle de Acesso (RBAC)", () => {
  test("deve permitir que o Administrador visualize opções de exclusão de chamados", async ({
    ticketsListPage,
    ticketDetailPage,
    page,
  }) => {
    // Garante que está como Admin
    await ticketsListPage.switchRole("admin");
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    // Administrador tem botão de exclusão disponível
    await expect(ticketDetailPage.btnDeleteTicket).toBeVisible();
  });

  test("deve ocultar opções de exclusão e notas internas para o perfil Relator", async ({
    ticketsListPage,
    ticketDetailPage,
    page,
  }) => {
    // Alterna para o perfil Relator (Lucas)
    await ticketsListPage.switchRole("reporter");
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    // Relator não deve ver botão de exclusão
    await expect(ticketDetailPage.btnDeleteTicket).toBeHidden();

    // Relator não deve ver notas marcadas como internas
    const internalBadge = page.locator(".note-internal-badge");
    await expect(internalBadge).toHaveCount(0);

    // O checkbox de nota interna não deve estar disponível para o relator
    await expect(ticketDetailPage.checkboxInternalNote).toBeHidden();
  });

  test("deve permitir que o Analista assuma chamados e adicione notas internas", async ({
    ticketsListPage,
    ticketDetailPage,
    page,
  }) => {
    // Alterna para Analista (Mariana)
    await ticketsListPage.switchRole("analyst");
    await ticketsListPage.clickTicketByNumber("#INC-1002");

    // Analista pode adicionar nota interna
    await ticketDetailPage.addNote(
      "Iniciando verificação do consumidor na fila de cobrança.",
      true
    );

    // Nota interna deve aparecer na lista
    await expect(ticketDetailPage.notesList).toContainText(
      "Iniciando verificação do consumidor na fila de cobrança."
    );
    await expect(page.locator(".note-internal-badge")).toBeVisible();
  });
});
