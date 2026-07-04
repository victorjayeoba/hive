// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {HiveMarket} from "../src/HiveMarket.sol";
import {Reputation} from "../src/Reputation.sol";

contract HiveMarketTest is Test {
    HiveMarket market;

    address requester = address(0xA1);
    address workerA = address(0xB1);
    address workerB = address(0xB2);

    bytes32 constant SPEC = keccak256("summarize this");
    bytes32 constant INPUT = keccak256("the input text");
    bytes32 constant RESULT = keccak256("the summary");

    function setUp() public {
        market = new HiveMarket();
        vm.deal(requester, 100 ether);
        vm.deal(workerA, 1 ether);
        vm.deal(workerB, 1 ether);
    }

    function _post(uint256 bounty) internal returns (uint256 id) {
        vm.prank(requester);
        id = market.postTask{value: bounty}(SPEC, INPUT, 4, 8);
    }

    // --- Happy path: post -> bid -> award -> submit -> accept ---

    function test_fullLifecycle() public {
        uint256 id = _post(1 ether);

        vm.prank(workerA);
        market.bid(id, 0.8 ether);
        vm.prank(workerB);
        market.bid(id, 0.5 ether); // lower bid wins

        vm.roll(block.number + 4);
        market.award(id);

        HiveMarket.Task memory t = market.getTask(id);
        assertEq(t.worker, workerB);
        assertEq(t.price, 0.5 ether);

        vm.prank(workerB);
        market.submit(id, RESULT);

        uint256 workerBefore = workerB.balance;
        uint256 reqBefore = requester.balance;

        vm.prank(requester);
        market.accept(id);

        // Worker paid the winning price; surplus refunded to requester.
        assertEq(workerB.balance, workerBefore + 0.5 ether);
        assertEq(requester.balance, reqBefore + 0.5 ether);

        Reputation.Record memory rep = market.reputation().get(workerB);
        assertEq(rep.completed, 1);
    }

    // --- INV-1: escrow accounting matches contract balance ---

    function test_inv1_escrowMatchesBalance() public {
        _post(1 ether);
        _post(2 ether);
        assertEq(market.escrowedTotal(), 3 ether);
        assertEq(address(market).balance, 3 ether);
    }

    // --- INV-2: a task settles at most once ---

    function test_inv2_doubleSettleReverts() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.prank(workerA);
        market.submit(id, RESULT);
        vm.prank(requester);
        market.accept(id);

        vm.prank(requester);
        vm.expectRevert(HiveMarket.NotSubmitted.selector);
        market.accept(id);
    }

    // --- INV-3: price never exceeds maxBounty; surplus returns to requester ---

    function test_inv3_bidAboveBountyReverts() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        vm.expectRevert(HiveMarket.BidTooHigh.selector);
        market.bid(id, 1.5 ether);
    }

    // --- INV-4: only winner submits; only requester accepts/rejects ---

    function test_inv4_nonWinnerCannotSubmit() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);

        vm.prank(workerB);
        vm.expectRevert(HiveMarket.NotWinner.selector);
        market.submit(id, RESULT);
    }

    function test_inv4_nonRequesterCannotAccept() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.prank(workerA);
        market.submit(id, RESULT);

        vm.prank(workerB);
        vm.expectRevert(HiveMarket.NotRequester.selector);
        market.accept(id);
    }

    // --- INV-5: award only valid after bidCloseBlock, and idempotent ---

    function test_inv5_awardBeforeCloseReverts() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.expectRevert(HiveMarket.NotAfterBidClose.selector);
        market.award(id);
    }

    function test_inv5_awardIsIdempotent() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.expectRevert(HiveMarket.AlreadyAwarded.selector);
        market.award(id);
    }

    // --- INV-6: timeout refunds requester, cannot be triggered early ---

    function test_inv6_timeoutRefundsRequester() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);

        uint256 reqBefore = requester.balance;
        vm.roll(block.number + 9); // past deadline (bidClose + 8)
        market.timeoutSettle(id);

        assertEq(requester.balance, reqBefore + 1 ether);
        Reputation.Record memory rep = market.reputation().get(workerA);
        assertEq(rep.timedOut, 1);
    }

    function test_inv6_timeoutBeforeDeadlineReverts() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.expectRevert(HiveMarket.BeforeDeadline.selector);
        market.timeoutSettle(id);
    }

    // --- Failure paths ---

    function test_noBids_awardRefunds() public {
        uint256 id = _post(1 ether);
        uint256 reqBefore = requester.balance;
        vm.roll(block.number + 4);
        market.award(id);
        assertEq(requester.balance, reqBefore + 1 ether);
        assertEq(market.escrowedTotal(), 0);
    }

    function test_reject_refundsAndDisputes() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.prank(workerA);
        market.submit(id, RESULT);

        uint256 reqBefore = requester.balance;
        vm.prank(requester);
        market.reject(id);
        assertEq(requester.balance, reqBefore + 1 ether);
        Reputation.Record memory rep = market.reputation().get(workerA);
        assertEq(rep.disputed, 1);
    }

    function test_bidAfterCloseReverts() public {
        uint256 id = _post(1 ether);
        vm.roll(block.number + 4);
        vm.prank(workerA);
        vm.expectRevert(HiveMarket.NotBidding.selector);
        market.bid(id, 0.5 ether);
    }

    function test_submitPastDeadlineReverts() public {
        uint256 id = _post(1 ether);
        vm.prank(workerA);
        market.bid(id, 0.5 ether);
        vm.roll(block.number + 4);
        market.award(id);
        vm.roll(block.number + 9);
        vm.prank(workerA);
        vm.expectRevert(HiveMarket.PastDeadline.selector);
        market.submit(id, RESULT);
    }

    function test_reputationOnlyMarketCanWrite() public {
        Reputation rep = market.reputation();
        vm.expectRevert(Reputation.OnlyMarket.selector);
        rep.recordCompleted(workerA);
    }

    // --- Fuzz: surplus refund is always maxBounty - price ---

    function testFuzz_surplusRefund(uint256 bounty, uint256 price) public {
        bounty = bound(bounty, 1, 50 ether);
        price = bound(price, 0, bounty);
        vm.deal(requester, bounty);

        vm.prank(requester);
        uint256 id = market.postTask{value: bounty}(SPEC, INPUT, 4, 8);
        vm.prank(workerA);
        market.bid(id, price);
        vm.roll(block.number + 4);
        market.award(id);
        vm.prank(workerA);
        market.submit(id, RESULT);

        uint256 reqBefore = requester.balance;
        uint256 workerBefore = workerA.balance;
        vm.prank(requester);
        market.accept(id);

        assertEq(workerA.balance, workerBefore + price);
        assertEq(requester.balance, reqBefore + (bounty - price));
        assertEq(address(market).balance, 0);
    }
}
