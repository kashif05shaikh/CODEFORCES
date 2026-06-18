import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ContestFeed.css";

const REFRESH_MS = 5 * 60 * 1000;
const PAGE_SIZE = 50;
const TOTAL_SLIDES = 21;

const RATED_OPTIONS = ["Doesn't matter", "Rated", "Unrated"];
const TRIED_OPTIONS = ["Doesn't matter", "Tried", "Not tried"];
const TYPE_OPTIONS = ["Div. 1", "Div. 2", "Div. 3", "Div. 4", "Div. 1 + Div. 2", "Educational", "CodeTON", "Global", "Kotlin"];

function ratingColor(rating) {
  if (!rating) return "#808080";
  if (rating >= 3000) return "#000000";
  if (rating >= 2400) return "#ff0000";
  if (rating >= 2100) return "#ff8c00";
  if (rating >= 1900) return "#aa00aa";
  if (rating >= 1600) return "#0000ff";
  if (rating >= 1400) return "#03a89e";
  if (rating >= 1200) return "#008000";
  return "#808080";
}
function formatDate(unixSeconds) {
  if (!unixSeconds) return "-";
  const local = new Date(unixSeconds * 1000 + 330 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  return `${months[local.getUTCMonth()]}/${String(local.getUTCDate()).padStart(2, "0")}/${local.getUTCFullYear()} ${hh}:${mm}UTC+5.5`;
}
function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function formatCountdown(seconds) {
  if (seconds <= 0) return "Started";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d} day${d > 1 ? "s" : ""} ${h}h`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function useCountdown(targetUnix) {
  const [remaining, setRemaining] = useState(() => targetUnix - Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setRemaining(targetUnix - Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [targetUnix]);
  return remaining;
}
function matchesType(contest, selected) {
  if (!selected.length) return true;
  const name = contest.name;
  const lower = name.toLowerCase();
  return selected.some((type) => {
    if (type === "Div. 1") return /div\.?\s*1/i.test(name) && !/div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name);
    if (type === "Div. 2") return /div\.?\s*2/i.test(name) && !/div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name);
    if (type === "Div. 3") return /div\.?\s*3/i.test(name);
    if (type === "Div. 4") return /div\.?\s*4/i.test(name);
    if (type === "Div. 1 + Div. 2") return /div\.?\s*1\s*\+\s*div\.?\s*2/i.test(name);
    return lower.includes(type.toLowerCase());
  });
}
function parseContestPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const map = {};
  Array.from(doc.querySelectorAll("tr")).forEach((row) => {
    const contestLink = Array.from(row.querySelectorAll("a[href]")).find(
      (a) => /\/contest\/\d+/.test(a.getAttribute("href") || "")
    );
    const id = contestLink?.getAttribute("href")?.match(/\/contest\/(\d+)/)?.[1];
    if (!id) return;
    const cells = Array.from(row.children);
    const writerCell = cells[1];
    const handles = writerCell
      ? Array.from(writerCell.querySelectorAll('a[href*="/profile/"]'))
          .map((a) => a.textContent.trim())
          .filter(Boolean)
      : [];
    const participantLink = Array.from(row.querySelectorAll("a[href]")).find((a) =>
      /^x\d+/.test(a.textContent.trim())
    );
    map[id] = { _writers: handles, _participants: participantLink?.textContent.trim() || "" };
  });
  return map;
}
async function loadLivePageDetails() {
  const pages = [1, 2, 3, 4, 5];
  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const res = await fetch(`/cf/contests/page/${page}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`page ${page} failed`);
      return parseContestPage(await res.text());
    })
  );
  return results.reduce(
    (acc, item) => (item.status === "fulfilled" ? { ...acc, ...item.value } : acc),
    {}
  );
}
function TypeDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const label =
    selected.length === 0 ? "Any" : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = (type) => {
    onChange(selected.includes(type) ? selected.filter((x) => x !== type) : [...selected, type]);
  };

  return (
    <div className="cf-type-menu" ref={ref}>
      <button className="cf-type-trigger" type="button" onClick={() => setOpen(!open)}>
        <span>{label}</span><span>▼</span>
      </button>
      {open && (
        <div className="cf-type-panel">
          {TYPE_OPTIONS.map((type) => (
            <label className="cf-type-option" key={type}>
              <input type="checkbox" checked={selected.includes(type)} onChange={() => toggle(type)} />
              <span>{type}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
function WritersCell({ handles, userMap }) {
  if (!handles?.length) return <td className="cf-td-writers">—</td>;
  return (
    <td className="cf-td-writers">
      {handles.map((h) => {
        const info = userMap[h];
        return (
          <div key={h}>
            <a
              href={`https://codeforces.com/profile/${h}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: ratingColor(info?.rating), fontWeight: "bold", fontSize: 11, textDecoration: "none" }}
            >
              {h}
            </a>
          </div>
        );
      })}
    </td>
  );
}
function PayCountdown({ startTime }) {
  return <span>{formatCountdown(Math.max(0, useCountdown(startTime)))}</span>;
}
function UpcomingRow({ contest, onNavigate, userMap }) {
  const remaining = useCountdown(contest.startTimeSeconds);
  return (
    <tr className="cf-upcoming-row">
      <td className="cf-td-name">
        <button className="cf-name-btn" onClick={() => onNavigate(contest.id)}>{contest.name}</button>
      </td>
      <WritersCell handles={contest._writers} userMap={userMap} />
      <td className="cf-td-start">
        <button className="cf-start-blue" onClick={() => onNavigate(contest.id)}>
          {formatDate(contest.startTimeSeconds)}
        </button>
        <div className="cf-before-txt">
          {remaining <= 0 ? "Contest is running" : `Before start ${formatCountdown(remaining)}`}
        </div>
      </td>
      <td className="cf-td-len">{formatDuration(contest.durationSeconds)}</td>
      <td className="cf-td-reg">
        <button className="cf-reg-btn" onClick={() => onNavigate(contest.id)}>Register »</button>
        {contest._participants && <div className="cf-participants">{contest._participants}</div>}
      </td>
    </tr>
  );
}
function PastRow({ contest, onNavigate, userMap }) {
  return (
    <tr className="cf-past-row">
      <td className="cf-td-name">
        <button className="cf-name-btn" onClick={() => onNavigate(contest.id)}>{contest.name}</button>
        <div className="cf-sub-links">
          <button className="cf-sub-btn" onClick={() => onNavigate(contest.id)}>Enter »</button>
          <button className="cf-sub-btn" onClick={() => onNavigate(contest.id)}>Virtual participation »</button>
        </div>
      </td>
      <WritersCell handles={contest._writers} userMap={userMap} />
      <td className="cf-td-start">{formatDate(contest.startTimeSeconds)}</td>
      <td className="cf-td-len">{formatDuration(contest.durationSeconds)}</td>
      <td className="cf-td-reg">
        <button className="cf-final-btn" onClick={() => onNavigate(contest.id)}>Final standings</button>
        {contest._participants && <div className="cf-participants">{contest._participants}</div>}
      </td>
    </tr>
  );
}
export default function ContestFeed() {
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userMap, setUserMap] = useState({});
  const [contestTypes, setContestTypes] = useState([]);
  const [rated, setRated] = useState("Doesn't matter");
  const [tried, setTried] = useState("Doesn't matter");
  const [pendingSubstring, setPendingSubstring] = useState("");
  const [substring, setSubstring] = useState("");
  const [slide, setSlide] = useState(1);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const res = await fetch(`/api/contest.list?gym=false`, {
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== "OK") throw new Error(data.comment || "API error");
      const all = data.result.map((c) => ({ ...c, _writers: [], _participants: "" }));
      setUpcoming(
        all.filter((c) => c.phase === "BEFORE" || c.phase === "CODING")
           .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
      );
      setPast(
        all.filter((c) => c.phase === "FINISHED")
           .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds)
      );
      loadLivePageDetails()
        .then((liveDetails) => {
          if (!Object.keys(liveDetails).length) return;
          setUpcoming((prev) =>
            prev.map((c) => ({ ...c, ...(liveDetails[String(c.id)] || {}) }))
          );
          setPast((prev) =>
            prev.map((c) => ({ ...c, ...(liveDetails[String(c.id)] || {}) }))
          );
          const handles = [
            ...new Set(Object.values(liveDetails).flatMap((d) => d._writers || [])),
          ].slice(0, 500);

          if (handles.length) {
            fetch(`/api/user.info?handles=${handles.join(";")}`, {
              signal: AbortSignal.timeout(10000),
            })
              .then((r) => r.json())
              .then((ud) => {
                if (ud.status === "OK") {
                  setUserMap(Object.fromEntries(ud.result.map((u) => [u.handle, u])));
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});

    } catch (err) {
      setError(`Failed to load contests: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    let result = [...past];
    if (contestTypes.length) result = result.filter((c) => matchesType(c, contestTypes));
    if (substring.trim()) {
      const s = substring.trim().toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(s) || (c._writers || []).join(" ").toLowerCase().includes(s)
      );
    }
    return result.slice(0, TOTAL_SLIDES * PAGE_SIZE);
  }, [past, contestTypes, substring]);

  useEffect(() => setSlide(1), [contestTypes, substring, rated, tried]);

  const slideCount = Math.max(1, Math.min(TOTAL_SLIDES, Math.ceil(filtered.length / PAGE_SIZE)));
  const shown = filtered.slice((slide - 1) * PAGE_SIZE, slide * PAGE_SIZE);
  const nextUpcoming = upcoming[0];
  const goToContest = (id) => navigate(`/contest/${id}`);

  if (loading) return <div className="cf-loading">Loading contests...</div>;

  return (
    <div className="cf-layout">
      <main className="cf-main">
        {error && <div className="cf-error">{error} <button onClick={load}>Retry</button></div>}

        <div className="cf-box">
          <div className="cf-box-head">
            <span>Current or upcoming contests</span>
            <span className="cf-head-icon">⌕</span>
          </div>
          <table className="cf-table">
            <thead>
              <tr>
                <th className="cf-th-name">Name</th>
                <th className="cf-th-writers">Writers</th>
                <th className="cf-th-start">Start</th>
                <th className="cf-th-len">Length</th>
                <th className="cf-th-reg"></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length
                ? upcoming.slice(0, 4).map((c) => (
                    <UpcomingRow key={c.id} contest={c} onNavigate={goToContest} userMap={userMap} />
                  ))
                : <tr><td colSpan={5} className="cf-empty">No upcoming contests</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="cf-box cf-past-box">
          <div className="cf-box-head">
            <span>Past contests <span className="cf-head-icon2">☰</span></span>
            <span className="cf-head-count">{filtered.length} contests</span>
          </div>
          <table className="cf-table">
            <thead>
              <tr>
                <th className="cf-th-name">Name</th>
                <th className="cf-th-writers">Writers</th>
                <th className="cf-th-start">Start</th>
                <th className="cf-th-len">Length</th>
                <th className="cf-th-reg"></th>
              </tr>
            </thead>
            <tbody>
              {shown.length
                ? shown.map((c) => (
                    <PastRow key={c.id} contest={c} onNavigate={goToContest} userMap={userMap} />
                  ))
                : <tr><td colSpan={5} className="cf-empty">No contests found</td></tr>}
            </tbody>
          </table>
          <div className="cf-slides">
            <button disabled={slide === 1} onClick={() => setSlide(slide - 1)}>‹</button>
            {Array.from({ length: TOTAL_SLIDES }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                disabled={p > slideCount}
                className={p === slide ? "is-active" : ""}
                onClick={() => setSlide(p)}
              >
                {p}
              </button>
            ))}
            <button disabled={slide === slideCount} onClick={() => setSlide(slide + 1)}>›</button>
          </div>
        </div>
      </main>

      <aside className="cf-sidebar">
        {nextUpcoming && (
          <div className="cf-sb-box">
            <div className="cf-sb-head">→ Pay attention</div>
            <div className="cf-sb-body cf-pay-body">
              <div className="cf-sb-label">Before contest</div>
              <button className="cf-sb-name" onClick={() => goToContest(nextUpcoming.id)}>
                {nextUpcoming.name}
              </button>
              <div className="cf-sb-countdown">
                <PayCountdown startTime={nextUpcoming.startTimeSeconds} />
              </div>
              <button className="cf-sb-regnow" onClick={() => goToContest(nextUpcoming.id)}>
                Register now »
              </button>
            </div>
          </div>
        )}

        <div className="cf-sb-box cf-filter-box">
          <div className="cf-sb-head">→ Past contests filter</div>
          <div className="cf-sb-body">
            <div className="cf-frow">
              <div className="cf-flabel">Contest type:</div>
              <TypeDropdown selected={contestTypes} onChange={setContestTypes} />
            </div>
            <div className="cf-frow">
              <div className="cf-flabel">Rated:</div>
              <select className="cf-fselect" value={rated} onChange={(e) => setRated(e.target.value)}>
                {RATED_OPTIONS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="cf-frow">
              <div className="cf-flabel">Tried:</div>
              <select className="cf-fselect" value={tried} onChange={(e) => setTried(e.target.value)}>
                {TRIED_OPTIONS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="cf-frow">
              <div className="cf-flabel">Substring:</div>
              <input
                className="cf-finput"
                placeholder="In contest title and writers"
                value={pendingSubstring}
                onChange={(e) => setPendingSubstring(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSubstring(pendingSubstring)}
              />
            </div>
            <button className="cf-fbtn" onClick={() => setSubstring(pendingSubstring)}>Filter</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
