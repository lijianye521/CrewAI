#!/usr/bin/env python3
"""
测试前端消息显示修复
"""

import asyncio
import aiohttp
import json

async def test_conversation_restart():
    """测试对话重启功能"""
    
    meeting_id = 4  # 使用你提到的会议ID
    base_url = "http://localhost:8001/api/v1"
    
    async with aiohttp.ClientSession() as session:
        
        print("1. 检查会议状态...")
        async with session.get(f"{base_url}/meetings/{meeting_id}") as resp:
            if resp.status == 200:
                meeting = await resp.json()
                print(f"   会议: {meeting['title']}")
                print(f"   状态: {meeting['status']}")
            else:
                print(f"   错误: {resp.status}")
                return
        
        print("\n2. 强制重启对话...")
        async with session.post(
            f"{base_url}/meetings/{meeting_id}/start-conversation?force_restart=true"
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                print(f"   结果: {result['message']}")
            else:
                error = await resp.text()
                print(f"   错误: {resp.status} - {error}")
                return
        
        print("\n3. 等待消息生成...")
        await asyncio.sleep(3)
        
        print("\n4. 检查消息...")
        async with session.get(f"{base_url}/meetings/{meeting_id}/messages") as resp:
            if resp.status == 200:
                messages = await resp.json()
                print(f"   消息总数: {len(messages)}")
                
                if len(messages) > 0:
                    print("   最新的几条消息:")
                    for msg in messages[-3:]:
                        agent_name = msg.get('agent_name', f"Agent{msg.get('agent_id')}")
                        content = msg.get('message_content', '')[:50]
                        msg_type = msg.get('message_type', 'unknown')
                        print(f"     [{agent_name}] ({msg_type}): {content}...")
                else:
                    print("   没有消息")
            else:
                print(f"   错误: {resp.status}")

if __name__ == "__main__":
    asyncio.run(test_conversation_restart())

