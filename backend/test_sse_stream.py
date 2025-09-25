#!/usr/bin/env python3
"""
测试SSE流接口
"""

import asyncio
import aiohttp
import json
from datetime import datetime

async def test_sse_stream():
    """测试SSE流接口"""
    
    meeting_id = 4  # 测试的会议ID
    url = f"http://localhost:8001/api/v1/meetings/{meeting_id}/stream"
    
    print(f"测试SSE流接口: {url}")
    print("=" * 50)
    
    try:
        timeout = aiohttp.ClientTimeout(total=30)  # 30秒超时
        async with aiohttp.ClientSession(timeout=timeout) as session:
            
            # 首先检查会议是否存在
            print("1. 检查会议是否存在...")
            async with session.get(f"http://localhost:8001/api/v1/meetings/{meeting_id}") as resp:
                if resp.status == 200:
                    meeting = await resp.json()
                    print(f"   会议存在: {meeting['title']}")
                    print(f"   状态: {meeting['status']}")
                elif resp.status == 404:
                    print(f"   会议 {meeting_id} 不存在")
                    return
                else:
                    print(f"   错误: {resp.status}")
                    error_text = await resp.text()
                    print(f"   错误信息: {error_text}")
                    return
            
            # 测试SSE连接
            print("\n2. 测试SSE连接...")
            headers = {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }
            
            async with session.get(url, headers=headers) as resp:
                print(f"   HTTP状态: {resp.status}")
                print(f"   Content-Type: {resp.headers.get('Content-Type')}")
                
                if resp.status != 200:
                    error_text = await resp.text()
                    print(f"   错误: {error_text}")
                    return
                
                print("   开始接收SSE事件...")
                
                message_count = 0
                async for line in resp.content:
                    try:
                        line_str = line.decode('utf-8').strip()
                        
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # 移除 'data: ' 前缀
                            
                            try:
                                data = json.loads(data_str)
                                message_count += 1
                                
                                print(f"\n   [{message_count}] 收到事件:")
                                print(f"       类型: {data.get('type', 'unknown')}")
                                print(f"       时间: {data.get('timestamp', 'N/A')}")
                                
                                if data.get('type') == 'existing_message':
                                    msg = data.get('message', {})
                                    print(f"       消息ID: {msg.get('id')}")
                                    print(f"       内容: {msg.get('message_content', '')[:50]}...")
                                elif data.get('type') == 'new_message':
                                    msg = data.get('message', {})
                                    print(f"       新消息: {msg.get('message_content', '')[:50]}...")
                                elif data.get('type') == 'connected':
                                    print(f"       连接成功到会议: {data.get('meeting_id')}")
                                elif data.get('type') == 'heartbeat':
                                    print(f"       心跳")
                                
                                # 收到5条消息后停止测试
                                if message_count >= 5:
                                    print("\n   已收到足够的测试消息，停止测试")
                                    break
                                    
                            except json.JSONDecodeError as e:
                                print(f"   JSON解析错误: {e}")
                                print(f"   原始数据: {data_str}")
                        
                        elif line_str == '':
                            # 空行，SSE事件分隔符
                            continue
                        else:
                            # 其他行
                            print(f"   非数据行: {line_str}")
                            
                    except Exception as e:
                        print(f"   处理行时出错: {e}")
                        continue
                
                print(f"\n   总共接收到 {message_count} 条消息")
                
    except aiohttp.ClientConnectorError as e:
        print(f"连接错误: {e}")
        print("请确保后端服务正在运行在 http://localhost:8001")
    except asyncio.TimeoutError:
        print("连接超时")
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("开始测试SSE流接口...")
    asyncio.run(test_sse_stream())
