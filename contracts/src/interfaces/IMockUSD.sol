// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Mock stablecoin interface for testing Group Pay
interface IMockUSD is IERC20 {
    /// @notice Mints 1,000 mUSD to the caller. Once per hour per address.
    function faucet() external;

    error FaucetCooldown(uint256 availableAt);
}
