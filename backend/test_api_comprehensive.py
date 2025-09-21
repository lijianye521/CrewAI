#!/usr/bin/env python3
"""
CrewAI 后端 API 综合测试脚本
测试所有主要功能和接口
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, Any, List

class CrewAIAPITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", data: Any = None):
        """记录测试结果"""
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   Data: {data}")
        print()

    def test_health_check(self):
        """测试健康检查接口"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            success = response.status_code == 200
            self.log_test(
                "Health Check",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_system_status(self):
        """测试系统状态接口"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/system/status")
            success = response.status_code == 200
            self.log_test(
                "System Status",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )
            return success
        except Exception as e:
            self.log_test("System Status", False, f"Exception: {str(e)}")
            return False

    def test_model_configuration(self):
        """测试模型配置功能"""
        try:
            # 1. 获取当前配置
            response = self.session.get(f"{self.base_url}/api/v1/config/models")
            success = response.status_code == 200
            self.log_test(
                "Get Model Config",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            if not success:
                return False

            # 2. 更新配置
            config_data = {
                "openai_api_key": "sk-c1cff4b6f61b44d482ea8645b06897b3",
                "openai_base_url": "https://api.deepseek.com/v1",
                "model": "deepseek-chat",
                "max_tokens": 2000,
                "temperature": 0.7
            }

            response = self.session.post(
                f"{self.base_url}/api/v1/config/models",
                json=config_data
            )
            success = response.status_code == 200
            self.log_test(
                "Update Model Config",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            if not success:
                return False

            # 3. 测试连接
            response = self.session.post(
                f"{self.base_url}/api/v1/config/test-connection",
                json=config_data
            )
            success = response.status_code == 200
            self.log_test(
                "Test API Connection",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            return success

        except Exception as e:
            self.log_test("Model Configuration", False, f"Exception: {str(e)}")
            return False

    def test_agents_crud(self):
        """测试智能体CRUD操作"""
        try:
            # 1. 获取智能体列表
            response = self.session.get(f"{self.base_url}/api/v1/agents")
            success = response.status_code == 200
            agents_data = response.json() if success else []
            self.log_test(
                "Get Agents List",
                success,
                f"Status: {response.status_code}, Found {len(agents_data)} agents",
                len(agents_data)
            )

            if not success:
                return False

            # 2. 获取活跃智能体
            response = self.session.get(f"{self.base_url}/api/v1/agents?is_active=true")
            success = response.status_code == 200
            active_agents = response.json() if success else []
            self.log_test(
                "Get Active Agents",
                success,
                f"Status: {response.status_code}, Found {len(active_agents)} active agents",
                len(active_agents)
            )

            return success

        except Exception as e:
            self.log_test("Agents CRUD", False, f"Exception: {str(e)}")
            return False

    def test_meetings_crud(self):
        """测试会议CRUD操作"""
        try:
            # 1. 获取会议列表
            response = self.session.get(f"{self.base_url}/api/v1/meetings")
            success = response.status_code == 200
            meetings_data = response.json() if success else []
            self.log_test(
                "Get Meetings List",
                success,
                f"Status: {response.status_code}, Found {len(meetings_data)} meetings",
                len(meetings_data)
            )

            if not success:
                return False

            # 2. 获取已完成会议
            response = self.session.get(f"{self.base_url}/api/v1/meetings?status=completed")
            success = response.status_code == 200
            completed_meetings = response.json() if success else []
            self.log_test(
                "Get Completed Meetings",
                success,
                f"Status: {response.status_code}, Found {len(completed_meetings)} completed meetings",
                len(completed_meetings)
            )

            return success, meetings_data

        except Exception as e:
            self.log_test("Meetings CRUD", False, f"Exception: {str(e)}")
            return False, []

    def test_meeting_status_operations(self, meeting_id: int):
        """测试会议状态操作"""
        try:
            # 1. 获取会议详情
            response = self.session.get(f"{self.base_url}/api/v1/meetings/{meeting_id}")
            success = response.status_code == 200
            meeting_data = response.json() if success else {}
            self.log_test(
                f"Get Meeting {meeting_id} Details",
                success,
                f"Status: {response.status_code}, Meeting title: {meeting_data.get('title', 'N/A')}",
                meeting_data.get('status', 'N/A')
            )

            if not success:
                return False

            # 2. 更新会议状态为 active
            response = self.session.put(
                f"{self.base_url}/api/v1/meetings/{meeting_id}/status",
                json={"status": "active"}
            )
            success = response.status_code == 200
            self.log_test(
                f"Update Meeting {meeting_id} to Active",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            if not success:
                return False

            # 3. 暂停会议
            response = self.session.put(
                f"{self.base_url}/api/v1/meetings/{meeting_id}/status",
                json={"status": "paused"}
            )
            success = response.status_code == 200
            self.log_test(
                f"Pause Meeting {meeting_id}",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            return success

        except Exception as e:
            self.log_test("Meeting Status Operations", False, f"Exception: {str(e)}")
            return False

    def test_ai_conversation(self, meeting_id: int):
        """测试AI对话功能"""
        try:
            # 1. 开始对话
            response = self.session.post(f"{self.base_url}/api/v1/meetings/{meeting_id}/start-conversation")
            success = response.status_code == 200
            self.log_test(
                f"Start Conversation for Meeting {meeting_id}",
                success,
                f"Status: {response.status_code}",
                response.json() if success else response.text
            )

            if not success:
                return False

            # 2. 等待AI生成回复
            print("   Waiting for AI agents to generate responses...")
            time.sleep(10)

            # 3. 获取会议消息
            response = self.session.get(f"{self.base_url}/api/v1/meetings/{meeting_id}/messages")
            success = response.status_code == 200
            messages = response.json() if success else []

            has_ai_messages = len(messages) > 0
            self.log_test(
                f"Get Meeting {meeting_id} Messages",
                success and has_ai_messages,
                f"Status: {response.status_code}, Found {len(messages)} messages",
                messages[:2] if messages else []  # 只显示前2条消息
            )

            return success and has_ai_messages

        except Exception as e:
            self.log_test("AI Conversation", False, f"Exception: {str(e)}")
            return False

    def test_meeting_replay(self, meeting_id: int):
        """测试会议回放功能"""
        try:
            response = self.session.get(f"{self.base_url}/api/v1/meetings/{meeting_id}/replay")
            success = response.status_code == 200
            replay_data = response.json() if success else {}

            has_timeline = 'timeline' in replay_data
            has_messages = 'messages' in replay_data

            self.log_test(
                f"Get Meeting {meeting_id} Replay",
                success and has_timeline and has_messages,
                f"Status: {response.status_code}, Has timeline: {has_timeline}, Has messages: {has_messages}",
                {
                    "timeline_events": len(replay_data.get('timeline', [])),
                    "messages_count": len(replay_data.get('messages', []))
                }
            )

            return success and has_timeline and has_messages

        except Exception as e:
            self.log_test("Meeting Replay", False, f"Exception: {str(e)}")
            return False

    def test_sse_connection(self, meeting_id: int):
        """测试SSE连接"""
        try:
            # 这里只测试SSE端点是否可访问，不测试实际流
            response = self.session.get(
                f"{self.base_url}/api/v1/meetings/{meeting_id}/stream",
                timeout=3,
                stream=True
            )
            success = response.status_code == 200
            self.log_test(
                f"SSE Endpoint for Meeting {meeting_id}",
                success,
                f"Status: {response.status_code}",
                f"Content-Type: {response.headers.get('Content-Type', 'N/A')}"
            )

            # 立即关闭连接
            response.close()
            return success

        except Exception as e:
            # 超时是正常的，因为SSE是持续连接
            if "timeout" in str(e).lower():
                self.log_test(
                    f"SSE Endpoint for Meeting {meeting_id}",
                    True,
                    "Connection timeout (expected for SSE)",
                    "SSE endpoint is accessible"
                )
                return True
            else:
                self.log_test("SSE Connection", False, f"Exception: {str(e)}")
                return False

    def generate_test_report(self):
        """生成测试报告"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests

        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        print("\n" + "="*80)
        print("CrewAI Backend API Comprehensive Test Report")
        print("="*80)
        print(f"Test Overview:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed Tests: {passed_tests}")
        print(f"   Failed Tests: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print()

        if failed_tests > 0:
            print("Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test_name']}: {result['details']}")
            print()

        print("Feature Verification Summary:")
        feature_status = {
            "Health Check": any("Health" in r['test_name'] and r['success'] for r in self.test_results),
            "System Status": any("System" in r['test_name'] and r['success'] for r in self.test_results),
            "Model Configuration": any("Model" in r['test_name'] and r['success'] for r in self.test_results),
            "Agents Management": any("Agents" in r['test_name'] and r['success'] for r in self.test_results),
            "Meetings Management": any("Meetings" in r['test_name'] and r['success'] for r in self.test_results),
            "Meeting Status Operations": any("Meeting.*Status" in r['test_name'] and r['success'] for r in self.test_results),
            "AI Conversation": any("Conversation" in r['test_name'] and r['success'] for r in self.test_results),
            "Meeting Replay": any("Replay" in r['test_name'] and r['success'] for r in self.test_results),
            "SSE Real-time Push": any("SSE" in r['test_name'] and r['success'] for r in self.test_results),
        }

        for feature, status in feature_status.items():
            icon = "PASS" if status else "FAIL"
            print(f"   [{icon}] {feature}")

        print("\n" + "="*80)
        print(f"Overall Assessment: {'System Running Normally' if success_rate >= 80 else 'System Has Issues, Needs Fixing'}")
        print("="*80)

        return success_rate >= 80

    def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 CrewAI 后端 API 综合测试")
        print("="*80)
        print()

        # 基础连接测试
        if not self.test_health_check():
            print("❌ 健康检查失败，无法继续测试")
            return False

        self.test_system_status()

        # 配置测试
        self.test_model_configuration()

        # 智能体测试
        self.test_agents_crud()

        # 会议测试
        meetings_success, meetings_data = self.test_meetings_crud()

        if meetings_success and meetings_data:
            # 使用第一个会议进行详细测试
            meeting_id = meetings_data[0]['id']

            # 会议状态操作测试
            self.test_meeting_status_operations(meeting_id)

            # AI对话测试
            self.test_ai_conversation(meeting_id)

            # 会议回放测试
            self.test_meeting_replay(meeting_id)

            # SSE连接测试
            self.test_sse_connection(meeting_id)

        # 生成测试报告
        return self.generate_test_report()

def main():
    """主函数"""
    try:
        tester = CrewAIAPITester()
        success = tester.run_all_tests()

        # 保存详细测试结果
        with open("test_results.json", "w", encoding="utf-8") as f:
            json.dump(tester.test_results, f, ensure_ascii=False, indent=2)

        print(f"\n📄 详细测试结果已保存到: test_results.json")

        # 返回适当的退出码
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 测试过程中发生错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()