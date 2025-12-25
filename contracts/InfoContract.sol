// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract InfoContract {
    string name;
    uint256 age;

    event Instructor(string name, uint256 age);

    function setInfo(string memory _name, uint256 _age) public {
        name = _name;
        age = _age;
        emit Instructor(name, age);
    }

    function sayHi() public pure returns (string memory) {
        return "Hello World!";
    }

    function getInfo() public view returns (string memory, uint256) {
        return (name, age);
    }
}
