import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string })?.from || '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Enter both your registered email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left: institutional context panel */}
      <div className="hidden w-[42%] flex-col justify-between bg-ink px-12 py-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-ochre">
            <ShieldCheck size={20} />
          </div>
          <div className="leading-tight">
            <p className="font-serif text-[16px] font-semibold">DoSJE Admin Dashboard</p>
            <p className="text-[11.5px] text-white/50">Smart Real-Time Monitoring &amp; Inspection Platform</p>
          </div>
        </div>

        <div className="max-w-sm">
          <h2 className="font-serif text-[26px] font-semibold leading-snug">
            Department of Social Justice and Empowerment
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            A centralized system for monitoring projects, institutes, and beneficiaries under
            DoSJE schemes — built for transparency, accountability, and citizen-centric service
            delivery.
          </p>
          <div className="mt-8 space-y-3 border-l border-white/15 pl-4 text-[13px] text-white/50">
            <p>Live CCTV and inspection oversight</p>
            <p>Randomized, auditable inspection assignment</p>
            <p>Geo-tagged evidence and AI-assisted risk review</p>
          </div>
        </div>

        <p className="text-[11px] text-white/35">Smart India Hackathon 2026 · Problem Statement 26095</p>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-ochre text-white">
                <ShieldCheck size={18} />
              </div>
              <p className="font-serif text-[16px] font-semibold text-ink">DoSJE Admin Dashboard</p>
            </div>
          </div>

          <h1 className="font-serif text-[22px] font-semibold text-ink">Official sign in</h1>
          <p className="mt-1 text-[13.5px] text-slate-soft">
            Access is restricted to authorized DoSJE officials and inspection personnel.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-medium text-slate">
                Registered email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer.name@dosje.gov.in"
                className="w-full rounded-md border border-hairline bg-panel px-3 py-2.5 text-[13.5px] text-ink placeholder:text-slate-faint focus:border-ochre focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-medium text-slate">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-md border border-hairline bg-panel px-3 py-2.5 pr-10 text-[13.5px] text-ink placeholder:text-slate-faint focus:border-ochre focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-faint hover:text-slate"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {formError && (
              <p className="rounded-md bg-alert-bg px-3 py-2 text-[12.5px] text-alert">{formError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-ink-light disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-[11.5px] text-slate-faint">
            This is a prototype login for the SIH 2026 demonstration. Authentication will connect
            to Member 2's backend JWT service — any email and password will sign you in for now.
          </p>
        </div>
      </div>
    </div>
  );
}
