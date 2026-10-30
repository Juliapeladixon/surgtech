import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CardBuilderProvider } from "../context/CardBuilderContext";
import { StaffLayout } from "./StaffLayout";

/** Any signed-in account can open the main directory (former public file). */
export function AuthRoute() {
  const { staff, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linen text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!staff) return <Navigate to="/login" replace />;

  return <Outlet />;
}

/** Staff tools (admin/editor workflows) — still requires sign-in. */
export function StaffRoute() {
  const { staff, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linen text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!staff) return <Navigate to="/login" replace />;

  return (
    <CardBuilderProvider>
      <StaffLayout>
        <Outlet />
      </StaffLayout>
    </CardBuilderProvider>
  );
}
