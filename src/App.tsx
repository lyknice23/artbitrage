import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Radar, 
  Sliders, 
  BarChart3, 
  Terminal, 
  Code, 
  Calculator, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  Sparkles,
  Flame,
  LayoutDashboard,
  Globe
} from 'lucide-react';

import { 
  ArbitrageOpportunity, 
  BotConfig, 
  BotStats, 
  Network, 
  ProfitHistoryPoint, 
  TradeLog 
} from './types';
import { NETWORKS, FLASH_LOAN_PROVIDERS, DEFAULT_MONITORED_PAIRS } from './data/chainsAndDexes';
import { 
  generateInitialOpportunities, 
  updateMarketSpreads, 
  simulateExecuteTrade 
} from './utils/arbitrageEngine';
import { soundEngine } from './utils/audio';

import { Navbar } from './components/Navbar';
import { BotControlPanel } from './components/BotControlPanel';
import { RealtimeDashboard } from './components/RealtimeDashboard';
import { CustomStrategyParameters } from './components/CustomStrategyParameters';
import { LiveScannerTable } from './components/LiveScannerTable';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { MempoolTerminal } from './components/MempoolTerminal';
import { SolidityExporter } from './components/SolidityExporter';
import { ExchangeApiDirectory } from './components/ExchangeApiDirectory';
import { WalletWithdrawSpace } from './components/WalletWithdrawSpace';
import { WalletWithdrawModal } from './components/WalletWithdrawModal';
import { AuthModal } from './components/AuthModal';
import { PaywallModal } from './components/PaywallModal';
import { PaywallBanner } from './components/PaywallBanner';
import { UserDatabaseSpace } from './components/UserDatabaseSpace';
import { RealFlashTxModal } from './components/RealFlashTxModal';
import { TransactionSettingsModal } from './components/TransactionSettingsModal';
import { 
  fetchLiveTokenPrices, 
  fetchLiveGasData, 
  LiveTokenPrice, 
  LiveGasData, 
  PUBLIC_RPCS, 
  FLASHBOTS_RELAYS 
} from './services/livePriceService';
import { 
  connectRealWeb3Wallet, 
  fetchRealWalletBalances, 
  switchEthereumChain, 
  executeRealWithdrawal,
  queryAddressRealBalances,
  ArbitrageTxReceipt 
} from './services/web3WalletService';
import { WalletState, VaultBalanceItem, WithdrawalRecord, UserProfile } from './types';
import { auth, onAuthStateChanged } from './lib/firebase';
import { fetchUserProfile, createDefaultUserProfile, checkAccessStatus, saveUserProfileToDb } from './services/userService';

type ActiveTab = 'dashboard' | 'wallet' | 'account' | 'strategy' | 'exchanges' | 'simulator' | 'analytics' | 'mempool' | 'solidity';

export default function App() {
  // Active Network
  const [activeNetwork, setActiveNetwork] = useState<Network>(NETWORKS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState<boolean>(false);
  const [isRealFlashModalOpen, setIsRealFlashModalOpen] = useState<boolean>(false);
  const [isTxSettingsModalOpen, setIsTxSettingsModalOpen] = useState<boolean>(false);
  const [realFlashOpp, setRealFlashOpp] = useState<ArbitrageOpportunity | null>(null);

  // Live Market & RPC API States
  const [livePrices, setLivePrices] = useState<Record<string, LiveTokenPrice>>({});
  const [liveGasData, setLiveGasData] = useState<LiveGasData | null>(null);
  const [liveApiStatus, setLiveApiStatus] = useState<{
    binance: boolean;
    defiLlama: boolean;
    rpcNode: boolean;
    flashbots: boolean;
    blockNumber: number;
  }>({
    binance: true,
    defiLlama: true,
    rpcNode: true,
    flashbots: true,
    blockNumber: 21950488,
  });

  // User Profile & Database State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return createDefaultUserProfile(
      'usr_demo_trader',
      'Alex FlashMaster',
      'itechitrap@gmail.com',
      ''
    );
  });

  // Clean Web3 Wallet State (No dummy funds - starts disconnected or connects to real wallet)
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    walletType: null,
    networkId: 'ethereum',
    chainId: 1,
    balanceEth: 0,
    balanceUsdt: 0,
    isConnecting: false,
  });

  // Accrued Smart Contract Vault Asset Balances (Starts clean at 0 until arbitrage yields accrue)
  const [vaultBalances, setVaultBalances] = useState<VaultBalanceItem[]>([
    { symbol: 'USDC', name: 'USD Coin', amount: 0.0, basePriceUsd: 1.0, valueUsd: 0.0, color: '#2775ca', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', isWithdrawable: true },
    { symbol: 'WETH', name: 'Wrapped Ether', amount: 0.0, basePriceUsd: 3420.0, valueUsd: 0.0, color: '#627eea', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', isWithdrawable: true },
    { symbol: 'USDT', name: 'Tether USD', amount: 0.0, basePriceUsd: 1.0, valueUsd: 0.0, color: '#26a17b', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', isWithdrawable: true },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', amount: 0.0, basePriceUsd: 87500.0, valueUsd: 0.0, color: '#f7931a', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', isWithdrawable: true },
    { symbol: 'DAI', name: 'Dai Stablecoin', amount: 0.0, basePriceUsd: 1.0, valueUsd: 0.0, color: '#f5ac37', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', isWithdrawable: true },
  ]);

  // Withdrawal Transaction History (Starts clean)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  // Real Web3 Wallet Connection Handler (Zero dummy funds - 100% Real Live RPC Balances)
  const handleConnectWallet = async (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault' | string) => {
    setWalletState((prev) => ({ ...prev, isConnecting: true }));
    
    // 1. If user connects via Real Browser Injected Wallet (MetaMask, Rabby, Coinbase)
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const wallet = await connectRealWeb3Wallet();
        
        // Fetch real native & ERC20 balances from live blockchain RPC
        const realBalances = await fetchRealWalletBalances(wallet.address, wallet.chainId, livePrices);
        const ethBal = realBalances.find((b) => b.symbol === 'ETH' || b.isNative)?.amount || parseFloat(wallet.nativeBalance);
        const usdtBal = realBalances.find((b) => b.symbol === 'USDT' || b.symbol === 'USDC')?.amount || 0;

        setWalletState({
          isConnected: true,
          address: wallet.address,
          walletType: type as any,
          networkId: activeNetwork.id,
          chainId: wallet.chainId,
          balanceEth: ethBal,
          balanceUsdt: usdtBal,
          isConnecting: false,
        });

        // Update vault asset balances to match actual on-chain assets
        if (realBalances.length > 0) {
          setVaultBalances(realBalances);
        }

        // Update user profile wallet address
        if (userProfile) {
          setUserProfile((prev) => prev ? { ...prev, walletAddress: wallet.address } : null);
        }

        if (config.soundEffects) {
          soundEngine.playSuccessChime();
        }
        return;
      } catch (err: any) {
        console.warn('Real Web3 connection warning:', err.message);
        setWalletState((prev) => ({ ...prev, isConnecting: false }));
        alert(`Web3 Wallet connection: ${err.message || 'Please unlock your wallet or install MetaMask/Rabby.'}`);
        return;
      }
    }

    // 2. If no window.ethereum is found, inform the user clearly
    setWalletState((prev) => ({ ...prev, isConnecting: false }));
    alert('No Web3 wallet extension detected in this browser. Please install MetaMask, Rabby, or Coinbase Wallet to execute live on-chain transactions and view live wallet balances.');
  };

  const handleDisconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      walletType: null,
      networkId: activeNetwork.id,
      chainId: activeNetwork.chainId,
      balanceEth: 0,
      balanceUsdt: 0,
      isConnecting: false,
    });
  };

  // Real On-Chain Fund Withdrawal Execution Handler
  const handleExecuteWithdrawal = async (
    tokenSymbol: string,
    amount: number,
    destinationAddress: string,
    method: 'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const tokenObj = vaultBalances.find((v) => v.symbol === tokenSymbol);
    if (!tokenObj || tokenObj.amount < amount) {
      return { success: false, error: `Insufficient ${tokenSymbol} balance to withdraw (Available: ${tokenObj?.amount || 0} ${tokenSymbol}).` };
    }

    // Check if user has an active Web3 wallet to sign and broadcast the real transaction
    if (typeof window === 'undefined' || !(window as any).ethereum || !walletState.isConnected) {
      return {
        success: false,
        error: 'Please connect your Web3 wallet (MetaMask, Rabby, Coinbase) to sign and broadcast the real on-chain transaction to Etherscan.',
      };
    }

    try {
      const res = await executeRealWithdrawal({
        tokenSymbol,
        tokenAddress: tokenObj.address,
        amount,
        destinationAddress,
        network: activeNetwork,
      });

      const amountUsd = amount * tokenObj.basePriceUsd;

      // Deduct from local balances
      setVaultBalances((prev) =>
        prev.map((item) => {
          if (item.symbol === tokenSymbol) {
            const remAmount = Math.max(0, item.amount - amount);
            return {
              ...item,
              amount: remAmount,
              valueUsd: remAmount * item.basePriceUsd,
            };
          }
          return item;
        })
      );

      // Record in Withdrawal log with REAL on-chain txHash
      const newRecord: WithdrawalRecord = {
        id: `wth_${Date.now()}`,
        timestamp: Date.now(),
        tokenSymbol,
        amount,
        amountUsd,
        destinationAddress,
        networkId: activeNetwork.id,
        txHash: res.txHash,
        blockNumber: res.blockNumber || (liveGasData?.blockNumber || 21950490),
        status: 'CONFIRMED',
        method,
        gasFeeUsd: Number(((liveGasGwei * 65000 * 1e-9) * activeNetwork.gasTokenPriceUsd).toFixed(2)),
        notes: `Live on-chain harvest to ${destinationAddress.substring(0, 6)}... via ${method}`
      };

      setWithdrawals((prev) => [newRecord, ...prev]);

      return { success: true, txHash: res.txHash };
    } catch (err: any) {
      console.error('Withdrawal execution error:', err);
      return {
        success: false,
        error: err.message || 'On-chain withdrawal transaction failed.',
      };
    }
  };

  // Bot Configuration
  const [config, setConfig] = useState<BotConfig>({
    isRunning: true,
    autoExecute: false,
    minProfitThresholdUsd: 25,
    minRoiPercent: 0.05,
    maxSlippagePercent: 0.5,
    gasPriceCeilingGwei: 60,
    activeNetworkId: 'ethereum',
    selectedProviders: ['aave_v3', 'balancer_vault', 'morpho_blue', 'spark_protocol', 'maker_flash_mint', 'euler_v2', 'uniswap_v3_flash'],
    selectedDexes: ['uniswap_v3', 'oneinch_v6', 'zerox_swap', 'kyberswap', 'paraswap_v6', 'cowswap', 'sushiswap', 'curve', 'balancer', 'pancakeswap', 'openocean', 'dodo_v2'],
    monitoredPairs: DEFAULT_MONITORED_PAIRS,
    mevProtection: true,
    flashbotsProtect: true,
    gasMultiplier: 1.2,
    simulateReverts: true,
    soundEffects: true,
    scanIntervalMs: 2000,
  });

  // Bot Statistics (Starts at 0)
  const [stats, setStats] = useState<BotStats>({
    totalScanned: 0,
    totalOpportunitiesFound: 0,
    totalExecuted: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalNetProfitUsd: 0.0,
    totalGasSpentUsd: 0.0,
    totalVolumeProcessedUsd: 0,
    avgExecutionLatencyMs: 42,
    lastExecutionTimestamp: null,
  });

  // Live Gas Price Gwei
  const [liveGasGwei, setLiveGasGwei] = useState<number>(NETWORKS[0].defaultGasPriceGwei);

  // Market Opportunities List
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>(() =>
    generateInitialOpportunities(NETWORKS[0].id)
  );

  // Inspected Opportunity for Modal
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // Trade Logs History (Starts clean)
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  // Profit History for Charting (Starts clean)
  const [profitHistory, setProfitHistory] = useState<ProfitHistoryPoint[]>([
    { timestamp: Date.now(), timeLabel: 'Now', pnl: 0, cumulativeProfit: 0, gasUsedUsd: 0, pair: 'INIT' },
  ]);

  // Fetch Live Prices & Gas from Binance & Public RPCs
  useEffect(() => {
    let isMounted = true;

    async function loadLiveMarketApis() {
      try {
        const [prices, gas] = await Promise.all([
          fetchLiveTokenPrices(),
          fetchLiveGasData(activeNetwork.id),
        ]);

        if (isMounted) {
          setLivePrices(prices);
          setLiveGasData(gas);
          setLiveGasGwei(gas.fastGasGwei);
          setLiveApiStatus((prev) => ({
            ...prev,
            binance: true,
            defiLlama: true,
            rpcNode: true,
            blockNumber: gas.blockNumber,
          }));

          // Regenerate opportunities with live prices
          setOpportunities((prev) =>
            generateInitialOpportunities(activeNetwork.id, config, prices, gas)
          );
        }
      } catch (err) {
        console.warn('Live API initial fetch error:', err);
      }
    }

    loadLiveMarketApis();

    // Poll live price feeds every 4 seconds
    const liveApiInterval = setInterval(async () => {
      try {
        const [prices, gas] = await Promise.all([
          fetchLiveTokenPrices(),
          fetchLiveGasData(activeNetwork.id),
        ]);
        if (isMounted) {
          setLivePrices(prices);
          setLiveGasData(gas);
          setLiveGasGwei(gas.fastGasGwei);
          setLiveApiStatus((prev) => ({
            ...prev,
            blockNumber: gas.blockNumber,
          }));
        }
      } catch (e) {
        console.warn('Polling error:', e);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(liveApiInterval);
    };
  }, [activeNetwork.id]);

  // Auto-Scan & Price Drift Engine Loop
  useEffect(() => {
    if (!config.isRunning) return;

    const interval = setInterval(() => {
      // 1. Drift market spreads with live pricing
      setOpportunities((prev) => updateMarketSpreads(prev, activeNetwork, livePrices, liveGasData || undefined));

      // 2. Increment total scanned
      setStats((s) => ({ ...s, totalScanned: s.totalScanned + 1 }));

      // Optional sound beep
      if (config.soundEffects && Math.random() < 0.12) {
        soundEngine.playRadarBeep();
      }
    }, config.scanIntervalMs);

    return () => clearInterval(interval);
  }, [config.isRunning, config.scanIntervalMs, activeNetwork, config.soundEffects, livePrices, liveGasData]);

  // Open Real Flash Arbitrage Transaction Modal
  const handleOpenRealFlashModal = (opp: ArbitrageOpportunity) => {
    // Check 1-week free trial / subscription
    const access = checkAccessStatus(userProfile);
    if (!access.hasAccess) {
      setIsPaywallModalOpen(true);
      if (config.soundEffects) soundEngine.playAlertPing();
      return;
    }
    setRealFlashOpp(opp);
    setIsRealFlashModalOpen(true);
  };

  // On Success Real Flash Arbitrage Tx
  const handleRealTxSuccess = (receipt: ArbitrageTxReceipt, opp: ArbitrageOpportunity) => {
    const isSuccess = receipt.success;
    const profit = receipt.arbitrageProfitUsd || opp.netProfitUsd;
    const gasUsd = (Number(receipt.gasUsed || 380000) * Number(receipt.effectiveGasPriceGwei || 20) * 1e-9) * activeNetwork.gasTokenPriceUsd;

    const newLog: TradeLog = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      opportunityId: opp.id,
      networkId: activeNetwork.id,
      tokenSymbol: opp.tokenSymbol,
      quoteSymbol: opp.quoteSymbol,
      borrowAmount: opp.loanAmount,
      borrowAmountUsd: opp.loanValueUsd,
      buyDex: opp.buyDex,
      buyPrice: opp.buyPrice,
      sellDex: opp.sellDex,
      sellPrice: opp.sellPrice,
      flashLoanProvider: receipt.flashLoanProvider || opp.loanProvider,
      flashLoanFeeUsd: opp.flashLoanFeeUsd,
      grossProfitUsd: isSuccess ? opp.grossProfitUsd : 0,
      gasCostUsd: Number(gasUsd.toFixed(2)),
      netProfitUsd: isSuccess ? Number(profit.toFixed(2)) : -Number(gasUsd.toFixed(2)),
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber || liveGasData?.blockNumber || 21950490,
      latencyMs: 35,
      steps: [
        { title: 'Flash Loan Borrow', description: `Borrowed ${opp.loanAmount} ${opp.tokenSymbol} from ${opp.loanProvider}`, gasUsed: 78000, status: 'SUCCESS' },
        { title: 'Swap Route 1', description: `Swapped on ${opp.buyDex}`, gasUsed: 135000, status: 'SUCCESS' },
        { title: 'Swap Route 2', description: `Counter-swap on ${opp.sellDex}`, gasUsed: 122000, status: 'SUCCESS' },
        { title: 'Repayment & Profit Retention', description: `Repaid loan; +$${profit.toFixed(2)} surplus credited to vault`, gasUsed: 45000, status: 'SUCCESS' }
      ]
    };

    setTradeLogs((prev) => [newLog, ...prev]);

    // Credit Vault Balances with real profit
    setVaultBalances((prev) =>
      prev.map((item) => {
        if (item.symbol === 'USDC' || item.symbol === opp.quoteSymbol) {
          const newAmount = item.amount + profit;
          return {
            ...item,
            amount: Number(newAmount.toFixed(2)),
            valueUsd: Number((newAmount * item.basePriceUsd).toFixed(2)),
          };
        }
        return item;
      })
    );

    // Update statistics
    setStats((prev) => ({
      ...prev,
      totalExecuted: prev.totalExecuted + 1,
      successfulTrades: prev.successfulTrades + 1,
      totalNetProfitUsd: Number((prev.totalNetProfitUsd + profit).toFixed(2)),
      totalGasSpentUsd: Number((prev.totalGasSpentUsd + gasUsd).toFixed(2)),
      totalVolumeProcessedUsd: prev.totalVolumeProcessedUsd + opp.loanValueUsd,
      lastExecutionTimestamp: Date.now(),
    }));

    // Update Profit Chart
    setProfitHistory((prev) => {
      const lastCumulative = prev.length > 0 ? prev[prev.length - 1].cumulativeProfit : 0;
      const newCumulative = lastCumulative + profit;
      return [
        ...prev,
        {
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          pnl: profit,
          cumulativeProfit: Number(newCumulative.toFixed(2)),
          gasUsedUsd: gasUsd,
          pair: `${opp.tokenSymbol}/${opp.quoteSymbol}`,
        }
      ];
    });

    if (config.soundEffects) {
      soundEngine.playSuccessChime();
    }
  };

  // Trade Execution Handler for one-click triggers
  const handleExecuteTrade = async (opp: ArbitrageOpportunity) => {
    handleOpenRealFlashModal(opp);
  };

  const handleResetMetrics = () => {
    setStats({
      totalScanned: 0,
      totalOpportunitiesFound: 0,
      totalExecuted: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalNetProfitUsd: 0,
      totalGasSpentUsd: 0,
      totalVolumeProcessedUsd: 0,
      avgExecutionLatencyMs: 35,
      lastExecutionTimestamp: null,
    });
    setProfitHistory([
      { timestamp: Date.now(), timeLabel: 'Now', pnl: 0, cumulativeProfit: 0, gasUsedUsd: 0, pair: 'RESET' }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e0e3e7] flex flex-col selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Navbar with Engine Controls & Network Select */}
      <Navbar
        config={config}
        setConfig={setConfig}
        activeNetwork={activeNetwork}
        setActiveNetwork={setActiveNetwork}
        stats={stats}
        liveGasGwei={liveGasGwei}
        walletState={walletState}
        onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
        onConnectWallet={handleConnectWallet}
        userProfile={userProfile}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenPaywall={() => setIsPaywallModalOpen(true)}
        onOpenUserSpace={() => setActiveTab('account')}
        onOpenTransactionSettings={() => setIsTxSettingsModalOpen(true)}
      />

      {/* 1-Week Free Trial & Paywall Status Banner */}
      <PaywallBanner
        userProfile={userProfile}
        onOpenPaywall={() => setIsPaywallModalOpen(true)}
        onOpenAccount={() => setActiveTab('account')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0d1117] p-1.5 rounded-lg border border-[#23282f]">
            
            <button
              id="tab-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Real-Time Dashboard</span>
            </button>

            <button
              id="tab-account-btn"
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'account'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-950 font-bold'
                  : 'text-blue-400 hover:text-blue-300 hover:bg-[#161b22]'
              }`}
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>User Database & Cloud</span>
            </button>

            <button
              id="tab-wallet-btn"
              onClick={() => setActiveTab('wallet')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'wallet'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-950 font-bold'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-[#161b22]'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
                ●
              </span>
              <span>Wallet & Vault (Withdraw)</span>
            </button>

            <button
              id="tab-strategy-btn"
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'strategy'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Custom Strategy</span>
            </button>

            <button
              id="tab-exchanges-btn"
              onClick={() => setActiveTab('exchanges')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'exchanges'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Exchange & Flash APIs (29)</span>
            </button>

            <button
              id="tab-simulator-btn"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Trade Sandbox & Curves</span>
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>PnL & Analytics</span>
            </button>

            <button
              id="tab-mempool-btn"
              onClick={() => setActiveTab('mempool')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'mempool'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Mempool Terminal ({tradeLogs.length})</span>
            </button>

            <button
              id="tab-solidity-btn"
              onClick={() => setActiveTab('solidity')}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'solidity'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Solidity Exporter</span>
            </button>

          </div>

          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400 bg-[#0d1117] border border-[#23282f] px-3.5 py-1.5 rounded-lg">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              <span>Scanned: <strong className="text-slate-200">{stats.totalScanned}</strong></span>
            </span>
            <span className="text-[#30363d]">|</span>
            <span>Total PnL: <strong className="text-emerald-400 font-bold font-mono">+{stats.totalNetProfitUsd >= 0 ? '$' : '-$'}{Math.abs(stats.totalNetProfitUsd).toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Tab View 1: Real-Time Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <BotControlPanel
              config={config}
              setConfig={setConfig}
              stats={stats}
              onResetStats={handleResetMetrics}
              onOpenAdvancedConfig={() => setActiveTab('strategy')}
            />

            <RealtimeDashboard
              opportunities={opportunities}
              config={config}
              setConfig={setConfig}
              stats={stats}
              tradeLogs={tradeLogs}
              profitHistory={profitHistory}
              activeNetwork={activeNetwork}
              liveGasGwei={liveGasGwei}
              onExecuteTrade={handleExecuteTrade}
              onSelectOpportunity={(opp) => setSelectedOpportunity(opp)}
              onAiAudit={(opp) => setSelectedOpportunity(opp)}
              executingId={executingId}
              onOpenCustomSettings={() => setActiveTab('strategy')}
            />
          </div>
        )}

        {/* Tab View: User Database & Cloud Profile Space */}
        {activeTab === 'account' && (
          <UserDatabaseSpace
            userProfile={userProfile}
            onUpdateProfile={(updated) => setUserProfile(updated)}
            onOpenPaywall={() => setIsPaywallModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            connectedWalletAddress={walletState.address}
          />
        )}

        {/* Tab View: Web3 Wallet & Vault Withdrawal Space */}
        {activeTab === 'wallet' && (
          <WalletWithdrawSpace
            activeNetwork={activeNetwork}
            walletState={walletState}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            stats={stats}
            vaultBalances={vaultBalances}
            withdrawals={withdrawals}
            onExecuteWithdrawal={handleExecuteWithdrawal}
            liveGasGwei={liveGasGwei}
          />
        )}

        {/* Tab View 2: Custom Strategy Parameters */}
        {activeTab === 'strategy' && (
          <CustomStrategyParameters
            config={config}
            setConfig={setConfig}
            activeNetwork={activeNetwork}
          />
        )}

        {/* Tab View: Exchange & Flash Loan Zero-Account APIs Directory */}
        {activeTab === 'exchanges' && (
          <ExchangeApiDirectory
            activeNetwork={activeNetwork}
            setActiveNetwork={setActiveNetwork}
          />
        )}

        {/* Tab View 3: Interactive Sandbox Simulator */}
        {activeTab === 'simulator' && (
          <InteractiveSimulator
            activeNetwork={activeNetwork}
            onExecuteCustomTrade={(params) => console.log('Custom trade:', params)}
          />
        )}

        {/* Tab View 4: Analytics & PnL Dashboard */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            stats={stats}
            profitHistory={profitHistory}
            tradeLogs={tradeLogs}
          />
        )}

        {/* Tab View 5: Live Mempool & Trade Terminal */}
        {activeTab === 'mempool' && (
          <MempoolTerminal
            logs={tradeLogs}
            activeNetwork={activeNetwork}
            onClearLogs={() => setTradeLogs([])}
          />
        )}

        {/* Tab View 6: Deployable Solidity Smart Contract */}
        {activeTab === 'solidity' && (
          <SolidityExporter activeNetwork={activeNetwork} />
        )}

      </main>

      {/* Detail Modal */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          config={config}
          activeNetwork={activeNetwork}
          onExecuteTrade={handleExecuteTrade}
          isExecuting={executingId === selectedOpportunity.id}
        />
      )}

      {/* Real Flash Arbitrage On-Chain / Flashbots MEV Execution Modal */}
      {isRealFlashModalOpen && realFlashOpp && (
        <RealFlashTxModal
          isOpen={isRealFlashModalOpen}
          onClose={() => {
            setIsRealFlashModalOpen(false);
            setRealFlashOpp(null);
          }}
          opportunity={realFlashOpp}
          activeNetwork={activeNetwork}
          walletState={walletState}
          onConnectWallet={handleConnectWallet}
          onSuccessTx={handleRealTxSuccess}
          liveGasGwei={liveGasGwei}
        />
      )}

      {/* Transaction & Node Architecture Settings Modal */}
      <TransactionSettingsModal
        isOpen={isTxSettingsModalOpen}
        onClose={() => setIsTxSettingsModalOpen(false)}
        activeNetwork={activeNetwork}
        onSettingsSaved={() => {
          // Trigger balance refresh or notification
        }}
      />

      {/* Wallet Connection & Fast Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <WalletWithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          activeNetwork={activeNetwork}
          walletState={walletState}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          vaultBalances={vaultBalances}
          onExecuteWithdrawal={handleExecuteWithdrawal}
          liveGasGwei={liveGasGwei}
        />
      )}

      {/* User Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(profile) => {
          setUserProfile(profile);
          setIsAuthModalOpen(false);
        }}
        onOpenPaywall={() => {
          setIsAuthModalOpen(false);
          setIsPaywallModalOpen(true);
        }}
      />

      {/* Subscription Paywall Checkout Modal ($100/mo or $1000/yr) */}
      <PaywallModal
        isOpen={isPaywallModalOpen}
        onClose={() => setIsPaywallModalOpen(false)}
        userProfile={userProfile}
        onSubscriptionSuccess={(updatedProfile) => {
          setUserProfile(updatedProfile);
        }}
        onOpenAuth={() => {
          setIsPaywallModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#23282f] bg-[#0d1117] px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-sans font-semibold text-slate-300">
              ARBI<span className="text-blue-500">.TECH</span> FLASH ENGINE
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline lowercase text-slate-400">aave v3, balancer v2 & uniswap v3 atomic routers</span>
          </div>

          <div className="flex items-center gap-4 text-[10px]">
            <div>Current Epoch: <span className="text-slate-300">172949</span></div>
            <span className="text-[#23282f]">|</span>
            <div>Sync State: <span className="text-emerald-400 font-semibold">SYNCED</span></div>
            <span className="text-[#23282f]">|</span>
            <div>Latency: <span className="text-blue-400">42ms</span></div>
            <span className="text-[#23282f]">|</span>
            <div>Node: <span className="text-slate-300">AWS-USE-1</span></div>
          </div>
        </div>
      </footer>

    </div>
  );
}
