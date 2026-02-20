export function ChatPanelPlaceholder() {
  return (
    <div className="panel placeholder-box">
      <h4>Text Chat (Planned)</h4>
      <p>This panel is intentionally reserved for future in-room messaging.</p>
      <textarea rows={6} disabled value="Chat is disabled in this MVP." readOnly />
      <button type="button" disabled style={{ marginTop: 10 }}>
        Send (Disabled)
      </button>
    </div>
  );
}
