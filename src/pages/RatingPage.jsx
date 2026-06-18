import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "./RatingPage.css";
function absoluteUrl(value = "") {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://codeforces.com${value}`;
  return value;
}
function fixLinks(root) {
  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/")) {
      a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    }
  });
  root.querySelectorAll("img").forEach((img) => {
    img.setAttribute("src", absoluteUrl(img.getAttribute("src") || ""));
  });
}
function extractFilters(doc) {
  const page = doc.querySelector("#pageContent") || doc.body;
  const form = page.querySelector("form");
  if (!form) return "";
  const clone = form.cloneNode(true);
  clone.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  fixLinks(clone);
  return clone.innerHTML;
}
function extractRatings(doc) {
  const table = doc.querySelector(".datatable table") || doc.querySelector("#pageContent table");
  if (!table) return [];
  return [...table.querySelectorAll("tbody tr")]
    .map((row) => {
      const cells = [...row.children];
      if (cells.length < 4) return null;
      const rank = cells[0].textContent.trim();
      const whoCell = cells[1].cloneNode(true);
      const contribution = cells[2].textContent.trim();
      const rating = cells[3].textContent.trim();
      fixLinks(whoCell);
      return {
        rank,
        whoHtml: whoCell.innerHTML,
        contribution,
        rating,
      };
    })
    .filter(Boolean);
}
function extractRatingTitle(doc) {
  const caption = doc.querySelector(".datatable .caption");
  return caption?.textContent.trim() || "Rating: users participated in recent 6 months";
}
function extractRatingPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    title: extractRatingTitle(doc),
    filters: extractFilters(doc),
    ratings: extractRatings(doc),
  };
}
export default function RatingPage() {
  const [page, setPage] = useState({
    loading: true,
    error: "",
    title: "",
    filters: "",
    ratings: [],
  });
  useEffect(() => {
    let cancelled = false;
    async function loadRatings() {
      try {
        setPage({
          loading: true,
          error: "",
          title: "",
          filters: "",
          ratings: [],
        });
        const response = await fetch("/cf/ratings");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        const parsed = extractRatingPage(html);
        if (!cancelled) {
          setPage({
            loading: false,
            error: "",
            title: parsed.title,
            filters: parsed.filters,
            ratings: parsed.ratings,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPage({
            loading: false,
            error: `Failed to load live ratings: ${error.message}`,
            title: "",
            filters: "",
            ratings: [],
          });
        }
      }
    }
    loadRatings();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <>
      <Navbar />
      <div className="container rating-page">
        {page.loading && <div className="rating-loading">Loading live ratings...</div>}
        {page.error && <div className="rating-error">{page.error}</div>}
        {!page.loading && !page.error && (
          <div className="rating-layout">
            <main className="rating-main">
              <div
                className="rating-filters"
                dangerouslySetInnerHTML={{ __html: page.filters }}
              />
              <section className="rating-box">
                <div className="rating-caption">
                  <span>{page.title}</span>
                  <span className="rating-search-icon" />
                </div>
                <table className="rating-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Who</th>
                      <th>#</th>
                      <th>=</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.ratings.map((user) => (
                      <tr key={`${user.rank}-${user.rating}`}>
                        <td>{user.rank}</td>
                        <td dangerouslySetInnerHTML={{ __html: user.whoHtml }} />
                        <td>{user.contribution}</td>
                        <td>{user.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </main>
            <Sidebar />
          </div>
        )}
      </div>
    </>
  );
}