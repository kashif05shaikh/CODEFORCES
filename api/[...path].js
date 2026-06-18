export default async function handler(req, res) {
  const path = req.url.replace("/api", "");
  const cfRes = await fetch(`https://codeforces.com/api${path}`);
  const data = await cfRes.text();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  res.status(cfRes.status).send(data);
}