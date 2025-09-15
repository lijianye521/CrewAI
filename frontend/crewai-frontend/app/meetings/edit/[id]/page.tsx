"use client";

import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Divider, 
  Row, 
  Col, 
  message,
  Switch,
  DatePicker,
  InputNumber,
  Transfer,
  Alert,
  Tabs,
  Spin
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';

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

export default function EditMeetingPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<AgentConfig[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [expectedOutcomes, setExpectedOutcomes] = useState<string[]>([]);
  const [outcomeInput, setOutcomeInput] = useState('');
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  useEffect(() => {
    fetchAvailableAgents();
    fetchMeetingData();
  }, [meetingId]);

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

  const fetchMeetingData = async () => {
    try {
      setDataLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}`);
      
      if (response.ok) {
        const meetingData = await response.json();
        
        // 设置表单数据
        form.setFieldsValue({
          title: meetingData.title,
          description: meetingData.description,
          topic: meetingData.topic,
          meeting_rules: meetingData.meeting_rules || {},
          discussion_config: {
            ...meetingData.discussion_config,
            expected_outcomes: undefined, // 单独处理
          },
          scheduled_start_time: meetingData.scheduled_start_time ? dayjs(meetingData.scheduled_start_time) : undefined,
        });

        // 设置期望结果
        setExpectedOutcomes(meetingData.discussion_config?.expected_outcomes || []);

        // 获取参与者信息
        if (meetingData.participants && meetingData.participants.length > 0) {
          const participantIds = meetingData.participants.map((p: any) => p.agent_id);
          setSelectedAgents(participantIds);
        }
      } else {
        message.error('获取会议数据失败');
        router.push('/meetings');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
      router.push('/meetings');
    } finally {
      setDataLoading(false);
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

  const handleSubmit = async (values: any) => {
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
        scheduled_start_time: values.scheduled_start_time ? values.scheduled_start_time.toISOString() : undefined,
      };

      const response = await fetch(`http://localhost:8000/api/v1/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        message.success('会议更新成功！');
        router.push('/meetings');
      } else {
        const errorData = await response.json();
        message.error(`更新失败: ${errorData.detail || '未知错误'}`);
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

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 p-8">
          <div className="flex items-center space-x-4">
            <Spin size="large" />
            <span className="text-white text-lg">加载会议数据中...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <div className="flex items-center mb-6">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/meetings')}
              className="mr-4"
            >
              返回列表
            </Button>
            <Title level={2} className="text-white mb-0">
              编辑会议
            </Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Tabs defaultActiveKey="basic" className="mb-6">
              <TabPane tab="基础信息" key="basic">
                <Card className="mb-6 bg-slate-700 border-slate-600">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="title"
                        label={<span className="text-slate-300">会议标题</span>}
                        rules={[{ required: true, message: '请输入会议标题' }]}
                      >
                        <Input 
                          placeholder="例如：产品策略讨论会" 
                          className="bg-slate-600 border-slate-500 text-white" 
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="topic"
                        label={<span className="text-slate-300">会议主题</span>}
                        rules={[{ required: true, message: '请输入会议主题' }]}
                      >
                        <Input 
                          placeholder="例如：2024年产品发展方向" 
                          className="bg-slate-600 border-slate-500 text-white" 
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="description"
                    label={<span className="text-slate-300">会议描述（可选）</span>}
                  >
                    <TextArea 
                      rows={3} 
                      placeholder="详细描述会议的目的、背景和要解决的问题..."
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </Form.Item>

                  <Form.Item
                    name="scheduled_start_time"
                    label={<span className="text-slate-300">计划开始时间（可选）</span>}
                  >
                    <DatePicker
                      showTime
                      format="YYYY-MM-DD HH:mm:ss"
                      placeholder="选择开始时间"
                      className="w-full bg-slate-600 border-slate-500"
                    />
                  </Form.Item>
                </Card>
              </TabPane>

              <TabPane tab="讨论配置" key="discussion">
                <Card className="mb-6 bg-slate-700 border-slate-600">
                  <Form.Item
                    name={['discussion_config', 'discussion_topic']}
                    label={<span className="text-slate-300">讨论话题</span>}
                    rules={[{ required: true, message: '请输入讨论话题' }]}
                  >
                    <Input 
                      placeholder="具体的讨论话题" 
                      className="bg-slate-600 border-slate-500 text-white" 
                    />
                  </Form.Item>

                  <Form.Item
                    name={['discussion_config', 'context_description']}
                    label={<span className="text-slate-300">背景描述</span>}
                  >
                    <TextArea 
                      rows={4} 
                      placeholder="提供讨论的背景信息、相关数据、约束条件等..."
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                  </Form.Item>

                  <Form.Item
                    name={['discussion_config', 'discussion_style']}
                    label={<span className="text-slate-300">讨论风格</span>}
                  >
                    <Select 
                      placeholder="选择讨论风格" 
                      options={discussionStyleOptions}
                      className="custom-select"
                    />
                  </Form.Item>

                  <Form.Item
                    label={<span className="text-slate-300">期望结果</span>}
                  >
                    <Row gutter={16} className="mb-4">
                      <Col span={18}>
                        <Input
                          value={outcomeInput}
                          onChange={(e) => setOutcomeInput(e.target.value)}
                          placeholder="输入期望的会议结果，例如：确定产品路线图"
                          className="bg-slate-600 border-slate-500 text-white"
                          onPressEnter={handleAddOutcome}
                        />
                      </Col>
                      <Col span={6}>
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />} 
                          onClick={handleAddOutcome}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          添加
                        </Button>
                      </Col>
                    </Row>
                    
                    <div className="space-y-2">
                      {expectedOutcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-600 p-2 rounded">
                          <span className="text-slate-300">{outcome}</span>
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
                <Card className="mb-6 bg-slate-700 border-slate-600">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name={['meeting_rules', 'max_participants']}
                        label={<span className="text-slate-300">最大参与者数量</span>}
                      >
                        <InputNumber
                          min={1}
                          max={20}
                          placeholder="最多参与者"
                          className="w-full bg-slate-600 border-slate-500"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={['meeting_rules', 'max_duration_minutes']}
                        label={<span className="text-slate-300">最大时长（分钟）</span>}
                      >
                        <InputNumber
                          min={5}
                          max={480}
                          placeholder="会议最大时长"
                          className="w-full bg-slate-600 border-slate-500"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name={['meeting_rules', 'speaking_time_limit']}
                        label={<span className="text-slate-300">单次发言时限（秒）</span>}
                      >
                        <InputNumber
                          min={10}
                          max={300}
                          placeholder="每次发言最大时长"
                          className="w-full bg-slate-600 border-slate-500"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name={['meeting_rules', 'discussion_rounds']}
                        label={<span className="text-slate-300">讨论轮数</span>}
                      >
                        <InputNumber
                          min={1}
                          max={10}
                          placeholder="总的讨论轮数"
                          className="w-full bg-slate-600 border-slate-500"
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
                <Card className="mb-6 bg-slate-700 border-slate-600">
                  <div className="mb-4">
                    <Title level={4} className="text-white">选择参与会议的Agent</Title>
                    <p className="text-slate-400">从左侧可用Agent中选择参与此次会议的智能体</p>
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
                      backgroundColor: 'rgb(71 85 105)',
                      border: '1px solid rgb(100 116 139)',
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
                size="large" 
                onClick={() => router.push('/meetings')}
              >
                取消
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading}
                className="bg-purple-600 hover:bg-purple-700 border-purple-600"
              >
                保存更改
              </Button>
            </div>
          </Form>
        </Card>
      </div>

      <style jsx global>{`
        .custom-select .ant-select-selector {
          background-color: rgb(71 85 105) !important;
          border-color: rgb(100 116 139) !important;
          color: white !important;
        }
        .custom-select .ant-select-selection-search-input {
          color: white !important;
        }
        .custom-select .ant-select-arrow {
          color: rgb(203 213 225) !important;
        }
        .ant-transfer-list-header {
          background-color: rgb(51 65 85) !important;
          color: white !important;
        }
        .ant-transfer-list-body {
          background-color: rgb(71 85 105) !important;
        }
        .ant-transfer-list-content-item {
          color: white !important;
        }
        .ant-transfer-list-content-item:hover {
          background-color: rgb(100 116 139) !important;
        }
        .ant-picker {
          background-color: rgb(71 85 105) !important;
          border-color: rgb(100 116 139) !important;
          color: white !important;
        }
        .ant-picker-input input {
          color: white !important;
        }
      `}</style>
    </div>
  );
}