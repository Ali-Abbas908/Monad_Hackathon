// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSD.sol";
import "../src/GroupPool.sol";

contract GroupPoolTest is Test {
    MockUSD public token;
    GroupPool public pool;

    address public alice = address(0x101);
    address public bob = address(0x102);
    address public carol = address(0x103);
    address public dave = address(0x104);
    address public merchant = address(0x999);

    function setUp() public {
        token = new MockUSD();
        pool = new GroupPool(token);

        // Fund accounts
        vm.prank(alice);
        token.faucet(); // 1,000 mUSD

        vm.prank(bob);
        token.faucet();

        vm.prank(carol);
        token.faucet();

        vm.prank(dave);
        token.faucet();

        // Approvals
        vm.prank(alice);
        token.approve(address(pool), type(uint256).max);

        vm.prank(bob);
        token.approve(address(pool), type(uint256).max);

        vm.prank(carol);
        token.approve(address(pool), type(uint256).max);

        vm.prank(dave);
        token.approve(address(pool), type(uint256).max);
    }

    // ==========================================
    // Phase 3: Core Groups, Membership & Saving
    // ==========================================

    function test_CreateGroupAndJoin() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Goa Trip",
            mode: IGroupPool.Mode.Approval,
            goal: 500 * 1e6,
            contributionAmount: 50 * 1e6,
            period: 7 days,
            openSpendCap: 0,
            approvalBps: 5001,
            approvalWindow: 1 days
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 100 * 1e6);

        assertEq(groupId, 1);
        assertEq(pool.groupCount(), 1);
        assertTrue(pool.isMember(groupId, alice));
        assertFalse(pool.isMember(groupId, bob));

        address[] memory mems = pool.members(groupId);
        assertEq(mems.length, 1);
        assertEq(mems[0], alice);

        IGroupPool.Group memory g = pool.getGroup(groupId);
        assertEq(g.config.name, "Goa Trip");
        assertEq(g.memberCount, 1);
        assertEq(uint8(g.status), uint8(IGroupPool.Status.Saving));

        // Bob joins
        vm.prank(bob);
        pool.join(groupId, 100 * 1e6);

        assertTrue(pool.isMember(groupId, bob));
        assertEq(pool.getGroup(groupId).memberCount, 2);

        // Bob cannot join again
        vm.expectRevert(IGroupPool.AlreadyMember.selector);
        vm.prank(bob);
        pool.join(groupId, 100 * 1e6);

        // Update maxPerAction
        vm.prank(bob);
        pool.setMaxPerAction(groupId, 200 * 1e6);
        (, uint256 maxPerAction,) = pool.memberInfo(groupId, bob);
        assertEq(maxPerAction, 200 * 1e6);
    }

    function test_ContributeAndGoalReached() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Goa Trip",
            mode: IGroupPool.Mode.Approval,
            goal: 200 * 1e6,
            contributionAmount: 50 * 1e6,
            period: 7 days,
            openSpendCap: 0,
            approvalBps: 5001,
            approvalWindow: 1 days
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 100 * 1e6);

        // Alice contributes 150
        vm.prank(alice);
        pool.contribute(groupId, 150 * 1e6);

        IGroupPool.Group memory g = pool.getGroup(groupId);
        assertEq(g.balance, 150 * 1e6);
        assertEq(uint8(g.status), uint8(IGroupPool.Status.Saving));

        // Alice contributes another 50 -> reaches 200 goal
        vm.prank(alice);
        pool.contribute(groupId, 50 * 1e6);

        g = pool.getGroup(groupId);
        assertEq(g.balance, 200 * 1e6);
        assertEq(uint8(g.status), uint8(IGroupPool.Status.Ready));
    }

    function test_PullWithPeriodAndCapChecks() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Weekly Savings",
            mode: IGroupPool.Mode.Open,
            goal: 500 * 1e6,
            contributionAmount: 50 * 1e6,
            period: 7 days,
            openSpendCap: 0,
            approvalBps: 0,
            approvalWindow: 0
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 60 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 30 * 1e6); // Cap is 30, less than contributionAmount 50

        // Pull Bob fails due to CapExceeded
        vm.expectRevert(IGroupPool.CapExceeded.selector);
        pool.pull(groupId, bob);

        // Bob raises cap
        vm.prank(bob);
        pool.setMaxPerAction(groupId, 100 * 1e6);

        // First pull succeeds
        pool.pull(groupId, bob);
        assertEq(pool.getGroup(groupId).balance, 50 * 1e6);

        // Immediate second pull reverts with TooEarly
        vm.expectRevert(abi.encodeWithSelector(IGroupPool.TooEarly.selector, block.timestamp + 7 days));
        pool.pull(groupId, bob);

        // Warp 6 days -> still too early
        vm.warp(block.timestamp + 6 days);
        vm.expectRevert(abi.encodeWithSelector(IGroupPool.TooEarly.selector, block.timestamp + 1 days));
        pool.pull(groupId, bob);

        // Warp 1 more day -> succeeds
        vm.warp(block.timestamp + 1 days);
        pool.pull(groupId, bob);
        assertEq(pool.getGroup(groupId).balance, 100 * 1e6);
    }

    function test_LeaveProRataRefundAfterSpend() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Shared Pool",
            mode: IGroupPool.Mode.Open,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 0,
            approvalWindow: 0
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        // Alice contributes 100, Bob contributes 100 -> pool balance = 200, totalContributed = 200
        vm.prank(alice);
        pool.contribute(groupId, 100 * 1e6);
        vm.prank(bob);
        pool.contribute(groupId, 100 * 1e6);

        // Group spends 80 -> pool balance = 120
        vm.prank(alice);
        pool.spend(groupId, merchant, 80 * 1e6, "Food");

        assertEq(pool.getGroup(groupId).balance, 120 * 1e6);
        assertEq(token.balanceOf(merchant), 80 * 1e6);

        // Bob leaves: Bob contributed 100 of 200 total (50%), so refund should be 50% of 120 = 60
        uint256 bobBalBefore = token.balanceOf(bob);
        vm.prank(bob);
        pool.leave(groupId);

        uint256 bobBalAfter = token.balanceOf(bob);
        assertEq(bobBalAfter - bobBalBefore, 60 * 1e6);

        // Bob is no longer a member
        assertFalse(pool.isMember(groupId, bob));
        assertEq(pool.getGroup(groupId).memberCount, 1);
        assertEq(pool.getGroup(groupId).balance, 60 * 1e6);
    }

    // ==========================================
    // Phase 4: Spending Modes
    // ==========================================

    function test_OpenModeSpendCap() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Open Pool",
            mode: IGroupPool.Mode.Open,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 50 * 1e6, // Cap: 50
            approvalBps: 0,
            approvalWindow: 0
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(alice);
        pool.contribute(groupId, 200 * 1e6);

        // Under cap
        vm.prank(alice);
        pool.spend(groupId, merchant, 30 * 1e6, "Under cap");
        assertEq(token.balanceOf(merchant), 30 * 1e6);

        // At cap
        vm.prank(alice);
        pool.spend(groupId, merchant, 50 * 1e6, "At cap");
        assertEq(token.balanceOf(merchant), 80 * 1e6);

        // Over cap reverts
        vm.expectRevert(IGroupPool.CapExceeded.selector);
        vm.prank(alice);
        pool.spend(groupId, merchant, 51 * 1e6, "Over cap");
    }

    function test_DelegateModeVoteAndSpend() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Delegate Pool",
            mode: IGroupPool.Mode.Delegate,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 0,
            approvalWindow: 0
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        vm.prank(carol);
        pool.join(groupId, 1000 * 1e6);

        // Initial delegate is creator (Alice)
        assertEq(pool.getGroup(groupId).delegate, alice);

        vm.prank(alice);
        pool.contribute(groupId, 300 * 1e6);

        // Bob cannot spend (reverts NotDelegate)
        vm.expectRevert(IGroupPool.NotDelegate.selector);
        vm.prank(bob);
        pool.spend(groupId, merchant, 50 * 1e6, "Bob try spend");

        // Alice spends successfully
        vm.prank(alice);
        pool.spend(groupId, merchant, 50 * 1e6, "Alice spend");
        assertEq(token.balanceOf(merchant), 50 * 1e6);

        // Vote to replace delegate: Bob votes for Carol (1/3, not majority)
        vm.prank(bob);
        pool.voteDelegate(groupId, carol);
        assertEq(pool.getGroup(groupId).delegate, alice);

        // Dave joins (total 4 members) -> wait, Carol votes for Carol (2/3 > 50%!)
        vm.prank(carol);
        pool.voteDelegate(groupId, carol);

        // 2 of 3 votes > 50% -> Carol becomes new delegate!
        assertEq(pool.getGroup(groupId).delegate, carol);

        // Now Carol can spend
        vm.prank(carol);
        pool.spend(groupId, merchant, 50 * 1e6, "Carol spend");
        assertEq(token.balanceOf(merchant), 100 * 1e6);
    }

    function test_ApprovalModeThresholdAndExpiry() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Approval Pool",
            mode: IGroupPool.Mode.Approval,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 5001, // > 50%
            approvalWindow: 1 days
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        vm.prank(carol);
        pool.join(groupId, 1000 * 1e6); // 3 members total

        vm.prank(alice);
        pool.contribute(groupId, 300 * 1e6);

        // Direct spend reverts WrongMode
        vm.expectRevert(IGroupPool.WrongMode.selector);
        vm.prank(alice);
        pool.spend(groupId, merchant, 50 * 1e6, "Direct");

        // Alice proposes 100 mUSD (proposer has 1 auto-approval; 1/3 = 3333 bps < 5001 bps)
        vm.prank(alice);
        uint256 proposalId = pool.propose(groupId, merchant, 100 * 1e6, "Hotel reservation");

        IGroupPool.Proposal memory p = pool.getProposal(groupId, proposalId);
        assertEq(p.approvals, 1);
        assertFalse(p.executed);

        // Alice tries to approve again -> AlreadyApproved
        vm.expectRevert(IGroupPool.AlreadyApproved.selector);
        vm.prank(alice);
        pool.approve(groupId, proposalId);

        // Bob approves (2 of 3 = 6666 bps >= 5001 bps -> executes immediately!)
        vm.prank(bob);
        pool.approve(groupId, proposalId);

        p = pool.getProposal(groupId, proposalId);
        assertTrue(p.executed);
        assertEq(token.balanceOf(merchant), 100 * 1e6);
        assertEq(pool.getGroup(groupId).balance, 200 * 1e6);

        // Carol tries to approve already executed -> AlreadyExecuted
        vm.expectRevert(IGroupPool.AlreadyExecuted.selector);
        vm.prank(carol);
        pool.approve(groupId, proposalId);

        // Test proposal expiry
        vm.prank(alice);
        uint256 proposalId2 = pool.propose(groupId, merchant, 50 * 1e6, "Dinner");

        vm.warp(block.timestamp + 1 days + 1); // Expire proposal
        vm.expectRevert(IGroupPool.ProposalExpired.selector);
        vm.prank(bob);
        pool.approve(groupId, proposalId2);
    }

    // ====================================================
    // Phase 5: Pay For The Group & Split Bill / IOU Ledger
    // ====================================================

    function test_PayForGroupEqualSplitAndIndivisibleAmount() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Dinner Group",
            mode: IGroupPool.Mode.Approval,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 5001,
            approvalWindow: 1 days
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        vm.prank(carol);
        pool.join(groupId, 1000 * 1e6); // 3 members

        // Total amount 100 mUSD = 100_000_000 micro-units
        // 100_000_000 / 3 = 33_333_333 share each. Remainder = 1.
        // Alice pays 100_000_000. Bob debited 33_333_333 to Alice, Carol debited 33_333_333 to Alice.
        // Total reimbursed to Alice = 66_666_666.
        // Net spent by Alice = 100_000_000 - 66_666_666 = 33_333_334 (her share 33_333_333 + 1 remainder)!
        uint256 aliceBalBefore = token.balanceOf(alice);
        uint256 bobBalBefore = token.balanceOf(bob);
        uint256 carolBalBefore = token.balanceOf(carol);

        vm.prank(alice);
        uint256 paymentId = pool.payForGroup(groupId, merchant, 100 * 1e6, "Group Dinner");

        assertEq(paymentId, 1);
        assertEq(token.balanceOf(merchant), 100 * 1e6);

        assertEq(token.balanceOf(bob), bobBalBefore - 33_333_333);
        assertEq(token.balanceOf(carol), carolBalBefore - 33_333_333);
        assertEq(token.balanceOf(alice), aliceBalBefore - 33_333_334);
    }

    function test_PayForGroupShortfallCreatesIOU() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Dinner Group",
            mode: IGroupPool.Mode.Approval,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 5001,
            approvalWindow: 1 days
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        vm.prank(carol);
        pool.join(groupId, 10 * 1e6); // Carol has low maxPerAction (10 mUSD)

        // Total 90 mUSD: share is 30 mUSD each.
        // Bob covers 30 mUSD. Carol's maxPerAction is 10 mUSD (< 30 mUSD), so Carol has shortfall!
        vm.prank(alice);
        pool.payForGroup(groupId, merchant, 90 * 1e6, "Dinner");

        // Carol owes Alice 30 mUSD as IOU
        assertEq(pool.owed(groupId, carol, alice), 30 * 1e6);
        assertEq(pool.owed(groupId, bob, alice), 0);
    }

    function test_AddExpenseSettleDebtAndOffset() public {
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Split Bill Group",
            mode: IGroupPool.Mode.Open,
            goal: 0,
            contributionAmount: 0,
            period: 0,
            openSpendCap: 0,
            approvalBps: 0,
            approvalWindow: 0
        });

        vm.prank(alice);
        uint256 groupId = pool.createGroup(cfg, 1000 * 1e6);

        vm.prank(bob);
        pool.join(groupId, 1000 * 1e6);

        vm.prank(carol);
        pool.join(groupId, 1000 * 1e6);

        // Alice paid 60 outside app for Alice and Bob
        address[] memory participants = new address[](1);
        participants[0] = bob;

        vm.prank(alice);
        pool.addExpense(groupId, 60 * 1e6, participants, "Taxi");

        // Total split count = 2 (Alice and Bob). Bob owes Alice 30.
        assertEq(pool.owed(groupId, bob, alice), 30 * 1e6);

        // Partial settle: Bob pays 10 to Alice
        uint256 aliceBalBefore = token.balanceOf(alice);
        vm.prank(bob);
        pool.settleDebt(groupId, alice, 10 * 1e6);

        assertEq(pool.owed(groupId, bob, alice), 20 * 1e6);
        assertEq(token.balanceOf(alice), aliceBalBefore + 10 * 1e6);

        // Bob paid 40 outside app for Bob and Alice
        address[] memory bobParts = new address[](1);
        bobParts[0] = alice;

        vm.prank(bob);
        pool.addExpense(groupId, 40 * 1e6, bobParts, "Coffee");

        // Alice owes Bob 20. Bob owes Alice 20.
        assertEq(pool.owed(groupId, alice, bob), 20 * 1e6);
        assertEq(pool.owed(groupId, bob, alice), 20 * 1e6);

        // Offset debts
        pool.offset(groupId, alice, bob);

        assertEq(pool.owed(groupId, alice, bob), 0);
        assertEq(pool.owed(groupId, bob, alice), 0);
    }
}
