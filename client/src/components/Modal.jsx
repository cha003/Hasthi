// client/src/components/Modal.jsx
export default function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "grid", placeItems: "center", zIndex: 50
    }}>
      <div style={{
        width: "min(92vw, 560px)", background: "#fff", borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)", overflow: "hidden"
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>{title}</strong>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
