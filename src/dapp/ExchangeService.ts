import { ethers } from 'ethers';
import { Exchange__factory } from '../types/factories/Exchange__factory';

// 扩展Window接口，添加ethereum属性
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class ExchangeService {
  private contract: any;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  constructor(private contractAddress: string) {}

  // 连接到MetaMask钱包
  async connectWallet(): Promise<string | null> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('请先安装 MetaMask!');
    }

    try {
      // 请求账户访问
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      
      // 创建 provider 和 signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // 初始化合约
      this.contract = Exchange__factory.connect(this.contractAddress, this.signer);
      
      return address;
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw new Error('连接钱包失败');
    }
  }

  // 初始化合约（只读模式，不需要签名）
  async initializeContract(): Promise<void> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('请先安装 MetaMask!');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.contract = Exchange__factory.connect(this.contractAddress, this.provider);
  }

  // 获取手续费账户
  async getFeeAccount(): Promise<string> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.feeAccount();
  }

  // 获取费率
  async getFeePercent(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.feePercent();
  }

  // 获取订单数量
  async getOrderCount(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.orderCount();
  }

  // 获取订单信息
  async getOrder(orderId: bigint): Promise<any> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.orders(orderId);
  }

  // 获取用户代币余额
  async getTokens(user: string, token: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.tokens(user, token);
  }

  // 存入以太币
  async depositEther(amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.depositEther({
      value: amount
    });
  }

  // 存入代币
  async depositToken(tokenAddress: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.depositToken(tokenAddress, amount);
  }

  // 提取以太币
  async withdrawEther(amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.withdrawEhter(amount);
  }

  // 提取代币
  async withdrawToken(tokenAddress: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.withdrawOther(tokenAddress, amount);
  }

  // 获取余额
  async balanceOf(user: string, token: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.balanceOf(user, token);
  }

  // 获取合约总ETH余额
  async getContractBalance(): Promise<bigint> {
    if (!this.provider) {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请先安装 MetaMask!');
      }
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return await this.provider.getBalance(this.contractAddress);
  }

  // 创建订单
  async makeOrder(tokenGet: string, amountGet: bigint, tokenGive: string, amountGive: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.makeOrder(tokenGet, amountGet, tokenGive, amountGive);
  }

  // 取消订单
  async cancelOrder(orderId: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.cancelOrder(orderId);
  }

  // 完成订单
  async fillOrder(orderId: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.fillOrder(orderId);
  }

  // 监听Deposit事件
  async listenForDepositEvents(callback: (token: string, user: string, value: bigint, balance: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.contract.on('Deposit', (token: string, user: string, value: bigint, balance: bigint) => {
      callback(token, user, value, balance);
    });
  }

  // 监听Withdraw事件
  async listenForWithdrawEvents(callback: (token: string, user: string, value: bigint, balance: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.contract.on('Withdraw', (token: string, user: string, value: bigint, balance: bigint) => {
      callback(token, user, value, balance);
    });
  }

  // 移除所有事件监听
  removeEventListeners(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

// 导出一个全局的合约服务实例（需要在使用前设置正确的合约地址）
export const exchangeService = new ExchangeService('');
