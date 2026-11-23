import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onUpgrade?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, onUpgrade }) => {
  const isLimitError = message.toLowerCase().includes('limit') || message.toLowerCase().includes('upgrade');

  return (
    <div className="py-8 px-4 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3 border border-rose-100">
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h4 className="text-sm font-semibold text-slate-800 mb-1">
        {isLimitError ? 'Usage Limit Reached' : 'Analysis Failed'}
      </h4>
      <p className="text-xs text-slate-500 mb-4 max-w-xs">{message}</p>

      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
        {isLimitError && onUpgrade && (
          <Button variant="primary" size="sm" onClick={onUpgrade}>
            Upgrade Plan
          </Button>
        )}
      </div>
    </div>
  );
};
