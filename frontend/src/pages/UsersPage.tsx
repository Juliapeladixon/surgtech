import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { BackLink, EmptyState, PageHeader } from "../components/PageChrome";
import { IconLock, IconProfile, IconSearch } from "../components/Icons";
import { useStaff } from "../context/AuthContext";
import {
  ApiError,
  JOB_TITLE_LABELS,
  apiDisplayName,
  formatApiDate,
  getUserRequest,
  listHospitalUsers,
  patchUserRequest,
  resetUserPasswordRequest,
  type ApiUser,
} from "../lib/api";
import { staffPath } from "../lib/catalog";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="mt-1 text-sm">{value || "—"}</dd>
    </div>
  );
}

export function UsersPage() {
  const staff = useStaff();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (staff.role !== "ADMIN") {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    listHospitalUsers(staff.token)
      .then((rows) => {
        if (cancelled) return;
        setUsers(rows);
        setSelectedId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load users.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staff.role, staff.token]);

  useEffect(() => {
    if (!selectedId || staff.role !== "ADMIN") {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setResetMessage(null);
    setResetError(null);
    setNewPassword("");
    setConfirmPassword("");

    getUserRequest(staff.token, selectedId)
      .then((user) => {
        if (cancelled) return;
        setDetail(user);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetail(null);
        setDetailError(
          err instanceof ApiError ? err.message : "Could not load user details.",
        );
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, staff.role, staff.token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [
        user.username,
        user.first_name,
        user.last_name,
        user.email,
        user.phone,
        user.role,
        user.job_title,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, users]);

  const onResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    setResetMessage(null);
    setResetError(null);

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetting(true);
    try {
      const result = await resetUserPasswordRequest(
        staff.token,
        detail.id,
        newPassword,
      );
      setResetMessage(result.message);
      setNewPassword("");
      setConfirmPassword("");
      const refreshed = await getUserRequest(staff.token, detail.id);
      setDetail(refreshed);
      setUsers((rows) =>
        rows.map((row) => (row.id === refreshed.id ? refreshed : row)),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { new_password?: string[] } | undefined;
        setResetError(
          details?.new_password?.join(" ") || err.message,
        );
      } else {
        setResetError("Could not reset password.");
      }
    } finally {
      setResetting(false);
    }
  };

  const onToggleActive = async () => {
    if (!detail || detail.id === staff.id) return;
    setToggling(true);
    setDetailError(null);
    try {
      const updated = await patchUserRequest(staff.token, detail.id, {
        is_active: !detail.is_active,
      });
      setDetail(updated);
      setUsers((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row)),
      );
    } catch (err) {
      setDetailError(
        err instanceof ApiError ? err.message : "Could not update account status.",
      );
    } finally {
      setToggling(false);
    }
  };

  if (staff.role !== "ADMIN") {
    return <Navigate to={staffPath()} replace />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink to={staffPath()} className="mb-4">
        Back to overview
      </BackLink>
      <PageHeader
        kicker="Admin"
        title="Users"
        description="Platform accounts. Open a user for full details and password reset."
        icon={<IconProfile className="h-4 w-4" />}
      />

      <div className="mt-6 border border-line bg-paper px-5 py-4">
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky" />
          <input
            className="w-full border border-line py-2 pl-10 pr-3 text-sm"
            placeholder="Search name, username, role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-copper">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <EmptyState>No users found for this hospital.</EmptyState>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">
                No users match “{query.trim()}”.
              </p>
            ) : (
              <ul className="divide-y divide-line border-y border-line bg-paper">
                {filtered.map((user) => {
                  const active = user.id === selectedId;
                  return (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(user.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-linen ${
                          active ? "bg-linen" : ""
                        }`}
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-teal text-sm font-medium text-white">
                          {(
                            user.first_name?.[0] ||
                            user.username[0] ||
                            "?"
                          ).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {apiDisplayName(user)}
                            {user.id === staff.id && (
                              <span className="ml-2 text-[12px] font-normal text-sky">
                                you
                              </span>
                            )}
                          </span>
                          <span className="block text-[12px] text-muted">
                            @{user.username} · {user.role}
                          </span>
                        </span>
                        <span
                          className={`text-[12px] ${
                            user.is_active ? "text-teal" : "text-copper"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-muted">
              {filtered.length} of {users.length} user
              {users.length === 1 ? "" : "s"}
            </p>
          </div>

          <section className="border border-line bg-paper">
            {detailLoading ? (
              <p className="px-5 py-8 text-sm text-muted">Loading details…</p>
            ) : detailError && !detail ? (
              <p className="px-5 py-8 text-sm text-copper">{detailError}</p>
            ) : !detail ? (
              <p className="px-5 py-8 text-sm text-muted">
                Select a user to view their record.
              </p>
            ) : (
              <div>
                <div className="border-b border-line px-5 py-4">
                  <p className="field-label">User record</p>
                  <h2 className="mt-1 font-serif text-xl font-medium">
                    {apiDisplayName(detail)}
                  </h2>
                  <p className="mt-1 text-sm text-muted">@{detail.username}</p>
                </div>

                <dl className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                  <Field label="User ID" value={String(detail.id)} />
                  <Field label="Username" value={detail.username} />
                  <Field label="First name" value={detail.first_name} />
                  <Field label="Last name" value={detail.last_name} />
                  <Field label="Email" value={detail.email} />
                  <Field label="Phone" value={detail.phone} />
                  <Field
                    label="Job title"
                    value={
                      detail.job_title
                        ? JOB_TITLE_LABELS[detail.job_title] || detail.job_title
                        : "—"
                    }
                  />
                  <Field label="Role" value={detail.role} />
                  <Field
                    label="Can edit cards"
                    value={detail.can_edit ? "Yes" : "No"}
                  />
                  <Field
                    label="Account status"
                    value={detail.is_active ? "Active" : "Inactive"}
                  />
                  <Field
                    label="Must change password"
                    value={detail.must_change_password ? "Yes" : "No"}
                  />
                  <Field
                    label="Date joined"
                    value={formatApiDate(detail.date_joined)}
                  />
                  <Field
                    label="Last login"
                    value={formatApiDate(detail.last_login)}
                  />
                </dl>

                {detailError && (
                  <p className="px-5 pb-3 text-sm text-copper">{detailError}</p>
                )}

                <div className="border-t border-line px-5 py-4">
                  <button
                    type="button"
                    disabled={toggling || detail.id === staff.id}
                    onClick={() => void onToggleActive()}
                    className="border border-line px-3 py-1.5 text-[13px] hover:bg-linen disabled:opacity-50"
                  >
                    {toggling
                      ? "Updating…"
                      : detail.is_active
                        ? "Deactivate account"
                        : "Reactivate account"}
                  </button>
                  {detail.id === staff.id && (
                    <p className="mt-2 text-[12px] text-muted">
                      You cannot deactivate your own account here.
                    </p>
                  )}
                </div>

                <form
                  onSubmit={onResetPassword}
                  className="space-y-3 border-t border-line px-5 py-5"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center bg-copper text-white">
                      <IconLock className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-medium">Reset password</h3>
                      <p className="text-[12px] text-muted">
                        Sets a temporary password and forces a change at next
                        login. Their current session token is revoked.
                      </p>
                    </div>
                  </div>

                  <label className="block text-sm">
                    New password
                    <input
                      type="password"
                      className="mt-1.5 w-full border border-line px-3 py-2"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={resetting}
                    />
                  </label>
                  <label className="block text-sm">
                    Confirm new password
                    <input
                      type="password"
                      className="mt-1.5 w-full border border-line px-3 py-2"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={resetting}
                    />
                  </label>

                  {resetError && (
                    <p className="text-sm text-copper">{resetError}</p>
                  )}
                  {resetMessage && (
                    <p className="text-sm text-teal">{resetMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={resetting || !newPassword || !confirmPassword}
                    className="inline-flex items-center gap-2 bg-scrub px-3 py-1.5 text-[13px] text-white hover:bg-scrub-deep disabled:opacity-60"
                  >
                    <IconLock className="h-3.5 w-3.5" />
                    {resetting ? "Resetting…" : "Reset password"}
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
