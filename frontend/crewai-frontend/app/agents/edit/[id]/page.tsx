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
  Tag,
  Spin
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';

const { Title } = Typography;
const { TextArea } = Input;

interface AgentFormData {
  name: string;
  role: string;
  goal: string;
  backstory: string;
  personality_traits: {
    personality_type: string;
    decision_making: string;
    communication_style: string;
    collaboration_style: string;
  };
  speaking_style: {
    tone: string;
    sentence_length: string;
    vocabulary_level: string;
    emotional_expression: string;
  };
  behavior_settings: {
    speaking_frequency: string;
    initiative_level: string;
    detail_preference: string;
  };
  expertise_areas: string[];
  avatar_url?: string;
  is_active: boolean;
}

export default function EditAgentPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  // 选项配置（与创建页面相同）
  const personalityOptions = [
    { value: 'analytical', label: '分析型' },
    { value: 'creative', label: '创新型' },
    { value: 'diplomatic', label: '外交型' },
    { value: 'decisive', label: '决断型' },
    { value: 'supportive', label: '支持型' },
  ];

  const decisionMakingOptions = [
    { value: 'data_driven', label: '数据驱动' },
    { value: 'intuitive', label: '直觉导向' },
    { value: 'collaborative', label: '协作决策' },
    { value: 'logical', label: '逻辑分析' },
    { value: 'creative', label: '创意思维' },
  ];

  const communicationStyleOptions = [
    { value: 'direct', label: '直接明了' },
    { value: 'diplomatic', label: '委婉外交' },
    { value: 'encouraging', label: '鼓励支持' },
    { value: 'questioning', label: '善于提问' },
    { value: 'storytelling', label: '故事化表达' },
  ];

  const collaborationStyleOptions = [
    { value: 'leader', label: '领导协调' },
    { value: 'team_player', label: '团队合作' },
    { value: 'independent', label: '独立工作' },
    { value: 'mentor', label: '指导帮助' },
    { value: 'challenger', label: '挑战质疑' },
  ];

  const toneOptions = [
    { value: 'professional', label: '专业、客观' },
    { value: 'friendly', label: '友善、亲和' },
    { value: 'authoritative', label: '权威、严肃' },
    { value: 'encouraging', label: '鼓励、积极' },
    { value: 'analytical', label: '分析、理性' },
  ];

  const sentenceLengthOptions = [
    { value: 'concise', label: '简洁有力' },
    { value: 'moderate', label: '中等长度' },
    { value: 'detailed', label: '详细准确' },
  ];

  const vocabularyLevelOptions = [
    { value: 'simple', label: '通俗易懂' },
    { value: 'business', label: '商业专业词汇' },
    { value: 'technical', label: '技术专业术语' },
    { value: 'academic', label: '学术研究词汇' },
  ];

  const emotionalExpressionOptions = [
    { value: 'reserved', label: '克制内敛' },
    { value: 'moderate', label: '适度表达' },
    { value: 'expressive', label: '丰富表达' },
  ];

  const speakingFrequencyOptions = [
    { value: 'low', label: '较少发言' },
    { value: 'medium', label: '适中发言' },
    { value: 'high', label: '积极发言' },
  ];

  const initiativeLevelOptions = [
    { value: 'low', label: '被动响应' },
    { value: 'medium', label: '适度主动' },
    { value: 'high', label: '高度主动' },
  ];

  const detailPreferenceOptions = [
    { value: 'concise', label: '简洁概要' },
    { value: 'balanced', label: '平衡详略' },
    { value: 'comprehensive', label: '全面详细' },
  ];

  useEffect(() => {
    fetchAgentData();
  }, [agentId]);

  const fetchAgentData = async () => {
    try {
      setDataLoading(true);
      const response = await fetch(`http://localhost:8000/api/v1/agents/${agentId}`);
      
      if (response.ok) {
        const agentData = await response.json();
        
        // 设置表单数据
        form.setFieldsValue({
          name: agentData.name,
          role: agentData.role,
          goal: agentData.goal,
          backstory: agentData.backstory,
          avatar_url: agentData.avatar_url,
          is_active: agentData.is_active,
          personality_traits: agentData.personality_traits || {},
          speaking_style: agentData.speaking_style || {},
          behavior_settings: agentData.behavior_settings || {},
        });

        // 设置专业领域
        setExpertiseAreas(agentData.expertise_areas || []);
      } else {
        message.error('获取Agent数据失败');
        router.push('/agents');
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
      router.push('/agents');
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddExpertise = () => {
    if (expertiseInput.trim() && !expertiseAreas.includes(expertiseInput.trim())) {
      setExpertiseAreas([...expertiseAreas, expertiseInput.trim()]);
      setExpertiseInput('');
    }
  };

  const handleRemoveExpertise = (area: string) => {
    setExpertiseAreas(expertiseAreas.filter(item => item !== area));
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const formData: AgentFormData = {
        ...values,
        expertise_areas: expertiseAreas,
      };

      const response = await fetch(`http://localhost:8000/api/v1/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        message.success('Agent更新成功！');
        router.push('/agents');
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

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 p-8">
          <div className="flex items-center space-x-4">
            <Spin size="large" />
            <span className="text-white text-lg">加载Agent数据中...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <div className="flex items-center mb-6">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/agents')}
              className="mr-4"
            >
              返回列表
            </Button>
            <Title level={2} className="text-white mb-0">
              编辑 Agent
            </Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* 基础信息 */}
            <Card 
              title={<span className="text-white">基础信息</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label={<span className="text-slate-300">Agent名称</span>}
                    rules={[{ required: true, message: '请输入Agent名称' }]}
                  >
                    <Input placeholder="例如：数据分析专家" className="bg-slate-600 border-slate-500 text-white" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="role"
                    label={<span className="text-slate-300">角色定位</span>}
                    rules={[{ required: true, message: '请输入角色定位' }]}
                  >
                    <Input placeholder="例如：高级数据分析师" className="bg-slate-600 border-slate-500 text-white" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="goal"
                label={<span className="text-slate-300">目标使命</span>}
                rules={[{ required: true, message: '请输入目标使命' }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="描述这个Agent的主要目标和使命..."
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </Form.Item>

              <Form.Item
                name="backstory"
                label={<span className="text-slate-300">背景故事</span>}
                rules={[{ required: true, message: '请输入背景故事' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="描述这个Agent的专业背景和经历..."
                  className="bg-slate-600 border-slate-500 text-white"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={18}>
                  <Form.Item
                    name="avatar_url"
                    label={<span className="text-slate-300">头像URL（可选）</span>}
                  >
                    <Input placeholder="https://..." className="bg-slate-600 border-slate-500 text-white" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="is_active"
                    label={<span className="text-slate-300">启用状态</span>}
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 个性特征 */}
            <Card 
              title={<span className="text-white">个性特征</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['personality_traits', 'personality_type']}
                    label={<span className="text-slate-300">个性类型</span>}
                  >
                    <Select 
                      placeholder="选择个性类型" 
                      options={personalityOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['personality_traits', 'decision_making']}
                    label={<span className="text-slate-300">决策方式</span>}
                  >
                    <Select 
                      placeholder="选择决策方式" 
                      options={decisionMakingOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['personality_traits', 'communication_style']}
                    label={<span className="text-slate-300">沟通风格</span>}
                  >
                    <Select 
                      placeholder="选择沟通风格" 
                      options={communicationStyleOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['personality_traits', 'collaboration_style']}
                    label={<span className="text-slate-300">协作风格</span>}
                  >
                    <Select 
                      placeholder="选择协作风格" 
                      options={collaborationStyleOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 说话风格 */}
            <Card 
              title={<span className="text-white">说话风格</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['speaking_style', 'tone']}
                    label={<span className="text-slate-300">语调风格</span>}
                  >
                    <Select 
                      placeholder="选择语调风格" 
                      options={toneOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['speaking_style', 'sentence_length']}
                    label={<span className="text-slate-300">句子长度</span>}
                  >
                    <Select 
                      placeholder="选择句子长度偏好" 
                      options={sentenceLengthOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['speaking_style', 'vocabulary_level']}
                    label={<span className="text-slate-300">词汇水平</span>}
                  >
                    <Select 
                      placeholder="选择词汇水平" 
                      options={vocabularyLevelOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['speaking_style', 'emotional_expression']}
                    label={<span className="text-slate-300">情感表达</span>}
                  >
                    <Select 
                      placeholder="选择情感表达程度" 
                      options={emotionalExpressionOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 行为设置 */}
            <Card 
              title={<span className="text-white">行为设置</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name={['behavior_settings', 'speaking_frequency']}
                    label={<span className="text-slate-300">发言频率</span>}
                  >
                    <Select 
                      placeholder="选择发言频率" 
                      options={speakingFrequencyOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['behavior_settings', 'initiative_level']}
                    label={<span className="text-slate-300">主动性水平</span>}
                  >
                    <Select 
                      placeholder="选择主动性水平" 
                      options={initiativeLevelOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name={['behavior_settings', 'detail_preference']}
                    label={<span className="text-slate-300">详细偏好</span>}
                  >
                    <Select 
                      placeholder="选择详细程度偏好" 
                      options={detailPreferenceOptions}
                      className="custom-select"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 专业领域 */}
            <Card 
              title={<span className="text-white">专业领域</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16} className="mb-4">
                <Col span={18}>
                  <Input
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    placeholder="输入专业领域，例如：数据分析、机器学习..."
                    className="bg-slate-600 border-slate-500 text-white"
                    onPressEnter={handleAddExpertise}
                  />
                </Col>
                <Col span={6}>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddExpertise}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    添加
                  </Button>
                </Col>
              </Row>
              
              <div>
                {expertiseAreas.map(area => (
                  <Tag
                    key={area}
                    closable
                    onClose={() => handleRemoveExpertise(area)}
                    color="orange"
                    style={{ marginBottom: 8 }}
                  >
                    {area}
                  </Tag>
                ))}
              </div>
            </Card>

            <div className="flex justify-end gap-4">
              <Button 
                size="large" 
                onClick={() => router.push('/agents')}
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
      `}</style>
    </div>
  );
}