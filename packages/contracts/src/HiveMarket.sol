// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Reputation} from "./Reputation.sol";

/// @title HiveMarket
/// @notice On-chain labor market: requesters escrow a bounty and post a task;
///         workers compete in a reverse auction (bid the price down); the winner
///         submits a result hash and is paid from escrow on acceptance. All state
///         and money live here — nothing is trusted off-chain.
contract HiveMarket {
    enum Status { None, Posted, Bidding, Awarded, Submitted, Settled, Refunded }

    struct Task {
        uint256 id;
        address requester;
        bytes32 specHash;
        bytes32 inputHash;
        uint256 maxBounty;      // escrowed; upper bound on price
        uint64 bidCloseBlock;
        uint64 deadlineBlock;
        address worker;         // winning worker (0x0 until awarded)
        uint256 price;          // winning bid (<= maxBounty)
        bytes32 resultHash;     // 0x0 until submitted
        Status status;
    }

    Reputation public immutable reputation;

    uint256 public nextTaskId = 1;
    mapping(uint256 => Task) private tasks;

    // Best (lowest) live bid per task during the bidding window.
    mapping(uint256 => address) private bestBidder;
    mapping(uint256 => uint256) private bestPrice;

    // INV-1 accounting: total native currently held in escrow across open tasks.
    uint256 public escrowedTotal;

    // Minimal reentrancy guard (avoids an external dependency for one flag).
    uint256 private locked = 1;

    event TaskPosted(uint256 indexed id, address indexed requester, uint256 maxBounty, uint64 bidCloseBlock, uint64 deadlineBlock, bytes32 specHash);
    event BidPlaced(uint256 indexed id, address indexed worker, uint256 price);
    event Awarded(uint256 indexed id, address indexed worker, uint256 price);
    event Submitted(uint256 indexed id, address indexed worker, bytes32 resultHash);
    event Settled(uint256 indexed id, address indexed worker, uint256 paid, uint256 refunded);
    event Refunded(uint256 indexed id, address indexed requester, uint256 amount);

    error BadWindow();
    error NotBidding();
    error BidTooHigh();
    error NotAfterBidClose();
    error AlreadyAwarded();
    error NoBids();
    error NotAwarded();
    error NotWinner();
    error PastDeadline();
    error NotSubmitted();
    error NotRequester();
    error BeforeDeadline();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    constructor() {
        reputation = new Reputation(address(this));
    }

    // --- Requester side ---

    /// @notice Post a task, escrowing msg.value as the max bounty.
    function postTask(bytes32 specHash, bytes32 inputHash, uint64 bidWindowBlocks, uint64 workWindowBlocks)
        external
        payable
        returns (uint256 taskId)
    {
        if (msg.value == 0 || bidWindowBlocks == 0 || workWindowBlocks == 0) revert BadWindow();

        taskId = nextTaskId++;
        uint64 bidClose = uint64(block.number) + bidWindowBlocks;

        tasks[taskId] = Task({
            id: taskId,
            requester: msg.sender,
            specHash: specHash,
            inputHash: inputHash,
            maxBounty: msg.value,
            bidCloseBlock: bidClose,
            deadlineBlock: bidClose + workWindowBlocks,
            worker: address(0),
            price: 0,
            resultHash: bytes32(0),
            status: Status.Bidding
        });

        escrowedTotal += msg.value;
        emit TaskPosted(taskId, msg.sender, msg.value, bidClose, bidClose + workWindowBlocks, specHash);
    }

    /// @notice Requester confirms the result; pays the worker and refunds surplus.
    function accept(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        if (t.status != Status.Submitted) revert NotSubmitted();
        if (msg.sender != t.requester) revert NotRequester();

        t.status = Status.Settled;
        uint256 pay = t.price;
        uint256 refund = t.maxBounty - t.price;
        escrowedTotal -= t.maxBounty;

        reputation.recordCompleted(t.worker);
        _send(t.worker, pay);
        if (refund > 0) _send(t.requester, refund);

        emit Settled(taskId, t.worker, pay, refund);
    }

    /// @notice Requester rejects a submitted result; full refund, worker disputed.
    function reject(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        if (t.status != Status.Submitted) revert NotSubmitted();
        if (msg.sender != t.requester) revert NotRequester();

        t.status = Status.Refunded;
        uint256 amount = t.maxBounty;
        escrowedTotal -= amount;

        reputation.recordDisputed(t.worker);
        _send(t.requester, amount);

        emit Refunded(taskId, t.requester, amount);
    }

    // --- Worker side ---

    /// @notice Place a descending bid; must beat the current best and stay <= maxBounty.
    function bid(uint256 taskId, uint256 price) external {
        Task storage t = tasks[taskId];
        if (t.status != Status.Bidding || block.number >= t.bidCloseBlock) revert NotBidding();
        if (price > t.maxBounty) revert BidTooHigh();
        if (bestBidder[taskId] != address(0) && price >= bestPrice[taskId]) revert BidTooHigh();

        bestBidder[taskId] = msg.sender;
        bestPrice[taskId] = price;
        emit BidPlaced(taskId, msg.sender, price);
    }

    /// @notice Award to the best bidder after the bid window. Permissionless keeper
    ///         call so the market always makes progress; idempotent once awarded.
    function award(uint256 taskId) external {
        Task storage t = tasks[taskId];
        if (t.status == Status.Awarded) revert AlreadyAwarded();
        if (t.status != Status.Bidding) revert NotBidding();
        if (block.number < t.bidCloseBlock) revert NotAfterBidClose();

        if (bestBidder[taskId] == address(0)) {
            // No bids: refund requester and close the task.
            t.status = Status.Refunded;
            uint256 amount = t.maxBounty;
            escrowedTotal -= amount;
            _send(t.requester, amount);
            emit Refunded(taskId, t.requester, amount);
            return;
        }

        t.worker = bestBidder[taskId];
        t.price = bestPrice[taskId];
        t.status = Status.Awarded;
        emit Awarded(taskId, t.worker, t.price);
    }

    /// @notice Winning worker submits the result hash before the deadline.
    function submit(uint256 taskId, bytes32 resultHash) external {
        Task storage t = tasks[taskId];
        if (t.status != Status.Awarded) revert NotAwarded();
        if (msg.sender != t.worker) revert NotWinner();
        if (block.number > t.deadlineBlock) revert PastDeadline();

        t.resultHash = resultHash;
        t.status = Status.Submitted;
        emit Submitted(taskId, t.worker, resultHash);
    }

    // --- Anyone (keeper) ---

    /// @notice After the deadline with no submission, refund the requester and
    ///         mark the worker timed out.
    function timeoutSettle(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        if (t.status != Status.Awarded) revert NotAwarded();
        if (block.number <= t.deadlineBlock) revert BeforeDeadline();

        t.status = Status.Refunded;
        uint256 amount = t.maxBounty;
        escrowedTotal -= amount;

        reputation.recordTimedOut(t.worker);
        _send(t.requester, amount);

        emit Refunded(taskId, t.requester, amount);
    }

    // --- Views ---

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function bestBid(uint256 taskId) external view returns (address worker, uint256 price) {
        return (bestBidder[taskId], bestPrice[taskId]);
    }

    // --- Internal ---

    function _send(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
