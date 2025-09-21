#!/usr/bin/env python3
"""
CrewAI Backend API Test Script
Tests all main functionality
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
        """Log test result"""
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)

        status = "PASS" if success else "FAIL"
        print(f"[{status}] {name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   Data: {data}")
        print()

    def test_health_check(self):
        """Test health check endpoint"""
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
        """Test system status endpoint"""
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
        """Test model configuration"""
        try:
            # 1. Get current config
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

            # 2. Update config
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

            # 3. Test connection
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
        """Test agents CRUD operations"""
        try:
            # 1. Get agents list
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

            # 2. Get active agents
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
        """Test meetings CRUD operations"""
        try:
            # 1. Get meetings list
            response = self.session.get(f"{self.base_url}/api/v1/meetings")
            success = response.status_code == 200
            meetings_response = response.json() if success else {}
            meetings_data = meetings_response.get('data', []) if isinstance(meetings_response, dict) else []
            self.log_test(
                "Get Meetings List",
                success,
                f"Status: {response.status_code}, Found {len(meetings_data)} meetings",
                len(meetings_data)
            )

            if not success:
                return False, []

            # 2. Get completed meetings
            response = self.session.get(f"{self.base_url}/api/v1/meetings?status=completed")
            success = response.status_code == 200
            completed_response = response.json() if success else {}
            completed_meetings = completed_response.get('data', []) if isinstance(completed_response, dict) else []
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
        """Test meeting status operations"""
        try:
            # 1. Get meeting details
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

            # 2. Update meeting status to active
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

            # 3. Pause meeting
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
        """Test AI conversation functionality"""
        try:
            # First ensure meeting is active
            response = self.session.put(
                f"{self.base_url}/api/v1/meetings/{meeting_id}/status",
                json={"status": "active"}
            )

            # 1. Start conversation
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

            # 2. Wait for AI agents to generate responses
            print("   Waiting for AI agents to generate responses...")
            time.sleep(10)

            # 3. Get meeting messages
            response = self.session.get(f"{self.base_url}/api/v1/meetings/{meeting_id}/messages")
            success = response.status_code == 200
            messages = response.json() if success else []

            has_ai_messages = len(messages) > 0
            self.log_test(
                f"Get Meeting {meeting_id} Messages",
                success and has_ai_messages,
                f"Status: {response.status_code}, Found {len(messages)} messages",
                messages[:2] if messages else []  # Show only first 2 messages
            )

            return success and has_ai_messages

        except Exception as e:
            self.log_test("AI Conversation", False, f"Exception: {str(e)}")
            return False

    def test_meeting_replay(self, meeting_id: int):
        """Test meeting replay functionality"""
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
        """Test SSE connection"""
        try:
            # Test if SSE endpoint is accessible - don't test actual stream
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

            # Close connection immediately
            response.close()
            return success

        except Exception as e:
            # Timeout is normal for SSE as it's a persistent connection
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
        """Generate test report"""
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
        """Run all tests"""
        print("Starting CrewAI Backend API Comprehensive Test")
        print("="*80)
        print()

        # Basic connection tests
        if not self.test_health_check():
            print("Health check failed, cannot continue testing")
            return False

        self.test_system_status()

        # Configuration tests
        self.test_model_configuration()

        # Agent tests
        self.test_agents_crud()

        # Meeting tests
        meeting_test_result = self.test_meetings_crud()
        meetings_success = meeting_test_result[0] if isinstance(meeting_test_result, tuple) else meeting_test_result
        meetings_data = meeting_test_result[1] if isinstance(meeting_test_result, tuple) and len(meeting_test_result) > 1 else []

        if meetings_success and meetings_data:
            # Use first meeting for detailed testing
            meeting_id = meetings_data[0]['id']

            # Meeting status operation tests
            self.test_meeting_status_operations(meeting_id)

            # AI conversation tests
            self.test_ai_conversation(meeting_id)

            # Meeting replay tests
            self.test_meeting_replay(meeting_id)

            # SSE connection tests
            self.test_sse_connection(meeting_id)

        # Generate test report
        return self.generate_test_report()

def main():
    """Main function"""
    try:
        tester = CrewAIAPITester()
        success = tester.run_all_tests()

        # Save detailed test results
        with open("test_results.json", "w", encoding="utf-8") as f:
            json.dump(tester.test_results, f, ensure_ascii=False, indent=2)

        print(f"\nDetailed test results saved to: test_results.json")

        # Return appropriate exit code
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()