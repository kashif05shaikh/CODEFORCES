import { useEffect, useState } from "react";
import "./TopFeed.css";
const CF = "https://codeforces.com";
const DEFAULT_AVATAR = "https://userpic.codeforces.org/no-title.jpg";
function stripHtml(html = "") {
  try {
    return new DOMParser().parseFromString(html, "text/html").body.textContent.trim();
  } 
  catch { return html.replace(/<[^>]*>/g, "").trim(); }
}
function absUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${CF}${url}`;
  return url;
}
function fixHtml(html = "") {
  try {
    const doc = new DOMParser().parseFromString(
      html.replace(/\$\$\$([^$]*)\$\$\$/g, "$1").replace(/\$([^$]*)\$/g, "$1"),
      "text/html"
    );
    doc.querySelectorAll("script,style").forEach((n) => n.remove());
    doc.querySelectorAll("img").forEach((img) => img.setAttribute("src", absUrl(img.getAttribute("src"))));
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", absUrl(a.getAttribute("href")));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    });
    return doc.body.innerHTML;
  } 
  catch { return ""; }
}
function getRatingClass(r) {
  if (r >= 3000) return "rating-legendary";
  if (r >= 2400) return "rating-red";
  if (r >= 2100) return "rating-orange";
  if (r >= 1900) return "rating-violet";
  if (r >= 1600) return "rating-blue";
  if (r >= 1400) return "rating-cyan";
  if (r >= 1200) return "rating-green";
  return "rating-gray";
}
function timeAgo(unix) {
  const d = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (d < 60) return `${d} seconds ago`;
  if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
  if (d < 604800) return `${Math.floor(d / 86400)} days ago`;
  return `${Math.floor(d / 604800)} weeks ago`;
}
async function fetchText(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}
async function cfApi(endpoint, params = {}) {
  const url = new URL(`/api/${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.status !== "OK") throw new Error(d.comment || "CF API error");
  return d.result;
}
function parseTopPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const topics = [...doc.querySelectorAll("div.topic")];
  return topics.map((t) => {
    const titleLink =
      t.querySelector("div.title a[href*='/blog/entry/']") ||
      t.querySelector("a[href*='/blog/entry/']");
    if (!titleLink) return null;
    const href = absUrl(titleLink.getAttribute("href"));
    const idMatch = href.match(/\/blog\/entry\/(\d+)/);
    if (!idMatch) return null;
    const id = Number(idMatch[1]);
    const title = stripHtml(titleLink.innerHTML);
    const infoEl = t.querySelector(".info, .date, .entry-info");
    const authorLink = infoEl
      ? infoEl.querySelector("a[href*='/profile/']")
      : t.querySelector("a[href*='/profile/']");
    const authorHandle = authorLink
      ? decodeURIComponent((authorLink.getAttribute("href").match(/\/profile\/([^/?#]+)/) || [])[1] || "")
      : "";
    const tags = [];
    infoEl?.querySelectorAll("a[href*='/tag/']").forEach((a) => {
      const tag = a.textContent.trim();
      if (tag) tags.push({ label: tag, href: absUrl(a.getAttribute("href")) });
    });
    const infoText = infoEl ? infoEl.textContent.replace(/\s+/g, " ").trim() : "";
    const timeMatch =
      infoText.match(/(\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)/i);
    const timeText = timeMatch ? timeMatch[1] : "";
    let rating = 0;
    const plusEl = t.querySelector("span.plus");
    const minusEl = t.querySelector("span.minus");
    if (plusEl) rating = parseInt(plusEl.textContent.replace(/[^0-9]/g, ""), 10) || 0;
    else if (minusEl) rating = -(parseInt(minusEl.textContent.replace(/[^0-9]/g, ""), 10) || 0);
    else {
      const m = t.textContent.match(/\+(\d+)/);
      if (m) rating = parseInt(m[1], 10);
    }
    let commentsCount = 0;
    t.querySelectorAll("a").forEach((a) => {
      const h = a.getAttribute("href") || "";
      if (h.includes("#comments") || h.includes("comment")) {
        const n = parseInt(a.textContent.match(/\d+/)?.[0] || "0", 10);
        if (n > commentsCount) commentsCount = n;
      }
    });
    if (commentsCount === 0) {
      const m = t.textContent.match(/(\d+)\s*comment/i);
      if (m) commentsCount = parseInt(m[1], 10);
    }
    const contentEl =
      t.querySelector(".ttypography") ||
      t.querySelector(".content") ||
      t.querySelector(".topic-content");
    const content = contentEl ? fixHtml(contentEl.innerHTML) : "";
    return { id, title, authorHandle, rating, commentsCount, timeText, content, tags };
  }).filter(Boolean);
}
function parseTopCommentsHtml(html) {
  if (!html || html.includes("Just a moment") || html.includes("cf-challenge")) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = [...doc.querySelectorAll("table.comment-table")];
  console.log("[topComments] comment-table count:", tables.length);
  return tables.slice(0, 30).map((table, index) => {
    const avatarImg = table.querySelector(".avatar img");
    const avatarUrl = absUrl(avatarImg?.getAttribute("src") || "") || DEFAULT_AVATAR;
    const authorLink = table.querySelector(".avatar a.rated-user") ||
                       table.querySelector(".avatar div a");
    const authorHandle = decodeURIComponent(
      (authorLink?.getAttribute("href")?.match(/\/profile\/([^/?#]+)/) || [])[1] || ""
    );
    const infoDiv = table.querySelector(".info");
    const sourceAuthorLink = infoDiv?.querySelector('a[href*="/profile/"]');
    const sourceAuthorHandle = decodeURIComponent(
      (sourceAuthorLink?.getAttribute("href")?.match(/\/profile\/([^/?#]+)/) || [])[1] || ""
    );
    const blogLink = infoDiv?.querySelector('a[href*="/blog/entry/"]');
    const sourceTitle = stripHtml(blogLink?.innerHTML || "Blog entry");
    const sourceUrl = absUrl(blogLink?.getAttribute("href") || "");
    const timeEl = infoDiv?.querySelector(".format-humantime");
    const timeText = timeEl?.textContent?.trim() || "";
    const scoreSpan = table.querySelector("span[commentid] span");
    const scoreText = scoreSpan?.textContent?.trim() || "0";
    const rating = parseInt(scoreText.replace(/[^0-9\-+]/g, ""), 10) || 0;
    const bodyEl = table.querySelector(".ttypography");
    const content = bodyEl ? fixHtml(bodyEl.innerHTML) : "";
    return {
      id: `${authorHandle}-${index}`,
      authorHandle,
      sourceAuthorHandle,
      sourceTitle,
      sourceUrl,
      avatarUrl,
      rating,
      timeText,
      content,
    };
  }).filter((c) => c.authorHandle);
}
async function fetchTopComments() {
  const html = await fetchText("/cf/topComments?locale=en&mobile=false");
  const parsed = parseTopCommentsHtml(html);
  if (!parsed.length) throw new Error("No comments found");
  return parsed;
}
async function fetchUserInfo(handles) {
  const uniq = [...new Set(handles.filter(Boolean))];
  if (!uniq.length) return { ratings: {}, avatars: {} };
  const ratings = {};
  const avatars = {};
  for (let i = 0; i < uniq.length; i += 50) {
    try {
      const users = await cfApi("user.info", { handles: uniq.slice(i, i + 50).join(";") });
      users.forEach((u) => {
        ratings[u.handle] = u.rating || 0;
        const raw = u.titlePhoto || "";
        avatars[u.handle] = raw && !raw.includes("no-title")
          ? (raw.startsWith("//") ? `https:${raw}` : raw)
          : DEFAULT_AVATAR;
      });
    } catch (_) {}
  }
  return { ratings, avatars };
}
function Handle({ handle, rating, avatarUrl }) {
  if (!handle) return null;
  return (
    <a className={`cf-handle ${getRatingClass(rating)}`}
       href={`${CF}/profile/${handle}`} target="_blank" rel="noreferrer">
      {avatarUrl && <img className="tf-inline-avatar" src={avatarUrl} alt="" loading="lazy" />}
      {handle}
    </a>
  );
}
function BlogCard({ blog, ratings, avatars }) {
  const score = blog.rating;
  const userRating = ratings[blog.authorHandle] || 0;
  const avatarUrl = avatars[blog.authorHandle];
  return (
    <article className="tf-blog-card">
      <h3 className="tf-blog-title">
        <a href={`${CF}/blog/entry/${blog.id}`} target="_blank" rel="noreferrer">
          {blog.title}
        </a>
      </h3>

      <div className="tf-blog-meta">
        <span className="tf-by">By </span>
        <Handle handle={blog.authorHandle} rating={userRating} avatarUrl={avatarUrl} />
        {blog.tags?.map((tag) => (
          <span key={tag.label} className="tf-meta-item">
            <span className="tf-meta-sep">, </span>
            <a className="tf-tag-link" href={tag.href} target="_blank" rel="noreferrer">{tag.label}</a>
          </span>
        ))}
        {blog.timeText && (
          <span className="tf-meta-item">
            <span className="tf-meta-sep">, </span>
            <span className="tf-time">{blog.timeText}</span>
          </span>
        )}
      </div>

      {blog.content && (
        <div className="tf-blog-preview" dangerouslySetInnerHTML={{ __html: blog.content }} />
      )}

      <a className="tf-readmore" href={`${CF}/blog/entry/${blog.id}`} target="_blank" rel="noreferrer">
        Full text and comments »
      </a>

      <div className="tf-blog-footer">
        <span className="tf-vote-box">
          <span className="tf-vote-arrow">▲</span>
          <span className={`tf-vote-score ${score < 0 ? "neg" : "pos"}`}>
            {score > 0 ? `+${score}` : score}
          </span>
          <span className="tf-vote-arrow">▼</span>
        </span>
        <div className="tf-footer-right">
          {avatarUrl && <img className="tf-footer-icon" src={avatarUrl} alt="" loading="lazy" />}
          <a className={`tf-footer-author ${getRatingClass(userRating)}`}
             href={`${CF}/profile/${blog.authorHandle}`} target="_blank" rel="noreferrer">
            {blog.authorHandle}
          </a>
          <span className="tf-footer-sep">·</span>
          <span className="tf-time">{blog.timeText}</span>
          <span className="tf-footer-sep">·</span>
          <a className="tf-footer-comments"
             href={`${CF}/blog/entry/${blog.id}#comments`} target="_blank" rel="noreferrer">
            💬 {blog.commentsCount}
          </a>
        </div>
      </div>
    </article>
  );
}
function CommentCard({ comment, ratings, avatars }) {
  const authorRating = ratings[comment.authorHandle] || 0;
  const sourceRating = ratings[comment.sourceAuthorHandle] || 0;
  return (
    <article className="tf-comment-card">
      <div className="tf-comment-top">
        <img className="tf-avatar"
          src={avatars[comment.authorHandle] || comment.avatarUrl || DEFAULT_AVATAR}
          alt={comment.authorHandle} loading="lazy" />
        <div className="tf-comment-meta">
          <Handle handle={comment.authorHandle} rating={authorRating} />
          <div className="tf-comment-source">
            on <Handle handle={comment.sourceAuthorHandle} rating={sourceRating} />
            {" → "}
            <a className="tf-source-link" href={comment.sourceUrl} target="_blank" rel="noreferrer">
              {comment.sourceTitle}
            </a>
            {comment.timeText && <span className="tf-time">, {comment.timeText}</span>}
          </div>
        </div>
        <span className={`tf-comment-score ${comment.rating < 0 ? "neg" : "pos"}`}>
          {comment.rating > 0 ? `+${comment.rating}` : comment.rating}
        </span>
      </div>
      {comment.content && (
        <div className="tf-comment-body" dangerouslySetInnerHTML={{ __html: comment.content }} />
      )}
    </article>
  );
}
function Spinner({ label }) {
  return (
    <div className="tf-spinner-row">
      <div className="tf-spinner" /><span>{label}</span>
    </div>
  );
}
export default function TopFeed() {
  const [tab, setTab] = useState("posts");
  const [blogs, setBlogs] = useState([]);
  const [blogsState, setBlogsState] = useState("loading");
  const [blogsErr, setBlogsErr] = useState("");
  const [comments, setComments] = useState([]);
  const [commState, setCommState] = useState("idle");
  const [commErr, setCommErr] = useState("");
  const [ratings, setRatings] = useState({});
  const [avatars, setAvatars] = useState({});
  function mergeUsers({ ratings: r, avatars: a }) {
    if (r) setRatings((p) => ({ ...p, ...r }));
    if (a) setAvatars((p) => ({ ...p, ...a }));
  }
  useEffect(() => {
    let dead = false;
    setBlogsState("loading");
    fetchText("/cf/top?locale=en&mobile=false")
      .then((html) => {
        console.log("[top] HTML length:", html.length, "snippet:", html.slice(0, 200));
        const parsed = parseTopPage(html);
        console.log("[top] parsed blogs:", parsed.length);
        if (!parsed.length) throw new Error("No blogs found — selector mismatch");
        if (dead) return;
        setBlogs(parsed);
        setBlogsState("ok");
        fetchUserInfo(parsed.map((b) => b.authorHandle)).then(mergeUsers).catch(() => {});
      })
      .catch((e) => {
        if (dead) return;
        setBlogsErr(e.message);
        setBlogsState("error");
      });

    return () => { dead = true; };
  }, []);
  useEffect(() => {
    if (tab !== "comments") return;
    if (commState !== "idle") return;
    setCommState("loading");
    let dead = false;
    fetchTopComments()
      .then((parsed) => {
        if (dead) return;
        setComments(parsed);
        setCommState("ok");
        const handles = [...new Set(parsed.flatMap((c) => [c.authorHandle, c.sourceAuthorHandle]))];
        fetchUserInfo(handles).then(mergeUsers).catch(() => {});
      })
      .catch((e) => {
        if (dead) return;
        setCommErr(e.message);
        setCommState("error");
      });

    return () => { dead = true; };
  }, [tab]); 
  return (
    <div className="tf-feed">
      <div className="tf-tabs">
        <button type="button" className={`tf-tab ${tab === "posts" ? "active" : ""}`}
          onClick={() => setTab("posts")}>POSTS</button>
        <button type="button" className={`tf-tab ${tab === "comments" ? "active" : ""}`}
          onClick={() => setTab("comments")}>COMMENTS</button>
      </div>
      {tab === "posts" && (
        <section>
          <h2 className="tf-section-title">Top Recent Blog Posts</h2>
          {blogsState === "loading" && <Spinner label="Loading top blogs…" />}
          {blogsState === "error" && (
            <div className="tf-error">
              <span>⚠ {blogsErr}</span>
              <a href={`${CF}/top`} target="_blank" rel="noreferrer">View on Codeforces →</a>
            </div>
          )}
          {blogsState === "ok" && blogs.map((b) => (
            <BlogCard key={b.id} blog={b} ratings={ratings} avatars={avatars} />
          ))}
        </section>
      )}
      {tab === "comments" && (
        <section>
          <h2 className="tf-section-title">Top Comments</h2>
          {commState === "loading" && <Spinner label="Loading top comments…" />}
          {commState === "error" && (
            <div className="tf-error">
              <span>⚠ {commErr}</span>
              <a href={`${CF}/topComments`} target="_blank" rel="noreferrer">View on Codeforces →</a>
              <button type="button" className="tf-retry-btn" onClick={() => setCommState("idle")}>
                Retry
              </button>
            </div>
          )}
          {commState === "ok" && comments.map((c) => (
            <CommentCard key={c.id} comment={c} ratings={ratings} avatars={avatars} />
          ))}
        </section>
      )}
    </div>
  );
}
