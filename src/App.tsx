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

  // User Profile & Database State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return createDefaultUserProfile(
      'usr_demo_trader',
      'Alex FlashMaster',
      'itechitrap@gmail.com',
      '0x71C28994361f36b12a8A4476a8d672De4259b84A'
    );
  });

  // Web3 Wallet State
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: true,
    address: '0x71C28994361f36b12a8A4476a8d672De4259b84A',
    walletType: 'metamask',
    networkId: 'ethereum',
    chainId: 1,
    balanceEth: 4.825,
    balanceUsdt: 14500,
    isConnecting: false,
  });

  // Accrued Smart Contract Vault Asset Balances
  const [vaultBalances, setVaultBalances] = useState<VaultBalanceItem[]>([
    { symbol: 'USDC', name: 'USD Coin', amount: 14250.0, basePriceUsd: 1.0, valueUsd: 14250.0, color: '#2775ca', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', isWithdrawable: true },
    { symbol: 'WETH', name: 'Wrapped Ether', amount: 2.145, basePriceUsd: 3140.0, valueUsd: 6735.3, color: '#627eea', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', isWithdrawable: true },
    { symbol: 'USDT', name: 'Tether USD', amount: 3500.0, basePriceUsd: 1.0, valueUsd: 3500.0, color: '#26a17b', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', isWithdrawable: true },
    { symbol: 'TUT', name: 'Tutorial Token', amount: 850000.0, basePriceUsd: 0.00142, valueUsd: 1207.0, color: '#f59e0b', address: '0x1234567890abcdef1234567890abcdef12345678', isWithdrawable: true },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', amount: 0.0185, basePriceUsd: 87200.0, valueUsd: 1613.2, color: '#f7931a', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', isWithdrawable: true },
    { symbol: 'DAI', name: 'Dai Stablecoin', amount: 820.0, basePriceUsd: 1.0, valueUsd: 820.0, color: '#f5ac37', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', isWithdrawable: true },
  ]);

  // Withdrawal Transaction History
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([
    {
      id: 'wth_prev_1',
      timestamp: Date.now() - 3600000 * 4,
      tokenSymbol: 'USDC',
      amount: 2500,
      amountUsd: 2500,
      destinationAddress: '0x71C28994361f36b12a8A4476a8d672De4259b84A',
      networkId: 'ethereum',
      txHash: '0x4e8d35f791104e1bc23190b9f518e11a2f643e990c88b148f2a9348cbe02568',
      blockNumber: 19845180,
      status: 'CONFIRMED',
      method: 'VAULT_HARVEST',
      gasFeeUsd: 4.12,
      notes: 'Accrued Uniswap/SushiSwap arbitrage yield'
    },
    {
      id: 'wth_prev_2',
      timestamp: Date.now() - 3600000 * 26,
      tokenSymbol: 'WETH',
      amount: 0.75,
      amountUsd: 2355,
      destinationAddress: '0x71C28994361f36b12a8A4476a8d672De4259b84A',
      networkId: 'ethereum',
      txHash: '0x791104e1bc23190b9f518e11a2f643e990c88b148f2a9348cbe02568a4e8d35f',
      blockNumber: 19840120,
      status: 'CONFIRMED',
      method: 'VAULT_HARVEST',
      gasFeeUsd: 5.48,
      notes: 'Curve tri-pool rebalance yield'
    }
  ]);

  // Wallet Connection Handlers
  const handleConnectWallet = async (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault') => {
    setWalletState((prev) => ({ ...prev, isConnecting: true }));
    
    // Check if browser has window.ethereum
    if (typeof window !== 'undefined' && (window as any).ethereum && type !== 'demo_vault') {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletState({
            isConnected: true,
            address: accounts[0],
            walletType: type,
            networkId: activeNetwork.id,
            chainId: activeNetwork.chainId,
            balanceEth: 5.12,
            balanceUsdt: 16200,
            isConnecting: false,
          });
          return;
        }
      } catch (e) {
        console.log('Using simulated wallet link:', e);
      }
    }

    // Default seamless connect for sandbox preview
    setTimeout(() => {
      const addresses: Record<string, string> = {
        metamask: '0x71C28994361f36b12a8A4476a8d672De4259b84A',
        rabby: '0x3F5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
        coinbase: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D',
        walletconnect: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        demo_vault: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      };
      const assignedAddr = addresses[type] || '0x71C28994361f36b12a8A4476a8d672De4259b84A';
      setWalletState({
        isConnected: true,
        address: assignedAddr,
        walletType: type,
        networkId: activeNetwork.id,
        chainId: activeNetwork.chainId,
        balanceEth: 4.825,
        balanceUsdt: 14500,
        isConnecting: false,
      });
    }, 400);
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

  // Fund Withdrawal Execution Handler
  const handleExecuteWithdrawal = async (
    tokenSymbol: string,
    amount: number,
    destinationAddress: string,
    method: 'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    // Artificial latency for blockchain confirmation
    await new Promise((resolve) => setTimeout(resolve, 800));

    const tokenObj = vaultBalances.find((v) => v.symbol === tokenSymbol);
    if (!tokenObj || tokenObj.amount < amount) {
      return { success: false, error: `Insufficient ${tokenSymbol} vault balance to withdraw.` };
    }

    const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const amountUsd = amount * tokenObj.basePriceUsd;

    // Deduct from Vault balances
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

    // Record in Withdrawal log
    const newRecord: WithdrawalRecord = {
      id: `wth_${Date.now()}`,
      timestamp: Date.now(),
      tokenSymbol,
      amount,
      amountUsd,
      destinationAddress,
      networkId: activeNetwork.id,
      txHash: randomHash,
      blockNumber: 19845250 + withdrawals.length,
      status: 'CONFIRMED',
      method,
      gasFeeUsd: Number(((liveGasGwei * 65000 * 1e-9) * activeNetwork.gasTokenPriceUsd).toFixed(2)),
      notes: `Withdrawn to ${destinationAddress.substring(0, 6)}... via ${method}`
    };

    setWithdrawals((prev) => [newRecord, ...prev]);

    // Credit connected wallet balance if matching
    if (walletState.isConnected && (destinationAddress.toLowerCase() === walletState.address?.toLowerCase())) {
      if (tokenSymbol === 'WETH' || tokenSymbol === 'ETH') {
        setWalletState((prev) => ({ ...prev, balanceEth: prev.balanceEth + amount }));
      } else if (tokenSymbol === 'USDT' || tokenSymbol === 'USDC') {
        setWalletState((prev) => ({ ...prev, balanceUsdt: prev.balanceUsdt + amount }));
      }
    }

    return { success: true, txHash: randomHash };
  };

  // Firebase Auth & User Profile Synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          // Initialize fresh profile with 7 days free trial
          const newProfile = createDefaultUserProfile(
            user.uid,
            user.displayName || user.email?.split('@')[0] || 'Trader',
            user.email || 'user@domain.eth',
            walletState.address || '0x71C28994361f36b12a8A4476a8d672De4259b84A'
          );
          await saveUserProfileToDb(newProfile);
          setUserProfile(newProfile);
        }
      }
    });

    return () => unsubscribe();
  }, [walletState.address]);

  // Keep wallet address synced to user profile if connected
  useEffect(() => {
    if (walletState.isConnected && walletState.address && userProfile) {
      if (!userProfile.walletAddress || userProfile.walletAddress !== walletState.address) {
        setUserProfile((prev) => prev ? { ...prev, walletAddress: walletState.address || prev.walletAddress } : null);
      }
    }
  }, [walletState.isConnected, walletState.address, userProfile]);

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
    gasMultiplier: 1.2,
    simulateReverts: true,
    soundEffects: true,
    scanIntervalMs: 2000,
  });

  // Bot Statistics
  const [stats, setStats] = useState<BotStats>({
    totalScanned: 148,
    totalOpportunitiesFound: 32,
    totalExecuted: 6,
    successfulTrades: 6,
    failedTrades: 0,
    totalNetProfitUsd: 418.5,
    totalGasSpentUsd: 84.2,
    totalVolumeProcessedUsd: 380000,
    avgExecutionLatencyMs: 44,
    lastExecutionTimestamp: Date.now() - 45000,
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

  // Trade Logs History
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([
    {
      id: 'tx_init_1',
      timestamp: Date.now() - 120000,
      opportunityId: 'opp_init_1',
      networkId: 'ethereum',
      tokenSymbol: 'WETH',
      quoteSymbol: 'USDC',
      borrowAmount: 50,
      borrowAmountUsd: 157500,
      buyDex: 'Uniswap v3',
      buyPrice: 3142.1,
      sellDex: 'SushiSwap',
      sellPrice: 3168.4,
      flashLoanProvider: 'Aave v3 Pool',
      flashLoanFeeUsd: 78.75,
      grossProfitUsd: 325.2,
      gasCostUsd: 28.4,
      netProfitUsd: 218.05,
      status: 'SUCCESS',
      txHash: '0x8f2a9348cbe02568a4e8d35f791104e1bc23190b9f518e11a2f643e990c88b14',
      blockNumber: 19845210,
      latencyMs: 42,
      steps: [
        { title: 'Flash Loan Request', description: 'Borrowed 50 WETH from Aave v3', gasUsed: 78000, status: 'SUCCESS' },
        { title: 'Swap Route 1', description: 'Bought USDC on Uniswap v3', gasUsed: 135000, status: 'SUCCESS' },
        { title: 'Swap Route 2', description: 'Sold USDC on SushiSwap', gasUsed: 122000, status: 'SUCCESS' },
        { title: 'Repayment', description: 'Repaid principal + fee; +$218.05 net profit transferred', gasUsed: 45000, status: 'SUCCESS' }
      ]
    },
    {
      id: 'tx_init_2',
      timestamp: Date.now() - 65000,
      opportunityId: 'opp_init_2',
      networkId: 'ethereum',
      tokenSymbol: 'WBTC',
      quoteSymbol: 'USDT',
      borrowAmount: 2.5,
      borrowAmountUsd: 218500,
      buyDex: 'Uniswap v3',
      buyPrice: 87120,
      sellDex: 'Curve Finance',
      sellPrice: 87490,
      flashLoanProvider: 'Balancer v2 Vault',
      flashLoanFeeUsd: 0,
      grossProfitUsd: 232.5,
      gasCostUsd: 32.05,
      netProfitUsd: 200.45,
      status: 'SUCCESS',
      txHash: '0x3a4b76e190cc8714dfb026e95c110992384f762a5b678129ea4b10098df127aa',
      blockNumber: 19845214,
      latencyMs: 38,
      steps: [
        { title: 'Flash Loan Request', description: 'Borrowed 2.5 WBTC from Balancer (0% fee)', gasUsed: 72000, status: 'SUCCESS' },
        { title: 'Swap Route 1', description: 'Bought USDT on Uniswap v3', gasUsed: 128000, status: 'SUCCESS' },
        { title: 'Swap Route 2', description: 'Sold USDT on Curve Finance', gasUsed: 140000, status: 'SUCCESS' },
        { title: 'Repayment', description: 'Repaid principal; +$200.45 net profit transferred', gasUsed: 40000, status: 'SUCCESS' }
      ]
    }
  ]);

  // Profit History for Charting
  const [profitHistory, setProfitHistory] = useState<ProfitHistoryPoint[]>([
    { timestamp: Date.now() - 300000, timeLabel: '5m ago', pnl: 0, cumulativeProfit: 0, gasUsedUsd: 0, pair: 'INIT' },
    { timestamp: Date.now() - 120000, timeLabel: '2m ago', pnl: 218.05, cumulativeProfit: 218.05, gasUsedUsd: 28.4, pair: 'WETH/USDC' },
    { timestamp: Date.now() - 65000, timeLabel: '1m ago', pnl: 200.45, cumulativeProfit: 418.5, gasUsedUsd: 32.05, pair: 'WBTC/USDT' },
  ]);

  // Handle Network Change
  useEffect(() => {
    setOpportunities(generateInitialOpportunities(activeNetwork.id));
    setLiveGasGwei(activeNetwork.defaultGasPriceGwei);
  }, [activeNetwork.id]);

  // Auto-Scan & Price Drift Engine Loop
  useEffect(() => {
    if (!config.isRunning) return;

    const interval = setInterval(() => {
      // 1. Drift market spreads
      setOpportunities((prev) => updateMarketSpreads(prev, activeNetwork));

      // 2. Fluctuate gas slightly
      const gasDrift = (Math.random() - 0.48) * 0.4;
      setLiveGasGwei((g) => Math.max(0.01, Number((g + gasDrift).toFixed(2))));

      // 3. Increment total scanned
      setStats((s) => ({ ...s, totalScanned: s.totalScanned + 1 }));

      // Optional sound beep
      if (config.soundEffects && Math.random() < 0.15) {
        soundEngine.playRadarBeep();
      }
    }, config.scanIntervalMs);

    return () => clearInterval(interval);
  }, [config.isRunning, config.scanIntervalMs, activeNetwork, config.soundEffects]);

  // Auto-Execute Loop
  useEffect(() => {
    if (!config.isRunning || !config.autoExecute || executingId) return;

    const viableOpp = opportunities.find(
      (o) => o.netProfitUsd >= config.minProfitThresholdUsd && o.status === 'ACTIVE'
    );

    if (viableOpp) {
      handleExecuteTrade(viableOpp);
    }
  }, [config.isRunning, config.autoExecute, opportunities, executingId, config.minProfitThresholdUsd]);

  // Trade Execution Handler
  const handleExecuteTrade = async (opp: ArbitrageOpportunity) => {
    // Check 1-week free trial / paid subscription access
    const access = checkAccessStatus(userProfile);
    if (!access.hasAccess) {
      if (config.isRunning) {
        setConfig((prev) => ({ ...prev, isRunning: false, autoExecute: false }));
      }
      setIsPaywallModalOpen(true);
      if (config.soundEffects) {
        soundEngine.playAlertPing();
      }
      return;
    }

    if (executingId) return;
    setExecutingId(opp.id);

    try {
      const tradeLog = await simulateExecuteTrade(opp, config, activeNetwork);

      // Record trade log
      setTradeLogs((prev) => [tradeLog, ...prev]);

      // Update statistics
      setStats((prev) => {
        const isSuccess = tradeLog.status === 'SUCCESS';
        const newTotalProfit = prev.totalNetProfitUsd + tradeLog.netProfitUsd;
        return {
          ...prev,
          totalExecuted: prev.totalExecuted + 1,
          successfulTrades: isSuccess ? prev.successfulTrades + 1 : prev.successfulTrades,
          failedTrades: !isSuccess ? prev.failedTrades + 1 : prev.failedTrades,
          totalNetProfitUsd: Number(newTotalProfit.toFixed(2)),
          totalGasSpentUsd: Number((prev.totalGasSpentUsd + tradeLog.gasCostUsd).toFixed(2)),
          totalVolumeProcessedUsd: prev.totalVolumeProcessedUsd + tradeLog.borrowAmountUsd,
          lastExecutionTimestamp: Date.now(),
          avgExecutionLatencyMs: Math.round((prev.avgExecutionLatencyMs * 4 + tradeLog.latencyMs) / 5),
        };
      });

      // Update profit history point
      setProfitHistory((prev) => {
        const lastCumulative = prev.length > 0 ? prev[prev.length - 1].cumulativeProfit : 0;
        const newCumulative = lastCumulative + tradeLog.netProfitUsd;
        return [
          ...prev,
          {
            timestamp: Date.now(),
            timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            pnl: tradeLog.netProfitUsd,
            cumulativeProfit: Number(newCumulative.toFixed(2)),
            gasUsedUsd: tradeLog.gasCostUsd,
            pair: `${tradeLog.tokenSymbol}/${tradeLog.quoteSymbol}`,
          }
        ];
      });

      // Sound & Visual Confetti Effects
      if (tradeLog.status === 'SUCCESS') {
        if (config.soundEffects) {
          soundEngine.playSuccessChime();
        }
        if (tradeLog.netProfitUsd > 100) {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.85 },
            colors: ['#06b6d4', '#10b981', '#6366f1'],
          });
        }
      } else {
        if (config.soundEffects) {
          soundEngine.playAlertPing();
        }
      }
    } finally {
      setExecutingId(null);
    }
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
