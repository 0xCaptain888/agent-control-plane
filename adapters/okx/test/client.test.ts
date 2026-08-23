import test from "node:test";
import assert from "node:assert/strict";
import { OkxRestClient } from "../src/index.js";

test("OKX REST client signs demo requests and remembers instId", async () => {
  const requests: Request[] = [];
  const client = new OkxRestClient({
    apiKey: "key",
    secretKey: "secret",
    passphrase: "pass",
    demoTrading: true,
    now: () => new Date("2026-08-23T00:00:00.000Z"),
    fetchImpl: async (input, init) => {
      requests.push(new Request(input, init));
      const body = requests.length === 1
        ? { code: "0", msg: "", data: [{ ordId: "123", sCode: "0", sMsg: "" }] }
        : { code: "0", msg: "", data: [{ ordId: "123", state: "filled", avgPx: "100", accFillSz: "1" }] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }
  });

  const order = await client.placeOrder({ instId: "BTC-USDT", tdMode: "cash", side: "buy", ordType: "market", sz: "1" });
  const status = await client.getOrder(order.orderId);
  assert.equal(order.orderId, "123");
  assert.equal(status.state, "filled");
  assert.equal(requests[0].headers.get("x-simulated-trading"), "1");
  assert.ok(requests[0].headers.get("OK-ACCESS-SIGN"));
  assert.match(requests[1].url, /instId=BTC-USDT/);
});
