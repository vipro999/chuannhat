// server.js — bản tối ưu nhanh (reuse browser + cache)
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Giữ trình duyệt Puppeteer luôn mở
let browser;
async function getBrowser() {
  if (!browser) {
    console.log("🚀 Khởi động trình duyệt Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browser;
}

// ⚡ Bộ nhớ cache (RAM)
const cache = {}; // { username: { data, time } }
const CACHE_TTL = 5 * 60 * 1000; // 5 phút

// 📦 Hàm lấy thông tin TikTok
async function fetchTikTokProfile(username) {
  const url = `https://www.tiktok.com/@${username}`;
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Chặn tải hình ảnh, video, css để tăng tốc
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) req.abort();
      else req.continue();
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Lấy thông tin từ meta
    const data = await page.evaluate(() => {
      const get = (sel, attr) =>
        document.querySelector(sel)?.getAttribute(attr) || null;
      const description = get('meta[name="description"]', "content");
      const ogImage = get('meta[property="og:image"]', "content");
      const title = get('meta[property="og:title"]', "content");
      return { description, ogImage, title };
    });

    // Trích xuất số follower
    let followers = null;
    if (data.description) {
      const match = data.description.match(/([\d.,]+)\s*(?:followers|Follower)/i);
      if (match) followers = match[1];
    }

    await page.close();
    return {
      ok: true,
      username,
      avatar: data.ogImage,
      title: data.title,
      followers,
      description: data.description,
    };
  } catch (err) {
    await page.close();
    return { ok: false, error: err.message };
  }
}

// 🔄 API endpoint
app.get("/api/tiktok", async (req, res) => {
  const user = (req.query.user || "").trim().replace(/^@/, "");
  if (!user) return res.status(400).json({ ok: false, error: "Thiếu username" });

  // ⚡ Dùng cache nếu còn trong thời gian TTL
  if (cache[user] && Date.now() - cache[user].time < CACHE_TTL) {
    console.log(`⚡ Cache hit: ${user}`);
    return res.json(cache[user].data);
  }

  console.log(`🔍 Fetching: ${user}`);
  const result = await fetchTikTokProfile(user);
  cache[user] = { time: Date.now(), data: result };
  res.json(result);
});

// 🧹 Đóng trình duyệt khi tắt server
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Server chạy tại http://localhost:${PORT}`)
);
