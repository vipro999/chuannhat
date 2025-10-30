import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  const { user } = req.query;
  if (!user) return res.status(400).json({ ok: false, error: "Missing username" });

  let browser;
  try {
    // 🧩 Fix: đảm bảo có đường dẫn chrome hợp lệ
    const executablePath = await chromium.executablePath || "/usr/bin/chromium-browser";

    browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36"
    );
    await page.goto(`https://www.tiktok.com/@${user}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const data = await page.evaluate(() => {
      const avatar = document.querySelector("img[src*='p16-sign']")?.src;
      const title = document.title;
      const followers = document.querySelector("strong[data-e2e='followers-count']")?.innerText;
      return { avatar, title, followers };
    });

    res.status(200).json({
      ok: true,
      username: user,
      ...data,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
