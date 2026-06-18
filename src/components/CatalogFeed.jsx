import { useCallback, useEffect, useRef, useState } from "react";
import "./CatalogFeed.css";
const REFRESH_MS = 5 * 60 * 1000;
const CATALOG_SOURCES = [
  "/cf/catalog",
  "https://api.allorigins.win/raw?url=https://codeforces.com/catalog",
  "https://corsproxy.io/?https://codeforces.com/catalog",
];
function absoluteLinks(root) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && href.startsWith("/")) {
      a.setAttribute("href", `https://codeforces.com${href}`);
    }
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noreferrer");
  });
}
function cleanUnsafe(root) {
  root.querySelectorAll("script, iframe, object, embed").forEach((el) => el.remove());
  root.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });
}
function findHistoryBox(doc) {
  return [...doc.querySelectorAll(".roundbox, .sidebox, div")].find((box) => {
    const text = box.textContent.replace(/\s+/g, " ").trim();
    return text.startsWith("→ History") || text.startsWith("History");
  });
}
function findCatalogContent(doc) {
  const catalog = doc.querySelector("._CatalogViewFrame_catalog");
  if (!catalog) return null;
  const wrapper = document.createElement("div");
  const title = document.createElement("div");
  title.className = "cf-catalog-title";
  title.textContent = "Catalog";
  wrapper.appendChild(title);
  wrapper.appendChild(catalog.cloneNode(true));
  return wrapper;
}
async function fetchCatalogHtml() {
  let lastError = null;
  for (const source of CATALOG_SOURCES) {
    try {
      const joiner = source.includes("?") ? "&" : "?";
      const response = await fetch(`${source}${joiner}t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (!html.includes("_CatalogViewFrame_catalog")) {
        throw new Error("Invalid catalog HTML");
      }
      return html;
    } catch (err) {
      lastError = err;
      console.warn("[CatalogFeed] source failed:", source, err.message);
    }
  }
  throw lastError || new Error("All catalog sources failed");
}
function parseCatalogPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const catalogNode = findCatalogContent(doc);
  const historyNode = findHistoryBox(doc);
  if (!catalogNode) throw new Error("Catalog folder tree not found");
  cleanUnsafe(catalogNode);
  absoluteLinks(catalogNode);
  let historyHtml = "";
  if (historyNode) {
    const historyClone = historyNode.cloneNode(true);
    cleanUnsafe(historyClone);
    absoluteLinks(historyClone);
    historyHtml = historyClone.innerHTML;
  }
  return {
    catalogHtml: catalogNode.innerHTML,
    historyHtml,
  };
}
export default function CatalogFeed() {
  const catalogRef = useRef(null);
  const [catalogHtml, setCatalogHtml] = useState("");
  const [historyHtml, setHistoryHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const html = await fetchCatalogHtml();
      const parsed = parseCatalogPage(html);
      setCatalogHtml(parsed.catalogHtml);
      setHistoryHtml(parsed.historyHtml);
    } catch (err) {
      setError(`Failed to load live Codeforces catalog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const showAll = useCallback(() => {
    const root = catalogRef.current;
    if (!root) return;

    root.classList.remove("cf-folders-only");
    root.querySelectorAll("._catalogFolder").forEach((folder) => {
      folder.classList.remove("cf-collapsed");
    });
  }, []);

  const showFoldersOnly = useCallback(() => {
    const root = catalogRef.current;
    if (!root) return;

    root.classList.add("cf-folders-only");
    root.querySelectorAll("._catalogFolder").forEach((folder) => {
      folder.classList.remove("cf-collapsed");
    });
  }, []);

  useEffect(() => {
    load();

    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const root = catalogRef.current;
    if (!root) return;

    const cleanups = [];

    root.querySelectorAll("._catalogFolder").forEach((folder) => {
      const name = folder.querySelector(":scope > ._name");
      if (!name) return;

      name.setAttribute("role", "button");
      name.setAttribute("tabindex", "0");

      const toggle = (event) => {
        event.preventDefault();
        folder.classList.toggle("cf-collapsed");
      };

      const keyToggle = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          toggle(event);
        }
      };

      name.addEventListener("click", toggle);
      name.addEventListener("keydown", keyToggle);

      cleanups.push(() => {
        name.removeEventListener("click", toggle);
        name.removeEventListener("keydown", keyToggle);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [catalogHtml]);

  if (loading) {
    return <div className="catalog-loading">Loading live Codeforces catalog...</div>;
  }

  return (
    <div className="cf-catalog-layout">
      <main className="cf-catalog-main">
        {error ? (
          <div className="catalog-error">
            {error}
            <br />
            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="cf-live-controls">
              <input className="cf-catalog-filter" aria-label="Catalog filter" />
              <button type="button" className="cf-icon-btn" onClick={showAll} title="Expand all">
                ▸
              </button>
              <button type="button" className="cf-icon-btn" onClick={showFoldersOnly} title="Collapse to folders">
                ◼
              </button>
            </div>

            <div
              ref={catalogRef}
              className="cf-catalog-content"
              dangerouslySetInnerHTML={{ __html: catalogHtml }}
            />
          </>
        )}
      </main>

      <aside className="cf-history-panel">
        {historyHtml ? (
          <div dangerouslySetInnerHTML={{ __html: historyHtml }} />
        ) : (
          <div>
            <div className="sidebar-title">→ History</div>
            <div className="history-empty">Loading history...</div>
          </div>
        )}
      </aside>
    </div>
  );
}