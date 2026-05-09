// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { PragueConnectResolver } from "../src/PragueConnectResolver.sol";

contract PragueConnectResolverTest is Test {
    PragueConnectResolver internal resolver;
    uint256 internal signerPk = 0xA11CE;
    address internal signer;
    address[] internal signers;

    function setUp() public {
        signer = vm.addr(signerPk);
        signers = new address[](1);
        signers[0] = signer;
        resolver = new PragueConnectResolver("https://example.com/{sender}/{data}.json", signers);
    }

    function test_Constructor_SetsState() public view {
        assertTrue(resolver.signers(signer));
        assertEq(resolver.url(), "https://example.com/{sender}/{data}.json");
        assertEq(resolver.owner(), address(this));
    }

    function test_SupportsInterface_ExtendedResolver() public view {
        assertTrue(resolver.supportsInterface(0x9061b923));
        assertTrue(resolver.supportsInterface(0x01ffc9a7));
        assertFalse(resolver.supportsInterface(0xdeadbeef));
    }

    function test_Resolve_RevertsWithOffchainLookup() public {
        // DNS-encoded "lucia.pragueconnect.eth"
        bytes memory name = hex"056c75636961" hex"0d70726167756563636f6e6e656374" hex"03657468" hex"00";
        bytes memory data = abi.encodeWithSelector(bytes4(0x3b3b57de), bytes32(uint256(1))); // addr(bytes32)
        vm.expectRevert();
        resolver.resolve(name, data);
    }

    function test_ResolveWithProof_ValidSignature() public {
        // resolveWithProof decodes extraData = abi.encode(innerRequest, sender)
        // and signs over innerRequest.
        bytes memory innerRequest = bytes("inner-callData");
        bytes memory extraData = abi.encode(innerRequest, address(resolver));
        bytes memory result = abi.encode(address(0xBeef));
        uint64 expires = uint64(block.timestamp + 600);
        bytes32 digest = resolver.makeSignatureHash(address(resolver), expires, innerRequest, result);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        bytes memory response = abi.encode(result, expires, sig);
        bytes memory got = resolver.resolveWithProof(response, extraData);
        assertEq(keccak256(got), keccak256(result));
    }

    function test_ResolveWithProof_RevertsOnExpired() public {
        bytes memory innerRequest = bytes("");
        bytes memory extraData = abi.encode(innerRequest, address(resolver));
        bytes memory result = abi.encode(uint256(7));
        uint64 expires = uint64(block.timestamp - 1);
        bytes32 digest = resolver.makeSignatureHash(address(resolver), expires, innerRequest, result);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory response = abi.encode(result, expires, abi.encodePacked(r, s, v));
        vm.expectRevert(PragueConnectResolver.SignatureExpired.selector);
        resolver.resolveWithProof(response, extraData);
    }

    function test_ResolveWithProof_RevertsOnUnknownSigner() public {
        uint256 evilPk = 0xBEEF;
        bytes memory innerRequest = bytes("");
        bytes memory extraData = abi.encode(innerRequest, address(resolver));
        bytes memory result = abi.encode(uint256(7));
        uint64 expires = uint64(block.timestamp + 600);
        bytes32 digest = resolver.makeSignatureHash(address(resolver), expires, innerRequest, result);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(evilPk, digest);
        bytes memory response = abi.encode(result, expires, abi.encodePacked(r, s, v));
        vm.expectRevert(PragueConnectResolver.InvalidSignature.selector);
        resolver.resolveWithProof(response, extraData);
    }

    function test_AddRemoveSigner_OwnerOnly() public {
        address newSigner = makeAddr("new-signer");
        resolver.addSigner(newSigner);
        assertTrue(resolver.signers(newSigner));
        resolver.removeSigner(newSigner);
        assertFalse(resolver.signers(newSigner));

        vm.prank(makeAddr("not-owner"));
        vm.expectRevert(PragueConnectResolver.NotOwner.selector);
        resolver.addSigner(newSigner);
    }

    function test_SetUrl_OwnerOnly() public {
        resolver.setUrl("https://other.example/{sender}/{data}.json");
        assertEq(resolver.url(), "https://other.example/{sender}/{data}.json");

        vm.prank(makeAddr("not-owner"));
        vm.expectRevert(PragueConnectResolver.NotOwner.selector);
        resolver.setUrl("nope");
    }
}
