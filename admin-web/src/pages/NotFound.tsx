import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-serif text-4xl font-semibold text-ink">404</p>
      <p className="mt-2 text-[14px] text-slate-soft">This page doesn't exist in the monitoring platform.</p>
      <Link to="/" className="mt-4 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink-light">
        Return to dashboard
      </Link>
    </div>
  );
}
