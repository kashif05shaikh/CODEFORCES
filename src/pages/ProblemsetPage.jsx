import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import "./ProblemsetPage.css";
const CF = "/api";
function ratingColor(r) {
  if (!r) return "#000";
  if (r >= 2400) return "#ff0000";
  if (r >= 2100) return "#ff8c00";
  if (r >= 1900) return "#aa00aa";
  if (r >= 1600) return "#0000ff";
  if (r >= 1400) return "#03a89e";
  if (r >= 1200) return "#008000";
  return "#808080";
}
function verdictColor(v) {
  if (!v) return "#888";
  if (v === "OK") return "#0a0";
  if (v === "COMPILATION_ERROR") return "#0000cc";
  return "#0000cc";
}
function verdictLabel(v) {
  if (!v) return "In queue";
  const map = {
    OK: "Accepted",
    WRONG_ANSWER: "Wrong answer on test",
    TIME_LIMIT_EXCEEDED: "Time limit exceeded on test",
    MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
    RUNTIME_ERROR: "Runtime error",
    COMPILATION_ERROR: "Compilation error",
    CHALLENGED: "Challenged",
    FAILED: "Failed",
    PARTIAL: "Partial",
    SKIPPED: "Skipped",
    IDLENESS_LIMIT_EXCEEDED: "Idleness limit exceeded on test",
  };
  return map[v] || v;
}
function formatTime(unix) {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  return `${months[d.getUTCMonth()]}/${String(d.getUTCDate()).padStart(2,"0")}/${d.getUTCFullYear()} ${hh}:${mm}`;
}
// ── PAY ATTENTION BOX ─────────────────────────────────────
function PayAttentionBox() {
  const [contest, setContest] = useState(null);
  const [timer, setTimer] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch(`${CF}/contest.list?gym=false`)
      .then(r => r.json())
      .then(data => {
        if (data.status !== "OK") return;
        const upcoming = (data.result || [])
          .filter(c => c.phase === "BEFORE" && c.startTimeSeconds)
          .sort((a,b) => a.startTimeSeconds - b.startTimeSeconds);
        if (upcoming.length) setContest(upcoming[0]);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!contest) return;
    function tick() {
      const diff = contest.startTimeSeconds - Date.now()/1000;
      if (diff <= 0) { setTimer("Starting now"); return; }
      const h = Math.floor(diff/3600);
      const m = Math.floor((diff%3600)/60);
      const s = Math.floor(diff%60);
      setTimer(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [contest]);

  return (
    <div className="ps-sb-box">
      <div className="ps-sb-head-arrow">→ Pay attention</div>
      <div className="ps-sb-attention-body">
        {!contest ? (
          <span style={{color:"#888",fontSize:11}}>Loading…</span>
        ) : (
          <>
            <div className="ps-attention-label">Before contest</div>
            <a href={`https://codeforces.com/contest/${contest.id}`} target="_blank" rel="noreferrer" className="ps-attention-link">
              {contest.name}
            </a>
            <div className="ps-attention-timer">{timer}</div>
            <a href={`https://codeforces.com/contestRegistration/${contest.id}`} target="_blank" rel="noreferrer" className="ps-attention-reg">
              Register now »
            </a>
          </>
        )}
      </div>
    </div>
  );
}
// ── PROBLEMS TAB ──────────────────────────────────────────
function ProblemsTab({ source }) {
  const [problems,  setProblems]  = useState([]);
  const [statsMap,  setStatsMap]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [diffFrom,  setDiffFrom]  = useState("");
  const [diffTo,    setDiffTo]    = useState("");
  const [tag,       setTag]       = useState("");
  const [filtered,  setFiltered]  = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const path = source === "acmsguru"
        ? `${CF}/problemset.problems?tags=*special`
        : `${CF}/problemset.problems`;
      const res  = await fetch(path);
      const data = await res.json();
      if (data.status !== "OK") throw new Error(data.comment || "API error");
      const probs = data.result.problems || [];
      const sm = {};
      (data.result.problemStatistics || []).forEach(s => {
        sm[`${s.contestId}-${s.index}`] = s.solvedCount;
      });
      setProblems(probs);
      setStatsMap(sm);
      setFiltered(probs.slice(0, 100));
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => { load(); }, [load]);

  function applyFilter() {
    if (!problems.length) return;
    let result = [...problems];
    if (diffFrom !== "") result = result.filter(p => p.rating != null && p.rating >= Number(diffFrom));
    if (diffTo   !== "") result = result.filter(p => p.rating != null && p.rating <= Number(diffTo));
    if (tag.trim()) {
      const t = tag.trim().toLowerCase();
      result = result.filter(p => Array.isArray(p.tags) && p.tags.some(tg => tg.toLowerCase().includes(t)));
    }
    setFiltered(result.slice(0, 100));
  }

  return (
    <div className="ps-layout">
      <main className="ps-main">
        <div className="ps-box">
          <div className="ps-box-head">
            <span>Problems</span>
            <span className="ps-head-icon">☰</span>
          </div>
          <table className="ps-table">
            <colgroup>
              <col style={{width:"62px"}} />
              <col />
              <col style={{width:"24px"}} />
              <col style={{width:"55px"}} />
              <col style={{width:"90px"}} />
            </colgroup>
            <thead>
              <tr>
                <th className="ps-th-left">#</th>
                <th className="ps-th-left" style={{textAlign:"center"}}>Name</th>
                <th>
                  <svg width="13" height="14" viewBox="0 0 14 16" fill="#888">
                    <path d="M2 1l10 7-10 7V1z"/>
                  </svg>
                </th>
                <th>
                  <span style={{fontSize:12}}>✔</span>{" "}
                  <span style={{fontSize:10,color:"#555"}}>◆</span>
                </th>
                <th>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="#555">
                    <circle cx="7" cy="5" r="3.5"/>
                    <path d="M0 14c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="#555"/>
                  </svg>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="ps-empty">Loading…</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="ps-empty">
                    {error}<br/>
                    <button className="ps-retry-btn" onClick={load}>↺ Retry</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="ps-empty">No problems found</td></tr>
              ) : filtered.map((p, i) => {
                const key = `${p.contestId}-${p.index}`;
                const solved = statsMap[key];
                const url = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
                return (
                  <tr key={key} className={i % 2 === 0 ? "ps-row-even" : "ps-row-odd"}>
                    <td className="ps-td-hash">
                      <a href={url} target="_blank" rel="noreferrer" className="ps-hash-link">
                        {p.contestId}{p.index}
                      </a>
                    </td>
                    <td className="ps-td-name">
                      <a href={url} target="_blank" rel="noreferrer" className="ps-name-link">
                        {p.name}
                      </a>
                      {p.tags && p.tags.length > 0 && (
                        <div className="ps-tags">
                          {p.tags.map(t => <span key={t} className="ps-tag">{t}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="ps-td-bookmark">
                      <svg width="12" height="14" viewBox="0 0 14 16" fill="#bbb">
                        <path d="M2 1l10 7-10 7V1z"/>
                      </svg>
                    </td>
                    <td className="ps-td-diff">
                      {p.rating
                        ? <span style={{color:ratingColor(p.rating)}}>{p.rating}</span>
                        : ""}
                    </td>
                    <td className="ps-td-solved">
                      {solved !== undefined ? (
                        <div className="ps-solved-row">
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="#555">
                            <circle cx="7" cy="5" r="3.5"/>
                            <path d="M0 14c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="#555"/>
                          </svg>
                          <a href={url} target="_blank" rel="noreferrer" className="ps-solved-link">
                            ×{solved.toLocaleString()}
                          </a>
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <aside className="ps-sidebar">
        {source === "main" && <PayAttentionBox />}
        <div className="ps-sb-box" style={{marginTop: source === "main" ? 10 : 0}}>
          <div className="ps-sb-head-arrow">→ Filter Problems</div>
          <div className="ps-sb-body">
            <div className="ps-frow">
              <span className="ps-flabel">Difficulty:</span>
              <div className="ps-diff-range">
                <input className="ps-finput-sm" placeholder="from" value={diffFrom} onChange={e => setDiffFrom(e.target.value)} />
                <span className="ps-dash"> — </span>
                <input className="ps-finput-sm" placeholder="to" value={diffTo} onChange={e => setDiffTo(e.target.value)} />
              </div>
            </div>
            <div className="ps-frow">
              <span className="ps-flabel">Tag:</span>
              <input className="ps-finput-tag" placeholder="e.g. dp, greedy" value={tag}
                onChange={e => setTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyFilter()} />
            </div>
            <button className="ps-apply-btn" onClick={applyFilter}>Apply</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
// ── SUBMIT TAB ────────────────────────────────────────────
function SubmitTab() {
  return (
    <div className="ps-warn-wrap">
      <div className="ps-warn-box">
        <div className="ps-warn-icon">⚠️</div>
        <div className="ps-warn-title">Login Required</div>
        <div className="ps-warn-msg">
          You must be logged in to submit a solution.<br />
          Please{" "}
          <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer" className="ps-warn-link">log in</a>
          {" "}or{" "}
          <a href="https://codeforces.com/register" target="_blank" rel="noreferrer" className="ps-warn-link">register</a>
          {" "}on Codeforces.
        </div>
      </div>
    </div>
  );
}
// ── STATUS TAB ────────────────────────────────────────────
function StatusTab() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${CF}/contest.status?contestId=2108&from=1&count=40`)
      .then(r => r.json())
      .then(data => {
        if (data.status !== "OK") throw new Error(data.comment || "API error");
        setSubmissions(data.result || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ps-box">
      <div className="ps-box-head"><span>Contest status</span><span className="ps-head-icon">☰</span></div>
      <table className="ps-table ps-table-sm ps-table-bordered" style={{tableLayout:"auto"}}>
        <thead>
          <tr>
            <th style={{width:70}}>#</th>
            <th style={{width:140}}>When</th>
            <th style={{width:120}}>Who</th>
            <th>Problem</th>
            <th style={{width:110}}>Lang</th>
            <th style={{width:180}}>Verdict</th>
            <th style={{width:70}}>Time</th>
            <th style={{width:70}}>Memory</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan={8} className="ps-empty">Loading…</td></tr>
          : error   ? <tr><td colSpan={8} className="ps-empty">{error}</td></tr>
          : submissions.map((s, i) => (
            <tr key={s.id} className={i%2===0?"ps-row-even":"ps-row-odd"}>
              <td className="ps-td-center">
                <a href={`https://codeforces.com/contest/${s.contestId}/submission/${s.id}`} target="_blank" rel="noreferrer" className="ps-hash-link">{s.id}</a>
              </td>
              <td style={{fontSize:11,whiteSpace:"nowrap"}}>{formatTime(s.creationTimeSeconds)}</td>
              <td>
                <a href={`https://codeforces.com/profile/${s.author?.members?.[0]?.handle}`} target="_blank" rel="noreferrer"
                  style={{color:ratingColor(s.author?.members?.[0]?.rating), textDecoration:"none", fontWeight:"bold", fontSize:12}}>
                  {s.author?.members?.[0]?.handle||"?"}
                </a>
              </td>
              <td>
                <a href={`https://codeforces.com/contest/${s.contestId}/problem/${s.problem?.index}`} target="_blank" rel="noreferrer" className="ps-name-link" style={{fontSize:11}}>
                  {s.problem?.index} - {s.problem?.name}
                </a>
              </td>
              <td style={{fontSize:10,color:"#555"}}>{s.programmingLanguage}</td>
              <td style={{color:verdictColor(s.verdict),fontWeight:"bold",fontSize:11,whiteSpace:"nowrap"}}>
                {verdictLabel(s.verdict)}{s.passedTestCount?` ${s.passedTestCount}`:""}
              </td>
              <td className="ps-td-center" style={{fontSize:11}}>{s.timeConsumedMillis} ms</td>
              <td className="ps-td-center" style={{fontSize:11}}>{Math.round((s.memoryConsumedBytes||0)/1024)} KB</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ── STANDINGS TAB ─────────────────────────────────────────
// Standings require a logged-in Codeforces session on this clone,
// so we show the same login-required warning used by Submit / Custom Test.
function StandingsTab() {
  return (
    <div className="ps-warn-wrap">
      <div className="ps-warn-box">
        <div className="ps-warn-icon">⚠️</div>
        <div className="ps-warn-title">Login Required</div>
        <div className="ps-warn-msg">
          You must be logged in to view standings.<br />
          Please{" "}
          <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer" className="ps-warn-link">log in</a>
          {" "}or{" "}
          <a href="https://codeforces.com/register" target="_blank" rel="noreferrer" className="ps-warn-link">register</a>
          {" "}on Codeforces.
        </div>
      </div>
    </div>
  );
}
// ── CUSTOM TEST TAB ───────────────────────────────────────
function CustomTestTab() {
  return (
    <div className="ps-warn-wrap">
      <div className="ps-warn-box">
        <div className="ps-warn-icon">⚠️</div>
        <div className="ps-warn-title">Login Required</div>
        <div className="ps-warn-msg">
          Custom test requires login.<br/>
          <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer" className="ps-warn-link">Log in</a>
          {" "}to use this feature.
        </div>
      </div>
    </div>
  );
}
// ── MAIN PAGE ─────────────────────────────────────────────
const SUB_TABS = ["PROBLEMS","SUBMIT","STATUS","STANDINGS","CUSTOM TEST"];
export default function ProblemsetPage() {
  const [source, setSource] = useState("main");
  const [subTab, setSubTab] = useState("PROBLEMS");
  return (
    <>
      <Navbar />
      <div className="ps-page">
        <div className="ps-tab-bar">
          <button className={`ps-src-btn${source==="main"?" ps-src-active":""}`}
            onClick={()=>{setSource("main");setSubTab("PROBLEMS");}}>MAIN</button>
          <button className={`ps-src-btn${source==="acmsguru"?" ps-src-active":""}`}
            onClick={()=>{setSource("acmsguru");setSubTab("PROBLEMS");}}>ACMSGURU</button>
          <span className="ps-tab-sep">|</span>
          {SUB_TABS.map(t=>(
            <button key={t} className={`ps-sub-btn${subTab===t?" ps-sub-active":""}`}
              onClick={()=>setSubTab(t)}>{t}</button>
          ))}
        </div>
        <div className="ps-content">
          {subTab==="PROBLEMS"    && <ProblemsTab source={source}/>}
          {subTab==="SUBMIT"      && <SubmitTab/>}
          {subTab==="STATUS"      && <StatusTab/>}
          {subTab==="STANDINGS"   && <StandingsTab/>}
          {subTab==="CUSTOM TEST" && <CustomTestTab/>}
        </div>
      </div>
    </>
  );
}
