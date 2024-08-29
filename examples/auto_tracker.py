import asyncio
import random
import json

from websockets.asyncio.server import serve

"""
pip install websockets
python examples/auto_tracker.py

npm start
# make sure to reload the tracker after restarting the server,
# the web tracker doesn't reconnect automatically right now!
"""

ITEMS = [
    ("Progressive Beetle", 4),
    ("Progressive Sword", 6),
    ("Progressive Bow", 3),
    ("Gust Bellows", 1),
    ("Bomb Bag", 1),
    ("Progressive Slingshot", 2),
    ("Clawshots", 1),
    ("Whip", 1),
]

async def echo(websocket):
    print("connected")
    while True:
        try:
            counts = []
            for item, max in ITEMS:
                counts.append({
                    "item": item,
                    "count": random.randint(0, max)
                })
            payload = {
                "type": "item_counts",
                "counts": counts
            }
            print("sent " + json.dumps(payload))
            await websocket.send(json.dumps(payload))
            await asyncio.sleep(0.5)
        except KeyboardInterrupt as e:
            raise e
        except Exception as e:
            print(e)



async def main():
    async with serve(echo, "localhost", 9238):
        await asyncio.get_running_loop().create_future()  # run forever

        

if __name__ == "__main__":
    asyncio.run(main())