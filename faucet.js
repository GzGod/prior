// faucet.js - Prior Protocol Base Sepolia 测试网 Faucet 自动领取脚本
require('dotenv').config();
const { ethers } = require('ethers');

const FAUCET_CONTRACT = '0xa206dC56F1A56a03aEa0fCBB7c7A62b5bE1Fe419'; // Faucet 合约地址
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const ABI = ['function claim() external'];

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = (color, msg) => console.log(`${COLORS[color] || ''}${msg}${COLORS.reset}`);
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function claim(walletPk, index) {
  const wallet = new ethers.Wallet(walletPk, provider);
  const contract = new ethers.Contract(FAUCET_CONTRACT, ABI, wallet);
  const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  log('cyan', `🚰 开始领取 - 钱包 #${index + 1}: ${shortAddr}`);

  try {
    // 加入 gasLimit 避免合约不估算
    const tx = await contract.claim({ gasLimit: 100000 });
    log('yellow', `⛽ 交易已发送: ${tx.hash}`);
    const receipt = await tx.wait();
    log('green', `✅ 成功领取水！区块: ${receipt.blockNumber}`);
  } catch (err) {
    log('red', `❌ 领取失败: ${err.message}`);
  }
}

async function main() {
  const wallets = [];
  let i = 1;
  while (process.env[`WALLET_PK_${i}`]) {
    wallets.push(process.env[`WALLET_PK_${i}`]);
    i++;
  }

  if (wallets.length === 0) {
    log('red', '❌ 未找到钱包私钥，请检查 .env 文件是否正确配置');
    return;
  }

  for (let i = 0; i < wallets.length; i++) {
    await claim(wallets[i], i);
    if (i < wallets.length - 1) {
      const delay = 10000 + Math.random() * 10000;
      log('yellow', `⏳ 等待 ${Math.round(delay / 1000)} 秒后继续...`);
      await sleep(delay);
    }
  }

  log('green', '\n🎉 所有钱包 Faucet 领取流程完成');
}

main();
