pragma solidity >=0.4.21 <0.6.0;

/// @title TrustLend
/// @notice A revolving, uncollateralized P2P loan pool. A lender funds a queue of
///         borrowers; each repayment automatically forwards the pooled funds to the
///         next borrower in line, and once the queue is exhausted the balance returns
///         to the lender.
contract TrustLend {
    address payable public lender;
    address payable[] public borrowers;
    uint public amount;
    uint public index;

    event Lent(address indexed lender, uint amount, uint borrowerCount);
    event Repaid(uint indexed previousIndex, address indexed nextRecipient, uint amount);
    event BorrowerAdded(address indexed borrower);

    constructor() public {
        lender = msg.sender;
    }

    function lend(address payable[] memory initialBorrowers) public payable restricted {
        require(msg.value > .0001 ether);
        borrowers = initialBorrowers;
        amount = msg.value;
        index = 0;
        if (borrowers.length > index) {
            borrowers[index].transfer(address(this).balance);
        }
        emit Lent(lender, amount, borrowers.length);
    }

    function repay() public {
        if (address(this).balance > amount) {
            if (index <= borrowers.length - 1) {
                index++;
                borrowers[index].transfer(address(this).balance);
                emit Repaid(index - 1, borrowers[index], address(this).balance);
            } else {
                lender.transfer(address(this).balance);
                emit Repaid(index, lender, address(this).balance);
            }
        }
    }

    function addBorrower(address payable borrower) public restricted {
        borrowers.push(borrower);
        emit BorrowerAdded(borrower);
    }

    function getBorrowers() public view returns(address payable[] memory) {
        return borrowers;
    }

    function getAmount() public view returns(uint) {
        return amount;
    }

    function getIndex() public view returns(uint) {
        return index;
    }

    modifier restricted() {
        require(msg.sender == lender);
        _;
    }
}
