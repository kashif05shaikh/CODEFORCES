import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import TopPage from "./pages/TopPage";
import CatalogPage from "./pages/CatalogPage";

import ContestPage from "./pages/ContestPage";
import ContestDetailPage from "./pages/ContestDetailPage";

import HelpPage from "./pages/HelpPage";
import CalendarPage     from "./pages/CalendarPage";
import GymPage           from "./pages/GymPage";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
