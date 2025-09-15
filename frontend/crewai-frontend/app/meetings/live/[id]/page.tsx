"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  message, 
  Badge,
  Avatar,
  Divider,
  Progress,
  Tag,
  Alert,
  Row,
  Col,
  List,
  Statistic
} from 'antd';
import { 
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  SoundOutlined,
  UserOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';

const { Title, Text } = Typography;

interface MeetingMessage {
  id: number;
  agent_name: string;
  agent_avatar?: string;
  content: string;
  message_type: string;
  created_at: string;
  metadata?: {
    speaking_time?: number;
    confidence?: number;
    emotion?: string;
  };
}

interface MeetingInfo {
  id: number;
  title: string;
  topic: string;
  status: string;
  participants: Array<{
    agent_id: number;
    agent_name: string;
    role_in_meeting: string;
    speaking_priority: number;
  }>;
  current_speaker?: string;
  total_messages: number;
  duration_minutes: number;
}

export default function LiveMeetingPage() {
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  useEffect(() => {
    fetchMeetingInfo();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [meetingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMeetingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMeetingInfo(data);
        
        // 获取历史消息
        const messagesResponse = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}/messages`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData);
        }
      } else {
        message.error('获取会议信息失败');
        router.push('/meetings');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
      router.push('/meetings');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`ws://localhost:8000/api/v1/meetings/${meetingId}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'new_message':
            setMessages(prev => [...prev, data.message]);
            break;
          case 'speaker_change':
            setCurrentSpeaker(data.speaker);
            break;
          case 'meeting_status':
            if (meetingInfo) {
              setMeetingInfo({ ...meetingInfo, status: data.status });
            }
            break;
          case 'typing':
            setCurrentSpeaker(data.agent_name);
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('WebSocket disconnected');
        
        // 尝试重连
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsConnected(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        message.success(`会议状态已更新`);
        if (meetingInfo) {
          setMeetingInfo({ ...meetingInfo, status: newStatus });
        }
      } else {
        const errorData = await response.json();
        message.error(`状态更新失败: ${errorData.detail}`);
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'response': return '#1890ff';
      case 'question': return '#52c41a';
      case 'summary': return '#722ed1';
      case 'system': return '#fa8c16';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 p-8">
          <div className="text-center">
            <div className="text-white text-lg">加载会议中...</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部控制栏 */}
        <Card className="mb-4 bg-slate-800 border-slate-700">
          <Row align="middle" justify="space-between">
            <Col>
              <Space>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => router.push('/meetings')}
                >
                  返回列表
                </Button>
                <Title level={3} className="text-white mb-0">
                  {meetingInfo?.title}
                </Title>
                <Tag color={getStatusColor(meetingInfo?.status || '')}>
                  {getStatusText(meetingInfo?.status || '')}
                </Tag>
                <Badge 
                  status={wsConnected ? 'success' : 'error'} 
                  text={wsConnected ? '实时连接' : '连接断开'} 
                />
              </Space>
            </Col>
            <Col>
              <Space>
                {meetingInfo?.status === 'paused' && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStatusChange('active')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    继续会议
                  </Button>
                )}
                {meetingInfo?.status === 'active' && (
                  <>
                    <Button
                      icon={<PauseCircleOutlined />}
                      onClick={() => handleStatusChange('paused')}
                      className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                    >
                      暂停会议
                    </Button>
                    <Button
                      icon={<StopOutlined />}
                      onClick={() => handleStatusChange('completed')}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                    >
                      结束会议
                    </Button>
                  </>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          {/* 左侧会议区域 */}
          <Col span={18}>
            <Card 
              title={
                <div className="flex items-center justify-between">
                  <span className="text-white">实时讨论</span>
                  {currentSpeaker && (
                    <Space>
                      <SoundOutlined className="text-green-400" />
                      <Text className="text-green-400">{currentSpeaker} 正在发言</Text>
                    </Space>
                  )}
                </div>
              }
              className="bg-slate-800 border-slate-700"
              style={{ height: '70vh' }}
              bodyStyle={{ 
                padding: 0, 
                height: 'calc(70vh - 57px)', 
                overflow: 'hidden',
                backgroundColor: 'rgb(51 65 85)'
              }}
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <MessageOutlined className="text-4xl mb-4" />
                      <div>等待会议开始...</div>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Avatar 
                          src={msg.agent_avatar} 
                          icon={<UserOutlined />}
                          className="flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Text strong className="text-white">
                              {msg.agent_name}
                            </Text>
                            <Tag 
                              color={getMessageTypeColor(msg.message_type)}
                              className="text-xs"
                            >
                              {msg.message_type}
                            </Tag>
                            <Text className="text-slate-400 text-xs">
                              {formatTime(msg.created_at)}
                            </Text>
                          </div>
                          <div className="bg-slate-700 rounded-lg p-3">
                            <Text className="text-slate-200">{msg.content}</Text>
                            {msg.metadata && (
                              <div className="mt-2 flex gap-2">
                                {msg.metadata.speaking_time && (
                                  <Tag size="small">
                                    {msg.metadata.speaking_time}s
                                  </Tag>
                                )}
                                {msg.metadata.confidence && (
                                  <Tag size="small" color="blue">
                                    置信度: {Math.round(msg.metadata.confidence * 100)}%
                                  </Tag>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </Card>
          </Col>

          {/* 右侧信息面板 */}
          <Col span={6}>
            <Space direction="vertical" className="w-full" size="middle">
              {/* 会议信息 */}
              <Card 
                title={<span className="text-white">会议信息</span>}
                className="bg-slate-800 border-slate-700"
                size="small"
              >
                <div className="space-y-2">
                  <div><Text className="text-slate-400">主题:</Text> <Text className="text-white">{meetingInfo?.topic}</Text></div>
                  <Divider className="my-2 border-slate-600" />
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title={<span className="text-slate-400">消息数</span>}
                        value={messages.length}
                        valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={<span className="text-slate-400">时长</span>}
                        value={meetingInfo?.duration_minutes || 0}
                        valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                        suffix="min"
                      />
                    </Col>
                  </Row>
                </div>
              </Card>

              {/* 参与者列表 */}
              <Card 
                title={<span className="text-white">参与者 ({meetingInfo?.participants?.length || 0})</span>}
                className="bg-slate-800 border-slate-700"
                size="small"
              >
                <List
                  size="small"
                  dataSource={meetingInfo?.participants || []}
                  renderItem={(participant) => (
                    <List.Item className="border-0 px-0">
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} size="small" />}
                        title={
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm">
                              {participant.agent_name}
                            </span>
                            {currentSpeaker === participant.agent_name && (
                              <Badge status="processing" />
                            )}
                          </div>
                        }
                        description={
                          <div className="text-slate-400 text-xs">
                            {participant.role_in_meeting}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>

              {/* 连接状态 */}
              {!wsConnected && (
                <Alert
                  message="连接断开"
                  description="正在尝试重新连接..."
                  type="warning"
                  showIcon
                />
              )}
            </Space>
          </Col>
        </Row>
      </div>
    </div>
  );
}