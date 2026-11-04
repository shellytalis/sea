import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Shell from "./components/Shell";
import { EmptyState } from "./ui/States";
import Home from "./pages/Home";
import VesselPage from "./pages/VesselPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyPage from "./pages/CompanyPage";
import DesignPage from "./pages/DesignPage";
import { Mono } from "./ui/Ltr";
function Soon() {
  const { pathname } = useLocation();
  return <EmptyState title="המסך בפיתוח"><Mono>{pathname}</Mono></EmptyState>;
}
export default function App() {
  return <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="vessels" element={<Navigate to="/" replace />} />
        <Route path="vessels/:id" element={<VesselPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyPage />} />
        <Route path="design" element={<DesignPage />} />
        <Route path="*" element={<Soon />} />
      </Route>
    </Routes>;
}
