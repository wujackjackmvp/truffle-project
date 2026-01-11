// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
contract LeepCoin {
    // 代币基本信息
    string public name = "LeepCoin";
    string public symbol = "LEEP";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    // 余额映射
    mapping(address => uint256) public balanceOf;
    // 授权映射
    mapping(address => mapping(address => uint256)) public allowance;

    // 事件定义
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // 权限修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    // 构造函数，初始化代币总量并分配给合约创建者
    constructor(uint256 initialSupply) {
        totalSupply = initialSupply * 10 ** uint256(decimals);    
        balanceOf[msg.sender] = totalSupply;
        owner = msg.sender;
        emit Transfer(address(0), msg.sender, totalSupply);       
    }

    // 转账内部函数
    function _transfer(address from, address to, uint256 value) public {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    // 转账函数
    function transfer(address to, uint256 value) public returns (bool success) {
        require(to != address(0), "Cannot transfer to zero address");
        _transfer(msg.sender, to, value);
        return true;
    }

    // 授权函数
    function approve(address spender, uint256 value) public returns (bool success) {
        require(spender != address(0), "Cannot approve to zero address");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // 授权转账函数
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");

        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    // 造币函数，只能由所有者调用
    function mint(address to, uint256 amount) public onlyOwner returns (bool success) {
        require(to != address(0), "Cannot mint to zero address");
        uint256 mintAmount = amount * 10 ** uint256(decimals);
        totalSupply += mintAmount;
        balanceOf[to] += mintAmount;
        emit Transfer(address(0), to, mintAmount);
        return true;
    }
}
