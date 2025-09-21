#!/usr/bin/env python3
import requests
import json

def test_basic_endpoints():
    base_url = "http://localhost:8001"

    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health Check: {response.status_code}")
        if response.status_code == 200:
            print(f"  Response: {response.json()}")
    except Exception as e:
        print(f"Health Check Error: {e}")

    # Test 2: Meetings list
    try:
        response = requests.get(f"{base_url}/api/v1/meetings")
        print(f"Meetings List: {response.status_code}")
        if response.status_code == 200:
            meetings = response.json()
            print(f"  Found {len(meetings)} meetings")
            if meetings:
                meeting = meetings[0]
                print(f"  First meeting ID: {meeting.get('id')}")
                print(f"  First meeting title: {meeting.get('title')}")

                # Test 3: Meeting details
                meeting_id = meeting.get('id')
                response = requests.get(f"{base_url}/api/v1/meetings/{meeting_id}")
                print(f"Meeting {meeting_id} Details: {response.status_code}")

                # Test 4: Start conversation
                response = requests.post(f"{base_url}/api/v1/meetings/{meeting_id}/start-conversation")
                print(f"Start Conversation: {response.status_code}")
                if response.status_code == 200:
                    print(f"  Response: {response.json()}")
                else:
                    print(f"  Error: {response.text}")

    except Exception as e:
        print(f"Meetings API Error: {e}")

if __name__ == "__main__":
    test_basic_endpoints()