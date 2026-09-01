import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Sector 
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  ShieldCheck, 
  Layers, 
  TrendingUp, 
  Coins, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { VaultBalanceItem } from '../types';

interface VaultAssetPieChartProps {
  vaultBalances: VaultBalanceItem[];
  selectedTokenSymbol: string;
  onSelectToken: (symbol: string) => void;
  totalVaultValueUsd: number;
}

// Token brand colors with precise official branding hex values
export const TOKEN_BRAND_COLORS: Record<string, string> = {
  ETH: '#627EEA',     // Ethereum Blue-Purple
  WETH: '#627EEA',    // Wrapped Ether
  USDC: '#2775CA',    // Centre USDC Blue
  USDT: '#26A17B',    // Tether Green
  DAI: '#F5AC37',     // Maker DAI Gold/Orange
  WBTC: '#F7931A',    // Bitcoin Orange
  BTC: '#F7931A',     // Bitcoin Orange
  TUT: '#8B5CF6',     // TUT Violet
  LINK: '#375BD2',    // Chainlink Blue
  UNI: '#FF007A',     // Uniswap Pink
  AAVE: '#B6509E',    // Aave Magenta
  POL: '#8247E5',     // Polygon Purple
  MATIC: '#8247E5',   // Polygon Purple
  BNB: '#F3BA2F',     // Binance Gold
  ARB: '#28A0F0',     // Arbitrum Cyan-Blue
  OP: '#FF0420',      // Optimism Red
  BASE: '#0052FF',    // Base Blue
  SOL: '#14F195',     // Solana Neon Green
  AVAX: '#E84142',    // Avalanche Red
};

export const getTokenBrandColor = (symbol: string, fallbackColor?: string): string => {
  const clean = symbol.toUpperCase().trim();
  return TOKEN_BRAND_COLORS[clean] || fallbackColor || '#3B82F6';
};

// Render active sector with enhanced outer glow and expanded radius
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0px 0px 8px ${fill}99)`,
          transition: 'all 0.3s ease',
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill="#ffffff"
        opacity={0.6}
      />
    </g>
  );
};

export const VaultAssetPieChart: React.FC<VaultAssetPieChartProps> = ({
  vaultBalances,
  selectedTokenSymbol,
  onSelectToken,
  totalVaultValueUsd,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Compute structured data for Recharts Pie Chart
  const chartData = useMemo(() => {
    // Check if all vault balances are zero
    const hasNonZero = vaultBalances.some((b) => b.valueUsd > 0);

    if (!hasNonZero || vaultBalances.length === 0) {
      // Return neutral placeholder ring if vault is freshly initialized
      return vaultBalances.map((b) => ({
        symbol: b.symbol,
        name: b.name,
        amount: b.amount,
        basePriceUsd: b.basePriceUsd,
        valueUsd: 1, // equal slice for visual preview
        realValueUsd: 0,
        percentage: (100 / (vaultBalances.length || 1)),
        color: getTokenBrandColor(b.symbol, b.color),
        isPlaceholder: true,
      }));
    }

    const total = totalVaultValueUsd > 0 ? totalVaultValueUsd : 1;

    return vaultBalances
      .filter((b) => b.valueUsd > 0 || vaultBalances.length <= 4)
      .map((b) => {
        const val = Math.max(0, b.valueUsd);
        const pct = (val / total) * 100;
        return {
          symbol: b.symbol,
          name: b.name,
          amount: b.amount,
          basePriceUsd: b.basePriceUsd,
          valueUsd: val,
          realValueUsd: val,
          percentage: pct,
          color: getTokenBrandColor(b.symbol, b.color),
          isPlaceholder: false,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [vaultBalances, totalVaultValueUsd]);

  // Find active hovered item or currently selected token
  const activeItem = useMemo(() => {
    if (activeIndex !== null && chartData[activeIndex]) {
      return chartData[activeIndex];
    }
    return chartData.find((d) => d.symbol === selectedTokenSymbol) || chartData[0] || null;
  }, [activeIndex, chartData, selectedTokenSymbol]);

  // Compute portfolio breakdown metrics
  const portfolioMetrics = useMemo(() => {
    const stables = vaultBalances
      .filter((b) => ['USDC', 'USDT', 'DAI', 'BUSD', 'USDbC'].includes(b.symbol.toUpperCase()))
      .reduce((acc, curr) => acc + curr.valueUsd, 0);

    const volatile = totalVaultValueUsd > 0 ? Math.max(0, totalVaultValueUsd - stables) : 0;
    const stableRatio = totalVaultValueUsd > 0 ? (stables / totalVaultValueUsd) * 100 : 0;
    const volatileRatio = totalVaultValueUsd > 0 ? (volatile / totalVaultValueUsd) * 100 : 0;

    const dominantToken = [...vaultBalances].sort((a, b) => b.valueUsd - a.valueUsd)[0];

    return {
      stableUsd: stables,
      volatileUsd: volatile,
      stableRatio,
      volatileRatio,
      dominantToken: dominantToken || null,
    };
  }, [vaultBalances, totalVaultValueUsd]);

  // Synchronize initial active index with selectedTokenSymbol
  const currentActiveIndex = useMemo(() => {
    if (activeIndex !== null) return activeIndex;
    const idx = chartData.findIndex((d) => d.symbol === selectedTokenSymbol);
    return idx >= 0 ? idx : 0;
  }, [activeIndex, chartData, selectedTokenSymbol]);

  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4.5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#23282f] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <PieChartIcon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Vault Asset Distribution
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Live Recharts portfolio weightings with authentic token branding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
          <Sparkles className="h-3 w-3" />
          <span>Real-time On-Chain Allocation</span>
        </div>
      </div>

      {/* Chart & Central Donut Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Recharts Pie Visualization (7 cols) */}
        <div className="md:col-span-7 relative flex items-center justify-center min-h-[230px]">
          <div className="w-full h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={chartData.length > 1 ? 3 : 0}
                  dataKey="valueUsd"
                  nameKey="symbol"
                  activeIndex={currentActiveIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(entry: any) => {
                    const sym = entry?.payload?.symbol || entry?.name || entry?.symbol;
                    if (sym) onSelectToken(sym);
                  }}
                  cursor="pointer"
                  animationDuration={700}
                >
                  {chartData.map((entry) => (
                    <Cell 
                      key={`cell-${entry.symbol}`} 
                      fill={entry.color} 
                      stroke="#0d1117"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-[#30363d] bg-[#0d1117]/95 p-3 shadow-xl backdrop-blur text-xs font-mono z-50 space-y-1.5 min-w-[170px]">
                        <div className="flex items-center justify-between gap-2 border-b border-[#23282f] pb-1.5">
                          <div className="flex items-center gap-2">
                            <span 
                              className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: data.color }}
                            />
                            <strong className="text-white font-bold">{data.symbol}</strong>
                          </div>
                          <span className="text-slate-400 text-[10px]">{data.name}</span>
                        </div>

                        <div className="space-y-1 text-[11px] pt-0.5">
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Holdings:</span>
                            <span className="font-bold text-slate-100">
                              {data.amount < 1 ? data.amount.toFixed(4) : data.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">USD Value:</span>
                            <span className="font-bold text-emerald-400">
                              ${data.realValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-400">Portfolio Share:</span>
                            <span className="font-bold text-blue-400">
                              {data.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 text-[9px] text-slate-400 text-center border-t border-[#23282f]">
                          Click to select for withdrawal
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Central Donut Value Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {activeItem ? (
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                  {activeItem.symbol}
                </span>
                <div 
                  className="text-base font-extrabold font-mono transition-colors"
                  style={{ color: activeItem.color }}
                >
                  {activeItem.percentage.toFixed(1)}%
                </div>
                <div className="text-[10px] font-mono text-slate-300 font-bold">
                  ${activeItem.realValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-mono text-slate-400">Total Net Vault</span>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  ${totalVaultValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Summary & Dominance Metrics (5 cols) */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#0d1117] border border-[#23282f] space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase">Stable Assets</span>
              <div className="text-sm font-bold text-emerald-400">
                {portfolioMetrics.stableRatio.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                ${portfolioMetrics.stableUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (USDC/USDT)
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#0d1117] border border-[#23282f] space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase">Volatile / Native</span>
              <div className="text-sm font-bold text-blue-400">
                {portfolioMetrics.volatileRatio.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                ${portfolioMetrics.volatileUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (ETH/WBTC)
              </span>
            </div>
          </div>

          {portfolioMetrics.dominantToken && (
            <div className="p-2.5 rounded bg-[#0d1117] border border-[#23282f] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span 
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: getTokenBrandColor(portfolioMetrics.dominantToken.symbol, portfolioMetrics.dominantToken.color) }}
                />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Dominant Vault Holding</span>
                  <span className="font-bold text-slate-200">
                    {portfolioMetrics.dominantToken.symbol} ({portfolioMetrics.dominantToken.name})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  ${portfolioMetrics.dominantToken.valueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {totalVaultValueUsd > 0 ? ((portfolioMetrics.dominantToken.valueUsd / totalVaultValueUsd) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Interactive Token Legend & Quick Selector Bar */}
      <div className="pt-2 border-t border-[#23282f]">
        <div className="flex items-center justify-between text-[10px] uppercase font-mono text-slate-400 mb-2">
          <span>Interactive Asset Legend (Click to select for harvest)</span>
          <span>{chartData.length} Tracked Tokens</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {chartData.map((item, idx) => {
            const isSelected = selectedTokenSymbol === item.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => onSelectToken(item.symbol)}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`p-2 rounded-lg border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[#121927] border-blue-500/80 shadow-sm shadow-blue-950/80 ring-1 ring-blue-500/40'
                    : 'bg-[#0d1117] border-[#23282f] hover:border-slate-600 hover:bg-[#161b22]'
                }`}
              >
                {/* Brand Color Top Accent Stripe */}
                <div 
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: item.color }}
                />

                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                      {item.symbol}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: item.color }}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[55px]">
                    {item.amount < 1 ? item.amount.toFixed(3) : item.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-slate-300 font-semibold">
                    ${item.realValueUsd < 1000 ? item.realValueUsd.toFixed(0) : (item.realValueUsd / 1000).toFixed(1) + 'k'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
