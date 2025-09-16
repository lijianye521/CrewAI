'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ConfigPage() {
  const router = useRouter();

  React.useEffect(() => {
    // 重定向到主页面的config视图
    router.replace('/#config');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>正在跳转到系统配置页面...</p>
      </div>
    </div>
  );
}