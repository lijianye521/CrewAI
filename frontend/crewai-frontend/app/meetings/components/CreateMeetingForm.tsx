"use client";

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Card,
  Button,
  Typography,
  Row,
  Col,
  message,
  DatePicker,
  InputNumber,
  Transfer,
  Alert,
  Tabs
} from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AgentConfig {
  id: number;
  name: string;
  role: string;
  avatar_url?: string;
}

interface MeetingFormData {
  title: string;
  description?: string;
  topic: string;
  meeting_rules: {
    max_participants?: number;
    max_duration_minutes?: number;
    speaking_time_limit?: number;
    discussion_rounds?: number;
  };
  discussion_config: {
    discussion_topic: string;
    context_description?: string;
    expected_outcomes: string[];
    discussion_style: string;
  };
  scheduled_start_time?: string;
  participant_agents: number[];
}

interface CreateMeetingFormProps {
  onSuccess?: () => void;
  initialData?: MeetingFormData;
  isEdit?: boolean;
}

export default function CreateMeetingForm({ onSuccess, initialData, isEdit = false }: CreateMeetingFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<AgentConfig[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState('');

  useEffect(() => {
    fetchAvailableAgents();
    if (initialData && isEdit) {
      // 填充表单数据
      form.setFieldsValue(initialData);
      setSelectedAgents(initialData.participant_agents || []);
      setExpectedOutcomes(initialData.discussion_config?.expected_outcomes || []);
    }
  }, [initialData, isEdit, form]);

  const fetchAvailableAgents = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/agents?is_active=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableAgents(data);
      } else {
        message.error('获取可用Agent列表失败');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    }
  };

  const handleAddOutcome = () => {
    if (outcomeInput.trim() && !expectedOutcomes.includes(outcomeInput.trim())) {
      setExpectedOutcomes([...expectedOutcomes, outcomeInput.trim()]);
      setOutcomeInput('');
    }
  };

  const handleRemoveOutcome = (outcome: string) => {
    setExpectedOutcomes(expectedOutcomes.filter(item => item !== outcome));
  };

  const handleTransferChange = (targetKeys: string[]) => {
    setSelectedAgents(targetKeys.map(key => parseInt(key)));
  };

  const handleSubmit = async (values: Partial<MeetingFormData>) => {
    if (selectedAgents.length === 0) {
      message.error('请至少选择一个参与的Agent');
      return;
    }

    try {
      setLoading(true);

      const formData: MeetingFormData = {
        ...values,
        discussion_config: {
          ...values.discussion_config,
          expected_outcomes: expectedOutcomes,
        },
        participant_agents: selectedAgents,
      };

      const url = isEdit ? `http://localhost:8000/api/v1/meetings/${initialData.id}` : 'http://localhost:8000/api/v1/meetings';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        message.error(`${isEdit ? '更新' : '创建'}失败: ${errorData.detail || '未知错误'}`);
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const transferDataSource = availableAgents.map(agent => ({
    key: agent.id.toString(),
    title: agent.name,
    description: agent.role,
  }));

  const discussionStyleOptions = [
    { value: 'open', label: '开放式讨论' },
    { value: 'structured', label: '结构化讨论' },
    { value: 'debate', label: '辩论式' },
    { value: 'brainstorming', label: '头脑风暴' },
    { value: 'consensus_building', label: '共识建设' },
  ];

  return (
    <div className="max-w-full">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          meeting_rules: {
            max_participants: 10,
            max_duration_minutes: 60,
            speaking_time_limit: 120,
            discussion_rounds: 3,
          },
          discussion_config: {
            discussion_style: 'open',
          }
        }}
      >
        <Tabs defaultActiveKey="basic" className="mb-6">
          <TabPane tab="基础信息" key="basic">
            <Card className="mb-6 bg-white border-gray-200">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="title"
                    label="会议标题"
                    rules={[{ required: true, message: '请输入会议标题' }]}
                  >
                    <Input placeholder="例如：产品策略讨论会" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="topic"
                    label="会议主题"
                    rules={[{ required: true, message: '请输入会议主题' }]}
                  >
                    <Input placeholder="例如：2024年产品发展方向" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="会议描述（可选）"
              >
                <TextArea
                  rows={3}
                  placeholder="详细描述会议的目的、背景和要解决的问题..."
                />
              </Form.Item>

              <Form.Item
                name="scheduled_start_time"
                label="计划开始时间（可选）"
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择开始时间"
                  className="w-full"
                />
              </Form.Item>
            </Card>
          </TabPane>

          <TabPane tab="讨论配置" key="discussion">
            <Card className="mb-6 bg-white border-gray-200">
              <Form.Item
                name={['discussion_config', 'discussion_topic']}
                label="讨论话题"
                rules={[{ required: true, message: '请输入讨论话题' }]}
              >
                <Input placeholder="具体的讨论话题" />
              </Form.Item>

              <Form.Item
                name={['discussion_config', 'context_description']}
                label="背景描述"
              >
                <TextArea
                  rows={4}
                  placeholder="提供讨论的背景信息、相关数据、约束条件等..."
                />
              </Form.Item>

              <Form.Item
                name={['discussion_config', 'discussion_style']}
                label="讨论风格"
              >
                <Select
                  placeholder="选择讨论风格"
                  options={discussionStyleOptions}
                />
              </Form.Item>

              <Form.Item
                label="期望结果"
              >
                <Row gutter={16} className="mb-4">
                  <Col span={18}>
                    <Input
                      value={outcomeInput}
                      onChange={(e) => setOutcomeInput(e.target.value)}
                      placeholder="输入期望的会议结果，例如：确定产品路线图"
                      onPressEnter={handleAddOutcome}
                    />
                  </Col>
                  <Col span={6}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddOutcome}
                      className="w-full"
                    >
                      添加
                    </Button>
                  </Col>
                </Row>

                <div className="space-y-2">
                  {expectedOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-gray-700">{outcome}</span>
                      <Button
                        size="small"
                        danger
                        onClick={() => handleRemoveOutcome(outcome)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              </Form.Item>
            </Card>
          </TabPane>

          <TabPane tab="会议规则" key="rules">
            <Card className="mb-6 bg-white border-gray-200">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['meeting_rules', 'max_participants']}
                    label="最大参与者数量"
                  >
                    <InputNumber
                      min={1}
                      max={20}
                      placeholder="最多参与者"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['meeting_rules', 'max_duration_minutes']}
                    label="最大时长（分钟）"
                  >
                    <InputNumber
                      min={5}
                      max={480}
                      placeholder="会议最大时长"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['meeting_rules', 'speaking_time_limit']}
                    label="单次发言时限（秒）"
                  >
                    <InputNumber
                      min={10}
                      max={300}
                      placeholder="每次发言最大时长"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['meeting_rules', 'discussion_rounds']}
                    label="讨论轮数"
                  >
                    <InputNumber
                      min={1}
                      max={10}
                      placeholder="总的讨论轮数"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Alert
                message="会议规则说明"
                description="这些规则将帮助控制会议的进行节奏和质量。系统会根据这些规则智能调度Agent的发言。"
                type="info"
                className="mt-4"
              />
            </Card>
          </TabPane>

          <TabPane tab="参与Agent" key="participants">
            <Card className="mb-6 bg-white border-gray-200">
              <div className="mb-4">
                <Title level={4}>选择参与会议的Agent</Title>
                <p className="text-gray-600">从左侧可用Agent中选择参与此次会议的智能体</p>
              </div>

              <Transfer
                dataSource={transferDataSource}
                targetKeys={selectedAgents.map(id => id.toString())}
                onChange={handleTransferChange}
                render={item => `${item.title} - ${item.description}`}
                titles={['可用Agent', '已选择Agent']}
                listStyle={{
                  width: '45%',
                  height: 400,
                }}
                operations={['添加', '移除']}
              />

              <Alert
                message={`已选择 ${selectedAgents.length} 个Agent参与会议`}
                description="建议选择2-8个具有不同专业背景的Agent以获得更好的讨论效果"
                type={selectedAgents.length === 0 ? 'warning' : 'info'}
                className="mt-4"
              />
            </Card>
          </TabPane>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 border-blue-600"
          >
            {isEdit ? '更新会议' : '创建会议'}
          </Button>
        </div>
      </Form>
    </div>
  );
}