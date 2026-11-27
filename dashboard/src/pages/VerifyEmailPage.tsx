import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const verified = status === 'verified';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 font-bold text-white text-xl mx-auto">
            LP
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {verified ? 'Email Verified' : 'Verification Link Invalid or Expired'}
          </h1>
          <p className="text-sm text-slate-600">
            {verified
              ? 'Your email address has been verified. You can continue using LeadPing AI.'
              : 'This verification link is no longer valid. Sign in to request a fresh verification email from your dashboard.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex justify-center w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Continue to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
