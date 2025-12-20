const LeepCoin = artifacts.require("LeepCoin");
const Exchange = artifacts.require("Exchange");

contract("Exchange", (accounts) => {
  let exchangeInstance;
  let leepCoinInstance;
  const feeAccount = accounts[0];
  const feePercent = 1; // 1%的费率
  const user1 = accounts[1];
  const user2 = accounts[2];
  const etherAmount = 1;
  const tokenAmount = 1000;
  const ETHER = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    // 先部署LeepCoin合约
    leepCoinInstance = await LeepCoin.new(1000000);
    // 部署Exchange合约
    exchangeInstance = await Exchange.new(feeAccount, feePercent);
    // 给user1发放一些LeepCoin用于测试
    await leepCoinInstance.transfer(user1, web3.utils.toWei(tokenAmount.toString(), "ether"));
    // 给user2也发放一些LeepCoin用于测试
    await leepCoinInstance.transfer(user2, web3.utils.toWei(tokenAmount.toString(), "ether"));
  });

  // 测试合约部署和初始参数设置
  it("应该正确部署合约并设置初始参数", async () => {
    // 验证合约是否成功部署
    assert.ok(exchangeInstance.address);

    // 验证feeAccount是否正确设置
    const actualFeeAccount = await exchangeInstance.feeAccount();
    assert.equal(actualFeeAccount, feeAccount, "feeAccount应该设置为部署时指定的账户");

    // 验证feePercent是否正确设置
    const actualFeePercent = await exchangeInstance.feePercent();
    assert.equal(actualFeePercent, feePercent, "feePercent应该设置为部署时指定的费率");
  });

  // 测试存入以太币功能
  it("应该允许用户存入以太币", async () => {
    // 初始余额应该为0
    let initialBalance = await exchangeInstance.tokens(ETHER, user1);
    assert.equal(initialBalance.toString(), "0", "用户初始以太币余额应该为0");

    // 存入以太币
    const tx = await exchangeInstance.depositEther({
      from: user1,
      value: web3.utils.toWei(etherAmount.toString(), "ether")
    });

    // 验证余额是否增加
    let newBalance = await exchangeInstance.tokens(ETHER, user1);
    assert.equal(
      newBalance.toString(),
      web3.utils.toWei(etherAmount.toString(), "ether"),
      "用户以太币余额应该等于存入的金额"
    );

    // 验证事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Deposit", "事件类型应该是deposit");
    assert.equal(tx.logs[0].args.token, ETHER, "事件中的token应该是ETHER地址");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是存入的用户");
    assert.equal(
      tx.logs[0].args.value.toString(),
      web3.utils.toWei(etherAmount.toString(), "ether"),
      "事件中的value应该等于存入的金额"
    );
    assert.equal(
      tx.logs[0].args.balance.toString(),
      web3.utils.toWei(etherAmount.toString(), "ether"),
      "事件中的balance应该等于用户的新余额"
    );
  });

  // 测试存入代币功能
  it("应该允许用户存入LeepCoin代币", async () => {
    const tokenAddress = leepCoinInstance.address;
    console.log('韭菜币地址', tokenAddress);
    const depositAmount = web3.utils.toWei("100", "ether");

    // 初始余额应该为0
    // tokens = L: { user1: 0 }
    let initialBalance = await exchangeInstance.tokens(tokenAddress, user1);
    assert.equal(initialBalance.toString(), "0", "用户初始代币余额应该为0");

    // 授权Exchange合约使用用户的代币
    console.log('合约地址', exchangeInstance.address);
    console.log('授权的用户', user1);
    // user1: { E: 100 } 
    await leepCoinInstance.approve(exchangeInstance.address, depositAmount, { from: user1 });
    // 验证授权事件
    // const approvalEvent = (await leepCoinInstance.getPastEvents("Approval", { fromBlock: 0 }))[0];
    // console.log('approvalEvent.returnValues', approvalEvent.returnValues);
    // 存入代币
    // tokens: { L: { user1: 100 } }
    const tx = await exchangeInstance.depositToken(tokenAddress, depositAmount, { from: user1 });
    const approvalEvent = (await exchangeInstance.getPastEvents("Deposit", { fromBlock: 0 }))[0];
    console.log('approvalEvent.returnValues', approvalEvent.returnValues);

    // 验证余额是否增加
    let newBalance = await exchangeInstance.tokens(tokenAddress, user1);
    assert.equal(
      newBalance.toString(),
      depositAmount,
      "用户代币余额应该等于存入的金额"
    );

    // 验证事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Deposit", "事件类型应该是deposit");
    assert.equal(tx.logs[0].args.token, tokenAddress, "事件中的token应该是代币地址");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是存入的用户");
    assert.equal(
      tx.logs[0].args.value.toString(),
      depositAmount,
      "事件中的value应该等于存入的金额"
    );
    assert.equal(
      tx.logs[0].args.balance.toString(),
      depositAmount,
      "事件中的balance应该等于用户的新余额"
    );
  });

  // 测试存入代币时不能存入以太币地址
  it("存入代币时不应该允许使用以太币地址", async () => {
    try {
      // 尝试使用以太币地址存入代币
      await exchangeInstance.depositToken(ETHER, web3.utils.toWei("100", "ether"), { from: user1 });
      assert.fail("存入代币时应该不允许使用以太币地址");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试存入代币时需要足够的授权
  it("存入代币时需要足够的授权", async () => {
    const tokenAddress = leepCoinInstance.address;
    const depositAmount = web3.utils.toWei("100", "ether");

    // 没有授权就尝试存入代币
    try {
      await exchangeInstance.depositToken(tokenAddress, depositAmount, { from: user1 });
      assert.fail("存入代币时需要足够的授权");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试提取以太币功能
  it("应该允许用户提取以太币", async () => {
    // 先存入以太币
    const depositAmount = web3.utils.toWei(etherAmount.toString(), "ether");
    await exchangeInstance.depositEther({ from: user1, value: depositAmount });
    
    // 提取以太币
    const withdrawAmount = web3.utils.toWei("0.5", "ether");
    const tx = await exchangeInstance.withdrawEhter(withdrawAmount, { from: user1 });
    
    // 验证余额是否减少
    const newBalance = await exchangeInstance.tokens(ETHER, user1);
    const expectedBalance = depositAmount - withdrawAmount;
    assert.equal(
      newBalance.toString(),
      expectedBalance.toString(),
      "用户以太币余额应该等于存入金额减去提取金额"
    );
    
    // 验证Withdraw事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Withdraw", "事件类型应该是Withdraw");
    assert.equal(tx.logs[0].args.token, ETHER, "事件中的token应该是ETHER地址");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是提取的用户");
    assert.equal(
      tx.logs[0].args.value.toString(),
      withdrawAmount.toString(),
      "事件中的value应该等于提取的金额"
    );
    assert.equal(
      tx.logs[0].args.balance.toString(),
      expectedBalance.toString(),
      "事件中的balance应该等于用户的新余额"
    );
  });

  // 测试提取代币功能
  it("应该允许用户提取LeepCoin代币", async () => {
    const tokenAddress = leepCoinInstance.address;
    const depositAmount = web3.utils.toWei("100", "ether");
    
    // 先存入代币
    await leepCoinInstance.approve(exchangeInstance.address, depositAmount, { from: user1 });
    await exchangeInstance.depositToken(tokenAddress, depositAmount, { from: user1 });
    
    // 提取代币
    const withdrawAmount = web3.utils.toWei("50", "ether");
    const tx = await exchangeInstance.withdrawOther(tokenAddress, withdrawAmount, { from: user1 });
    
    // 验证余额是否减少
    const newBalance = await exchangeInstance.tokens(tokenAddress, user1);
    const expectedBalance = web3.utils.toBN(depositAmount).sub(web3.utils.toBN(withdrawAmount));
    assert.equal(
      newBalance.toString(),
      expectedBalance.toString(),
      "用户代币余额应该等于存入金额减去提取金额"
    );
    
    // 验证Withdraw事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Withdraw", "事件类型应该是Withdraw");
    assert.equal(tx.logs[0].args.token, tokenAddress, "事件中的token应该是代币地址");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是提取的用户");
    assert.equal(
      tx.logs[0].args.value.toString(),
      withdrawAmount.toString(),
      "事件中的value应该等于提取的金额"
    );
    assert.equal(
      tx.logs[0].args.balance.toString(),
      expectedBalance.toString(),
      "事件中的balance应该等于用户的新余额"
    );
  });

  // 测试提取代币时不能使用以太币地址
  it("提取代币时不应该允许使用以太币地址", async () => {
    try {
      // 尝试使用以太币地址提取代币
      await exchangeInstance.withdrawOther(ETHER, web3.utils.toWei("100", "ether"), { from: user1 });
      assert.fail("提取代币时应该不允许使用以太币地址");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试提取代币时余额不足
  it("提取代币时余额不足应该失败", async () => {
    const tokenAddress = leepCoinInstance.address;
    const withdrawAmount = web3.utils.toWei("100", "ether");
    
    // 没有存入就尝试提取代币
    try {
      await exchangeInstance.withdrawOther(tokenAddress, withdrawAmount, { from: user1 });
      assert.fail("余额不足时应该不允许提取代币");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试创建订单功能
  it("应该允许用户创建订单", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // 创建订单
    const tx = await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    
    // 验证订单计数是否增加
    const orderId = await exchangeInstance.orderCount();
    assert.equal(orderId.toNumber(), 1, "订单计数应该为1");
    
    // 验证订单是否正确创建
    const order = await exchangeInstance.orders(orderId);
    assert.equal(order.id.toNumber(), orderId.toNumber(), "订单ID应该正确");
    assert.equal(order.user, user1, "订单用户应该是创建者");
    assert.equal(order.tokenGet, tokenGet, "获取的代币地址应该正确");
    assert.equal(order.amountGet.toString(), amountGet, "获取的代币数量应该正确");
    assert.equal(order.tokenGive, tokenGive, "支付的代币地址应该正确");
    assert.equal(order.amountGive.toString(), amountGive, "支付的代币数量应该正确");
    
    // 验证Order事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Order", "事件类型应该是Order");
  });

  // 测试取消订单功能 - 订单创建者可以取消自己的订单
  it("应该允许订单创建者取消自己的订单", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // 先创建订单
    await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    const orderId = await exchangeInstance.orderCount();
    
    // 取消订单
    const tx = await exchangeInstance.cancelOrder(orderId, { from: user1 });
    
    // 验证订单是否被标记为取消（status为1表示取消）
    const order = await exchangeInstance.orders(orderId);
    assert.equal(order.status.toNumber(), 1, "订单status应该被设置为1，表示取消");
    
    // 验证Cancel事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Cancel", "事件类型应该是Cancel");
    assert.equal(tx.logs[0].args.id.toNumber(), orderId.toNumber(), "事件中的id应该是订单ID");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是取消订单的用户");
  });

  // 测试取消订单功能 - 非订单创建者不能取消他人的订单
  it("不应该允许非订单创建者取消他人的订单", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // user1创建订单
    await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    const orderId = await exchangeInstance.orderCount();
    
    // user2尝试取消user1的订单
    try {
      await exchangeInstance.cancelOrder(orderId, { from: user2 });
      assert.fail("非订单创建者不应该能够取消他人的订单");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试取消订单功能 - 取消不存在的订单会失败
  it("取消不存在的订单应该失败", async () => {
    const nonExistentOrderId = 999;
    
    // 尝试取消不存在的订单
    try {
      await exchangeInstance.cancelOrder(nonExistentOrderId, { from: user1 });
      assert.fail("取消不存在的订单应该失败");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试完成订单功能 - 用户可以完成订单
  it("应该允许用户完成订单", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // user1存入以太币（用于订单中的tokenGet）
    await exchangeInstance.depositEther({ from: user1, value: amountGet });
    
    // user1创建订单（想要用100个LeepCoin换取1个ETH）
    await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    const orderId = await exchangeInstance.orderCount();
    
    // user2存入LeepCoin代币（用于填充订单）
    // 将amountGive转换为BN对象并添加1个额外的代币用于手续费
    const approvalAmount = web3.utils.toBN(amountGive).add(web3.utils.toBN(web3.utils.toWei("1", "ether")));
    await leepCoinInstance.approve(exchangeInstance.address, approvalAmount, { from: user2 });
    await exchangeInstance.depositToken(tokenAddress, approvalAmount, { from: user2 });
    
    // 获取交易前的余额
    const user1BalanceBefore = await exchangeInstance.balanceOf(tokenAddress, user1);
    const user2BalanceBefore = await exchangeInstance.balanceOf(ETHER, user2);
    const feeAccountBalanceBefore = await exchangeInstance.balanceOf(tokenAddress, feeAccount);
    
    // user2完成订单
    const tx = await exchangeInstance.fillOrder(orderId, { from: user2 });
    
    // 验证订单是否被标记为完成（status为2表示完成）
    const order = await exchangeInstance.orders(orderId);
    assert.equal(order.status.toNumber(), 2, "订单status应该被设置为2，表示完成");
    
    // 验证余额更新
    const user1BalanceAfter = await exchangeInstance.balanceOf(tokenAddress, user1);
    const user2BalanceAfter = await exchangeInstance.balanceOf(ETHER, user2);
    const feeAccountBalanceAfter = await exchangeInstance.balanceOf(tokenAddress, feeAccount);
    
    assert.equal(
      user1BalanceAfter.toString(),
      user1BalanceBefore.add(web3.utils.toBN(amountGive)).toString(),
      "订单创建者应该收到支付的代币"
    );
    assert.equal(
      user2BalanceAfter.toString(),
      user2BalanceBefore.add(web3.utils.toBN(amountGet)).toString(),
      "订单填充者应该收到获取的代币"
    );
    
    // 验证手续费收取（1%的amountGive）
    const feeAmount = web3.utils.toBN(amountGive).mul(web3.utils.toBN(feePercent)).div(web3.utils.toBN(100));
    assert.equal(
      feeAccountBalanceAfter.toString(),
      feeAccountBalanceBefore.add(feeAmount).toString(),
      "收费账户应该收到手续费"
    );
    
    // 验证Trade事件是否正确触发
    assert.equal(tx.logs.length, 1, "应该触发一个事件");
    assert.equal(tx.logs[0].event, "Trade", "事件类型应该是Trade");
    assert.equal(tx.logs[0].args.id.toNumber(), orderId.toNumber(), "事件中的id应该是订单ID");
    assert.equal(tx.logs[0].args.user, user1, "事件中的user应该是订单创建者");
    assert.equal(tx.logs[0].args.userFill, user2, "事件中的userFill应该是订单填充者");
  });

  // 测试完成订单功能 - 完成不存在的订单会失败
  it("完成不存在的订单应该失败", async () => {
    const nonExistentOrderId = 999;
    
    // 尝试完成不存在的订单
    try {
      await exchangeInstance.fillOrder(nonExistentOrderId, { from: user1 });
      assert.fail("完成不存在的订单应该失败");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试完成订单功能 - 完成已取消的订单会失败
  it("完成已取消的订单应该失败", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // 创建订单
    await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    const orderId = await exchangeInstance.orderCount();
    
    // 取消订单
    await exchangeInstance.cancelOrder(orderId, { from: user1 });
    
    // 尝试完成已取消的订单
    try {
      await exchangeInstance.fillOrder(orderId, { from: user2 });
      assert.fail("完成已取消的订单应该失败");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });

  // 测试完成订单功能 - 完成订单时余额不足会失败
  it("完成订单时余额不足应该失败", async () => {
    const tokenAddress = leepCoinInstance.address;
    const tokenGet = ETHER;
    const amountGet = web3.utils.toWei("1", "ether");
    const tokenGive = tokenAddress;
    const amountGive = web3.utils.toWei("100", "ether");
    
    // user1存入以太币并创建订单
    await exchangeInstance.depositEther({ from: user1, value: amountGet });
    await exchangeInstance.makeOrder(tokenGet, amountGet, tokenGive, amountGive, { from: user1 });
    const orderId = await exchangeInstance.orderCount();
    
    // user2存入不足的代币
    await leepCoinInstance.approve(exchangeInstance.address, web3.utils.toWei("50", "ether"), { from: user2 });
    await exchangeInstance.depositToken(tokenAddress, web3.utils.toWei("50", "ether"), { from: user2 });
    
    // 尝试完成订单（余额不足）
    try {
      await exchangeInstance.fillOrder(orderId, { from: user2 });
      assert.fail("余额不足时应该不允许完成订单");
    } catch (error) {
      assert(error.message.includes("revert"), "操作应该失败");
    }
  });
});