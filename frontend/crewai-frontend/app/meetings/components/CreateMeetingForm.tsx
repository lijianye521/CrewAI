"use client";

import React, { useState, useEffect } from 'react';
import type { Key } from 'react';
import {
  Form,
  Input,
  Select,
  Card,
  Button,
  Typography,
  Row,
  Col,
  App,
  DatePicker,
  InputNumber,
  Transfer,
  Alert,
  Tabs
} from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { AgentService, MeetingService } from '../../../lib/api';

const { Title } = Typography;
const { TextArea } = Input;

interface AgentConfig {
  id: number;
  name: string;
  role: string;
  avatar_url?: string;
  personality_traits: Record<string, any>;
  speaking_style: Record<string, any>;
  behavior_settings: Record<string, any>;
  backstory: string;
  goal: string;
  expertise_areas: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface TransferItem {
  key: string;
  title: string;
  description: string;
}

interface CreateMeetingFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const CreateMeetingForm: React.FC<CreateMeetingFormProps> = ({ onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<TransferItem[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Key[]>([]);

  // 获取Agent列表
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const agentData: AgentConfig[] = await AgentService.getList({ is_active: true });
      
      const transferItems: TransferItem[] = agentData.map(agent => ({
        key: agent.id.toString(),
        title: `${agent.name} (${agent.role})`,
        description: agent.goal || agent.backstory.substring(0, 50) + '...'
      }));
      
      setAgents(transferItems);
    } catch (error) {
      console.error('获取Agent列表失败:', error);
      // message.error 现在通过 API 拦截器统一处理，不需要手动调用
    }
  };

  const handleAgentChange = (newTargetKeys: Key[]) => {
    setSelectedAgents(newTargetKeys);
  };

  const handleSubmit = async (values: any) => {
    if (selectedAgents.length === 0) {
      message.warning('请至少选择一个参与Agent');
      return;
    }

    setLoading(true);
    try {
      // 构建提交数据
      const meetingData = {
        ...values,
        participant_agents: selectedAgents.map(id => parseInt(id.toString())),
        scheduled_start_time: values.scheduled_start?.toISOString(),
      };

      await MeetingService.create(meetingData);
      
      message.success('会议创建成功！');
      form.resetFields();
      setSelectedAgents([]);
      onSuccess?.();
    } catch (error) {
      console.error('创建会议失败:', error);
      // 错误信息已通过 API 拦截器处理
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基础信息',
      children: (
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

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="会议描述"
              >
                <TextArea 
                  rows={3} 
                  placeholder="请描述会议的目标、背景和期望达成的结果..."
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scheduled_start"
                label="计划开始时间"
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="选择会议开始时间"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['meeting_rules', 'max_duration_minutes']}
                label="会议时长(分钟)"
              >
                <InputNumber
                  min={5}
                  max={300}
                  placeholder="60"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'discussion',
      label: '讨论配置',
      children: (
        <Card className="mb-6 bg-white border-gray-200">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['discussion_config', 'discussion_style']}
                label="讨论风格"
              >
                <Select placeholder="选择讨论风格">
                  <Select.Option value="structured">结构化讨论</Select.Option>
                  <Select.Option value="open">开放式讨论</Select.Option>
                  <Select.Option value="debate">辩论式讨论</Select.Option>
                  <Select.Option value="brainstorm">头脑风暴</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['discussion_config', 'context_description']}
                label="背景描述"
              >
                <Input placeholder="描述讨论的背景和上下文" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name={['discussion_config', 'discussion_topic']}
                label="详细讨论话题"
              >
                <TextArea 
                  rows={3} 
                  placeholder="详细描述要讨论的具体问题和要点..."
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name={['discussion_config', 'expected_outcomes']}
                label="期望结果"
              >
                <Select
                  mode="tags"
                  placeholder="添加期望的会议结果（按回车添加）"
                  tokenSeparators={[',', '\n']}
                >
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'rules',
      label: '会议规则',
      children: (
        <Card className="mb-6 bg-white border-gray-200">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['meeting_rules', 'max_participants']}
                label="最大参与者数量"
              >
                <InputNumber
                  min={2}
                  max={20}
                  placeholder="10"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['meeting_rules', 'speaking_time_limit']}
                label="单次发言时限(秒)"
              >
                <InputNumber
                  min={10}
                  max={300}
                  placeholder="120"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['meeting_rules', 'discussion_rounds']}
                label="讨论轮数"
              >
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="3"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="会议规则说明"
            description={
              <ul className="mt-2 space-y-1">
                <li>• 最大参与者数量：控制会议的规模，避免过于复杂</li>
                <li>• 单次发言时限：防止单个Agent占用过多时间</li>
                <li>• 讨论轮数：每个Agent的最大发言次数</li>
              </ul>
            }
            type="info"
            showIcon
            className="mb-4"
          />
        </Card>
      )
    },
    {
      key: 'participants',
      label: '参与Agent',
      children: (
        <Card className="mb-6 bg-white border-gray-200">
          <Transfer
            dataSource={agents}
            targetKeys={selectedAgents}
            onChange={handleAgentChange}
            titles={['可用Agent', '已选择Agent']}
            render={item => item.title}
            listStyle={{
              width: '100%',
              height: 300,
            }}
            showSearch={{
              placeholder: '搜索Agent'
            }}
          />
        </Card>
      )
    }
  ];

  return (
    <div className="create-meeting-form">
      <div className="mb-6">
        <Title level={3} className="text-gray-800">创建新会议</Title>
        <p className="text-gray-600">配置智能体多人协作会议，设置讨论规则和参与者</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="space-y-6"
        initialValues={{
          meeting_rules: {
            max_participants: 10,
            speaking_time_limit: 120,
            max_duration_minutes: 60,
            discussion_rounds: 3,
          },
          discussion_config: {
            discussion_style: 'open',
          }
        }}
      >
        <Tabs 
          defaultActiveKey="basic" 
          className="mb-6"
          items={tabItems}
        />

        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <Button onClick={onCancel} size="large">
            取消
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
          >
            创建会议
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CreateMeetingForm;