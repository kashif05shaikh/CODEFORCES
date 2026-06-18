import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./GymPage.css";

// Vite proxies /api → https://codeforces.com (configured in vite.config.js)
const CF_API = "/api/contest.list?gym=true";

async function fetchContests() {
  const res = await fetch(CF_API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment || "API error");
  return data.result;
}

const SEASONS = [
  "", "2024-2025", "2023-2024", "2022-2023", "2021-2022", "2020-2021",
  "2019-2020", "2018-2019", "2017-2018", "2016-2017", "2015-2016",
];
const CONTEST_TYPES = [
  "",
  "School/University/City/Region Championship",
  "Training Camp Contest",
  "Official ICPC Contest",
  "Official School Contest",
  "Unrated",
];
const CONTEST_FORMATS = ["", "ICPC", "IOI"];
const DURATION_OPTS = [
  "", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24", "36", "48", "72",
];
const ORDER_BY = [
  "creation time (desc.)",
  "creation time (asc.)",
  "start time (desc.)",
  "start time (asc.)",
];
const STARS = [1, 2, 3, 4, 5];

function StarRating({ count = 3 }) {
  return (
    <span className="gym-stars">
      {STARS.map((s) => (
        <span key={s} className={`gym-star ${s <= count ? "gym-star-on" : ""}`}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(unixSeconds) {
  if (!unixSeconds) return "—";
  const offsetMin = 330;
  const d = new Date(unixSeconds * 1000 + offsetMin * 60 * 1000);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${months[d.getUTCMonth()]}/${String(d.getUTCDate()).padStart(2,"0")}/${d.getUTCFullYear()} ${hh}:${mm} UTC+5.5`;
}

function formatDuration(s) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function GymRow({ contest, onNavigate }) {
  const isRunning = contest.phase === "CODING";

  return (
    <tr className="gym-row">
      <td className="gym-td-name">
        <div className="gym-name-wrap">
          <button className="gym-name-btn" onClick={() => onNavigate(contest.id)}>
            {contest.name}
          </button>
          {isRunning ? (
            <span className="gym-enter-red" onClick={() => onNavigate(contest.id)}>
              Enter »
            </span>
          ) : (
            <div className="gym-sub-links">
              <button className="gym-sub-btn" onClick={() => onNavigate(contest.id)}>
                Enter »
              </button>
              <button className="gym-sub-btn" onClick={() => onNavigate(contest.id)}>
                Virtual participation »
              </button>
            </div>
          )}
        </div>
      </td>

      <td className="gym-td-start">
        {contest.startTimeSeconds ? (
          <span className="gym-date-link" onClick={() => onNavigate(contest.id)}>
            {formatDate(contest.startTimeSeconds)}
          </span>
        ) : (
          <span>—</span>
        )}
        {isRunning && <div className="gym-running">Running</div>}
      </td>

      <td className="gym-td-len">{formatDuration(contest.durationSeconds)}</td>

      <td className="gym-td-standings">
        {contest.phase === "FINISHED" ? (
          <button className="gym-standings-btn" onClick={() => onNavigate(contest.id)}>
            Final standings
          </button>
        ) : isRunning ? (
          <button className="gym-standings-btn" onClick={() => onNavigate(contest.id)}>
            Current standings
          </button>
        ) : null}
        {isRunning && (
          <div className="gym-reg-wrap">
            <button className="gym-reg-btn" onClick={() => onNavigate(contest.id)}>
              Register »
            </button>
          </div>
        )}
      </td>

      <td className="gym-td-info">
        <div className="gym-info-cell">
          <div className="gym-prepared">
            Prepared by <span className="gym-author">author</span>
          </div>
          <div className="gym-type">Training Camp Contest</div>
          <div className="gym-region">Statements in English</div>
          <StarRating count={3} />
        </div>
      </td>
    </tr>
  );
}

export default function GymPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("gym");
  const [contests,  setContests]  = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const [seasonFrom,    setSeasonFrom]    = useState("");
  const [seasonTo,      setSeasonTo]      = useState("");
  const [contestType,   setContestType]   = useState("");
  const [contestFormat, setContestFormat] = useState("");
  const [durFrom,       setDurFrom]       = useState("");
  const [durTo,         setDurTo]         = useState("");
  const [diffFrom,      setDiffFrom]      = useState(0);
  const [diffTo,        setDiffTo]        = useState(0);
  const [orderBy,       setOrderBy]       = useState(ORDER_BY[0]);
  const [findName,      setFindName]      = useState("");
  const [searchByProblem, setSearchByProblem] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchContests();
      const sorted = [...result].sort((a, b) => b.id - a.id);
      setContests(sorted);
      setFiltered(sorted.slice(0, 50));
    } catch (err) {
      console.error("GymPage load error:", err);
      setError(err.message || "Failed to load contests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilter() {
    let result = [...contests];

    if (findName.trim()) {
      const s = findName.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(s));
    }

    if (durFrom !== "") {
      result = result.filter((c) => c.durationSeconds >= Number(durFrom) * 3600);
    }
    if (durTo !== "") {
      result = result.filter((c) => c.durationSeconds <= Number(durTo) * 3600);
    }

    if (seasonFrom !== "") {
      const fromYear = parseInt(seasonFrom.split("-")[0]);
      result = result.filter((c) => {
        if (!c.startTimeSeconds) return true;
        return new Date(c.startTimeSeconds * 1000).getFullYear() >= fromYear;
      });
    }
    if (seasonTo !== "") {
      const toYear = parseInt(seasonTo.split("-")[1]);
      result = result.filter((c) => {
        if (!c.startTimeSeconds) return true;
        return new Date(c.startTimeSeconds * 1000).getFullYear() <= toYear;
      });
    }

    if (orderBy === "creation time (desc.)") {
      result.sort((a, b) => b.id - a.id);
    } else if (orderBy === "creation time (asc.)") {
      result.sort((a, b) => a.id - b.id);
    } else if (orderBy === "start time (desc.)") {
      result.sort((a, b) => (b.startTimeSeconds || 0) - (a.startTimeSeconds || 0));
    } else if (orderBy === "start time (asc.)") {
      result.sort((a, b) => (a.startTimeSeconds || 0) - (b.startTimeSeconds || 0));
    }

    setFiltered(result.slice(0, 50));
  }

  const goToContest = (id) => navigate(`/contest/${id}`);

  return (
    <>
      <Navbar />
      <div className="gym-page">
        <div className="gym-tabs">
          <button
            className={`gym-tab-btn ${activeTab === "gym" ? "gym-tab-active" : ""}`}
            onClick={() => setActiveTab("gym")}
          >
            GYM
          </button>
          <button
            className={`gym-tab-btn ${activeTab === "mashups" ? "gym-tab-active" : ""}`}
            onClick={() => setActiveTab("mashups")}
          >
            MASHUPS
          </button>
        </div>

        <div className="gym-layout">
          <main className="gym-main">
            <div className="gym-box">
              <div className="gym-box-head">
                <span>Trainings ☰</span>
                <span className="gym-head-icon">⊞</span>
              </div>
              <table className="gym-table">
                <thead>
                  <tr>
                    <th className="gym-th-name">Name</th>
                    <th className="gym-th-start">Start</th>
                    <th className="gym-th-len">Length</th>
                    <th className="gym-th-standings"></th>
                    <th className="gym-th-info"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="gym-empty">Loading…</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="gym-empty gym-error">
                        <div>{error}</div>
                        <button className="gym-retry-btn" onClick={load}>Retry</button>
                      </td>
                    </tr>
                  ) : activeTab === "mashups" ? (
                    <tr>
                      <td colSpan={5} className="gym-empty">No contests</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="gym-empty">No contests found</td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <GymRow key={c.id} contest={c} onNavigate={goToContest} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>

          <aside className="gym-sidebar">
            <div className="gym-sb-box">
              <div className="gym-sb-head">→ Training filter</div>
              <div className="gym-sb-body">

                <div className="gym-frow">
                  <div className="gym-flabel">Season:</div>
                  <div className="gym-frow-inline">
                    <span className="gym-fspan">from</span>
                    <select className="gym-fsel-sm" value={seasonFrom} onChange={(e) => setSeasonFrom(e.target.value)}>
                      {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="gym-fspan">to</span>
                    <select className="gym-fsel-sm" value={seasonTo} onChange={(e) => setSeasonTo(e.target.value)}>
                      {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Contest type:</div>
                  <select className="gym-fsel" value={contestType} onChange={(e) => setContestType(e.target.value)}>
                    {CONTEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Contest format:</div>
                  <select className="gym-fsel" value={contestFormat} onChange={(e) => setContestFormat(e.target.value)}>
                    {CONTEST_FORMATS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Duration, hours:</div>
                  <div className="gym-frow-inline">
                    <span className="gym-fspan">from</span>
                    <select className="gym-fsel-sm" value={durFrom} onChange={(e) => setDurFrom(e.target.value)}>
                      {DURATION_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <span className="gym-fspan">to</span>
                    <select className="gym-fsel-sm" value={durTo} onChange={(e) => setDurTo(e.target.value)}>
                      {DURATION_OPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Difficulty:</div>
                  <div className="gym-diff-row">
                    <span className="gym-fspan">from</span>
                    <span className="gym-stars-select">
                      {STARS.map((s) => (
                        <span key={s}
                          className={`gym-star-sel ${s <= diffFrom ? "gym-star-on" : ""}`}
                          onClick={() => setDiffFrom(s === diffFrom ? 0 : s)}>★</span>
                      ))}
                    </span>
                    <button className="gym-reset-btn" onClick={() => setDiffFrom(0)}>Reset</button>
                  </div>
                  <div className="gym-diff-row">
                    <span className="gym-fspan">to</span>
                    <span className="gym-stars-select">
                      {STARS.map((s) => (
                        <span key={s}
                          className={`gym-star-sel ${s <= diffTo ? "gym-star-on" : ""}`}
                          onClick={() => setDiffTo(s === diffTo ? 0 : s)}>★</span>
                      ))}
                    </span>
                    <button className="gym-reset-btn" onClick={() => setDiffTo(0)}>Reset</button>
                  </div>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Order by:</div>
                  <select className="gym-fsel" value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
                    {ORDER_BY.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="gym-frow">
                  <div className="gym-flabel">Secondary order by:</div>
                  <select className="gym-fsel">
                    <option value=""></option>
                  </select>
                </div>

                <button className="gym-filter-btn" onClick={applyFilter}>Filter</button>
              </div>
            </div>

            <div className="gym-sb-box" style={{ marginTop: 10 }}>
              <div className="gym-sb-head">→ Find training</div>
              <div className="gym-sb-body">
                <div className="gym-frow">
                  <div className="gym-flabel">Name:</div>
                  <input
                    className="gym-finput"
                    value={findName}
                    onChange={(e) => setFindName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilter()}
                  />
                </div>
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                  <button className="gym-filter-btn" onClick={applyFilter}>Find</button>
                </div>
                <label className="gym-check-label">
                  <input
                    type="checkbox"
                    checked={searchByProblem}
                    onChange={(e) => setSearchByProblem(e.target.checked)}
                  />{" "}
                  search by problem name?
                </label>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
