type Props = {
  onOpenSettings: () => void;
  onRetry: () => void;
};

export function PermissionGate({ onOpenSettings, onRetry }: Props) {
  return (
    <section className="gate">
      <h2>Allow screen access</h2>
      <p>
        To read a QR code from your screen, macOS needs you to allow <strong>QR Scanner</strong> under{" "}
        <em>Privacy &amp; Security → Screen &amp; System Audio Recording</em>.
      </p>
      <ol>
        <li>Open System Settings and switch QR Scanner on.</li>
        <li>
          Quit QR Scanner (right-click the menu-bar icon → Quit) and open it again. macOS applies the change
          only after a restart.
        </li>
      </ol>
      <p className="hint">
        Running with <code>npm run tauri dev</code>? macOS asks on behalf of the app you ran it in (Terminal,
        iTerm, VS Code…): allow that one, quit it with ⌘Q and start again. If it is not in the list, add it
        with the + button.
      </p>
      <div className="actions">
        <button type="button" className="primary" onClick={onOpenSettings}>
          Open System Settings
        </button>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </section>
  );
}
