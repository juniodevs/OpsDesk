import { test, expect } from "../fixtures/test-fixtures.js";

test.describe("Fluxo de Autenticação na Tela de Login Real", () => {
  test("deve exibir a tela de login ao acessar a aplicação sem sessão ativa", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();

    await expect(loginPage.viewLogin).toBeVisible();
    await expect(page.locator('[data-testid="view-dashboard"]')).toBeHidden();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test("deve realizar login com sucesso com credenciais válidas", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();

    await loginPage.login("admin@opsdesk.local", "Admin123!");

    // Painel autenticado deve ser exibido
    await expect(page.locator('[data-testid="view-dashboard"]')).toBeVisible();
    await expect(loginPage.viewLogin).toBeHidden();

    // Rótulos do usuário autenticado
    await expect(page.locator('[data-testid="user-display-name"]')).toHaveText("Carlos Rocha");
    await expect(page.locator('[data-testid="user-display-role"]')).toHaveText("ADMIN");
  });

  test("deve exibir alerta de erro ao tentar autenticar com senha incorreta", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();

    await loginPage.login("admin@opsdesk.local", "SenhaInvalida999");

    // Alerta de erro deve ser exibido
    await loginPage.expectErrorMessage("Credenciais inválidas");

    // Dashboard permanece oculto
    await expect(page.locator('[data-testid="view-dashboard"]')).toBeHidden();
  });

  test("deve preencher credenciais ao clicar no botão rápido de Analista", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();

    await loginPage.fillWithRole("analyst");
    await expect(loginPage.emailInput).toHaveValue("analyst@opsdesk.local");

    await loginPage.btnSubmit.click();

    await expect(page.locator('[data-testid="view-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-display-name"]')).toHaveText("Mariana Souza");
    await expect(page.locator('[data-testid="user-display-role"]')).toHaveText("ANALYST");
  });

  test("deve encerrar a sessão e retornar para a tela de login ao clicar em Sair", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.login("reporter@opsdesk.local", "Reporter123!");

    await expect(page.locator('[data-testid="view-dashboard"]')).toBeVisible();

    // Clica no botão Sair
    await page.locator('[data-testid="btn-logout"]').click();

    // Deve retornar para a tela de login
    await expect(loginPage.viewLogin).toBeVisible();
    await expect(page.locator('[data-testid="view-dashboard"]')).toBeHidden();
    await expect(loginPage.errorAlert).toContainText("Sessão encerrada com sucesso");
  });
});
