const LeepCoin = artifacts.require("LeepCoin");

contract("LeepCoin", (accounts) => {
  let leepCoinInstance;
  const initialSupply = 1000000; // 100万初始供应量
  const decimals = 18;
  const owner = accounts[0]; // 币的发行人
  const receiver = accounts[1]; // 客户b
  const spender = accounts[2]; // 机构

  function toWei(number) {
    return web3.utils.toWei(number.toString(), "ether")
  }
  function fromWei(bn) {
    return web3.utils.fromWei(bn, "ether")
  }

  beforeEach(async () => {
    // 在每个测试用例前部署合约
    leepCoinInstance = await LeepCoin.new(initialSupply);
  });

  // 测试合约部署和基本信息
  it("应该正确部署合约并设置基本信息", async () => {
    // 验证合约是否成功部署
    assert.ok(leepCoinInstance.address);

    // 验证代币名称
    const name = await leepCoinInstance.name();
    assert.equal(name, "LeepCoin", "代币名称应该是LeepCoin");

    // 验证代币符号
    const symbol = await leepCoinInstance.symbol();
    assert.equal(symbol, "LEEP", "代币符号应该是LEEP");

    // 验证代币小数位
    const decimalValue = await leepCoinInstance.decimals();
    assert.equal(decimalValue, decimals, `代币小数位应该是${decimals}`);

    // 验证代币总量
    const totalSupply = await leepCoinInstance.totalSupply();
    const expectedSupply = web3.utils.toBN(initialSupply).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
    assert.equal(totalSupply.toString(), expectedSupply.toString(), "代币总量应该是初始供应量乘以10^18");
  });

  // 测试初始余额分配
  it("应该将初始代币总量分配给合约创建者", async () => {
    const ownerBalance = await leepCoinInstance.balanceOf(owner);
    const totalSupply = await leepCoinInstance.totalSupply();
    assert.equal(ownerBalance.toString(), totalSupply.toString(), "合约创建者应该拥有全部代币");
  });

  // 测试转账功能
  it("应该正确执行转账功能", async () => {
    const transferAmount = web3.utils.toWei("100", "ether");
    
    // 执行转账
    await leepCoinInstance.transfer(receiver, transferAmount, { from: owner });
    
    // 验证发送者余额减少
    const ownerBalance = await leepCoinInstance.balanceOf(owner);
    console.log('验证发送者余额:', fromWei(ownerBalance));
    const totalSupply = await leepCoinInstance.totalSupply();
    console.log('总额:', fromWei(totalSupply));
    const expectedOwnerBalance = web3.utils.toBN(totalSupply).sub(web3.utils.toBN(transferAmount));
    console.log('余额:', fromWei(expectedOwnerBalance));
    assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString(), "发送者余额应该减少相应金额");
    
    // 验证接收者余额增加
    const receiverBalance = await leepCoinInstance.balanceOf(receiver);
    console.log('验证接收者余额:', fromWei(receiverBalance));
    assert.equal(receiverBalance.toString(), transferAmount, "接收者余额应该增加相应金额");
    
    // 验证转账事件
    const transferEvent = (await leepCoinInstance.getPastEvents("Transfer", { fromBlock: 0 }))[1];
    assert.equal(transferEvent.returnValues.from, owner, "转账事件的发送者地址应该正确");
    assert.equal(transferEvent.returnValues.to, receiver, "转账事件的接收者地址应该正确");
    assert.equal(transferEvent.returnValues.value, transferAmount, "转账事件的金额应该正确");
  });

  // 测试授权功能
  it("应该正确执行授权功能", async () => {
    const approveAmount = toWei("50");
    
    // 执行授权
    await leepCoinInstance.approve(spender, approveAmount, { from: owner });
    
    // 验证授权额度
    const allowance = await leepCoinInstance.allowance(owner, spender);
    assert.equal(allowance.toString(), approveAmount, "授权额度应该正确设置");
    
    // 验证授权事件
    const approvalEvent = (await leepCoinInstance.getPastEvents("Approval", { fromBlock: 0 }))[0];
    console.log('approvalEvent.returnValues', approvalEvent.returnValues);
    assert.equal(approvalEvent.returnValues.owner, owner, "授权事件的所有者地址应该正确");
    assert.equal(approvalEvent.returnValues.spender, spender, "授权事件的授权地址应该正确");
    assert.equal(approvalEvent.returnValues.value, approveAmount, "授权事件的金额应该正确");
  });

  // 测试授权转账功能
  it("应该正确执行授权转账功能", async () => {
    const approveAmount = toWei("50");
    const transferAmount = toWei("30");
    
    // 先授权
    await leepCoinInstance.approve(spender, approveAmount, { from: owner });
    
    // 执行授权转账
    await leepCoinInstance.transferFrom(owner, receiver, transferAmount, { from: spender });
    
    // 验证发送者余额减少
    const ownerBalance = await leepCoinInstance.balanceOf(owner);
    const totalSupply = await leepCoinInstance.totalSupply();
    const expectedOwnerBalance = web3.utils.toBN(totalSupply).sub(web3.utils.toBN(transferAmount));
    console.log('验证发送者余额:', fromWei(ownerBalance));
    assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString(), "发送者余额应该减少相应金额");
    
    // 验证接收者余额增加
    const receiverBalance = await leepCoinInstance.balanceOf(receiver);
    console.log('验证接收者余额:', fromWei(receiverBalance));
    assert.equal(receiverBalance.toString(), transferAmount, "接收者余额应该增加相应金额");
    
    // 验证剩余授权额度
    const remainingAllowance = await leepCoinInstance.allowance(owner, spender);
    console.log('验证剩余授权额度:', fromWei(remainingAllowance));
    const expectedRemainingAllowance = web3.utils.toBN(approveAmount).sub(web3.utils.toBN(transferAmount));
    console.log('验证剩余授权额度:', fromWei(expectedRemainingAllowance));
    assert.equal(remainingAllowance.toString(), expectedRemainingAllowance.toString(), "剩余授权额度应该正确");
  });

  // // 测试余额不足的情况
  it("应该在余额不足时拒绝转账", async () => {
    const transferAmount = toWei(1);
    
    try {
      // 尝试从没有余额的账户转账
      await leepCoinInstance.transfer(owner, transferAmount, { from: receiver });
      assert.fail("应该抛出错误");
    } catch (error) {
      assert.include(error.message, "Insufficient balance", "错误信息应该包含'余额不足'");
    }
  });

  // 测试授权额度不足的情况
  it("应该在授权额度不足时拒绝授权转账", async () => {
    const approveAmount = toWei(20);
    const transferAmount = toWei(30);
    
    // 先授权，但授权额度小于转账金额
    await leepCoinInstance.approve(spender, approveAmount, { from: owner });
    
    try {
      // 尝试转账超过授权额度的金额
      await leepCoinInstance.transferFrom(owner, receiver, transferAmount, { from: spender });
      assert.fail("应该抛出错误");
    } catch (error) {
      assert.include(error.message, "Insufficient allowance", "错误信息应该包含'授权额度不足'");
    }
  });

  // // 测试向零地址转账的情况
  it("应该拒绝向零地址转账", async () => {
    const transferAmount = toWei(100);
    
    try {
      // 尝试向零地址转账
      await leepCoinInstance.transfer("0x0000000000000000000000000000000000000000", transferAmount, { from: owner });
      assert.fail("应该抛出错误");
    } catch (error) {
      assert.include(error.message, "Cannot transfer to zero address", "错误信息应该包含'不能转账到零地址'");
    }
  });

  // 测试造币功能：只有所有者可以造币
  it("应该允许所有者造币", async () => {
    const mintAmount = 1000; // 1000个代币
    const initialTotalSupply = await leepCoinInstance.totalSupply();
    
    // 所有者执行造币
    await leepCoinInstance.mint(receiver, mintAmount, { from: owner });
    
    // 验证总供应量增加
    const newTotalSupply = await leepCoinInstance.totalSupply();
    const expectedTotalSupply = web3.utils.toBN(initialTotalSupply).add(web3.utils.toBN(toWei(mintAmount)));
    assert.equal(newTotalSupply.toString(), expectedTotalSupply.toString(), "总供应量应该增加相应金额");
    
    // 验证接收者余额增加
    const receiverBalance = await leepCoinInstance.balanceOf(receiver);
    assert.equal(receiverBalance.toString(), toWei(mintAmount), "接收者余额应该增加相应金额");
  });

  // 测试非所有者不能造币
  it("不应该允许非所有者造币", async () => {
    const mintAmount = 1000;
    
    try {
      // 非所有者尝试造币
      await leepCoinInstance.mint(receiver, mintAmount, { from: receiver });
      assert.fail("应该抛出错误");
    } catch (error) {
      assert.include(error.message, "Caller is not the owner", "错误信息应该包含'调用者不是所有者'");
    }
  });

  // 测试不能向零地址造币
  it("应该拒绝向零地址造币", async () => {
    const mintAmount = 1000;
    
    try {
      // 尝试向零地址造币
      await leepCoinInstance.mint("0x0000000000000000000000000000000000000000", mintAmount, { from: owner });
      assert.fail("应该抛出错误");
    } catch (error) {
      assert.include(error.message, "Cannot mint to zero address", "错误信息应该包含'不能向零地址造币'");
    }
  });

  // 测试多次造币功能
  it("应该支持多次造币", async () => {
    const firstMintAmount = 1000;
    const secondMintAmount = 2000;
    const totalMintAmount = firstMintAmount + secondMintAmount;
    
    // 第一次造币
    await leepCoinInstance.mint(receiver, firstMintAmount, { from: owner });
    
    // 第二次造币
    await leepCoinInstance.mint(receiver, secondMintAmount, { from: owner });
    
    // 验证总供应量增加
    const initialTotalSupply = web3.utils.toBN(toWei(initialSupply));
    const newTotalSupply = await leepCoinInstance.totalSupply();
    const expectedTotalSupply = initialTotalSupply.add(web3.utils.toBN(toWei(totalMintAmount)));
    assert.equal(newTotalSupply.toString(), expectedTotalSupply.toString(), "总供应量应该增加两次造币金额之和");
    
    // 验证接收者余额增加
    const receiverBalance = await leepCoinInstance.balanceOf(receiver);
    assert.equal(receiverBalance.toString(), toWei(totalMintAmount), "接收者余额应该增加两次造币金额之和");
  });
});