'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Bot, 
  Calendar, 
  Settings, 
  History, 
  Users,
  Database,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  {
    key: 'dashboard',
    icon: <Home className="w-5 h-5" />,
    label: '仪表盘',
    path: '/'
  },
  {
    key: 'agents',
    icon: <Bot className="w-5 h-5" />,
    label: '智能体管理',
    path: '/agents',
    children: [
      { key: 'agents-list', label: '智能体列表', path: '/agents' },
      { key: 'agents-create', label: '创建智能体', path: '/agents/create' },
      { key: 'agents-templates', label: '模板库', path: '/agents/templates' }
    ]
  },
  {
    key: 'meetings',
    icon: <Calendar className="w-5 h-5" />,
    label: '会议管理',
    path: '/meetings',
    children: [
      { key: 'meetings-list', label: '会议列表', path: '/meetings' },
      { key: 'meetings-create', label: '创建会议', path: '/meetings/create' },
      { key: 'meetings-live', label: '实时会议', path: '/meetings/live' }
    ]
  },
  {
    key: 'history',
    icon: <History className="w-5 h-5" />,
    label: '历史回溯',
    path: '/history'
  },
  {
    key: 'settings',
    icon: <Settings className="w-5 h-5" />,
    label: '系统配置',
    path: '/settings'
  }
];

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const router = useRouter();
  const [activeKey, setActiveKey] = React.useState('dashboard');
  const [expandedKeys, setExpandedKeys] = React.useState<string[]>([]);

  const handleMenuClick = (item: any) => {
    setActiveKey(item.key);
    if (item.children) {
      // Toggle expansion for parent items
      setExpandedKeys(prev => 
        prev.includes(item.key) 
          ? prev.filter(k => k !== item.key)
          : [...prev, item.key]
      );
    } else {
      // Navigate for leaf items
      router.push(item.path);
    }
  };

  const handleSubMenuClick = (item: any) => {
    setActiveKey(item.key);
    router.push(item.path);
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
                  activeKey === item.key
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
                        activeKey === subItem.key
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