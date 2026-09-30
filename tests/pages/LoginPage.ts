import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class LoginPage extends BasePage {
  readonly viewLogin: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly btnSubmit: Locator;
  readonly errorAlert: Locator;
  readonly btnFillAdmin: Locator;
  readonly btnFillAnalyst: Locator;
  readonly btnFillReporter: Locator;

  constructor(page: Page) {
    super(page);
    this.viewLogin = page.locator('[data-testid="view-login"]');
    this.emailInput = page.locator('[data-testid="input-login-email"]');
    this.passwordInput = page.locator('[data-testid="input-login-password"]');
    this.btnSubmit = page.locator('[data-testid="btn-login-submit"]');
    this.errorAlert = page.locator('[data-testid="login-error-alert"]');
    this.btnFillAdmin = page.locator('[data-testid="btn-fill-admin"]');
    this.btnFillAnalyst = page.locator('[data-testid="btn-fill-analyst"]');
    this.btnFillReporter = page.locator('[data-testid="btn-fill-reporter"]');
  }

  override async goto() {
    await this.page.goto("/");
    await expect(this.viewLogin).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.btnSubmit.click();
  }

  async fillWithRole(role: "admin" | "analyst" | "reporter") {
    if (role === "admin") {
      await this.btnFillAdmin.click();
    } else if (role === "analyst") {
      await this.btnFillAnalyst.click();
    } else if (role === "reporter") {
      await this.btnFillReporter.click();
    }
  }

  async expectErrorMessage(text: string) {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(text);
  }
}
