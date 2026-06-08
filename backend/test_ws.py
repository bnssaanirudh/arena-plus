import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/api/v1/ws/dashboard"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected to WebSocket.")
            for _ in range(5):
                msg = await ws.recv()
                data = json.loads(msg)
                print(f"Received: {data['type']}")
                if data['type'] == 'agent_action':
                    print(f"  -> Agent: {data['data']['agent_name']}, Action: {data['data']['action']}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_websocket())
