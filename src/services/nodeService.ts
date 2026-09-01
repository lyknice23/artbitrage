/**
 * Dedicated Low-Latency RPC Node Service
 * Supports Alchemy, QuickNode, Infura, Flashbots Protect, and Custom RPCs
 * with User API Key Configuration, Persistence, and Real-Time Latency Testing.
 */

import { ethers } from 'ethers';

export type RpcProviderType = 'public' | 'alchemy' | 'quicknode' | 'infura' | 'flashbots_fast' | 'flashbots_mev_share' | 'custom';

export interface NodeConfig {
  providerType: RpcProviderType;
  alchemyApiKey: string;
  quicknodeEndpoint: string;
  infuraProjectId: string;
  customRpcUrl: string;
  activeNetworkId: string;
  etherscanApiKey?: string;
  coingeckoApiKey?: string;
}

export interface NodeLatencyResult {
  url: string;
  providerType: RpcProviderType;
  latencyMs: number;
  blockNumber: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  error?: string;
}

const STORAGE_KEY = 'arbi_tech_node_config_v2';

export const DEFAULT_NODE_CONFIG: NodeConfig = {
  providerType: 'flashbots_fast',
  alchemyApiKey: '',
  quicknodeEndpoint: '',
  infuraProjectId: '',
  customRpcUrl: '',
  activeNetworkId: 'ethereum',
  etherscanApiKey: '',
  coingeckoApiKey: '',
};

// Fallback Public RPCs by Network
export const PUBLIC_FALLBACK_RPCS: Record<string, string> = {
  ethereum: 'https://cloudflare-eth.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  optimism: 'https://mainnet.optimism.io',
  base: 'https://mainnet.base.org',
  bsc: 'https://bsc-dataseed.binance.org',
};

// Chain ID Map
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  base: 8453,
  bsc: 56,
};

// Load saved config from localStorage
export function loadNodeConfig(): NodeConfig {
  if (typeof window === 'undefined') return DEFAULT_NODE_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NODE_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to read node config from localStorage:', e);
  }
  return DEFAULT_NODE_CONFIG;
}

// Save config to localStorage
export function saveNodeConfig(config: NodeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save node config to localStorage:', e);
  }
}

/**
 * Resolve the active RPC endpoint URL based on current provider selection and network
 */
export function getActiveRpcUrl(networkId: string = 'ethereum', customConfig?: NodeConfig): string {
  const config = customConfig || loadNodeConfig();
  const net = networkId.toLowerCase();

  switch (config.providerType) {
    case 'alchemy': {
      const key = config.alchemyApiKey.trim();
      if (!key) return PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;
      switch (net) {
        case 'ethereum':
          return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
        case 'arbitrum':
          return `https://arb-mainnet.g.alchemy.com/v2/${key}`;
        case 'polygon':
          return `https://polygon-mainnet.g.alchemy.com/v2/${key}`;
        case 'optimism':
          return `https://opt-mainnet.g.alchemy.com/v2/${key}`;
        case 'base':
          return `https://base-mainnet.g.alchemy.com/v2/${key}`;
        default:
          return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
      }
    }

    case 'quicknode': {
      const endpoint = config.quicknodeEndpoint.trim();
      return endpoint || PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;
    }

    case 'infura': {
      const proj = config.infuraProjectId.trim();
      if (!proj) return PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;
      switch (net) {
        case 'ethereum':
          return `https://mainnet.infura.io/v3/${proj}`;
        case 'arbitrum':
          return `https://arbitrum-mainnet.infura.io/v3/${proj}`;
        case 'polygon':
          return `https://polygon-mainnet.infura.io/v3/${proj}`;
        case 'optimism':
          return `https://optimism-mainnet.infura.io/v3/${proj}`;
        case 'base':
          return `https://base-mainnet.infura.io/v3/${proj}`;
        default:
          return `https://mainnet.infura.io/v3/${proj}`;
      }
    }

    case 'flashbots_fast':
      if (net === 'ethereum') return 'https://rpc.flashbots.net/fast';
      return PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;

    case 'flashbots_mev_share':
      if (net === 'ethereum') return 'https://mev-share.flashbots.net';
      return PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;

    case 'custom': {
      const custom = config.customRpcUrl.trim();
      return custom || PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;
    }

    case 'public':
    default:
      return PUBLIC_FALLBACK_RPCS[net] || PUBLIC_FALLBACK_RPCS.ethereum;
  }
}

/**
 * Returns an ethers JsonRpcProvider configured with the active low-latency node
 */
export function getActiveRpcProvider(networkId: string = 'ethereum'): ethers.JsonRpcProvider {
  const url = getActiveRpcUrl(networkId);
  return new ethers.JsonRpcProvider(url);
}

/**
 * Ping and measure real response latency (ms) and current block number of an RPC URL
 */
export async function testNodeLatency(rpcUrl: string, providerType: RpcProviderType): Promise<NodeLatencyResult> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: Date.now(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const end = performance.now();
    const latencyMs = Math.round(end - start);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'RPC returned JSON-RPC error');
    }

    const blockNumber = parseInt(data.result, 16) || 0;

    return {
      url: rpcUrl,
      providerType,
      latencyMs,
      blockNumber,
      status: latencyMs < 120 ? 'ONLINE' : 'DEGRADED',
    };
  } catch (err: any) {
    const end = performance.now();
    return {
      url: rpcUrl,
      providerType,
      latencyMs: Math.round(end - start),
      blockNumber: 0,
      status: 'OFFLINE',
      error: err.name === 'AbortError' ? 'Timeout (RPC unresponsive >4.5s)' : err.message || 'Connection failed',
    };
  }
}
