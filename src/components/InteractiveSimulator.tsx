import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Play, 
  ArrowRight, 
  DollarSign, 
  Percent, 
  Fuel, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { Network, Token } from '../types';
import { TOKENS, DEXES, FLASH_LOAN_PROVIDERS } from '../data/chainsAndDexes';
import { calculateArbitrageMath, TYPICAL_FLASHLOAN_GAS_UNITS } from '../utils/arbitrageEngine';

interface InteractiveSimulatorProps {
  activeNetwork: Network;
  onExecuteCustomTrade: (tradeParams: any) => void;
}

export const InteractiveSimulator: React.FC<InteractiveSimulatorProps> = ({
  activeNetwork,
  onExecuteCustomTrade,
}) => {
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>('WETH');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('balancer_vault');
  const [buyDexId, setBuyDexId] = useState<string>('uniswap_v3');
  const [sellDexId, setSellDexId] = useState<string>('sushiswap');
  
  const [loanAmount, setLoanAmount] = useState<number>(50); // 50 WETH
  const [spreadPercent, setSpreadPercent] = useState<number>(0.85); // 0.85%
  const [customGasGwei, setCustomGasGwei] = useState<number>(activeNetwork.defaultGasPriceGwei);

  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const selectedToken = useMemo(() => {
    return TOKENS.find((t) => t.symbol === selectedTokenSymbol) || TOKENS[0];
  }, [selectedTokenSymbol]);

  const selectedProvider = useMemo(() => {
    return FLASH_LOAN_PROVIDERS.find((p) => p.id === selectedProviderId) || FLASH_LOAN_PROVIDERS[0];
  }, [selectedProviderId]);

  const buyDex = DEXES.find((d) => d.id === buyDexId) || DEXES[0];
  const sellDex = DEXES.find((d) => d.id === sellDexId) || DEXES[1];

  // Calculated prices
  const basePrice = selectedToken.basePriceUsd;
  const buyPrice = basePrice * (1 - spreadPercent / 200);
  const sellPrice = basePrice * (1 + spreadPercent / 200);

  // Main Math calculation
  const currentMath = useMemo(() => {
    return calculateArbitrageMath({
      loanAmount,
      tokenBasePriceUsd: basePrice,
      buyPrice,
      sellPrice,
      flashLoanFeePercent: selectedProvider.feePercent,
      gasUnits: TYPICAL_FLASHLOAN_GAS_UNITS,
      gasPriceGwei: customGasGwei,
      gasTokenPriceUsd: activeNetwork.gasTokenPriceUsd,
    });
  }, [loanAmount, basePrice, buyPrice, sellPrice, selectedProvider, customGasGwei, activeNetwork]);

  // Generate Net Profit vs Loan Size Curve for Recharts
  const profitCurveData = useMemo(() => {
    const points = [];
    const steps = 10;
    const maxAmount = selectedToken.symbol === 'WBTC' ? 20 : selectedToken.symbol === 'WETH' ? 200 : 50000;
    
    for (let i = 1; i <= steps; i++) {
      const testAmount = Math.round((maxAmount / steps) * i);
      const math = calculateArbitrageMath({
        loanAmount: testAmount,
        tokenBasePriceUsd: basePrice,
        buyPrice,
        sellPrice,
        flashLoanFeePercent: selectedProvider.feePercent,
        gasUnits: TYPICAL_FLASHLOAN_GAS_UNITS,
        gasPriceGwei: customGasGwei,
        gasTokenPriceUsd: activeNetwork.gasTokenPriceUsd,
      });

      points.push({
        amount: `${testAmount} ${selectedToken.symbol}`,
        amountUsd: `$${Math.round(testAmount * basePrice / 1000)}k`,
        netProfit: Math.round(math.netProfitUsd),
        grossProfit: Math.round(math.grossProfitUsd),
        fees: Math.round(math.flashLoanFeeUsd + math.gasCostUsd),
      });
    }
    return points;
  }, [selectedToken, basePrice, buyPrice, sellPrice, selectedProvider, customGasGwei, activeNetwork]);

  const runDryRunSimulation = async () => {
    setIsSimulating(true);
    setSimulationLogs([]);

    const logMessages = [
      `[1/5] Initiating flashLoanSimple() from ${selectedProvider.name} for ${loanAmount} ${selectedToken.symbol} ($${Math.round(currentMath.loanValueUsd).toLocaleString()})`,
      `[2/5] Callback executeOperation() entered with 0 collateral locked`,
      `[3/5] Swapping ${loanAmount} ${selectedToken.symbol} on ${buyDex.name} @ $${buyPrice.toFixed(2)}`,
      `[4/5] Executing arbitrage counter-swap on ${sellDex.name} @ $${sellPrice.toFixed(2)}`,
      `[5/5] Repaying loan principal + $${currentMath.flashLoanFeeUsd.toFixed(2)} fee (${selectedProvider.feePercent}%). Transferring +$${currentMath.netProfitUsd.toFixed(2)} profit to caller.`,
    ];

    for (let i = 0; i < logMessages.length; i++) {
      await new Promise((r) => setTimeout(r, 280));
      setSimulationLogs((prev) => [...prev, logMessages[i]]);
    }
    setIsSimulating(false);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
              Interactive Flash Loan Sandbox & Route Modeler
            </h3>
            <p className="text-xs text-slate-400">
              Simulate arbitrary borrow amounts, DEX price spreads, and optimal profit curves
            </p>
          </div>
        </div>

        <button
          onClick={runDryRunSimulation}
          disabled={isSimulating}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-950/50 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isSimulating ? 'Simulating Blocks...' : 'Simulate Dry Run'}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Interactive Inputs */}
        <div className="space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
          
          {/* Select Token */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Borrow Asset:</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {TOKENS.filter((t) => !t.isStable).slice(0, 6).map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => setSelectedTokenSymbol(t.symbol)}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    selectedTokenSymbol === t.symbol
                      ? 'border border-cyan-500 bg-cyan-950/60 text-cyan-300'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Select Flash Loan Provider */}
          <div>
            <label className="text-xs font-semibold text-slate-300">Flash Loan Provider:</label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {FLASH_LOAN_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.feeDescription}
                </option>
              ))}
            </select>
          </div>

          {/* Borrow Amount Slider */}
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Borrow Amount:</span>
              <span className="font-mono font-bold text-cyan-400">
                {loanAmount} {selectedToken.symbol} (${Math.round(currentMath.loanValueUsd).toLocaleString()})
              </span>
            </div>
            <input
              type="range"
              min={selectedToken.symbol === 'WBTC' ? 0.5 : selectedToken.symbol === 'WETH' ? 5 : 500}
              max={selectedToken.symbol === 'WBTC' ? 25 : selectedToken.symbol === 'WETH' ? 250 : 25000}
              step={selectedToken.symbol === 'WBTC' ? 0.5 : selectedToken.symbol === 'WETH' ? 5 : 250}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500"
            />
          </div>

          {/* DEX Selection Pair */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Buy DEX:</label>
              <select
                value={buyDexId}
                onChange={(e) => setBuyDexId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
              >
                {DEXES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400">Sell DEX:</label>
              <select
                value={sellDexId}
                onChange={(e) => setSellDexId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
              >
                {DEXES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Spread Slider */}
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">DEX Price Spread:</span>
              <span className="font-mono font-bold text-emerald-400">+{spreadPercent.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={spreadPercent}
              onChange={(e) => setSpreadPercent(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-500"
            />
          </div>

        </div>

        {/* Center: Live Mathematical Result & Profit Curve */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Live Outcome Metrics Card */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <div className="text-[11px] text-slate-400">Gross Arbitrage</div>
              <div className="font-mono text-base font-bold text-slate-200">
                ${currentMath.grossProfitUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Flash Loan Fee</div>
              <div className="font-mono text-base font-bold text-rose-400">
                -${currentMath.flashLoanFeeUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Gas Overhead</div>
              <div className="font-mono text-base font-bold text-rose-400">
                -${currentMath.gasCostUsd.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-emerald-400">Net Expected Profit</div>
              <div className="font-mono text-lg font-extrabold text-emerald-400">
                ${currentMath.netProfitUsd.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Recharts Profit vs Loan Size Chart */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Profit Curve vs. Loan Size (Accounting for Slippage & Fees)
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">
                Optimal Peak: ~${Math.max(...profitCurveData.map(p => p.netProfit)).toLocaleString()}
              </span>
            </div>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="amountUsd" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" name="Net Profit ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Simulation Output Logs */}
          {simulationLogs.length > 0 && (
            <div className="rounded-xl border border-cyan-900/50 bg-slate-950 p-3.5 font-mono text-xs text-cyan-300 space-y-1">
              <div className="text-[11px] text-slate-400 uppercase font-sans font-bold mb-1">
                Transaction Step Trace:
              </div>
              {simulationLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
