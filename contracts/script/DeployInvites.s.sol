// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { PragueConnectInvites } from "../src/PragueConnectInvites.sol";

/// @notice Deploys PragueConnectInvites. Operator is the address that will
///         call claim() server-side — typically PC_FAUCET_KEY's address (the
///         same wallet used for the resolver writes and gas drips).
///         Env vars:
///           DEPLOYER_KEY     — deployer private key
///           INVITES_OPERATOR — operator address (e.g. 0x2908...9D10)
contract DeployInvites is Script {
    function run() external returns (PragueConnectInvites invites) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        address operator = vm.envAddress("INVITES_OPERATOR");

        vm.startBroadcast(pk);
        invites = new PragueConnectInvites(operator);
        vm.stopBroadcast();
    }
}
