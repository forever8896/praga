// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { PragueConnectEscrowV2 } from "../src/PragueConnectEscrowV2.sol";

/// @notice Deploys PragueConnectEscrowV2 on Base / Base Sepolia. The ScopeLift
///         ERC-5564 announcer is canonical at the same address on every
///         supported chain, so the constructor arg is hard-coded.
contract DeployEscrowV2 is Script {
    address constant ERC5564_ANNOUNCER = 0x55649E01B5Df198D18D95b5cc5051630cfD45564;

    function run() external returns (PragueConnectEscrowV2 escrow) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        escrow = new PragueConnectEscrowV2(ERC5564_ANNOUNCER);
        vm.stopBroadcast();
    }
}
