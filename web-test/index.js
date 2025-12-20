const provider = new ethers.BrowserProvider(window.ethereum);
// 请求用户授权连接钱包
// 这会弹出 MetaMask 授权窗口
await provider.send('eth_requestAccounts', []);
// 获取 Signer（签名者）
const signer = await provider.getSigner();
// 获取钱包地址
const address = await signer.getAddress();
console.log('Connected account:', address);
// 获取余额
const balance = await provider.getBalance(address);
