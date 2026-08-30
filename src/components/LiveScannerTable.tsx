import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Eye,
  Filter
} from 'lucide-react';
import { ArbitrageOpportunity, BotConfig, Network } from '../types';

interface LiveScannerTableProps {
  opportunities: ArbitrageOpportunity[];
  config: BotConfig;
  activeNetwork: Network;
  onExecuteTrade: (opp: ArbitrageOpportunity) => void;
  onSelectOpportunity: (opp: ArbitrageOpportunity) => void;
  onAiAudit: (opp: ArbitrageOpportunity) => void;
  executingId: string | null;
}

export const LiveScannerTable: React.FC<LiveScannerTableProps> = ({
  opportunities,
  config,
  activeNetwork,
  onExecuteTrade,
  onSelectOpportunity,
  onAiAudit,
  executingId,
}) => {
  const [filterToken, setFilterToken] = useState<string>('ALL');
  const [onlyProfitable, setOnlyProfitable] = useState<boolean>(false);

  const tokens = Array.from(new Set(opportunities.map((o) => o.tokenSymbol)));

  const filtered = opportunities.filter((opp) => {
    if (filterToken !== 'ALL' && opp.tokenSymbol !== filterToken) return false;
    if (onlyProfitable && opp.netProfitUsd < config.minProfitThresholdUsd) return false;
    return true;
  });

  return (
    <div className="bg-[#0d1117] border border-[#23282f] rounded-lg overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Opportunity Scanner
            </h2>
          </div>
          <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50 uppercase text-[10px] font-mono">
            Scanning 12 DEXs ({filtered.length} routes)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 uppercase font-semibold">
            <Filter className="h-3 w-3" />
            <span>Asset:</span>
          </div>

          <button
            onClick={() => setFilterToken('ALL')}
            className={`rounded px-2.5 py-1 text-xs transition-all ${
              filterToken === 'ALL'
                ? 'bg-blue-600/20 border border-blue-500 text-blue-400 font-medium'
                : 'bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>

          {tokens.map((sym) => (
            <button
              key={sym}
              onClick={() => setFilterToken(sym)}
              className={`rounded px-2.5 py-1 text-xs transition-all ${
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
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-all ${
              onlyProfitable
                ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300 font-medium'
                : 'border border-[#30363d] bg-[#161b22] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>&gt; ${config.minProfitThresholdUsd} Net Only</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#23282f] bg-[#0d1117] text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Pair / Route</th>
              <th className="py-2.5 px-4">Buy DEX (Low)</th>
              <th className="py-2.5 px-4">Sell DEX (High)</th>
              <th className="py-2.5 px-4 text-right">Spread / ROI</th>
              <th className="py-2.5 px-4 text-right">Loan Size</th>
              <th className="py-2.5 px-4 text-right">Est. Gas</th>
              <th className="py-2.5 px-4 text-right">Net Profit</th>
              <th className="py-2.5 px-4 text-center">MEV Risk</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23282f]/80 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 bg-[#0d1117]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-7 w-7 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">
                      No arbitrage opportunities matching current filters.
                    </p>
                    <p className="text-xs text-slate-500 font-sans">
                      Try lowering the minimum profit threshold or selecting "All Tokens".
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((opp) => {
                const isProfitable = opp.netProfitUsd >= config.minProfitThresholdUsd;
                const isExecuting = executingId === opp.id;

                return (
                  <tr
                    key={opp.id}
                    className={`transition-colors hover:bg-[#1c222b] ${
                      isProfitable ? 'bg-[#161b22]' : 'bg-[#161b22]/60'
                    }`}
                  >
                    {/* Pair & Route */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-semibold text-slate-100">
                          {opp.tokenSymbol} / {opp.quoteSymbol}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                          {opp.buyDex} &rarr; {opp.sellDex}
                        </span>
                      </div>
                    </td>

                    {/* Buy DEX Price */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-col">
                        <span className="text-slate-300">{opp.buyDex}</span>
                        <span className="font-mono text-xs text-slate-400">
                          ${opp.buyPrice.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* Sell DEX Price */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-col">
                        <span className="text-slate-300">{opp.sellDex}</span>
                        <span className="font-mono text-xs text-slate-400">
                          ${opp.sellPrice.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    {/* Spread */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-emerald-400 font-mono font-bold">
                          +{opp.spreadPercent.toFixed(2)}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ROI: {opp.roiPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    {/* Loan Size */}
                    <td className="py-3 px-4 text-right">
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
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      <div className="flex flex-col items-end">
                        <span>${opp.gasCostUsd.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500">fee ${opp.flashLoanFeeUsd.toFixed(2)}</span>
                      </div>
                    </td>

                    {/* Net Profit */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-sm font-bold font-mono ${
                            isProfitable
                              ? 'text-emerald-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {opp.netProfitUsd > 0 ? '+' : ''}${opp.netProfitUsd.toFixed(2)}
                        </span>
                        {!isProfitable && (
                          <span className="text-[9px] text-slate-600 uppercase italic">
                            Below Threshold
                          </span>
                        )}
                      </div>
                    </td>

                    {/* MEV Risk */}
                    <td className="py-3 px-4 text-center">
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
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* AI Audit */}
                        <button
                          onClick={() => onAiAudit(opp)}
                          title="Audit route with AI Quantitative Engine"
                          className="flex h-7 w-7 items-center justify-center rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                        </button>

                        {/* Inspect Modal */}
                        <button
                          onClick={() => onSelectOpportunity(opp)}
                          title="Inspect Multi-step Route & Math"
                          className="flex h-7 w-7 items-center justify-center rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                        </button>

                        {/* Execute Button */}
                        <button
                          onClick={() => onExecuteTrade(opp)}
                          disabled={isExecuting}
                          className={`text-xs px-3 py-1 rounded transition-colors font-medium border ${
                            isExecuting
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 cursor-wait'
                              : isProfitable
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white'
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
  );
};
