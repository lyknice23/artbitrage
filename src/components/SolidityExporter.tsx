import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  Terminal, 
  Layers, 
  ExternalLink,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { Network } from '../types';
import { FLASH_LOAN_PROVIDERS } from '../data/chainsAndDexes';

interface SolidityExporterProps {
  activeNetwork: Network;
}

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FlashLoanArbitrage
 * @author Quantitative DeFi MEV Bot Engine
 * @notice Executes atomic, zero-capital Flash Loan arbitrage between Uniswap V3 and SushiSwap V2
 * @dev Inherits from Aave V3 FlashLoanSimpleReceiverBase and OpenZeppelin Ownable
 */

import { FlashLoanSimpleReceiverBase } from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import { IPoolAddressesProvider } from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable, ReentrancyGuard {
    ISwapRouterV3 public immutable uniV3Router;
    IUniswapV2Router public immutable sushiRouter;

    event ArbitrageExecuted(
        address indexed asset,
        uint256 amountBorrowed,
        uint256 flashLoanFee,
        uint256 netProfit
    );

    event BuilderBribePaid(address indexed builder, uint256 bribeAmount);

    constructor(
        address _addressProvider,
        address _uniV3Router,
        address _sushiRouter
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) Ownable(msg.sender) {
        uniV3Router = ISwapRouterV3(_uniV3Router);
        sushiRouter = IUniswapV2Router(_sushiRouter);
    }

    /**
     * @notice Aave v3 Flash loan callback
     * @dev Executed in the SAME atomic block transaction
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        require(msg.sender == address(POOL), "FlashLoan: Caller must be Aave Pool");
        require(initiator == address(this), "FlashLoan: Untrusted initiator");

        (
            address targetToken,
            uint24 uniV3Fee,
            uint256 minNetProfit,
            uint256 builderBribeBps
        ) = abi.decode(params, (address, uint24, uint256, uint256));

        uint256 amountOwed = amount + premium;

        // Step 1: Approve Uni V3 Router for the borrowed asset
        IERC20(asset).approve(address(uniV3Router), amount);

        // Step 2: Swap asset -> targetToken on Uniswap V3 (Buy Low)
        ISwapRouterV3.ExactInputSingleParams memory swapParams = ISwapRouterV3.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: targetToken,
            fee: uniV3Fee,
            recipient: address(this),
            amountIn: amount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uint256 targetTokensReceived = uniV3Router.exactInputSingle(swapParams);

        // Step 3: Swap targetToken -> asset on SushiSwap V2 (Sell High)
        IERC20(targetToken).approve(address(sushiRouter), targetTokensReceived);
        address[] memory path = new address[](2);
        path[0] = targetToken;
        path[1] = asset;

        uint256[] memory amounts = sushiRouter.swapExactTokensForTokens(
            targetTokensReceived,
            amountOwed + minNetProfit,
            path,
            address(this),
            block.timestamp
        );

        uint256 finalBalance = IERC20(asset).balanceOf(address(this));
        
        // Step 4: Strict Profitability & Invariant Check
        require(finalBalance >= amountOwed + minNetProfit, "FlashLoan: Arbitrage Unprofitable");

        // Step 5: Approve Aave Pool to pull repayment principal + fee
        IERC20(asset).approve(address(POOL), amountOwed);

        uint256 netProfit = finalBalance - amountOwed;

        // Optional Step 6: Flashbots Builder Bribe Payment for bundle inclusion
        if (builderBribeBps > 0 && block.coinbase != address(0)) {
            uint256 bribe = (netProfit * builderBribeBps) / 10000;
            if (bribe > 0) {
                // If asset is WETH, unwrap or pay ETH directly
                payable(block.coinbase).transfer(bribe);
                emit BuilderBribePaid(block.coinbase, bribe);
                netProfit -= bribe;
            }
        }

        emit ArbitrageExecuted(asset, amount, premium, netProfit);
        return true;
    }

    /**
     * @notice Initiates flash loan request from Aave v3 Pool
     */
    function requestFlashLoan(
        address _asset,
        uint256 _amount,
        address _targetToken,
        uint24 _uniV3Fee,
        uint256 _minNetProfit,
        uint256 _builderBribeBps
    ) external onlyOwner {
        bytes memory params = abi.encode(_targetToken, _uniV3Fee, _minNetProfit, _builderBribeBps);
        POOL.flashLoanSimple(address(this), _asset, _amount, params, 0);
    }

    /**
     * @notice Emergency withdrawal of accumulated profits or stuck tokens
     */
    function withdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(_token).transfer(owner(), balance);
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner()).transfer(balance);
    }

    receive() external payable {}
}`;

export const SolidityExporter: React.FC<SolidityExporterProps> = ({ activeNetwork }) => {
  const [contractCode, setContractCode] = useState<string>(DEFAULT_CONTRACT);
  const [providerType, setProviderType] = useState<string>('aave_v3');
  const [routerPair, setRouterPair] = useState<string>('univ3_sushi');
  const [includeFlashbotsBribe, setIncludeFlashbotsBribe] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const copyCode = () => {
    navigator.clipboard.writeText(contractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([contractCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `FlashLoanArbitrage_${providerType}.sol`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  const generateWithAi = async () => {
    setIsGenerating(true);
    try {
      const selectedProvider = FLASH_LOAN_PROVIDERS.find((p) => p.id === providerType) || FLASH_LOAN_PROVIDERS[0];
      const res = await fetch('/api/gemini/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: `${selectedProvider.name} (${selectedProvider.contractInterface})`,
          routers: routerPair === 'univ3_sushi' 
            ? ['Uniswap v3 Universal Router (0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD)', 'SushiSwap RouteProcessor5 (0x83e950337A116964666802DB242149787CA775b8)']
            : routerPair === 'oneinch_univ3'
            ? ['1inch AggregationRouterV6 (0x111111125421cA6dc452d289314280a0f8842A65)', 'Uniswap v3 (0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD)']
            : ['0x Settler Proxy (0xDef1C0ded9bec7F1a1670819833240f027b25EfF)', 'Curve RouterNG (0xF0d4c12A5768D806021F80a262B4d39d26C58b8D)'],
          pair: 'WETH / USDC Zero-Account Flash Loan Swap',
          features: [
            'Re-entrancy Guard',
            'Atomic Profit Requirement Check (revert on deficit)',
            includeFlashbotsBribe ? 'Block Builder Direct Bribe Tip (Coinbase transfer)' : 'Standard MEV Protection',
            'Emergency Owner Asset Rescue'
          ],
        }),
      });

      const data = await res.json();
      if (data.success && data.contractCode) {
        setContractCode(data.contractCode);
      }
    } catch {
      // Fallback
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Code className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
              Battle-Tested Solidity Smart Contract Generator
            </h3>
            <p className="text-xs text-slate-400">
              Deployable Solidity 0.8.20+ with Aave v3 callback, reentrancy guards, and atomic revert safety
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={generateWithAi}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-950/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>Regenerate with AI</span>
          </button>

          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={downloadFile}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-950/40"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .sol</span>
          </button>
        </div>
      </div>

      {/* Protocol & Router Configuration Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Flash Loan Protocol (No Account)
          </label>
          <select
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:border-cyan-500 focus:outline-none"
          >
            {FLASH_LOAN_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.feePercent === 0 ? '0% Free' : p.feeDescription})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            DEX Routers / Aggregators
          </label>
          <select
            value={routerPair}
            onChange={(e) => setRouterPair(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-medium focus:border-cyan-500 focus:outline-none"
          >
            <option value="univ3_sushi">Uniswap v3 Universal Router ↔ SushiSwap RP5</option>
            <option value="oneinch_univ3">1inch AggregationRouterV6 ↔ Uniswap v3</option>
            <option value="zerox_curve">0x Settler / Permit2 ↔ Curve RouterNG</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-center pt-4 sm:pt-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFlashbotsBribe}
              onChange={(e) => setIncludeFlashbotsBribe(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
            />
            <span>Flashbots Builder Bribe Tip</span>
          </label>
        </div>
      </div>

      {/* Contract Code Viewer */}
      <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400 font-mono">
          <span>FlashLoanArbitrage.sol</span>
          <span>Solidity ^0.8.20 • Target: {activeNetwork.name}</span>
        </div>
        <pre className="max-h-96 overflow-y-auto font-mono text-xs text-cyan-300 leading-relaxed scrollbar-thin">
          {contractCode}
        </pre>
      </div>

      {/* Quick Deployment Guide */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        
        {/* Remix Deployment */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" /> 1. Remix IDE
          </div>
          <p className="text-slate-400 text-[11px]">
            Open remix.ethereum.org, paste the code, select Solidity 0.8.20 compiler, and deploy to {activeNetwork.name} via Injected Provider.
          </p>
        </div>

        {/* Hardhat Deployment */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Terminal className="h-3.5 w-3.5 text-indigo-400" /> 2. Hardhat Deploy
          </div>
          <p className="text-slate-400 text-[11px]">
            <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">npx hardhat run scripts/deploy.js --network {activeNetwork.id}</code>
          </p>
        </div>

        {/* Foundry Deployment */}
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 3. Foundry Forge
          </div>
          <p className="text-slate-400 text-[11px]">
            <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">forge create FlashLoanArbitrage --rpc-url $RPC --private-key $KEY</code>
          </p>
        </div>

      </div>
    </div>
  );
};
