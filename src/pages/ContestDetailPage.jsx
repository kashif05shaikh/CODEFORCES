import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../App.css";
import "./ContestDetailPage.css";

const CF = "https://corsproxy.io/?url=https://codeforces.com/api";

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
        fetch(`${CF}/contest.standings?contestId=${contestId}&from=1&count=50&showUnofficial=false`),
        fetch(`${CF}/contest.status?contestId=${contestId}&from=1&count=100`),
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
  if (!standings.length) return <div className="cp-empty">No standings available.</div>;
  return (
    <div className="cp-standings-wrap">
      <table className="cp-table cp-standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Who</th>
            {problems.map(p => <th key={p.index} className="cp-th-prob">{p.index}</th>)}
            <th>=</th>
            <th>Penalty</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const handle = row.party?.members?.[0]?.handle || "?";
            return (
              <tr key={handle}>
                <td className="cp-td-rank">{row.rank}</td>
                <td className="cp-td-handle">
                  <a href={`https://codeforces.com/profile/${handle}`} target="_blank" rel="noreferrer">
                    {handle}
                  </a>
                </td>
                {problems.map((p, i) => {
                  const pr = row.problemResults?.[i];
                  return (
                    <td
                      key={p.index}
                      className={`cp-td-prob-result ${pr?.points > 0 ? "cp-solved" : pr?.rejectedAttemptCount > 0 ? "cp-failed" : ""}`}
                    >
                      {pr?.points > 0 ? (
                        <span className="cp-prob-ok">+{pr.rejectedAttemptCount > 0 ? pr.rejectedAttemptCount : ""}</span>
                      ) : pr?.rejectedAttemptCount > 0 ? (
                        <span className="cp-prob-fail">-{pr.rejectedAttemptCount}</span>
                      ) : ""}
                    </td>
                  );
                })}
                <td className="cp-td-score">{row.points ?? "—"}</td>
                <td className="cp-td-penalty">{row.penalty ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionsTab({ submissions }) {
  if (!submissions.length) return <div className="cp-empty">No submissions available.</div>;
  return (
    <table className="cp-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>When</th>
          <th>Who</th>
          <th>Problem</th>
          <th>Lang</th>
          <th>Verdict</th>
          <th>Time</th>
          <th>Memory</th>
        </tr>
      </thead>
      <tbody>
        {submissions.map(s => (
          <tr key={s.id}>
            <td className="cp-td-id">{s.id}</td>
            <td className="cp-td-when">{formatTime(s.creationTimeSeconds)}</td>
            <td className="cp-td-who">
              <a href={`https://codeforces.com/profile/${s.author?.members?.[0]?.handle}`} target="_blank" rel="noreferrer">
                {s.author?.members?.[0]?.handle || "?"}
              </a>
            </td>
            <td className="cp-td-prob">{s.problem?.index} - {s.problem?.name}</td>
            <td className="cp-td-lang">{s.programmingLanguage}</td>
            <td className={`cp-td-verdict ${verdictClass(s.verdict)}`}>{verdictLabel(s.verdict)}</td>
            <td className="cp-td-time">{s.timeConsumedMillis} ms</td>
            <td className="cp-td-mem">{Math.round(s.memoryConsumedBytes / 1024)} KB</td>
          </tr>
        ))}
      </tbody>
    </table>
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
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
