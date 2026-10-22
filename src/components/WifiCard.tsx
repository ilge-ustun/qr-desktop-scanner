import { useState } from "react";

import { SHORTCUTS } from "../lib/cardKeys";
import type { WifiNetwork } from "../lib/payload";
import { Card } from "./Card";
import { Keyed, PrimaryButton } from "./Ink";
import { useCardKeys } from "./useCardKeys";
import { useCopyFeedback } from "./useCopyFeedback";

type Props = {
  network: WifiNetwork;
  onCopy: (text: string) => Promise<void>;
  onJoin: (ssid: string, password: string) => Promise<void>;
  onDismiss: () => void;
};

type Join = { state: "idle" } | { state: "joining" } | { state: "joined" } | { state: "failed"; message: string };

const SECURITY: Record<string, string> = {
  "": "open network",
  NOPASS: "open network",
  WEP: "WEP",
  WPA: "WPA/WPA2",
  WPA2: "WPA2",
  WPA3: "WPA3",
  SAE: "WPA3",
};

export function WifiCard({ network, onCopy, onJoin, onDismiss }: Props) {
  const [shown, setShown] = useState(false);
  const [join, setJoin] = useState<Join>({ state: "idle" });
  const { copy, copied, failure } = useCopyFeedback(onCopy);

  const security = SECURITY[network.security.toUpperCase()] ?? network.security;
  const meta = ["Wi-Fi", security, network.hidden ? "hidden" : ""].filter(Boolean).join(" · ");
  const copyPassword = copy("password", network.password);
  const connect = () => {
    setJoin({ state: "joining" });
    onJoin(network.ssid, network.password).then(
      () => setJoin({ state: "joined" }),
      (e: unknown) => setJoin({ state: "failed", message: String(e) }),
    );
  };
  // Connect is disabled while it connects and once it has: ⌘J too.
  const busy = join.state === "joining" || join.state === "joined";
  const keyed = useCardKeys({ copy: network.password ? copyPassword : undefined, join: busy ? undefined : connect });

  return (
    <Card tone="ok" meta={meta} headline={network.ssid} keys={keyed} onDismiss={onDismiss}>
      {network.password && (
        <div className="secret">
          <span className="mono">{shown ? network.password : "•".repeat(Math.min(network.password.length, 12))}</span>
          <button type="button" className="show" onClick={() => setShown(!shown)}>
            {shown ? "Hide" : "Show"}
          </button>
        </div>
      )}
      {join.state === "joined" && <p className="success">Connected to {network.ssid}.</p>}
      {join.state === "failed" && <p className="failure">Could not connect: {join.message}</p>}
      {failure && <p className="failure">{failure}</p>}
      <div className="actions">
        {network.password && (
          <Keyed shortcut="copy">
            <button type="button" className="ghost" onClick={copyPassword} aria-keyshortcuts={SHORTCUTS.copy.aria}>
              {copied("password") ? "Copied" : "Copy password"}
            </button>
          </Keyed>
        )}
        <Keyed shortcut="join">
          <PrimaryButton onClick={connect} disabled={busy} keyshortcuts={SHORTCUTS.join.aria}>
            {join.state === "joining" ? "Connecting…" : join.state === "joined" ? "Connected" : "Connect"}
          </PrimaryButton>
        </Keyed>
      </div>
    </Card>
  );
}
