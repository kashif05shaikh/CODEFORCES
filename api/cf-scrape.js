export default async function handler(req, res) {
  const path = req.url.replace("/api/cf-scrape", "") || "/";
  const cfRes = await fetch(`https://codeforces.com${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  const data = await cfRes.text();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/html");
  res.status(cfRes.status).send(data);
}