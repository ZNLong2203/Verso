import React from 'react';

export const ChoTai: React.FC<{ nhan: string }> = ({ nhan }) => (
  <div className="min-h-screen bg-giay">
    <div className="max-w-3xl mx-auto px-5 py-10">
      <p role="status" aria-live="polite" className="text-base font-bold text-verso-700 m-0">
        {nhan}
      </p>
      <div aria-hidden="true" className="mt-6 grid gap-3">
        <div className="h-8 w-2/3 rounded bg-giay-sau" />
        <div className="h-4 w-full rounded bg-giay-sau" />
        <div className="h-4 w-5/6 rounded bg-giay-sau" />
        <div className="h-4 w-3/4 rounded bg-giay-sau" />
      </div>
    </div>
  </div>
);
