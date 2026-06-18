import Navbar from "../components/Navbar";
import ContestFeed from "../components/ContestFeed";
import "./ContestPage.css";
export default function ContestPage() {
  return (
    <>
      <Navbar />
      <div className="container">
        <ContestFeed />
      </div>
    </>
  );
}
