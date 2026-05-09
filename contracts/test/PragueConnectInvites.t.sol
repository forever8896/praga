// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { PragueConnectInvites } from "../src/PragueConnectInvites.sol";

contract PragueConnectInvitesTest is Test {
    PragueConnectInvites internal invites;
    address internal operator = makeAddr("operator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal mallory = makeAddr("mallory");

    bytes32 internal constant CODE_HASH = keccak256("ABCDEFGH");

    function setUp() public {
        invites = new PragueConnectInvites(operator);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(mallory, 10 ether);
        vm.deal(operator, 10 ether);
    }

    function test_constructor_storesOperator() public view {
        assertEq(invites.operator(), operator);
    }

    function test_createFundedInvite_storesInvite() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        (address inviter, uint256 amount, bool claimed) = invites.invites(CODE_HASH);
        assertEq(inviter, alice);
        assertEq(amount, 0.001 ether);
        assertFalse(claimed);
        assertEq(address(invites).balance, 0.001 ether);
    }

    function test_createFundedInvite_revertsOnZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(PragueConnectInvites.NoFundsAttached.selector);
        invites.createFundedInvite{ value: 0 }(CODE_HASH);
    }

    function test_createFundedInvite_revertsIfExists() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        vm.prank(bob);
        vm.expectRevert(PragueConnectInvites.AlreadyExists.selector);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);
    }

    function test_claim_releasesFundsToRecipient() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        uint256 bobBefore = bob.balance;
        vm.prank(operator);
        invites.claim(CODE_HASH, payable(bob));

        assertEq(bob.balance, bobBefore + 0.001 ether);
        (, , bool claimed) = invites.invites(CODE_HASH);
        assertTrue(claimed);
        assertEq(address(invites).balance, 0);
    }

    function test_claim_revertsForNonOperator() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        vm.prank(mallory);
        vm.expectRevert(PragueConnectInvites.NotOperator.selector);
        invites.claim(CODE_HASH, payable(bob));
    }

    function test_claim_revertsIfAlreadyClaimed() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        vm.prank(operator);
        invites.claim(CODE_HASH, payable(bob));

        vm.prank(operator);
        vm.expectRevert(PragueConnectInvites.AlreadyClaimed.selector);
        invites.claim(CODE_HASH, payable(bob));
    }

    function test_claim_revertsIfNotFound() public {
        vm.prank(operator);
        vm.expectRevert(PragueConnectInvites.NotFound.selector);
        invites.claim(CODE_HASH, payable(bob));
    }

    function test_reclaim_returnsFundsToInviter() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        invites.reclaim(CODE_HASH);

        assertEq(alice.balance, aliceBefore + 0.001 ether);
        assertEq(address(invites).balance, 0);
    }

    function test_reclaim_revertsForNonInviter() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        vm.prank(mallory);
        vm.expectRevert(PragueConnectInvites.NotInviter.selector);
        invites.reclaim(CODE_HASH);
    }

    function test_reclaim_revertsIfClaimed() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);

        vm.prank(operator);
        invites.claim(CODE_HASH, payable(bob));

        vm.prank(alice);
        vm.expectRevert(PragueConnectInvites.AlreadyClaimed.selector);
        invites.reclaim(CODE_HASH);
    }

    function test_isClaimable_reflectsState() public {
        assertFalse(invites.isClaimable(CODE_HASH));
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);
        assertTrue(invites.isClaimable(CODE_HASH));
        vm.prank(operator);
        invites.claim(CODE_HASH, payable(bob));
        assertFalse(invites.isClaimable(CODE_HASH));
    }

    function test_amountFor_returnsAmount() public {
        vm.prank(alice);
        invites.createFundedInvite{ value: 0.001 ether }(CODE_HASH);
        assertEq(invites.amountFor(CODE_HASH), 0.001 ether);
        vm.prank(operator);
        invites.claim(CODE_HASH, payable(bob));
        assertEq(invites.amountFor(CODE_HASH), 0);
    }
}
