'use client';

import React, { useState } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Save, 
  ArrowLeft, 
  Settings,
  Brain,
  MessageSquare,
  User,
  Target
} from 'lucide-react';

export default function CreateAgentPage() {
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
    initiative_level: ''
  });

  const [currentExpertise, setCurrentExpertise] = useState('');

  const personalityTypes = [
    '理性分析型', '创新开放型', '协作管理型', '技术专业型', '决策执行型'
  ];

  const communicationStyles = [
    '直接明确', '友好温和', '专业严谨', '幽默轻松', '简洁高效'
  ];

  const toneOptions = [
    '正式专业', '友善亲切', '权威可信', '创新活跃', '稳重可靠'
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

  const handleSave = async () => {
    try {
      // API call to save agent
      console.log('Saving agent:', agentData);
      alert('智能体创建成功！');
      window.location.href = '/agents';
    } catch (error) {
      console.error('Error saving agent:', error);
      alert('创建失败，请重试');
    }
  };

  return (
    <MainLayout title="创建智能体" subtitle="配置新的AI智能体，定制个性化协作伙伴">
      <div className="space-y-6">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/agents'}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回智能体列表
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>基础信息</span>
                </CardTitle>
                <CardDescription>
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
                    背景故事
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
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>个性特征</span>
                </CardTitle>
                <CardDescription>
                  配置智能体的个性类型和行为特征
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    个性类型
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {personalityTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setAgentData({...agentData, personality_type: type})}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          agentData.personality_type === type
                            ? 'bg-gray-900 text-white'
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
                    沟通风格
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {communicationStyles.map((style) => (
                      <button
                        key={style}
                        onClick={() => setAgentData({...agentData, communication_style: style})}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          agentData.communication_style === style
                            ? 'bg-gray-900 text-white'
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
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>说话风格</span>
                </CardTitle>
                <CardDescription>
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
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发言频率
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      value={agentData.speaking_frequency}
                      onChange={(e) => setAgentData({...agentData, speaking_frequency: e.target.value})}
                    >
                      <option value="">选择发言频率</option>
                      <option value="高频">高频 - 经常发言</option>
                      <option value="中频">中频 - 适度发言</option>
                      <option value="低频">低频 - 谨慎发言</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主动性水平
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      value={agentData.initiative_level}
                      onChange={(e) => setAgentData({...agentData, initiative_level: e.target.value})}
                    >
                      <option value="">选择主动性水平</option>
                      <option value="主动积极">主动积极</option>
                      <option value="适度主动">适度主动</option>
                      <option value="被动响应">被动响应</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expertise Areas */}
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>专业领域</span>
                </CardTitle>
                <CardDescription>
                  定义智能体的专业技能和知识领域
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
                  <Button onClick={addExpertise} variant="outline">
                    添加
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {agentData.expertise_areas.map((expertise) => (
                    <Badge 
                      key={expertise} 
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                      onClick={() => removeExpertise(expertise)}
                    >
                      {expertise} ×
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
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <span>智能体预览</span>
                </CardTitle>
                <CardDescription>
                  实时预览您配置的智能体
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bot className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {agentData.name || '智能体名称'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {agentData.role || '角色定位'}
                  </p>
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
                        <Badge key={expertise} className="bg-blue-100 text-blue-800 text-xs">
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
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                disabled={!agentData.name || !agentData.role || !agentData.goal}
              >
                <Save className="w-4 h-4 mr-2" />
                创建智能体
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/agents/templates'}
              >
                <Settings className="w-4 h-4 mr-2" />
                保存为模板
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}