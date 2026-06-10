import { useEffect, useState, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const POLL_MS = 15000; // auto-refresh interval

const STATUS = {
  SUCCESS:  { dot: "#34d399", text: "#6ee7b7", bg: "rgba(52,211,153,0.10)", ring: "rgba(52,211,153,0.35)" },
  FAILED:   { dot: "#f87171", text: "#fca5a5", bg: "rgba(248,113,113,0.10)", ring: "rgba(248,113,113,0.35)" },
  BUILDING: { dot: "#fbbf24", text: "#fcd34d", bg: "rgba(251,191,36,0.10)", ring: "rgba(251,191,36,0.35)" },
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
console.log("API_URL =", API_URL);

async function realFetch(signal) {
  const res = await fetch(`${API_URL}/api/status`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function StatusCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const load = useCallback(async ({ silent } = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const json = await realFetch(controller.signal);
      setData(json);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
    }, []);

    useEffect(() => {
      load();
      const id = setInterval(() => load({ silent: true }), POLL_MS);
      return () => {
        clearInterval(id);
        abortRef.current?.abort()
      };
    }, [load]);

    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(124,58,237,0.18), transparent 60%), #0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
        }}
      >
        <Shell serviceName={data?.serviceName}>
          {loading && !data && <LoadingState />}
          {error && <ErrorState message={error} onRetry={() => load()} />}
          {!error && data && !data.latest && <EmptyState />}
          {!error && data?.latest && <CardBody data={data} refreshing={loading} />}
        </Shell>
      </div>
  );
}

function Shell({ children, serviceName }) {
  return (
    <div
      style={{
        width: 380,
        background: "linear-gradient(180deg, #15151d 0%, #101015 100%)",
        border: "1px solid #26263340",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow:
          "0 24px 60px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02) inset",
      }}
    >
      <Header serviceName={serviceName} />
      {children}
    </div>
  );
}

function Header({ serviceName }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 18px", borderBottom: "1px solid #20202b",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 26, height: 26, borderRadius: 7, background: "#1a1a24",
            border: "1px solid #2a2a38", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 13,
          }}
        >
          🚂
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 600 }}>
            Railway Deployment
          </div>
          <div style={{ color: "#52525b", fontSize: 12, marginTop: 1 }}>
            {serviceName ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBody({ data, refreshing }) {
  const latest = data.latest;
  const s = STATUS[latest.status] ?? STATUS.BUILDING;
  return (
    <>
      <div style={{ padding: "0 18px", marginTop: -1 }}>
        <div
          style={{
            display: "flex", justifyContent: "flex-end",
            paddingTop: 14, marginBottom: 2,
          }}
        >
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 999,
              background: s.bg, border: `1px solid ${s.ring}`,
              color: s.text, fontSize: 11, fontWeight: 600,
            }}
          >
            <Dot color={s.dot} pulse={latest.status === "BUILDING"} />
            {latest.status}
            {refreshing && <span style={{ color: "#52525b", marginLeft: 2 }}>·</span>}
          </span>
        </div>
      </div>

      <div style={{ padding: "8px 18px 18px" }}>
        <Row label="Environment" value={latest.environment} mono />
        <Row label="Commit" value={`${latest.commit} · ${latest.branch}`} mono />
        <Row label="Updated" value={timeAgo(latest.createdAt)} />
        <Row label="Deployed By" value={latest.commitAuthor ? `${latest.commitAuthor}` : "—"} />

        {latest.url && (
          <a
            href={latest.url}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 16, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, width: "100%",
              boxSizing: "border-box", padding: "11px 0", borderRadius: 10,
              background: "linear-gradient(180deg, #7c3aed, #6d28d9)",
              color: "#fff", fontSize: 12.5, fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 8px 20px -8px rgba(124,58,237,0.7)",
            }}
          >
            View Source ↗
          </a>
        )}
      </div>

      {data.history?.length > 0 && (
        <div style={{ borderTop: "1px solid #20202b", padding: "12px 18px 16px" }}>
          <div
            style={{
              color: "#52525b", fontSize: 10, letterSpacing: 1.5,
              textTransform: "uppercase", marginBottom: 10,
            }}
          >
            Recent
          </div>
          {data.history.map((h, i) => {
            const hs = STATUS[h.status] ?? STATUS.BUILDING;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 0",
                  borderBottom: i < data.history.length - 1 ? "1px solid #18181f" : "none",
                }}
              >
                <Dot color={hs.dot} />
                <span style={{ color: "#d4d4d8", fontSize: 12, fontWeight: 600, flex: 1, textAlign: "left" }}>
                  {h.commit ?? "—"}
                  <span style={{ color: "#52525b", fontWeight: 400 }}> · {h.environment ?? "—"}</span>
                </span>
                <span style={{ color: "#71717a", fontSize: 11 }}>
                  {timeAgo(h.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: "40px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <span
        style={{
          width: 22, height: 22, borderRadius: "50%",
          border: "2px solid #2a2a38", borderTopColor: "#7c3aed",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ color: "#52525b", fontSize: 12, letterSpacing: 0.5 }}>
        fetching status…
      </span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding: "32px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}
      >
        ⚠️
      </div>
      <div style={{ color: "#fca5a5", fontSize: 12.5, fontWeight: 600 }}>
        Couldn’t reach the API
      </div>
      <div style={{ color: "#52525b", fontSize: 11, textAlign: "center" }}>
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          marginTop: 4, padding: "8px 18px", borderRadius: 9,
          background: "#1a1a24", border: "1px solid #2a2a38",
          color: "#d4d4d8", fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "40px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 22, opacity: 0.5 }}>📭</div>
      <div style={{ color: "#a1a1aa", fontSize: 12.5, fontWeight: 600 }}>
        No deployments yet
      </div>
      <div style={{ color: "#52525b", fontSize: 11, textAlign: "center" }}>
        Push to your connected branch to trigger the first build.
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
      <span style={{ color: "#52525b", fontSize: 12 }}>{label}</span>
      <span
        style={{
          color: "#d4d4d8", fontSize: 12,
          fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Dot({ color, pulse }) {
  return (
    <span style={{ position: "relative", width: 8, height: 8, display: "inline-block" }}>
      {pulse && (
        <span
          style={{
            position: "absolute", inset: 0, borderRadius: 999, background: color,
            opacity: 0.5, animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
      )}
      <span
        style={{
          position: "absolute", inset: 0, borderRadius: 999,
          background: color, boxShadow: `0 0 8px ${color}`,
        }}
      />
      <style>{`@keyframes ping{75%,100%{transform:scale(2.2);opacity:0}}`}</style>
    </span>
  );
}
