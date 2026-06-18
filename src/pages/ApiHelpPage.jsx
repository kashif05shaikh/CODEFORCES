import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./ApiHelpPage.css";
const TABS = [
  { label: "INTRODUCTION", path: "/api-help", cfPath: "/apiHelp" },
  { label: "METHODS", path: "/api-help/methods", cfPath: "/apiHelp/methods" },
  { label: "RETURN OBJECTS", path: "/api-help/objects", cfPath: "/apiHelp/objects" },
];
function getCurrentTab(pathname) {
  if (pathname.endsWith("/methods")) return TABS[1];
  if (pathname.endsWith("/objects")) return TABS[2];
  return TABS[0];
}
function fixCodeforcesLinks(root) {
  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || "";

    if (href === "/apiHelp") {
      a.setAttribute("href", "/api-help");
    } else if (href === "/apiHelp/methods") {
      a.setAttribute("href", "/api-help/methods");
    } else if (href === "/apiHelp/objects") {
      a.setAttribute("href", "/api-help/objects");
    } else if (href.startsWith("/apiHelp#")) {
      a.setAttribute("href", href.replace("/apiHelp", "/api-help"));
    } else if (href.startsWith("/apiHelp/methods#")) {
      a.setAttribute("href", href.replace("/apiHelp/methods", "/api-help/methods"));
    } else if (href.startsWith("/apiHelp/objects#")) {
      a.setAttribute("href", href.replace("/apiHelp/objects", "/api-help/objects"));
    } else if (href.startsWith("/")) {
      a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    } else if (href.startsWith("https://codeforces.com")) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    }
  });
}
function extractApiPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const pageContent =
    doc.querySelector("#pageContent") ||
    doc.querySelector(".content-with-sidebar") ||
    doc.body;

  const sidebar =
    pageContent.querySelector(".roundbox.sidebox") ||
    pageContent.querySelector(".sidebar") ||
    doc.querySelector(".roundbox.sidebox") ||
    doc.querySelector(".sidebar");

  const sidebarClone = sidebar ? sidebar.cloneNode(true) : null;

  pageContent.querySelectorAll(
    "script, style, noscript, form, .alert"
  ).forEach((node) => {
    node.remove();
  });

  const content =
    pageContent.querySelector(".ttypography") ||
    pageContent.querySelector(".content") ||
    pageContent;

  const contentClone = content.cloneNode(true);

  contentClone.querySelectorAll(
    ".second-level-menu, .sidebar, .roundbox.sidebox"
  ).forEach((node) => {
    node.remove();
  });

  fixCodeforcesLinks(contentClone);

  if (sidebarClone) {
    sidebarClone.querySelectorAll("script, style, noscript, form").forEach((node) => {
      node.remove();
    });

    fixCodeforcesLinks(sidebarClone);
  }

  return {
    content: contentClone.innerHTML,
    sidebar: sidebarClone ? sidebarClone.innerHTML : "",
  };
}
export default function ApiHelpPage() {
  const location = useLocation();
  const activeTab = useMemo(() => getCurrentTab(location.pathname), [location.pathname]);

  const [page, setPage] = useState({
    loading: true,
    error: "",
    content: "",
    sidebar: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadApiHelp() {
      try {
        setPage({
          loading: true,
          error: "",
          content: "",
          sidebar: "",
        });

        const response = await fetch(`/cf${activeTab.cfPath}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const parsed = extractApiPage(html);

        if (!cancelled) {
          setPage({
            loading: false,
            error: "",
            content: parsed.content,
            sidebar: parsed.sidebar,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPage({
            loading: false,
            error: `Failed to load live Codeforces API page: ${error.message}`,
            content: "",
            sidebar: "",
          });
        }
      }
    }

    loadApiHelp();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="api-real-tabs">
          {TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={tab.path === activeTab.path ? "active" : ""}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {page.loading && (
          <div className="api-real-loading">
            Loading live API page...
          </div>
        )}

        {page.error && (
          <div className="api-real-error">
            {page.error}
          </div>
        )}

        {!page.loading && !page.error && (
          <div className="api-real-layout">
            <main
              className="api-real-content"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />

            <aside
              className="api-real-sidebar"
              dangerouslySetInnerHTML={{ __html: page.sidebar }}
            />
          </div>
        )}
      </div>
    </>
  );
}