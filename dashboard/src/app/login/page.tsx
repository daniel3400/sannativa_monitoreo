"use client";

import Auth from '@/app/components/Auth';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-400 flex flex-col justify-center items-center p-4">
      <Auth />
    </div>
  );
}