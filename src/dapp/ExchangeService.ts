/**
 * ExchangeService.ts
 * 
 * 交易所合约服务类，用于与以太坊上的交易所智能合约进行交互
 * 提供了连接钱包、存取资金、创建订单、执行订单等核心功能
 */

import { ethers } from 'ethers';
import { Exchange__factory } from '../types/factories/Exchange__factory';

// 扩展Window接口，添加ethereum属性，用于访问MetaMask等钱包提供的以太坊API
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * 交易所服务类
 * 
 * 该类封装了与交易所智能合约交互的所有方法，包括：
 * 1. 钱包连接与合约初始化
 * 2. 资金存取操作
 * 3. 订单管理（创建、取消、执行）
 * 4. 数据查询（余额、订单信息等）
 * 5. 事件监听
 */
export class ExchangeService {
  /**
   * 智能合约实例
   */
  private contract: any;
  
  /**
   * 以太坊提供者实例，用于与区块链网络交互
   */
  private provider: ethers.BrowserProvider | null = null;
  
  /**
   * 签名者实例，用于发送需要签名的交易
   */
  private signer: ethers.Signer | null = null;

  /**
   * 构造函数
   * @param contractAddress 交易所智能合约地址
   */
  constructor(private contractAddress: string) {}

  /**
   * 连接到MetaMask钱包
   * 
   * 该方法会：
   * 1. 检查MetaMask是否已安装
   * 2. 请求用户授权访问钱包
   * 3. 创建provider和signer实例
   * 4. 初始化合约实例（带签名功能）
   * 
   * @returns Promise<string | null> 连接成功返回用户钱包地址，失败返回null
   * @throws Error 当MetaMask未安装或连接失败时抛出错误
   */
  async connectWallet(): Promise<string | null> {
    // 检查MetaMask是否已安装
    if (typeof window.ethereum === 'undefined') {
      throw new Error('请先安装 MetaMask!');
    }
    
    console.log('contractAddress', this.contractAddress);
    
    try {
      // 请求账户访问权限
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // 获取用户地址
      const address = accounts[0];
      console.log('address', address);
      console.log('accounts', accounts);

      // 创建 provider 和 signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // 初始化合约（带签名功能）
      this.contract = Exchange__factory.connect(this.contractAddress, this.signer);
      
      return address;
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw new Error('连接钱包失败');
    }
  }

  /**
   * 初始化合约（只读模式，不需要签名）
   * 
   * 该方法用于初始化合约实例，但只用于只读操作，不需要用户签名
   * 
   * @returns Promise<void>
   * @throws Error 当MetaMask未安装时抛出错误
   */
  async initializeContract(): Promise<void> {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('请先安装 MetaMask!');
    }

    // 创建provider（只读模式）
    this.provider = new ethers.BrowserProvider(window.ethereum);
    // 初始化合约（只读模式）
    this.contract = Exchange__factory.connect(this.contractAddress, this.provider);
  }

  /**
   * 获取手续费账户地址
   * 
   * @returns Promise<string> 手续费账户地址
   */
  async getFeeAccount(): Promise<string> {
    // 确保合约已初始化
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.feeAccount();
  }

  /**
   * 获取交易费率
   * 
   * @returns Promise<bigint> 交易费率（以整数形式返回，需要根据合约实现转换为百分比）
   */
  async getFeePercent(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.feePercent();
  }

  /**
   * 获取订单总数
   * 
   * @returns Promise<bigint> 订单总数
   */
  async getOrderCount(): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.orderCount();
  }

  /**
   * 获取指定订单的详细信息
   * 
   * @param orderId 订单ID
   * @returns Promise<any> 订单详情对象
   */
  async getOrder(orderId: bigint): Promise<any> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.orders(orderId);
  }

  /**
   * 获取用户的代币余额
   * 
   * @param user 用户地址
   * @param token 代币地址
   * @returns Promise<bigint> 用户持有的指定代币余额
   */
  async getTokens(user: string, token: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.tokens(user, token);
  }

  /**
   * 存入以太币到交易所合约
   * 
   * @param amount 存入的以太币数量（以wei为单位）
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async depositEther(amount: bigint): Promise<ethers.ContractTransactionResponse> {
    console.log('this.contract', this.contract)
    console.log('this.signer', this.signer)
    
    // 确保钱包已连接
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    
    // 调用合约的depositEther方法，通过value参数发送以太币
    return await this.contract.depositEther({
      value: amount
    });
  }

  /**
   * 存入代币到交易所合约
   * 
   * @param tokenAddress 代币合约地址
   * @param amount 存入的代币数量
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async depositToken(tokenAddress: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.depositToken(tokenAddress, amount);
  }

  /**
   * 从交易所合约提取以太币
   * 
   * @param amount 提取的以太币数量（以wei为单位）
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async withdrawEther(amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.withdrawEhter(amount);
  }

  /**
   * 从交易所合约提取代币
   * 
   * @param tokenAddress 代币合约地址
   * @param amount 提取的代币数量
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async withdrawToken(tokenAddress: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.withdrawOther(tokenAddress, amount);
  }

  /**
   * 获取用户在交易所合约中的指定代币余额
   * 
   * @param user 用户地址
   * @param token 代币地址
   * @returns Promise<bigint> 余额数量
   */
  async balanceOf(user: string, token: string): Promise<bigint> {
    if (!this.contract) {
      await this.initializeContract();
    }
    return await this.contract.balanceOf(user, token);
  }

  /**
   * 获取交易所合约的ETH总余额
   * 
   * @returns Promise<bigint> 合约ETH余额（以wei为单位）
   * @throws Error 当MetaMask未安装时抛出错误
   */
  async getContractBalance(): Promise<bigint> {
    if (!this.provider) {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请先安装 MetaMask!');
      }
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return await this.provider.getBalance(this.contractAddress);
  }

  /**
   * 创建交易订单
   * 
   * @param tokenGet 要获取的代币地址
   * @param amountGet 要获取的代币数量
   * @param tokenGive 要给出的代币地址
   * @param amountGive 要给出的代币数量
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async makeOrder(tokenGet: string, amountGet: bigint, tokenGive: string, amountGive: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.makeOrder(tokenGet, amountGet, tokenGive, amountGive);
  }

  /**
   * 取消订单
   * 
   * @param orderId 要取消的订单ID
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async cancelOrder(orderId: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.cancelOrder(orderId);
  }

  /**
   * 执行（填充）订单
   * 
   * @param orderId 要执行的订单ID
   * @returns Promise<ethers.ContractTransactionResponse> 交易响应对象
   */
  async fillOrder(orderId: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract || !this.signer) {
      await this.connectWallet();
    }
    return await this.contract.fillOrder(orderId);
  }

  /**
   * 监听存款事件
   * 
   * @param callback 事件回调函数，接收token（代币地址）、user（用户地址）、value（金额）、balance（余额）参数
   * @returns Promise<void>
   */
  async listenForDepositEvents(callback: (token: string, user: string, value: bigint, balance: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    // 监听合约的Deposit事件
    this.contract.on('Deposit', (token: string, user: string, value: bigint, balance: bigint) => {
      callback(token, user, value, balance);
    });
  }

  /**
   * 监听提款事件
   * 
   * @param callback 事件回调函数，接收token（代币地址）、user（用户地址）、value（金额）、balance（余额）参数
   * @returns Promise<void>
   */
  async listenForWithdrawEvents(callback: (token: string, user: string, value: bigint, balance: bigint) => void): Promise<void> {
    if (!this.contract) {
      await this.initializeContract();
    }

    // 监听合约的Withdraw事件
    this.contract.on('Withdraw', (token: string, user: string, value: bigint, balance: bigint) => {
      callback(token, user, value, balance);
    });
  }

  /**
   * 移除所有事件监听器
   * 
   * 当不再需要监听事件时，应该调用此方法清理监听器，避免内存泄漏
   */
  removeEventListeners(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

/**
 * 全局交易所服务实例
 * 
 * 注意：使用前需要设置正确的合约地址
 * 例如：exchangeService.contractAddress = '0x1234567890123456789012345678901234567890';
 */
export const exchangeService = new ExchangeService('');
