'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Alert,
  Row,
  Col,
  Select
} from 'antd';
import {
  KeyOutlined,
  CheckCircleOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Password } = Input;
const { Option } = Select;

interface ModelConfig {
  openai_api_key: string;
  openai_base_url: string;
  model: string;
  max_tokens: number;
  temperature: number;
}

export default function ConfigView() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    openai_api_key: '',
    openai_base_url: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    max_tokens: 2000,
    temperature: 0.7
  });

  useEffect(() => {
    fetchModelConfig();
  }, []);

  const fetchModelConfig = async () => {
    try {
      // TODO: 实际项目中从后端API获取配置
      // const response = await fetch('http://localhost:8000/api/v1/config/models');
      // if (response.ok) {
      //   const data = await response.json();
      //   setModelConfig(data);
      //   form.setFieldsValue(data);
      // }

      // 模拟数据 - 从本地存储获取
      const savedConfig = localStorage.getItem('modelConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setModelConfig(config);
        form.setFieldsValue(config);
      } else {
        form.setFieldsValue(modelConfig);
      }
    } catch (error) {
      console.error('Failed to fetch model config:', error);
      message.error('获取模型配置失败');
    }
  };

  const handleSave = async (values: ModelConfig) => {
    setLoading(true);
    try {
      // TODO: 实际项目中发送到后端API
      // const response = await fetch('http://localhost:8000/api/v1/config/models', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values)
      // });

      // 模拟保存 - 保存到本地存储
      localStorage.setItem('modelConfig', JSON.stringify(values));
      await new Promise(resolve => setTimeout(resolve, 1000));

      setModelConfig(values);
      message.success('模型配置保存成功');
    } catch (error) {
      console.error('Failed to save config:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      // TODO: 实际项目中测试API连接
      // const response = await fetch('http://localhost:8000/api/v1/config/test-connection', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form.getFieldsValue())
      // });

      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('API连接测试成功');
    } catch (error) {
      console.error('Connection test failed:', error);
      message.error('连接测试失败');
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = () => {
    const defaultConfig = {
      openai_api_key: '',
      openai_base_url: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      max_tokens: 2000,
      temperature: 0.7
    };
    form.setFieldsValue(defaultConfig);
    message.info('配置已重置为默认值');
  };

  const availableModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku'
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">模型配置</h1>
        <p className="text-gray-600 mt-1">配置AI模型参数，这些设置将在创建智能体时被引用</p>
      </div>

      {/* 模型配置 */}
      <Card title="AI 模型配置" className="shadow-sm">
        <Alert
          message="配置说明"
          description="请配置您的AI模型信息。这些配置将作为默认设置，在创建智能体时可以直接引用。确保API Key有效且具有足够的使用额度。"
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
                rules={[{ required: true, message: '请输入 API Key' }]}
                extra="支持 OpenAI、Claude 等模型的 API Key"
              >
                <Password
                  placeholder="sk-... 或 claude-..."
                  prefix={<KeyOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="openai_base_url"
                label="API Base URL"
                rules={[{ required: true, message: '请输入 API Base URL' }]}
                extra="API服务的基础URL地址"
              >
                <Input placeholder="https://api.openai.com/v1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="model"
                label="默认模型"
                rules={[{ required: true, message: '请选择模型' }]}
                extra="创建智能体时的默认模型"
              >
                <Select placeholder="选择模型">
                  {availableModels.map(model => (
                    <Option key={model} value={model}>{model}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="max_tokens"
                label="最大 Tokens"
                rules={[
                  { required: true, message: '请输入最大 tokens' },
                  { type: 'number', min: 1, max: 32000, message: '请输入 1-32000 之间的数字' }
                ]}
                extra="单次请求的最大token数量"
              >
                <Input type="number" placeholder="2000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="temperature"
                label="Temperature"
                rules={[
                  { required: true, message: '请输入 temperature' },
                  { type: 'number', min: 0, max: 2, message: '请输入 0-2 之间的数字' }
                ]}
                extra="控制输出的随机性，0-2之间"
              >
                <Input type="number" step="0.1" min="0" max="2" placeholder="0.7" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex gap-4 pt-4">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<CheckCircleOutlined />}
            >
              保存配置
            </Button>
            <Button
              onClick={testConnection}
              loading={loading}
              icon={<ExperimentOutlined />}
            >
              测试连接
            </Button>
            <Button
              onClick={resetConfig}
              type="default"
            >
              重置为默认
            </Button>
          </div>
        </Form>
      </Card>

      {/* 配置预览 */}
      <Card title="当前配置预览" className="shadow-sm">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">模型:</span>
              <span className="ml-2 text-gray-900">{modelConfig.model}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">最大Tokens:</span>
              <span className="ml-2 text-gray-900">{modelConfig.max_tokens}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Temperature:</span>
              <span className="ml-2 text-gray-900">{modelConfig.temperature}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">API状态:</span>
              <span className="ml-2 text-green-600">
                {modelConfig.openai_api_key ? '已配置' : '未配置'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}