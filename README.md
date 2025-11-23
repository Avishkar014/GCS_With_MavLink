<img width="2816" height="1536" alt="Gemini_Generated_Image_633pn6633pn6633p" src="https://github.com/user-attachments/assets/4fce6b55-2f76-427b-9093-3b1a1817e419" />🚀 Cloud GCS Dashboard

🚀 Cloud GCS Dashboard

A lightweight real-time Ground Control Dashboard powered by MAVLink + FastAPI + React.

This project receives PX4 MAVLink telemetry over UDP, parses it in a FastAPI WebSocket backend, and streams live telemetry to a React dashboard with smooth real-time updates.

✨ Features

📡 Real-time telemetry: altitude, ground speed, heading, mode, armed state

🔌 MAVLink → UDP → FastAPI → WebSocket → React

🔄 Automatic WebSocket reconnect + heartbeat system

🧭 Dynamic compass, flight cards, and status indicators

🛠 Works with PX4 SITL or any MAVLink-enabled autopilot

🧪 Built-in telemetry test mode (simulate data easily)

🧰 Tech Stack
Protocols

MAVLink (PX4 → backend)

UDP (telemetry transport)

WebSocket (real-time UI updates)

HTTP REST (backend metadata)

Frameworks

⚙️ FastAPI — backend + WebSocket server

⚛️ React — real-time dashboard UI

🐍 Python — MAVLink parser

🌐 Node / NPM — frontend tooling

📁 Project Structure
project-root/
├── backend/
│   ├── main.py
│   ├── telemetry_parser.py
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── src/App.js
│   ├── src/index.css
│   └── package.json
└── README.md

🚀 Getting Started
1️⃣ Clone the repository
git clone https://github.com/Avishkar014/GCS_With_MavLink.git
cd GCS_With_MavLink

🛰 Backend Setup (FastAPI + WebSocket)
2️⃣ Install dependencies
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate


Install required packages:

pip install -r requirements.txt

3️⃣ Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

Backend exposes:

UDP Telemetry: udp://0.0.0.0:14540

WebSocket: ws://127.0.0.1:8000/ws/telemetry

REST API: http://127.0.0.1:8000

💻 Frontend Setup (React)
4️⃣ Install UI dependencies
cd ../frontend
npm install

5️⃣ Start React app
npm run dev


Vite opens at:

👉 http://localhost:5173

🐧 WSL Setup (Recommended for PX4 SITL)
Install WSL
wsl --install


Update environment:

sudo apt update && sudo apt upgrade -y


Install required tools:

sudo apt install git python3 python3-pip pipx build-essential -y


Enable optional GUI apps (Windows 11 auto-supports):

sudo apt install x11-apps

✈️ PX4 SITL Setup (WSL)
1️⃣ Clone PX4 Autopilot
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
cd PX4-Autopilot

2️⃣ Install dependencies
bash ./Tools/setup/ubuntu.sh

3️⃣ Build SITL
make px4_sitl_default

4️⃣ Run SITL Simulator
JMAVSim:
make px4_sitl_default jmavsim

Gazebo:
make px4_sitl_default gazebo

📡 Connecting PX4 SITL to Your Backend

PX4 must stream MAVLink telemetry to your backend:

mavlink start -u 14540 -r 50


If needed, ensure forwarding:

param set MAV_0_FORWARD 1


Once started, your backend begins receiving live telemetry instantly.

🧪 Testing Telemetry Without PX4

Simulate telemetry using websocat:

echo '{"type":"telemetry","data":{"altitude":10,"ground_speed":3,"heading":90}}' \
| websocat ws://127.0.0.1:8000/ws/telemetry

🚦 Status Indicators
Status	Meaning
🟢	WebSocket Connected
🟡	Trying to Reconnect
🔴	No Live Telemetry
🔧 Environment Variables

(Optional for production)

WS_URL=ws://127.0.0.1:8000/ws/telemetry
UDP_PORT=14540

🐞 Debug Tools Included

Raw WebSocket payload viewer

Packet counter

Last ping timestamp

WebSocket health monitor

📄 License

This project is released under the MIT License.
MIT License
