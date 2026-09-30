import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage.js";

export class TicketsListPage extends BasePage {
  readonly searchInput: Locator;
  readonly filterStatus: Locator;
  readonly filterSeverity: Locator;
  readonly btnClearFilters: Locator;
  readonly btnOpenCreateModal: Locator;
  readonly ticketsTable: Locator;
  readonly ticketRows: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.filterStatus = page.locator('[data-testid="filter-status"]');
    this.filterSeverity = page.locator('[data-testid="filter-severity"]');
    this.btnClearFilters = page.locator('[data-testid="btn-clear-filters"]');
    this.btnOpenCreateModal = page.locator('[data-testid="btn-open-create-modal"]');
    this.ticketsTable = page.locator('[data-testid="tickets-table"]');
    this.ticketRows = page.locator('[data-testid="ticket-row"]');
    this.emptyState = page.locator('[data-testid="state-empty"]');
    this.loadingState = page.locator('[data-testid="state-loading"]');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Aguarda debounce e requisição de busca
    await this.page.waitForTimeout(400);
  }

  async setStatusFilter(status: "ALL" | "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" | "CLOSED") {
    await this.filterStatus.selectOption(status);
    await this.page.waitForLoadState("networkidle");
  }

  async setSeverityFilter(severity: "ALL" | "P1" | "P2" | "P3" | "P4") {
    await this.filterSeverity.selectOption(severity);
    await this.page.waitForLoadState("networkidle");
  }

  async clearFilters() {
    await this.btnClearFilters.click();
    await this.page.waitForLoadState("networkidle");
  }

  async getTicketRowsCount(): Promise<number> {
    return await this.ticketRows.count();
  }

  async clickTicketByNumber(ticketNumber: string) {
    const row = this.ticketRows.filter({ hasText: ticketNumber });
    await row.click();
    await expect(this.page.locator('[data-testid="ticket-detail-view"]')).toBeVisible();
  }

  async openCreateModal() {
    await this.btnOpenCreateModal.click();
    await expect(this.page.locator('[data-testid="modal-create-ticket"]')).toHaveClass(/active/);
  }
}
