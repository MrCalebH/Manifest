'use client';

import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="max-w-4xl mx-auto p-8">
        {children}
      </div>
    </div>
  );
} 