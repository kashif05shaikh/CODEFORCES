import { useEffect, useState } from "react";

let blogCache = null;
let blogCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function stripHtml(str = "") {
  return str.replace(/<[^>]*>/g, "").trim();
}

function fixLinks(html = "") {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("//")) img.setAttribute("src", `https:${src}`);
      else if (src.startsWith("/")) img.setAttribute("src", `https://codeforces.com${src}`);
    });
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("//")) a.setAttribute("href", `https:${href}`);
      else if (href.startsWith("/")) a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

function timeAgo(seconds) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

function getRatingClass(rating) {
  if (rating === undefined || rating === null) return "rating-newbie";
  if (rating >= 3000) return "rating-legendary";
  if (rating >= 2600) return "rating-international-grandmaster";
  if (rating >= 2400) return "rating-grandmaster";
  if (rating >= 2300) return "rating-international-master";
  if (rating >= 2100) return "rating-master";
  if (rating >= 1900) return "rating-candidate-master";
  if (rating >= 1600) return "rating-expert";
  if (rating >= 1400) return "rating-specialist";
  if (rating >= 1200) return "rating-pupil";
  return "rating-newbie";
}

function extractBlogId(href = "") {
  const match = href.match(/\/blog\/entry\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function BlogFeed() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [authorRatings, setAuthorRatings] = useState({});
  const blogFeedUrl = import.meta.env.DEV ? "/cf/" : "/api/cf-scrape/";

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();

    if (blogCache && now - blogCacheTime < CACHE_TTL) {
      setBlogs(blogCache);
      setLoading(false);
      return;
    }

    fetch(blogFeedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");

        // CF uses div.topic or div.has-topic-id.topic
        const topics = [
          ...doc.querySelectorAll("div.topic"),
          ...doc.querySelectorAll("div.has-topic-id"),
        ];

        // Deduplicate by element reference
        const unique = [...new Set(topics)];

        const parsedBlogs = unique
          .map((topic) => {
            try {
              // Title link
              const titleLink =
                topic.querySelector(".title a[href*='/blog/entry/']") ||
                topic.querySelector("a[href*='/blog/entry/']");
              if (!titleLink) return null;

              const title = stripHtml(titleLink.textContent || "Untitled");
              const id = extractBlogId(titleLink.getAttribute("href") || "");
              if (!id) return null;

              // Author
              const authorLink = topic.querySelector("a[href*='/profile/']");
              const authorHandle = authorLink?.textContent?.trim() || "Unknown";

              // Content preview
              const rawContent =
                topic.querySelector(".ttypography")?.innerHTML ||
                topic.querySelector(".content")?.innerHTML ||
                "";
              const content = fixLinks(rawContent);

              // Vote score
              const voteText = topic.querySelector(".vote-score")?.textContent?.trim() || "0";
              const rating = Number(voteText.replace("+", "")) || 0;

              // Comments count
              const commentLink = [...topic.querySelectorAll("a")].find((a) =>
                a.getAttribute("href")?.includes("#comments")
              );
              const commentsCount = Number(commentLink?.textContent?.match(/\d+/)?.[0] || 0);

              // Time
              const timeEl =
                topic.querySelector("span.format-humantime") ||
                topic.querySelector(".date");
              const timeText = timeEl?.textContent?.trim() || "";
              const timeSeconds =
                Number(timeEl?.getAttribute("title")?.match(/(\d+)/)?.[1]) ||
                Math.floor(Date.now() / 1000);

              return { id, title, authorHandle, content, rating, commentsCount, timeText, timeSeconds };
            } catch (err) {
              console.warn("[BlogFeed] parse error:", err);
              return null;
            }
          })
          .filter(Boolean)
          .slice(0, 10);

        blogCache = parsedBlogs;
        blogCacheTime = Date.now();
        setBlogs(parsedBlogs);
        setLoading(false);

        // Fetch author ratings
        const handles = [...new Set(parsedBlogs.map((b) => b.authorHandle))]
          .filter(Boolean)
          .join(";");
        if (!handles) return;

        fetch(`/api/user.info?handles=${encodeURIComponent(handles)}`)
          .then((r) => r.json())
          .then((d) => {
            if (cancelled || d.status !== "OK") return;
            const map = {};
            d.result.forEach((u) => { map[u.handle] = u.rating; });
            setAuthorRatings(map);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[BlogFeed] Fetch failed:", err);
        setError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const open = (url) => window.open(url, "_blank");

  if (loading) return <p className="loading">Loading blogs...</p>;

  if (error)
    return (
      <p className="loading">
        Failed to load blogs.{" "}
        <span
          onClick={() => open("https://codeforces.com")}
          style={{ cursor: "pointer", color: "#0000cc", textDecoration: "underline" }}
        >
          View on Codeforces →
        </span>
      </p>
    );

  if (blogs.length === 0)
    return (
      <p className="loading">
        No blogs found.{" "}
        <span
          onClick={() => open("https://codeforces.com")}
          style={{ cursor: "pointer", color: "#0000cc", textDecoration: "underline" }}
        >
          View on Codeforces →
        </span>
      </p>
    );

  return (
    <div className="blog-feed">
      {blogs.map((blog) => {
        const ratingClass = getRatingClass(authorRatings[blog.authorHandle]);
        const timeStr = blog.timeText || timeAgo(blog.timeSeconds);
        const blogUrl = `https://codeforces.com/blog/entry/${blog.id}`;
        const profileUrl = `https://codeforces.com/profile/${blog.authorHandle}`;

        return (
          <div className="blog-card" key={blog.id}>
            <h2 className="blog-title">
              <span onClick={() => open(blogUrl)} style={{ cursor: "pointer" }}>
                {blog.title}
              </span>
            </h2>

            <p className="blog-meta">
              By{" "}
              <span
                className={`blog-author ${ratingClass}`}
                onClick={() => open(profileUrl)}
                style={{ cursor: "pointer" }}
              >
                {blog.authorHandle}
              </span>
              {", "}
              <span className="blog-time">{timeStr}</span>
            </p>

            {blog.content && (
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            )}

            <span
              className="blog-readmore"
              onClick={() => open(blogUrl)}
              style={{ cursor: "pointer" }}
            >
              Full text and comments »
            </span>

            <div className="blog-footer">
              <span className="vote-box">
                <button className="vote-btn vote-up" type="button">▲</button>
                <span className={`vote-score${blog.rating < 0 ? " negative" : ""}`}>
                  {blog.rating > 0 ? `+${blog.rating}` : blog.rating}
                </span>
                <button className="vote-btn vote-down" type="button">▼</button>
              </span>

              <span className="blog-footer-right">
                <span
                  className={`blog-footer-author ${ratingClass}`}
                  onClick={() => open(profileUrl)}
                  style={{ cursor: "pointer" }}
                >
                  👤 {blog.authorHandle}
                </span>
                <span className="blog-footer-time">📅 {timeStr}</span>
                <span
                  className="blog-footer-comments"
                  onClick={() => open(`${blogUrl}#comments`)}
                  style={{ cursor: "pointer" }}
                >
                  💬 {blog.commentsCount}
                </span>
              </span>
            </div>

            <hr />
          </div>
        );
      })}
    </div>
  );
}

export default BlogFeed;
