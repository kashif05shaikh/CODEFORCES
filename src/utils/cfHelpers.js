// src/utils/cfHelpers.js

// ─── Rating color class (matches real Codeforces) ──────────────
export function getRatingClass(rating) {
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

export function getRatingLabel(rating) {
  if (!rating) return "Unrated";
  if (rating >= 3000) return "Legendary Grandmaster";
  if (rating >= 2600) return "International Grandmaster";
  if (rating >= 2400) return "Grandmaster";
  if (rating >= 2300) return "International Master";
  if (rating >= 2100) return "Master";
  if (rating >= 1900) return "Candidate Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1400) return "Specialist";
  if (rating >= 1200) return "Pupil";
  return "Newbie";
}

// ─── Time ago (human readable) ──────────────────────────────────
export function timeAgo(seconds) {
  if (!seconds) return "";
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

// ─── Strip HTML ─────────────────────────────────────────────────
export function stripHtml(html = "") {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  } catch {
    return "";
  }
}

// ─── Strip LaTeX-style $...$ wrappers (CF formula syntax) ──────
// FIX: original regex was broken ($ is special in regex)
export function stripLatex(text = "") {
  if (!text) return "";
  return text
    // $$$x$$$ → x (CF triple-dollar inline math)
    .replace(/\${3}([^$]+?)\${3}/g, "$1")
    // $$x$$ → x
    .replace(/\${2}([^$]+?)\${2}/g, "$1")
    // $x$ → x
    .replace(/\$([^$\n]+?)\$/g, "$1");
}

// ─── Fix CF HTML (relative URLs → absolute) ─────────────────────
export function fixCodeforcesHtml(html = "") {
  try {
    const cleaned = stripLatex(html);
    const doc = new DOMParser().parseFromString(cleaned, "text/html");

    doc.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      if (src.startsWith("//")) img.setAttribute("src", `https:${src}`);
      else if (src.startsWith("/"))
        img.setAttribute("src", `https://codeforces.com${src}`);
    });

    doc.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("//")) a.setAttribute("href", `https:${href}`);
      else if (href.startsWith("/"))
        a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    });

    return doc.body.innerHTML;
  } catch {
    return "";
  }
}

// ─── Absolute URL helper ────────────────────────────────────────
export function absoluteUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `https://codeforces.com${url}`;
  return url;
}

// ─── Extract blog ID from /blog/entry/12345 ─────────────────────
export function extractBlogId(href = "") {
  const match = href.match(/\/blog\/entry\/(\d+)/);
  return match ? Number(match[1]) : null;
}

// ─── Avatar URL normalizer ──────────────────────────────────────
export const DEFAULT_AVATAR = "https://userpic.codeforces.org/no-title.jpg";

export function normalizeAvatar(titlePhoto) {
  if (!titlePhoto || titlePhoto.includes("no-title")) return DEFAULT_AVATAR;
  if (titlePhoto.startsWith("//")) return `https:${titlePhoto}`;
  if (titlePhoto.startsWith("/")) return `https://codeforces.com${titlePhoto}`;
  return titlePhoto;
}