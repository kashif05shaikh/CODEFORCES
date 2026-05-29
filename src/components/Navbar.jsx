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
            <a href="#">Enter</a>
            <span> | </span>
            <a href="#">Register</a>
          </div>
        </div>
      </div>

      <div className="navbar-links-bar">
        <ul className="navbar-links">
          <li><a href="#">HOME</a></li>
          <li><a href="#">TOP</a></li>
          <li><a href="#">CATALOG</a></li>
          <li><a href="#">CONTESTS</a></li>
          <li><a href="#">GYM</a></li>
          <li><a href="#">PROBLEMSET</a></li>
          <li><a href="#">GROUPS</a></li>
          <li><a href="#">RATING</a></li>
          <li><a href="#">EDU</a></li>
          <li><a href="#">API</a></li>
          <li><a href="#">CALENDAR</a></li>
          <li><a href="#">HELP</a></li>
        </ul>
        <input  placeholder="🔍" type="text" className="search-box"  />
      </div>
    </nav>
  );
}

export default Navbar;