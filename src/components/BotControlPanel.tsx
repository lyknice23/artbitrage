import React from 'react';
import { 
  Sliders, 
  Bot, 
  ShieldCheck, 
  DollarSign, 
  Percent, 
  RefreshCw, 
  CheckCircle2,
  Sparkles,
  Layers,
  Fuel
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
  const applyPreset = (preset: 'conservative' | 'aggressive' | 'l2' | 'zerofee') => {
    switch (preset) {
      case 'conservative':
        setConfig((prev) => ({
          ...prev,
          minProfitThresholdUsd: 50,
          minRoiPercent: 0.15,
          maxSlippagePercent: 0.25,
          mevProtection: true,
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

        {/* MEV Protection & Reverts */}
        <div className="flex flex-col justify-between rounded-md border border-[#30363d] bg-[#161b22] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Flashbots
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="mev-protection-toggle"
                type="checkbox"
                checked={config.mevProtection}
                onChange={(e) => setConfig((prev) => ({ ...prev, mevProtection: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#23282f] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Anti-Sandwich</span>
            <span className={config.mevProtection ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {config.mevProtection ? 'Active' : 'Off'}
            </span>
          </div>
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
    </div>
  );
};

