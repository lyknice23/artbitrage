import React, { useState } from 'react';
import { 
  Radar, 
  DollarSign, 
  Fuel, 
  Activity, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowRight,
  Sparkles, 
  Flame, 
  Copy, 
  Check, 
  ExternalLink,
  Filter,
  Eye,
  Sliders,
  TrendingUp,
  Clock,
  Layers,
  Percent
} from 'lucide-react';
import { 
  ArbitrageOpportunity, 
  BotConfig, 
  BotStats, 
  Network, 
  ProfitHistoryPoint, 
  TradeLog 
} from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface RealtimeDashboardProps {
  opportunities: ArbitrageOpportunity[];
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  stats: BotStats;
  tradeLogs: TradeLog[];
  profitHistory: ProfitHistoryPoint[];
  activeNetwork: Network;
  liveGasGwei: number;
  onExecuteTrade: (opp: ArbitrageOpportunity) => void;
  onSelectOpportunity: (opp: ArbitrageOpportunity) => void;
  onAiAudit: (opp: ArbitrageOpportunity) => void;
  executingId: string | null;
  onOpenCustomSettings?: () => void;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({
  opportunities,
  config,
  setConfig,
  stats,
  tradeLogs,
  profitHistory,
  activeNetwork,
  liveGasGwei,
  onExecuteTrade,
  onSelectOpportunity,
  onAiAudit,
  executingId,
  onOpenCustomSettings,
}) => {
  const [filterToken, setFilterToken] = useState<string>('ALL');
  const [onlyProfitable, setOnlyProfitable] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Compute live gas metrics
  const flashloanGasCostEth = (380000 * liveGasGwei * 1e-9);
  const flashloanGasCostUsd = flashloanGasCostEth * activeNetwork.gasTokenPriceUsd;

  // Filter opportunities based on parameters
  const filteredOpps = opportunities.filter((opp) => {
    if (filterToken !== 'ALL' && opp.tokenSymbol !== filterToken) return false;
    if (onlyProfitable) {
      if (opp.netProfitUsd < config.minProfitThresholdUsd) return false;
      if (opp.roiPercent < config.minRoiPercent) return false;
    }
    return true;
  });

  // Calculate estimated total profit from active opportunities
  const totalActivePipelineProfit = filteredOpps.reduce((sum, o) => sum + (o.netProfitUsd > 0 ? o.netProfitUsd : 0), 0);
  const highestSpreadOpp = [...opportunities].sort((a, b) => b.spreadPercent - a.spreadPercent)[0];

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const tokens = Array.from(new Set(opportunities.map((o) => o.tokenSymbol)));

  return (
    <div className="space-y-5">
      
      {/* Top Banner: Real-Time Metrics & Gas Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Metric 1: Estimated & Realized Profits */}
        <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Realized Net Profit
            </span>
            <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.2 rounded">
              +{stats.successfulTrades} Trades
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              +${stats.totalNetProfitUsd.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
              <span>Active Pipeline: <strong className="text-slate-200">+${totalActivePipelineProfit.toFixed(2)}</strong></span>
              <span className="text-slate-500">ROI: {stats.totalVolumeProcessedUsd > 0 ? ((stats.totalNetProfitUsd / stats.totalVolumeProcessedUsd) * 100).toFixed(3) : '0.00'}%</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Live Gas Price & Tx Cost */}
        <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-amber-400" /> Current Gas Price
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              liveGasGwei > config.gasPriceCeilingGwei
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                : 'bg-blue-900/30 text-blue-300 border-blue-800/40'
            }`}>
              {liveGasGwei > config.gasPriceCeilingGwei ? 'CEILING EXCEEDED' : 'OPTIMAL'}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {liveGasGwei.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-slate-400">Gwei ({activeNetwork.shortName})</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
              <span>Flash Loan Tx: <strong className="text-slate-200">${flashloanGasCostUsd.toFixed(2)}</strong></span>
              <span>Max Cap: {config.gasPriceCeilingGwei} Gwei</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Opportunities Radar */}
        <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radar className="h-3.5 w-3.5 text-blue-400" /> Active Radar Spreads
            </span>
            <span className="text-[10px] font-mono bg-blue-900/40 text-blue-300 border border-blue-800/50 px-1.5 py-0.2 rounded">
              {opportunities.length} Scanned
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-blue-400">
                {filteredOpps.length}
              </span>
              <span className="text-xs text-slate-400">matching criteria</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
              <span>Top Spread: <strong className="text-emerald-400">+{highestSpreadOpp ? highestSpreadOpp.spreadPercent.toFixed(2) : '0.00'}%</strong></span>
              <span>Min ROI: {config.minRoiPercent}%</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Trade Execution Status & Mode */}
        <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400" /> Executor Status
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              config.autoExecute 
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {config.autoExecute ? 'AUTO-PILOT' : 'MANUAL'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-200">
                {stats.successfulTrades} / {stats.totalExecuted} Won ({stats.totalExecuted > 0 ? ((stats.successfulTrades / stats.totalExecuted) * 100).toFixed(0) : '100'}%)
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Avg Latency: <strong className="text-slate-200">{stats.avgExecutionLatencyMs}ms</strong>
              </div>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, autoExecute: !prev.autoExecute }))}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                config.autoExecute
                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
              }`}
            >
              {config.autoExecute ? 'Pause Auto' : 'Enable Auto'}
            </button>
          </div>
        </div>

      </div>

      {/* Main Grid: Active Opportunities Table (Left/Top) + Real-Time Executed Trades Stream (Right/Bottom) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left/Main Column: Active Arbitrage Opportunities (8 Cols) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-[#0d1117] border border-[#23282f] rounded-lg overflow-hidden">
            
            {/* Table Header & Quick Parameters Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] px-4 py-3 bg-[#0d1117]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                  </span>
                  <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                    Live Active Arbitrage Opportunities
                  </h2>
                </div>
                <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 uppercase text-[10px] font-mono">
                  {filteredOpps.length} Viable Routes
                </span>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-500 uppercase font-semibold">
                  <Filter className="h-3 w-3" />
                  <span>Asset:</span>
                </div>

                <button
                  onClick={() => setFilterToken('ALL')}
                  className={`rounded px-2 py-0.5 text-xs transition-all ${
                    filterToken === 'ALL'
                      ? 'bg-blue-600/20 border border-blue-500 text-blue-400 font-medium'
                      : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>

                {tokens.slice(0, 4).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => setFilterToken(sym)}
                    className={`rounded px-2 py-0.5 text-xs transition-all ${
                      filterToken === sym
                        ? 'bg-blue-600/20 border border-blue-500 text-blue-400 font-medium'
                        : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sym}
                  </button>
                ))}

                <button
                  onClick={() => setOnlyProfitable(!onlyProfitable)}
                  className={`flex items-center gap-1 rounded px-2.5 py-0.5 text-xs transition-all ${
                    onlyProfitable
                      ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-medium'
                      : 'border border-[#30363d] bg-[#161b22] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>&gt; ${config.minProfitThresholdUsd} Net</span>
                </button>

                {onOpenCustomSettings && (
                  <button
                    onClick={onOpenCustomSettings}
                    title="Customize strategy parameters"
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-[#161b22] border border-[#30363d] text-slate-300 hover:text-white hover:border-blue-500 transition-colors"
                  >
                    <Sliders className="h-3 w-3 text-blue-400" />
                    <span>Params</span>
                  </button>
                )}
              </div>
            </div>

            {/* Opportunities Table */}
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-[#23282f] bg-[#0d1117] text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Pair / Route</th>
                    <th className="py-2.5 px-3.5">Buy DEX</th>
                    <th className="py-2.5 px-3.5">Sell DEX</th>
                    <th className="py-2.5 px-3.5 text-right">Spread / ROI</th>
                    <th className="py-2.5 px-3.5 text-right">Loan Size</th>
                    <th className="py-2.5 px-3.5 text-right">Est. Gas</th>
                    <th className="py-2.5 px-3.5 text-right">Net Profit</th>
                    <th className="py-2.5 px-3.5 text-center">MEV Risk</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23282f]/80 font-mono">
                  {filteredOpps.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 bg-[#0d1117]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-7 w-7 text-slate-600" />
                          <p className="text-sm font-medium text-slate-400">
                            No arbitrage opportunities matching current custom parameters.
                          </p>
                          <p className="text-xs text-slate-500">
                            Lower your minimum profit threshold (${config.minProfitThresholdUsd}) or add more monitored pairs.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOpps.map((opp) => {
                      const isProfitable = opp.netProfitUsd >= config.minProfitThresholdUsd && opp.roiPercent >= config.minRoiPercent;
                      const isExecuting = executingId === opp.id;

                      return (
                        <tr
                          key={opp.id}
                          className={`transition-colors hover:bg-[#1c222b] ${
                            isProfitable ? 'bg-[#161b22]/70' : 'bg-[#161b22]/30 opacity-75'
                          }`}
                        >
                          {/* Pair / Route */}
                          <td className="py-3 px-3.5">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-bold text-slate-100">
                                {opp.tokenSymbol} / {opp.quoteSymbol}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                                {opp.buyDex} &rarr; {opp.sellDex}
                              </span>
                            </div>
                          </td>

                          {/* Buy DEX */}
                          <td className="py-3 px-3.5 font-sans">
                            <div className="flex flex-col">
                              <span className="text-slate-300 font-medium">{opp.buyDex}</span>
                              <span className="font-mono text-xs text-slate-400">
                                ${opp.buyPrice.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* Sell DEX */}
                          <td className="py-3 px-3.5 font-sans">
                            <div className="flex flex-col">
                              <span className="text-slate-300 font-medium">{opp.sellDex}</span>
                              <span className="font-mono text-xs text-slate-400">
                                ${opp.sellPrice.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* Spread / ROI */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-emerald-400 font-mono font-bold">
                                +{opp.spreadPercent.toFixed(2)}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ROI: +{opp.roiPercent.toFixed(2)}%
                              </span>
                            </div>
                          </td>

                          {/* Loan Size */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono text-slate-200">
                                {opp.loanAmount} {opp.tokenSymbol}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {opp.loanProvider}
                              </span>
                            </div>
                          </td>

                          {/* Est Gas */}
                          <td className="py-3 px-3.5 text-right text-slate-400 font-mono">
                            <div className="flex flex-col items-end">
                              <span>${opp.gasCostUsd.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-500">fee ${opp.flashLoanFeeUsd.toFixed(2)}</span>
                            </div>
                          </td>

                          {/* Net Profit */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={`text-sm font-bold font-mono ${
                                  opp.netProfitUsd > 0
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {opp.netProfitUsd > 0 ? '+' : ''}${opp.netProfitUsd.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Gross: ${opp.grossProfitUsd.toFixed(2)}
                              </span>
                            </div>
                          </td>

                          {/* MEV Risk */}
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-sans font-medium ${
                                opp.mevRiskLevel === 'LOW'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                                  : opp.mevRiskLevel === 'MODERATE'
                                  ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                                  : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                              }`}
                            >
                              {opp.mevRiskLevel}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-3.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Modal */}
                              <button
                                onClick={() => onSelectOpportunity(opp)}
                                title="Inspect Route Math & AI Audit"
                                className="flex h-7 w-7 items-center justify-center rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {/* Execute Button */}
                              <button
                                onClick={() => onExecuteTrade(opp)}
                                disabled={isExecuting}
                                className={`text-xs px-3 py-1 rounded transition-colors font-medium border ${
                                  isExecuting
                                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 cursor-wait'
                                    : isProfitable
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white'
                                    : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {isExecuting ? (
                                  <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 animate-spin" />
                                    <span>Exec...</span>
                                  </span>
                                ) : (
                                  <span>Execute</span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Right Column: Real-Time Executed Trades Stream & PnL History (4 Cols) */}
        <div className="xl:col-span-4 space-y-4">
          
          {/* Status of Executed Trades Feed */}
          <div className="bg-[#0d1117] border border-[#23282f] rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-[#23282f] px-4 py-3 bg-[#0d1117]">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                  Status of Executed Trades
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">
                {tradeLogs.length} Total
              </span>
            </div>

            {/* Live Feed List */}
            <div className="divide-y divide-[#23282f] max-h-[380px] overflow-y-auto font-mono">
              {tradeLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-sans">No trades executed in current session.</p>
                  <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                    Click Execute on any active spread or enable Auto-Pilot.
                  </p>
                </div>
              ) : (
                tradeLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <div key={log.id} className="p-3 bg-[#161b22]/40 hover:bg-[#161b22] transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                            isSuccess 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' 
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                          }`}>
                            {isSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {log.status}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            {log.tokenSymbol}/{log.quoteSymbol}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.netProfitUsd > 0 ? '+' : ''}${log.netProfitUsd.toFixed(2)}
                        </span>
                      </div>

                      {/* Route details */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                        <span>{log.buyDex} &rarr; {log.sellDex}</span>
                        <span className="font-mono text-[10px] text-slate-500">{log.latencyMs}ms</span>
                      </div>

                      {/* Tx Hash & Explorer */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#23282f]">
                        <span className="font-mono">{log.txHash.slice(0, 10)}...{log.txHash.slice(-6)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyHash(log.txHash)}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copy Transaction Hash"
                          >
                            {copiedHash === log.txHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <a
                            href={`${activeNetwork.explorerUrl}${log.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            title="View on Explorer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Mini Profit Chart */}
          <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Cumulative Net PnL
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                +${stats.totalNetProfitUsd.toFixed(2)}
              </span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', fontSize: '11px', color: '#e0e3e7' }}
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'Cumulative PnL']}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
