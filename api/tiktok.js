// api/tiktok.js
import puppeteer from "puppeteer";

export default async function handler(req, res) {
  const { user } = req.query;
  if (!user) return res.status(400).json({ ok: false, error: "Missing username" });

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(`https://www.tiktok.com/@${user}`, { waitUntil: "domcontentloaded" });

    const data = await page.evaluate(() => {
      const avatar = document.querySelector("img[src*='p16-sign-va']")?.src;
      const title = document.querySelector("title")?.innerText;
      const followers = document.querySelector("strong[data-e2e='followers-count']")?.innerText;
      return { avatar, title, followers };
    });

    await browser.close();
    res.json({ ok: true, username: user, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
