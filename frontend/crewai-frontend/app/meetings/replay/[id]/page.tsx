'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Typography, Tag, Space, Button, Avatar, Spin, message, Row, Col, Divider, Slider, Timeline } from 'antd';
import { ArrowLeftOutlined, UserOutlined, PlayCircleOutlined, PauseCircleOutlined, StepBackwardOutlined, StepForwardOutlined, FastBackwardOutlined, FastForwardOutlined } from '@ant-design/icons';

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

interface ReplayData {
  meeting: {
    id: number;
    title: string;
    topic: string;
    status: string;
    actual_start: string;
    actual_end: string;
    duration: number;
  };
  participants: Record<string, {
    name: string;
    role: string;
    avatar_url?: string;
  }>;
  events: Array<{
    timestamp: string;
    event: string;
    message?: Message;
  }>;
  statistics: {
    total_messages: number;
    unique_speakers: number;
  };
}

export default function MeetingReplayPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  
  const playbackTimer = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meetingId) {
      fetchReplayData();
    }
  }, [meetingId]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages]);

  useEffect(() => {
    return () => {
      if (playbackTimer.current) {
        clearTimeout(playbackTimer.current);
      }
    };
  }, []);

  const fetchReplayData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${meetingId}/replay`);
      
      if (response.ok) {
        const data = await response.json();
        setReplayData(data);
        
        // 如果有事件数据，处理消息显示
        if (data.events && data.events.length > 0) {
          // 提取所有消息事件
          const messageEvents = data.events.filter((event: any) => event.message);
          setVisibleMessages(messageEvents.slice(0, 1).map((event: any) => event.message));
        }
      } else {
        message.error('获取会议回放数据失败');
      }
    } catch (error) {
      message.error('网络错误');
      console.error('Error fetching replay data:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startPlayback = () => {
    if (!replayData || !replayData.events.length) return;
    
    setIsPlaying(true);
    playNextEvent();
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playbackTimer.current) {
      clearTimeout(playbackTimer.current);
    }
  };

  const playNextEvent = () => {
    if (!replayData || currentEventIndex >= replayData.events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentEventIndex + 1;
    const event = replayData.events[nextIndex];
    
    setCurrentEventIndex(nextIndex);

    // 如果事件包含消息，添加到可见消息列表
    if (event.message) {
      setVisibleMessages(prev => [...prev, event.message!]);
    }

    // 计算下一个事件的延迟时间（模拟真实时间间隔）
    let delay = 2000; // 默认2秒间隔
    if (nextIndex < replayData.events.length - 1) {
      const currentTime = new Date(event.timestamp).getTime();
      const nextTime = new Date(replayData.events[nextIndex + 1].timestamp).getTime();
      delay = Math.min((nextTime - currentTime) / playbackSpeed, 5000); // 最大5秒间隔
    }

    if (isPlaying) {
      playbackTimer.current = setTimeout(playNextEvent, delay);
    }
  };

  const jumpToEvent = (index: number) => {
    setCurrentEventIndex(index);
    
    // 显示到该事件为止的所有消息
    const messageEvents = replayData?.events.slice(0, index + 1).filter(event => event.message) || [];
    setVisibleMessages(messageEvents.map(event => event.message!));
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentEventIndex(0);
    setVisibleMessages([]);
    if (replayData?.events.length && replayData.events[0].message) {
      setVisibleMessages([replayData.events[0].message]);
    }
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!replayData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Text type="secondary">未找到会议回放数据</Text>
        </div>
      </div>
    );
  }

  const progress = replayData.events.length > 0 ? (currentEventIndex / (replayData.events.length - 1)) * 100 : 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          >
            返回
          </Button>
          <div>
            <Title level={3} className="mb-1">
              {replayData.meeting.title} - 会议回放
            </Title>
            <div className="flex items-center space-x-2">
              <Text type="secondary">{replayData.meeting.topic}</Text>
              <Tag color="purple">已结束</Tag>
              <Text type="secondary" className="text-sm">
                时长: {formatDuration(replayData.meeting.duration || 0)}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧：回放控制和参与者 */}
        <Col xs={24} md={6}>
          {/* 回放控制 */}
          <Card title="回放控制" className="mb-4">
            <div className="space-y-4">
              {/* 进度条 */}
              <div>
                <Text className="text-sm text-gray-600">回放进度</Text>
                <Slider
                  value={progress}
                  onChange={(value) => {
                    const targetIndex = Math.floor((value / 100) * (replayData.events.length - 1));
                    jumpToEvent(targetIndex);
                  }}
                  tooltip={{ formatter: (value) => `${value?.toFixed(1)}%` }}
                />
              </div>

              {/* 播放控制按钮 */}
              <div className="flex justify-center space-x-2">
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
                    if (currentEventIndex > 0) {
                      jumpToEvent(currentEventIndex - 1);
                    }
                  }}
                  title="上一个事件"
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
                    if (currentEventIndex < replayData.events.length - 1) {
                      jumpToEvent(currentEventIndex + 1);
                    }
                  }}
                  title="下一个事件"
                />
                <Button
                  size="small"
                  icon={<FastForwardOutlined />}
                  onClick={() => jumpToEvent(replayData.events.length - 1)}
                  title="跳到结尾"
                />
              </div>

              {/* 播放速度 */}
              <div>
                <Text className="text-sm text-gray-600">播放速度: {playbackSpeed}x</Text>
                <Slider
                  min={0.5}
                  max={3}
                  step={0.5}
                  value={playbackSpeed}
                  onChange={setPlaybackSpeed}
                  marks={{
                    0.5: '0.5x',
                    1: '1x',
                    2: '2x',
                    3: '3x'
                  }}
                />
              </div>
            </div>
          </Card>

          {/* 参与者列表 */}
          <Card title="参与者" className="mb-4">
            <div className="space-y-3">
              {Object.entries(replayData.participants).map(([id, participant]) => (
                <div
                  key={id}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50"
                >
                  <Avatar
                    src={participant.avatar_url}
                    icon={<UserOutlined />}
                    className="bg-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{participant.name}</div>
                    <div className="text-xs text-gray-500">{participant.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 会议统计 */}
          <Card title="会议统计" size="small">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>总消息数:</span>
                <span>{replayData.statistics.total_messages}条</span>
              </div>
              <div className="flex justify-between">
                <span>发言人数:</span>
                <span>{replayData.statistics.unique_speakers}人</span>
              </div>
              <div className="flex justify-between">
                <span>当前进度:</span>
                <span>{currentEventIndex + 1}/{replayData.events.length}</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：对话回放区域 */}
        <Col xs={24} md={18}>
          <Card
            title="对话回放"
            className="h-[70vh]"
            bodyStyle={{ padding: 0, height: 'calc(70vh - 80px)', display: 'flex', flexDirection: 'column' }}
          >
            {/* 消息列表区域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {visibleMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Text type="secondary">点击播放按钮开始会议回放</Text>
                </div>
              ) : (
                visibleMessages.map((message, index) => {
                  const participant = replayData.participants[message.agent_id.toString()];
                  return (
                    <div key={index} className="flex space-x-3 animate-fadeIn">
                      <Avatar
                        src={participant?.avatar_url}
                        icon={<UserOutlined />}
                        className="bg-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.agent_name || participant?.name}
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

            {/* 底部状态栏 */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Text type="secondary" className="text-sm">
                      {isPlaying ? '正在播放' : '暂停中'}
                    </Text>
                  </div>
                  <Text type="secondary" className="text-sm">
                    速度: {playbackSpeed}x
                  </Text>
                </div>

                <div className="flex items-center space-x-2">
                  <Text type="secondary" className="text-sm">
                    {visibleMessages.length} / {replayData.statistics.total_messages} 条消息
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}