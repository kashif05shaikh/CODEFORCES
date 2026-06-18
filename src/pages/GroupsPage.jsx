import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "./GroupsPage.css";
function fixLinks(root) {
  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href") || "";

    if (href.startsWith("/")) {
      a.setAttribute("href", `https://codeforces.com${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
    }
  });
}
function extractGroups(doc) {
  const table =
    doc.querySelector(".datatable table") ||
    doc.querySelector("#pageContent table");
  if (!table) return [];
  return [...table.querySelectorAll("tbody tr")]
    .map((row, index) => {
      const cells = [...row.children];
      if (cells.length < 3) return null;
      const nameCell = cells[0].cloneNode(true);
      const creatorCell = cells[1].cloneNode(true);
      const created = cells[2].textContent.trim();
      fixLinks(nameCell);
      fixLinks(creatorCell);
      return {
        id: `${index}-${created}`,
        nameHtml: nameCell.innerHTML,
        creatorHtml: creatorCell.innerHTML,
        created,
      };
    })
    .filter(Boolean);
}
function extractTitle(doc) {
  return (
    doc.querySelector(".datatable .caption")?.textContent.trim() ||
    "Available groups"
  );
}
function extractGroupsPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    title: extractTitle(doc),
    groups: extractGroups(doc),
  };
}
export default function GroupsPage() {
  const [page, setPage] = useState({
    loading: true,
    error: "",
    title: "",
    groups: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setPage({
          loading: true,
          error: "",
          title: "",
          groups: [],
        });

        const response = await fetch("/cf/groups");

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const parsed = extractGroupsPage(html);

        if (!cancelled) {
          setPage({
            loading: false,
            error: "",
            title: parsed.title,
            groups: parsed.groups,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPage({
            loading: false,
            error: `Failed to load live groups: ${error.message}`,
            title: "",
            groups: [],
          });
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />

      <div className="container groups-page">
        {page.loading && <div className="groups-loading">Loading live groups...</div>}
        {page.error && <div className="groups-error">{page.error}</div>}

        {!page.loading && !page.error && (
          <div className="groups-layout">
            <main className="groups-main">
              <section className="groups-box">
                <div className="groups-caption">
                  <span>{page.title}</span>
                  <span className="groups-search-icon" />
                </div>

                <div className="groups-table-scroll">
                  <table className="groups-table">
                    <thead>
                      <tr>
                        <th>Group name</th>
                        <th>Creator</th>
                        <th>Creation time</th>
                      </tr>
                    </thead>

                    <tbody>
                      {page.groups.map((group) => (
                        <tr key={group.id}>
                          <td dangerouslySetInnerHTML={{ __html: group.nameHtml }} />
                          <td dangerouslySetInnerHTML={{ __html: group.creatorHtml }} />
                          <td>{group.created}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>

            <Sidebar />
          </div>
        )}
      </div>
    </>
  );
}