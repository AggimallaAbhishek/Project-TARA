import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card-dark p-8 max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-risk-medium/10 text-risk-medium mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold font-display text-text-primary mb-2">Page Not Found</h1>
        <p className="text-text-secondary mb-6">
          The page you requested does not exist or is no longer available.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border text-text-secondary hover:text-cyber-cyan hover:border-cyber-cyan/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
