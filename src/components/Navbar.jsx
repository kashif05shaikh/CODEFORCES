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
          <li><a href="https://codeforces.com/problemset" target="_blank" rel="noreferrer">PROBLEMSET</a></li>
          <li><a href="https://codeforces.com/groups" target="_blank" rel="noreferrer">GROUPS</a></li>
          <li><a href="https://codeforces.com/ratings" target="_blank" rel="noreferrer">RATING</a></li>
          <li><a href="https://codeforces.com/edu/courses" target="_blank" rel="noreferrer">EDU</a></li>
          <li><a href="https://codeforces.com/apiHelp" target="_blank" rel="noreferrer">API</a></li>
          <li><Link to="/calendar">CALENDAR</Link></li>
          <li><Link to="/help">HELP</Link></li>
        </ul>
        <input placeholder="" type="text" className="search-box" />
      </div>
    </nav>
  );
}

export default Navbar;