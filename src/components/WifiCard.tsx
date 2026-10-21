import { useEffect, useState } from "react";

import type { WifiNetwork } from "../lib/payload";
import { DismissButton } from "./DismissButton";

type Props = {
  network: WifiNetwork;
  onCopy: (text: string) => Promise<void>;
  onJoin: (ssid: string, password: string) => Promise<void>;
  onDismiss: () => void;
};

type Join = { state: "idle" } | { state: "joining" } | { state: "joined" } | { state: "failed"; message: string };

const SECURITY: Record<string, string> = {
  "": "Open",
  NOPASS: "Open",
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
  const connect = () => {
    setJoin({ state: "joining" });
    onJoin(network.ssid, network.password).then(
      () => setJoin({ state: "joined" }),
      (e: unknown) => setJoin({ state: "failed", message: String(e) }),
    );
  };

  return (
    <article className="card">
      <header>
        <span className="badge badge-wifi">Wi-Fi</span>
        <span className="headline">{network.ssid}</span>
        <DismissButton onClick={onDismiss} />
      </header>
      <dl className="fields">
        <dt>Security</dt>
        <dd>
          {security}
          {network.hidden && " · hidden network"}
        </dd>
        {network.password && (
          <>
            <dt>Password</dt>
            <dd className="secret">
              <span className="mono">{shown ? network.password : "•".repeat(Math.min(network.password.length, 12))}</span>
              <button type="button" className="link" onClick={() => setShown(!shown)}>
                {shown ? "Hide" : "Show"}
              </button>
            </dd>
          </>
        )}
      </dl>
      {join.state === "joined" && <p className="notice ok">Connected to {network.ssid}.</p>}
      {join.state === "failed" && <p className="warning danger">Could not connect: {join.message}</p>}
      <div className="actions">
        {network.password && (
          <button
            type="button"
            onClick={() => onCopy(network.password).then(() => setCopied(true), () => undefined)}
          >
            {copied ? "Copied" : "Copy password"}
          </button>
        )}
        <button
          type="button"
          className="primary"
          onClick={connect}
          disabled={join.state === "joining" || join.state === "joined"}
        >
          {join.state === "joining" ? "Connecting…" : join.state === "joined" ? "Connected" : "Connect"}
        </button>
      </div>
    </article>
  );
}
