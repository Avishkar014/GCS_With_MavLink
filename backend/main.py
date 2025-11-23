import asyncio
import json
import logging
import threading
import time
from typing import List, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pymavlink import mavutil

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("mavlink-gcs")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

telemetry: Dict = {
    "altitude": 0.0,
    "ground_speed": 0.0,
    "heading": 0.0,
    "mode": "UNKNOWN",
    "armed": False,
}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self.lock:
            self.active_connections.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self.lock:
            if ws in self.active_connections:
                self.active_connections.remove(ws)

    async def broadcast(self, message: dict):
        payload = json.dumps(message)
        async with self.lock:
            clients = list(self.active_connections)
        for ws in clients:
            try:
                await ws.send_text(payload)
            except:
                await self.disconnect(ws)

manager = ConnectionManager()

def gcs_heartbeat(master):
    while True:
        try:
            master.mav.heartbeat_send(
                mavutil.mavlink.MAV_TYPE_GCS,
                mavutil.mavlink.MAV_AUTOPILOT_INVALID,
                0,
                0,
                mavutil.mavlink.MAV_STATE_ACTIVE
            )
        except:
            pass
        time.sleep(1)

def mav_thread(loop, port="udp:0.0.0.0:14550"):
    logger.info(f"[MAV] connecting {port}")
    try:
        master = mavutil.mavlink_connection(port, autoreconnect=True)
        master.wait_heartbeat(timeout=30)
        logger.info("[MAV] heartbeat ok")
        logger.info(f"[MAV TARGET BEFORE] sys={master.target_system} comp={master.target_component}")
        if not master.target_system:
            master.target_system = 1
        if not master.target_component:
            master.target_component = 1
        logger.info(f"[MAV TARGET AFTER] sys={master.target_system} comp={master.target_component}")
    except Exception as e:
        logger.error(f"[MAV] connection failed {e}")
        return

    threading.Thread(target=gcs_heartbeat, args=(master,), daemon=True).start()

    try:
        master.mav.request_data_stream_send(master.target_system, master.target_component, mavutil.mavlink.MAV_DATA_STREAM_ALL, 10, 1)
        master.mav.request_data_stream_send(master.target_system, master.target_component, mavutil.mavlink.MAV_DATA_STREAM_EXTRA1, 10, 1)
        master.mav.request_data_stream_send(master.target_system, master.target_component, mavutil.mavlink.MAV_DATA_STREAM_EXTENDED_STATUS, 2, 1)
        logger.info("[MAV] requested ALL/EXTRA1/EXTENDED streams")
    except Exception as e:
        logger.error(f"[MAV] stream request failed {e}")

    while True:
        try:
            msg = master.recv_match(type=None, blocking=True, timeout=1)
            if not msg:
                logger.debug("[MAV DEBUG] recv_match returned None")
                time.sleep(0.01)
                continue

            try:
                t = msg.get_type()
            except:
                logger.info(f"[MAV RAW] UnknownMsg {msg}")
                continue

            logger.info(f"[MAV RAW] {t}")

            if t == "VFR_HUD":
                try:
                    telemetry["altitude"] = float(msg.alt)
                except:
                    pass
                try:
                    telemetry["ground_speed"] = float(msg.groundspeed)
                except:
                    pass
                try:
                    telemetry["heading"] = float(msg.heading)
                except:
                    pass

            elif t == "HEARTBEAT":
                try:
                    telemetry["armed"] = master.motors_armed()
                except:
                    pass
                try:
                    telemetry["mode"] = master.flightmode
                except:
                    pass

            if t in ("VFR_HUD", "HEARTBEAT"):
                snap = dict(telemetry)
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast({"type": "telemetry", "data": snap}),
                    loop
                )

        except Exception as e:
            logger.error(f"[MAV ERROR] {e}")
            time.sleep(0.1)

async def _keepalive_task():
    while True:
        await asyncio.sleep(20)
        await manager.broadcast({"type": "ping"})

@app.on_event("startup")
async def startup():
    loop = asyncio.get_running_loop()
    threading.Thread(target=mav_thread, args=(loop,), daemon=True).start()
    asyncio.create_task(_keepalive_task())

@app.get("/api/telemetry")
def get_telemetry():
    return telemetry

@app.websocket("/ws/telemetry")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_text(json.dumps({"type": "telemetry", "data": telemetry}))
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)
