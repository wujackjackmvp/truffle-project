const LeepCoin = artifacts.require("LeepCoin");
const Exchange = artifacts.require("Exchange");

module.exports = async function (deployer, network, accounts) {
  console.log('accounts', accounts);
  // 部署LeepCoin合约，传入初始供应量参数
  const initialSupply = web3.utils.toWei('1000000', 'ether'); // 100万LeepCoin
  await deployer.deploy(LeepCoin, initialSupply);
  const leepCoinInstance = await LeepCoin.deployed();
  
  // 部署Exchange合约，传入手续费账户地址和费率
  // 使用第一个账户作为手续费账户，费率设置为1%（100表示1%，因为Solidity不支持小数）
  await deployer.deploy(Exchange, accounts[0], 100);
  const exchangeInstance = await Exchange.deployed();
  
  // 为测试目的，向其他账户分配一些LeepCoin代币
  await leepCoinInstance.transfer(accounts[1], web3.utils.toWei('100000', 'ether'));
  await leepCoinInstance.transfer(accounts[2], web3.utils.toWei('100000', 'ether'));
};