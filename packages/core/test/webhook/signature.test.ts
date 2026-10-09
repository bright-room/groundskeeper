import { describe, expect, it } from "vitest";
import { verifySignature } from "../../src/webhook/signature";
import { sign as signWith } from "../helpers/sign";

const SECRET = "s3cret";
const BODY = '{"hello":"world"}';
const sign = (body: string, secret = SECRET) => signWith(secret, body);

describe("verifySignature", () => {
  it("正しい署名を受け入れる", async () => {
    expect(await verifySignature(SECRET, BODY, await sign(BODY))).toBe(true);
  });

  it("別の secret の署名を拒否する", async () => {
    expect(await verifySignature(SECRET, BODY, await sign(BODY, "other"))).toBe(false);
  });

  it("改ざんされた本文を拒否する", async () => {
    expect(await verifySignature(SECRET, `${BODY} `, await sign(BODY))).toBe(false);
  });

  it("ヘッダーなし・形式不正を拒否する", async () => {
    expect(await verifySignature(SECRET, BODY, null)).toBe(false);
    expect(await verifySignature(SECRET, BODY, "sha1=abc")).toBe(false);
  });
});
