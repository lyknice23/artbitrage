import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  DollarSign, 
  Percent, 
  Fuel, 
  Flame, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Download,
  Upload,
  Coins,
  Bookmark,
  Shuffle,
  Compass,
  FileCheck,
  TrendingUp,
  Tag
} from 'lucide-react';
import { BotConfig, Network } from '../types';
import { DEXES, FLASH_LOAN_PROVIDERS, DEFAULT_MONITORED_PAIRS, TOKENS } from '../data/chainsAndDexes';

export interface NamedStrategyPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  tag: string;
  targetCoins: string[];
  exchanges: string[];
  minRoiPercent: number;
  minProfitUsd: number;
  maxSlippage: number;
  gasPriceCeiling: number;
  mevProtection: boolean;
}

const DEFAULT_STRATEGY_TEMPLATES: NamedStrategyPreset[] = [
  {
    id: 'eth_defi_bluechip',
    name: 'Bluechip Cross-DEX Harvest',
    description: 'Target high-liquidity ETH & BTC pairs between Uniswap v3, SushiSwap, and Curve.',
    icon: '💎',
    tag: 'Low Risk',
    targetCoins: ['WETH', 'WBTC', 'wstETH', 'AAVE', 'LINK'],
    exchanges: ['uniswap_v3', 'sushiswap', 'curve', 'balancer'],
    minRoiPercent: 0.05,
    minProfitUsd: 35,
    maxSlippage: 0.35,
    gasPriceCeiling: 45,
    mevProtection: true,
  },
  {
    id: 'stablecoin_peg_arbitrage',
    name: 'Stablecoin Curve / Balancer Peg Loop',
    description: 'Exploits micro 0.02%-0.08% peg deviations between USDC, USDT, and DAI on zero-slippage pools.',
    icon: '⚖️',
    tag: 'Ultra High Volume',
    targetCoins: ['USDC', 'USDT', 'DAI'],
    exchanges: ['curve', 'balancer', 'uniswap_v3'],
    minRoiPercent: 0.02,
    minProfitUsd: 15,
    maxSlippage: 0.15,
    gasPriceCeiling: 30,
    mevProtection: true,
  },
  {
    id: 'alt_volatility_hunter',
    name: 'Altcoin High-Spread Hunter',
    description: 'Captures wide 0.5% - 2.5% arbitrage spreads on volatile tokens like PEPE, UNI, ARB, and LINK.',
    icon: '🚀',
    tag: 'High Yield',
    targetCoins: ['PEPE', 'ARB', 'UNI', 'LINK', 'AAVE'],
    exchanges: ['uniswap_v3', 'sushiswap', 'pancakeswap', 'trader_joe'],
    minRoiPercent: 0.25,
    minProfitUsd: 65,
    maxSlippage: 0.75,
    gasPriceCeiling: 80,
    mevProtection: true,
  },
  {
    id: 'free_flash_zero_capital',
    name: 'Zero-Fee Flash Vault Optimizer',
    description: 'Routes exclusively through Balancer & dYdX 0% fee flashloan vaults for pure profit margin.',
    icon: '⚡',
    tag: '0% Loan Fee',
    targetCoins: ['WETH', 'WBTC', 'USDC', 'DAI', 'wstETH'],
    exchanges: ['uniswap_v3', 'sushiswap', 'curve', 'balancer', 'aerodrome'],
    minRoiPercent: 0.04,
    minProfitUsd: 20,
    maxSlippage: 0.40,
    gasPriceCeiling: 55,
    mevProtection: true,
  }
];

interface CustomStrategyParametersProps {
  config: BotConfig;
  setConfig: React.Dispatch<React.SetStateAction<BotConfig>>;
  activeNetwork: Network;
  onApplyPreset?: (presetName: string) => void;
}

export const CustomStrategyParameters: React.FC<CustomStrategyParametersProps> = ({
  config,
  setConfig,
  activeNetwork,
}) => {
  // Strategy presets state (with persistent templates and custom user saved strategies)
  const [strategyPresets, setStrategyPresets] = useState<NamedStrategyPreset[]>(() => {
    const saved = localStorage.getItem('arb_custom_strategies');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...DEFAULT_STRATEGY_TEMPLATES, ...parsed];
      } catch {
        return DEFAULT_STRATEGY_TEMPLATES;
      }
    }
    return DEFAULT_STRATEGY_TEMPLATES;
  });

  const [activeStrategyId, setActiveStrategyId] = useState<string>('eth_defi_bluechip');
  const [newStrategyName, setNewStrategyName] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  // Local state for adding custom token pair or single coin
  const [customBase, setCustomBase] = useState<string>('');
  const [customQuote, setCustomQuote] = useState<string>('USDC');
  const [customCoinPrice, setCustomCoinPrice] = useState<string>('');
  const [addError, setAddError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Common quote options
  const quoteOptions = ['USDC', 'USDT', 'WETH', 'DAI', 'wstETH'];

  // Current active coins extracted from monitored pairs
  const currentPairs = config.monitoredPairs || DEFAULT_MONITORED_PAIRS;
  const currentDexes = config.selectedDexes || DEXES.map((d) => d.id);

  // Derived monitored base coins list
  const activeCoinsList: string[] = Array.from<string>(
    new Set(currentPairs.map((p) => (p.includes('/') ? p.split('/')[0] : p)))
  );

  // Toggle DEX in preferred list
  const toggleDex = (dexId: string) => {
    setConfig((prev) => {
      const current = prev.selectedDexes || [];
      const exists = current.includes(dexId);
      if (exists && current.length <= 2) {
        return prev; // Maintain at least 2 DEXs to form arbitrage pairs
      }
      const updated = exists ? current.filter((id) => id !== dexId) : [...current, dexId];
      return {
        ...prev,
        selectedDexes: updated,
      };
    });
    triggerSaveToast('DEX routing updated');
  };

  const selectAllDexes = () => {
    setConfig((prev) => ({
      ...prev,
      selectedDexes: DEXES.map((d) => d.id),
    }));
    triggerSaveToast('All exchanges selected');
  };

  const selectTopDexes = () => {
    setConfig((prev) => ({
      ...prev,
      selectedDexes: ['uniswap_v3', 'sushiswap', 'curve', 'balancer'],
    }));
    triggerSaveToast('Top tier exchanges selected');
  };

  // Toggle a single coin in monitoring (adds/removes default pair with USDC/WETH)
  const toggleBaseCoin = (coinSymbol: string) => {
    const defaultQuote = coinSymbol === 'USDC' || coinSymbol === 'USDT' || coinSymbol === 'DAI' ? 'USDC' : 'USDC';
    const pair1 = `${coinSymbol}/${defaultQuote === coinSymbol ? 'WETH' : defaultQuote}`;
    const pair2 = `${coinSymbol}/WETH`;

    const isCurrentlyMonitored = currentPairs.some((p) => {
      const base = p.includes('/') ? p.split('/')[0] : p;
      return base.toUpperCase() === coinSymbol.toUpperCase();
    });

    if (isCurrentlyMonitored) {
      // Remove all pairs starting with this coin
      const updated = currentPairs.filter((p) => {
        const base = p.includes('/') ? p.split('/')[0] : p;
        return base.toUpperCase() !== coinSymbol.toUpperCase();
      });
      if (updated.length >= 1) {
        setConfig((prev) => ({ ...prev, monitoredPairs: updated }));
        triggerSaveToast(`Removed ${coinSymbol} from monitored coins`);
      }
    } else {
      // Add standard pairs for this coin
      const newPair = coinSymbol === 'WETH' ? 'WETH/USDC' : pair1;
      setConfig((prev) => ({
        ...prev,
        monitoredPairs: [...currentPairs, newPair],
      }));
      triggerSaveToast(`Added ${coinSymbol} to strategy monitoring`);
    }
  };

  // Quick select coin basket presets
  const selectCoinBasket = (type: 'all' | 'defi' | 'stables' | 'layer2') => {
    let targetSymbols: string[] = [];
    if (type === 'all') {
      targetSymbols = TOKENS.map((t) => t.symbol);
    } else if (type === 'defi') {
      targetSymbols = ['WETH', 'WBTC', 'AAVE', 'LINK', 'UNI', 'wstETH'];
    } else if (type === 'stables') {
      targetSymbols = ['USDC', 'USDT', 'DAI'];
    } else if (type === 'layer2') {
      targetSymbols = ['ARB', 'WETH', 'USDC', 'PEPE'];
    }

    const newPairs: string[] = [];
    targetSymbols.forEach((sym) => {
      if (sym === 'USDC' || sym === 'USDT' || sym === 'DAI') {
        newPairs.push(`${sym}/USDC`);
      } else {
        newPairs.push(`${sym}/USDC`);
        if (sym === 'WBTC' || sym === 'LINK') newPairs.push(`${sym}/WETH`);
      }
    });

    const uniquePairs = Array.from(new Set(newPairs)).filter((p) => {
      const [b, q] = p.split('/');
      return b !== q;
    });

    setConfig((prev) => ({
      ...prev,
      monitoredPairs: uniquePairs.length > 0 ? uniquePairs : DEFAULT_MONITORED_PAIRS,
    }));
    triggerSaveToast(`Loaded ${type.toUpperCase()} coin basket`);
  };

  // Toggle Monitored Pair
  const togglePair = (pair: string) => {
    setConfig((prev) => {
      const current = prev.monitoredPairs || DEFAULT_MONITORED_PAIRS;
      const exists = current.includes(pair);
      if (exists && current.length <= 1) {
        return prev; // Maintain at least 1 pair
      }
      return {
        ...prev,
        monitoredPairs: exists ? current.filter((p) => p !== pair) : [...current, pair],
      };
    });
    triggerSaveToast('Token pair toggled');
  };

  // Add custom token pair or custom new coin
  const handleAddCustomPair = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBase = customBase.trim().toUpperCase();
    const cleanQuote = customQuote.trim().toUpperCase();

    if (!cleanBase) {
      setAddError('Please enter a base coin symbol (e.g. SOL, SUI, AVAX)');
      return;
    }
    if (cleanBase === cleanQuote) {
      setAddError('Base coin and quote currency cannot be the same');
      return;
    }

    const pairString = `${cleanBase}/${cleanQuote}`;
    const currentPairsList = config.monitoredPairs || DEFAULT_MONITORED_PAIRS;

    if (currentPairsList.includes(pairString)) {
      setAddError(`Pair ${pairString} is already being monitored in this strategy`);
      return;
    }

    // Register token if not already in system
    if (!TOKENS.some((t) => t.symbol === cleanBase)) {
      const parsedPrice = parseFloat(customCoinPrice) || (cleanBase === 'SOL' ? 190 : cleanBase === 'SUI' ? 3.4 : cleanBase === 'AVAX' ? 32 : 1.0);
      TOKENS.push({
        symbol: cleanBase,
        name: cleanBase,
        address: '0x' + Math.random().toString(16).substring(2, 42),
        decimals: 18,
        basePriceUsd: parsedPrice,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
      });
    }

    setConfig((prev) => ({
      ...prev,
      monitoredPairs: [...(prev.monitoredPairs || DEFAULT_MONITORED_PAIRS), pairString],
    }));

    setCustomBase('');
    setCustomCoinPrice('');
    setAddError(null);
    triggerSaveToast(`Added ${pairString} to strategy`);
  };

  const removePair = (pairToRemove: string) => {
    setConfig((prev) => {
      const current = prev.monitoredPairs || DEFAULT_MONITORED_PAIRS;
      if (current.length <= 1) return prev;
      return {
        ...prev,
        monitoredPairs: current.filter((p) => p !== pairToRemove),
      };
    });
    triggerSaveToast(`Removed ${pairToRemove}`);
  };

  const triggerSaveToast = (msg: string = 'Parameters Updated') => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Apply a full strategy preset (Exchanges + Coins + Profit Knobs)
  const applyStrategyPreset = (preset: NamedStrategyPreset) => {
    setActiveStrategyId(preset.id);
    
    // Construct pairs for the preset target coins
    const newPairs: string[] = [];
    preset.targetCoins.forEach((coin) => {
      if (coin === 'USDC' || coin === 'USDT' || coin === 'DAI') {
        newPairs.push(`${coin}/USDC`);
      } else {
        newPairs.push(`${coin}/USDC`);
        if (coin === 'WBTC' || coin === 'LINK' || coin === 'wstETH' || coin === 'AAVE') {
          newPairs.push(`${coin}/WETH`);
        }
      }
    });

    const uniquePairs = Array.from(new Set(newPairs)).filter((p) => {
      const [b, q] = p.split('/');
      return b !== q;
    });

    setConfig((prev) => ({
      ...prev,
      selectedDexes: [...preset.exchanges],
      monitoredPairs: uniquePairs.length > 0 ? uniquePairs : DEFAULT_MONITORED_PAIRS,
      minRoiPercent: preset.minRoiPercent,
      minProfitThresholdUsd: preset.minProfitUsd,
      maxSlippagePercent: preset.maxSlippage,
      gasPriceCeilingGwei: preset.gasPriceCeiling,
      mevProtection: preset.mevProtection,
    }));

    triggerSaveToast(`Loaded "${preset.name}" Strategy`);
  };

  // Save current customized settings as a new named strategy
  const handleSaveCurrentAsStrategy = () => {
    const name = newStrategyName.trim() || `Custom Strategy ${strategyPresets.length + 1}`;
    const newPreset: NamedStrategyPreset = {
      id: `custom_strat_${Date.now()}`,
      name,
      description: `Custom strategy routing through ${currentDexes.length} DEXs with ${activeCoinsList.length} monitored assets.`,
      icon: '⚡',
      tag: 'Custom',
      targetCoins: [...activeCoinsList],
      exchanges: [...currentDexes],
      minRoiPercent: config.minRoiPercent,
      minProfitUsd: config.minProfitThresholdUsd,
      maxSlippage: config.maxSlippagePercent,
      gasPriceCeiling: config.gasPriceCeilingGwei,
      mevProtection: config.mevProtection,
    };

    const updatedPresets = [...strategyPresets, newPreset];
    setStrategyPresets(updatedPresets);
    setActiveStrategyId(newPreset.id);

    // Save custom ones to localStorage
    const customOnly = updatedPresets.filter((p) => p.tag === 'Custom');
    localStorage.setItem('arb_custom_strategies', JSON.stringify(customOnly));

    setNewStrategyName('');
    setShowSaveModal(false);
    triggerSaveToast(`Strategy "${name}" Saved Successfully`);
  };

  const deleteCustomStrategy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = strategyPresets.filter((p) => p.id !== id);
    setStrategyPresets(updated);
    const customOnly = updated.filter((p) => p.tag === 'Custom');
    localStorage.setItem('arb_custom_strategies', JSON.stringify(customOnly));
    triggerSaveToast('Strategy Deleted');
  };

  const resetToDefaults = () => {
    setConfig((prev) => ({
      ...prev,
      minProfitThresholdUsd: 25,
      minRoiPercent: 0.05,
      maxSlippagePercent: 0.5,
      gasPriceCeilingGwei: 60,
      selectedDexes: ['uniswap_v3', 'sushiswap', 'curve', 'balancer', 'pancakeswap'],
      monitoredPairs: [...DEFAULT_MONITORED_PAIRS],
      selectedProviders: ['aave_v3', 'balancer_vault', 'uniswap_v3_flash'],
      mevProtection: true,
      gasMultiplier: 1.2,
      scanIntervalMs: 2000,
    }));
    setActiveStrategyId('eth_defi_bluechip');
    triggerSaveToast('Reset to Default Strategy');
  };

  const exportConfigJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `arb_strategy_config_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-[#0d1117] border border-[#23282f] rounded-lg p-5 space-y-6">
      
      {/* Top Header & Strategy Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23282f] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600/10 text-blue-400 border border-blue-500/30">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              Arbitrage Strategy Builder & Exchange / Coin Customizer
              {saveToast && (
                <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1 animate-fadeIn">
                  <Check className="h-3 w-3" /> {saveToast}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Create and tailor custom arbitrage strategies: specify exact exchanges (DEXs), choose target coins, and tune profit margins
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="save-current-strategy-btn"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs text-white transition-colors font-medium shadow-sm shadow-blue-900/30"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Save Strategy</span>
          </button>
          <button
            id="export-strategy-btn"
            onClick={exportConfigJson}
            title="Export strategy settings to JSON"
            className="flex items-center gap-1.5 rounded bg-[#161b22] border border-[#30363d] px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            id="reset-strategy-defaults-btn"
            onClick={resetToDefaults}
            title="Reset to recommended defaults"
            className="flex items-center gap-1.5 rounded bg-[#161b22] border border-[#30363d] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-mono"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Strategy Preset Cards Gallery */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-blue-400" />
            Pre-Built Strategy Blueprints & Saved Custom Strategies
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {strategyPresets.length} Strategies Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {strategyPresets.map((preset) => {
            const isActive = activeStrategyId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => applyStrategyPreset(preset)}
                className={`cursor-pointer rounded-lg border p-3.5 transition-all flex flex-col justify-between relative group ${
                  isActive
                    ? 'bg-blue-950/30 border-blue-500 shadow-md shadow-blue-950/50'
                    : 'bg-[#161b22] border-[#30363d] hover:border-slate-500 hover:bg-[#1a202c]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-xs font-bold text-slate-100">{preset.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                        preset.tag === 'Custom' 
                          ? 'bg-purple-950/60 text-purple-300 border-purple-800/50' 
                          : 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                      }`}>
                        {preset.tag}
                      </span>
                      {preset.tag === 'Custom' && (
                        <button
                          type="button"
                          onClick={(e) => deleteCustomStrategy(preset.id, e)}
                          title="Delete Custom Strategy"
                          className="text-slate-500 hover:text-rose-400 transition-colors p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#23282f] space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Coins:</span>
                    {preset.targetCoins.slice(0, 3).map((c) => (
                      <span key={c} className="text-[9px] font-mono bg-[#0d1117] text-slate-300 px-1 rounded border border-[#23282f]">
                        {c}
                      </span>
                    ))}
                    {preset.targetCoins.length > 3 && (
                      <span className="text-[9px] font-mono text-slate-500">+{preset.targetCoins.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Min ROI: <strong className="text-blue-400">{preset.minRoiPercent}%</strong></span>
                    <span>Min Net: <strong className="text-emerald-400">${preset.minProfitUsd}</strong></span>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 1: Customize Exchanges (DEXs) */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                1. Select Exchanges & Automated Market Makers (DEXs)
              </h3>
              <span className="text-[10px] font-mono bg-blue-900/30 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded">
                {currentDexes.length} / {DEXES.length} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Choose which decentralized exchanges to cross-reference for price imbalances and trade routing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="select-all-dexes-btn"
              type="button"
              onClick={selectAllDexes}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] transition-colors"
            >
              Select All DEXs
            </button>
            <button
              id="select-top-dexes-btn"
              type="button"
              onClick={selectTopDexes}
              className="text-[11px] text-slate-400 hover:text-slate-200 font-medium px-2.5 py-1 rounded bg-[#0d1117] border border-[#30363d] transition-colors"
            >
              Top Liquidity (Uni/Sushi/Curve/Balancer)
            </button>
          </div>
        </div>

        {/* DEX Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DEXES.map((dex) => {
            const isSelected = currentDexes.includes(dex.id);
            return (
              <div
                key={dex.id}
                onClick={() => toggleDex(dex.id)}
                className={`cursor-pointer rounded border p-3 transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-blue-950/30 border-blue-500/80 shadow-sm'
                    : 'bg-[#0d1117] border-[#23282f] opacity-50 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: dex.color }}
                    ></span>
                    <span className="text-xs font-bold text-slate-200">{dex.name}</span>
                  </div>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                    isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-[#30363d]'
                  }`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Fee: {dex.feeTier}</span>
                  <span>Slippage: ~{dex.avgSlippagePercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Customize Coins & Token Pairs */}
      <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                2. Customize Target Coins & Monitored Pairs
              </h3>
              <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded">
                {activeCoinsList.length} Coins Active ({currentPairs.length} Pairs)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click individual coins to toggle them in your strategy or add custom crypto assets below
            </p>
          </div>

          {/* Quick Coin Baskets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Baskets:</span>
            <button
              type="button"
              onClick={() => selectCoinBasket('all')}
              className="text-[11px] text-slate-300 hover:text-white font-medium px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d]"
            >
              All Coins
            </button>
            <button
              type="button"
              onClick={() => selectCoinBasket('defi')}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d]"
            >
              DeFi Bluechips
            </button>
            <button
              type="button"
              onClick={() => selectCoinBasket('stables')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d]"
            >
              Stablecoins
            </button>
            <button
              type="button"
              onClick={() => selectCoinBasket('layer2')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d]"
            >
              Layer 2 & Meme
            </button>
          </div>
        </div>

        {/* Quick Coin Toggle Matrix */}
        <div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mb-2 flex items-center justify-between">
            <span>Available Coins in Strategy:</span>
            <span className="text-[10px] text-slate-500 font-mono">Click to toggle coin in strategy</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {TOKENS.map((token) => {
              const isMonitored = activeCoinsList.includes(token.symbol);
              return (
                <div
                  key={token.symbol}
                  onClick={() => toggleBaseCoin(token.symbol)}
                  className={`cursor-pointer rounded p-2.5 border transition-all flex items-center justify-between select-none ${
                    isMonitored
                      ? 'bg-emerald-950/30 border-emerald-500/70 text-slate-100 shadow-sm'
                      : 'bg-[#0d1117] border-[#23282f] text-slate-400 opacity-50 hover:opacity-100 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: token.color }}
                    ></span>
                    <div className="truncate">
                      <div className="text-xs font-bold font-mono">{token.symbol}</div>
                      <div className="text-[10px] text-slate-500 truncate">${token.basePriceUsd.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 ${
                    isMonitored ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-[#30363d]'
                  }`}>
                    {isMonitored && <Check className="h-2.5 w-2.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Monitored Pairs Chips */}
        <div className="pt-2 border-t border-[#23282f]">
          <div className="text-[11px] text-slate-400 uppercase font-semibold mb-2">
            Active Strategy Token Pairs ({currentPairs.length}):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentPairs.map((pair) => (
              <div
                key={pair}
                className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] hover:border-blue-500/50 rounded px-2.5 py-1 text-xs font-mono text-slate-200 transition-colors"
              >
                <span className="font-semibold text-blue-400">{pair.split('/')[0]}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-300">{pair.split('/')[1]}</span>
                <button
                  type="button"
                  onClick={() => removePair(pair)}
                  title={`Remove ${pair} from strategy`}
                  className="ml-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Custom Token Pair Form */}
        <form onSubmit={handleAddCustomPair} className="bg-[#0d1117] border border-[#23282f] rounded-lg p-3.5 mt-2">
          <div className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            <span>Add Custom Coin or Token Pair to Strategy:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="custom-base-input" className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                Base Coin Symbol (e.g. SOL, SUI, AVAX)
              </label>
              <input
                id="custom-base-input"
                type="text"
                placeholder="e.g. SOL"
                value={customBase}
                onChange={(e) => {
                  setCustomBase(e.target.value);
                  if (addError) setAddError(null);
                }}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-blue-500 rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 uppercase focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="custom-quote-select" className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                Quote Currency
              </label>
              <select
                id="custom-quote-select"
                value={customQuote}
                onChange={(e) => setCustomQuote(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-blue-500 rounded px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none"
              >
                {quoteOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="custom-price-input" className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                Est. Price in USD (Optional)
              </label>
              <input
                id="custom-price-input"
                type="number"
                placeholder="e.g. 190.50"
                value={customCoinPrice}
                onChange={(e) => setCustomCoinPrice(e.target.value)}
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-blue-500 rounded px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <button
                id="add-pair-btn"
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add to Strategy</span>
              </button>
            </div>
          </div>

          {addError && (
            <p className="text-[11px] text-rose-400 mt-2 font-mono">{addError}</p>
          )}
        </form>
      </div>

      {/* Section 3: Profit Thresholds (Percentage & Net USD) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Min Profit Percentage (ROI %) */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="min-roi-input" className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
                <Percent className="h-4 w-4 text-blue-400" />
                Minimum Profit Percentage (ROI %)
              </label>
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1">
                <input
                  id="min-roi-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10"
                  value={config.minRoiPercent}
                  onChange={(e) => setConfig((prev) => ({ ...prev, minRoiPercent: Math.max(0.01, Number(e.target.value)) }))}
                  className="w-16 bg-transparent text-right font-mono text-sm font-bold text-blue-400 focus:outline-none"
                />
                <span className="text-xs font-mono text-slate-400">%</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Arbitrage opportunities with a net return on loan capital below this percentage will be filtered out.
            </p>
          </div>

          <div>
            <input
              id="min-roi-slider"
              type="range"
              min="0.01"
              max="2.0"
              step="0.01"
              value={config.minRoiPercent}
              onChange={(e) => setConfig((prev) => ({ ...prev, minRoiPercent: Number(e.target.value) }))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-blue-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-1 mt-2 text-[10px] text-slate-500 font-mono">
              <span>0.01% (Micro)</span>
              <span>0.10% (Standard)</span>
              <span>0.50% (High)</span>
              <span>2.00%+ (Extreme)</span>
            </div>
          </div>

          {/* Quick Preset Buttons for ROI */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#23282f]">
            <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Quick Sets:</span>
            {[0.02, 0.05, 0.10, 0.25, 0.50, 1.00].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, minRoiPercent: val }))}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  config.minRoiPercent === val
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-slate-200'
                }`}
              >
                {val.toFixed(2)}%
              </button>
            ))}
          </div>
        </div>

        {/* Min Net Profit in USD ($) */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="min-profit-input" className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Minimum Net Profit ($ USD)
              </label>
              <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1">
                <span className="text-xs font-mono text-emerald-400">$</span>
                <input
                  id="min-profit-input"
                  type="number"
                  step="5"
                  min="1"
                  max="1000"
                  value={config.minProfitThresholdUsd}
                  onChange={(e) => setConfig((prev) => ({ ...prev, minProfitThresholdUsd: Math.max(1, Number(e.target.value)) }))}
                  className="w-16 bg-transparent text-right font-mono text-sm font-bold text-emerald-400 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum absolute net gain after subtracting DEX swap slippage, flash loan fees, and estimated gas.
            </p>
          </div>

          <div>
            <input
              id="min-profit-slider-ctrl"
              type="range"
              min="5"
              max="250"
              step="5"
              value={config.minProfitThresholdUsd}
              onChange={(e) => setConfig((prev) => ({ ...prev, minProfitThresholdUsd: Number(e.target.value) }))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-emerald-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-1 mt-2 text-[10px] text-slate-500 font-mono">
              <span>$5 (Aggressive)</span>
              <span>$25 (Balanced)</span>
              <span>$100 (Safe)</span>
              <span>$250+ (Whale)</span>
            </div>
          </div>

          {/* Quick Preset Buttons for USD */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#23282f]">
            <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Quick Sets:</span>
            {[10, 25, 50, 100, 200].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, minProfitThresholdUsd: val }))}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  config.minProfitThresholdUsd === val
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-slate-200'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Section 4: Safeguards & Gas Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Slippage */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Max Slippage Limit
            </span>
            <span className="font-mono text-xs font-bold text-blue-400">{config.maxSlippagePercent}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.50"
            step="0.05"
            value={config.maxSlippagePercent}
            onChange={(e) => setConfig((prev) => ({ ...prev, maxSlippagePercent: Number(e.target.value) }))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-blue-500"
          />
          <p className="text-[10px] text-slate-500 font-mono">
            Transaction reverts if price impact exceeds this ceiling.
          </p>
        </div>

        {/* Gas Ceiling */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-amber-400" /> Gas Price Ceiling
            </span>
            <span className="font-mono text-xs font-bold text-amber-400">{config.gasPriceCeilingGwei} Gwei</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={config.gasPriceCeilingGwei}
            onChange={(e) => setConfig((prev) => ({ ...prev, gasPriceCeilingGwei: Number(e.target.value) }))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#23282f] accent-amber-500"
          />
          <p className="text-[10px] text-slate-500 font-mono">
            Pauses auto-execution if network gas spikes above ceiling.
          </p>
        </div>

        {/* MEV Frontrun Protection */}
        <div className="rounded-md border border-[#30363d] bg-[#161b22] p-3.5 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Flashbots RPC
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.mevProtection}
                onChange={(e) => setConfig((prev) => ({ ...prev, mevProtection: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-[#23282f] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
          <p className="text-[10px] text-slate-400">
            {config.mevProtection ? 'Shielded from searcher sandwich bots via private mempool bundle.' : 'Unprotected public mempool.'}
          </p>
        </div>

      </div>

      {/* Save Custom Strategy Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Current Strategy</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="strategy-name-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Strategy Name
                </label>
                <input
                  id="strategy-name-input"
                  type="text"
                  placeholder="e.g. My Uniswap/Curve PEPE Scalper"
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-[#161b22] p-3 rounded border border-[#23282f] space-y-1.5 text-[11px] font-mono text-slate-300">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">Strategy Summary:</div>
                <div>• Exchanges: {currentDexes.length} selected ({currentDexes.join(', ')})</div>
                <div>• Target Coins: {activeCoinsList.length} monitored ({activeCoinsList.join(', ')})</div>
                <div>• Min ROI: {config.minRoiPercent}% | Min Net: ${config.minProfitThresholdUsd}</div>
                <div>• Flashbots Protection: {config.mevProtection ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23282f]">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsStrategy}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-sm"
              >
                Save Strategy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
