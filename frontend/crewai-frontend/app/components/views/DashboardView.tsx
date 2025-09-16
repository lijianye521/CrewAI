'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Calendar,
  MessageSquare,
  History,
  ArrowRight,
  TrendingUp,
  Users,
  Activity,
  Clock,
  CheckCircle
} from 'lucide-react';

export default function DashboardView() {
  const quickStats = [
    {
      title: '活跃智能体',
      value: '运行正常',
      icon: <Bot className="w-5 h-5" />,
      description: '当前可用智能体'
    },
    {
      title: '进行中会议',
      value: '活跃状态',
      icon: <MessageSquare className="w-5 h-5" />,
      description: '实时协作会议'
    },
    {
      title: '系统状态',
      value: '在线',
      icon: <CheckCircle className="w-5 h-5" />,
      description: '平台运行状态'
    }
  ];

  const recentMeetings = [
    {
      id: 1,
      title: '产品策略讨论',
      status: 'active',
      participants: 5,
      startTime: '14:30',
      duration: '25分钟',
      progress: 75
    },
    {
      id: 2,
      title: '技术架构评审',
      status: 'scheduled',
      participants: 3,
      startTime: '16:00',
      duration: '预计45分钟',
      progress: 0
    },
    {
      id: 3,
      title: '市场分析报告',
      status: 'completed',
      participants: 4,
      startTime: '10:00',
      duration: '42分钟',
      progress: 100
    }
  ];

  const quickActions = [
    {
      title: '创建智能体',
      description: '配置新的AI智能体',
      icon: <Bot className="w-5 h-5" />,
      action: '立即创建',
      hash: '#agents/create',
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    {
      title: '发起会议',
      description: '创建多智能体协作会议',
      icon: <Calendar className="w-5 h-5" />,
      action: '创建会议',
      hash: '#meetings/create',
      color: 'bg-green-50 border-green-200 text-green-700'
    },
    {
      title: '查看历史',
      description: '浏览历史会议记录',
      icon: <History className="w-5 h-5" />,
      action: '查看记录',
      hash: '#meetings/history',
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'scheduled': return '已安排';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  {stat.icon}
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Meetings */}
        <div className="lg:col-span-2">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900">最近会议</CardTitle>
                  <CardDescription className="text-gray-600">
                    当前进行中和即将开始的会议
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.hash = '#meetings/list'}
                >
                  查看全部
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                        <Badge className={`text-xs ${getStatusColor(meeting.status)}`}>
                          {getStatusText(meeting.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {meeting.participants}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {meeting.startTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{meeting.duration}</span>
                      {meeting.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${meeting.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{meeting.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">快速操作</CardTitle>
              <CardDescription className="text-gray-600">
                常用功能快捷入口
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <div key={index} className={`p-4 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${action.color}`}>
                    <div className="flex items-center space-x-3 mb-2">
                      {action.icon}
                      <h4 className="font-medium">{action.title}</h4>
                    </div>
                    <p className="text-sm opacity-80 mb-3">{action.description}</p>
                    <Button
                      size="sm"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      onClick={() => window.location.hash = action.hash}
                    >
                      {action.action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Overview */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">系统概览</CardTitle>
          <CardDescription className="text-gray-600">
            平台运行状态和关键指标
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">98.5%</div>
              <div className="text-sm text-gray-600">系统可用性</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Bot className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">247</div>
              <div className="text-sm text-gray-600">累计对话轮次</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">45</div>
              <div className="text-sm text-gray-600">已完成会议</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}