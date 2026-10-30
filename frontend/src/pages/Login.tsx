import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthHero } from "../components/AuthHero";
import { BrandLogo } from "../components/BrandLogo";
import { IconLock } from "../components/Icons";
import { useAuth } from "../context/AuthContext";
import { clinicHome } from "../lib/catalog";

export function LoginPage() {
  const { staff, ready, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && staff) {
    return <Navigate to={clinicHome()} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const message = await login(username, password);
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
      <AuthHero mode="login" />

      <section className="flex items-center justify-center bg-linen px-6 py-16">
        <form
          onSubmit={onSubmit}
          className="auth-hero-rise w-full max-w-[22rem] border border-line bg-paper px-7 py-8"
        >
          <BrandLogo className="mb-6" />
          <h2 className="font-serif text-xl font-medium">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Username or email</p>

          <label className="mt-6 block text-sm">
            Username or email
            <input
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={submitting}
            />
          </label>
          <label className="mt-3 block text-sm">
            Password
            <input
              type="password"
              className="mt-1.5 w-full border border-line px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
          </label>

          {error && <p className="mt-3 text-sm text-copper">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !ready}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-scrub px-4 py-2.5 text-sm text-white hover:bg-scrub-deep disabled:opacity-60"
          >
            <IconLock className="h-4 w-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-5 text-center text-[13px] text-muted">
            New here?{" "}
            <Link to="/register" className="text-sky hover:text-ink">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
