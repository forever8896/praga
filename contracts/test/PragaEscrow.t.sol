// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { PragaEscrow } from "../src/PragaEscrow.sol";

contract MockAnnouncer {
    event Announced(uint256 schemeId, address stealthAddress, bytes ephPub, bytes metadata);

    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephPub,
        bytes memory metadata
    ) external {
        emit Announced(schemeId, stealthAddress, ephPub, metadata);
    }
}

contract PragaEscrowTest is Test {
    PragaEscrow internal escrow;
    MockAnnouncer internal announcer;

    address internal lucia = makeAddr("lucia");
    address internal kilian = makeAddr("kilian");
    address internal stealth = makeAddr("stealth-1");

    bytes32 internal taskId = keccak256("kilian-bicycle-saturday");
    bytes internal ephPub = hex"0203";
    bytes1 internal viewTag = bytes1(0xab);

    function setUp() public {
        announcer = new MockAnnouncer();
        escrow = new PragaEscrow(address(announcer));
        vm.deal(lucia, 10 ether);
    }

    function _phaseOf(bytes32 id) internal view returns (PragaEscrow.Phase) {
        (, , , , PragaEscrow.Phase p, , , ) = escrow.tasks(id);
        return p;
    }

    function _amountOf(bytes32 id) internal view returns (uint96) {
        (, , uint96 amt, , , , , ) = escrow.tasks(id);
        return amt;
    }

    function _deliveredAtOf(bytes32 id) internal view returns (uint40) {
        (, , , uint40 d, , , , ) = escrow.tasks(id);
        return d;
    }

    function test_HappyPath_Magnum_Opus() public {
        // Nigredo
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragaEscrow.Phase.Nigredo));
        assertEq(_amountOf(taskId), 0.01 ether);

        // Albedo
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragaEscrow.Phase.Albedo));

        // Citrinitas
        vm.prank(kilian);
        escrow.deliver(taskId);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragaEscrow.Phase.Citrinitas));
        assertGt(_deliveredAtOf(taskId), 0);

        // Rubedo — funder releases with rating 5
        uint256 stealthBalBefore = stealth.balance;
        vm.prank(lucia);
        escrow.release(taskId, 5);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragaEscrow.Phase.Rubedo));
        assertEq(stealth.balance - stealthBalBefore, 0.01 ether);
    }

    function test_WorkerCanReleaseAfter24h() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);
        vm.prank(kilian);
        escrow.deliver(taskId);

        // Funder is silent — worker can self-release after 24h grace
        vm.warp(block.timestamp + 25 hours);
        vm.prank(kilian);
        escrow.release(taskId, 4);
        assertEq(stealth.balance, 0.01 ether);
    }

    function test_WorkerCannotReleaseEarly() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);
        vm.prank(kilian);
        escrow.deliver(taskId);

        // Without grace, worker self-release reverts
        vm.expectRevert(PragaEscrow.NotPartyOrTimeout.selector);
        vm.prank(kilian);
        escrow.release(taskId, 5);
    }

    function test_RefundOnlyDuringNigredo() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);

        uint256 luciaBalBefore = lucia.balance;
        vm.prank(lucia);
        escrow.refund(taskId);
        assertEq(lucia.balance - luciaBalBefore, 0.01 ether);
    }

    function test_RefundFailsAfterAccept() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);

        vm.expectRevert();
        vm.prank(lucia);
        escrow.refund(taskId);
    }

    function test_InvalidRatingReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);
        vm.prank(kilian);
        escrow.deliver(taskId);

        vm.expectRevert(PragaEscrow.InvalidRating.selector);
        vm.prank(lucia);
        escrow.release(taskId, 0);

        vm.expectRevert(PragaEscrow.InvalidRating.selector);
        vm.prank(lucia);
        escrow.release(taskId, 6);
    }

    function test_ReputationCommitment() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, kilian);
        vm.prank(kilian);
        escrow.accept(taskId, stealth, ephPub, viewTag);
        vm.prank(kilian);
        escrow.deliver(taskId);

        bytes32 expected = keccak256(abi.encodePacked(stealth, taskId, uint8(5)));
        vm.expectEmit(true, false, false, true);
        emit PragaEscrow.TaskReleased(taskId, 5, expected);
        vm.prank(lucia);
        escrow.release(taskId, 5);
    }
}
