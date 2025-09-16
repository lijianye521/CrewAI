'use client';

import React from 'react';
import {
  Home,
  Bot,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  currentView: string;
  currentSubView: string;
}

const menuItems = [
  {
    key: 'dashboard',
    icon: <Home className="w-5 h-5" />,
    label: '仪表盘',
    hash: '#dashboard'
  },
  {
    key: 'agents',
    icon: <Bot className="w-5 h-5" />,
    label: '智能体管理',
    hash: '#agents',
    children: [
      { key: 'agentList', label: '智能体列表', hash: '#agents/list' },
      { key: 'createAgent', label: '创建智能体', hash: '#agents/create' },
      { key: 'agentTemplates', label: '模板库', hash: '#agents/templates' }
    ]
  },
  {
    key: 'meetings',
    icon: <Calendar className="w-5 h-5" />,
    label: '会议管理',
    hash: '#meetings',
    children: [
      { key: 'meetingList', label: '会议列表', hash: '#meetings/list' },
      { key: 'createMeeting', label: '创建会议', hash: '#meetings/create' },
      { key: 'meetingHistory', label: '会议历史', hash: '#meetings/history' }
    ]
  },
  {
    key: 'config',
    icon: <Settings className="w-5 h-5" />,
    label: '系统配置',
    hash: '#config'
  }
];

export default function Sidebar({ collapsed = false, onToggle, currentView, currentSubView }: SidebarProps) {
  const [expandedKeys, setExpandedKeys] = React.useState<string[]>([]);

  // 根据当前视图自动展开相关菜单
  React.useEffect(() => {
    if (currentView === 'agents' || currentView === 'meetings') {
      setExpandedKeys(prev => prev.includes(currentView) ? prev : [...prev, currentView]);
    }
  }, [currentView]);

  const handleMenuClick = (item: { key: string; hash: string; children?: { key: string; label: string; hash: string }[] }) => {
    if (item.children) {
      // Toggle expansion for parent items
      setExpandedKeys(prev =>
        prev.includes(item.key)
          ? prev.filter(k => k !== item.key)
          : [...prev, item.key]
      );
    } else {
      // Navigate for leaf items
      window.location.hash = item.hash;
    }
  };

  const handleSubMenuClick = (item: { key: string; hash: string }) => {
    window.location.hash = item.hash;
  };

  const isActive = (key: string) => {
    if (key === currentView) return true;
    if (key === currentSubView) return true;
    return false;
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} h-screen flex flex-col shadow-sm`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">CrewAI</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <div key={item.key}>
              <button
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1 text-left">{item.label}</span>
                    {item.children && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          expandedKeys.includes(item.key) ? 'transform rotate-90' : ''
                        }`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Sub Menu */}
              {!collapsed && item.children && expandedKeys.includes(item.key) && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((subItem) => (
                    <button
                      key={subItem.key}
                      onClick={() => handleSubMenuClick(subItem)}
                      className={`w-full flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive(subItem.key)
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0"></span>
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        {!collapsed && (
          <div className="text-xs text-gray-500 text-center">
            CrewAI Platform v1.0
            <br />
            多智能体协作系统
          </div>
        )}
      </div>
    </div>
  );
}