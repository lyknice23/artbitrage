import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini client to avoid crashes if API key is not yet set
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // AI Route Analysis & MEV Risk Assessment
  app.post("/api/gemini/analyze-arbitrage", async (req, res) => {
    try {
      const { opportunity, botConfig, network } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          success: true,
          analysis: {
            riskLevel: "MODERATE",
            mevRisk: "Medium frontrunning risk. Use Flashbots Protect RPC or Private Mempool bundles.",
            gasVerdict: "Gas overhead is optimal for current network congestion.",
            recommendation: "Simulation indicates positive expected value (+EV). Recommended to execute with max slippage 0.5%.",
            technicalNotes: [
              "Aave v3 Pool `flashLoanSimple` callback requires exactly 500k-700k gas units.",
              "Ensure atomic revert `require(balanceAfter >= amountOwed, 'FlashLoan: Unprofitable')` is active.",
              "Direct pool quote check recommended via Uniswap QuoterV2."
            ],
            confidenceScore: 88,
          },
          isMock: true,
        });
      }

      const prompt = `You are a world-class DeFi Quantitative Engineer & MEV Flashbots Specialist.
Analyze the following Flash Loan Arbitrage Opportunity on ${network?.name || "Ethereum"}:

Pair: ${opportunity?.tokenSymbol || "WETH"} / ${opportunity?.quoteSymbol || "USDC"}
Flash Loan Provider: ${opportunity?.loanProvider || "Aave v3"} (Fee: ${opportunity?.flashLoanFee || "0.05%"})
Borrow Amount: ${opportunity?.loanAmount || "50"} ${opportunity?.tokenSymbol || "WETH"} ($${opportunity?.loanValueUsd || "150,000"})
Buy DEX: ${opportunity?.buyDex || "Uniswap v3"} @ $${opportunity?.buyPrice}
Sell DEX: ${opportunity?.sellDex || "Sushiswap"} @ $${opportunity?.sellPrice}
Gross Spread: ${opportunity?.spreadPercent}%
Estimated Gross Profit: $${opportunity?.grossProfit}
Gas Cost (Gwei ${opportunity?.gasPriceGwei || 25}): $${opportunity?.gasCostUsd}
Net Expected Profit: $${opportunity?.netProfitUsd}

Bot Settings:
Max Slippage: ${botConfig?.maxSlippage || 0.5}%
MEV Protection: ${botConfig?.mevProtection ? "Flashbots Private RPC / Bundles Enabled" : "Public Mempool (High Risk)"}
Min Profit Threshold: $${botConfig?.minProfitThreshold || 25}

Return a valid JSON object with the following structure:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "mevRisk": "Detailed analysis of sandwich attack, frontrunning, and backrun competition",
  "gasVerdict": "Analysis of gas price vs profitability margin and block position priority",
  "recommendation": "Actionable decision on whether to execute, skip, or modify parameters",
  "technicalNotes": ["Point 1", "Point 2", "Point 3"],
  "confidenceScore": 92
}
Respond ONLY with the JSON object.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() || "{}";
      const parsed = JSON.parse(text);

      return res.json({
        success: true,
        analysis: parsed,
      });
    } catch (error: any) {
      console.error("Gemini analysis error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze opportunity with AI",
      });
    }
  });

  // Custom Solidity Flash Loan Contract Generator
  app.post("/api/gemini/generate-contract", async (req, res) => {
    try {
      const { provider, routers, pair, features } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          success: true,
          contractCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISwapRouter02 {
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

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

/**
 * @title FlashLoanArbitrage
 * @notice Executes flash loan arbitrage between Uniswap V3 and Uniswap V2 / SushiSwap
 */
contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase, Ownable {
    ISwapRouter02 public immutable uniV3Router;
    IUniswapV2Router02 public immutable sushiRouter;

    event ArbitrageExecuted(
        address indexed asset,
        uint256 amountBorrowed,
        uint256 totalRepaid,
        uint256 netProfit
    );

    constructor(
        address _addressProvider,
        address _uniV3Router,
        address _sushiRouter
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) Ownable(msg.sender) {
        uniV3Router = ISwapRouter02(_uniV3Router);
        sushiRouter = IUniswapV2Router02(_sushiRouter);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be Aave Pool");
        require(initiator == address(this), "Initiator must be this contract");

        (
            address targetToken,
            uint24 uniV3Fee,
            uint256 minProfitExpected
        ) = abi.decode(params, (address, uint24, uint256));

        uint256 amountOwed = amount + premium;

        // Step 1: Approve Uni V3 Router
        IERC20(asset).approve(address(uniV3Router), amount);

        // Step 2: Swap asset -> targetToken on Uniswap V3
        ISwapRouter02.ExactInputSingleParams memory swapParams = ISwapRouter02.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: targetToken,
            fee: uniV3Fee,
            recipient: address(this),
            amountIn: amount,
            amountOutMinimum: 0, // In prod, compute via Quoter
            sqrtPriceLimitX96: 0
        });
        uint256 targetTokensReceived = uniV3Router.exactInputSingle(swapParams);

        // Step 3: Swap targetToken -> asset on SushiSwap V2
        IERC20(targetToken).approve(address(sushiRouter), targetTokensReceived);
        address[] memory path = new address[](2);
        path[0] = targetToken;
        path[1] = asset;

        uint256[] memory amounts = sushiRouter.swapExactTokensForTokens(
            targetTokensReceived,
            amountOwed + minProfitExpected,
            path,
            address(this),
            block.timestamp
        );

        uint256 finalBalance = IERC20(asset).balanceOf(address(this));
        require(finalBalance >= amountOwed + minProfitExpected, "FlashLoan: Arbitrage Unprofitable");

        // Step 4: Approve repayment
        IERC20(asset).approve(address(POOL), amountOwed);

        uint256 netProfit = finalBalance - amountOwed;
        emit ArbitrageExecuted(asset, amount, amountOwed, netProfit);

        return true;
    }

    function requestFlashLoan(
        address _asset,
        uint256 _amount,
        address _targetToken,
        uint24 _uniV3Fee,
        uint256 _minProfit
    ) external onlyOwner {
        bytes memory params = abi.encode(_targetToken, _uniV3Fee, _minProfit);
        POOL.flashLoanSimple(address(this), _asset, _amount, params, 0);
    }

    function withdraw(address _token) external onlyOwner {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(_token).transfer(owner(), balance);
        }
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}`,
        });
      }

      const prompt = `Write a production-ready, highly secure Solidity smart contract for DeFi Flash Loan Arbitrage.
Provider: ${provider || "Aave v3"}
Primary DEX Routers: ${routers?.join(", ") || "Uniswap v3 and SushiSwap"}
Target Pair: ${pair || "WETH/USDC"}
Key Features: ${features?.join(", ") || "Re-entrancy guard, slippage protection, flashbots bribe/builder payment, atomic revert on deficit, owner emergency withdraw"}

Requirements:
1. Use Solidity 0.8.20+.
2. Implement flash loan receiver interface (e.g. IFlashLoanSimpleReceiver for Aave v3 or Balancer IFlashLoanRecipient).
3. Include explicit require checks for profitability after loan repayment fee.
4. Clean NatSpec comments explaining each step.
Return ONLY raw Solidity code without markdown backticks.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      let code = response.text?.trim() || "";
      if (code.startsWith("```solidity")) {
        code = code.replace(/^```solidity\n/, "").replace(/\n```$/, "");
      } else if (code.startsWith("```")) {
        code = code.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      return res.json({
        success: true,
        contractCode: code,
      });
    } catch (error: any) {
      console.error("Gemini contract generation error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate contract",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Flash Loan Arbitrage Bot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
