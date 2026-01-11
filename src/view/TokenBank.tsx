import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { ethers } from 'ethers';
import { LeepCoinService, leepCoinService } from '../dapp/LeepCoinService';
import { ExchangeService, exchangeService } from '../dapp/ExchangeService';

// 主组件
const TokenBank = () => {
  // 状态
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  
  // 合约地址
  const [leepCoinAddress, setLeepCoinAddress] = useState<string>('');
  const [exchangeAddress, setExchangeAddress] = useState<string>('');
  
  // 合约服务实例
  const [leepCoinServiceInstance, setLeepCoinServiceInstance] = useState<LeepCoinService | null>(null);
  const [exchangeServiceInstance, setExchangeServiceInstance] = useState<ExchangeService | null>(null);
  
  // 余额信息
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [leepCoinBalance, setLeepCoinBalance] = useState<string>('0');
  const [exchangeEthBalance, setExchangeEthBalance] = useState<string>('0');
  const [exchangeLeepCoinBalance, setExchangeLeepCoinBalance] = useState<string>('0');
  
  // 造币表单
  const [mintAddress, setMintAddress] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('');
  
  // 存款表单
  const [depositType, setDepositType] = useState<'ether' | 'token'>('ether');
  const [depositAmount, setDepositAmount] = useState<string>('');
  
  // 取款表单
  const [withdrawType, setWithdrawType] = useState<'ether' | 'token'>('ether');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  
  // 转账表单
  const [transferType, setTransferType] = useState<'direct' | 'approve'>('direct');
  const [transferFrom, setTransferFrom] = useState<string>('');
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [approveSpender, setApproveSpender] = useState<string>('');
  const [approveAmount, setApproveAmount] = useState<string>('');
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  
  // 显示状态消息
  const showStatus = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setStatus(message);
    setStatusType(type);
    setTimeout(() => {
      setStatus(null);
    }, 5000);
  };
  
  // 转换为wei
  const toWei = (amount: string) => {
    return ethers.parseEther(amount);
  };
  
  // 从wei转换
  const fromWei = (amount: bigint) => {
    return ethers.formatEther(amount);
  };
  
  // 加载合约地址
  useEffect(() => {
    const fetchContractAddresses = async () => {
      try {
        // 尝试从构建文件加载合约地址
        let leepCoinAddr = '';
        let exchangeAddr = '';
        
        try {
          const leepCoinData = await fetch('/web-test/build/LeepCoin.json');
          if (leepCoinData.ok) {
            const data = await leepCoinData.json();
            leepCoinAddr = data.networks['5777']?.address || '';
          }
          
          const exchangeData = await fetch('/web-test/build/Exchange.json');
          if (exchangeData.ok) {
            const data = await exchangeData.json();
            exchangeAddr = data.networks['5777']?.address || '';
          }
        } catch (error) {
          console.error('加载合约地址失败，使用默认地址:', error);
        }
        
        // 使用默认地址（如果加载失败）
        if (!leepCoinAddr) {
          leepCoinAddr = '0x539aACA4Fe8334a03efff700da1966Dc0B5eA500';
          showStatus('⚠️  使用默认LeepCoin合约地址', 'warning');
        }
        
        if (!exchangeAddr) {
          exchangeAddr = '0x9D5A4CF228065b0e4a1b93686e8204Af8496B578';
          showStatus('⚠️  使用默认Exchange合约地址', 'warning');
        }
        
        setLeepCoinAddress(leepCoinAddr);
        setExchangeAddress(exchangeAddr);
        
        // 初始化合约服务
        const leepCoinService = new LeepCoinService(leepCoinAddr);
        const exchangeService = new ExchangeService(exchangeAddr);
        
        if (isConnected) {
          await leepCoinService.connectWallet();
          await exchangeService.connectWallet();
        } else {
          await leepCoinService.initializeContract();
          await exchangeService.initializeContract();
        }
        
        setLeepCoinServiceInstance(leepCoinService);
        setExchangeServiceInstance(exchangeService);
      } catch (error) {
        console.error('初始化合约服务失败:', error);
        showStatus(`❌ 初始化合约服务失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    };
    
    fetchContractAddresses();
  }, [isConnected]);
  
  // 检查是否为合约所有者
  useEffect(() => {
    const checkOwner = async () => {
      if (isConnected && leepCoinServiceInstance) {
        try {
          const owner = await leepCoinServiceInstance.getOwner();
          console.log('owner', owner);
          setIsOwner(owner.toLowerCase() === address?.toLowerCase());
        } catch (error) {
          console.error('检查所有者失败:', error);
        }
      }
    };
    
    checkOwner();
  }, [isConnected, address, leepCoinServiceInstance]);
  
  // 更新余额
  useEffect(() => {
    const updateBalances = async () => {
      if (isConnected && address && leepCoinServiceInstance && exchangeServiceInstance) {
        try {
          // 获取账户ETH余额
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(address);
            setEthBalance(fromWei(balance));
          }
          
          // 获取LeepCoin余额
          const leepBalance = await leepCoinServiceInstance.getBalanceOf(address);
          setLeepCoinBalance(fromWei(leepBalance));
          
          // 获取交易所ETH余额
          const ethAddr = '0x0000000000000000000000000000000000000000';
          const exchangeEth = await exchangeServiceInstance.getTokens(address, ethAddr);
          setExchangeEthBalance(fromWei(exchangeEth));
          
          // 获取交易所LeepCoin余额
          const exchangeLeep = await exchangeServiceInstance.getTokens(address, leepCoinAddress);
          setExchangeLeepCoinBalance(fromWei(exchangeLeep));
        } catch (error) {
          console.error('更新余额失败:', error);
        }
      }
    };
    
    updateBalances();
  }, [isConnected, address, leepCoinServiceInstance, exchangeServiceInstance, leepCoinAddress]);
  
  // 显示状态消息
  const handleStatus = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setStatus(message);
    setStatusType(type);
    setTimeout(() => {
      setStatus(null);
    }, 5000);
  };
  
  // 造币功能
  const handleMint = async () => {
    try {
      if (!leepCoinServiceInstance) {
        showStatus('❌ LeepCoin合约服务未初始化', 'error');
        return;
      }
      
      if (!mintAddress || !mintAmount) {
        showStatus('❌ 请输入造币地址和数量', 'error');
        return;
      }
      
      // 执行造币
      const tx = await leepCoinServiceInstance.mint(mintAddress, ethers.parseEther(mintAmount));
      showStatus(`⏳ 造币交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 造币成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setMintAddress('');
        setMintAmount('');
      }
    } catch (error) {
      showStatus(`❌ 造币失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // 存款功能
  const handleDeposit = async () => {
    try {
      if (!exchangeServiceInstance || !leepCoinServiceInstance) {
        showStatus('❌ 合约服务未初始化', 'error');
        return;
      }
      
      if (!depositAmount) {
        showStatus('❌ 请输入存款金额', 'error');
        return;
      }
      
      let tx;
      
      if (depositType === 'ether') {
        // 存入以太币
        tx = await exchangeServiceInstance.depositEther(ethers.parseEther(depositAmount));
      } else {
        // 存入代币，需要先授权
        const approveTx = await leepCoinServiceInstance.approve(
          exchangeAddress,
          ethers.parseEther(depositAmount)
        );
        await approveTx.wait();
        
        // 然后存入代币
        tx = await exchangeServiceInstance.depositToken(
          leepCoinAddress,
          ethers.parseEther(depositAmount)
        );
      }
      
      showStatus(`⏳ 存款交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 存款成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setDepositAmount('');
      }
    } catch (error) {
      showStatus(`❌ 存款失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // 取款功能
  const handleWithdraw = async () => {
    try {
      if (!exchangeServiceInstance) {
        showStatus('❌ Exchange合约服务未初始化', 'error');
        return;
      }
      
      if (!withdrawAmount) {
        showStatus('❌ 请输入取款金额', 'error');
        return;
      }
      
      let tx;
      
      if (withdrawType === 'ether') {
        // 提取以太币
        tx = await exchangeServiceInstance.withdrawEther(ethers.parseEther(withdrawAmount));
      } else {
        // 提取代币
        tx = await exchangeServiceInstance.withdrawToken(
          leepCoinAddress,
          ethers.parseEther(withdrawAmount)
        );
      }
      
      showStatus(`⏳ 取款交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 取款成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setWithdrawAmount('');
      }
    } catch (error) {
      showStatus(`❌ 取款失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // 直接转账功能
  const handleDirectTransfer = async () => {
    try {
      if (!leepCoinServiceInstance) {
        showStatus('❌ LeepCoin合约服务未初始化', 'error');
        return;
      }
      
      if (!transferTo || !transferAmount) {
        showStatus('❌ 请输入收款地址和转账金额', 'error');
        return;
      }
      
      // 执行转账
      const tx = await leepCoinServiceInstance.transfer(
        transferTo,
        ethers.parseEther(transferAmount)
      );
      
      showStatus(`⏳ 转账交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 转账成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setTransferTo('');
        setTransferAmount('');
      }
    } catch (error) {
      showStatus(`❌ 转账失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // 授权功能
  const handleApprove = async () => {
    try {
      if (!leepCoinServiceInstance) {
        showStatus('❌ LeepCoin合约服务未初始化', 'error');
        return;
      }
      
      if (!approveSpender || !approveAmount) {
        showStatus('❌ 请输入授权地址和授权金额', 'error');
        return;
      }
      
      // 执行授权
      const tx = await leepCoinServiceInstance.approve(
        approveSpender,
        ethers.parseEther(approveAmount)
      );
      
      showStatus(`⏳ 授权交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 授权成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setApproveSpender('');
        setApproveAmount('');
      }
    } catch (error) {
      showStatus(`❌ 授权失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // 授权转账功能
  const handleApproveTransfer = async () => {
    try {
      if (!leepCoinServiceInstance) {
        showStatus('❌ LeepCoin合约服务未初始化', 'error');
        return;
      }
      
      if (!transferFrom || !transferTo || !transferAmount) {
        showStatus('❌ 请输入转出地址、收款地址和转账金额', 'error');
        return;
      }
      
      // 执行授权转账
      const tx = await leepCoinServiceInstance.transferFrom(
        transferFrom,
        transferTo,
        ethers.parseEther(transferAmount)
      );
      
      showStatus(`⏳ 授权转账交易已发送，等待确认...\n交易哈希: ${tx.hash}`, 'info');
      
      const receipt = await tx.wait();
      if (receipt) {
        showStatus(`✅ 授权转账成功!\n交易哈希: ${receipt.hash}`, 'success');
        // 重置表单
        setTransferFrom('');
        setTransferTo('');
        setTransferAmount('');
      }
    } catch (error) {
      showStatus(`❌ 授权转账失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  return (
    <div className="container">
      <h1>Token Bank</h1>
      
      {/* 状态显示 */}
      {status && (
        <div id="status" className={`status ${statusType}`}>
          {status}
        </div>
      )}
      
      {/* 连接钱包 */}
      <div className="section">
        <h2>连接钱包</h2>
        {!isConnected ? (
          <button id="connectBtn" onClick={() => connect()}>
            连接 MetaMask
          </button>
        ) : (
          <>
            <div id="accountInfo" className="info-box">
              <p><strong>账户地址:</strong> {address}</p>
              <p><strong>当前网络:</strong> {chain?.name || '未知网络'} (Chain ID: {chain?.id || '未知'})</p>
              <p><strong>ETH 余额:</strong> {ethBalance} ETH</p>
              <p><strong>LEEP 余额:</strong> {leepCoinBalance} LEEP</p>
              <p><strong>交易所 ETH 余额:</strong> {exchangeEthBalance} ETH</p>
              <p><strong>交易所 LEEP 余额:</strong> {exchangeLeepCoinBalance} LEEP</p>
              <p><strong>是否为合约所有者:</strong> {isOwner ? '是' : '否'}</p>
            </div>
            <button id="disconnectBtn" onClick={() => disconnect()} style={{ marginTop: '10px', background: '#dc3545' }}>
              断开连接
            </button>
          </>
        )}
      </div>
      
      {/* 造币功能（仅所有者可见） */}
      {isConnected && isOwner && (
        <div className="section">
          <h2>造币功能</h2>
          <div className="form-group">
            <label htmlFor="mintAddress">造币地址:</label>
            <input
              type="text"
              id="mintAddress"
              placeholder="请输入造币地址"
              value={mintAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMintAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="mintAmount">造币数量:</label>
            <input
              type="number"
              id="mintAmount"
              placeholder="请输入造币数量"
              value={mintAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMintAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>
          <button
            id="mintBtn"
            onClick={handleMint}
          >
            执行造币
          </button>
        </div>
      )}
      
      {/* 存款功能 */}
      {isConnected && (
        <div className="section">
          <h2>存款功能</h2>
          <div className="form-group">
            <label htmlFor="depositType">存款类型:</label>
            <select
              id="depositType"
              value={depositType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDepositType(e.target.value as 'ether' | 'token')}
            >
              <option value="ether">以太币 (ETH)</option>
              <option value="token">LeepCoin (LEEP)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="depositAmount">存款金额:</label>
            <input
              type="number"
              id="depositAmount"
              placeholder={`请输入${depositType === 'ether' ? 'ETH' : 'LEEP'}存款金额`}
              value={depositAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>
          <button
            id="depositBtn"
            onClick={handleDeposit}
          >
            执行存款
          </button>
        </div>
      )}
      
      {/* 取款功能 */}
      {isConnected && (
        <div className="section">
          <h2>取款功能</h2>
          <div className="form-group">
            <label htmlFor="withdrawType">取款类型:</label>
            <select
              id="withdrawType"
              value={withdrawType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWithdrawType(e.target.value as 'ether' | 'token')}
            >
              <option value="ether">以太币 (ETH)</option>
              <option value="token">LeepCoin (LEEP)</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="withdrawAmount">取款金额:</label>
            <input
              type="number"
              id="withdrawAmount"
              placeholder={`请输入${withdrawType === 'ether' ? 'ETH' : 'LEEP'}取款金额`}
              value={withdrawAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
              min="0"
              step="0.0001"
            />
          </div>
          <button
            id="withdrawBtn"
            onClick={handleWithdraw}
          >
            执行取款
          </button>
        </div>
      )}
      
      {/* 转账功能 */}
      {isConnected && (
        <div className="section">
          <h2>转账功能</h2>
          <div className="form-group">
            <label htmlFor="transferType">转账类型:</label>
            <select
              id="transferType"
              value={transferType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTransferType(e.target.value as 'direct' | 'approve')}
            >
              <option value="direct">直接转账</option>
              <option value="approve">授权转账</option>
            </select>
          </div>
          
          {/* 直接转账表单 */}
          {transferType === 'direct' ? (
            <>
              <div className="form-group">
                <label htmlFor="transferTo">收款地址:</label>
                <input
                  type="text"
                  id="transferTo"
                  placeholder="请输入收款地址"
                  value={transferTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferTo(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="transferAmount">转账金额:</label>
                <input
                  type="number"
                  id="transferAmount"
                  placeholder="请输入转账金额"
                  value={transferAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferAmount(e.target.value)}
                  min="0"
                  step="0.0001"
                />
              </div>
              <button
                id="directTransferBtn"
                onClick={handleDirectTransfer}
              >
                执行直接转账
              </button>
            </>
          ) : (
            <>
              {/* 授权表单 */}
              <div className="subsection">
                <h3>授权管理</h3>
                <div className="form-group">
                  <label htmlFor="approveSpender">授权地址:</label>
                  <input
                    type="text"
                    id="approveSpender"
                    placeholder="请输入授权地址"
                    value={approveSpender}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApproveSpender(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="approveAmount">授权金额:</label>
                  <input
                    type="number"
                    id="approveAmount"
                    placeholder="请输入授权金额"
                    value={approveAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApproveAmount(e.target.value)}
                    min="0"
                    step="0.0001"
                  />
                </div>
                <button
                  id="approveBtn"
                  onClick={handleApprove}
                  style={{ marginBottom: '20px' }}
                >
                  执行授权
                </button>
              </div>
              
              {/* 授权转账表单 */}
              <div className="subsection">
                <h3>授权转账</h3>
                <div className="form-group">
                  <label htmlFor="transferFrom">转出地址:</label>
                  <input
                    type="text"
                    id="transferFrom"
                    placeholder="请输入转出地址"
                    value={transferFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferFrom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="transferTo">收款地址:</label>
                  <input
                    type="text"
                    id="transferTo"
                    placeholder="请输入收款地址"
                    value={transferTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferTo(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="transferAmount">转账金额:</label>
                  <input
                    type="number"
                    id="transferAmount"
                    placeholder="请输入转账金额"
                    value={transferAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferAmount(e.target.value)}
                    min="0"
                    step="0.0001"
                  />
                </div>
                <button
                  id="approveTransferBtn"
                  onClick={handleApproveTransfer}
                >
                  执行授权转账
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenBank;
