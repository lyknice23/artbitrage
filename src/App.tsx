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

type ActiveTab = 'dashboard' | 'strategy' | 'exchanges' | 'simulator' | 'analytics' | 'mempool' | 'solidity';

export default function App() {
  // Active Network
  const [activeNetwork, setActiveNetwork] = useState<Network>(NETWORKS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

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
