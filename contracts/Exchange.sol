// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "truffle/console.sol";
import "./Leepcoin.sol";
contract Exchange {
    using SafeMath for uint256;
    // 收费账户地址
    address public feeAccount;
    uint256 public feePercent; // 费率
    address constant ETHER = address(0);
    
    struct _Order {
        uint256 id; // 订单唯一标识符
        address user; // 订单创建者地址
        address tokenGet; // 获取的代币地址
        uint256 amountGet; // 获取的代币数量
        address tokenGive; // 支付的代币地址
        uint256 amountGive; // 支付的代币数量
        uint256 timestamp; // 订单创建时间戳
        uint256 status; // 订单状态：0=正常，1=已取消，2=已完成
    }

    mapping(uint256 => _Order) public orders;
    uint256 public orderCount;

    event Deposit(address token, address user, uint256 value, uint256 balance);
    event Withdraw(address token, address user, uint256 value, uint256 balance);
    event Order(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
    event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
    event Trade(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address userFill, uint256 timestamp);
    // 币种地址 用户 多少前
    mapping(address => mapping(address => uint256)) public tokens;
    constructor (address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // 存以太币
    function depositEther () public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    // 存其他的币种
    /**
     * @dev 允许用户将外部ERC20代币存入交易所
     * @param _token 代币合约地址 - 表示要存入的代币类型
     * @param _amount 存入金额
     */
    function depositToken (address _token, uint256 _amount) public {
        // 确保存入的不是以太币（以太币有专门的存入函数）
        require(_token!=ETHER);
        // 使用_token地址实例化LeepCoin合约并调用transferFrom，将用户的代币转账到交易所合约地址
        require(LeepCoin(_token).transferFrom(msg.sender, address(this), _amount));
        // 使用_token作为第一个键，更新用户在交易所中的代币余额
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // 触发deposit事件，记录存入的代币类型、用户地址、金额和更新后的余额
        emit Deposit(_token, msg.sender,_amount, tokens[_token][msg.sender]);
    }

    // 提取以太币
    function withdrawEhter(uint256 _amount) public {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        payable(msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender,_amount, tokens[ETHER][msg.sender]);
    }
    
    // 提取其他币
    function withdrawOther(address _token, uint256 _amount) public {
        // 确保存入的不是以太币（以太币有专门的存入函数）
        require(_token!=ETHER);
        // 使用_token地址实例化LeepCoin合约并调用transferFrom，将交易所合约地址提取用户
        require(LeepCoin(_token).transfer(msg.sender, _amount));
        // 使用_token作为第一个键，更新用户在交易所中的代币余额
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        // 触发Withdraw事件，记录存入的代币类型、用户地址、金额和更新后的余额
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    // 查询余额
    function balanceOf(address _token, address _user) public view returns (uint256){
        return tokens[_token][_user];
    }

    // 创建订单
    function makeOrder(
        address tokenGet, 
        uint256 amountGet, 
        address tokenGive, 
        uint256 amountGive
    ) public {
        orderCount = orderCount.add(1);
        orders[orderCount] = _Order(
            orderCount, 
            msg.sender, 
            tokenGet, 
            amountGet,
            tokenGive,
            amountGive,
            block.timestamp,
            0 // 初始状态为正常订单
        );
        emit Order(orderCount, msg.sender, tokenGet, amountGet, tokenGive, amountGive, block.timestamp);
        // 发出订单
    }
    // 删除订单
    function cancelOrder(uint256 _id) public {
        // 获取要删除的订单
        _Order storage _order = orders[_id];
        
        // 验证订单存在（订单ID应该大于0且用户地址不为0）
        require(_order.id == _id, unicode"订单不存在");
        
        // 验证只有订单创建者才能删除订单
        require(_order.user == msg.sender, unicode"只有订单创建者才能删除订单");
        
        // 设置订单状态为已取消
        orders[_id].status = 1;
        
        // 触发Cancel事件，记录订单删除操作
        emit Cancel(_id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }
    
    // 完成订单
    function fillOrder(uint256 _id) public {
        // 验证订单存在且状态为正常
        require(orders[_id].id == _id && orders[_id].status == 0, unicode"订单不存在或状态异常");
        
        // 获取订单信息
        _Order storage _order = orders[_id];
        
        // 执行交易
        _trade(
            _order.id,
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );
        
        // 设置订单状态为已完成
        orders[_id].status = 2;
    }
    
    // 执行交易的内部函数
    function _trade(
        uint256 _orderId,
        address _user,
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) internal {
        // 计算交易费用
        uint256 feeAmount = _amountGive.mul(feePercent).div(100);
        
        // 从填充订单的用户账户中扣除支付的代币（包括手续费）
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].sub(_amountGive.add(feeAmount));
        
        // 将支付的代币转入订单创建者的账户
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].add(_amountGive);
        
        // 将手续费转入收费账户
        tokens[_tokenGive][feeAccount] = tokens[_tokenGive][feeAccount].add(feeAmount);
        
        // 从订单创建者的账户中扣除获取的代币
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].sub(_amountGet);
        
        // 将获取的代币转入填充订单的用户账户
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].add(_amountGet);
        
        // 触发Trade事件，记录交易信息
        emit Trade(
            _orderId,
            _user,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            msg.sender,
            block.timestamp
        );
    }
}