"use client";

import React, { useState, useEffect } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';
import { Button, Table, Space, Modal, message, Tag, Card, Typography, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);

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
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个Agent吗？此操作不可撤销。',
      onOk: async () => {
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
      },
    });
  };

  const handleViewDetails = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setDetailModalVisible(true);
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
            onClick={() => window.location.href = `/agents/edit/${record.id}`}
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

  return (
    <MainLayout title="智能体管理" subtitle="管理所有AI智能体的个性化配置，包括角色定义、说话风格、行为特征等">
      <div className="space-y-6">
        <Card className="bg-white shadow-lg border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                className="bg-gray-900 hover:bg-gray-800 border-gray-900"
                onClick={() => window.location.href = '/agents/create'}
              >
                创建 Agent
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => window.location.href = '/agents/templates'}
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

        {/* Agent详情模态框 */}
        <Modal
          title={`Agent详情: ${selectedAgent?.name}`}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>,
            <Button 
              key="edit" 
              type="primary" 
              className="bg-gray-900 hover:bg-gray-800"
              onClick={() => {
                window.location.href = `/agents/edit/${selectedAgent?.id}`;
              }}
            >
              编辑Agent
            </Button>,
          ]}
          width={800}
        >
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
        </Modal>
      </div>
    </MainLayout>
  );
}