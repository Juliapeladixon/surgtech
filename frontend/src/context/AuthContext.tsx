import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StaffSession } from "../types";
import {
  ApiError,
  apiDisplayName,
  apiErrorMessage,
  changePasswordRequest,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  updateMeRequest,
  type ApiUser,
  type RegisterPayload,
} from "../lib/api";
import {
  clearSession,
  readStaffSession,
  writeStaffSession,
} from "../lib/storage";

type ProfilePatch = Partial<
  Pick<
    ApiUser,
    | "username"
    | "first_name"
    | "last_name"
    | "email"
    | "phone"
    | "job_title"
  >
>;

interface AuthContextValue {
  staff: StaffSession | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (data: ProfilePatch) => Promise<string | null>;
  changePassword: (
    oldPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sessionFromApi(
  user: ApiUser,
  token: string,
  mustChangePassword?: boolean,
): StaffSession {
  return {
    token,
    id: user.id,
    username: user.username,
    displayName: apiDisplayName(user),
    role: user.role,
    canEdit: user.can_edit,
    mustChangePassword:
      mustChangePassword ?? user.must_change_password ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffSession | null>(() =>
    readStaffSession(),
  );
  const [ready, setReady] = useState(() => !readStaffSession());

  useEffect(() => {
    const saved = readStaffSession();
    if (!saved) {
      setReady(true);
      return;
    }

    let cancelled = false;
    meRequest(saved.token)
      .then((user) => {
        if (cancelled) return;
        const next = sessionFromApi(user, saved.token);
        writeStaffSession(next);
        setStaff(next);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setStaff(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      staff,
      ready,
      login: async (username, password) => {
        try {
          const data = await loginRequest(username.trim(), password);
          const session = sessionFromApi(
            data.user,
            data.token,
            data.must_change_password,
          );
          writeStaffSession(session);
          setStaff(session);
          return null;
        } catch (err) {
          return apiErrorMessage(err, "Could not sign in. Please try again.");
        }
      },
      register: async (payload) => {
        try {
          const data = await registerRequest({
            ...payload,
            username: payload.username.trim(),
            email: payload.email?.trim() || undefined,
            first_name: payload.first_name?.trim() || undefined,
            last_name: payload.last_name?.trim() || undefined,
            phone: payload.phone?.trim() || undefined,
          });
          const session = sessionFromApi(data.user, data.token, false);
          writeStaffSession(session);
          setStaff(session);
          return null;
        } catch (err) {
          return apiErrorMessage(
            err,
            "Could not create your account. Please try again.",
          );
        }
      },
      logout: async () => {
        const token = staff?.token;
        clearSession();
        setStaff(null);
        if (!token) return;
        try {
          await logoutRequest(token);
        } catch {
          // Local sign-out still succeeds if the API call fails.
        }
      },
      updateProfile: async (data) => {
        if (!staff) return "Sign in required.";
        try {
          const user = await updateMeRequest(staff.token, data);
          const next = sessionFromApi(user, staff.token);
          writeStaffSession(next);
          setStaff(next);
          return null;
        } catch (err) {
          return apiErrorMessage(err, "Could not update your profile.");
        }
      },
      changePassword: async (oldPassword, newPassword, newPasswordConfirm) => {
        if (!staff) return "Sign in required.";
        try {
          const data = await changePasswordRequest({
            username: staff.username,
            old_password: oldPassword,
            new_password: newPassword,
            new_password_confirm: newPasswordConfirm,
          });
          const user = await meRequest(data.token);
          const next = sessionFromApi(user, data.token, false);
          writeStaffSession(next);
          setStaff(next);
          return null;
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) {
            // Password may have changed but follow-up /me failed — clear local session.
            clearSession();
            setStaff(null);
          }
          return apiErrorMessage(err, "Could not change your password.");
        }
      },
    }),
    [ready, staff],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useStaff() {
  const { staff } = useAuth();
  if (!staff) throw new Error("Sign-in is required.");
  return staff;
}
