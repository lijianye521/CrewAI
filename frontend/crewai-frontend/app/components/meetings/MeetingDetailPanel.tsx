'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Tag, Space, Button, Avatar, Spin, message, Divider, Timeline, Slider } from 'antd';
import { 
  UserOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Message {
  id: number;
  agent_id: number;
  agent_name: string;
  message_content: string;
  content?: string; // 兼容不同的字段名
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
  actual_start_time?: string;
  actual_end?: string;
  duration?: number;
}

interface MeetingDetailPanelProps {
  meetingId: number;
  onClose: () => void;
}

export default function MeetingDetailPanel({ meetingId, onClose }: MeetingDetailPanelProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // 回放控制状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const playbackTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingData();
    }

    return () => {
      // 清理资源
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (playbackTimer.current) {
        clearTimeout(playbackTimer.current);
      }
    };
  }, [meetingId]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages]);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);

      // 获取会议信息
      const meetingResponse = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}`);
      if (meetingResponse.ok) {
        const meetingData = await meetingResponse.json();
        setMeeting(meetingData);
        
        // 根据会议状态决定处理方式
        if (meetingData.status === 'active') {
          // 活跃会议：连接SSE并获取现有消息
          await fetchCurrentMessages();
          connectToSSE();
        } else {
          // 已完成会议：获取历史消息用于回放
          await fetchHistoryMessages();
        }
      }

      // 获取智能体列表
      const agentsResponse = await fetch('http://localhost:8001/api/v1/agents?is_active=true');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData);
      }

    } catch (error) {
      message.error('获取数据失败');
      console.error('Error fetching meeting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/messages`);
      if (response.ok) {
        const data = await response.json();
        const normalizedMessages = normalizeMessages(data);
        setMessages(normalizedMessages);
        setVisibleMessages(normalizedMessages);
      }
    } catch (error) {
      console.error('Error fetching current messages:', error);
    }
  };

  const fetchHistoryMessages = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/replay`);
      if (response.ok) {
        const replayData = await response.json();
        
        // 从回放数据中提取消息
        let historyMessages: Message[] = [];
        
        if (replayData.events && Array.isArray(replayData.events)) {
          historyMessages = replayData.events
            .filter((event: any) => event.message)
            .map((event: any) => normalizeMessage(event.message));
        }
        
        // 如果events为空，尝试直接获取消息
        if (historyMessages.length === 0) {
          const messagesResponse = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/messages`);
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            historyMessages = normalizeMessages(messagesData);
          }
        }
        
        setMessages(historyMessages);
        // 对于历史消息，初始只显示第一条（如果有的话）
        setVisibleMessages(historyMessages.length > 0 ? [historyMessages[0]] : []);
        setCurrentMessageIndex(0);
      }
    } catch (error) {
      console.error('Error fetching history messages:', error);
    }
  };

  const normalizeMessages = (data: any[]): Message[] => {
    return data.map(normalizeMessage);
  };

  const normalizeMessage = (msg: any): Message => {
    return {
      id: msg.id,
      agent_id: msg.agent_id,
      agent_name: msg.agent_name,
      message_content: msg.message_content || msg.content || '',
      message_type: msg.message_type || 'message',
      created_at: msg.created_at,
      metadata: msg.metadata
    };
  };

  const connectToSSE = () => {
    try {
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
            const newMessage = normalizeMessage(data.message);
            setMessages(prev => [...prev, newMessage]);
            setVisibleMessages(prev => [...prev, newMessage]);
          } else if (data.type === 'meeting_status') {
            setMeeting(prev => prev ? { ...prev, status: data.status } : null);
          } else if (data.type === 'connected') {
            setIsConnected(true);
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
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      setIsConnected(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startConversation = async () => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/start-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // 回放控制功能
  const startPlayback = () => {
    if (messages.length === 0) return;
    
    setIsPlaying(true);
    playNextMessage();
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playbackTimer.current) {
      clearTimeout(playbackTimer.current);
    }
  };

  const playNextMessage = () => {
    if (currentMessageIndex >= messages.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentMessageIndex + 1;
    setCurrentMessageIndex(nextIndex);
    setVisibleMessages(messages.slice(0, nextIndex + 1));

    const delay = 2000 / playbackSpeed; // 基础延迟2秒，根据速度调整

    if (isPlaying) {
      playbackTimer.current = setTimeout(playNextMessage, delay);
    }
  };

  const jumpToMessage = (index: number) => {
    setCurrentMessageIndex(index);
    setVisibleMessages(messages.slice(0, index + 1));
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentMessageIndex(0);
    setVisibleMessages(messages.length > 0 ? [messages[0]] : []);
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
      default: return '发言';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <Text type="secondary">未找到会议信息</Text>
      </div>
    );
  }

  const isActiveMeeting = meeting.status === 'active';
  const progress = messages.length > 0 ? (currentMessageIndex / (messages.length - 1)) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Title level={4} className="mb-1">
              {meeting.title}
            </Title>
            <Button
              icon={<CloseOutlined />}
              onClick={onClose}
              type="text"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Text type="secondary">{meeting.topic}</Text>
            <Tag color={isActiveMeeting ? 'green' : 'purple'}>
              {isActiveMeeting ? '进行中' : '已结束'}
            </Tag>
            {isActiveMeeting && (
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <Text type="secondary" className="text-sm">
                  {isConnected ? '实时连接' : '连接断开'}
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 控制区域 */}
      <div className="p-4 border-b bg-gray-50">
        {isActiveMeeting ? (
          // 实时会议控制
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={startConversation}
                className="bg-green-600 hover:bg-green-700"
              >
                开始对话
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Text type="secondary" className="text-sm">
                实时消息: {messages.length} 条
              </Text>
            </div>
          </div>
        ) : (
          // 历史会议回放控制
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="small"
                  icon={<FastBackwardOutlined />}
                  onClick={resetPlayback}
                  title="重新开始"
                />
                <Button
                  size="small"
                  icon={<StepBackwardOutlined />}
                  onClick={() => {
                    if (currentMessageIndex > 0) {
                      jumpToMessage(currentMessageIndex - 1);
                    }
                  }}
                  title="上一条"
                />
                <Button
                  type="primary"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={isPlaying ? pausePlayback : startPlayback}
                  className={isPlaying ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}
                >
                  {isPlaying ? '暂停' : '播放'}
                </Button>
                <Button
                  size="small"
                  icon={<StepForwardOutlined />}
                  onClick={() => {
                    if (currentMessageIndex < messages.length - 1) {
                      jumpToMessage(currentMessageIndex + 1);
                    }
                  }}
                  title="下一条"
                />
                <Button
                  size="small"
                  icon={<FastForwardOutlined />}
                  onClick={() => jumpToMessage(messages.length - 1)}
                  title="跳到结尾"
                />
              </div>
              <div className="flex items-center space-x-4">
                <Text className="text-sm">
                  进度: {currentMessageIndex + 1} / {messages.length}
                </Text>
                <Text className="text-sm">
                  速度: {playbackSpeed}x
                </Text>
              </div>
            </div>
            
            {/* 进度条 */}
            <Slider
              value={progress}
              onChange={(value) => {
                const targetIndex = Math.floor((value / 100) * (messages.length - 1));
                jumpToMessage(targetIndex);
              }}
              tooltip={{ formatter: (value) => `${value?.toFixed(1)}%` }}
            />
            
            {/* 播放速度控制 */}
            <div className="flex items-center space-x-2">
              <Text className="text-sm">播放速度:</Text>
              <Slider
                min={0.5}
                max={3}
                step={0.5}
                value={playbackSpeed}
                onChange={setPlaybackSpeed}
                style={{ width: 120 }}
                marks={{
                  0.5: '0.5x',
                  1: '1x',
                  2: '2x',
                  3: '3x'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {visibleMessages.length === 0 ? (
          <div className="text-center py-8">
            <Text type="secondary">
              {isActiveMeeting ? '暂无对话，点击"开始对话"让智能体开始讨论' : '该会议没有历史消息记录'}
            </Text>
          </div>
        ) : (
          visibleMessages.map((msg, index) => {
            const agent = agents.find(a => a.id === msg.agent_id);
            return (
              <div key={index} className="flex space-x-3">
                <Avatar
                  icon={<UserOutlined />}
                  className="bg-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {msg.agent_name || agent?.name || `智能体${msg.agent_id}`}
                    </span>
                    <Tag
                      color={getMessageTypeColor(msg.message_type)}
                      size="small"
                    >
                      {getMessageTypeText(msg.message_type)}
                    </Tag>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Text>{msg.message_content}</Text>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部状态栏 */}
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <Text type="secondary">
              参与者: {meeting.participants_count} 人
            </Text>
            <Text type="secondary">
              总消息: {messages.length} 条
            </Text>
          </div>
          <div className="flex items-center space-x-2">
            {!isActiveMeeting && (
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`} />
                <Text type="secondary">
                  {isPlaying ? '正在播放' : '暂停中'}
                </Text>
              </div>
            )}
            <Button size="small" onClick={scrollToBottom}>
              滚动到底部
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}