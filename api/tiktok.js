// api/tiktok.js
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  const { user } = req.query;
  if (!user) return res.status(400).json({ ok: false, error: "Missing username" });

  let browser;
  try {
    // Khởi tạo trình duyệt headless cho Vercel
    const executablePath = await chromium.executablePath;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(`https://www.tiktok.com/@${user}`, { waitUntil: "domcontentloaded", timeout: 30000 });

    const data = await page.evaluate(() => {
      const avatar = document.querySelector("img[src*='p16-sign-va']")?.src;
      const title = document.querySelector("title")?.innerText;
      const followers = document.querySelector("strong[data-e2e='followers-count']")?.innerText;
      return { avatar, title, followers };
    });

    res.status(200).json({ ok: true, username: user, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
