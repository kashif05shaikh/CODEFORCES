import Navbar from "../components/Navbar";
import BlogFeed from "../components/BlogFeed";
import Sidebar from "../components/Sidebar";
import "../App.css";

function HomePage() {
  return (
    <div>
      <Navbar />
      <div className="container">
        <div className="main-layout">
          <BlogFeed />
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default HomePage;