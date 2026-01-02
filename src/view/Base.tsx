import React, { useState, useEffect } from 'react';
import { InfoContractService } from '../dapp/InfoContractService';

// 主组件
const InfoContractApp = () => {
  // 状态
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [readResult, setReadResult] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);

  // 显示状态消息
  const showStatus = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setStatus(message);
    setStatusType(type);
    setTimeout(() => {
      setStatus(null);
    }, 5000);
  };

  // 连接钱包
  const handleConnect = async () => {
    try {
      // 设置合约地址
      const contractAddress = '0x3695403Ea61bd35c86186F457548bce8723Fd97f';
      
      // 创建新的合约服务实例
      const service = new InfoContractService(contractAddress);
      
      // 连接钱包
      const connectedAddress = await service.connectWallet();
      if (connectedAddress) {
        // 更新全局实例的地址
        (window as any).infoContractService = service;
        
        setAddress(connectedAddress);
        setIsConnected(true);
        showStatus('✅ 钱包连接成功!', 'success');
        showStatus('✅ 合约已初始化', 'success');
      }
    } catch (error) {
      console.error(error);
      showStatus(`❌ 连接失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    // 移除事件监听
    if ((window as any).infoContractService) {
      (window as any).infoContractService.removeEventListeners();
    }
    
    setIsConnected(false);
    setAddress(null);
    setIsListening(false);
    showStatus('❌ 钱包已断开连接', 'error');
  };

  // 调用sayHi
  const handleSayHi = async () => {
    try {
      const service = (window as any).infoContractService;
      if (!service) {
        showStatus('❌ 合约服务未初始化', 'error');
        return;
      }

      const result = await service.sayHi();
      setReadResult(`<strong>sayHi() 返回:</strong><br>${result}`);
      showStatus('✅ 调用成功!', 'success');
    } catch (error) {
      showStatus(`❌ 调用失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 调用getInfo
  const handleGetInfo = async () => {
    try {
      const service = (window as any).infoContractService;
      if (!service) {
        showStatus('❌ 合约服务未初始化', 'error');
        return;
      }

      const result = await service.getInfo();
      setReadResult(`<strong>getInfo() 返回:</strong><br>姓名: ${result[0]}<br>年龄: ${result[1].toString()}`);
      showStatus('✅ 调用成功!', 'success');
    } catch (error) {
      showStatus(`❌ 调用失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 调用setInfo
  const handleSetInfo = async () => {
    try {
      const service = (window as any).infoContractService;
      if (!service) {
        showStatus('❌ 合约服务未初始化', 'error');
        return;
      }

      if (!name || !age) {
        showStatus('❌ 请输入姓名和年龄!', 'error');
        return;
      }

      const tx = await service.setInfo(name, parseInt(age));
      setTxResult(`⏳ 交易已发送，等待确认...\n交易哈希: ${tx.hash}`);

      const receipt = await tx.wait();
      if (receipt) {
        setTxResult(`✅ 交易成功!\n交易哈希: ${receipt.hash}`);
      } else {
        setTxResult(`✅ 交易成功!\n交易哈希: ${tx.hash}`);
      }

      setName('');
      setAge('');
      showStatus('✅ 交易成功!', 'success');
    } catch (error) {
      showStatus(`❌ 交易失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 开始监听事件
  const handleStartListen = () => {
    try {
      const service = (window as any).infoContractService;
      if (!service) {
        showStatus('❌ 合约服务未初始化', 'error');
        return;
      }

      setIsListening(true);
      showStatus('✅ 开始监听事件!', 'success');

      // 监听Instructor事件
      service.listenForEvents((name: string, age: bigint) => {
        const timestamp = new Date().toLocaleString('zh-CN');
        const newLog = {
          name,
          age,
          timestamp,
          blockNumber: 0, // 事件回调中没有直接提供区块号
          transactionHash: '' // 事件回调中没有直接提供交易哈希
        };

        setEventLogs(prev => [newLog, ...prev]);
        showStatus('收到新事件!', 'success');
      });
    } catch (error) {
      showStatus(`❌ 监听事件失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 停止监听事件
  const handleStopListen = () => {
    try {
      const service = (window as any).infoContractService;
      if (service) {
        service.removeEventListeners();
      }

      setIsListening(false);
      showStatus('⏹️ 已停止监听', 'info');
    } catch (error) {
      showStatus(`❌ 停止监听失败: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  // 清空事件日志
  const handleClearEvents = () => {
    setEventLogs([]);
    showStatus('���️ 已清空日志', 'info');
  };

  // 监听MetaMask事件
  useEffect(() => {
    // 断开连接处理函数
    const handleDisconnectLocal = () => {
      setIsConnected(false);
      setAddress(null);
      setIsListening(false);
      showStatus('❌ 钱包已断开连接', 'error');
    };

    if (typeof window.ethereum !== 'undefined') {
      // 监听账户变化
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnectLocal();
        } else {
          setAddress(accounts[0]);
        }
      });

      // 监听网络变化
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <div className="container">
      <h1>InfoContract 链上交互</h1>

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
          <button id="connectBtn" onClick={() => handleConnect()}>
            连接 MetaMask
          </button>
        ) : (
          <>
            <div id="accountInfo" className="info-box">
              <p><strong>账户地址:</strong> {address}</p>
            </div>
            <button id="disconnectBtn" onClick={() => handleDisconnect()} style={{ marginTop: '10px', background: '#dc3545' }}>
              断开连接
            </button>
          </>
        )}
      </div>

      {/* 读取操作 */}
      {isConnected && (
        <div className="section">
          <h2>读取数据 (免费)</h2>
          <button id="sayHiBtn" style={{ marginBottom: '10px' }} onClick={handleSayHi}>
            调用 sayHi()
          </button>
          <button id="getInfoBtn" onClick={handleGetInfo}>
            调用 getInfo()
          </button>
          {readResult && (
            <div id="readResult" className="info-box">
              <p dangerouslySetInnerHTML={{ __html: readResult }}></p>
            </div>
          )}
        </div>
      )}

      {/* 写入操作 */}
      {isConnected && (
        <div className="section">
          <h2>✍️ 写入数据 (需要 Gas)</h2>
          <div className="form-group">
            <label htmlFor="nameInput">姓名:</label>
            <input
              type="text"
              id="nameInput"
              placeholder="请输入姓名"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ageInput">年龄:</label>
            <input
              type="number"
              id="ageInput"
              placeholder="请输入年龄"
              value={age}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAge(e.target.value)}
            />
          </div>
          <button
            id="setInfoBtn"
            onClick={handleSetInfo}
          >
            调用 setInfo()
          </button>
          {txResult && (
            <div id="txResult" className="info-box">
              <p style={{ whiteSpace: 'pre-line' }}>{txResult}</p>
            </div>
          )}
        </div>
      )}

      {/* 事件监听 */}
      {isConnected && (
        <div className="section">
          <h2>事件监听</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>  
            <button
              id="startListenBtn"
              style={{ flex: 1 }}
              onClick={handleStartListen}
              disabled={isListening}
            >
              开始监听
            </button>
            <button
              id="stopListenBtn"
              style={{ flex: 1, background: '#dc3545' }}
              onClick={handleStopListen}
              disabled={!isListening}
            >
              停止监听
            </button>
            <button
              id="clearEventsBtn"
              style={{ flex: 1, background: '#6c757d' }}
              onClick={handleClearEvents}
            >
              清空日志
            </button>
          </div>
          <div id="eventStatus" className="info-box" style={{ background: '#e9ecef' }}>
            <p>
              <strong>监听状态:</strong>
              <span id="listenStatus" className={isListening ? 'listening' : ''}>
                {isListening ? '监听中...' : '已停止'}
              </span>
            </p>
            <p><strong>接收事件数:</strong> <span id="eventCount">{eventLogs.length}</span></p>
          </div>
          <div
            id="eventLogs"
            style={{ marginTop: '15px', maxHeight: '300px', overflowY: 'auto' }}
          >
            {eventLogs.map((log, index) => (
              <div key={index} className="event-item">
                <div className="event-header">
                  <span>Instructor 事件</span>
                  <span className="event-time">{log.timestamp}</span>
                </div>
                <div className="event-data">
                  姓名: {log.name}
                </div>
                <div className="event-data">
                  年龄: {log.age.toString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 导出组件
export const BaseComponent = () => {
  return <InfoContractApp />;
};

export default BaseComponent;
