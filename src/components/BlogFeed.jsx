import { useEffect, useState } from "react";

let blogCache = null;
let blogCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function fixCodeforcesHtml(html = "") {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      if (src.startsWith("//")) img.setAttribute("src", `https:${src}`);
      else if (src.startsWith("/")) img.setAttribute("src", `https://codeforces.com${src}`);
    });
    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("//")) a.setAttribute("href", `https:${href}`);
      else if (href.startsWith("/")) a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    });
    return doc.body.innerHTML;
  } catch {
    return "";
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

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();

    if (blogCache && now - blogCacheTime < CACHE_TTL) {
      setBlogs(blogCache);
      setLoading(false);
      return;
    }

    fetch("/cf/")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const topics = [...doc.querySelectorAll(".topic")];
        const parsedBlogs = topics
          .map((topic) => {
            try {
              const titleLink =
                topic.querySelector(".title a[href*='/blog/entry/']") ||
                topic.querySelector("a[href*='/blog/entry/']");
              if (!titleLink) return null;

              const title = titleLink?.textContent?.trim() || "Untitled";
              const id = extractBlogId(titleLink.getAttribute("href") || "");
              if (!id) return null;

              const authorLink = topic.querySelector("a[href*='/profile/']");
              const authorHandle = authorLink?.textContent?.trim() || "Unknown";

              const rawContent =
                topic.querySelector(".ttypography")?.innerHTML ||
                topic.querySelector(".content")?.innerHTML ||
                topic.querySelector("p")?.innerHTML ||
                "";

              const content = fixCodeforcesHtml(rawContent);
              const voteText = topic.querySelector(".vote-score")?.textContent?.trim() || "0";
              const rating = Number(voteText.replace("+", "")) || 0;

              const commentLink = [...topic.querySelectorAll("a")].find((a) =>
                a.getAttribute("href")?.includes("#comments")
              );
              const commentsCount = Number(commentLink?.textContent?.match(/\d+/)?.[0] || 0);

              // ✅ FIX 1: Extract CF's precomputed time text
              const timeText = topic.querySelector(".date")?.textContent?.trim()
                || topic.querySelector("span.format-humantime")?.textContent?.trim()
                || "";

              return {
                id,
                title,
                authorHandle,
                content,
                rating,
                commentsCount,
                creationTimeSeconds: Math.floor(Date.now() / 1000),
                timeText,
              };
            } catch (err) {
              console.warn("[BlogFeed] Failed to parse topic:", err);
              return null;
            }
          })
          .filter(Boolean)
          .slice(0, 10);

        blogCache = parsedBlogs;
        blogCacheTime = Date.now();
        setBlogs(parsedBlogs);
        setLoading(false);
        const handles = [...new Set(parsedBlogs.map((b) => b.authorHandle))]
          .filter(Boolean)
          .join(";");
        if (!handles) return;
        fetch(`/api/user.info?handles=${encodeURIComponent(handles)}`)
          .then((res) => res.json())
          .then((data) => {
            if (cancelled) return;
            if (data.status === "OK") {
              const map = {};
              data.result.forEach((user) => {
                map[user.handle] = user.rating;
              });
              setAuthorRatings(map);
            }
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[BlogFeed] Fetch failed:", err);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (url) => window.open(url, "_blank");
  if (loading) return <p className="loading">Loading blogs...</p>;
  if (error) return (
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

  if (blogs.length === 0) return (
    <p className="loading">
      No blogs found. CF may have updated their HTML.{" "}
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
      {blogs.map((blog) => (
        <div className="blog-card" key={blog.id}>
          <h2 className="blog-title">
            <span
              onClick={() => open(`https://codeforces.com/blog/entry/${blog.id}`)}
              style={{ cursor: "pointer" }}
            >
              {blog.title}
            </span>
          </h2>
          <p className="blog-meta">
            By{" "}
            <span
              className={`blog-author ${getRatingClass(authorRatings[blog.authorHandle])}`}
              onClick={() => open(`https://codeforces.com/profile/${blog.authorHandle}`)}
              style={{ cursor: "pointer" }}
            >
              {blog.authorHandle}
            </span>
            {", "}
            {/* ✅ FIX 2: Use CF's time text with fallback */}
            <span className="blog-time">{blog.timeText || timeAgo(blog.creationTimeSeconds)}</span>
          </p>

          {blog.content && (
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />
          )}

          <span
            className="blog-readmore"
            onClick={() => open(`https://codeforces.com/blog/entry/${blog.id}`)}
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
                className={`blog-footer-author ${getRatingClass(authorRatings[blog.authorHandle])}`}
                onClick={() => open(`https://codeforces.com/profile/${blog.authorHandle}`)}
                style={{ cursor: "pointer" }}
              >
                👤 {blog.authorHandle}
              </span>
              {/* ✅ FIX 3: Use CF's time text in footer with fallback */}
              <span className="blog-footer-time">
                📅 {blog.timeText || timeAgo(blog.creationTimeSeconds)}
              </span>
              <span
                className="blog-footer-comments"
                onClick={() => open(`https://codeforces.com/blog/entry/${blog.id}#comments`)}
                style={{ cursor: "pointer" }}
              >
                💬 {blog.commentsCount || 0}
              </span>
            </span>
          </div>

          <hr />
        </div>
      ))}
    </div>
  );
}

export default BlogFeed;