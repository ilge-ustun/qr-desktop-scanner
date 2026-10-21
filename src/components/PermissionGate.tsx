import { PrimaryButton } from "./Ink";

type Props = {
  onOpenSettings: () => void;
  onRetry: () => void;
};

export function PermissionGate({ onOpenSettings, onRetry }: Props) {
  return (
    <section className="card tone-warn gate">
      <span className="meta">Screen access needed</span>
      <h2>Let QR Scanner see your screen</h2>
      <ol>
        <li>
          Open System Settings and switch <strong>QR Scanner</strong> on under Screen &amp; System Audio Recording.
        </li>
        <li>Quit QR Scanner (right-click the menu-bar icon → Quit) and open it again.</li>
      </ol>
      <p className="hint">
        Running with <code>npm run tauri dev</code>? Allow the app you ran it in (Terminal, iTerm, VS Code…),
        quit it with ⌘Q and start again. Not in the list? Add it with the + button.
      </p>
      <div className="actions">
        <button type="button" className="ghost" onClick={onRetry}>
          Try again
        </button>
        <PrimaryButton onClick={onOpenSettings}>Open Settings</PrimaryButton>
      </div>
    </section>
  );
}
