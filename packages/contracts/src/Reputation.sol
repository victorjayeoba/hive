// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title Reputation
/// @notice On-chain reputation counters per agent. Owned by HiveMarket, which
///         is the only writer; anyone can read. Kept as a standalone contract so
///         other BOT Chain apps can read agent reputation as a shared primitive.
contract Reputation {
    struct Record {
        uint64 completed;
        uint64 timedOut;
        uint64 disputed;
        uint64 lastActiveBlock;
    }

    address public immutable market;
    mapping(address => Record) private records;

    event ReputationUpdated(address indexed agent, uint64 completed, uint64 timedOut, uint64 disputed);

    error OnlyMarket();

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    constructor(address market_) {
        market = market_;
    }

    function get(address agent) external view returns (Record memory) {
        return records[agent];
    }

    function recordCompleted(address agent) external onlyMarket {
        Record storage r = records[agent];
        r.completed += 1;
        r.lastActiveBlock = uint64(block.number);
        emit ReputationUpdated(agent, r.completed, r.timedOut, r.disputed);
    }

    function recordTimedOut(address agent) external onlyMarket {
        Record storage r = records[agent];
        r.timedOut += 1;
        r.lastActiveBlock = uint64(block.number);
        emit ReputationUpdated(agent, r.completed, r.timedOut, r.disputed);
    }

    function recordDisputed(address agent) external onlyMarket {
        Record storage r = records[agent];
        r.disputed += 1;
        r.lastActiveBlock = uint64(block.number);
        emit ReputationUpdated(agent, r.completed, r.timedOut, r.disputed);
    }
}
