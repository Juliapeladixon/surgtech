import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/PageChrome";
import { IconLock, IconProfile } from "../components/Icons";
import { useAuth, useStaff } from "../context/AuthContext";
import {
  ApiError,
  JOB_TITLE_LABELS,
  meRequest,
} from "../lib/api";

export function ProfilePage() {
  const staff = useStaff();
  const { updateProfile, changePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [details, setDetails] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
  });
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    meRequest(staff.token)
      .then((user) => {
        if (cancelled) return;
        setDetails({
          username: user.username ?? "",
          first_name: user.first_name ?? "",
          last_name: user.last_name ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          job_title: user.job_title ?? "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Could not load your profile.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [staff.token]);

  const onSaveDetails = async (event: FormEvent) => {
    event.preventDefault();
    setDetailsMessage(null);
    setDetailsError(null);
    const username = details.username.trim();
    if (!username) {
      setDetailsError("Username is required.");
      return;
    }
    setSavingDetails(true);
    try {
      const message = await updateProfile({
        username,
        first_name: details.first_name.trim(),
        last_name: details.last_name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        job_title: details.job_title,
      });
      if (message) {
        setDetailsError(message);
        return;
      }
      setDetailsMessage("Profile updated.");
      const user = await meRequest(staff.token);
      setDetails({
        username: user.username ?? "",
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        job_title: user.job_title ?? "",
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);
    if (passwords.new_password !== passwords.new_password_confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const message = await changePassword(
        passwords.old_password,
        passwords.new_password,
        passwords.new_password_confirm,
      );
      if (message) {
        setPasswordError(message);
        return;
      }
      setPasswordMessage("Password changed.");
      setPasswords({
        old_password: "",
        new_password: "",
        new_password_confirm: "",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Account"
        title="Profile"
        description="Update your username, details, and password."
        icon={<IconProfile className="h-4 w-4" />}
      />

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading profile…</p>
      ) : loadError ? (
        <p className="mt-6 text-sm text-copper">{loadError}</p>
      ) : (
        <div className="mt-6 space-y-8">
          <form
            onSubmit={onSaveDetails}
            className="border border-line bg-paper p-5"
          >
            <h2 className="font-serif text-lg font-medium">Account details</h2>
            <p className="mt-1 text-[13px] text-muted">
              Change your username and contact details.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                Username
                <input
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.username}
                  onChange={(e) =>
                    setDetails({ ...details, username: e.target.value })
                  }
                  autoComplete="username"
                  required
                  disabled={savingDetails}
                />
              </label>
              <label className="block text-sm">
                First name
                <input
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.first_name}
                  onChange={(e) =>
                    setDetails({ ...details, first_name: e.target.value })
                  }
                  disabled={savingDetails}
                />
              </label>
              <label className="block text-sm">
                Last name
                <input
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.last_name}
                  onChange={(e) =>
                    setDetails({ ...details, last_name: e.target.value })
                  }
                  disabled={savingDetails}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                Email
                <input
                  type="email"
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.email}
                  onChange={(e) =>
                    setDetails({ ...details, email: e.target.value })
                  }
                  disabled={savingDetails}
                />
              </label>
              <label className="block text-sm">
                Phone
                <input
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.phone}
                  onChange={(e) =>
                    setDetails({ ...details, phone: e.target.value })
                  }
                  disabled={savingDetails}
                />
              </label>
              <label className="block text-sm">
                Job title
                <select
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={details.job_title}
                  onChange={(e) =>
                    setDetails({ ...details, job_title: e.target.value })
                  }
                  disabled={savingDetails}
                >
                  <option value="">Select…</option>
                  {Object.entries(JOB_TITLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {detailsError && (
              <p className="mt-3 text-sm text-copper">{detailsError}</p>
            )}
            {detailsMessage && (
              <p className="mt-3 text-sm text-teal">{detailsMessage}</p>
            )}

            <button
              type="submit"
              disabled={savingDetails}
              className="mt-4 bg-scrub px-4 py-2 text-sm text-white hover:bg-scrub-deep disabled:opacity-60"
            >
              {savingDetails ? "Saving…" : "Save details"}
            </button>
          </form>

          <form
            onSubmit={onChangePassword}
            className="border border-line bg-paper p-5"
          >
            <h2 className="inline-flex items-center gap-2 font-serif text-lg font-medium">
              <IconLock className="h-4 w-4 text-sky" />
              Password
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Use your current password, then choose a new one. You stay signed
              in after the change.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Current password
                <input
                  type="password"
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={passwords.old_password}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      old_password: e.target.value,
                    })
                  }
                  autoComplete="current-password"
                  required
                  disabled={savingPassword}
                />
              </label>
              <label className="block text-sm">
                New password
                <input
                  type="password"
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={passwords.new_password}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      new_password: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  required
                  disabled={savingPassword}
                />
              </label>
              <label className="block text-sm">
                Confirm new password
                <input
                  type="password"
                  className="mt-1.5 w-full border border-line px-3 py-2"
                  value={passwords.new_password_confirm}
                  onChange={(e) =>
                    setPasswords({
                      ...passwords,
                      new_password_confirm: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  required
                  disabled={savingPassword}
                />
              </label>
            </div>

            {passwordError && (
              <p className="mt-3 text-sm text-copper">{passwordError}</p>
            )}
            {passwordMessage && (
              <p className="mt-3 text-sm text-teal">{passwordMessage}</p>
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="mt-4 bg-scrub px-4 py-2 text-sm text-white hover:bg-scrub-deep disabled:opacity-60"
            >
              {savingPassword ? "Updating…" : "Change password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
