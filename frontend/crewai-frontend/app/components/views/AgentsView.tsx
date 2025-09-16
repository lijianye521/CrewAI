'use client';

import React, { useState, useEffect } from 'react';
import { Button, Table, Space, message, Tag, Card, Typography, Descriptions, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import CreateAgentForm from '@/app/agents/components/CreateAgentForm';

const { Title } = Typography;

interface AgentConfig {
  id: number;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  personality_traits: {
    personality_type?: string;
    decision_making?: string;
    communication_style?: string;
    collaboration_style?: string;
  };
  speaking_style: {
    tone?: string;
    sentence_length?: string;
    vocabulary_level?: string;
    emotional_expression?: string;
  };
  behavior_settings: {
    speaking_frequency?: string;
    initiative_level?: string;
    detail_preference?: string;
  };
  expertise_areas: string[];
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentsViewProps {
  subView: string;
}

export default function AgentsView({ subView }: AgentsViewProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      } else {
        message.error('获取Agent列表失败');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/agents/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('删除成功');
        fetchAgents();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const handleViewDetails = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    window.location.hash = '#agents/detail';
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setEditingAgent(agent);
    window.location.hash = '#agents/edit';
  };

  const handleAgentCreated = () => {
    fetchAgents();
    window.location.hash = '#agents/list';
    message.success('智能体创建成功！');
  };

  const handleAgentUpdated = () => {
    fetchAgents();
    window.location.hash = '#agents/list';
    message.success('智能体更新成功！');
  };

  const columns: ColumnsType<AgentConfig> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Agent名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: AgentConfig) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.role}</div>
        </div>
      ),
    },
    {
      title: '个性类型',
      dataIndex: ['personality_traits', 'personality_type'],
      key: 'personality_type',
      render: (text: string) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '说话风格',
      dataIndex: ['speaking_style', 'tone'],
      key: 'tone',
      render: (text: string) => text ? <Tag color="green">{text}</Tag> : '-',
    },
    {
      title: '专业领域',
      dataIndex: 'expertise_areas',
      key: 'expertise_areas',
      render: (areas: string[]) => (
        <div>
          {areas?.slice(0, 2).map(area => (
            <Tag key={area} color="orange" style={{ marginBottom: 2 }}>
              {area}
            </Tag>
          ))}
          {areas?.length > 2 && <Tag color="orange">+{areas.length - 2}</Tag>}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: AgentConfig) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            size="small"
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAgent(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            size="small"
          >
            删除
          </Button>
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
                onClick={() => window.location.hash = '#agents/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                创建新智能体
              </Title>
            </div>
            <CreateAgentForm onSuccess={handleAgentCreated} />
          </div>
        );

      case 'edit':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#agents/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                编辑智能体: {editingAgent?.name}
              </Title>
            </div>
            <CreateAgentForm
              initialData={editingAgent}
              onSuccess={handleAgentUpdated}
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
                onClick={() => window.location.hash = '#agents/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                智能体详情: {selectedAgent?.name}
              </Title>
            </div>
            {selectedAgent && (
              <div className="space-y-4">
                <Descriptions title="基础信息" bordered column={2}>
                  <Descriptions.Item label="名称">{selectedAgent.name}</Descriptions.Item>
                  <Descriptions.Item label="角色">{selectedAgent.role}</Descriptions.Item>
                  <Descriptions.Item label="目标" span={2}>
                    {selectedAgent.goal}
                  </Descriptions.Item>
                  <Descriptions.Item label="背景故事" span={2}>
                    {selectedAgent.backstory}
                  </Descriptions.Item>
                </Descriptions>

                <Descriptions title="个性特征" bordered column={2}>
                  <Descriptions.Item label="个性类型">
                    {selectedAgent.personality_traits.personality_type || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="决策方式">
                    {selectedAgent.personality_traits.decision_making || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="沟通风格">
                    {selectedAgent.personality_traits.communication_style || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="协作风格">
                    {selectedAgent.personality_traits.collaboration_style || '未设置'}
                  </Descriptions.Item>
                </Descriptions>

                <Descriptions title="说话风格" bordered column={2}>
                  <Descriptions.Item label="语调">
                    {selectedAgent.speaking_style.tone || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="句子长度">
                    {selectedAgent.speaking_style.sentence_length || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="词汇水平">
                    {selectedAgent.speaking_style.vocabulary_level || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="情感表达">
                    {selectedAgent.speaking_style.emotional_expression || '未设置'}
                  </Descriptions.Item>
                </Descriptions>

                <Descriptions title="行为设置" bordered column={2}>
                  <Descriptions.Item label="发言频率">
                    {selectedAgent.behavior_settings.speaking_frequency || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="主动性水平">
                    {selectedAgent.behavior_settings.initiative_level || '未设置'}
                  </Descriptions.Item>
                  <Descriptions.Item label="详细偏好" span={2}>
                    {selectedAgent.behavior_settings.detail_preference || '未设置'}
                  </Descriptions.Item>
                </Descriptions>

                <div>
                  <h4>专业领域:</h4>
                  <div style={{ marginTop: 8 }}>
                    {selectedAgent.expertise_areas?.map(area => (
                      <Tag key={area} color="orange" style={{ marginBottom: 4 }}>
                        {area}
                      </Tag>
                    ))}
                    {!selectedAgent.expertise_areas?.length && <span className="text-gray-500">未设置</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'templates':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => window.location.hash = '#agents/list'}
                className="mr-4"
              >
                返回列表
              </Button>
              <Title level={3} className="mb-0">
                智能体模板库
              </Title>
            </div>
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">模板库功能正在开发中...</p>
                <Button onClick={() => window.location.hash = '#agents/create'}>
                  直接创建智能体
                </Button>
              </div>
            </Card>
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
                    onClick={() => window.location.hash = '#agents/create'}
                  >
                    创建 Agent
                  </Button>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => window.location.hash = '#agents/templates'}
                  >
                    模板库
                  </Button>
                </div>
              </div>

              <Table
                columns={columns}
                dataSource={agents}
                loading={loading}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 个 Agent`,
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