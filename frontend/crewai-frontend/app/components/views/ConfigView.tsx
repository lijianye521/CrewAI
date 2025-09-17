'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  App,
  Alert,
  Row,
  Col,
  Select,
  Space,
  Divider,
  Tag,
  Typography,
  Spin,
  InputNumber,
  Tooltip,
  Result
} from 'antd';
import {
  KeyOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  SettingOutlined,
  ApiOutlined,
  CloudServerOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { ConfigService, api } from '../../../lib/api';
import { useErrorHandler } from '../../../lib/error-handler';

const { Password } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface ModelConfig {
  openai_api_key: string;
  openai_base_url: string;
  model: string;
  max_tokens: number;
  temperature: number;
  is_configured: boolean;
  available_models?: Array<{
    id: string;
    name: string;
    description: string;
    max_tokens: number;
    pricing: {
      input: string;
      output: string;
    };
  }>;
}

interface SystemStatus {
  system: string;
  version: string;
  status: string;
  database: string;
  ai_service: {
    provider: string;
    api_configured: boolean;
    available_models: string[];
  };
  features: Record<string, boolean>;
  timestamp: string;
}

export default function ConfigView() {
  const { message } = App.useApp();
  const { handleAsyncError } = useErrorHandler();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    openai_api_key: '',
    openai_base_url: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    max_tokens: 2000,
    temperature: 0.7,
    is_configured: false
  });

  useEffect(() => {
    Promise.all([
      fetchSystemStatus(),
      fetchModelConfig()
    ]);
  }, []);

  const fetchSystemStatus = async () => {
    setSystemError(null);

    const result = await handleAsyncError(
      () => ConfigService.getSystemStatus(),
      { silent: true } // 不显示错误消息，我们会在UI中处理
    );

    if (result) {
      setSystemStatus(result);
    } else {
      setSystemError('无法连接到后端服务');
    }

    setSystemLoading(false);
  };

  const fetchModelConfig = async () => {
    const result = await handleAsyncError(
      () => ConfigService.getModelConfig(),
      { silent: true }
    );

    if (result) {
      setModelConfig(result);
      form.setFieldsValue(result);
    }
    // 如果失败，保持默认配置，不显示错误
  };

  const handleSave = async (values: any) => {
    setLoading(true);

    const result = await handleAsyncError(
      () => ConfigService.updateModelConfig(values),
      { showNotification: false } // 使用message而不是notification
    );

    if (result) {
      message.success('配置保存成功！');

      // 重新获取配置和状态
      await Promise.all([
        fetchModelConfig(),
        fetchSystemStatus()
      ]);
    }

    setLoading(false);
  };

  const handleTest = async () => {
    try {
      // 先验证表单
      const values = await form.validateFields();
      setTestLoading(true);

      const result = await handleAsyncError(
        () => ConfigService.testConnection(values),
        { showNotification: false }
      );

      if (result && result.success) {
        message.success(`连接测试成功！响应时间: ${result.model_info?.response_time_ms || 0}ms`);
      }
    } catch (error) {
      // form.validateFields 可能抛出验证错误，这里处理
      console.warn('表单验证失败:', error);
    } finally {
      setTestLoading(false);
    }
  };

  const handleRetrySystemStatus = async () => {
    setSystemLoading(true);
    await fetchSystemStatus();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'healthy':
        return 'success';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'warning';
    }
  };

  // 如果系统加载中
  if (systemLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
        <span className="ml-3">正在连接后端服务...</span>
      </div>
    );
  }

  // 如果系统连接失败
  if (systemError && !systemStatus) {
    return (
      <div className="p-6">
        <Result
          status="warning"
          title="无法连接到后端服务"
          subTitle={systemError}
          extra={[
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetrySystemStatus} key="retry">
              重新连接
            </Button>,
            <Button key="continue" onClick={() => setSystemError(null)}>
              离线继续使用
            </Button>
          ]}
        >
          <div className="desc">
            <p>
              <InfoCircleOutlined className="mr-2" />
              请检查以下事项：
            </p>
            <ul className="text-left ml-6">
              <li>后端服务是否已启动 (python main.py)</li>
              <li>服务地址是否正确 (默认: http://localhost:8000)</li>
              <li>防火墙是否阻止了连接</li>
              <li>网络连接是否正常</li>
            </ul>
          </div>
        </Result>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 连接状态警告 */}
      {systemError && (
        <Alert
          message="后端连接不稳定"
          description={`${systemError}，部分功能可能无法正常使用。您可以继续配置，但建议先解决连接问题。`}
          type="warning"
          showIcon
          closable
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetrySystemStatus}>
              重试连接
            </Button>
          }
          className="mb-4"
        />
      )}

      {/* 系统状态概览 */}
      <Card
        title={
          <Space>
            <CloudServerOutlined />
            <span>系统状态</span>
            {systemError && (
              <Tooltip title="后端连接异常">
                <ExclamationCircleOutlined className="text-orange-500" />
              </Tooltip>
            )}
          </Space>
        }
        className="mb-6"
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRetrySystemStatus}
            loading={systemLoading}
          >
            刷新状态
          </Button>
        }
      >
        {systemStatus && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{systemStatus.version}</div>
                  <div className="text-gray-500">系统版本</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <Tag color={getStatusColor(systemStatus.status)} className="text-sm px-3 py-1">
                    {systemStatus.status}
                  </Tag>
                  <div className="text-gray-500 mt-1">系统状态</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <Tag color={getStatusColor(systemStatus.database)} className="text-sm px-3 py-1">
                    {systemStatus.database}
                  </Tag>
                  <div className="text-gray-500 mt-1">数据库</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <Tag color={systemStatus.ai_service.api_configured ? 'success' : 'warning'} className="text-sm px-3 py-1">
                    {systemStatus.ai_service.api_configured ? '已配置' : '未配置'}
                  </Tag>
                  <div className="text-gray-500 mt-1">AI 服务</div>
                </div>
              </Col>
            </Row>
            
            <Divider />
            
            <div>
              <Text strong>AI 服务提供商: </Text>
              <Tag color="blue">{systemStatus.ai_service.provider}</Tag>
            </div>
            
            <div>
              <Text strong>支持的模型: </Text>
              {systemStatus.ai_service.available_models.map(model => (
                <Tag key={model} color="geekblue">{model}</Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* DeepSeek API 配置 */}
      <Card 
        title={
          <Space>
            <ApiOutlined />
            <span>DeepSeek API 配置</span>
          </Space>
        }
        extra={
          modelConfig.is_configured ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              已配置
            </Tag>
          ) : (
            <Tag color="warning">未配置</Tag>
          )
        }
      >
        <Alert
          message="配置说明"
          description={
            <div>
              <p>请配置您的AI模型参数，这些设置将在创建智能体时被引用。</p>
              <p>确保API Key有效且具有足够的使用额度。</p>
              <p><strong>获取API Key:</strong> 请访问 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">DeepSeek平台</a> 获取您的API密钥。</p>
            </div>
          }
          type="info"
          showIcon
          className="mb-6"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={modelConfig}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="openai_api_key"
                label="API Key"
                rules={[
                  { required: true, message: '请输入API Key' },
                  { pattern: /^sk-/, message: 'DeepSeek API Key应以"sk-"开头' }
                ]}
                extra="支持 DeepSeek API Key，以 sk- 开头"
              >
                <Password
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  prefix={<KeyOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="openai_base_url"
                label="API Base URL"
                rules={[{ required: true, message: '请输入API Base URL' }]}
                extra="DeepSeek API的基础URL"
              >
                <Input placeholder="https://api.deepseek.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="model"
                label="默认模型"
                rules={[{ required: true, message: '请选择模型' }]}
              >
                <Select placeholder="选择默认模型">
                  <Option value="deepseek-chat">DeepSeek Chat (V3.1) - 通用对话</Option>
                  <Option value="deepseek-reasoner">DeepSeek Reasoner (V3.1) - 复杂推理</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="max_tokens"
                label="最大 Tokens"
                rules={[{ required: true, message: '请输入最大tokens数' }]}
                extra="单次请求的最大token数量"
              >
                <InputNumber
                  min={100}
                  max={4096}
                  placeholder="2000"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="temperature"
                label="Temperature"
                rules={[{ required: true, message: '请输入temperature值' }]}
                extra="控制输出的随机性，0-2之间"
              >
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="0.7"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <Button 
              onClick={handleTest} 
              loading={testLoading}
              icon={<ExperimentOutlined />}
            >
              测试连接
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<SettingOutlined />}
            >
              保存配置
            </Button>
          </div>
        </Form>
      </Card>

      {/* 模型定价信息 */}
      <Card title="模型定价参考" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <div className="p-4 bg-blue-50 rounded">
              <div className="font-semibold text-blue-800">DeepSeek Chat (V3.1)</div>
              <div className="text-sm text-gray-600 mt-1">
                输入: $0.14 / 1M tokens<br/>
                输出: $0.28 / 1M tokens
              </div>
              <div className="text-xs text-gray-500 mt-2">适合日常对话和多数任务</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="p-4 bg-purple-50 rounded">
              <div className="font-semibold text-purple-800">DeepSeek Reasoner (V3.1)</div>
              <div className="text-sm text-gray-600 mt-1">
                输入: $0.55 / 1M tokens<br/>
                输出: $2.19 / 1M tokens
              </div>
              <div className="text-xs text-gray-500 mt-2">适合复杂推理和问题解决</div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}