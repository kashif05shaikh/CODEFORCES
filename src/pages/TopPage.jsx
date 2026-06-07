import Navbar from "../components/Navbar";
import TopFeed from "../components/TopFeed";
import Sidebar from "../components/Sidebar";
import "../App.css";

function TopPage() {
  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="main-layout">
          <TopFeed />
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default TopPage;