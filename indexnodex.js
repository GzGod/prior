// 合并脚本：swap + mining + 中文提示
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
};

const CHAIN_ID = 84532;
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014';
const EXPLORER_URL = 'https://base-sepolia.blockscout.com/';
const PRIOR_TOKEN = '0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb';
const USDC_TOKEN = '0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2';
const SWAP_ROUTER = '0x8957e1988905311EE249e679a29fc9deCEd4D910';
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// 基础工具
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(color, msg) {
  console.log(`${COLORS[color] || ''}${msg}${COLORS.reset}`);
}

function loadWallets() {
  try {
    const raw = fs.readFileSync('./pk.txt', 'utf8');
    const wallets = raw
      .split(',')
      .map(p => p.trim())
      .filter(p => /^0x[a-fA-F0-9]{64}$/.test(p));
    
    if (wallets.length === 0) throw new Error('pk.txt 中未找到有效私钥');
    
    log('green', `✅ 从 pk.txt 成功加载 ${wallets.length} 个钱包`);
    return wallets;
  } catch (err) {
    log('red', `❌ 加载 pk.txt 失败：${err.message}`);
    process.exit(1);
  }
}

function loadProxies() {
  try {
    const proxyFile = fs.readFileSync('./proxies.txt', 'utf8');
    const proxies = proxyFile.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    log('green', `✅ 共加载 ${proxies.length} 个代理`);
    return proxies;
  } catch {
    log('yellow', '⚠️ 未找到 proxies.txt 或加载失败，将不使用代理');
    return [];
  }
}

function createAxios(proxy = null, referer = '') {
  const config = {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Referer': referer || 'https://testnetpriorprotocol.xyz/',
    },
  };
  if (proxy) config.httpsAgent = new HttpsProxyAgent(proxy.startsWith('http') ? proxy : `http://${proxy}`);
  return axios.create(config);
}

// PRIOR 相关功能
async function checkAndApproveToken(wallet, provider, idx, proxy) {
  const signer = new ethers.Wallet(wallet, provider);
  const addr = signer.address;
  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  log('cyan', `🔹 钱包 #${idx + 1}: ${shortAddr}`);

  try {
    const token = new ethers.Contract(PRIOR_TOKEN, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const balance = await token.balanceOf(addr);
    const formatted = ethers.utils.formatUnits(balance, decimals);
    log('white', `💰 PRIOR余额: ${formatted}`);

    const amount = ethers.utils.parseUnits('0.1', decimals);
    if (balance.lt(amount)) {
      log('red', '❌ PRIOR余额不足，跳过');
      return false;
    }

    const allowance = await token.allowance(addr, SWAP_ROUTER);
    if (allowance.lt(amount)) {
      log('yellow', '⏳ 正在授权 PRIOR...');
      const tx = await token.approve(SWAP_ROUTER, ethers.constants.MaxUint256);
      log('yellow', `🔄 授权交易已发送: ${tx.hash}`);
      await tx.wait();
      log('green', '✅ 授权成功');
    } else {
      log('green', '✅ PRIOR 已授权');
    }
    return true;
  } catch (err) {
    log('red', `❌ 授权或余额检查失败: ${err.message}`);
    return false;
  }
}

async function executeSwap(wallet, provider, idx, swapIdx, proxy) {
  const signer = new ethers.Wallet(wallet, provider);
  try {
    const token = new ethers.Contract(PRIOR_TOKEN, ERC20_ABI, signer);
    const amount = ethers.utils.parseUnits('0.1', await token.decimals());
    const data = '0x8ec7baf1000000000000000000000000000000000000000000000000016345785d8a0000';
    const tx = await signer.sendTransaction({ to: SWAP_ROUTER, data, gasLimit: 300000 });
    log('yellow', `🔄 Swap #${swapIdx} 已发出: ${tx.hash}`);
    const receipt = await tx.wait();
    log('green', `✅ Swap 成功: 区块 ${receipt.blockNumber}`);
    await reportSwap(signer.address, tx.hash, receipt.blockNumber, proxy);
    return true;
  } catch (err) {
    log('red', `❌ Swap 执行失败: ${err.message}`);
    return false;
  }
}

async function reportSwap(addr, txHash, block, proxy) {
  try {
    const axiosInstance = createAxios(proxy);
    const payload = {
      userId: addr.toLowerCase(),
      type: "swap",
      txHash, fromToken: "PRIOR", toToken: "USDC",
      fromAmount: "0.1", toAmount: "0.2", status: "completed", blockNumber: block
    };
    await axiosInstance.post("https://prior-protocol-testnet-priorprotocol.replit.app/api/transactions", payload);
    log('green', '✅ Swap 已上报 API');
  } catch (err) {
    log('red', `❌ Swap 上报失败: ${err.message}`);
  }
}

// Mining 功能
async function activateMining(addr, proxy) {
  try {
    const axiosInstance = createAxios(proxy, 'https://priornftstake.xyz/');
    await axiosInstance.post('https://prior-stake-priorprotocol.replit.app/api/activate', {
      walletAddress: addr.toLowerCase(), hasNFT: true
    });
    log('green', `✅ 激活成功: ${addr}`);
  } catch (err) {
    log('red', `❌ 激活失败: ${err.message}`);
  }
}

async function miningProcess(wallet, proxy, idx) {
  const addr = new ethers.Wallet(wallet).address;
  log('cyan', `🔹 激活Mining: 钱包 #${idx + 1}`);
  try {
    await activateMining(addr, proxy);
  } catch (e) {}
}

async function startSwapSession(wallets, proxies, provider) {
  log('cyan', `🔁 开始一次 Swap 会话`);
  for (let i = 0; i < wallets.length; i++) {
    const proxy = proxies[i % proxies.length];
    const ok = await checkAndApproveToken(wallets[i], provider, i, proxy);
    if (ok) await executeSwap(wallets[i], provider, i, i + 1, proxy);
    await sleep(10000 + Math.random() * 5000);
  }
}

async function startMiningActivation(wallets, proxies) {
  log('cyan', '🔁 开始激活所有钱包的 Mining');
  for (let i = 0; i < wallets.length; i++) {
    await miningProcess(wallets[i], proxies[i % proxies.length], i);
    await sleep(3000 + Math.random() * 5000);
  }
}

// 主逻辑入口
(async () => {
  log('cyan', '🚀 PRIOR 一体化脚本启动');
  const wallets = loadWallets();
  const proxies = loadProxies();
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  await startMiningActivation(wallets, proxies);
  await startSwapSession(wallets, proxies, provider);

  log('green', '✅ 初次运行完成。将持续轮询...');
  while (true) {
    await sleep(12 * 60 * 60 * 1000); // 每12小时执行一次
    await startMiningActivation(wallets, proxies);
    await sleep(5 * 60 * 1000);
    await startSwapSession(wallets, proxies, provider);
  }
})();
