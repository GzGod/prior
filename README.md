# Prior Testnet Auto Bot（Prior 测试网自动脚本）

一个用于在 Base Sepolia 网络上与 Prior Protocol 测试网交互的自动化脚本。  
本工具可帮助用户自动完成 PRIOR 代币与 USDC 的兑换流程，参与测试网活动。

---

## 🔍 功能亮点

- 自动将 PRIOR 代币兑换为测试网 USDC  
- 支持多个钱包批量处理  
- 可选代理支持（用于 IP 轮换）  
- 自动将交易信息上报至 Prior Protocol 的 API  
- 支持 24 小时轮询计时，保持持续活跃  
- 错误处理与自动重试机制  

---

## 🛠️ 使用前提

- 已安装 Node.js（版本需 ≥ v14）  
- 钱包中有 Prior 测试网代币（PRIOR）  
- 已准备好钱包私钥用于签名操作（建议使用小号）

---

## ⚙️ 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/Gzgod/prior.git
```

2. 进入目录：
```bash
cd prior
```

3. 安装依赖：
```bash
npm install
```

4. 私钥填入 `.env` 文件：
```env
WALLET_PK_1=your_private_key_1
WALLET_PK_2=your_private_key_2
```

5. 可选：使用代理，创建 `proxies.txt`，格式如下：
```
user:pass@ip:port
ip:port
http://user:pass@ip:port
```

---

## 🚀 使用方式

1. **领水操作**（确保钱包中已有 Base Sepolia ETH）：
```bash
node faucet.js
```

2. **运行主脚本**：
```bash
node index.js
```

脚本将自动执行以下流程：

1. 加载 `.env` 中的所有钱包  
2. 检查 PRIOR 余额  
3. 自动授权 PRIOR（如尚未授权）  
4. 每个钱包执行 0.1 PRIOR → USDC 的兑换  
5. 成功交易自动上报至 Prior API  
6. 等待 24 小时后进行下一轮交换操作  

---

## ⚠️ 注意事项

- 每个钱包至少需要 0.1 PRIOR 才能参与兑换  
- 钱包中需有足够的 Base Sepolia ETH 用于支付 gas 费  
- 每轮默认执行 5 次 swap，完成后等待 24 小时再开始新一轮  
- 请妥善保管 `.env` 文件，避免私钥泄露  

---

## 🔗 网络信息

- 网络：Base Sepolia 测试网  
- PRIOR Token：`0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb`  
- USDC Token：`0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2`  
- Swap Router：`0x8957e1988905311EE249e679a29fc9deCEd4D910`

---

## 📋 可配置参数

你可以根据需要修改 `index.js` 中的以下参数：

- `MAX_SWAPS`：每轮最多执行的 swap 次数（默认：5）  
- `Swap amount`：每次兑换的 PRIOR 数量（默认：0.1）  
- `Countdown timer`：两轮之间的等待时间（默认：24 小时）  

---

## ⚠️ 风险提示

本项目仅供学习与技术交流用途，脚本涉及链上签名与资金操作，请谨慎使用，风险自负。  
开发者不对因使用本脚本导致的任何损失或后果承担责任。

---
