// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;
import "./LeepCoin.sol";
contract Exchange {
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
    
    mapping(address => mapping(address => uint256)) public tokens; 
    
    constructor (address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // 存以太币
    function depositEther () public payable {
        tokens[ETHER][msg.sender] += msg.value;
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    // 存其他的币种
    function depositToken (address _token, uint256 _amount) public {
        require(_token!=ETHER);
        require(LeepCoin(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] += _amount;
        emit Deposit(_token, msg.sender,_amount, tokens[_token][msg.sender]);
    }

    // 提取以太币
    function withdrawEhter(uint256 _amount) public {
        tokens[ETHER][msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender,_amount, tokens[ETHER][msg.sender]);
    }

    // 提取其他币
    function withdrawOther(address _token, uint256 _amount) public {
        require(_token!=ETHER);
        require(LeepCoin(_token).transfer(msg.sender, _amount));  
        tokens[_token][msg.sender] -= _amount;
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
        orderCount += 1;
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
    }
    
    // 删除订单
    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id];
        require(_order.id == _id, unicode"订单不存在");
        require(_order.user == msg.sender, unicode"只有订单创建者才能删除订单");
        orders[_id].status = 1;
        emit Cancel(_id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);     
    }

    // 完成订单
    function fillOrder(uint256 _id) public {
        require(orders[_id].id == _id && orders[_id].status == 0, unicode"订单不存在或状态异常");
        _Order storage _order = orders[_id];
        _trade(
            _order.id,
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );
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
        uint256 feeAmount = _amountGive * feePercent / 100;
        tokens[_tokenGive][msg.sender] -= (_amountGive + feeAmount);
        tokens[_tokenGive][_user] += _amountGive;
        tokens[_tokenGive][feeAccount] += feeAmount;
        tokens[_tokenGet][_user] -= _amountGet;
        tokens[_tokenGet][msg.sender] += _amountGet;
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
