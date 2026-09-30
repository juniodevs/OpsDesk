import { test as base, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage.js";
import { TicketsListPage } from "../pages/TicketsListPage.js";
import { TicketDetailPage } from "../pages/TicketDetailPage.js";
import { NewTicketModal } from "../pages/NewTicketModal.js";

type OpsDeskFixtures = {
  loginPage: LoginPage;
  ticketsListPage: TicketsListPage;
  ticketDetailPage: TicketDetailPage;
  newTicketModal: NewTicketModal;
  cleanDb: void;
};

export const test = base.extend<OpsDeskFixtures>({
  // Fixture automática que reseta a base de dados para um estado limpo antes de cada teste
  cleanDb: [
    async ({ request }, use) => {
      await request.post("/api/test/reset");
      await use();
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  ticketsListPage: async ({ page, request }, use) => {
    // Autentica via API e injeta token no localStorage para carregar o painel diretamente
    const res = await request.post("/api/auth/login", {
      data: { email: "admin@opsdesk.local", password: "Admin123!" },
    });
    const { token, user } = await res.json();

    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem("opsdesk_token", token);
        localStorage.setItem("opsdesk_user", JSON.stringify(user));
      },
      { token, user }
    );

    const listPage = new TicketsListPage(page);
    await listPage.goto();
    await use(listPage);
  },

  ticketDetailPage: async ({ page }, use) => {
    const detailPage = new TicketDetailPage(page);
    await use(detailPage);
  },

  newTicketModal: async ({ page }, use) => {
    const modal = new NewTicketModal(page);
    await use(modal);
  },
});

export { expect };
