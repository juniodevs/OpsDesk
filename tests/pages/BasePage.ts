import { Page, expect } from "@playwright/test";

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path = "/") {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  async resetDatabase() {
    await this.page.request.post("/api/test/reset");
  }

  async switchRole(role: "admin" | "analyst" | "reporter") {
    const selector = `[data-testid="demo-login-${role}"]`;
    await this.page.click(selector);
    // Aguarda atualização da tag de perfil
    await expect(this.page.locator('[data-testid="user-display-role"]')).toHaveText(
      role.toUpperCase()
    );
  }

  async getGlobalAlert() {
    return this.page.locator('[role="alert"]');
  }

  async waitForAlert(text?: string) {
    const alert = this.page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    if (text) {
      await expect(alert).toContainText(text);
    }
  }
}
