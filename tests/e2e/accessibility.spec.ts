import { test, expect } from "../fixtures/test-fixtures.js";
import AxeBuilder from "@axe-core/playwright";

test.describe("Acessibilidade Automatizada e Navegação por Teclado (WCAG AA)", () => {
  test("não deve possuir violações críticas de acessibilidade na tela principal", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Filtra violações críticas ou graves
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });

  test("não deve possuir violações críticas de acessibilidade no modal de novo incidente", async ({
    ticketsListPage,
    page,
  }) => {
    await ticketsListPage.openCreateModal();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="modal-create-ticket"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations).toEqual([]);
  });

  test("deve permitir fechar o modal utilizando a tecla Escape", async ({
    ticketsListPage,
    page,
  }) => {
    await ticketsListPage.openCreateModal();
    const modal = page.locator('[data-testid="modal-create-ticket"]');
    await expect(modal).toHaveClass(/active/);

    // Pressiona Escape
    await page.keyboard.press("Escape");

    // Modal deve ser fechado
    await expect(modal).not.toHaveClass(/active/);
  });

  test("deve permitir navegação sequencial por Tab nos campos do formulário", async ({
    ticketsListPage,
    page,
  }) => {
    await ticketsListPage.openCreateModal();

    // Primeiro foco deve ir para o título
    const titleInput = page.locator('[data-testid="input-ticket-title"]');
    await expect(titleInput).toBeFocused();

    // Tab avança para o serviço
    await page.keyboard.press("Tab");
    const serviceInput = page.locator('[data-testid="input-ticket-service"]');
    await expect(serviceInput).toBeFocused();

    // Tab avança para a severidade
    await page.keyboard.press("Tab");
    const severitySelect = page.locator('[data-testid="select-ticket-severity"]');
    await expect(severitySelect).toBeFocused();
  });
});
