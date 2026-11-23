import React from 'react';

interface LoadingStateProps {
  currentStep: number;
  steps: string[];
}

export const LoadingState: React.FC<LoadingStateProps> = ({ currentStep, steps }) => {
  return (
    <div className="py-8 px-4 flex flex-col items-center">
      {/* Animated AI Pulse icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-indigo-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-800 mb-1">
        Analyzing Webpage
      </h3>
      <p className="text-xs text-slate-500 mb-6 text-center max-w-[280px]">
        Our AI sales intelligence engine is extracting deep buying signals and ICP metrics.
      </p>

      {/* Checklist of steps */}
      <div className="w-full max-w-xs space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step}
              className={`flex items-center text-xs transition-opacity duration-300 ${
                isDone
                  ? 'text-emerald-600 font-medium'
                  : isCurrent
                  ? 'text-indigo-600 font-medium'
                  : 'text-slate-400'
              }`}
            >
              <div className="mr-3 flex-shrink-0">
                {isDone ? (
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isCurrent ? (
                  <svg
                    className="w-4 h-4 text-indigo-600 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                )}
              </div>
              <span className="truncate">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
