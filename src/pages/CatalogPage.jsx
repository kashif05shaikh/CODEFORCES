import Navbar from "../components/Navbar";
import CatalogFeed from "../components/CatalogFeed";
import "../App.css";

function CatalogPage() {
  return (
    <div>
      <Navbar />

      <div className="container">
          <CatalogFeed />
      </div>
    </div>
  );
}

export default CatalogPage;