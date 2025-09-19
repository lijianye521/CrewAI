'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Table, Space, App, Tag, Card, Typography, Badge, Tooltip, Row, Col, Spin } from 'antd';
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
  HistoryOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import CreateMeetingForm from '@/app/meetings/components/CreateMeetingForm';
import MeetingHistoryView from '@/app/meetings/components/MeetingHistoryView';

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

          {record.status === 'active' && (
            <Button
              type="link"
              style={{ color: '#52c41a' }}
              onClick={() => window.location.hash = `#meetings/live/${record.id}`}
              size="small"
            >
              观看
            </Button>
          )}

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
        // 处理 live/{id} 路由
        if (subView.startsWith('live/')) {
          const meetingId = subView.split('/')[1];
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
                  实时观看会议 #{meetingId}
                </Title>
              </div>
              <MeetingLiveComponent meetingId={parseInt(meetingId)} />
            </div>
          );
        }
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

              <Table
                columns={columns}
                dataSource={Array.isArray(meetings) ? meetings : []}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 个会议`,
                }}
                className="ant-table-wrapper"
              />
            </Card>
          </div>
        );
    }
  };

  return renderContent();
}

// 会议实时观看组件
function MeetingLiveComponent({ meetingId }: { meetingId: number }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { message } = App.useApp();

  useEffect(() => {
    fetchMeetingData();
    connectToSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [meetingId]);

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
    } finally {
      setLoading(false);
    }
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
            setMessages(prev => [...prev, data.message]);
            scrollToBottom();
          } else if (data.type === 'meeting_status') {
            setMeeting(prev => prev ? { ...prev, status: data.status } : null);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setTimeout(() => {
          if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
            connectToSSE();
          }
        }, 5000);
      };
    } catch (error) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 头部控制 */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <Title level={4} className="mb-1">
            {meeting?.title}
          </Title>
          <div className="flex items-center space-x-2">
            <Text type="secondary">{meeting?.topic}</Text>
            <Tag color={meeting?.status === 'active' ? 'green' : 'blue'}>
              {meeting?.status === 'active' ? '进行中' : meeting?.status}
            </Tag>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text type="secondary" className="text-sm">
                {isConnected ? '实时连接' : '连接断开'}
              </Text>
            </div>
          </div>
        </div>

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
      </div>

      <Row gutter={16}>
        {/* 左侧：参与智能体 */}
        <Col xs={24} md={6}>
          <Card title="参与智能体" className="mb-4">
            <div className="space-y-3">
              {agents.slice(0, 5).map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <UserOutlined className="text-white" />
                  </div>
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
                <span>{agents.length}人</span>
              </div>
              <div className="flex justify-between">
                <span>消息数:</span>
                <span>{messages.length}条</span>
              </div>
              <div className="flex justify-between">
                <span>状态:</span>
                <span>{isConnected ? '在线' : '离线'}</span>
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
                messages.map((msg, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <UserOutlined className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">
                          {msg.agent_name}
                        </span>
                        <Tag color="blue" size="small">
                          {msg.message_type || '发言'}
                        </Tag>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <Text>{msg.message_content}</Text>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 底部控制区域 */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  {messages.length} 条消息
                </Text>
                <Button size="small" onClick={scrollToBottom}>
                  滚动到底部
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}