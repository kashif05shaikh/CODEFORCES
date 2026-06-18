import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../App.css";
import "./ContestDetailPage.css";
const BASE = "/api";
function useContestData(contestId) {
  const [problems, setProblems] = useState([]);
  const [standings, setStandings] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [contestInfo, setContestInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const [standRes, statusRes] = await Promise.all([
        fetch(`${BASE}/contest.standings?contestId=${contestId}`),
        fetch(`${BASE}/contest.status?contestId=${contestId}&from=1&count=100`),
      ]);
      const [standData, statusData] = await Promise.all([standRes.json(), statusRes.json()]);
      if (standData.status === "OK") {
        setContestInfo(standData.result.contest);
        setProblems(standData.result.problems || []);
        setStandings(standData.result.rows || []);
      } else {
        throw new Error(standData.comment || "Failed to load standings");
      }
      if (statusData.status === "OK") {
        setSubmissions(statusData.result || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contestId]);

  useEffect(() => { load(); }, [load]);
  return { problems, standings, submissions, contestInfo, loading, error, reload: load };
}
function formatTime(unix) {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  return d.toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
function verdictClass(verdict) {
  if (!verdict) return "cf-verd-pending";
  if (verdict === "OK") return "cf-verd-ok";
  return "cf-verd-fail";
}
function verdictLabel(verdict) {
  if (!verdict) return "In queue";
  const map = {
    OK: "Accepted",
    WRONG_ANSWER: "Wrong answer",
    TIME_LIMIT_EXCEEDED: "Time limit exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
    RUNTIME_ERROR: "Runtime error",
    COMPILATION_ERROR: "Compilation error",
    CHALLENGED: "Challenged",
    FAILED: "Failed",
    PARTIAL: "Partial",
    PRESENTATION_ERROR: "Presentation error",
    IDLENESS_LIMIT_EXCEEDED: "Idleness limit exceeded",
  };
  return map[verdict] || verdict;
}
function ProblemsTab({ problems, contestId }) {
  if (!problems.length) return <div className="cp-empty">No problems found.</div>;
  return (
    <table className="cp-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Solved</th>
        </tr>
      </thead>
      <tbody>
        {problems.map((p) => (
          <tr key={p.index}>
            <td className="cp-td-idx">{p.index}</td>
            <td className="cp-td-name">
              <a
                href={`https://codeforces.com/contest/${contestId}/problem/${p.index}`}
                target="_blank"
                rel="noreferrer"
              >
                {p.name}
              </a>
              {p.points && <span className="cp-points"> ({p.points} pts)</span>}
            </td>
            <td className="cp-td-solved">
              {p.solvedCount !== undefined ? `×${p.solvedCount}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function StandingsTab({ standings, problems }) {
  // Show login warning — standings require authentication on Codeforces
  return (
    <div className="cp-login-warning-wrap">
      <div className="cp-login-warning">
        You are not allowed to view the contest standings. Please{" "}
        <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer">
          enter
        </a>{" "}
        or{" "}
        <a href="https://codeforces.com/register" target="_blank" rel="noreferrer">
          register
        </a>
        .
      </div>
    </div>
  );
}
function SubmissionsTab({ submissions }) {
  // Show login warning — submissions require authentication on Codeforces
  return (
    <div className="cp-login-warning-wrap">
      <div className="cp-login-warning">
        You are not allowed to view the contest status. Please{" "}
        <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer">
          enter
        </a>{" "}
        or{" "}
        <a href="https://codeforces.com/register" target="_blank" rel="noreferrer">
          register
        </a>
        .
      </div>
    </div>
  );
}
function PracticeSidebar({ contestId }) {
  return (
    <div className="cp-sidebar-box">
      <div className="cp-sidebar-box-title">
        <span className="cp-sidebar-icon">◆</span> Practice?
      </div>
      <div className="cp-sidebar-box-body">
        <p>
          Want to solve the contest problems after the official contest ends? Just register for
          practice and you will be able to submit solutions.
        </p>
        <a
          className="cp-sidebar-btn"
          href={`https://codeforces.com/contestRegistration/${contestId}`}
          target="_blank"
          rel="noreferrer"
        >
          Register for practice
        </a>
      </div>
    </div>
  );
}
function VirtualParticipationSidebar({ contestId }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="cp-sidebar-box">
      <div className="cp-sidebar-box-title cp-sidebar-box-title--collapsible" onClick={() => setOpen(o => !o)}>
        <span className="cp-sidebar-icon">◆</span> Virtual participation
        <span className="cp-sidebar-chevron">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="cp-sidebar-box-body">
          <p>
            Virtual contest is a way to take part in past contests, as close as possible to
            participation on time. It is supported only ICPC mode for virtual contests. A virtual
            contest is not for you — if you just want to solve these problems in the archive. A
            virtual contest is not for you — if you want to solve this problem in the archive.
            Never use someone else's code, read the tutorials or communicate with another person
            during a virtual contest.
          </p>
          <a
            className="cp-sidebar-btn"
            href={`https://codeforces.com/contest/${contestId}/virtual`}
            target="_blank"
            rel="noreferrer"
          >
            Start virtual contest
          </a>
        </div>
      )}
    </div>
  );
}
function ContestMaterialsSidebar({ contestId }) {
  return (
    <div className="cp-sidebar-box">
      <div className="cp-sidebar-box-title">
        <span className="cp-sidebar-icon">◆</span> Contest materials
      </div>
      <div className="cp-sidebar-box-body">
        <ul className="cp-sidebar-materials">
          <li>
            <a
              href={`https://codeforces.com/blog/entry/announcement-${contestId}`}
              target="_blank"
              rel="noreferrer"
            >
              Announcement
            </a>
            <span className="cp-sidebar-lang"> (en)</span>
            <button className="cp-sidebar-dismiss" title="Dismiss">×</button>
          </li>
          <li>
            <a
              href={`https://codeforces.com/blog/entry/tutorial-${contestId}`}
              target="_blank"
              rel="noreferrer"
            >
              Tutorial
            </a>
            <span className="cp-sidebar-lang"> (en)</span>
            <button className="cp-sidebar-dismiss" title="Dismiss">×</button>
          </li>
        </ul>
      </div>
    </div>
  );
}
export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("problems");
  const { problems, standings, submissions, contestInfo, loading, error, reload } = useContestData(id);
  
  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="cp-wrapper">
          <button className="cp-back" onClick={() => navigate("/contests")}>← Back to contests</button>

          {loading && <div className="cp-loading">Loading contest data…</div>}
          {error && <div className="cp-error">{error} <button onClick={reload}>Retry</button></div>}

          {!loading && !error && (
            <div className="cp-layout">
              {/* ── Main content ── */}
              <div className="cp-main">
                <div className="cp-header">
                  <h2 className="cp-title">{contestInfo?.name || `Contest #${id}`}</h2>
                  <div className="cp-meta">
                    {contestInfo?.startTimeSeconds && (
                      <span>Start: {formatTime(contestInfo.startTimeSeconds)}</span>
                    )}
                    {contestInfo?.durationSeconds && (
                      <span>Duration: {formatDuration(contestInfo.durationSeconds)}</span>
                    )}
                    <a href={`https://codeforces.com/contest/${id}`} target="_blank" rel="noreferrer">
                      Open on Codeforces ↗
                    </a>
                  </div>
                </div>

                <div className="cp-tabs">
                  {["problems", "standings", "submissions"].map(t => (
                    <button
                      key={t}
                      className={`cp-tab ${tab === t ? "cp-tab-active" : ""}`}
                      onClick={() => setTab(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="cp-tab-content">
                  {tab === "problems"    && <ProblemsTab    problems={problems}    contestId={id} />}
                  {tab === "standings"   && <StandingsTab   standings={standings}  problems={problems} />}
                  {tab === "submissions" && <SubmissionsTab submissions={submissions} />}
                </div>
              </div>

              {/* ── Right sidebar ── */}
              <div className="cp-sidebar">
                <PracticeSidebar contestId={id} />
                <VirtualParticipationSidebar contestId={id} />
                <ContestMaterialsSidebar contestId={id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
