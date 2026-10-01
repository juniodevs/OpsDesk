import { test, expect } from "../fixtures/test-fixtures.js";

test.describe("Filtros Dinâmicos e Busca de Chamados", () => {
  test("deve filtrar chamados pela severidade selecionada", async ({
    ticketsListPage,
    page,
  }) => {
    // Filtra apenas por P1 (Crítico)
    await ticketsListPage.setSeverityFilter("P1");

    // Todos os badges visíveis devem ser P1
    const severityBadges = page.locator(".severity-badge");
    const count = await severityBadges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(severityBadges.nth(i)).toHaveText("P1");
    }
  });

  test("deve realizar busca textual em tempo real por termo", async ({
    ticketsListPage,
    page,
  }) => {
    // Busca pelo termo RabbitMQ
    await ticketsListPage.search("RabbitMQ");

    const rows = ticketsListPage.ticketRows;
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Lentidão na fila de mensageria");
  });

  test("deve exibir estado vazio quando a busca não encontrar registros", async ({
    ticketsListPage,
  }) => {
    // Busca por um termo inexistente
    await ticketsListPage.search("TERMO_INEXISTENTE_9999");

    // Tabela não deve ter linhas
    expect(await ticketsListPage.getTicketRowsCount()).toBe(0);

    // Estado vazio deve estar visível com mensagem clara
    await expect(ticketsListPage.emptyState).toBeVisible();
    await expect(ticketsListPage.emptyState).toContainText("Nenhum incidente encontrado");
  });

  test("deve restaurar todos os incidentes ao clicar em limpar filtros", async ({
    ticketsListPage,
  }) => {
    await ticketsListPage.setSeverityFilter("P1");
    await ticketsListPage.search("Pix");

    // Limpa filtros
    await ticketsListPage.clearFilters();

    // Deve voltar a ter os chamados iniciais do seed (10 chamados)
    await expect(ticketsListPage.ticketRows).toHaveCount(10);
  });
});
