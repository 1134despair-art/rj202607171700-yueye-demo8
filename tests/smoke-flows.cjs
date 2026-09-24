const fs = require("node:fs");
const { chromium } = require("@playwright/test");

const base = "http://127.0.0.1:5192/";
const chromeCandidates = [
  process.env.BINSEN_CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
const filters = process.argv.slice(2);

async function open(context, route, selector = ".page-shell") {
  const page = await context.newPage();
  await page.goto(`${base}#${route}`, { waitUntil: "domcontentloaded" });
  await page.locator(selector).waitFor({ state: "visible", timeout: 10000 });
  return page;
}

async function waitHash(page, route) {
  await page.waitForFunction((expected) => location.hash.includes(expected), route, { timeout: 10000 });
}

async function bindAndConnect(context) {
  const page = await open(context, "/pages/onboarding/bind");
  await page.locator(".search-card .primary-button").click();
  await page.locator(".vehicle-row").first().waitFor({ state: "visible", timeout: 5000 });
  await page.locator(".vehicle-row").first().click();
  await page.locator(".phone-shell").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForFunction(() => document.querySelector("[data-testid='home-connection-action']")?.textContent?.includes("已连接"), null, { timeout: 10000 });
  return page;
}

async function openConnected(context, route, selector = ".page-shell") {
  const page = await bindAndConnect(context);
  if (route !== "/pages/home-brand/index") {
    await page.evaluate((target) => { location.hash = `#${target}`; }, route);
    await page.locator(selector).waitFor({ state: "visible", timeout: 10000 });
  }
  return page;
}

async function run(browser, name, task) {
  if (filters.length && !filters.some((filter) => name.toLowerCase().startsWith(filter.toLowerCase()))) return;
  const context = await browser.newContext({ viewport: { width: 452, height: 960 }, deviceScaleFactor: 1 });
  try {
    await task(context);
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.log(`FAIL ${name}: ${message.slice(0, 220)}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ ...(chrome ? { executablePath: chrome } : {}), headless: true });

  await run(browser, "home tab navigation", async (context) => {
    const page = await open(context, "/pages/home-brand/index", ".phone-shell");
    await page.locator(".app-tabbar__item, .tab-item").nth(1).click();
    await waitHash(page, "/pages/controls/index");
  });

  await run(browser, "home unbound and automatic connection", async (context) => {
    const page = await open(context, "/pages/home-brand/index", ".phone-shell");
    const assertConnectionActionSingleLine = async (expectedCopy) => {
      const action = page.getByTestId("home-connection-action");
      if (!(await action.innerText()).includes(expectedCopy)) throw new Error(`connection action should show ${expectedCopy}`);
      const layout = await action.evaluate((element) => {
        const label = Array.from(element.children).find((child) => child.tagName === "UNI-TEXT");
        if (!label) return null;
        const range = document.createRange();
        range.selectNodeContents(label);
        const rects = Array.from(range.getClientRects()).map((rect) => ({
          top: Math.round(rect.top * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        }));
        return {
          lines: new Set(rects.map((rect) => rect.top)).size,
          rects,
          buttonWidth: Math.round(element.getBoundingClientRect().width * 10) / 10,
          whiteSpace: getComputedStyle(label).whiteSpace,
        };
      });
      if (!layout || layout.lines !== 1 || layout.whiteSpace !== "nowrap") {
        throw new Error(`connection action wrapped: ${JSON.stringify(layout)}`);
      }
    };
    if (await page.locator(".notification-button").count()) throw new Error("removed notification entry is visible");
    if (!(await page.getByTestId("home-connection-action").innerText()).includes("绑定车辆")) throw new Error("unbound action is incorrect");
    if (!(await page.getByTestId("home-unbound-data").innerText()).includes("绑定后查看实时数据")) throw new Error("unbound data guidance is missing");
    if ((await page.locator(".feature-card:not([disabled])").count()) !== 0) throw new Error("vehicle features should be locked before binding");
    await page.getByTestId("home-connection-action").click();
    await waitHash(page, "/pages/onboarding/bind");
    await page.locator(".search-card .primary-button").click();
    await page.locator(".vehicle-row").first().waitFor({ state: "visible" });
    await page.locator(".vehicle-row").first().click();
    await page.locator(".phone-shell").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() => document.querySelector("[data-testid='home-connection-action']")?.textContent?.includes("已连接"), null, { timeout: 10000 });
    await assertConnectionActionSingleLine("已连接");
    if (!(await page.locator(".sync-copy").innerText()).includes("自动连接")) throw new Error("automatic connection feedback is missing");
    if ((await page.locator(".metric-value").allInnerTexts()).some((value) => value.trim() === "--")) throw new Error("connected telemetry did not load");
    await page.getByTestId("home-connection-action").click();
    await page.getByTestId("app-modal").waitFor({ state: "visible" });
    await page.getByTestId("modal-confirm").click();
    await page.waitForFunction(() => document.querySelector("[data-testid='home-connection-action']")?.textContent?.includes("连接车辆"), null, { timeout: 5000 });
    await assertConnectionActionSingleLine("连接车辆");
  });

  await run(browser, "home action routes", async (context) => {
    const setupPage = await bindAndConnect(context);
    await setupPage.close();
    const cases = [
      { selector: "[data-testid='home-battery-entry']", route: "/pages/service/battery" },
      { selector: ".feature-card", index: 0, route: "/pages/service/status" },
      { selector: ".feature-card", index: 1, route: "/pages/service/diagnosis" },
      { selector: ".feature-card", index: 2, route: "/pages/service/ota" },
      { selector: ".update-banner", route: "/pages/service/ota" },
    ];
    for (const item of cases) {
      const page = await open(context, "/pages/home-brand/index", ".phone-shell");
      const target = item.index === undefined ? page.locator(item.selector) : page.locator(item.selector).nth(item.index);
      await target.click();
      await waitHash(page, item.route);
      await page.close();
    }
  });

  await run(browser, "main tab frame dimensions", async (context) => {
    const page = await context.newPage();
    const routes = [
      { route: "/pages/home-brand/index", selector: ".phone-shell" },
      { route: "/pages/controls/index", selector: ".page-shell" },
      { route: "/pages/service/index", selector: ".page-shell" },
      { route: "/pages/me/index", selector: ".page-shell" },
    ];
    const boxes = [];
    for (const item of routes) {
      await page.goto(`${base}#${item.route}`, { waitUntil: "domcontentloaded" });
      const target = page.locator(item.selector);
      await target.waitFor({ state: "visible" });
      boxes.push(await target.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const tab = element.querySelector(".app-tabbar")?.getBoundingClientRect();
        return {
          frame: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
          tab: tab ? { width: Math.round(tab.width), height: Math.round(tab.height), bottom: Math.round(tab.bottom) } : null,
          radius: getComputedStyle(element).borderRadius,
        };
      }));
    }
    if (new Set(boxes.map((box) => JSON.stringify(box))).size !== 1) throw new Error(`main tab frames differ: ${JSON.stringify(boxes)}`);
  });

  await run(browser, "control immediate save", async (context) => {
    const page = await openConnected(context, "/pages/controls/index");
    await page.locator(".protection-card").first().click();
    await page.getByTestId("app-toast").waitFor({ state: "visible", timeout: 4000 });
  });

  await run(browser, "wheelie disclaimer gate", async (context) => {
    const page = await openConnected(context, "/pages/controls/ride-modes");
    await page.locator(".choice-grid.wheelie uni-button").nth(1).click();
    await page.getByTestId("wheelie-disclaimer").waitFor({ state: "visible" });
    if ((await page.getByTestId("wheelie-disclaimer-confirm").getAttribute("disabled")) !== "true") throw new Error("confirm should be disabled before acknowledgement");
    await page.getByTestId("wheelie-disclaimer-check").click();
    if ((await page.getByTestId("wheelie-disclaimer-confirm").getAttribute("disabled")) === "true") throw new Error("confirm did not become enabled");
    await page.getByTestId("wheelie-disclaimer-confirm").click();
    await page.getByTestId("wheelie-disclaimer").waitFor({ state: "hidden" });
  });

  await run(browser, "resource download feedback", async (context) => {
    const page = await open(context, "/pages/service/resources");
    await page.getByTestId("download-repair-manual").click();
    await page.getByTestId("app-modal").waitFor({ state: "visible" });
    await page.getByTestId("modal-confirm").click();
    await page.waitForTimeout(1600);
    const modal = page.getByTestId("app-modal");
    await modal.waitFor({ state: "visible" });
    if (!(await modal.innerText()).includes("完成")) throw new Error("completion feedback missing");
    await page.getByTestId("modal-confirm").click();
  });

  await run(browser, "diagnosis result navigation", async (context) => {
    const page = await openConnected(context, "/pages/service/diagnosis");
    await page.locator(".start-button").click();
    await waitHash(page, "/pages/service/diagnosis-result");
  });

  await run(browser, "OTA one-tap flow", async (context) => {
    const page = await openConnected(context, "/pages/service/ota");
    await page.locator(".module-row").first().waitFor({ state: "visible" });
    await page.locator(".module-row").first().click();
    await waitHash(page, "/pages/service/ota-detail");
    await page.getByTestId("ota-one-tap-update").click();
    await waitHash(page, "/pages/service/ota-progress");
  });

  await run(browser, "appearance sheet", async (context) => {
    const page = await open(context, "/pages/me/index");
    await page.getByTestId("appearance-setting").click();
    const sheet = page.getByTestId("app-action-sheet");
    await sheet.waitFor({ state: "visible" });
    if ((await sheet.locator(".choice-row").count()) !== 3) throw new Error("appearance options are incomplete");
    await sheet.locator(".choice-row").nth(1).click();
    await sheet.waitFor({ state: "hidden" });
  });

  await run(browser, "rename and unbind", async (context) => {
    const page = await bindAndConnect(context);
    await page.evaluate(() => { location.hash = "#/pages/onboarding/bind?from=me"; });
    await page.locator(".bind-page").waitFor({ state: "visible" });
    await page.getByTestId("rename-vehicle").click();
    const input = page.locator('input[data-testid="vehicle-display-name-input"], [data-testid="vehicle-display-name-input"] input').first();
    await input.fill("X5 DEMO");
    await page.getByTestId("save-vehicle-display-name").click();
    await page.getByTestId("app-toast").waitFor({ state: "visible" });
    await page.getByTestId("unbind-vehicle").click();
    await page.getByTestId("app-modal").waitFor({ state: "visible" });
    await page.getByTestId("modal-confirm").click();
    await page.getByTestId("unbind-vehicle").waitFor({ state: "hidden" });
    if (!(await page.locator(".vehicle-copy").innerText()).includes("--")) throw new Error("vehicle remained bound");
  });

  await browser.close();
})();
