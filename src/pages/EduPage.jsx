import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "./EduPage.css";
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
    const src = img.getAttribute("src") || "";

    if (src.startsWith("/")) {
      img.setAttribute("src", `https://codeforces.com${src}`);
    }
  });
}
function extractCourses(doc) {
  const table =
    doc.querySelector(".datatable table") ||
    doc.querySelector("#pageContent table");
  if (!table) return [];
  return [...table.querySelectorAll("tbody tr")]
    .map((row) => {
      const cells = [...row.children];
      if (cells.length < 4) return null;
      const number = cells[0].textContent.trim();
      const nameCell = cells[1].cloneNode(true);
      const created = cells[2].textContent.trim();
      const studentsCell = cells[3].cloneNode(true);
      fixLinks(nameCell);
      fixLinks(studentsCell);
      return {
        number,
        nameHtml: nameCell.innerHTML,
        created,
        studentsHtml: studentsCell.innerHTML,
      };
    })
    .filter(Boolean);
}
function extractSidebars(doc) {
  const sidebarRoot =
    doc.querySelector(".sidebar") ||
    doc.querySelector(".right-sidebar") ||
    doc.querySelector("#sidebar");
  const boxes = sidebarRoot
    ? [...sidebarRoot.querySelectorAll(".roundbox, .sidebox")]
    : [...doc.querySelectorAll(".roundbox.sidebox, .sidebox, .roundbox")];
  return boxes
    .filter((box) => {
      const text = box.textContent.trim();
      return text.includes("About EDU") || text.includes("Recent actions");
    })
    .map((box) => {
      const clone = box.cloneNode(true);
      clone.querySelectorAll(
        "script, style, noscript, form, .roundbox-lt, .roundbox-rt, .roundbox-lb, .roundbox-rb"
      ).forEach((node) => {
        node.remove();
      });
      fixLinks(clone);
      return clone.innerHTML;
    });
}
function extractEduPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    courses: extractCourses(doc),
    sidebars: extractSidebars(doc),
  };
}
export default function EduPage() {
  const [page, setPage] = useState({
    loading: true,
    error: "",
    courses: [],
    sidebars: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEdu() {
      try {
        setPage({
          loading: true,
          error: "",
          courses: [],
          sidebars: [],
        });

        const response = await fetch("/cf/edu/courses");

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const parsed = extractEduPage(html);

        if (!cancelled) {
          setPage({
            loading: false,
            error: "",
            courses: parsed.courses,
            sidebars: parsed.sidebars,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPage({
            loading: false,
            error: `Failed to load live EDU page: ${error.message}`,
            courses: [],
            sidebars: [],
          });
        }
      }
    }

    loadEdu();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />

      <div className="edu-page">
        {page.loading && (
          <div className="edu-loading">
            Loading live EDU page...
          </div>
        )}

        {page.error && (
          <div className="edu-error">
            {page.error}
          </div>
        )}

        {!page.loading && !page.error && (
          <div className="edu-layout">
            <main className="edu-main">
              <div className="edu-title">Courses</div>

              <section className="edu-box">
                <div className="edu-box-caption">
                  <span>Courses</span>
                  <span className="edu-search-icon" />
                </div>

                <table className="edu-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Created</th>
                      <th>Students</th>
                    </tr>
                  </thead>

                  <tbody>
                    {page.courses.map((course) => (
                      <tr key={course.number}>
                        <td>{course.number}</td>
                        <td dangerouslySetInnerHTML={{ __html: course.nameHtml }} />
                        <td>{course.created}</td>
                        <td>
                            <span dangerouslySetInnerHTML={{ __html: course.studentsHtml }} />
                            <span className="edu-students-icon">👤</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </main>

            <aside className="edu-sidebar">
              {page.sidebars.map((sidebar, index) => (
                <div
                  key={index}
                  className="edu-sidebox"
                  dangerouslySetInnerHTML={{ __html: sidebar }}
                />
              ))}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}