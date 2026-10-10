// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockUSD.sol";

contract MockUSDTest is Test {
    MockUSD public token;
    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        token = new MockUSD();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Mock USD");
        assertEq(token.symbol(), "mUSD");
        assertEq(token.decimals(), 6);
    }

    function test_FaucetSuccess() public {
        vm.prank(alice);
        token.faucet();

        assertEq(token.balanceOf(alice), 1_000 * 1e6);
        assertEq(token.lastFaucetAt(alice), block.timestamp);
    }

    function test_FaucetCooldownRevert() public {
        vm.prank(alice);
        token.faucet();

        uint256 nextAvailable = block.timestamp + 1 hours;
        vm.expectRevert(abi.encodeWithSelector(IMockUSD.FaucetCooldown.selector, nextAvailable));
        vm.prank(alice);
        token.faucet();
    }

    function test_FaucetAfterCooldown() public {
        vm.prank(alice);
        token.faucet();

        vm.warp(block.timestamp + 1 hours);
        vm.prank(alice);
        token.faucet();

        assertEq(token.balanceOf(alice), 2_000 * 1e6);
    }

    function test_MultipleUsersFaucet() public {
        vm.prank(alice);
        token.faucet();

        vm.prank(bob);
        token.faucet();

        assertEq(token.balanceOf(alice), 1_000 * 1e6);
        assertEq(token.balanceOf(bob), 1_000 * 1e6);
    }
}
