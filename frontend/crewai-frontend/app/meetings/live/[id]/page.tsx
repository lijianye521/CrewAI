'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, Typography, Tag, Space, Button, Avatar, Spin, message, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined, UserOutlined, SendOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Message {
  id: number;
  agent_id: number;
  agent_name: string;
  content: string;
  message_type: string;
  created_at: string;
  metadata?: any;
}

interface Meeting {
  id: number;
  title: string;
  topic: string;
  status: string;
  participants_count: number;
  messages_count: number;
}

interface Agent {
  id: number;
  name: string;
  role: string;
  is_active: boolean;
}

export default function MeetingLivePage() {
  const params = useParams();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
      connectToSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [meetingId]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);

      // 获取会议信息
      const meetingResponse = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}`);
      if (meetingResponse.ok) {
        const meetingData = await meetingResponse.json();
        setMeeting(meetingData);
      }

      // 获取会议消息
      const messagesResponse = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData);
      }

      // 获取智能体列表
      const agentsResponse = await fetch('http://localhost:8001/api/v1/agents?is_active=true');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData);
      }

    } catch (error) {
      message.error('获取数据失败');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectToSSE = () => {
    // 连接SSE接口
    const eventSource = new EventSource(`http://localhost:8001/api/v1/meetings/${meetingId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      message.success('已连接到实时流');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_message') {
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'meeting_status') {
          setMeeting(prev => prev ? { ...prev, status: data.status } : null);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);

      // 尝试重连
      setTimeout(() => {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectToSSE();
        }
      }, 5000);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startMeetingConversation = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/start-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        message.success('开始智能体对话');
      } else {
        message.error('启动对话失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const pauseMeetingConversation = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/pause-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        message.success('暂停智能体对话');
      } else {
        message.error('暂停对话失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const getAgentById = (agentId: number) => {
    return agents.find(agent => agent.id === agentId);
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'analysis': return 'blue';
      case 'question': return 'orange';
      case 'suggestion': return 'green';
      case 'summary': return 'purple';
      default: return 'default';
    }
  };

  const getMessageTypeText = (messageType: string) => {
    switch (messageType) {
      case 'analysis': return '分析';
      case 'question': return '提问';
      case 'suggestion': return '建议';
      case 'summary': return '总结';
      default: return messageType;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => window.history.back()}
          >
            返回
          </Button>
          <div>
            <Title level={3} className="mb-1">
              {meeting?.title}
            </Title>
            <div className="flex items-center space-x-2">
              <Text type="secondary">{meeting?.topic}</Text>
              <Tag color={meeting?.status === 'active' ? 'green' : 'blue'}>
                {meeting?.status === 'active' ? '进行中' : meeting?.status}
              </Tag>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <Text type="secondary" className="text-sm">
                  {isConnected ? '实时连接' : '连接断开'}
                </Text>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startMeetingConversation}
            className="bg-green-600 hover:bg-green-700"
          >
            开始对话
          </Button>
          <Button
            icon={<PauseCircleOutlined />}
            onClick={pauseMeetingConversation}
          >
            暂停对话
          </Button>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧：参与智能体 */}
        <Col xs={24} md={6}>
          <Card title="参与智能体" className="mb-4">
            <div className="space-y-3">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <Avatar
                    icon={<UserOutlined />}
                    className="bg-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.role}</div>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              ))}
            </div>
          </Card>

          {/* 会议统计 */}
          <Card title="会议统计" size="small">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>参与者:</span>
                <span>{meeting?.participants_count}人</span>
              </div>
              <div className="flex justify-between">
                <span>消息数:</span>
                <span>{messages.length}条</span>
              </div>
              <div className="flex justify-between">
                <span>持续时间:</span>
                <span>45分钟</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：对话区域 */}
        <Col xs={24} md={18}>
          <Card
            title="实时对话"
            className="h-[70vh]"
            bodyStyle={{ padding: 0, height: 'calc(70vh - 80px)', display: 'flex', flexDirection: 'column' }}
          >
            {/* 消息列表区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Text type="secondary">暂无对话，点击"开始对话"让智能体开始讨论</Text>
                </div>
              ) : (
                messages.map((message, index) => {
                  const agent = getAgentById(message.agent_id);
                  return (
                    <div key={index} className="flex space-x-3">
                      <Avatar
                        icon={<UserOutlined />}
                        className="bg-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.agent_name || agent?.name}
                          </span>
                          <Tag
                            color={getMessageTypeColor(message.message_type)}
                            size="small"
                          >
                            {getMessageTypeText(message.message_type)}
                          </Tag>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                          <Text>{message.content}</Text>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <Divider className="m-0" />

            {/* 底部控制区域 */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Text type="secondary" className="text-sm">
                    自动滚动:
                  </Text>
                  <Button
                    size="small"
                    type={autoScroll ? 'primary' : 'default'}
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    {autoScroll ? '开启' : '关闭'}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Text type="secondary" className="text-sm">
                    {messages.length} 条消息
                  </Text>
                  <Button size="small" onClick={scrollToBottom}>
                    滚动到底部
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}