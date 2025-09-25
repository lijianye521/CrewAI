'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Table, Space, App, Tag, Card, Typography, Badge, Tooltip, Spin, Collapse, Divider } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  HistoryOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import CreateMeetingForm from '@/app/meetings/components/CreateMeetingForm';
import MeetingHistoryView from '@/app/meetings/components/MeetingHistoryView';
import MeetingDetailPanel from '@/app/components/meetings/MeetingDetailPanel';

const { Title } = Typography;

interface Meeting {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  topic: string;
  meeting_rules: {
    max_participants?: number;
    max_duration_minutes?: number;
    speaking_time_limit?: number;
    discussion_rounds?: number;
  };
  discussion_config: {
    discussion_topic?: string;
    context_description?: string;
    expected_outcomes?: string[];
    discussion_style?: string;
  };
  scheduled_start_time?: string;
  actual_start_time?: string;
  end_time?: string;
  participants_count: number;
  messages_count: number;
  created_at: string;
  updated_at: string;
}

interface MeetingsViewProps {
  subView: string;
}

export default function MeetingsView({ subView }: MeetingsViewProps) {
  const { message } = App.useApp();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8001/api/v1/meetings');
      if (response.ok) {
        const data = await response.json();
        // 确保数据是数组格式
        if (Array.isArray(data)) {
          setMeetings(data);
        } else if (data.data && Array.isArray(data.data)) {
          // 如果后端返回的是分页格式 {data: [], total: 0, page: 1, limit: 10}
          setMeetings(data.data);
        } else {
          // 如果数据格式不正确，设置为空数组
          setMeetings([]);
          console.warn('API返回的数据格式不正确:', data);
        }
      } else {
        message.error('获取会议列表失败');
        setMeetings([]); // 确保失败时也设置为空数组
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
      setMeetings([]); // 确保错误时也设置为空数组
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('删除成功');
        fetchMeetings();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8001/api/v1/meetings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        message.success(`会议状态已更新为: ${getStatusText(newStatus)}`);
        if (newStatus === 'active') {
          message.info('智能体对话已自动启动', 3);
        }
        fetchMeetings();
      } else {
        const errorData = await response.json();
        message.error(`状态更新失败: ${errorData.detail}`);
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleViewDetails = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    window.location.hash = '#meetings/detail';
  };

  const handleWatchMeeting = (meetingId: number) => {
    if (expandedMeetingId === meetingId) {
      setExpandedMeetingId(null); // 如果已经展开了，则收起
    } else {
      setExpandedMeetingId(meetingId); // 展开当前会议
    }
  };

  const handleCloseMeetingDetail = () => {
    setExpandedMeetingId(null);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    window.location.hash = '#meetings/edit';
  };

  const handleMeetingCreated = () => {
    fetchMeetings();
    window.location.hash = '#meetings/list';
    message.success('会议创建成功！');
  };

  const handleMeetingUpdated = () => {
    fetchMeetings();
    window.location.hash = '#meetings/list';
    message.success('会议更新成功！');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'scheduled': return 'blue';
      case 'active': return 'green';
      case 'paused': return 'orange';
      case 'completed': return 'purple';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '草稿';
      case 'scheduled': return '已安排';
      case 'active': return '进行中';
      case 'paused': return '已暂停';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getStatusActions = (meeting: Meeting) => {
    const actions = [];

    switch (meeting.status) {
      case 'draft':
      case 'scheduled':
        actions.push(
          <Tooltip key="start" title="开始会议">
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStatusChange(meeting.id, 'active')}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
        );
        break;

      case 'active':
        actions.push(
          <Tooltip key="pause" title="暂停会议">
            <Button
              type="link"
              icon={<PauseCircleOutlined />}
              onClick={() => handleStatusChange(meeting.id, 'paused')}
              style={{ color: '#fa8c16' }}
            />
          </Tooltip>
        );
        actions.push(
          <Tooltip key="stop" title="结束会议">
            <Button
              type="link"
              icon={<StopOutlined />}
              onClick={() => handleStatusChange(meeting.id, 'completed')}
              style={{ color: '#722ed1' }}
            />
          </Tooltip>
        );
        break;

      case 'paused':
        actions.push(
          <Tooltip key="resume" title="继续会议">
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStatusChange(meeting.id, 'active')}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
        );
        actions.push(
          <Tooltip key="stop" title="结束会议">
            <Button
              type="link"
              icon={<StopOutlined />}
              onClick={() => handleStatusChange(meeting.id, 'completed')}
              style={{ color: '#722ed1' }}
            />
          </Tooltip>
        );
        break;
    }

    return actions;
  };

  const columns: ColumnsType<Meeting> = [
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
      render: (text: string, record: Meeting) => (
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
      title: '参与者',
      dataIndex: 'participants_count',
      key: 'participants_count',
      render: (count: number) => (
        <Badge count={count} showZero>
          <UserOutlined style={{ fontSize: 16, color: '#1890ff' }} />
        </Badge>
      ),
    },
    {
      title: '消息数',
      dataIndex: 'messages_count',
      key: 'messages_count',
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#52c41a' : '#999' }}>{count}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (
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
      render: (_, record: Meeting) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            size="small"
          >
            详情
          </Button>

          <Button
            type="link"
            icon={expandedMeetingId === record.id ? <UpOutlined /> : <EyeOutlined />}
            onClick={() => handleWatchMeeting(record.id)}
            size="small"
            style={{ color: expandedMeetingId === record.id ? '#ff4d4f' : '#52c41a' }}
          >
            {expandedMeetingId === record.id ? '收起' : '观看'}
          </Button>

          {['draft', 'scheduled'].includes(record.status) && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditMeeting(record)}
              size="small"
            >
              编辑
            </Button>
          )}

          {getStatusActions(record)}

          {['draft', 'completed', 'cancelled'].includes(record.status) && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
              size="small"
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const renderContent = () => {
    switch (subView) {
      case 'create':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#meetings/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                创建新会议
              </Title>
            </div>
            <CreateMeetingForm onSuccess={handleMeetingCreated} />
          </div>
        );

      case 'edit':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#meetings/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                编辑会议: {editingMeeting?.title}
              </Title>
            </div>
            <CreateMeetingForm
              initialData={editingMeeting}
              onSuccess={handleMeetingUpdated}
              isEdit={true}
            />
          </div>
        );

      case 'detail':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#meetings/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                会议详情: {selectedMeeting?.title}
              </Title>
            </div>
            {selectedMeeting && (
              <Card className="bg-white shadow-sm">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">基本信息</h4>
                      <p><strong>主题:</strong> {selectedMeeting.topic}</p>
                      <p><strong>描述:</strong> {selectedMeeting.description || '无'}</p>
                      <p><strong>状态:</strong> <Tag color={getStatusColor(selectedMeeting.status)}>{getStatusText(selectedMeeting.status)}</Tag></p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">统计信息</h4>
                      <p><strong>参与者:</strong> {selectedMeeting.participants_count} 人</p>
                      <p><strong>消息数:</strong> {selectedMeeting.messages_count} 条</p>
                      <p><strong>创建时间:</strong> {new Date(selectedMeeting.created_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">会议规则</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p><strong>最大参与者:</strong> {selectedMeeting.meeting_rules.max_participants || '无限制'}</p>
                      <p><strong>最大时长:</strong> {selectedMeeting.meeting_rules.max_duration_minutes || '无限制'} 分钟</p>
                      <p><strong>发言时限:</strong> {selectedMeeting.meeting_rules.speaking_time_limit || '无限制'} 秒</p>
                      <p><strong>讨论轮数:</strong> {selectedMeeting.meeting_rules.discussion_rounds || '无限制'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">讨论配置</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      <p><strong>讨论主题:</strong> {selectedMeeting.discussion_config.discussion_topic || '未设置'}</p>
                      <p><strong>上下文描述:</strong> {selectedMeeting.discussion_config.context_description || '无'}</p>
                      <p><strong>期望结果:</strong> {selectedMeeting.discussion_config.expected_outcomes?.join(', ') || '无'}</p>
                      <p><strong>讨论风格:</strong> {selectedMeeting.discussion_config.discussion_style || '开放式'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );

      case 'history':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#meetings/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                会议历史回放
              </Title>
            </div>
            <MeetingHistoryView />
          </div>
        );

      default:
      case 'list':
        return (
          <div className="space-y-6">
            <Card className="bg-white shadow-lg border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    className="bg-gray-900 hover:bg-gray-800 border-gray-900"
                    onClick={() => window.location.hash = '#meetings/create'}
                  >
                    创建会议
                  </Button>
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => window.location.hash = '#meetings/history'}
                  >
                    历史回放
                  </Button>
                </div>
              </div>

              {/* 状态统计 */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'].map(status => {
                  const count = Array.isArray(meetings) ? meetings.filter(m => m.status === status).length : 0;
                  return (
                    <Card key={status} size="small" className="bg-gray-100 border-gray-300 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm">
                        <Tag color={getStatusColor(status)} className="text-xs">
                          {getStatusText(status)}
                        </Tag>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* 会议列表 */}
              <div className="space-y-4">
                {Array.isArray(meetings) && meetings.map((meeting) => (
                  <Card
                    key={meeting.id}
                    className={`transition-all duration-300 border hover:shadow-md ${
                      expandedMeetingId === meeting.id
                        ? 'border-blue-300 shadow-lg bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* 会议基本信息 */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-lg font-semibold text-gray-900">{meeting.title}</span>
                              <Tag color={getStatusColor(meeting.status)}>
                                {getStatusText(meeting.status)}
                              </Tag>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{meeting.topic}</div>
                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <UserOutlined />
                                <span>{meeting.participants_count} 参与者</span>
                              </span>
                              <span>{meeting.messages_count} 条消息</span>
                              <span>{new Date(meeting.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-2">
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewDetails(meeting)}
                          size="small"
                        >
                          详情
                        </Button>

                        <Button
                          type={expandedMeetingId === meeting.id ? 'primary' : 'default'}
                          icon={expandedMeetingId === meeting.id ? <UpOutlined /> : <DownOutlined />}
                          onClick={() => handleWatchMeeting(meeting.id)}
                          size="small"
                          className={expandedMeetingId === meeting.id ? 'bg-blue-500 border-blue-500' : ''}
                        >
                          {expandedMeetingId === meeting.id ? '收起对话' : '展开对话'}
                        </Button>

                        {['draft', 'scheduled'].includes(meeting.status) && (
                          <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => handleEditMeeting(meeting)}
                            size="small"
                          >
                            编辑
                          </Button>
                        )}

                        <Space size="small">{getStatusActions(meeting)}</Space>

                        {['draft', 'completed', 'cancelled'].includes(meeting.status) && (
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDelete(meeting.id)}
                            size="small"
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 展开的会议详情面板 */}
                    {expandedMeetingId === meeting.id && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <EyeOutlined className="text-blue-500" />
                            <span>会议对话详情</span>
                          </h4>
                          <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={handleCloseMeetingDetail}
                            className="text-gray-400 hover:text-gray-600"
                          />
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-4" style={{ maxHeight: '500px' }}>
                          <MeetingDetailPanel
                            meetingId={meeting.id}
                            onClose={handleCloseMeetingDetail}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                {loading && (
                  <div className="text-center py-8">
                    <Spin size="large" />
                  </div>
                )}

                {!loading && Array.isArray(meetings) && meetings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无会议数据
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
    }
  };

  return renderContent();
}

