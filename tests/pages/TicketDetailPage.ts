import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class TicketDetailPage extends BasePage {
  readonly ticketNumber: Locator;
  readonly ticketTitle: Locator;
  readonly ticketStatus: Locator;
  readonly ticketSeverity: Locator;
  readonly btnBackToList: Locator;
  readonly btnDeleteTicket: Locator;

  // Botões de transição
  readonly btnStatusInvestigating: Locator;
  readonly btnStatusMitigated: Locator;
  readonly btnStatusResolved: Locator;
  readonly btnStatusClosed: Locator;

  // Seção de notas
  readonly textareaNote: Locator;
  readonly checkboxInternalNote: Locator;
  readonly btnSubmitNote: Locator;
  readonly notesList: Locator;

  // Seção de anexos
  readonly fileInput: Locator;
  readonly btnUploadFile: Locator;
  readonly uploadFeedback: Locator;
  readonly attachmentsList: Locator;

  // Auditoria
  readonly auditList: Locator;

  constructor(page: Page) {
    super(page);
    this.ticketNumber = page.locator('[data-testid="detail-ticket-number"]');
    this.ticketTitle = page.locator('[data-testid="detail-ticket-title"]');
    this.ticketStatus = page.locator('[data-testid="detail-ticket-status"]');
    this.ticketSeverity = page.locator('[data-testid="detail-ticket-severity"]');
    this.btnBackToList = page.locator('[data-testid="btn-back-to-list"]');
    this.btnDeleteTicket = page.locator('[data-testid="btn-delete-ticket"]');

    this.btnStatusInvestigating = page.locator('[data-testid="btn-change-status-investigating"]');
    this.btnStatusMitigated = page.locator('[data-testid="btn-change-status-mitigated"]');
    this.btnStatusResolved = page.locator('[data-testid="btn-change-status-resolved"]');
    this.btnStatusClosed = page.locator('[data-testid="btn-change-status-closed"]');

    this.textareaNote = page.locator('[data-testid="textarea-new-note"]');
    this.checkboxInternalNote = page.locator('[data-testid="checkbox-internal-note"]');
    this.btnSubmitNote = page.locator('[data-testid="btn-submit-note"]');
    this.notesList = page.locator('[data-testid="notes-list"]');

    this.fileInput = page.locator('[data-testid="file-upload-input"]');
    this.btnUploadFile = page.locator('[data-testid="btn-upload-file"]');
    this.uploadFeedback = page.locator('[data-testid="upload-feedback"]');
    this.attachmentsList = page.locator('[data-testid="attachments-list"]');
    this.auditList = page.locator('[data-testid="audit-list"]');
  }

  async backToList() {
    await this.btnBackToList.click();
    await expect(this.page.locator('[data-testid="view-tickets-list"]')).toBeVisible();
  }

  async changeStatusTo(status: "investigating" | "mitigated" | "resolved" | "closed", resolutionNote?: string) {
    if (status === "investigating") {
      await this.btnStatusInvestigating.click();
    } else if (status === "mitigated") {
      await this.btnStatusMitigated.click();
    } else if (status === "resolved") {
      await this.btnStatusResolved.click();
      const modal = this.page.locator('[data-testid="modal-resolution"]');
      await expect(modal).toHaveClass(/active/);
      if (resolutionNote) {
        await this.page.locator('[data-testid="textarea-resolution-note"]').fill(resolutionNote);
      }
      await this.page.locator('[data-testid="btn-confirm-resolution"]').click();
    } else if (status === "closed") {
      await this.btnStatusClosed.click();
    }

    await this.page.waitForLoadState("networkidle");
  }

  async addNote(content: string, isInternal = true) {
    await this.textareaNote.fill(content);
    if (!isInternal && (await this.checkboxInternalNote.isVisible())) {
      await this.checkboxInternalNote.uncheck();
    }
    await this.btnSubmitNote.click();
    await this.page.waitForLoadState("networkidle");
  }

  async uploadAttachment(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.btnUploadFile.click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteTicket() {
    // Configura o handler de diálogo nativo (window.confirm)
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.btnDeleteTicket.click();
    await expect(this.page.locator('[data-testid="view-tickets-list"]')).toBeVisible();
  }
}
