<img width="2816" height="1536" alt="Gemini_Generated_Image_633pn6633pn6633p" src="https://github.com/user-attachments/assets/4fce6b55-2f76-427b-9093-3b1a1817e419" />🚀 Cloud GCS Dashboard

A lightweight real-time Ground Control Dashboard that receives MAVLink telemetry over UDP, converts it to JSON in a FastAPI WebSocket backend, and streams live data to a React frontend.

📌 Features

Real-time telemetry updates (altitude, speed, heading, mode, armed state)

MAVLink over UDP → backend parser

WebSocket live updates to React UI

Automatic reconnect + heartbeat ping system

Clean dashboard UI with flight cards + compass

Works with PX4 SITL or any MAVLink sender

🧰 Tech Stack
Protocols

MAVLink (PX4 → Backend)

UDP (telemetry transport)

WebSocket (Backend → React real-time data)

HTTP REST (backend metadata endpoints)

Frameworks

FastAPI backend (Python)

React frontend

WebSocket API for streaming

Node / NPM for UI build

🛠️ Project Structure
project-root/
   ├── backend/
   │    ├── main.py
   │    ├── telemetry_parser.py
   │    ├── requirements.txt
   │    └── ...
   ├── frontend/
   │    ├── src/App.js
   │    ├── src/index.css
   │    └── package.json
   └── README.md

🔧 Setup Instructions
1️⃣ Clone the repository
git clone https://github.com/Avishkar014/GCS_With_MavLink.git
cd cloud-gcs-dashboard

🛰 Backend Setup (FastAPI + WebSocket)
2️⃣ Install Python dependencies
cd backend
python -m venv venv
source venv/bin/activate      # macOS/Linux
venv\Scripts\activate         # Windows

pip install -r requirements.txt

3️⃣ Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000


Backend now listens on:

UDP Telemetry: udp://127.0.0.1:14540

WebSocket: ws://127.0.0.1:8000/ws/telemetry

REST API: http://127.0.0.1:8000

💻 Frontend Setup (React UI)
4️⃣ Install dependencies
cd ../frontend
npm install

5️⃣ Run the React app
npm start


React will open on:

http://localhost:3000

🎮 Using PX4 SITL
6️⃣ Start PX4 SITL (example)
make px4_sitl gazebo


Or for Windows:

.\Tools\simulation\run_sitl.bat px4_sitl_default none

7️⃣ Make PX4 send MAVLink to your backend

Run:

mavlink start -u 14540 -r 50


Your backend will start receiving telemetry immediately.


🧪 Testing Telemetry Without PX4

Send fake MAVLink-like data:

echo '{"type":"telemetry","data":{"altitude":10,"ground_speed":3,"heading":90}}' \
     | websocat ws://127.0.0.1:8000/ws/telemetry

🚦 Status Indicators
Status	Meaning
🟢 Connected	WebSocket active
🟡 Connecting	Trying to connect
🔴 Disconnected	No live data
📁 Environment Variables (optional)
WS_URL=ws://127.0.0.1:8000/ws/telemetry
UDP_PORT=14540

🐞 Debug Tools

The UI shows:

raw incoming WS message

message count

last time backend responded

📄 License

MIT License
