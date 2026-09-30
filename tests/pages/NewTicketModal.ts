import { Page, Locator, expect } from "@playwright/test";

export class NewTicketModal {
  readonly modal: Locator;
  readonly inputTitle: Locator;
  readonly inputService: Locator;
  readonly selectSeverity: Locator;
  readonly textareaDesc: Locator;
  readonly btnSubmit: Locator;
  readonly btnCancel: Locator;
  readonly errorContainer: Locator;

  constructor(private page: Page) {
    this.modal = page.locator('[data-testid="modal-create-ticket"]');
    this.inputTitle = page.locator('[data-testid="input-ticket-title"]');
    this.inputService = page.locator('[data-testid="input-ticket-service"]');
    this.selectSeverity = page.locator('[data-testid="select-ticket-severity"]');
    this.textareaDesc = page.locator('[data-testid="textarea-ticket-desc"]');
    this.btnSubmit = page.locator('[data-testid="btn-submit-ticket"]');
    this.btnCancel = page.locator('[data-testid="btn-cancel-ticket"]');
    this.errorContainer = page.locator('[data-testid="create-ticket-error"]');
  }

  async fillForm(data: {
    title: string;
    service: string;
    severity: "P1" | "P2" | "P3" | "P4";
    description: string;
  }) {
    await this.inputTitle.fill(data.title);
    await this.inputService.fill(data.service);
    await this.selectSeverity.selectOption(data.severity);
    await this.textareaDesc.fill(data.description);
  }

  async submit() {
    await this.btnSubmit.click();
    await this.page.waitForLoadState("networkidle");
  }

  async cancel() {
    await this.btnCancel.click();
    await expect(this.modal).not.toHaveClass(/active/);
  }
}
