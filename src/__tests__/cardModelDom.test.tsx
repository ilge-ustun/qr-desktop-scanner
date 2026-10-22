// The rendered cards show what the functions in src/lib return: the label, the
// headline, the rows and the buttons.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResultCard } from "../components/ResultCard";
import { fieldCardModel, type FieldPayload } from "../lib/cardModel";
import { classify } from "../lib/payload";
import { wifiMeta, type WifiNetwork } from "../lib/wifi";
import { V1 } from "./contactCodes";

afterEach(cleanup);

const card = (text: string) =>
  render(
    <ResultCard
      code={{ text, format: "qrcode" }}
      onCopy={vi.fn(() => Promise.resolve())}
      onOpen={vi.fn(() => Promise.resolve())}
      onJoin={vi.fn(() => Promise.resolve())}
      onDismiss={vi.fn()}
    />,
  );

const text = (selector: string) => [...document.querySelectorAll(selector)].map((e) => e.textContent);

describe("a field card renders its model", () => {
  it.each([
    ["C1", V1],
    ["P1", "tel:+31201234567"],
    ["S1", "sms:+31201234567?body=Running%20late%3A%2010%20min"],
    ["S3", "sms:+31201234567"],
    ["G3", "geo:-33.8568,151.2153?q=Opera%20House"],
    ["G1", "geo:52.3731,4.8922"],
    ["X1", "geo:90.0001,0"],
    ["X8", "geo:90.0001,0?q=Somewhere"],
    ["A1", "geo:0,0?q=Rijksmuseum%20Amsterdam"],
  ])("%s", (_, code) => {
    const model = fieldCardModel(classify(code) as FieldPayload);
    card(code);
    expect(text(".meta")).toEqual([model.meta]);
    expect(text(".headline")).toEqual([model.headline]);
    expect(text(".field")).toEqual(model.fields.map(({ label, value }) => `${label}${value}Copy`));
    expect(text(".actions button")).toEqual([model.copyHeadline, ...(model.open ? [model.open.label] : [])]);
  });
});

describe("a Wi-Fi card renders wifiMeta", () => {
  it.each([
    ["WIFI:S:Home;T:WPA;P:pw;H:true;;", "Wi-Fi · WPA/WPA2 · hidden"],
    ["WIFI:S:Home;H:true;;", "Wi-Fi · open network · hidden"],
    ["WIFI:S:Home;T:sae;P:pw;;", "Wi-Fi · WPA3"],
  ])("%s is labelled %j", (code, meta) => {
    const network = classify(code) as { network: WifiNetwork };
    expect(wifiMeta(network.network)).toBe(meta);
    card(code);
    expect(screen.getByText(meta).className).toBe("meta");
  });
});
