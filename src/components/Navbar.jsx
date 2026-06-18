import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import flagImg from "../assets/flag.png";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-inner">
          <img src={logo} alt="Codeforces" className="logo-img" />
        </div>

        <div className="navbar-auth">
          <img src={flagImg} alt="flags" className="flag-img" />
          <div className="auth-links">
            <a href="https://codeforces.com/enter" target="_blank" rel="noreferrer">Enter</a>
            <span> | </span>
            <a href="https://codeforces.com/register" target="_blank" rel="noreferrer">Register</a>
          </div>
        </div>
      </div>

      <div className="navbar-links-bar">
        <ul className="navbar-links">
          <li><Link to="/">HOME</Link></li>
          <li><Link to="/top">TOP</Link></li>
          <li><Link to="/catalog">CATALOG</Link></li>
          <li><Link to="/contests">CONTESTS</Link></li>
          <li><Link to="/gym">GYM</Link></li>
          <li><Link to="/problemset">PROBLEMSET</Link></li>
          <li><Link to="/groups">GROUPS</Link></li>
          <li><Link to="/ratings">RATING</Link></li>
          <li><Link to="/edu">EDU</Link></li>
          <li><Link to="/api-help">API</Link></li>
          <li><Link to="/calendar">CALENDAR</Link></li>
          <li><Link to="/help">HELP</Link></li>
        </ul>
        <input placeholder="" type="text" className="search-box" />
      </div>
    </nav>
  );
}

export default Navbar;