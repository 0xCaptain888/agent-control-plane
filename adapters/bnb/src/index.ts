export type BnbNetwork = "bnb-testnet" | "bnb-mainnet";

export type BnbNetworkConfig = {
  network: BnbNetwork;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: "BNB";
};

export type JsonRpcRequest = { jsonrpc: "2.0"; id: number; method: string; params: unknown[] };
export type JsonRpcTransport = (request: JsonRpcRequest) => Promise<unknown>;
export type BnbTransactionReceipt = {
  transactionHash: string;
  blockNumber: string;
  status: "0x1" | "0x0";
  from?: string;
  to?: string | null;
  gasUsed?: string;
  logs?: unknown[];
};

export function createBnbTestnetConfig(rpcUrl = process.env.BNB_RPC_URL ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545"): BnbNetworkConfig {
  return { network: "bnb-testnet", chainId: 97, rpcUrl, explorerUrl: "https://testnet.bscscan.com", nativeCurrency: "BNB" };
}

export function assertSupportedNetwork(config: BnbNetworkConfig): void {
  if (config.network !== "bnb-testnet" || config.chainId !== 97) throw new Error("mainnet_execution_disabled_for_demo");
}

export class BnbRpcClient {
  private nextId = 1;
  constructor(readonly config: BnbNetworkConfig = createBnbTestnetConfig(), private readonly transport: JsonRpcTransport = fetchJsonRpc(config.rpcUrl)) {
    assertSupportedNetwork(config);
  }

  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    const result = await this.transport({ jsonrpc: "2.0", id: this.nextId++, method, params }) as { result?: T; error?: { code: number; message: string } };
    if (result.error) throw new Error(`bnb_rpc_error:${result.error.code}:${result.error.message}`);
    if (!("result" in result)) throw new Error("bnb_rpc_missing_result");
    return result.result as T;
  }

  chainId(): Promise<string> { return this.request<string>("eth_chainId"); }
  blockNumber(): Promise<string> { return this.request<string>("eth_blockNumber"); }
  clientVersion(): Promise<string> { return this.request<string>("web3_clientVersion"); }
  balance(address: string, blockTag = "latest"): Promise<string> { return this.request<string>("eth_getBalance", [address, blockTag]); }
  call(to: string, data: string, blockTag = "latest"): Promise<string> { return this.request<string>("eth_call", [{ to, data }, blockTag]); }
  transactionReceipt(txHash: string): Promise<BnbTransactionReceipt | null> { return this.request<BnbTransactionReceipt | null>("eth_getTransactionReceipt", [txHash]); }
  sendRawTransaction(rawTransaction: string): Promise<string> { return this.request<string>("eth_sendRawTransaction", [rawTransaction]); }

  async waitForTransactionReceipt(txHash: string, options: { pollMs?: number; timeoutMs?: number } = {}): Promise<BnbTransactionReceipt> {
    const pollMs = options.pollMs ?? 1500;
    const timeoutMs = options.timeoutMs ?? 30000;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const receipt = await this.transactionReceipt(txHash);
      if (receipt) return receipt;
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    throw new Error(`bnb_receipt_timeout:${txHash}`);
  }
}

function fetchJsonRpc(rpcUrl: string): JsonRpcTransport {
  return async (request) => {
    const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
    if (!response.ok) throw new Error(`bnb_rpc_http_error:${response.status}`);
    return response.json();
  };
}
