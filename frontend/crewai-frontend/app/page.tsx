'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/components/layout/Sidebar';
import Header from '@/app/components/layout/Header';

// 导入各种视图组件
import DashboardView from '@/app/components/views/DashboardView';
import AgentsView from '@/app/components/views/AgentsView';
import MeetingsView from '@/app/components/views/MeetingsView';
import HistoryView from '@/app/components/views/HistoryView';
import ConfigView from '@/app/components/views/ConfigView';

export default function MainPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentSubView, setCurrentSubView] = useState('');

  // 监听hash变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      const [view, subView] = hash.split('/');
      setCurrentView(view);
      setCurrentSubView(subView || '');
    };

    // 初始化时设置当前视图
    handleHashChange();

    // 监听hash变化
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 获取当前视图的标题和副标题
  const getViewInfo = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: '仪表盘', subtitle: 'CrewAI多智能体协作平台总览' };
      case 'agents':
        return { title: '智能体管理', subtitle: '管理所有AI智能体的个性化配置' };
      case 'meetings':
        return { title: '会议管理', subtitle: '管理多智能体协作会议，支持实时讨论和历史回放' };
      case 'history':
        return { title: '历史回溯', subtitle: '查看和分析历史会议记录' };
      case 'config':
        return { title: '系统配置', subtitle: '系统设置和参数配置' };
      default:
        return { title: '仪表盘', subtitle: 'CrewAI多智能体协作平台总览' };
    }
  };

  // 渲染当前视图
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'agents':
        return <AgentsView subView={currentSubView} />;
      case 'meetings':
        return <MeetingsView subView={currentSubView} />;
      case 'history':
        return <HistoryView />;
      case 'config':
        return <ConfigView />;
      default:
        return <DashboardView />;
    }
  };

  const viewInfo = getViewInfo();

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentView={currentView}
        currentSubView={currentSubView}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header title={viewInfo.title} subtitle={viewInfo.subtitle} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderCurrentView()}
          </div>
        </main>
      </div>
    </div>
  );
}