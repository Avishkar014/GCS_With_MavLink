# send_heartbeat.py
from pymavlink import mavutil
import time

HOST = "127.0.0.1"   # PX4 listens on localhost according to netstat
PORT = 14540
SOURCE_SYSID = 250   # pick a unique sysid not equal to autopilot (autopilot usually 1)

print(f"Sending heartbeats to {HOST}:{PORT} (source_sysid={SOURCE_SYSID})")
m = mavutil.mavlink_connection(f"udpout:{HOST}:{PORT}", source_system=SOURCE_SYSID)

for i in range(8):
    m.mav.heartbeat_send(
        mavutil.mavlink.MAV_TYPE_GCS,
        mavutil.mavlink.MAV_AUTOPILOT_INVALID,
        0, 0, 0
    )
    print(f"Sent heartbeat {i+1}")
    time.sleep(1)

print("Finished sending heartbeats")
