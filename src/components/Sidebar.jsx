import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

function stripHtml(html = "") {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function getRatingClass(rating) {
  if (rating === undefined || rating === null) return "rating-newbie";
  if (rating >= 3000) return "rating-legendary";
  if (rating >= 2600) return "rating-international-grandmaster";
  if (rating >= 2400) return "rating-grandmaster";
  if (rating >= 2300) return "rating-international-master";
  if (rating >= 2100) return "rating-master";
  if (rating >= 1900) return "rating-candidate-master";
  if (rating >= 1600) return "rating-expert";
  if (rating >= 1400) return "rating-specialist";
  if (rating >= 1200) return "rating-pupil";
  return "rating-newbie";
}

const TOP_RATED_HANDLES =
  "Benq;VivaciousAubergine;jiangly;Kevin114514;maroonrk;strapple;Radewoosh;tourist;turmax;Um_nik";

const TOP_CONTRIB_HANDLES =
  "Qingyu;adamant;Um_nik;Dominator069;errorgorn;cry;Proof_by_QED;YuukiS;chromate00;soulless";

function Sidebar() {
  const [topRated, setTopRated] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [contests, setContests] = useState([]);
  const [findHandle, setFindHandle] = useState("");
  const [findError, setFindError] = useState(false);
  const [recentRatings, setRecentRatings] = useState({});
  const [contestError, setContestError] = useState(false);
  const [topRatedError, setTopRatedError] = useState(false);
  const [topContribError, setTopContribError] = useState(false);
  const [recentError, setRecentError] = useState(false);

  useEffect(() => {
    apiService.getContests()
      .then((data) => {
        setContests(data.result.filter((c) => c.phase === "BEFORE").slice(0, 3));
      })
      .catch(() => setContestError(true));

    apiService.getUserInfo(TOP_RATED_HANDLES)
      .then((data) => {
        setTopRated([...data.result].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10));
      })
      .catch(() => setTopRatedError(true));

    apiService.getUserInfo(TOP_CONTRIB_HANDLES)
      .then((data) => {
        setTopContributors([...data.result].sort((a, b) => (b.contribution || 0) - (a.contribution || 0)).slice(0, 10));
      })
      .catch(() => setTopContribError(true));

    apiService.getRecentActions(30)
      .then((data) => {
        const actions = data.result.filter((a) => a.blogEntry);
        setRecentActions(actions);

        const handles = [...new Set(actions.map((a) => a.blogEntry?.authorHandle).filter(Boolean))].join(";");
        if (!handles) return;

        apiService.getUserInfo(handles)
          .then((userData) => {
            const map = {};
            userData.result.forEach((user) => { map[user.handle] = user.rating; });
            setRecentRatings(map);
          })
          .catch(() => {});
      })
      .catch(() => setRecentError(true));
  }, []);

  const getTimeLeft = (startTimeSeconds) => {
    const diff = startTimeSeconds - Date.now() / 1000;
    if (diff <= 0) return "Started";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    return `${mins} minutes`;
  };

  const handleFind = () => {
    const handle = findHandle.trim();
    if (!handle) return;
    setFindError(false);
    apiService.getUserInfo(handle)
      .then(() => window.open(`https://codeforces.com/profile/${handle}`, "_blank"))
      .catch(() => setFindError(true));
  };

  return (
    <div className="sidebar">

      <div className="sidebar-box">
        <div className="sidebar-title">→ Pay attention</div>
        <div className="sidebar-payattention">
          {contestError ? (
            <p className="sidebar-loading">Failed to load contests.</p>
          ) : contests.length === 0 ? (
            <p className="sidebar-loading">Loading...</p>
          ) : (
            contests.map((c) => (
              <div key={c.id} className="contest-item">
                <p className="contest-label">Before contest</p>
                <a href={`https://codeforces.com/contest/${c.id}`} target="_blank" rel="noreferrer">{c.name}</a>
                <p className="contest-time">{getTimeLeft(c.startTimeSeconds)}</p>
                <a className="register-link" href={`https://codeforces.com/contestRegistration/${c.id}`} target="_blank" rel="noreferrer">
                  Register now »
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-box">
        <div className="sidebar-title">→ Top rated</div>
        {topRatedError ? (
          <p className="sidebar-loading">Failed to load top rated.</p>
        ) : topRated.length === 0 ? (
          <p className="sidebar-loading">Loading...</p>
        ) : (
          <>
            <table className="sidebar-table">
              <thead><tr><th>#</th><th>User</th><th>Rating</th></tr></thead>
              <tbody>
                {topRated.map((user, i) => (
                  <tr key={user.handle}>
                    <td>{i + 1}</td>
                    <td>
                      <a href={`https://codeforces.com/profile/${user.handle}`} target="_blank" rel="noreferrer" className={getRatingClass(user.rating)}>
                        {user.handle}
                      </a>
                    </td>
                    <td>{user.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sidebar-viewall-pipes">
              <a href="https://codeforces.com/ratings" target="_blank" rel="noreferrer">Countries</a>
              <span>|</span>
              <a href="https://codeforces.com/ratings/cities" target="_blank" rel="noreferrer">Cities</a>
              <span>|</span>
              <a href="https://codeforces.com/ratings/organizations" target="_blank" rel="noreferrer">Organizations</a>
              <span>|</span>
              <a href="https://codeforces.com/ratings" target="_blank" rel="noreferrer">View all →</a>
            </div>
          </>
        )}
      </div>

      <div className="sidebar-box">
        <div className="sidebar-title">→ Top contributors</div>
        {topContribError ? (
          <p className="sidebar-loading">Failed to load contributors.</p>
        ) : topContributors.length === 0 ? (
          <p className="sidebar-loading">Loading...</p>
        ) : (
          <>
            <table className="sidebar-table">
              <thead><tr><th>#</th><th>User</th><th>Contrib.</th></tr></thead>
              <tbody>
                {topContributors.map((user, i) => (
                  <tr key={user.handle}>
                    <td>{i + 1}</td>
                    <td>
                      <a href={`https://codeforces.com/profile/${user.handle}`} target="_blank" rel="noreferrer" className={getRatingClass(user.rating)}>
                        {user.handle}
                      </a>
                    </td>
                    <td>{user.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sidebar-viewall">
              <a href="https://codeforces.com/ratings" target="_blank" rel="noreferrer">View all →</a>
            </div>
          </>
        )}
      </div>

      <div className="sidebar-box">
        <div className="sidebar-title">→ Find user</div>
        <div className="sidebar-finduser">
          <span className="finduser-label">Handle: </span>
          <input
            type="text"
            value={findHandle}
            onChange={(e) => setFindHandle(e.target.value)}
            className="finduser-input"
            onKeyDown={(e) => { if (e.key === "Enter") handleFind(); }}
          />
          {findError && <p style={{ color: "red", fontSize: "11px", marginTop: "4px" }}>User not found!</p>}
          <br />
          <button className="finduser-btn" onClick={handleFind}>Find</button>
        </div>
      </div>

      <div className="sidebar-box">
        <div className="sidebar-title">→ Recent actions</div>
        <div className="recent-actions">
          {recentError ? (
            <p className="sidebar-loading">Failed to load recent actions.</p>
          ) : recentActions.length === 0 ? (
            <p className="sidebar-loading">Loading...</p>
          ) : (
            <>
              {recentActions.map((action, i) => {
                const blog = action.blogEntry;
                if (!blog) return null;
                const user = blog.authorHandle;
                const blogId = blog.id;
                const title = stripHtml(blog.title || "");
                if (!user || !blogId || !title) return null;
                return (
                  <div className="recent-action-item" key={`${blogId}-${i}`}>
                    <a className={`recent-user ${getRatingClass(recentRatings[user])}`} href={`https://codeforces.com/profile/${user}`} target="_blank" rel="noreferrer">
                      {user}
                    </a>
                    {" → "}
                    <a className="recent-blog" href={`https://codeforces.com/blog/entry/${blogId}`} target="_blank" rel="noreferrer">
                      {title}
                    </a>
                  </div>
                );
              })}
              <div className="sidebar-viewall">
                <a href="https://codeforces.com" target="_blank" rel="noreferrer">Detailed →</a>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

export default Sidebar;