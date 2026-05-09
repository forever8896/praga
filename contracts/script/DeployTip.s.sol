// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { PragueConnectTip } from "../src/PragueConnectTip.sol";

/// @notice Deploys PragueConnectTip on Base / Base Sepolia. ScopeLift's canonical announcer
///         is at the same address across supported chains.
contract DeployTip is Script {
    address constant ERC5564_ANNOUNCER = 0x55649E01B5Df198D18D95b5cc5051630cfD45564;

    function run() external returns (PragueConnectTip tip) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        tip = new PragueConnectTip(ERC5564_ANNOUNCER);
        vm.stopBroadcast();
    }
}
