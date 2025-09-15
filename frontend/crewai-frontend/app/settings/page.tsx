'use client';

import React, { useState } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Database, 
  Shield, 
  Zap, 
  Globe, 
  Bell,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('sk-********************************');
  const [systemStatus, setSystemStatus] = useState({
    database: 'connected',
    api: 'healthy',
    websocket: 'active',
    agents: 'running'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy': 
      case 'active':
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '已连接';
      case 'healthy': return '健康';
      case 'active': return '活跃';
      case 'running': return '运行中';
      case 'warning': return '警告';
      case 'error': return '错误';
      case 'disconnected': return '断开连接';
      default: return status;
    }
  };

  return (
    <MainLayout title="系统配置" subtitle="管理平台设置、API配置和系统监控">
      <div className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">常规设置</TabsTrigger>
            <TabsTrigger value="api">API配置</TabsTrigger>
            <TabsTrigger value="security">安全设置</TabsTrigger>
            <TabsTrigger value="monitoring">系统监控</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>基础配置</span>
                </CardTitle>
                <CardDescription>
                  配置系统的基本参数和默认设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      平台名称
                    </label>
                    <Input defaultValue="CrewAI Platform" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认语言
                    </label>
                    <Input defaultValue="中文" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会议默认时长 (分钟)
                    </label>
                    <Input defaultValue="60" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大并发会议数
                    </label>
                    <Input defaultValue="10" type="number" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>通知设置</span>
                </CardTitle>
                <CardDescription>
                  配置系统通知和提醒方式
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">会议开始提醒</div>
                      <div className="text-sm text-gray-500">会议开始前5分钟提醒</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">智能体异常通知</div>
                      <div className="text-sm text-gray-500">当智能体出现错误时发送通知</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">系统维护通知</div>
                      <div className="text-sm text-gray-500">系统更新和维护通知</div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">已禁用</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>API密钥配置</span>
                </CardTitle>
                <CardDescription>
                  配置第三方AI服务的API密钥
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DeepSeek API Key
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input 
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="输入API密钥"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button variant="outline">
                      测试连接
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API请求超时 (秒)
                    </label>
                    <Input defaultValue="30" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大重试次数
                    </label>
                    <Input defaultValue="3" type="number" />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-blue-900">API使用统计</div>
                      <div className="text-sm text-blue-700 mt-1">
                        今日已使用: <strong>2,347</strong> 次请求 / 总配额: <strong>10,000</strong> 次
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>数据库配置</span>
                </CardTitle>
                <CardDescription>
                  数据库连接和性能设置
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      连接池大小
                    </label>
                    <Input defaultValue="20" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      查询超时 (秒)
                    </label>
                    <Input defaultValue="10" type="number" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">数据库状态</div>
                      <div className="text-sm text-gray-500">连接正常，延迟 3ms</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    测试连接
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>安全策略</span>
                </CardTitle>
                <CardDescription>
                  配置系统安全策略和访问控制
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">启用双因素认证</div>
                      <div className="text-sm text-gray-500">为管理员账户启用2FA</div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">已禁用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">API访问限制</div>
                      <div className="text-sm text-gray-500">每分钟最多100次请求</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">会话超时</div>
                      <div className="text-sm text-gray-500">30分钟无操作自动登出</div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">已启用</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      密码最小长度
                    </label>
                    <Input defaultValue="8" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      登录失败锁定次数
                    </label>
                    <Input defaultValue="5" type="number" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="w-5 h-5" />
                  <span>系统状态监控</span>
                </CardTitle>
                <CardDescription>
                  实时监控系统各组件运行状态
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(systemStatus).map(([key, status]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium capitalize">
                          {key === 'database' ? '数据库' : 
                           key === 'api' ? 'API服务' :
                           key === 'websocket' ? 'WebSocket' : '智能体服务'}
                        </div>
                        <Badge className={`text-xs ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {key === 'database' ? '数据库连接和查询性能' :
                         key === 'api' ? 'API响应时间和可用性' :
                         key === 'websocket' ? '实时通信连接状态' : '智能体运行状态'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">99.9%</div>
                  <div className="text-sm text-gray-600">系统可用性</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <Zap className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">45ms</div>
                  <div className="text-sm text-gray-600">平均响应时间</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="p-6 text-center">
                  <Database className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">2.3GB</div>
                  <div className="text-sm text-gray-600">数据库大小</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}