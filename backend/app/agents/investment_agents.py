from crewai import Agent, Task, Crew

class InvestmentAnalysisAgents:
    """
    Investment analysis agents using CrewAI framework
    """
    
    def __init__(self):
        self.fundamental_analyst = self._create_fundamental_analyst()
        self.technical_analyst = self._create_technical_analyst()
        self.risk_analyst = self._create_risk_analyst()
        self.sentiment_analyst = self._create_sentiment_analyst()
        self.decision_coordinator = self._create_decision_coordinator()

    def _create_fundamental_analyst(self):
        return Agent(
            role='基本面分析师',
            goal='分析{company}的财务状况和投资价值',
            backstory='''你是一位拥有15年投资经验的资深基本面分析师。
            你擅长财务报表分析、估值建模和行业研究。
            你总是基于数据做出客观、专业的判断。''',
            verbose=True,
            allow_delegation=False
        )
    
    def _create_technical_analyst(self):
        return Agent(
            role='技术分析师',
            goal='分析{company}的价格走势和技术指标',
            backstory='''你是一位专业的技术分析师，拥有10年的图表分析经验。
            你精通各种技术指标、K线形态和趋势分析。
            你专注于识别最佳的买入和卖出时机。''',
            verbose=True,
            allow_delegation=False
        )
    
    def _create_risk_analyst(self):
        return Agent(
            role='风险控制分析师',
            goal='评估{company}的投资风险并提供风控建议',
            backstory='''你是一位经验丰富的风险管理专家。
            你专注于识别投资风险、制定风险控制策略。
            你始终把资本保护放在首位。''',
            verbose=True,
            allow_delegation=False
        )
    
    def _create_sentiment_analyst(self):
        return Agent(
            role='市场情绪分析师',
            goal='分析{company}相关的市场情绪和新闻舆情',
            backstory='''你是一位市场情绪分析专家。
            你擅长分析新闻、社交媒体和市场情绪对股价的影响。
            你能够准确捕捉市场心理变化。''',
            verbose=True,
            allow_delegation=False
        )
    
    def _create_decision_coordinator(self):
        return Agent(
            role='投资决策协调者',
            goal='综合各方分析意见，形成最终投资建议',
            backstory='''你是一位经验丰富的投资组合经理。
            你擅长综合不同维度的分析，做出平衡的投资决策。
            你重视风险控制，追求长期稳定回报。''',
            verbose=True,
            allow_delegation=True
        )

    def create_analysis_tasks(self, stock_symbol: str):
        """
        Create analysis tasks for the given stock symbol
        """
        tasks = []
        
        # Fundamental analysis task
        fundamental_task = Task(
            description=f'''对{stock_symbol}进行全面的基本面分析，包括：
            1. 分析最近3年的财务指标变化趋势
            2. 计算各种估值指标（PE、PB、PEG等）
            3. 评估公司在行业中的竞争地位
            4. 识别财务风险和增长驱动因素
            请提供详细的分析报告和投资评级。''',
            agent=self.fundamental_analyst,
            expected_output='包含财务指标、估值结果和投资建议的详细报告'
        )
        tasks.append(fundamental_task)
        
        # Technical analysis task
        technical_task = Task(
            description=f'''对{stock_symbol}进行技术分析，包括：
            1. 分析当前价格趋势和关键技术位
            2. 计算主要技术指标（MA、MACD、RSI、KDJ等）
            3. 识别支撑阻力位和交易信号
            4. 判断短期和中期的价格走势
            请提供技术分析报告和交易建议。''',
            agent=self.technical_analyst,
            expected_output='包含技术指标、价格目标和交易时机的分析报告'
        )
        tasks.append(technical_task)
        
        # Risk analysis task
        risk_task = Task(
            description=f'''对{stock_symbol}进行风险评估，包括：
            1. 识别主要投资风险点
            2. 评估风险等级和影响程度
            3. 制定风险控制策略
            4. 提供仓位管理建议
            请提供风险评估报告。''',
            agent=self.risk_analyst,
            expected_output='包含风险识别、评级和控制策略的风险报告'
        )
        tasks.append(risk_task)
        
        # Sentiment analysis task
        sentiment_task = Task(
            description=f'''分析{stock_symbol}的市场情绪，包括：
            1. 收集和分析相关新闻和公告
            2. 评估市场情绪和投资者态度
            3. 识别可能影响股价的事件
            4. 预测情绪变化对价格的影响
            请提供市场情绪分析报告。''',
            agent=self.sentiment_analyst,
            expected_output='包含新闻分析、情绪评估和影响预测的情绪报告'
        )
        tasks.append(sentiment_task)
        
        # Final decision task
        decision_task = Task(
            description=f'''基于所有分析师的报告，对{stock_symbol}做出最终投资决策：
            1. 综合基本面、技术面、风险和情绪分析
            2. 权衡各种因素的重要性
            3. 形成明确的投资建议（买入/持有/卖出）
            4. 设定目标价格和止损位
            5. 提供投资逻辑和依据
            请提供最终的投资决策报告。''',
            agent=self.decision_coordinator,
            expected_output='包含综合评级、目标价格和详细投资逻辑的决策报告'
        )
        tasks.append(decision_task)
        
        return tasks

    def create_crew(self, stock_symbol: str):
        """
        Create a crew for investment analysis
        """
        tasks = self.create_analysis_tasks(stock_symbol)
        
        crew = Crew(
            agents=[
                self.fundamental_analyst,
                self.technical_analyst, 
                self.risk_analyst,
                self.sentiment_analyst,
                self.decision_coordinator
            ],
            tasks=tasks,
            verbose=True
        )
        
        return crew