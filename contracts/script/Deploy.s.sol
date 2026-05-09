// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { PragueConnectEscrow } from "../src/PragueConnectEscrow.sol";

/// @notice Deploys PragueConnectEscrow on Base / Base Sepolia. The ScopeLift ERC-5564 announcer is
///         deployed canonically on every supported chain at the same address, so the
///         constructor arg is hard-coded.
contract Deploy is Script {
    address constant ERC5564_ANNOUNCER = 0x55649E01B5Df198D18D95b5cc5051630cfD45564;

    function run() external returns (PragueConnectEscrow escrow) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        escrow = new PragueConnectEscrow(ERC5564_ANNOUNCER);
        vm.stopBroadcast();
    }
}
