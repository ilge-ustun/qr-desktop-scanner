import { useEffect, useState } from "react";

import { headlineSize } from "../lib/headline";
import type { WifiNetwork } from "../lib/payload";
import { DismissButton } from "./DismissButton";
import { Corners, PrimaryButton } from "./Neon";

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
  const [copied, setCopied] = useState(false);
  const [join, setJoin] = useState<Join>({ state: "idle" });
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const security = SECURITY[network.security.toUpperCase()] ?? network.security;
  const meta = ["Wi-Fi", security, network.hidden ? "hidden" : ""].filter(Boolean).join(" · ");
  const connect = () => {
    setJoin({ state: "joining" });
    onJoin(network.ssid, network.password).then(
      () => setJoin({ state: "joined" }),
      (e: unknown) => setJoin({ state: "failed", message: String(e) }),
    );
  };

  return (
    <article className="card tone-ok">
      <Corners />
      <header className="card-head">
        <div className="titles">
          <span className="meta">{meta}</span>
          <span className={`headline size-${headlineSize(network.ssid)}`}>{network.ssid}</span>
        </div>
        <DismissButton onClick={onDismiss} />
      </header>
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
      <div className="actions">
        {network.password && (
          <button
            type="button"
            className="ghost"
            onClick={() => onCopy(network.password).then(() => setCopied(true), () => undefined)}
          >
            {copied ? "Copied" : "Copy password"}
          </button>
        )}
        <PrimaryButton onClick={connect} disabled={join.state === "joining" || join.state === "joined"}>
          {join.state === "joining" ? "Connecting…" : join.state === "joined" ? "Connected" : "Connect"}
        </PrimaryButton>
      </div>
    </article>
  );
}
