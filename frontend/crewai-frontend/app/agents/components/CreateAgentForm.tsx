'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Save,
  Brain,
  MessageSquare,
  User,
  Target,
  Plus,
  X,
  Check
} from 'lucide-react';

interface AgentData {
  id?: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  personality_traits?: {
    personality_type: string;
    decision_making: string;
    communication_style: string;
  };
  speaking_style?: {
    tone: string;
    sentence_length: string;
  };
  behavior_settings?: {
    speaking_frequency: string;
    initiative_level: string;
    detail_preference: string;
  };
  expertise_areas: string[];
}

interface CreateAgentFormProps {
  onSuccess?: () => void;
  initialData?: AgentData;
  isEdit?: boolean;
}

export default function CreateAgentForm({ onSuccess, initialData, isEdit = false }: CreateAgentFormProps) {
  const [agentData, setAgentData] = useState({
    name: '',
    role: '',
    goal: '',
    backstory: '',
    personality_type: '',
    communication_style: '',
    tone: '',
    expertise_areas: [] as string[],
    speaking_frequency: '',
    initiative_level: '',
    detail_preference: '',
    decision_making: '',
    sentence_length: ''
  });

  const [currentExpertise, setCurrentExpertise] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (initialData && isEdit) {
      setAgentData({
        name: initialData.name || '',
        role: initialData.role || '',
        goal: initialData.goal || '',
        backstory: initialData.backstory || '',
        personality_type: initialData.personality_traits?.personality_type || '',
        communication_style: initialData.personality_traits?.communication_style || '',
        tone: initialData.speaking_style?.tone || '',
        expertise_areas: initialData.expertise_areas || [],
        speaking_frequency: initialData.behavior_settings?.speaking_frequency || '',
        initiative_level: initialData.behavior_settings?.initiative_level || '',
        detail_preference: initialData.behavior_settings?.detail_preference || '',
        decision_making: initialData.personality_traits?.decision_making || '',
        sentence_length: initialData.speaking_style?.sentence_length || ''
      });
    }
  }, [initialData, isEdit]);

  const personalityTypes = [
    '理性分析型', '创新开放型', '协作管理型', '技术专业型', '决策执行型'
  ];

  const communicationStyles = [
    '直接明确', '友好温和', '专业严谨', '幽默轻松', '简洁高效'
  ];

  const toneOptions = [
    '正式专业', '友善亲切', '权威可信', '创新活跃', '稳重可靠'
  ];

  const decisionMakingStyles = [
    '数据驱动', '经验导向', '创新探索', '平衡决策'
  ];

  const sentenceLengthOptions = [
    '简洁有力', '中等长度', '详细准确'
  ];

  const addExpertise = () => {
    if (currentExpertise.trim() && !agentData.expertise_areas.includes(currentExpertise.trim())) {
      setAgentData({
        ...agentData,
        expertise_areas: [...agentData.expertise_areas, currentExpertise.trim()]
      });
      setCurrentExpertise('');
    }
  };

  const removeExpertise = (expertise: string) => {
    setAgentData({
      ...agentData,
      expertise_areas: agentData.expertise_areas.filter(e => e !== expertise)
    });
  };

  const validateForm = () => {
    const errors = [];
    if (!agentData.name.trim()) errors.push('智能体名称不能为空');
    if (!agentData.role.trim()) errors.push('角色定位不能为空');
    if (!agentData.goal.trim()) errors.push('目标使命不能为空');
    if (!agentData.backstory.trim()) errors.push('背景故事不能为空');
    if (!agentData.personality_type) errors.push('请选择个性类型');
    if (!agentData.communication_style) errors.push('请选择沟通风格');
    if (agentData.expertise_areas.length === 0) errors.push('至少添加一个专业领域');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedData = {
        name: agentData.name,
        role: agentData.role,
        goal: agentData.goal,
        backstory: agentData.backstory,
        personality_traits: {
          personality_type: agentData.personality_type,
          decision_making: agentData.decision_making,
          communication_style: agentData.communication_style
        },
        speaking_style: {
          tone: agentData.tone,
          sentence_length: agentData.sentence_length,
          vocabulary_level: '适中',
          emotional_expression: '适中'
        },
        behavior_settings: {
          speaking_frequency: agentData.speaking_frequency,
          initiative_level: agentData.initiative_level,
          detail_preference: agentData.detail_preference
        },
        expertise_areas: agentData.expertise_areas,
        is_active: true
      };

      const url = isEdit && initialData ? `http://localhost:8000/api/v1/agents/${initialData.id}` : 'http://localhost:8000/api/v1/agents';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (response.ok) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || '操作失败');
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(`${isEdit ? '更新' : '创建'}失败: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <X className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-red-800 font-medium">请完善以下信息：</h4>
                    <ul className="mt-1 text-sm text-red-700">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Information */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <User className="w-5 h-5 text-purple-600" />
                <span>基础信息</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                设置智能体的基本身份和角色信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  智能体名称 *
                </label>
                <Input
                  placeholder="例如：分析师Alex"
                  value={agentData.name}
                  onChange={(e) => setAgentData({...agentData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色定位 *
                </label>
                <Input
                  placeholder="例如：高级数据分析师"
                  value={agentData.role}
                  onChange={(e) => setAgentData({...agentData, role: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标使命 *
                </label>
                <Textarea
                  placeholder="描述这个智能体的主要目标和使命..."
                  value={agentData.goal}
                  onChange={(e) => setAgentData({...agentData, goal: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景故事 *
                </label>
                <Textarea
                  placeholder="描述智能体的背景经历和专业经验..."
                  value={agentData.backstory}
                  onChange={(e) => setAgentData({...agentData, backstory: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personality & Style */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Brain className="w-5 h-5 text-purple-600" />
                <span>个性特征</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                配置智能体的个性类型和行为特征
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  个性类型 *
                </label>
                <div className="flex flex-wrap gap-2">
                  {personalityTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setAgentData({...agentData, personality_type: type})}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        agentData.personality_type === type
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  沟通风格 *
                </label>
                <div className="flex flex-wrap gap-2">
                  {communicationStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setAgentData({...agentData, communication_style: style})}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        agentData.communication_style === style
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  决策风格
                </label>
                <div className="flex flex-wrap gap-2">
                  {decisionMakingStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() => setAgentData({...agentData, decision_making: style})}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        agentData.decision_making === style
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Speaking Style */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span>说话风格</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                定制智能体的语言表达方式和风格
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  语调风格
                </label>
                <div className="flex flex-wrap gap-2">
                  {toneOptions.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setAgentData({...agentData, tone: tone})}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        agentData.tone === tone
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  句子长度偏好
                </label>
                <div className="flex flex-wrap gap-2">
                  {sentenceLengthOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setAgentData({...agentData, sentence_length: option})}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        agentData.sentence_length === option
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发言频率
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    value={agentData.speaking_frequency}
                    onChange={(e) => setAgentData({...agentData, speaking_frequency: e.target.value})}
                  >
                    <option value="">选择发言频率</option>
                    <option value="high">高频 - 经常发言</option>
                    <option value="medium">中频 - 适度发言</option>
                    <option value="low">低频 - 谨慎发言</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主动性水平
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    value={agentData.initiative_level}
                    onChange={(e) => setAgentData({...agentData, initiative_level: e.target.value})}
                  >
                    <option value="">选择主动性水平</option>
                    <option value="proactive">主动积极</option>
                    <option value="moderate">适度主动</option>
                    <option value="reactive">被动响应</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    详细偏好
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    value={agentData.detail_preference}
                    onChange={(e) => setAgentData({...agentData, detail_preference: e.target.value})}
                  >
                    <option value="">选择详细偏好</option>
                    <option value="comprehensive">全面详细</option>
                    <option value="balanced">平衡适中</option>
                    <option value="creative">创意简洁</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expertise Areas */}
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Target className="w-5 h-5 text-purple-600" />
                <span>专业领域</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                定义智能体的专业技能和知识领域 (至少添加一个)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="输入专业领域，如：数据分析、市场研究..."
                  value={currentExpertise}
                  onChange={(e) => setCurrentExpertise(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                />
                <Button
                  onClick={addExpertise}
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {agentData.expertise_areas.map((expertise) => (
                  <Badge
                    key={expertise}
                    className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer flex items-center gap-1"
                    onClick={() => removeExpertise(expertise)}
                  >
                    {expertise}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Bot className="w-5 h-5 text-purple-600" />
                <span>智能体预览</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                实时预览您配置的智能体
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {agentData.name || '智能体名称'}
                </h3>
                <p className="text-sm text-gray-500">
                  {agentData.role || '角色定位'}
                </p>
                {agentData.goal && (
                  <p className="text-xs text-gray-400 mt-1 px-2">
                    {agentData.goal.length > 60 ? agentData.goal.substring(0, 60) + '...' : agentData.goal}
                  </p>
                )}
              </div>

              {agentData.personality_type && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">个性类型</div>
                  <div className="text-sm text-gray-600">{agentData.personality_type}</div>
                </div>
              )}

              {agentData.communication_style && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">沟通风格</div>
                  <div className="text-sm text-gray-600">{agentData.communication_style}</div>
                </div>
              )}

              {agentData.expertise_areas.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">专业领域</div>
                  <div className="flex flex-wrap gap-1">
                    {agentData.expertise_areas.slice(0, 3).map((expertise) => (
                      <Badge key={expertise} className="bg-purple-100 text-purple-800 text-xs">
                        {expertise}
                      </Badge>
                    ))}
                    {agentData.expertise_areas.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">
                        +{agentData.expertise_areas.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={handleSave}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSubmitting || !agentData.name || !agentData.role || !agentData.goal}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEdit ? '更新中...' : '创建中...'}
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? '更新智能体' : '创建智能体'}
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              <Check className="w-3 h-3 inline mr-1" />
              所有配置在当前页面完成
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}