// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { PragueConnectResolver } from "../src/PragueConnectResolver.sol";

/// @notice Deploys PragueConnectResolver on Sepolia.
///         Env vars:
///           DEPLOYER_KEY         — deployer private key
///           RESOLVER_GATEWAY_URL — e.g. https://pragueconnect-azure.vercel.app/api/ccip/{sender}/{data}.json
///           RESOLVER_SIGNER      — address that the gateway will sign with
contract DeployResolver is Script {
    function run() external returns (PragueConnectResolver resolver) {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        string memory gatewayUrl = vm.envString("RESOLVER_GATEWAY_URL");
        address signer = vm.envAddress("RESOLVER_SIGNER");

        address[] memory signers = new address[](1);
        signers[0] = signer;

        vm.startBroadcast(pk);
        resolver = new PragueConnectResolver(gatewayUrl, signers);
        vm.stopBroadcast();
    }
}
