import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Fuel, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Wallet,
  Globe,
  Radio
} from 'lucide-react';
import { Network, BotConfig, BotStats } from '../types';
import { NETWORKS } from '../data/chainsAndDexes';

interface NavbarProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  activeNetwork: Network;
  setActiveNetwork: (network: Network) => void;
  stats: BotStats;
  liveGasGwei: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  setConfig,
  activeNetwork,
  setActiveNetwork,
  stats,
  liveGasGwei,
}) => {
  const toggleBot = () => {
    setConfig((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const toggleSound = () => {
    setConfig((prev) => ({ ...prev, soundEffects: !prev.soundEffects }));
  };

  const isGasLow = liveGasGwei <= activeNetwork.defaultGasPriceGwei * 1.05;
  const isGasHigh = liveGasGwei >= activeNetwork.defaultGasPriceGwei * 1.35;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#23282f] bg-[#0d1117]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand & Bot Engine Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-white shadow-sm shadow-blue-900/40 tracking-wider text-sm font-mono">
            A
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                ARBI<span className="text-blue-500">.TECH</span>
              </h1>
              <span className="text-[11px] font-mono text-slate-500 bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d]">
                v2.4.0-STABLE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${config.isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-amber-500'}`}></div>
                <span className={`text-[11px] font-medium tracking-wide ${config.isRunning ? 'text-emerald-500' : 'text-amber-400'}`}>
                  {config.isRunning ? 'BOT ACTIVE' : 'BOT PAUSED'}
                </span>
              </div>
              <span className="text-[#30363d]">•</span>
              <span className="text-[11px] font-mono text-slate-500">
                {stats.avgExecutionLatencyMs}ms latency
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Chain & Network Controls */}
        <div className="hidden items-center gap-4 lg:flex">
          {/* Network Selector */}
          <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-md px-2.5 py-1.5 text-xs">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Chain:</span>
            <select
              id="network-select"
              value={activeNetwork.id}
              onChange={(e) => {
                const net = NETWORKS.find((n) => n.id === e.target.value);
                if (net) setActiveNetwork(net);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              {NETWORKS.map((net) => (
                <option key={net.id} value={net.id} className="bg-[#0d1117] text-slate-200">
                  {net.name} ({net.gasToken})
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-[1px] bg-[#23282f]"></div>

          {/* Live Gas Meter */}
          <div className="flex flex-col items-start text-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Gas Price</span>
            <div className="flex items-center gap-1.5">
              <Fuel className={`h-3 w-3 ${isGasLow ? 'text-emerald-400' : isGasHigh ? 'text-rose-400' : 'text-amber-400'}`} />
              <span className="text-xs font-mono font-semibold text-slate-200">
                {liveGasGwei.toFixed(1)} <span className="text-[10px] text-slate-500">Gwei</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#23282f]"></div>

          {/* Flashbots / MEV RPC Shield */}
          <div className="flex flex-col items-start text-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Mempool Guard</span>
            <div className="flex items-center gap-1.5">
              {config.mevProtection ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="text-xs font-mono text-slate-300">
                {config.mevProtection ? 'Flashbots RPC' : 'Public Pool'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Wallet Balance & Quick Engine Controls */}
        <div className="flex items-center gap-3">
          {/* Simulated Contract Vault Balance */}
          <div className="hidden sm:flex flex-col items-end text-blue-400 mr-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Vault Balance</span>
            <span className="text-xs font-mono font-semibold text-blue-400">
              ${(24500 + stats.totalNetProfitUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={toggleSound}
            title={config.soundEffects ? 'Mute Audio Alerts' : 'Enable Audio Alerts'}
            className="flex h-8 w-8 items-center justify-center rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200 hover:bg-[#23282f] transition-colors"
          >
            {config.soundEffects ? <Volume2 className="h-3.5 w-3.5 text-blue-400" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Master Engine Start / Stop */}
          <button
            id="master-bot-toggle-btn"
            onClick={toggleBot}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold tracking-wide transition-all border ${
              config.isRunning
                ? 'bg-rose-600/10 border-rose-500/40 text-rose-400 hover:bg-rose-600/20'
                : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/30'
            }`}
          >
            {config.isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>START</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
