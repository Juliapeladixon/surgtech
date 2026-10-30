import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthHero } from "../components/AuthHero";
import { BrandLogo } from "../components/BrandLogo";
import { IconProfile } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { clinicHome } from "../lib/catalog";

export function RegisterPage() {
  const { staff, ready, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && staff) {
    return <Navigate to={clinicHome()} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.password_confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const message = await register({
        username: form.username,
        email: form.email || undefined,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        password: form.password,
        password_confirm: form.password_confirm,
      });
      if (message) {
        setError(message);
        return;
      }
      navigate(clinicHome());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHero mode="register" />

      <section className="flex items-center justify-center bg-linen px-6 py-16">
        <form
          onSubmit={onSubmit}
          className="auth-hero-rise w-full max-w-[22rem] border border-line bg-paper px-7 py-8"
        >
          <BrandLogo className="mb-6" />
          <h2 className="font-serif text-xl font-medium">Create account</h2>
          <p className="mt-1 text-sm text-muted">
            New person · takes a minute
          </p>

          <label className="mt-6 block text-sm">
            Username
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
              disabled={submitting}
            />
          </label>
          <label className="mt-3 block text-sm">
            Email{" "}
            <span className="text-muted">(optional)</span>
            <input
              type="email"
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
              disabled={submitting}
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              First name
              <input
                className="mt-1.5 w-full border border-line px-3 py-2"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
                autoComplete="given-name"
                disabled={submitting}
              />
            </label>
            <label className="block text-sm">
              Last name
              <input
                className="mt-1.5 w-full border border-line px-3 py-2"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
                autoComplete="family-name"
                disabled={submitting}
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            Password
            <input
              type="password"
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </label>
          <label className="mt-3 block text-sm">
            Confirm password
            <input
              type="password"
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={form.password_confirm}
              onChange={(e) =>
                setForm({ ...form, password_confirm: e.target.value })
              }
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </label>

          {error && <p className="mt-3 text-sm text-copper">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !ready}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-scrub px-4 py-2.5 text-sm text-white hover:bg-scrub-deep disabled:opacity-60"
          >
            <IconProfile className="h-4 w-4" />
            {submitting ? "Creating…" : "Create account"}
          </button>

          <p className="mt-5 text-center text-[13px] text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-sky hover:text-ink">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
