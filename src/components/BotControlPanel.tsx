import React, { useState } from 'react';
import { 
  Sliders, 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
  DollarSign, 
  Percent, 
  RefreshCw, 
  CheckCircle2,
  Sparkles,
  Layers,
  Fuel,
  Lock,
  Info,
  ExternalLink
} from 'lucide-react';
import { BotConfig, BotStats } from '../types';
import { FLASH_LOAN_PROVIDERS, DEXES, DEFAULT_MONITORED_PAIRS } from '../data/chainsAndDexes';

interface BotControlPanelProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  stats: BotStats;
  onResetStats: () => void;
  onOpenAdvancedConfig?: () => void;
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  config,
  setConfig,
  stats,
  onResetStats,
  onOpenAdvancedConfig,
}) => {
  const [showRpcInfo, setShowRpcInfo] = useState<boolean>(false);

  const isFlashbotsActive = config.flashbotsProtect !== false && config.mevProtection;

  const handleToggleFlashbotsProtect = (checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      mevProtection: checked,
      flashbotsProtect: checked,
    }));
  };

  const applyPreset = (preset: 'conservative' | 'aggressive' | 'l2' | 'zerofee') => {
    switch (preset) {
      case 'conservative':
        setConfig((prev) => ({
          ...prev,
          minProfitThresholdUsd: 50,
          minRoiPercent: 0.15,
          maxSlippagePercent: 0.25,
          mevProtection: true,
          flashbotsProtect: true,
          gasMultiplier: 1.0,
          simulateReverts: true,
          scanIntervalMs: 2500,
        }));
        break;
      case 'aggressive':
        setConfig((prev) => ({
          ...prev,
          minProfitThresholdUsd: 15,
          minRoiPercent: 0.04,
          maxSlippagePercent: 0.8,
          mevProtection: true,
          flashbotsProtect: true,
          gasMultiplier: 1.5,
          simulateReverts: true,
          scanIntervalMs: 1200,
        }));
        break;
      case 'l2':
        setConfig((prev) => ({
          ...prev,
          minProfitThresholdUsd: 8,
          minRoiPercent: 0.02,
          maxSlippagePercent: 0.3,
          mevProtection: false,
          flashbotsProtect: false,
          gasMultiplier: 1.1,
          simulateReverts: false,
          scanIntervalMs: 1000,
        }));
        break;
      case 'zerofee':
        setConfig((prev) => ({
          ...prev,
          selectedProviders: ['balancer_vault', 'dydx_solo', 'maker_flash_mint'],
          minProfitThresholdUsd: 20,
          minRoiPercent: 0.05,
          maxSlippagePercent: 0.4,
          mevProtection: true,
          flashbotsProtect: true,
          scanIntervalMs: 2000,
        }));
        break;
    }
  };

  const toggleProvider = (id: string) => {
    setConfig((prev) => {
      const exists = prev.selectedProviders.includes(id);
      if (exists && prev.selectedProviders.length === 1) return prev; // keep at least 1
      return {
        ...prev,
        selectedProviders: exists
          ? prev.selectedProviders.filter((p) => p !== id)
          : [...prev.selectedProviders, id],
      };
    });
  };

  const toggleDex = (dexId: string) => {
    setConfig((prev) => {
      const current = prev.selectedDexes || [];
      const exists = current.includes(dexId);
      if (exists && current.length <= 2) return prev;
      return {
        ...prev,
        selectedDexes: exists ? current.filter((id) => id !== dexId) : [...current, dexId],
      };
    });
  };

  const currentDexes = config.selectedDexes || DEXES.map((d) => d.id);
  const currentPairs = config.monitoredPairs || DEFAULT_MONITORED_PAIRS;

  return (
    <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23282f] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600/10 text-blue-400 border border-blue-500/30">
            <Sliders className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Arbitrage Engine Controls & Strategy Knobs
            </h2>
            <p className="text-[11px] text-slate-500">
              Set minimum profit %, preferred DEXs, monitored pairs, and MEV frontrun safeguards
            </p>
          </div>
        </div>

        {/* Strategy Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-blue-400" /> Presets:
          </span>
          <button
            id="preset-conservative-btn"
            onClick={() => applyPreset('conservative')}
            className="rounded bg-[#161b22] border border-[#30363d] px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            Conservative ($50+)
          </button>
          <button
            id="preset-aggressive-btn"
            onClick={() => applyPreset('aggressive')}
            className="rounded bg-[#161b22] border border-[#30363d] px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            MEV High-Yield
          </button>
          <button
            id="preset-l2-btn"
            onClick={() => applyPreset('l2')}
            className="rounded bg-[#161b22] border border-[#30363d] px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            L2 Micro-Arb
          </button>
          <button
            id="preset-zerofee-btn"
            onClick={() => applyPreset('zerofee')}
            className="rounded bg-[#161b22] border border-[#30363d] px-2.5 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            0% Fee Pools
          </button>
          {onOpenAdvancedConfig && (
            <button
              id="open-advanced-params-btn"
              onClick={onOpenAdvancedConfig}
              className="rounded bg-blue-600/20 border border-blue-500 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
            >
              Full Strategy Builder &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Controls & Knobs (5 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Auto-Execution Toggle */}
        <div className="flex flex-col justify-between rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">Auto-Pilot</span>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="auto-execute-toggle"
                type="checkbox"
                checked={config.autoExecute}
                onChange={(e) => setConfig((prev) => ({ ...prev, autoExecute: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#23282f] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {config.autoExecute ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Auto-executing valid spreads
              </span>
            ) : (
              'Manual mode. 1-click execution.'
            )}
          </p>
        </div>

        {/* Min Profit Percentage (ROI %) */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Percent className="h-3.5 w-3.5 text-blue-400" /> Min Profit %
            </span>
            <span className="font-mono text-xs font-bold text-blue-400">
              {config.minRoiPercent}%
            </span>
          </div>
          <input
            id="min-roi-slider-panel"
            type="range"
            min="0.01"
            max="1.5"
            step="0.01"
            value={config.minRoiPercent}
            onChange={(e) => setConfig((prev) => ({ ...prev, minRoiPercent: Number(e.target.value) }))}
            className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.01%</span>
            <span>1.50%</span>
          </div>
        </div>

        {/* Min Net Profit Threshold ($) */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Min Net Profit
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              ${config.minProfitThresholdUsd}
            </span>
          </div>
          <input
            id="min-profit-slider"
            type="range"
            min="5"
            max="250"
            step="5"
            value={config.minProfitThresholdUsd}
            onChange={(e) => setConfig((prev) => ({ ...prev, minProfitThresholdUsd: Number(e.target.value) }))}
            className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-emerald-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 font-mono">
            <span>$5 (Aggressive)</span>
            <span>$250 (Whale)</span>
          </div>
        </div>

        {/* Max Slippage Tolerance */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Percent className="h-3.5 w-3.5 text-blue-400" /> Max Slippage
            </span>
            <span className="font-mono text-xs font-bold text-blue-400">
              {config.maxSlippagePercent}%
            </span>
          </div>
          <input
            id="slippage-slider"
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={config.maxSlippagePercent}
            onChange={(e) => setConfig((prev) => ({ ...prev, maxSlippagePercent: Number(e.target.value) }))}
            className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-blue-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.05% (Strict)</span>
            <span>1.50% (Tolerant)</span>
          </div>
        </div>

        {/* Flashbots Protect & Private RPC Routing Toggle */}
        <div className={`flex flex-col justify-between rounded-md border p-3 transition-colors ${
          isFlashbotsActive 
            ? 'border-emerald-500/40 bg-emerald-950/10' 
            : 'border-[#30363d] bg-[#161b22]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isFlashbotsActive ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                Flashbots Protect
              </span>
              <button
                type="button"
                id="flashbots-rpc-info-btn"
                onClick={() => setShowRpcInfo(!showRpcInfo)}
                className="text-slate-500 hover:text-blue-400 transition-colors"
                title="Private RPC Configuration Info"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="flashbots-protect-toggle"
                type="checkbox"
                checked={isFlashbotsActive}
                onChange={(e) => handleToggleFlashbotsProtect(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#23282f] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="h-2.5 w-2.5 text-slate-400" /> Private RPC:
            </span>
            <span className={`font-semibold flex items-center gap-1 ${
              isFlashbotsActive ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {isFlashbotsActive ? 'Bypass Mempool' : 'Public Mempool'}
            </span>
          </div>

          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
            {isFlashbotsActive ? (
              <span className="text-emerald-400/90">
                Zero front-running risk via direct builder relays
              </span>
            ) : (
              <span className="text-amber-400/80">
                Transactions exposed to sandwich & MEV searchers
              </span>
            )}
          </p>
        </div>

      </div>

      {/* Row 2: Preferred DEXs & Monitored Pairs Quick Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-[#23282f]">
        
        {/* Preferred DEXs Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3 text-blue-400" /> Preferred DEXs:
          </span>
          {DEXES.map((dex) => {
            const isSelected = currentDexes.includes(dex.id);
            return (
              <button
                key={dex.id}
                type="button"
                onClick={() => toggleDex(dex.id)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 border border-blue-500 text-blue-400'
                    : 'bg-[#161b22] border border-[#30363d] text-slate-500 hover:text-slate-300'
                }`}
              >
                {dex.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Monitored Pairs Summary */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1">
            Monitored Pairs ({currentPairs.length}):
          </span>
          {currentPairs.slice(0, 4).map((p) => (
            <span key={p} className="bg-[#161b22] border border-[#30363d] px-2 py-0.5 rounded text-[11px] font-mono text-slate-300">
              {p}
            </span>
          ))}
          {currentPairs.length > 4 && (
            <span className="text-[10px] text-slate-500 font-mono">
              +{currentPairs.length - 4} more
            </span>
          )}
        </div>

      </div>

      {/* Row 3: Flash Loan Providers Filter & Scan Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#23282f] pt-3">
        {/* Flash Loan Provider Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Loan Sources:</span>
          {FLASH_LOAN_PROVIDERS.map((provider) => {
            const isSelected = config.selectedProviders.includes(provider.id);
            return (
              <button
                key={provider.id}
                onClick={() => toggleProvider(provider.id)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 border border-blue-500 text-blue-400'
                    : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{provider.name}</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({provider.feePercent === 0 ? '0%' : `${provider.feePercent}%`})
                </span>
              </button>
            );
          })}
        </div>

        {/* Scan Speed and Clear History */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className={`h-3 w-3 ${config.isRunning ? 'animate-spin text-blue-400' : ''}`} />
            <span className="text-[11px] text-slate-500 uppercase">Scan:</span>
            <span className="font-mono font-bold text-slate-300">{(config.scanIntervalMs / 1000).toFixed(1)}s</span>
          </div>
          <button
            id="reset-stats-btn"
            onClick={onResetStats}
            className="rounded bg-[#161b22] border border-[#30363d] hover:bg-[#23282f] px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
          >
            Reset Metrics
          </button>
        </div>
      </div>

      {/* Expandable Flashbots Protect & Private RPC Info Drawer */}
      {showRpcInfo && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-[#0b131a] p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Flashbots Protect & Private RPC Architecture
              </h4>
            </div>
            <button
              onClick={() => setShowRpcInfo(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono px-2 py-0.5 rounded bg-[#161b22]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded bg-[#161b22] border border-[#30363d]">
              <div className="text-emerald-400 font-semibold mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Anti-Frontrun Relay
              </div>
              <p className="text-slate-400 leading-relaxed text-[10px]">
                Routes calldata directly to Ethereum block builders via <code className="text-emerald-300 font-mono">https://rpc.flashbots.net/fast</code>. Transactions are completely invisible in the public mempool.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#161b22] border border-[#30363d]">
              <div className="text-blue-400 font-semibold mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Revert Gas Shield
              </div>
              <p className="text-slate-400 leading-relaxed text-[10px]">
                If a slippage condition is breached or spread tightens before inclusion, the bundle is dropped off-chain without consuming on-chain gas fees.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#161b22] border border-[#30363d]">
              <div className="text-purple-400 font-semibold mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> MEV-Share Kickbacks
              </div>
              <p className="text-slate-400 leading-relaxed text-[10px]">
                Connects with MEV-Share protocol to return up to 90% of backrunning searcher value directly back to your vault as execution yield.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

