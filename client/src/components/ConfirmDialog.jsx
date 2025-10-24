// client/src/components/ConfirmDialog.jsx
import Modal from "./Modal";

export default function ConfirmDialog({ open, title = "Confirm", message, onCancel, onConfirm, confirmText = "Yes", cancelText = "Cancel", busy = false }) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}>
      <p style={{ marginBottom: 16 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
          {cancelText}
        </button>
        <button onClick={onConfirm} disabled={busy} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #c00", background: "#fff0f0", color: "#c00" }}>
          {busy ? "Deleting..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
