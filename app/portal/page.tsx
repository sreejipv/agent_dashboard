"use client";

// app/portal/page.tsx
// Landing page for the client portal.
// Shown when someone visits /portal without a token.

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Portal</h1>
        <p className="text-gray-600 mb-6">
          Access your project portal using the private link we sent you.
          If your link has expired, contact your project manager for a new one.
        </p>
        <p className="text-sm text-gray-400">
          Powered by FelloCoder
        </p>
      </div>
    </div>
  );
}
