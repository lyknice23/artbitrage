export interface Network {
  id: string;
  name: string;
  shortName: string;
  chainId: number;
  iconColor: string;
  gasToken: string;
  gasTokenPriceUsd: number;
  defaultGasPriceGwei: number;
  blockTimeSec: number;
  explorerUrl: string;
  rpcType: 'Public' | 'Flashbots Protect' | 'Private Bundler';
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  basePriceUsd: number;
  color: string;
  isStable?: boolean;
}

export interface DexInfo {
  id: string;
  name: string;
  protocol: string;
  feeTier: string;
  color: string;
  badgeBg: string;
  avgSlippagePercent: number;
  apiType: 'DEX_AGGREGATOR_API' | 'ONCHAIN_ROUTER_API' | 'RFQ_INTENT_API' | 'FLASH_SWAP_API';
  noAccountRequired: boolean; // Always true for DeFi permissionless APIs
  publicEndpoint?: string;
  contractAddress?: string;
  docsUrl?: string;
  supportedChains?: string[];
  description?: string;
}

export interface FlashLoanProvider {
  id: string;
  name: string;
  version: string;
  feePercent: number; // 0.05 for 0.05%
  feeDescription: string;
  maxBorrowCapUsd: number;
  supportedTokens: string[];
  color: string;
  contractAddress: string;
  apiType: 'POOL_FLASH_LOAN' | 'VAULT_FLASH_LOAN' | 'FLASH_SWAP' | 'FLASH_MINT' | 'MODULAR_VAULT';
  noAccountRequired: boolean; // Always true for DeFi smart contract flash loans
  contractInterface: string;
  standard: 'ERC-3156' | 'Aave-v3' | 'Balancer-Vault' | 'Uni-v3-Flash' | 'Uni-v2-Flash' | 'Morpho-Blue' | 'Euler-v2' | 'Maker-DssFlash' | 'Custom';
  docsUrl?: string;
  supportedChains?: string[];
  description?: string;
}

export interface ArbitrageOpportunity {
  id: string;
  networkId: string;
  tokenSymbol: string;
  quoteSymbol: string;
  loanProvider: string;
  loanAmount: number;
  loanValueUsd: number;
  flashLoanFeePercent: number;
  flashLoanFeeUsd: number;
  
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  
  spreadPercent: number;
  grossProfitUsd: number;
  gasUnits: number;
  gasPriceGwei: number;
  gasCostUsd: number;
  netProfitUsd: number;
  roiPercent: number;
  
  status: 'ACTIVE' | 'EXECUTING' | 'EXECUTED' | 'EXPIRED' | 'REVERTED';
  timestamp: number;
  routeType: 'DIRECT_2_DEX' | 'TRIANGULAR_3_DEX';
  routeSteps: string[];
  mevRiskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  confidenceScore: number;
}

export interface BotConfig {
  isRunning: boolean;
  autoExecute: boolean;
  minProfitThresholdUsd: number;
  minRoiPercent: number; // Minimum profit percentage
  maxSlippagePercent: number;
  gasPriceCeilingGwei: number;
  activeNetworkId: string;
  selectedProviders: string[];
  selectedDexes: string[]; // Preferred DEXs
  monitoredPairs: string[]; // Specified token pairs for monitoring e.g. ['WETH/USDC', 'WBTC/USDT']
  customPairs?: { base: string; quote: string }[];
  mevProtection: boolean;
  gasMultiplier: number;
  simulateReverts: boolean;
  soundEffects: boolean;
  scanIntervalMs: number;
}

export interface BotStats {
  totalScanned: number;
  totalOpportunitiesFound: number;
  totalExecuted: number;
  successfulTrades: number;
  failedTrades: number;
  totalNetProfitUsd: number;
  totalGasSpentUsd: number;
  totalVolumeProcessedUsd: number;
  avgExecutionLatencyMs: number;
  lastExecutionTimestamp: number | null;
}

export interface TradeLog {
  id: string;
  timestamp: number;
  opportunityId: string;
  networkId: string;
  tokenSymbol: string;
  quoteSymbol: string;
  borrowAmount: number;
  borrowAmountUsd: number;
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  flashLoanProvider: string;
  flashLoanFeeUsd: number;
  grossProfitUsd: number;
  gasCostUsd: number;
  netProfitUsd: number;
  status: 'SUCCESS' | 'REVERTED_SLIPPAGE' | 'FRONTRUN_DETECTED' | 'GAS_EXCEEDED';
  txHash: string;
  blockNumber: number;
  latencyMs: number;
  steps: {
    title: string;
    description: string;
    gasUsed: number;
    status: 'SUCCESS' | 'FAILED';
  }[];
}

export interface ProfitHistoryPoint {
  timestamp: number;
  timeLabel: string;
  pnl: number;
  cumulativeProfit: number;
  gasUsedUsd: number;
  pair: string;
}

export interface AiAuditResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  mevRisk: string;
  gasVerdict: string;
  recommendation: string;
  technicalNotes: string[];
  confidenceScore: number;
}
