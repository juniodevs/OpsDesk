import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

async function capture() {
  const outputDir = path.resolve(process.cwd(), "docs/screenshots");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High resolution retina screenshot
  });

  const page = await context.newPage();

  // 1. Tela de Login Real
  console.log("Capturando tela de login...");
  await page.goto("http://localhost:3000/");
  await page.waitForSelector('[data-testid="view-login"]');
  await page.screenshot({ path: path.join(outputDir, "01-login.png") });

  // 2. Login como Admin e captura do Dashboard
  console.log("Capturando dashboard com 10 incidentes...");
  await page.locator('[data-testid="btn-fill-admin"]').click();
  await page.locator('[data-testid="btn-login-submit"]').click();
  await page.waitForSelector('[data-testid="view-dashboard"]');
  await page.waitForSelector('[data-testid="ticket-row"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, "02-dashboard.png") });

  // 3. Detalhes de um chamado com notas e auditoria
  console.log("Capturando detalhes do incidente #INC-1001...");
  await page.locator('[data-testid="ticket-row"]').first().click();
  await page.waitForSelector('[data-testid="ticket-detail-view"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, "03-ticket-detail.png") });

  // 4. Visualização Mobile
  console.log("Capturando visualização mobile...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/");
  // Preenche e entra
  await mobilePage.locator('[data-testid="btn-fill-analyst"]').click();
  await mobilePage.locator('[data-testid="btn-login-submit"]').click();
  await mobilePage.waitForSelector('[data-testid="tickets-table"]');
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: path.join(outputDir, "04-mobile-view.png") });

  await browser.close();
  console.log("Screenshots capturadas com sucesso em docs/screenshots/");
}

capture().catch((err) => {
  console.error("Erro ao capturar screenshots:", err);
  process.exit(1);
});
