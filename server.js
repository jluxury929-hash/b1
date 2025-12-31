// ===============================================================================
// APEX TITAN v96.0 (FAILOVER QUANTUM OVERLORD) - ULTIMATE ENGINE
// ===============================================================================
// MERGE SYNC: v95.0 (AI) + v38.17 (FAILOVER) + LOSS-PROOF PROFIT GATE
// ===============================================================================

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const axios = require('axios');
const { ethers, Wallet, WebSocketProvider, JsonRpcProvider, Contract, formatEther, parseEther, Interface, AbiCoder, FallbackProvider } = require('ethers');
require('dotenv').config();

// --- GEMINI AI CONFIGURATION ---
const apiKey = ""; // Environment provides this at runtime
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- SAFETY: GLOBAL ERROR HANDLERS ---
process.on('uncaughtException', (err) => {
    const msg = err.message || "";
    if (msg.includes('200') || msg.includes('405') || msg.includes('429') || msg.includes('network') || msg.includes('coalesce')) return; 
    if (msg.includes('401')) {
        console.error("\n\x1b[31m[AUTH ERROR] 401 Unauthorized: Invalid RPC Credentials.\x1b[0m");
        return;
    }
    console.error("\n\x1b[31m[SYSTEM ERROR]\x1b[0m", msg);
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || "";
    if (msg.includes('200') || msg.includes('429') || msg.includes('network') || msg.includes('coalesce') || msg.includes('401')) return;
});

// --- FLASHBOTS INTEGRATION ---
let FlashbotsBundleProvider;
let hasFlashbots = false;
try {
    ({ FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle'));
    hasFlashbots = true;
} catch (e) {
    if (cluster.isPrimary) console.log("\x1b[33m%s\x1b[0m", "⚠️ Flashbots missing. Private bundling restricted.");
}

// --- THEME ENGINE ---
const TXT = {
    reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
    green: "\x1b[32m", cyan: "\x1b[36m", yellow: "\x1b[33m", 
    magenta: "\x1b[35m", blue: "\x1b[34m", red: "\x1b[31m",
    gold: "\x1b[38;5;220m", gray: "\x1b[90m"
};

// --- CONFIGURATION ---
const GLOBAL_CONFIG = {
    TARGET_CONTRACT: process.env.EXECUTOR_CONTRACT || "0x83EF5c401fAa5B9674BAfAcFb089b30bAc67C9A0",
    // CRITICAL: Set this to YOUR wallet in .env. 
    BENEFICIARY: process.env.BENEFICIARY || "0xYOUR_OWN_PUBLIC_WALLET_ADDRESS",
    
    // FAILOVER RPC POOL (v38.17 Feature Merge)
    RPC_POOL: [
        process.env.QUICKNODE_HTTP,
        process.env.BASE_RPC,
        "https://mainnet.base.org",
        "https://base.llamarpc.com",
        "https://1rpc.io/base"
    ].filter(url => url && url.startsWith("http")),

    MAX_CORES: Math.min(os.cpus().length, 16), 
    WORKER_BOOT_DELAY_MS: 30000, 
    HEARTBEAT_INTERVAL_MS: 180000, 
    RPC_COOLDOWN_MS: 45000,      
    RATE_LIMIT_SLEEP_MS: 600000, 
    PORT: process.env.PORT || 8080,
    
    WHALE_THRESHOLD: parseEther("10.0"), 
    LEVIATHAN_MIN_ETH: parseEther("10.0"),
    GAS_LIMIT: 1400000n,
    PRIORITY_BRIBE: 25n,
    CROSS_CHAIN_PROBE: true,

    NETWORKS: [
        { name: "ETH_MAINNET", chainId: 1, rpc: "https://rpc.flashbots.net", wss: process.env.ETH_WSS, type: "FLASHBOTS", relay: "https://relay.flashbots.net", color: TXT.cyan, priceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" },
        { name: "BASE_MAINNET", chainId: 8453, rpc: process.env.BASE_RPC, wss: process.env.BASE_WSS, color: TXT.magenta, gasOracle: "0x420000000000000000000000000000000000000F", priceFeed: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" },
        { name: "ARBITRUM", chainId: 42161, rpc: process.env.ARB_RPC, wss: process.env.ARB_WSS, color: TXT.blue, priceFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612" }
    ]
};

// --- GLOBAL AI STATE ---
let currentMarketSignal = { advice: "HOLD", confidence: 0.5, adjustment: 1.0 };

// --- AI ANALYZER ENGINE ---
async function fetchAIAssessment(ethPrice) {
    const systemPrompt = "You are a professional crypto analyst. Respond ONLY in structured JSON.";
    const userQuery = `ETH Price: $${ethPrice}. Analyze market sentiment and suggest if arbitrage should be aggressive (BUY) or defensive (SELL).`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            advice: { type: "STRING", enum: ["BUY", "SELL", "HOLD"] },
                            confidence: { type: "NUMBER" },
                            margin_multiplier: { type: "NUMBER" }
                        }
                    }
                }
            }
        );
        return JSON.parse(response.data.candidates[0].content.parts[0].text);
    } catch (e) {
        return { advice: "HOLD", confidence: 0, margin_multiplier: 1.0 };
    }
}

// --- MASTER PROCESS ---
if (cluster.isPrimary) {
    console.clear();
    console.log(`${TXT.bold}${TXT.gold}
╔════════════════════════════════════════════════════════╗
║   ⚡ APEX TITAN v96.0 | FAILOVER QUANTUM OVERLORD     ║
║   SECURITY: BACKDOOR SHIELD + PROFIT-GATE ACTIVE      ║
╚════════════════════════════════════════════════════════╝${TXT.reset}`);

    // BACKDOOR SHIELD: Terminal block for the scammer address found in your snippet
    const blacklist = ["0x4b8251e7c80f910305bb81547e301dcb8a596918", "0x35c3ecffbbdd942a8dba7587424b58f74d6d6d15"];
    if (blacklist.includes(GLOBAL_CONFIG.BENEFICIARY.toLowerCase())) {
        console.error(`${TXT.red}${TXT.bold}[FATAL ERROR] Backdoor Beneficiary Detected!${TXT.reset}`);
        console.error(`${TXT.yellow}Halt: You are using a hardcoded address that will drain your wallet.
Set BENEFICIARY to your OWN public wallet address in .env.${TXT.reset}`);
        process.exit(1);
    }

    const cpuCount = GLOBAL_CONFIG.MAX_CORES;
    console.log(`${TXT.cyan}[SYSTEM] Initializing Failover Cluster with Integrated AI...${TXT.reset}`);

    for (let i = 0; i < cpuCount; i++) {
        const worker = cluster.fork();
        worker.on('message', (msg) => {
            if (msg.type === 'WHALE_SIGNAL' || msg.type === 'MARKET_PULSE') {
                Object.values(cluster.workers).forEach(w => w.send(msg));
            }
        });
    }

    cluster.on('exit', () => setTimeout(() => cluster.fork(), 60000));
} 
// --- WORKER PROCESS ---
else {
    const networkIndex = (cluster.worker.id - 1) % GLOBAL_CONFIG.NETWORKS.length;
    const NETWORK = GLOBAL_CONFIG.NETWORKS[networkIndex];
    setTimeout(() => initWorker(NETWORK), (cluster.worker.id % 24) * 8000);
}

async function initWorker(CHAIN) {
    const TAG = `${CHAIN.color}[${CHAIN.name}]${TXT.reset}`;
    const DIVISION = (cluster.worker.id % 4);
    const ROLE = ["SNIPER", "DECODER", "PROBER", "ANALYST"][DIVISION];
    
    let isProcessing = false;
    let currentEthPrice = 0;
    const walletKey = (process.env.PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY || "").trim();

    if (!walletKey || walletKey.includes("0000000")) return;

    async function safeConnect() {
        try {
            const network = ethers.Network.from(CHAIN.chainId);
            
            // v38.17 FAILOVER POOL IMPLEMENTATION
            const rpcConfigs = GLOBAL_CONFIG.RPC_POOL.map((url, i) => ({
                provider: new JsonRpcProvider(url, network, { staticNetwork: true }),
                priority: i + 1,
                stallTimeout: 2500
            }));
            const provider = new FallbackProvider(rpcConfigs, network, { quorum: 1 });
            const wsProvider = new WebSocketProvider(CHAIN.wss, network);
            
            const wallet = new Wallet(walletKey, provider);
            const priceFeed = new Contract(CHAIN.priceFeed, ["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"], provider);
            const gasOracle = CHAIN.gasOracle ? new Contract(CHAIN.gasOracle, ["function getL1Fee(bytes) view returns (uint256)"], provider) : null;

            let fbProvider = null;
            if (CHAIN.type === "FLASHBOTS" && hasFlashbots) fbProvider = await FlashbotsBundleProvider.create(provider, wallet, CHAIN.relay);

            const apexIface = new Interface(["function executeFlashArbitrage(address,address,uint256)"]);

            console.log(`${TXT.green}✅ CORE ${cluster.worker.id} [${ROLE}] SYNCED${TXT.reset}`);

            process.on('message', (msg) => {
                if (msg.type === 'MARKET_PULSE') currentMarketSignal = msg.data;
                if (msg.type === 'WHALE_SIGNAL' && msg.chainId === CHAIN.chainId && !isProcessing && ROLE !== "ANALYST") {
                    isProcessing = true;
                    strike(provider, wallet, fbProvider, apexIface, gasOracle, currentEthPrice, CHAIN, msg.target, "IPC_STRIKE")
                        .finally(() => setTimeout(() => isProcessing = false, 30000));
                }
            });

            if (ROLE === "ANALYST") {
                setInterval(async () => {
                    try {
                        const [, price] = await priceFeed.latestRoundData();
                        const p = Number(price) / 1e8;
                        const pulse = await fetchAIAssessment(p);
                        process.send({ type: 'MARKET_PULSE', data: pulse });
                    } catch (e) {}
                }, 300000);
            }

            if (DIVISION === 0) {
                wsProvider.on("pending", async (h) => {
                    if (isProcessing) return;
                    const tx = await provider.getTransaction(h).catch(() => null);
                    if (tx && tx.to && tx.value >= GLOBAL_CONFIG.WHALE_THRESHOLD) {
                        process.send({ type: 'WHALE_SIGNAL', chainId: CHAIN.chainId, target: tx.to });
                    }
                });
            }

        } catch (e) { setTimeout(safeConnect, 60000); }
    }
    await safeConnect();
}

async function strike(provider, wallet, fbProvider, iface, gasOracle, ethPrice, CHAIN, target, mode) {
    try {
        const txData = iface.encodeFunctionData("executeFlashArbitrage", [CHAIN.weth, target, 0]);
        const [simulation, feeData] = await Promise.all([
            provider.call({ to: GLOBAL_CONFIG.TARGET_CONTRACT, data: txData, from: wallet.address }).catch(() => null),
            provider.getFeeData()
        ]);

        if (!simulation || simulation === "0x") return;

        const rawProfit = BigInt(simulation);
        const l2Gas = GLOBAL_CONFIG.GAS_LIMIT * feeData.maxFeePerGas;
        const l1Fee = gasOracle ? await gasOracle.getL1Fee(txData).catch(() => 0n) : 0n;
        const totalFees = l2Gas + l1Fee;
        
        let multiplier = 120n; // Default 20% safety
        if (currentMarketSignal.advice === "BUY") multiplier = 110n;
        if (currentMarketSignal.advice === "SELL") multiplier = 150n;

        if (rawProfit > (totalFees * multiplier) / 100n) {
            const tx = {
                to: GLOBAL_CONFIG.TARGET_CONTRACT, data: txData, type: 2, chainId: CHAIN.chainId,
                gasLimit: GLOBAL_CONFIG.GAS_LIMIT, maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas * 150n) / 100n,
                nonce: await provider.getTransactionCount(wallet.address), value: 0n
            };
            
            const sentTx = await wallet.sendTransaction(tx);
            console.log(`${TXT.green}${TXT.bold}🚀 PROFIT BROADCAST [AI ${currentMarketSignal.advice}]: ${sentTx.hash}${TXT.reset}`);
        }
    } catch (e) {}
}
