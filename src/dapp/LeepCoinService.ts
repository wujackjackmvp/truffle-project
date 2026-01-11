import { ethers } from 'ethers';
import { LeepCoin__factory } from '../types/factories/LeepCoin__factory';

// 扩展Window接口，添加ethereum属性
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class LeepCoinService {
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
      this.contract = LeepCoin__factory.connect(this.contractAddress, this.signer);
      
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
    this.contract = LeepCoin__factory.connect(this.contractAddress, this.provider);
  }

  // 获取代币名称
  async getName(): Promise<string> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.name();
  }

  // 获取代币符号
  async getSymbol(): Promise<string> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.symbol();
  }

  // 获取代币小数位
  async getDecimals(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.decimals();
  }

  // 获取代币总供应量
  async getTotalSupply(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.totalSupply();
  }

  // 获取账户余额
  async getBalanceOf(address: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.balanceOf(address);
  }

  // 获取授权额度
  async getAllowance(owner: string, spender: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.allowance(owner, spender);
  }

  // 转账
  async transfer(to: string, value: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.transfer(to, value);
  }

  // 授权
  async approve(spender: string, value: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.approve(spender, value);
  }

  // 授权转账
  async transferFrom(from: string, to: string, value: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.transferFrom(from, to, value);
  }

  // 造币
  async mint(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.mint(to, amount);
  }

  // 获取合约所有者
  async getOwner(): Promise<string> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.owner();
  }

  // 监听Transfer事件
  async listenForTransferEvents(callback: (from: string, to: string, value: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.contract.on('Transfer', (from: string, to: string, value: bigint) => {
      callback(from, to, value);
    });
  }

  // 监听Approval事件
  async listenForApprovalEvents(callback: (owner: string, spender: string, value: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    this.contract.on('Approval', (owner: string, spender: string, value: bigint) => {
      callback(owner, spender, value);
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
export const leepCoinService = new LeepCoinService('');
