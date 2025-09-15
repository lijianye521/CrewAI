"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  message, 
  Divider,
  Tag,
  Alert,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  KeyOutlined, 
  CheckCircleOutlined, 
  WarningOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  TestOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;
const { Password } = Input;

interface SystemConfig {
  api_key_configured: boolean;
  service_status: string;
  available_models: string[];
  current_model: string;
}

export default function ConfigPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSystemConfig();
    fetchCostEstimate();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/config/system');
      if (response.ok) {
        const data = await response.json();
        setSystemConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error);
    }
  };

  const fetchCostEstimate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/config/cost-estimate');
      if (response.ok) {
        const data = await response.json();
        setCostEstimate(data);
      }
    } catch (error) {
      console.error('Failed to fetch cost estimate:', error);
    }
  };

  const handleSaveApiKey = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/config/deepseek-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: values.api_key,
          user_id: 'default'
        }),
      });

      if (response.ok) {
        message.success('API密钥保存成功！');
        form.resetFields();
        fetchSystemConfig();
      } else {
        const errorData = await response.json();
        message.error(`保存失败: ${errorData.detail}`);
      }
    } catch (error) {
      message.error('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleTestModel = async () => {
    try {
      setTestLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/config/test-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.7,
          max_tokens: 100
        }),
      });

      if (response.ok) {
        const data = await response.json();
        message.success(`模型测试成功！预览: ${data.response_preview}`);
      } else {
        const errorData = await response.json();
        message.error(`测试失败: ${errorData.detail}`);
      }
    } catch (error) {
      message.error('测试请求失败');
    } finally {
      setTestLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/config/deepseek-key?user_id=default', {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('API密钥已删除');
        fetchSystemConfig();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'ready':
        return <Tag color="success" icon={<CheckCircleOutlined />}>服务就绪</Tag>;
      case 'api_key_required':
        return <Tag color="warning" icon={<WarningOutlined />}>需要配置API密钥</Tag>;
      default:
        return <Tag color="default" icon={<InfoCircleOutlined />}>状态未知</Tag>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <div className="flex items-center mb-6">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/')}
              className="mr-4"
            >
              返回首页
            </Button>
            <Title level={2} className="text-white mb-0">
              系统配置
            </Title>
          </div>

          {/* 系统状态概览 */}
          <Card 
            title={<span className="text-white">系统状态</span>} 
            className="mb-6 bg-slate-700 border-slate-600"
          >
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={<span className="text-slate-300">服务状态</span>}
                  value=""
                  formatter={() => systemConfig ? getStatusTag(systemConfig.service_status) : <Tag>加载中...</Tag>}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span className="text-slate-300">API密钥</span>}
                  value={systemConfig?.api_key_configured ? "已配置" : "未配置"}
                  valueStyle={{ color: systemConfig?.api_key_configured ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span className="text-slate-300">可用模型</span>}
                  value={systemConfig?.available_models?.length || 0}
                  valueStyle={{ color: '#1890ff' }}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<span className="text-slate-300">当前模型</span>}
                  value={systemConfig?.current_model || "未设置"}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>
          </Card>

          {/* DeepSeek API配置 */}
          <Card 
            title={<span className="text-white">DeepSeek API 配置</span>} 
            className="mb-6 bg-slate-700 border-slate-600"
            extra={
              systemConfig?.api_key_configured && (
                <Button 
                  danger 
                  size="small" 
                  onClick={handleRemoveApiKey}
                >
                  删除密钥
                </Button>
              )
            }
          >
            {systemConfig?.api_key_configured ? (
              <Alert
                message="API密钥已配置"
                description="DeepSeek API密钥已成功配置并验证，可以正常使用AI功能。"
                type="success"
                icon={<CheckCircleOutlined />}
                action={
                  <Button 
                    size="small" 
                    type="primary" 
                    icon={<TestOutlined />}
                    loading={testLoading}
                    onClick={handleTestModel}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    测试连接
                  </Button>
                }
                className="mb-4"
              />
            ) : (
              <>
                <Alert
                  message="需要配置DeepSeek API密钥"
                  description="请输入您的DeepSeek API密钥以启用AI功能。密钥将安全存储在服务器上。"
                  type="warning"
                  icon={<WarningOutlined />}
                  className="mb-4"
                />

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSaveApiKey}
                >
                  <Form.Item
                    name="api_key"
                    label={<span className="text-slate-300">DeepSeek API 密钥</span>}
                    rules={[
                      { required: true, message: '请输入API密钥' },
                      { pattern: /^sk-/, message: 'API密钥应以sk-开头' }
                    ]}
                  >
                    <Password
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="bg-slate-600 border-slate-500"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<KeyOutlined />}
                      loading={loading}
                      className="bg-purple-600 hover:bg-purple-700 border-purple-600"
                    >
                      保存API密钥
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}

            <Divider className="border-slate-600" />
            
            <div>
              <h4 className="text-white mb-2">获取API密钥</h4>
              <Paragraph className="text-slate-400">
                1. 访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-purple-400">DeepSeek平台</a>
              </Paragraph>
              <Paragraph className="text-slate-400">
                2. 注册账号并登录
              </Paragraph>
              <Paragraph className="text-slate-400">
                3. 在API页面创建新的API密钥
              </Paragraph>
              <Paragraph className="text-slate-400">
                4. 复制密钥并在上方输入框中粘贴
              </Paragraph>
            </div>
          </Card>

          {/* 成本估算 */}
          {costEstimate && (
            <Card 
              title={<span className="text-white">成本估算</span>} 
              className="mb-6 bg-slate-700 border-slate-600"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Card size="small" className="bg-slate-600 border-slate-500">
                    <Statistic
                      title={<span className="text-slate-300">标准对话</span>}
                      value={costEstimate.scenarios.medium_conversation}
                      precision={6}
                      suffix="USD"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="bg-slate-600 border-slate-500">
                    <Statistic
                      title={<span className="text-slate-300">一小时会议</span>}
                      value={costEstimate.scenarios.meeting_hour}
                      precision={6}
                      suffix="USD"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              </Row>
              <Alert
                message="成本说明"
                description="以上为估算价格，实际费用以DeepSeek平台结算为准。建议为账户充值适量资金以确保服务正常运行。"
                type="info"
                className="mt-4"
              />
            </Card>
          )}

          {/* 模型信息 */}
          <Card 
            title={<span className="text-white">可用模型</span>} 
            className="bg-slate-700 border-slate-600"
          >
            <div className="space-y-4">
              <div className="p-4 bg-slate-600 rounded-lg">
                <h4 className="text-white font-semibold mb-2">DeepSeek Chat</h4>
                <p className="text-slate-300 text-sm mb-2">通用对话模型，适合大部分场景</p>
                <div className="flex gap-2">
                  <Tag color="blue">Max Tokens: 4000</Tag>
                  <Tag color="green">按token计费</Tag>
                  <Tag color="purple">推荐使用</Tag>
                </div>
              </div>
              
              <div className="p-4 bg-slate-600 rounded-lg">
                <h4 className="text-white font-semibold mb-2">DeepSeek Coder</h4>
                <p className="text-slate-300 text-sm mb-2">代码生成和编程相关模型</p>
                <div className="flex gap-2">
                  <Tag color="blue">Max Tokens: 4000</Tag>
                  <Tag color="green">按token计费</Tag>
                  <Tag color="orange">编程专用</Tag>
                </div>
              </div>
              
              <div className="p-4 bg-slate-600 rounded-lg">
                <h4 className="text-white font-semibold mb-2">DeepSeek Math</h4>
                <p className="text-slate-300 text-sm mb-2">数学和逻辑推理模型</p>
                <div className="flex gap-2">
                  <Tag color="blue">Max Tokens: 4000</Tag>
                  <Tag color="green">按token计费</Tag>
                  <Tag color="red">数学推理</Tag>
                </div>
              </div>
            </div>
          </Card>
        </Card>
      </div>
    </div>
  );
}