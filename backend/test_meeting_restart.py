#!/usr/bin/env python3
"""
测试会议重启和Agent对话功能
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BASE_URL = "http://localhost:8001/api/v1"

async def test_meeting_restart():
    """测试会议重启功能"""
    
    async with aiohttp.ClientSession() as session:
        
        # 1. 获取会议列表
        print("1. 获取会议列表...")
        async with session.get(f"{BASE_URL}/meetings") as resp:
            if resp.status == 200:
                meetings = await resp.json()
                if isinstance(meetings, list) and len(meetings) > 0:
                    meeting_id = meetings[0]["id"]
                    print(f"   找到会议 ID: {meeting_id}")
                else:
                    print("   没有找到会议，请先创建一个会议")
                    return
            else:
                print(f"   错误: {resp.status}")
                return
        
        # 2. 将会议状态设置为active
        print("\n2. 激活会议...")
        async with session.put(
            f"{BASE_URL}/meetings/{meeting_id}/status",
            json={"status": "active"}
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                print(f"   会议状态已更新: {result['status']}")
            else:
                error = await resp.text()
                print(f"   错误: {resp.status} - {error}")
                return
        
        # 3. 等待一段时间让对话启动
        print("\n3. 等待对话启动...")
        await asyncio.sleep(3)
        
        # 4. 检查是否有新消息
        print("\n4. 检查会议消息...")
        async with session.get(f"{BASE_URL}/meetings/{meeting_id}/messages") as resp:
            if resp.status == 200:
                messages = await resp.json()
                print(f"   会议消息数量: {len(messages)}")
                if len(messages) > 0:
                    latest_message = messages[-1]
                    print(f"   最新消息: {latest_message.get('message_content', '')[:50]}...")
                    print(f"   发言者: {latest_message.get('agent_name', 'Unknown')}")
                else:
                    print("   没有消息")
            else:
                print(f"   错误: {resp.status}")
        
        # 5. 手动启动对话（如果没有自动启动）
        print("\n5. 手动启动对话（强制重启）...")
        async with session.post(
            f"{BASE_URL}/meetings/{meeting_id}/start-conversation",
            params={"force_restart": "true"}
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                print(f"   对话启动结果: {result['message']}")
            else:
                error = await resp.text()
                print(f"   错误: {resp.status} - {error}")
        
        # 6. 再次等待并检查消息
        print("\n6. 等待新消息...")
        await asyncio.sleep(5)
        
        async with session.get(f"{BASE_URL}/meetings/{meeting_id}/messages") as resp:
            if resp.status == 200:
                messages = await resp.json()
                print(f"   更新后消息数量: {len(messages)}")
                if len(messages) > 0:
                    # 显示最近的几条消息
                    recent_messages = messages[-3:] if len(messages) >= 3 else messages
                    print("   最近的消息:")
                    for msg in recent_messages:
                        agent_name = msg.get('agent_name', 'Unknown')
                        content = msg.get('message_content', '')[:100]
                        msg_type = msg.get('message_type', 'unknown')
                        timestamp = msg.get('created_at', '')
                        print(f"     [{agent_name}] ({msg_type}): {content}...")
                else:
                    print("   仍然没有消息")
            else:
                print(f"   错误: {resp.status}")
        
        print("\n测试完成!")

if __name__ == "__main__":
    print("开始测试会议重启和Agent对话功能...")
    print("=" * 50)
    asyncio.run(test_meeting_restart())
