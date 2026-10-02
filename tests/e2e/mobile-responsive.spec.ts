import { test, expect } from "../fixtures/test-fixtures.js";

test.describe("Responsividade Mobile e Usabilidade por Toque", () => {
  test("deve garantir que não haja overflow horizontal na visualização móvel", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("deve garantir que os botões principais tenham área mínima de toque de 44px", async ({
    ticketsListPage,
    page,
  }) => {
    const btnCreate = page.locator('[data-testid="btn-open-create-modal"]');
    const box = await btnCreate.boundingBox();

    expect(box).not.toBeNull();
    // Altura mínima exigida pela regra de toque mobile (WCAG e antislop-layoutmobile)
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("deve permitir fluxo completo de triagem de incidentes em dispositivo móvel", async ({
    ticketsListPage,
    ticketDetailPage,
    page,
  }) => {
    await ticketsListPage.clickTicketByNumber("#INC-1001");

    // Verifica que o painel de detalhes foi exibido sem quebrar a tela
    await expect(ticketDetailPage.ticketNumber).toHaveText("#INC-1001");

    // Adiciona uma nota rápida em tela móvel
    await ticketDetailPage.addNote("Validação mobile concluída com sucesso.", false);
    await expect(ticketDetailPage.notesList).toContainText(
      "Validação mobile concluída com sucesso."
    );

    // Retorna para a listagem
    await ticketDetailPage.backToList();
    await expect(page.locator('[data-testid="view-tickets-list"]')).toBeVisible();
  });
});
