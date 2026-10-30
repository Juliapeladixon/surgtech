import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { ClinicLayout } from "./components/ClinicLayout";
import { AuthRoute, StaffRoute } from "./components/ProtectedRoute";
import { clinicHome, staffPath } from "./lib/catalog";
import { BrowseDoctorCardsPage } from "./pages/BrowseDoctorCards";
import { BrowseDoctorsPage } from "./pages/BrowseDoctors";
import { ClinicDashboardPage } from "./pages/ClinicDashboard";
import { DoctorsPage } from "./pages/DoctorsPage";
import { LoginPage } from "./pages/Login";
import { MyCardsPage } from "./pages/MyCards";
import { PreferenceCardSetupPage } from "./pages/PreferenceCardSetup";
import { PreviewPage } from "./pages/Preview";
import { ProfilePage } from "./pages/Profile";
import { PublicCardPage } from "./pages/PublicCard";
import { RegisterPage } from "./pages/Register";
import { SelectItemsPage } from "./pages/SelectItems";
import { StaffDeskPage } from "./pages/StaffDesk";
import { UsersPage } from "./pages/UsersPage";

function LegacyClinicRedirect({ suffix = "" }: { suffix?: string }) {
  const { specialtyId, doctorId, cardId } = useParams();
  if (cardId) return <Navigate to={`/cards/${cardId}`} replace />;
  if (specialtyId && doctorId) {
    return <Navigate to={`/browse/${specialtyId}/${doctorId}`} replace />;
  }
  if (specialtyId) return <Navigate to={`/browse/${specialtyId}`} replace />;
  if (suffix === "login") return <Navigate to="/login" replace />;
  if (suffix.startsWith("staff")) {
    const rest = suffix.replace(/^staff\/?/, "");
    return <Navigate to={staffPath(rest ? `/${rest}` : "")} replace />;
  }
  return <Navigate to={clinicHome()} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AuthRoute />}>
        <Route path="/" element={<ClinicLayout />}>
          <Route index element={<ClinicDashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="browse/:specialtyId" element={<BrowseDoctorsPage />} />
          <Route
            path="browse/:specialtyId/:doctorId"
            element={<BrowseDoctorCardsPage />}
          />
          <Route path="cards/:cardId" element={<PublicCardPage />} />
        </Route>
      </Route>

      <Route path="/staff" element={<StaffRoute />}>
        <Route index element={<StaffDeskPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="cards" element={<MyCardsPage />} />
        <Route path="preference-card" element={<PreferenceCardSetupPage />} />
        <Route
          path="preference-card/sutures"
          element={<SelectItemsPage source="suture" />}
        />
        <Route
          path="preference-card/instruments"
          element={<SelectItemsPage source="instrument" />}
        />
        <Route
          path="preference-card/packs"
          element={<SelectItemsPage source="pack" />}
        />
        <Route path="preference-card/preview" element={<PreviewPage />} />
      </Route>

      {/* Legacy hospital-scoped URLs */}
      <Route path="/c/:clinicSlug" element={<LegacyClinicRedirect />} />
      <Route
        path="/c/:clinicSlug/browse/:specialtyId"
        element={<LegacyClinicRedirect />}
      />
      <Route
        path="/c/:clinicSlug/browse/:specialtyId/:doctorId"
        element={<LegacyClinicRedirect />}
      />
      <Route
        path="/c/:clinicSlug/cards/:cardId"
        element={<LegacyClinicRedirect />}
      />
      <Route
        path="/c/:clinicSlug/staff/login"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/c/:clinicSlug/staff/*"
        element={<Navigate to={staffPath()} replace />}
      />
      <Route path="/staff/login" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
