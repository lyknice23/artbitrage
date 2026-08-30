import React from 'react';
import { 
  Clock, 
  Sparkles, 
  Crown, 
  AlertTriangle, 
  ArrowRight, 
  Database,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { checkAccessStatus } from '../services/userService';

interface PaywallBannerProps {
  userProfile: UserProfile | null;
  onOpenPaywall: () => void;
  onOpenAccount: () => void;
  onOpenAuth: () => void;
}

export const PaywallBanner: React.FC<PaywallBannerProps> = ({
  userProfile,
  onOpenPaywall,
  onOpenAccount,
  onOpenAuth,
}) => {
  const access = checkAccessStatus(userProfile);

  if (!userProfile) {
    return (
      <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-blue-500/20 px-4 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-blue-200">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Get 1 Week Free Unlimited Arbitrage Access:</span>
            <span className="text-slate-400 hidden sm:inline">Save names, emails, and wallet addresses to cloud database.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAuth}
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm shadow-blue-950 flex items-center gap-1"
            >
              <span>Sign In / Register</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (access.isPaid) {
    return (
      <div className="bg-gradient-to-r from-emerald-950/70 via-[#0d1117] to-teal-950/70 border-b border-emerald-500/30 px-4 py-1.5 text-xs font-mono">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-300">
            <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-bold">{access.statusLabel}:</span>
            <span className="text-slate-300 text-[11px] font-sans">
              All multi-DEX flash loan routers & private mempool bundlers active ({access.formattedCountdown})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-sans">
              <Database className="h-3 w-3" />
              Synced: {userProfile.name}
            </span>
            <button
              onClick={onOpenAccount}
              className="text-[11px] text-slate-300 hover:text-white underline"
            >
              Account & Wallets
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (access.isTrial) {
    return (
      <div className="bg-gradient-to-r from-blue-950/90 via-[#0e131b] to-indigo-950/90 border-b border-blue-500/30 px-4 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-200">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Clock className="h-3 w-3" />
            </div>
            <span className="font-bold text-amber-300">7-Day Free Trial:</span>
            <span className="text-slate-300 font-mono font-semibold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/30">
              {access.formattedCountdown}
            </span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              (After trial: $100/mo or $1,000/yr for continuous automated execution)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPaywall}
              id="banner-upgrade-pro-btn"
              className="px-3 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-950 flex items-center gap-1"
            >
              <Crown className="h-3 w-3 text-amber-300" />
              <span>Upgrade to Pro ($100/mo)</span>
            </button>
            <button
              onClick={onOpenAccount}
              className="px-2.5 py-1 rounded-md bg-[#161b22] hover:bg-[#21262d] text-slate-300 text-xs border border-[#30363d] transition-all"
            >
              Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expired Trial
  return (
    <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border-b border-rose-500/50 px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="font-bold">1-Week Free Trial Expired:</span>
          <span className="text-slate-300">
            Automated flash loan trades are paused until a subscription ($100/mo or $1,000/yr) is activated.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPaywall}
            id="banner-unlock-paywall-btn"
            className="px-3.5 py-1 rounded-md bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs transition-all shadow-sm shadow-rose-950 animate-pulse flex items-center gap-1.5"
          >
            <Crown className="h-3 w-3 text-amber-300" />
            <span>Unlock Bot ($100/mo or $1000/yr)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
