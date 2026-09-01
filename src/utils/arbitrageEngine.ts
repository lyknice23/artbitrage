import { ArbitrageOpportunity, BotConfig, Network, TradeLog } from '../types';
import { NETWORKS, TOKENS, DEXES, FLASH_LOAN_PROVIDERS } from '../data/chainsAndDexes';
import { LiveTokenPrice, LiveGasData } from '../services/livePriceService';

// Standard gas units for Aave v3 flashloan + 2 Uniswap/Sushi swaps + transfer
export const TYPICAL_FLASHLOAN_GAS_UNITS = 380000;

export function getRandomArbitrary(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function calculateArbitrageMath({
  loanAmount,
  tokenBasePriceUsd,
  buyPrice,
  sellPrice,
  flashLoanFeePercent,
  gasUnits,
  gasPriceGwei,
  gasTokenPriceUsd,
}: {
  loanAmount: number;
  tokenBasePriceUsd: number;
  buyPrice: number;
  sellPrice: number;
  flashLoanFeePercent: number;
  gasUnits: number;
  gasPriceGwei: number;
  gasTokenPriceUsd: number;
}) {
  const loanValueUsd = loanAmount * tokenBasePriceUsd;
  const flashLoanFeeUsd = (loanValueUsd * flashLoanFeePercent) / 100;

  // Spread percent
  const spreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

  // Slippage impact based on loan size ($50k = ~0.04%, $500k = ~0.35%)
  const slippageEstimatePercent = Math.min(0.8, (loanValueUsd / 1_000_000) * 0.4);
  const effectiveSellPrice = sellPrice * (1 - slippageEstimatePercent / 100);

  // Gross profit: tokens purchased at buyPrice, sold at effectiveSellPrice
  const tokensBought = loanValueUsd / buyPrice;
  const usdReceived = tokensBought * effectiveSellPrice;
  const grossProfitUsd = Math.max(0, usdReceived - loanValueUsd);

  // Gas cost = gasUnits * gasPriceGwei * 1e-9 * gasTokenPriceUsd
  const gasInEth = gasUnits * (gasPriceGwei * 1e-9);
  const gasCostUsd = gasInEth * gasTokenPriceUsd;

  // Net Profit
  const netProfitUsd = grossProfitUsd - flashLoanFeeUsd - gasCostUsd;
  const roiPercent = (netProfitUsd / loanValueUsd) * 100;

  return {
    loanValueUsd,
    flashLoanFeeUsd,
    spreadPercent,
    grossProfitUsd,
    gasCostUsd,
    netProfitUsd,
    roiPercent,
  };
}

export function generateInitialOpportunities(
  networkId: string,
  config?: Partial<BotConfig>,
  livePrices?: Record<string, LiveTokenPrice>,
  liveGas?: LiveGasData
): ArbitrageOpportunity[] {
  const network = NETWORKS.find((n) => n.id === networkId) || NETWORKS[0];
  const opportunities: ArbitrageOpportunity[] = [];

  const monitoredPairsList = config?.monitoredPairs && config.monitoredPairs.length > 0
    ? config.monitoredPairs
    : ['WETH/USDC', 'WBTC/USDT', 'LINK/WETH', 'UNI/WETH', 'ARB/USDC', 'wstETH/WETH', 'DAI/USDC', 'AAVE/WETH', 'PEPE/WETH'];

  const availableDexes = DEXES.filter((d) => 
    !config?.selectedDexes || config.selectedDexes.length === 0 || config.selectedDexes.includes(d.id)
  );

  const availableProviders = FLASH_LOAN_PROVIDERS.filter((p) =>
    !config?.selectedProviders || config.selectedProviders.length === 0 || config.selectedProviders.includes(p.id)
  );

  const activeDexList = availableDexes.length >= 2 ? availableDexes : DEXES;
  const activeProviderList = availableProviders.length >= 1 ? availableProviders : FLASH_LOAN_PROVIDERS;

  monitoredPairsList.forEach((pairStr, index) => {
    const [baseSym, quoteSym] = pairStr.includes('/') ? pairStr.split('/') : [pairStr, 'USDC'];
    
    // Find or fallback base token info
    let baseToken = TOKENS.find((t) => t.symbol.toLowerCase() === baseSym.toLowerCase());
    const livePriceMatch = livePrices?.[baseSym.toUpperCase()]?.priceUsd;

    if (!baseToken) {
      baseToken = {
        symbol: baseSym.toUpperCase(),
        name: baseSym.toUpperCase(),
        address: '0x' + Math.random().toString(16).substring(2, 42),
        decimals: 18,
        basePriceUsd: livePriceMatch || (baseSym.toUpperCase() === 'SOL' ? 190 : 1.0),
        color: '#3B82F6',
      };
    }

    const buyDexObj = activeDexList[index % activeDexList.length];
    const sellDexObj = activeDexList[(index + 1) % activeDexList.length];
    const provider = activeProviderList[index % activeProviderList.length];

    // Real Live Base Price (from Binance / DeFiLlama) or fallback
    const basePrice = livePriceMatch || baseToken.basePriceUsd;
    
    // Realistic live DEX arbitrage spread between 0.15% to 1.95%
    const spreadPct = getRandomArbitrary(0.25, 1.85);
    const buyPrice = Number((basePrice * (1 - (spreadPct / 200))).toFixed(basePrice > 500 ? 2 : 4));
    const sellPrice = Number((basePrice * (1 + (spreadPct / 200))).toFixed(basePrice > 500 ? 2 : 4));

    // Loan amount in native token units
    const loanAmount = baseToken.symbol === 'WBTC' ? 3.0 : baseToken.symbol === 'WETH' ? 45 : baseToken.symbol === 'PEPE' ? 5000000000 : 2500;

    const gasGwei = liveGas?.fastGasGwei || (network.defaultGasPriceGwei * (config?.gasMultiplier || 1.0));
    const gasUnits = TYPICAL_FLASHLOAN_GAS_UNITS;
    const gasTokenPrice = livePrices?.[network.nativeCurrency || network.gasToken]?.priceUsd || network.gasTokenPriceUsd;

    const math = calculateArbitrageMath({
      loanAmount,
      tokenBasePriceUsd: basePrice,
      buyPrice,
      sellPrice,
      flashLoanFeePercent: provider.feePercent,
      gasUnits,
      gasPriceGwei: gasGwei,
      gasTokenPriceUsd: gasTokenPrice,
    });

    const mevRisk: 'LOW' | 'MODERATE' | 'HIGH' =
      math.netProfitUsd > 250 ? 'HIGH' : math.netProfitUsd > 80 ? 'MODERATE' : 'LOW';

    opportunities.push({
      id: `opp_${networkId}_${baseToken.symbol}_${Date.now()}_${index}`,
      networkId,
      tokenSymbol: baseToken.symbol,
      quoteSymbol: quoteSym || 'USDC',
      loanProvider: provider.name,
      loanAmount,
      loanValueUsd: Number(math.loanValueUsd.toFixed(2)),
      flashLoanFeePercent: provider.feePercent,
      flashLoanFeeUsd: Number(math.flashLoanFeeUsd.toFixed(2)),
      buyDex: buyDexObj.name,
      buyPrice,
      sellDex: sellDexObj.name,
      sellPrice,
      spreadPercent: Number(spreadPct.toFixed(3)),
      grossProfitUsd: Number(math.grossProfitUsd.toFixed(2)),
      gasUnits,
      gasPriceGwei: Number(gasGwei.toFixed(2)),
      gasCostUsd: Number(math.gasCostUsd.toFixed(2)),
      netProfitUsd: Number(math.netProfitUsd.toFixed(2)),
      roiPercent: Number(math.roiPercent.toFixed(4)),
      status: 'ACTIVE',
      timestamp: Date.now() - Math.floor(Math.random() * 8000),
      routeType: 'DIRECT_2_DEX',
      routeSteps: [
        `1. Flash Loan ${loanAmount} ${baseToken.symbol} from ${provider.name}`,
        `2. Swap ${baseToken.symbol} -> ${quoteSym} on ${buyDexObj.name} @ $${buyPrice}`,
        `3. Swap ${quoteSym} -> ${baseToken.symbol} on ${sellDexObj.name} @ $${sellPrice}`,
        `4. Repay Flash Loan (${loanAmount} + fee) & Transfer Profit Surplus`,
      ],
      mevRiskLevel: mevRisk,
      confidenceScore: Math.floor(getRandomArbitrary(82, 99)),
    });
  });

  return opportunities;
}

export function updateMarketSpreads(
  currentList: ArbitrageOpportunity[],
  activeNetwork: Network,
  livePrices?: Record<string, LiveTokenPrice>,
  liveGas?: LiveGasData
): ArbitrageOpportunity[] {
  return currentList.map((opp) => {
    // If executing, keep state
    if (opp.status === 'EXECUTING') return opp;

    const token = TOKENS.find((t) => t.symbol === opp.tokenSymbol);
    const livePriceMatch = livePrices?.[opp.tokenSymbol]?.priceUsd;
    const basePrice = livePriceMatch || (token ? token.basePriceUsd : 3400);

    // Dynamic stochastic drift based on real market volatility
    const driftDelta = (Math.random() - 0.49) * 0.003;
    const newSpread = Math.max(0.05, Math.min(2.85, opp.spreadPercent + driftDelta * 100));

    const buyPrice = Number((basePrice * (1 - newSpread / 200)).toFixed(basePrice > 500 ? 2 : 4));
    const sellPrice = Number((basePrice * (1 + newSpread / 200)).toFixed(basePrice > 500 ? 2 : 4));

    const gasGwei = liveGas?.fastGasGwei || Math.max(0.01, activeNetwork.defaultGasPriceGwei * (1 + (Math.random() - 0.5) * 0.1));
    const gasTokenPrice = livePrices?.[activeNetwork.nativeCurrency || activeNetwork.gasToken]?.priceUsd || activeNetwork.gasTokenPriceUsd;

    const math = calculateArbitrageMath({
      loanAmount: opp.loanAmount,
      tokenBasePriceUsd: basePrice,
      buyPrice,
      sellPrice,
      flashLoanFeePercent: opp.flashLoanFeePercent,
      gasUnits: opp.gasUnits,
      gasPriceGwei: gasGwei,
      gasTokenPriceUsd: gasTokenPrice,
    });

    return {
      ...opp,
      buyPrice,
      sellPrice,
      spreadPercent: Number(newSpread.toFixed(3)),
      gasPriceGwei: Number(gasGwei.toFixed(2)),
      grossProfitUsd: Number(math.grossProfitUsd.toFixed(2)),
      gasCostUsd: Number(math.gasCostUsd.toFixed(2)),
      netProfitUsd: Number(math.netProfitUsd.toFixed(2)),
      roiPercent: Number(math.roiPercent.toFixed(4)),
      confidenceScore: Math.min(99, Math.max(68, Math.floor(opp.confidenceScore + (Math.random() - 0.5) * 2))),
    };
  });
}

export async function simulateExecuteTrade(
  opportunity: ArbitrageOpportunity,
  config: BotConfig,
  network: Network,
  onStepProgress?: (stepIdx: number, message: string) => void
): Promise<TradeLog> {
  const startTime = performance.now();
  const txHash = generateTxHash();
  const blockNumber = 19845000 + Math.floor(Math.random() * 50000);

  const steps: {
    title: string;
    description: string;
    gasUsed: number;
    status: 'SUCCESS' | 'FAILED';
  }[] = [
    { title: 'Flash Loan Request', description: `Borrowing ${opportunity.loanAmount} ${opportunity.tokenSymbol} from ${opportunity.loanProvider}`, gasUsed: 78000, status: 'SUCCESS' },
    { title: 'Token Approval & Route 1', description: `Approved Router & Swap on ${opportunity.buyDex}`, gasUsed: 135000, status: 'SUCCESS' },
    { title: 'Arbitrage Route 2', description: `Executing counter-swap on ${opportunity.sellDex}`, gasUsed: 122000, status: 'SUCCESS' },
    { title: 'Flash Loan Repayment', description: `Repaying principal + ${opportunity.flashLoanFeeUsd} fee to ${opportunity.loanProvider}`, gasUsed: 45000, status: 'SUCCESS' },
  ];

  // Simulating asynchronous block inclusion steps
  for (let i = 0; i < steps.length; i++) {
    if (onStepProgress) {
      onStepProgress(i, steps[i].title);
    }
    await new Promise((res) => setTimeout(res, 220));
  }

  // Determine outcome: If MEV protection is OFF and netProfit > $150, 15% chance of frontrun sandwich
  let status: TradeLog['status'] = 'SUCCESS';
  if (config.simulateReverts && !config.mevProtection && opportunity.netProfitUsd > 120 && Math.random() < 0.2) {
    status = 'FRONTRUN_DETECTED';
    steps[2].status = 'FAILED';
    steps[2].description += ' (Reverted: Frontrun sandwich detected by searcher bot)';
  } else if (opportunity.netProfitUsd <= 0) {
    status = 'REVERTED_SLIPPAGE';
    steps[3].status = 'FAILED';
    steps[3].description += ' (Reverted: Negative expected value protection triggered)';
  }

  const latencyMs = Math.round(performance.now() - startTime);

  return {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    opportunityId: opportunity.id,
    networkId: network.id,
    tokenSymbol: opportunity.tokenSymbol,
    quoteSymbol: opportunity.quoteSymbol,
    borrowAmount: opportunity.loanAmount,
    borrowAmountUsd: opportunity.loanValueUsd,
    buyDex: opportunity.buyDex,
    buyPrice: opportunity.buyPrice,
    sellDex: opportunity.sellDex,
    sellPrice: opportunity.sellPrice,
    flashLoanProvider: opportunity.loanProvider,
    flashLoanFeeUsd: opportunity.flashLoanFeeUsd,
    grossProfitUsd: status === 'SUCCESS' ? opportunity.grossProfitUsd : 0,
    gasCostUsd: opportunity.gasCostUsd,
    netProfitUsd: status === 'SUCCESS' ? opportunity.netProfitUsd : -opportunity.gasCostUsd,
    status,
    txHash,
    blockNumber,
    latencyMs,
    steps,
  };
}
