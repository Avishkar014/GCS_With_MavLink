import React, { useEffect, useState, useRef } from "react";
import "./index.css";

const DEFAULT_TELEMETRY = {
  altitude: 0,
  ground_speed: 0,
  heading: 0,
  mode: "UNKNOWN",
  armed: false,
};

export default function App() {
  const [telemetry, setTelemetry] = useState(DEFAULT_TELEMETRY);
  const [status, setStatus] = useState("Connecting...");
  const [lastSeen, setLastSeen] = useState(null);
  const [msgCount, setMsgCount] = useState(0);
  const [lastRaw, setLastRaw] = useState(null);

  const wsRef = useRef(null);
  const reconnectRef = useRef({ tries: 0, timeoutId: null });
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    const url = "ws://127.0.0.1:8000/ws/telemetry";

    function canCreateSocket() {
      const cur = wsRef.current;
      if (!cur) return true;
      return !(cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING);
    }

    function connect() {
      if (!canCreateSocket()) return;

      setStatus("Connecting...");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current.tries = 0;
        setStatus("Connected");

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "ping" }));
            }
          } catch (_) {}
        }, 20000);
      };

      ws.onmessage = (e) => {
        setMsgCount((c) => c + 1);
        setLastRaw(e.data);

        let msg = null;
        try {
          msg = JSON.parse(e.data);
        } catch (_) { return; }

        if (msg.type === "ping") {
          setLastSeen(Date.now());
          return;
        }

        if (msg.type === "telemetry" && msg.data) {
          const d = msg.data;
          setTelemetry((prev) => ({
            ...prev,
            altitude: typeof d.altitude === "number" ? d.altitude : prev.altitude,
            ground_speed: typeof d.ground_speed === "number" ? d.ground_speed : prev.ground_speed,
            heading: typeof d.heading === "number" ? d.heading : prev.heading,
            mode: d.mode ?? prev.mode,
            armed: typeof d.armed === "boolean" ? d.armed : prev.armed,
          }));
          setLastSeen(Date.now());
          return;
        }

        if (msg.type === "position" || ("lat" in msg && "lon" in msg)) {
          const altVal = msg.alt_m ?? msg.alt ?? maybeConvertAlt(msg) ?? telemetry.altitude;
          const gsVal = msg.ground_speed ?? msg.speed ?? telemetry.ground_speed;
          const hdgVal = msg.heading ?? msg.yaw ?? telemetry.heading;

          setTelemetry((prev) => ({
            ...prev,
            altitude: Number(altVal),
            ground_speed: Number(gsVal),
            heading: Number(hdgVal),
          }));
          setLastSeen(Date.now());
          return;
        }

        if (msg.type === "heartbeat" || msg.custom_mode) {
          const mode = msg.custom_mode ?? msg.mode;
          setTelemetry((prev) => ({ ...prev, mode: mode ?? prev.mode }));
          setLastSeen(Date.now());
          return;
        }

        if (msg.type === "mission" || msg.status) {
          setTelemetry((prev) => ({ ...prev, mode: msg.status ?? prev.mode }));
          setLastSeen(Date.now());
          return;
        }

        if ("altitude" in msg || "ground_speed" in msg || "heading" in msg || "armed" in msg) {
          setTelemetry((prev) => ({
            ...prev,
            altitude: "altitude" in msg ? Number(msg.altitude) : prev.altitude,
            ground_speed: "ground_speed" in msg ? Number(msg.ground_speed) : prev.ground_speed,
            heading: "heading" in msg ? Number(msg.heading) : prev.heading,
            mode: msg.mode ?? prev.mode,
            armed: typeof msg.armed === "boolean" ? msg.armed : prev.armed,
          }));
          setLastSeen(Date.now());
          return;
        }

        setTelemetry((prev) => ({ ...prev, _raw: msg }));
        setLastSeen(Date.now());
      };

      ws.onclose = () => {
        setStatus("Disconnected");
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        attemptReconnect();
      };

      ws.onerror = () => {
        setStatus("Error");
      };
    }

    function attemptReconnect() {
      const tries = ++reconnectRef.current.tries;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(tries, 6));
      if (reconnectRef.current.timeoutId) clearTimeout(reconnectRef.current.timeoutId);
      reconnectRef.current.timeoutId = setTimeout(() => connect(), delay);
    }

    connect();

    return () => {
      if (reconnectRef.current.timeoutId) {
        clearTimeout(reconnectRef.current.timeoutId);
        reconnectRef.current.timeoutId = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        try {
          const state = wsRef.current.readyState;
          if (state === WebSocket.OPEN || state === WebSocket.CONNECTING || state === WebSocket.CLOSING) {
            wsRef.current.close();
          }
        } catch (_) {} 
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {}, [telemetry]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="title">
          <div className="logo">🚀</div>
          <div>
            <h1>Cloud GCS Dashboard</h1>
            <p className="subtitle">Live telemetry — simulator prototype</p>
          </div>
        </div>
        <div className="status-wrap">
          <StatusPill status={status} />
        </div>
      </header>

      <main>
        <section className="cards-grid">
          <LargeCard title="Flight Mode" value={telemetry.mode} />
          <SmallCard title="Armed" value={telemetry.armed ? "YES" : "NO"} />
          <SmallCard title="Altitude (m)" value={Number(telemetry.altitude).toFixed(2)} />
          <SmallCard title="Ground Speed (m/s)" value={Number(telemetry.ground_speed).toFixed(2)} />
          <CompassCard heading={Number(telemetry.heading || 0)} />
        </section>

        <section className="notes">
          SITL must send MAVLink to <code>udp:127.0.0.1:14540</code>.
        </section>

        <section className="debug">
          <div><strong>Messages:</strong> {msgCount}</div>
          <div><strong>Last Raw:</strong> 
            <pre style={{whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto"}}>{lastRaw ?? "—"}</pre>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>Cloud GCS prototype</div>
        <div className="small">{lastSeen ? new Date(lastSeen).toLocaleTimeString() : "—"}</div>
      </footer>
    </div>
  );
}

function SmallCard({ title, value }) {
  return (
    <div className="card small-card">
      <div className="card-row">
        <div className="card-title">{title}</div>
        <div className="card-value">{value}</div>
      </div>
    </div>
  );
}

function LargeCard({ title, value }) {
  return (
    <div className="card large-card">
      <div className="card-title">{title}</div>
      <div className="card-value large">{value}</div>
      <div className="card-hint">Status updated in real-time</div>
    </div>
  );
}

function CompassCard({ heading }) {
  const rotate = `rotate(${heading}deg)`;
  const displayHeading = Math.round(heading) % 360;

  return (
    <div className="card compass-card">
      <div className="card-title">Heading</div>
      <div className="compass">
        <svg viewBox="0 0 100 100" className="compass-svg" width="140" height="140">
          <g transform="translate(50 50)">
            <circle r="45" className="compass-ring" />
            <g style={{ transform: rotate, transformOrigin: "50% 50%" }}>
              <polygon points="0,-35 6,-10 0,0 -6,-10" className="compass-needle" />
            </g>
            <text x="0" y="36" textAnchor="middle" className="compass-text">
              {displayHeading}°
            </text>
          </g>
        </svg>
      </div>
      <div className="card-hint">North is 0°</div>
    </div>
  );
}

function StatusPill({ status }) {
  const cls = status === "Connected" ? "pill green" :
              status === "Connecting..." ? "pill yellow" :
              "pill red";
  return <div className={cls}>{status}</div>;
}

function maybeConvertAlt(msg) {
  if ("alt" in msg && Math.abs(Number(msg.alt)) > 10000) {
    return Number(msg.alt) / 1000;
  }
  return msg.alt ?? 0;
}
