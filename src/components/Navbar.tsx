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
  Radio, 
  ArrowUpRight,
  User,
  Crown,
  Database
} from 'lucide-react';
import { Network, BotConfig, BotStats, WalletState, UserProfile } from '../types';
import { NETWORKS } from '../data/chainsAndDexes';
import { checkAccessStatus } from '../services/userService';

interface NavbarProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  activeNetwork: Network;
  setActiveNetwork: (network: Network) => void;
  stats: BotStats;
  liveGasGwei: number;
  walletState: WalletState;
  onOpenWithdraw: () => void;
  onConnectWallet: (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault') => void;
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
  onOpenPaywall: () => void;
  onOpenUserSpace: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  setConfig,
  activeNetwork,
  setActiveNetwork,
  stats,
  liveGasGwei,
  walletState,
  onOpenWithdraw,
  onConnectWallet,
  userProfile,
  onOpenAuth,
  onOpenPaywall,
  onOpenUserSpace,
}) => {
  const access = checkAccessStatus(userProfile);
  const toggleBot = () => {
    // If trial is expired and user has no paid subscription, prompt paywall
    if (!access.hasAccess) {
      onOpenPaywall();
      return;
    }
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

        {/* Right: User Profile, Wallet, Withdraw, and Engine Controls */}
        <div className="flex items-center gap-2">
          
          {/* User Account & Database Sync Badge */}
          {userProfile ? (
            <button
              onClick={onOpenUserSpace}
              id="navbar-user-profile-btn"
              title="View Account, Saved Wallets Database & Membership"
              className="flex items-center gap-2 bg-[#161b22] hover:bg-[#1f242c] border border-blue-500/30 hover:border-blue-500/60 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/30 text-blue-300 text-[10px] font-bold">
                {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-[11px] font-bold text-slate-200 leading-tight">
                  {userProfile.name}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <Database className="h-2.5 w-2.5" />
                  {access.isPaid ? 'Pro Plan' : access.isTrial ? `${access.daysRemaining}d trial` : 'Expired'}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              id="navbar-login-btn"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-950"
            >
              <User className="h-3.5 w-3.5" />
              <span>Login / 7d Free</span>
            </button>
          )}

          {/* Web3 Wallet Connect / Address Badge */}
          {walletState.isConnected && walletState.address ? (
            <button
              onClick={onOpenWithdraw}
              title="Click to view Connected Wallet & Vault"
              className="hidden sm:flex items-center gap-2 bg-[#161b22] hover:bg-[#1f242c] border border-blue-500/40 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>
              <span className="text-slate-200 font-bold hidden lg:inline">
                {walletState.address.substring(0, 6)}...{walletState.address.substring(38)}
              </span>
              <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/40">
                {walletState.balanceEth.toFixed(2)} ETH
              </span>
            </button>
          ) : (
            <button
              onClick={() => onConnectWallet('metamask')}
              className="hidden sm:flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-blue-950"
            >
              <Wallet className="h-3.5 w-3.5 text-blue-400" />
              <span>Connect</span>
            </button>
          )}

          {/* Paywall / Pricing Quick Link */}
          <button
            onClick={onOpenPaywall}
            id="navbar-paywall-cta-btn"
            title="Subscription Plans: $100/month or $1,000/year"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-[#161b22] hover:bg-[#21262d] text-amber-300 border border-amber-500/30"
          >
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline font-mono">{access.isPaid ? 'Pro' : '$100/mo'}</span>
          </button>

          {/* Quick Withdraw Funds Action Button */}
          <button
            onClick={onOpenWithdraw}
            id="navbar-withdraw-btn"
            title="Withdraw Accrued Arbitrage Profits & Vault Reserves"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-950 border border-emerald-400/30"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Withdraw</span>
            <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-200 px-1 py-0.2 rounded border border-emerald-400/20 hidden xl:inline">
              +${stats.totalNetProfitUsd.toFixed(0)}
            </span>
          </button>

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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all border ${
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

