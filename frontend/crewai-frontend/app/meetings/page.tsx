"use client";

import React, { useState, useEffect } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';
import { Button, Table, Space, Modal, message, Tag, Card, Typography, Badge, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

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

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      } else {
        message.error('获取会议列表失败');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会议吗？此操作不可撤销。',
      onOk: async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/meetings/${id}`, {
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
      },
    });
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${id}/status`, {
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
    setDetailModalVisible(true);
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
              onClick={() => window.location.href = `/meetings/live/${record.id}`}
              size="small"
            >
              观看
            </Button>
          )}

          {['draft', 'scheduled'].includes(record.status) && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => window.location.href = `/meetings/edit/${record.id}`}
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

  return (
    <MainLayout title="会议管理" subtitle="管理多智能体协作会议，支持实时讨论和历史回放">
      <div className="space-y-6">
        <Card className="bg-white shadow-lg border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                className="bg-gray-900 hover:bg-gray-800 border-gray-900"
                onClick={() => window.location.href = '/meetings/create'}
              >
                创建会议
              </Button>
              <Button
                icon={<CalendarOutlined />}
                onClick={() => window.location.href = '/meetings/schedule'}
              >
                会议日程
              </Button>
            </div>
          </div>

          {/* 状态统计 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'].map(status => {
              const count = meetings.filter(m => m.status === status).length;
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
            dataSource={meetings}
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

        {/* 会议详情模态框 */}
        <Modal
          title={`会议详情: ${selectedMeeting?.title}`}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
            selectedMeeting?.status === 'active' && (
              <Button 
                key="watch" 
                type="primary" 
                className="bg-gray-900 hover:bg-gray-800"
                onClick={() => {
                  window.location.href = `/meetings/live/${selectedMeeting.id}`;
                }}
              >
                观看会议
              </Button>
            ),
            ['draft', 'scheduled'].includes(selectedMeeting?.status || '') && (
              <Button 
                key="edit" 
                type="primary" 
                className="bg-gray-900 hover:bg-gray-800"
                onClick={() => {
                  window.location.href = `/meetings/edit/${selectedMeeting?.id}`;
                }}
              >
                编辑会议
              </Button>
            ),
          ].filter(Boolean)}
          width={800}
        >
          {selectedMeeting && (
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
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}