import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import LeepCoin from '../build/LeepCoin.json';
import Exchange from '../build/Exchange.json';

// 合约地址常量（这里需要根据实际部署的地址进行修改）
const LEEPCOIN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const EXCHANGE_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const LOCALHOST_ENDPOINT = 'http://localhost:8545';

export default function Content() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [leepCoinContract, setLeepCoinContract] = useState(null);
  const [exchangeContract, setExchangeContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [networkId, setNetworkId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionType, setConnectionType] = useState('localhost'); // 默认连接到本地节点

  // 初始化Web3连接
  const initWeb = async (type = 'metamask') => {
    try {
      setLoading(true);
      setError(null);
      
      let web3Instance;
      
      if (type === 'metamask') {
        // 检查MetaMask是否可用
        if (window.ethereum) {
          console.log('MetaMask可用');
          
          // 尝试连接MetaMask，但增加错误处理
          try {
            await window.ethereum.request({ 
              method: 'eth_requestAccounts',
              params: [{ eth_accounts: {} }]
            });
            console.log('成功请求账户访问权限');
          } catch (permissionError) {
            console.log('用户拒绝连接钱包或钱包不可用:', permissionError);
            // 即使没有账户，也继续初始化Web3
          }
          
          // 初始化Web3实例
          web3Instance = new Web3(window.ethereum);
          
          // 监听账户变化
          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              console.log('账户已更改为:', accounts[0]);
              if (leepCoinContract) {
                updateBalance(accounts[0]);
              }
            } else {
              setAccount(null);
              console.log('未连接账户');
            }
          });

          // 监听网络变化
          window.ethereum.on('chainChanged', (chainId) => {
            console.log('网络已更改为:', chainId);
            window.location.reload();
          });
        } else {
          throw new Error('请安装MetaMask钱包以使用此应用');
        }
      } else if (type === 'localhost') {
        // 连接到本地节点
        console.log('尝试连接到本地节点:', LOCALHOST_ENDPOINT);
        web3Instance = new Web3(LOCALHOST_ENDPOINT);
      }
      
      setWeb3(web3Instance);
      console.log('Web3实例已创建');

      // 获取用户账户
      try {
        const accounts = await web3Instance.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          console.log('当前账户:', accounts[0]);
        } else {
          console.log('未检测到账户');
        }
      } catch (accountError) {
        console.log('获取账户信息失败:', accountError);
      }

      // 获取网络ID
      try {
        const netId = await web3Instance.eth.net.getId();
        setNetworkId(netId);
        console.log('网络ID:', netId);
      } catch (netError) {
        console.log('获取网络ID失败:', netError);
      }

      // 初始化LeepCoin合约
      try {
        const leepCoin = new web3Instance.eth.Contract(
          LeepCoin.abi,
          '1760446169093'
        );
        setLeepCoinContract(leepCoin);
        console.log('LeepCoin合约已初始化');
      } catch (contractError) {
        console.log('初始化LeepCoin合约失败:', contractError);
      }

      // 初始化Exchange合约
      try {
        const exchange = new web3Instance.eth.Contract(
          Exchange.abi,
          '1760446169093'
        );
        setExchangeContract(exchange);
        console.log('Exchange合约已初始化');
      } catch (exchangeError) {
        console.log('初始化Exchange合约失败:', exchangeError);
      }


      } catch (error) {
        console.error('初始化Web3失败:', error);
        // 针对本地节点连接的特定错误信息
        if (type === 'localhost') {
          setError('连接到本地节点失败: ' + error.message + '\n请确保localhost:8545上有运行中的以太坊节点');
        } else {
          setError('连接失败: ' + error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    // 当连接类型改变时重新初始化
    useEffect(() => {
      if (connectionType) {
        initWeb(connectionType);
      }
    }, [connectionType]);

  // 更新用户余额
  const updateBalance = async (userAccount) => {
    if (leepCoinContract && userAccount && web3) {
      try {
        const userBalance = await leepCoinContract.methods.balanceOf(userAccount).call();
        setBalance(web3.utils.fromWei(userBalance, 'ether'));
        console.log('余额已更新:', web3.utils.fromWei(userBalance, 'ether'));
      } catch (error) {
        console.error('获取余额失败:', error);
      }
    }
  };

  // 当账户或合约变化时更新余额
  useEffect(() => {
    if (account && leepCoinContract && web3) {
      updateBalance(account);
    }
  }, [account, leepCoinContract, web3]);

  // 授权Exchange合约使用LeepCoin
  const approveExchange = async () => {
    if (!leepCoinContract || !account || !web3) {
      alert('请确保已连接钱包并初始化合约');
      return;
    }

    try {
      setLoading(true);
      const amount = web3.utils.toWei('1000', 'ether'); // 授权1000个LeepCoin
      await leepCoinContract.methods.approve(EXCHANGE_ADDRESS, amount).send({
        from: account
      });
      alert('授权成功！');
      console.log('授权Exchange合约成功');
    } catch (error) {
      console.error('授权失败:', error);
      alert('授权失败，请重试！错误信息: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">正在连接区块链...</div>
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="content-container">
        <div className="error-message" style={{
          color: 'red',
          padding: '15px',
          border: '1px solid #ffcccc',
          borderRadius: '5px',
          backgroundColor: '#fff0f0',
          whiteSpace: 'pre-line'
        }}>{error}</div>
        <button 
          onClick={() => {
            setError(null);
            initWeb('localhost'); // 直接重试连接本地节点
          }} 
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          重试连接本地节点
        </button>
      </div>
    );
  }

  // 渲染已连接状态
  return (
    <div className="content-container">
      <h2>区块链交易平台</h2>
      
      {/* 自动连接到本地节点，隐藏连接选项UI */}
      <div className="connection-info" style={{
        margin: '10px 0',
        padding: '10px',
        backgroundColor: '#e3f2fd',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        正在自动连接到本地节点: {LOCALHOST_ENDPOINT}
      </div>
      
      <div className="wallet-info">
        <h3>钱包信息</h3>
        {account ? (
          <div>
            <p>当前账户: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            <p>LeepCoin余额: {balance}</p>
            <p>网络ID: {networkId}</p>
            <button onClick={approveExchange} className="btn-approve">
              授权Exchange使用LeepCoin
            </button>
          </div>
        ) : (
          <p>未连接钱包，请解锁MetaMask</p>
        )}
      </div>

      {exchangeContract && account && (
        <div className="contract-actions">
          <h3>交易功能</h3>
          <p>合约已加载，可以进行交易操作</p>
          {/* 这里可以添加更多的交易功能，如创建订单、取消订单、完成订单等 */}
        </div>
      )}
    </div>
  );
}
