import React from 'react';
import { AlertCircle, RefreshCw, Inbox, AlertTriangle } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string; count?: number }> = ({
  message = 'Loading compliance records...',
  count = 3,
}) => {
  return (
    <div
      className="p-8 space-y-4 animate-pulse"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>{message}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-200/70 rounded-lg w-full" />
        ))}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ title, description, icon, action }) => {
  return (
    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-white shadow-xs">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Failed to load records',
  message = 'An unexpected error occurred while communicating with the surveillance engine.',
  onRetry,
}) => {
  return (
    <div
      className="p-6 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 text-center my-4"
      role="alert"
    >
      <div className="mx-auto w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-rose-700 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Request
          </button>
        </div>
      )}
    </div>
  );
};

export const StaleDataBanner: React.FC<{
  lastRefresh: string | null;
  onRefreshClick?: () => void;
  isOverdue?: boolean;
}> = ({ lastRefresh, onRefreshClick, isOverdue = false }) => {
  if (!isOverdue && lastRefresh) return null;

  return (
    <div
      className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-md shadow-xs flex items-center justify-between"
      role="status"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Regulatory Data Notice: </span>
          {lastRefresh ? (
            <span>
              Last successful sync was on {new Date(lastRefresh).toLocaleString()}. Ingestion may be overdue.
            </span>
          ) : (
            <span>No data ingestion has succeeded yet. Public signals have not been pulled.</span>
          )}
        </div>
      </div>
      {onRefreshClick && (
        <button
          type="button"
          onClick={onRefreshClick}
          className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded transition-colors whitespace-nowrap ml-4"
        >
          Run Sync Now
        </button>
      )}
    </div>
  );
};
