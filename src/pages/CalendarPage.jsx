import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import "./CalendarPage.css";
const CF_CONTEST_LIST_API = "https://codeforces.com/api/contest.list?gym=false";
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MAX_VISIBLE_EVENTS = 2;
function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ampm}`;
}
function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}
export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [contests, setContests] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(CF_CONTEST_LIST_API)
      .then((res) => {
        if (!res.ok) throw new Error(`Codeforces API responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.status !== "OK") throw new Error("Codeforces API returned an error");
        setContests(data.result);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load Codeforces contests:", err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Group contests by calendar day, in the viewer's own local time zone.
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const c of contests) {
      if (!c.startTimeSeconds) continue;
      const start = new Date(c.startTimeSeconds * 1000);
      const key = dateKey(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: c.id,
        name: c.name,
        start,
        isFuture: c.phase !== "FINISHED",
      });
    }
    for (const list of map.values()) list.sort((a, b) => a.start - b.start);
    return map;
  }, [contests]);

  const gridDays = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  function goToMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setExpanded(new Set());
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setExpanded(new Set());
  }

  function toggleExpanded(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <Navbar />
      <div className="cal-page">
        <h2 className="cal-title">Calendar</h2>
        <div className="cal-wrap">
          <div className="cal-toolbar">
            <div className="cal-tb-left">
              <button className="cal-today" onClick={goToToday}>Today</button>
              <button className="cal-nav" onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
              <button className="cal-nav" onClick={() => goToMonth(1)} aria-label="Next month">›</button>
              <span className="cal-month-lbl">{MONTH_LABELS[viewMonth]} {viewYear}</span>
              {status === "loading" && <span className="cal-spin">Loading contests…</span>}
              {status === "error" && <span className="cal-spin">Couldn't load contests</span>}
            </div>
            <div className="cal-tb-right">
              <span className="cal-view-pill">Month ▾</span>
            </div>
          </div>

          <div className="cal-head-row">
            {WEEKDAY_LABELS.map((label) => (
              <div className="cal-head-cell" key={label}>{label}</div>
            ))}
          </div>

          <div className="cal-grid">
            {gridDays.map((day) => {
              const key = dateKey(day);
              const inCurrentMonth = day.getMonth() === viewMonth;
              const dayEvents = eventsByDay.get(key) || [];
              const isToday = isSameDay(day, today);
              const isExpanded = expanded.has(key);
              const visibleEvents = isExpanded
                ? dayEvents
                : dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const hiddenCount = dayEvents.length - visibleEvents.length;

              return (
                <div
                  className={`cal-cell${inCurrentMonth ? "" : " cal-cell-other"}`}
                  key={key}
                >
                  <div className={`cal-day-num${isToday ? " cal-today-circle" : ""}`}>
                    {day.getDate() === 1 && (
                      <span style={{ marginRight: 4, fontWeight: 500 }}>
                        {MONTH_LABELS[day.getMonth()].slice(0, 3)}
                      </span>
                    )}
                    {isToday ? (
                      <span className="cal-today-badge">{day.getDate()}</span>
                    ) : (
                      day.getDate()
                    )}
                  </div>

                  {visibleEvents.map((evt) => (
                    <div
                      className={`cal-evt ${evt.isFuture ? "cal-evt-future" : "cal-evt-past"}`}
                      key={evt.id}
                      title={evt.name}
                    >
                      <span className="cal-evt-dot">•</span>
                      <span className="cal-evt-time">{formatTime(evt.start)}</span>
                      <span className="cal-evt-nm">{evt.name}</span>
                    </div>
                  ))}

                  {hiddenCount > 0 && (
                    <div className="cal-more" onClick={() => toggleExpanded(key)}>
                      {hiddenCount} more
                    </div>
                  )}
                  {isExpanded && dayEvents.length > MAX_VISIBLE_EVENTS && (
                    <div className="cal-more" onClick={() => toggleExpanded(key)}>
                      show less
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="cal-footer">
            <div className="cal-footer-left">
              <div className="cal-footer-title">Programming Contests Calendar</div>
              <div className="cal-footer-tz">
                Events shown in your local time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </div>
            </div>
            <a
              className="cal-footer-link"
              href="https://codeforces.com/contests"
              target="_blank"
              rel="noreferrer"
            >
              View all contests on Codeforces ↗
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
