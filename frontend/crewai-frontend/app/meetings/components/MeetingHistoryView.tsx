"use client";

import React, { useState, useEffect } from 'react';
import {
  Button,
  Table,
  Space,
  Modal,
  message,
  Tag,
  Card,
  Typography,
  Badge,
  Row,
  Col,
  Statistic,
  Timeline,
  Avatar,
  Input,
  Select,
  DatePicker
} from 'antd';
import {
  EyeOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { RangePickerProps } from 'antd/es/date-picker';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

interface HistoricalMeeting {
  id: number;
  title: string;
  topic: string;
  status: string;
  participants_count: number;
  messages_count: number;
  duration_minutes: number;
  created_at: string;
  actual_start_time?: string;
  end_time?: string;
  meeting_summary?: string;
  key_insights?: string[];
}

interface MeetingMessage {
  id: number;
  agent_name: string;
  content: string;
  message_type: string;
  created_at: string;
  metadata?: {
    speaking_time?: number;
    confidence?: number;
    emotion?: string;
  };
}

export default function MeetingHistoryView() {
  const [meetings, setMeetings] = useState<HistoricalMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<HistoricalMeeting | null>(null);
  const [meetingMessages, setMeetingMessages] = useState<MeetingMessage[]>([]);
  const [replayModalVisible, setReplayModalVisible] = useState(false);
  const [replayMode, setReplayMode] = useState<'normal' | 'fast' | 'slow'>('normal');
  const [currentReplayIndex, setCurrentReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  useEffect(() => {
    fetchHistoricalMeetings();
  }, []);

  const fetchHistoricalMeetings = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/api/v1/meetings?status=completed';

      // 添加筛选参数
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        let data = await response.json();

        // 客户端筛选
        if (searchText) {
          data = data.filter((meeting: HistoricalMeeting) =>
            meeting.title.toLowerCase().includes(searchText.toLowerCase()) ||
            meeting.topic.toLowerCase().includes(searchText.toLowerCase())
          );
        }

        if (dateRange) {
          const [startDate, endDate] = dateRange;
          data = data.filter((meeting: HistoricalMeeting) => {
            const meetingDate = new Date(meeting.created_at);
            return meetingDate >= new Date(startDate) && meetingDate <= new Date(endDate);
          });
        }

        setMeetings(data);
      } else {
        message.error('获取历史会议失败');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingMessages = async (meetingId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMeetingMessages(data);
        return data;
      } else {
        message.error('获取会议消息失败');
        return [];
      }
    } catch (error) {
      message.error('网络错误');
      return [];
    }
  };

  const handleStartReplay = async (meeting: HistoricalMeeting) => {
    const messages = await fetchMeetingMessages(meeting.id);
    if (messages.length === 0) {
      message.warning('该会议没有历史消息记录');
      return;
    }

    setSelectedMeeting(meeting);
    setMeetingMessages(messages);
    setCurrentReplayIndex(0);
    setReplayModalVisible(true);
  };

  const startReplay = () => {
    if (!selectedMeeting || meetingMessages.length === 0) return;

    setIsReplaying(true);
    setCurrentReplayIndex(0);

    const speed = replayMode === 'fast' ? 500 : replayMode === 'slow' ? 3000 : 1500;

    const replayInterval = setInterval(() => {
      setCurrentReplayIndex(prev => {
        if (prev >= meetingMessages.length - 1) {
          clearInterval(replayInterval);
          setIsReplaying(false);
          message.success('回放完成');
          return prev;
        }
        return prev + 1;
      });
    }, speed);
  };

  const pauseReplay = () => {
    setIsReplaying(false);
  };

  const resetReplay = () => {
    setCurrentReplayIndex(0);
    setIsReplaying(false);
  };

  const downloadMeetingReport = async (meetingId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}/replay`);
      if (response.ok) {
        const data = await response.json();

        // 生成报告内容
        const reportContent = generateMeetingReport(data);

        // 下载文件
        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `meeting-${meetingId}-report.txt`;
        link.click();
        URL.revokeObjectURL(url);

        message.success('会议报告已下载');
      }
    } catch (error) {
      message.error('下载失败');
    }
  };

  const generateMeetingReport = (meetingData: { meeting: Record<string, unknown>; messages?: Record<string, unknown>[] }) => {
    const meeting = meetingData.meeting;
    const messages = meetingData.messages || [];

    let report = `会议报告\n`;
    report += `===================\n\n`;
    report += `会议标题: ${meeting.title}\n`;
    report += `会议主题: ${meeting.topic}\n`;
    report += `开始时间: ${new Date(meeting.actual_start_time || meeting.created_at).toLocaleString()}\n`;
    report += `结束时间: ${meeting.end_time ? new Date(meeting.end_time).toLocaleString() : '未记录'}\n`;
    report += `参与人数: ${meeting.participants_count}\n`;
    report += `消息总数: ${messages.length}\n`;
    report += `会议时长: ${meeting.duration_minutes} 分钟\n\n`;

    if (meeting.meeting_summary) {
      report += `会议摘要:\n${meeting.meeting_summary}\n\n`;
    }

    report += `详细对话记录:\n`;
    report += `================\n\n`;

    messages.forEach((msg: MeetingMessage, index: number) => {
      const time = new Date(msg.created_at).toLocaleTimeString();
      report += `[${time}] ${msg.agent_name}:\n${msg.content}\n\n`;
    });

    return report;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const columns: ColumnsType<HistoricalMeeting> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '会议信息',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: HistoricalMeeting) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.topic}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '统计',
      key: 'stats',
      render: (_, record: HistoricalMeeting) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <UserOutlined className="text-blue-500" />
            <span className="text-sm">{record.participants_count} 人</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageOutlined className="text-green-500" />
            <span className="text-sm">{record.messages_count} 消息</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockCircleOutlined className="text-orange-500" />
            <span className="text-sm">{record.duration_minutes} 分钟</span>
          </div>
        </div>
      ),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string, record: HistoricalMeeting) => (
        <div>
          <div>{new Date(text).toLocaleDateString()}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {new Date(text).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: HistoricalMeeting) => (
        <Space size="small">
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartReplay(record)}
            size="small"
          >
            回放
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => downloadMeetingReport(record.id)}
            size="small"
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 筛选控件 */}
      <Card className="bg-white border-gray-200">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="搜索会议标题或主题"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={fetchHistoricalMeetings}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="筛选状态"
              allowClear
              className="w-full"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                fetchHistoricalMeetings();
              }}
            >
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              className="w-full"
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!.toISOString(), dates[1]!.toISOString()]);
                } else {
                  setDateRange(null);
                }
                fetchHistoricalMeetings();
              }}
            />
          </Col>
          <Col span={4}>
            <Button
              icon={<SearchOutlined />}
              onClick={fetchHistoricalMeetings}
              className="w-full"
            >
              搜索
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card className="bg-white border-gray-200 text-center">
            <Statistic
              title="总会议数"
              value={meetings.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-white border-gray-200 text-center">
            <Statistic
              title="总消息数"
              value={meetings.reduce((sum, m) => sum + m.messages_count, 0)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-white border-gray-200 text-center">
            <Statistic
              title="总时长"
              value={meetings.reduce((sum, m) => sum + m.duration_minutes, 0)}
              suffix="分钟"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-white border-gray-200 text-center">
            <Statistic
              title="平均时长"
              value={meetings.length ? Math.round(meetings.reduce((sum, m) => sum + m.duration_minutes, 0) / meetings.length) : 0}
              suffix="分钟"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={meetings}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 场会议`,
        }}
      />

      {/* 回放模态框 */}
      <Modal
        title={`会议回放: ${selectedMeeting?.title}`}
        open={replayModalVisible}
        onCancel={() => setReplayModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setReplayModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedMeeting && (
          <div>
            {/* 回放控制 */}
            <Card className="mb-4 bg-gray-100">
              <Row align="middle" justify="space-between">
                <Col>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={startReplay}
                      disabled={isReplaying}
                    >
                      开始回放
                    </Button>
                    <Button onClick={pauseReplay} disabled={!isReplaying}>
                      暂停
                    </Button>
                    <Button onClick={resetReplay}>
                      重置
                    </Button>
                    <Select
                      value={replayMode}
                      onChange={setReplayMode}
                      style={{ width: 120 }}
                    >
                      <Select.Option value="slow">慢速</Select.Option>
                      <Select.Option value="normal">正常</Select.Option>
                      <Select.Option value="fast">快速</Select.Option>
                    </Select>
                  </Space>
                </Col>
                <Col>
                  <Text>
                    进度: {currentReplayIndex + 1} / {meetingMessages.length}
                  </Text>
                </Col>
              </Row>
            </Card>

            {/* 会议信息 */}
            <Card title="会议信息" className="mb-4">
              <Row gutter={16}>
                <Col span={12}>
                  <p><strong>主题:</strong> {selectedMeeting.topic}</p>
                  <p><strong>参与者:</strong> {selectedMeeting.participants_count} 人</p>
                </Col>
                <Col span={12}>
                  <p><strong>时长:</strong> {selectedMeeting.duration_minutes} 分钟</p>
                  <p><strong>消息数:</strong> {selectedMeeting.messages_count} 条</p>
                </Col>
              </Row>
            </Card>

            {/* 消息回放 */}
            <Card title="对话回放" style={{ height: '400px', overflow: 'auto' }}>
              <Timeline mode="left">
                {meetingMessages.slice(0, currentReplayIndex + 1).map((msg, index) => (
                  <Timeline.Item
                    key={index}
                    color={index === currentReplayIndex ? 'red' : 'blue'}
                    dot={
                      <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                        {msg.agent_name[0]}
                      </Avatar>
                    }
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Text strong>{msg.agent_name}</Text>
                        <Tag size="small">{msg.message_type}</Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </Text>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        {msg.content}
                      </div>
                      {msg.metadata && (
                        <div className="flex gap-2">
                          {msg.metadata.speaking_time && (
                            <Tag size="small">时长: {msg.metadata.speaking_time}s</Tag>
                          )}
                          {msg.metadata.confidence && (
                            <Tag size="small" color="blue">
                              置信度: {Math.round(msg.metadata.confidence * 100)}%
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}