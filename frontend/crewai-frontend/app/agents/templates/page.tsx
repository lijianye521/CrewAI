'use client';

import React, { useState } from 'react';
import MainLayout from '@/app/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Search,
  Star,
  Download,
  Plus,
  Users,
  Brain,
  MessageSquare,
  Target,
  ArrowLeft
} from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  personality_type: string;
  communication_style: string;
  expertise_areas: string[];
  use_count: number;
  rating: number;
  category: string;
  created_by: string;
  is_official: boolean;
}

export default function AgentTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [templates] = useState<AgentTemplate[]>([
    {
      id: 'template_1',
      name: '数据分析师Alex',
      role: '高级数据分析师',
      description: '专业的数据分析师，擅长从复杂数据中提取有价值的商业洞察，具有强大的统计分析能力和数据可视化技能。',
      personality_type: '理性分析型',
      communication_style: '专业严谨',
      expertise_areas: ['数据分析', '统计学', 'Python', 'SQL', '商业智能'],
      use_count: 142,
      rating: 4.8,
      category: '技术专家',
      created_by: '官方',
      is_official: true
    },
    {
      id: 'template_2',
      name: '产品经理Sophie',
      role: '高级产品经理',
      description: '经验丰富的产品经理，具备敏锐的市场洞察力和用户需求分析能力，善于推动跨部门协作。',
      personality_type: '协作管理型',
      communication_style: '友好温和',
      expertise_areas: ['产品规划', '用户研究', '项目管理', '市场分析', '敏捷开发'],
      use_count: 98,
      rating: 4.7,
      category: '业务管理',
      created_by: '官方',
      is_official: true
    },
    {
      id: 'template_3',
      name: '技术架构师Mike',
      role: '首席技术架构师',
      description: '资深技术架构师，在系统设计和技术选型方面有深厚造诣，关注性能优化和可扩展性。',
      personality_type: '技术专业型',
      communication_style: '直接明确',
      expertise_areas: ['系统架构', '微服务', '云计算', '性能优化', '技术选型'],
      use_count: 76,
      rating: 4.9,
      category: '技术专家',
      created_by: '官方',
      is_official: true
    },
    {
      id: 'template_4',
      name: '营销专家Emma',
      role: '数字营销总监',
      description: '创意十足的营销专家，在品牌推广和数字营销领域有丰富经验，善于制定创新的营销策略。',
      personality_type: '创新开放型',
      communication_style: '幽默轻松',
      expertise_areas: ['数字营销', '品牌策略', '内容营销', '社交媒体', '用户增长'],
      use_count: 89,
      rating: 4.6,
      category: '营销创意',
      created_by: '官方',
      is_official: true
    },
    {
      id: 'template_5',
      name: '财务分析师David',
      role: '高级财务分析师',
      description: '精通财务建模和投资分析的专家，能够提供准确的财务预测和投资建议。',
      personality_type: '理性分析型',
      communication_style: '正式专业',
      expertise_areas: ['财务分析', '投资评估', '风险管理', '财务建模', '预算规划'],
      use_count: 63,
      rating: 4.5,
      category: '财务金融',
      created_by: '官方',
      is_official: true
    },
    {
      id: 'template_6',
      name: '用户体验设计师Lily',
      role: 'UX设计总监',
      description: '富有创意的UX设计师，专注于用户体验优化和界面设计，追求完美的用户交互体验。',
      personality_type: '创新开放型',
      communication_style: '友善亲切',
      expertise_areas: ['UX设计', 'UI设计', '用户研究', '原型设计', '可用性测试'],
      use_count: 54,
      rating: 4.7,
      category: '设计创意',
      created_by: '官方',
      is_official: true
    }
  ]);

  const categories = [
    { key: 'all', label: '全部模板', icon: <Bot className="w-4 h-4" /> },
    { key: '技术专家', label: '技术专家', icon: <Brain className="w-4 h-4" /> },
    { key: '业务管理', label: '业务管理', icon: <Users className="w-4 h-4" /> },
    { key: '营销创意', label: '营销创意', icon: <MessageSquare className="w-4 h-4" /> },
    { key: '财务金融', label: '财务金融', icon: <Target className="w-4 h-4" /> },
    { key: '设计创意', label: '设计创意', icon: <Star className="w-4 h-4" /> }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: AgentTemplate) => {
    // 将模板数据传递给创建页面
    const templateData = encodeURIComponent(JSON.stringify({
      name: template.name,
      role: template.role,
      goal: `作为${template.role}，${template.description}`,
      backstory: template.description,
      personality_type: template.personality_type,
      communication_style: template.communication_style,
      expertise_areas: template.expertise_areas
    }));

    window.location.href = `/agents/create?template=${templateData}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <MainLayout title="Agent模板库" subtitle="选择预设的Agent模板，快速创建专业的AI智能体">
      <div className="space-y-6">
        {/* 返回按钮 */}
        <Button
          variant="outline"
          onClick={() => window.location.href = '/agents'}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回智能体列表
        </Button>

        {/* 搜索和过滤 */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="搜索模板名称、角色或描述..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.key}
                    variant={selectedCategory === category.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.key)}
                    className={selectedCategory === category.key ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    {category.icon}
                    <span className="ml-2">{category.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{templates.length}</div>
              <div className="text-sm text-gray-600">可用模板</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter(t => t.is_official).length}
              </div>
              <div className="text-sm text-gray-600">官方模板</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(templates.reduce((sum, t) => sum + t.rating, 0) / templates.length * 10) / 10}
              </div>
              <div className="text-sm text-gray-600">平均评分</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {templates.reduce((sum, t) => sum + t.use_count, 0)}
              </div>
              <div className="text-sm text-gray-600">总使用次数</div>
            </CardContent>
          </Card>
        </div>

        {/* 模板列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                      {template.role}
                    </CardDescription>
                  </div>
                  {template.is_official && (
                    <Badge className="bg-green-100 text-green-800">官方</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {template.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">个性类型:</span>
                    <Badge variant="outline" className="text-xs">
                      {template.personality_type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">沟通风格:</span>
                    <Badge variant="outline" className="text-xs">
                      {template.communication_style}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-2">专业领域:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.expertise_areas.slice(0, 3).map((area) => (
                      <Badge key={area} className="bg-blue-100 text-blue-800 text-xs">
                        {area}
                      </Badge>
                    ))}
                    {template.expertise_areas.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">
                        +{template.expertise_areas.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {renderStars(template.rating)}
                    </div>
                    <span className="text-sm text-gray-600">{template.rating}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Download className="w-3 h-3 inline mr-1" />
                    {template.use_count} 次使用
                  </div>
                </div>

                <Button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 空状态 */}
        {filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">未找到匹配的模板</h3>
              <p className="text-gray-600 mb-4">
                尝试调整搜索条件或选择不同的分类
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                清除筛选条件
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <style jsx global>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </MainLayout>
  );
}