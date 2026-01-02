import { ethers } from 'ethers';
import { InfoContract__factory } from '../types/factories/InfoContract__factory';

// 扩展Window接口，添加ethereum属性
declare global {
  interface Window {
    ethereum?: any;
  }
}

export class InfoContractService {
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
      this.contract = InfoContract__factory.connect(this.contractAddress, this.signer);
      
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
    this.contract = InfoContract__factory.connect(this.contractAddress, this.provider);
  }

  // 调用合约的sayHi方法
  async sayHi(): Promise<string> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.sayHi();
  }

  // 调用合约的getInfo方法
  async getInfo(): Promise<[string, bigint]> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.getInfo();
  }

  // 调用合约的setInfo方法
  async setInfo(name: string, age: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.setInfo(name, age);
  }

  // 监听Instructor事件
  async listenForEvents(callback: (name: string, age: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    // 监听Instructor事件
    this.contract.on('Instructor', (name: string, age: bigint) => {
      callback(name, age);
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
export const infoContractService = new InfoContractService('');
