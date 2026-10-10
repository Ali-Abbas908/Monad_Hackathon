// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockUSD.sol";
import "../src/GroupPool.sol";

contract InteractScript is Script {
    function run() external {
        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy contracts
        MockUSD token = new MockUSD();
        GroupPool pool = new GroupPool(token);

        // 2. Faucet & approve
        token.faucet();
        token.approve(address(pool), type(uint256).max);

        // 3. Create Group in Approval mode
        IGroupPool.GroupConfig memory cfg = IGroupPool.GroupConfig({
            name: "Goa Trip Demo",
            mode: IGroupPool.Mode.Approval,
            goal: 500 * 1e6,
            contributionAmount: 50 * 1e6,
            period: 1 days,
            openSpendCap: 0,
            approvalBps: 5001,
            approvalWindow: 1 days
        });

        uint256 groupId = pool.createGroup(cfg, 100 * 1e6);

        // 4. Contribute to pool
        pool.contribute(groupId, 100 * 1e6);

        // 5. Pay for group
        address payee = address(0x9999);
        pool.payForGroup(groupId, payee, 30 * 1e6, "Taxi");

        // 6. Propose spend from pool
        uint256 propId = pool.propose(groupId, payee, 20 * 1e6, "Lunch");

        // 7. Add outside expense
        address[] memory participants = new address[](1);
        participants[0] = deployer;
        pool.addExpense(groupId, 10 * 1e6, participants, "Coffee");

        vm.stopBroadcast();

        console.log("Interactive script run completed successfully.");
        console.log("Group ID created:", groupId);
        console.log("Proposal ID created:", propId);
    }
}
