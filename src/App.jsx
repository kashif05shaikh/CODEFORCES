import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import TopPage from "./pages/TopPage";
import CatalogPage from "./pages/CatalogPage";

import ContestPage from "./pages/ContestPage";
import ContestDetailPage from "./pages/ContestDetailPage";

import HelpPage from "./pages/HelpPage";
import CalendarPage     from "./pages/CalendarPage";
import GymPage           from "./pages/GymPage";
import ApiHelpPage from "./pages/ApiHelpPage";
import ProblemsetPage    from "./pages/ProblemsetPage";
import EduPage from "./pages/EduPage";
import RatingPage from "./pages/RatingPage";
import GroupsPage from "./pages/GroupsPage";
import CodeforcesFooter from "./components/CodeforcesFooter";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/top" element={<TopPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/contests" element={<ContestPage />} />
        <Route path="/contest/:id" element={<ContestDetailPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/gym" element={<GymPage />} />
        <Route path="/problemset" element={<ProblemsetPage />} />
        <Route path="/api-help" element={<ApiHelpPage />} />
        <Route path="/api-help/methods" element={<ApiHelpPage />} />
        <Route path="/api-help/objects" element={<ApiHelpPage />} />
        <Route path="/edu" element={<EduPage />} />
        <Route path="/ratings" element={<RatingPage />} />
        <Route path="/groups" element={<GroupsPage />} />
      </Routes>

      <CodeforcesFooter />
    </BrowserRouter>
  );
}

export default App;
