// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { PragueConnectEscrowV2 } from "../src/PragueConnectEscrowV2.sol";

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

contract PragueConnectEscrowV2Test is Test {
    PragueConnectEscrowV2 internal escrow;
    MockAnnouncer internal announcer;

    address internal lucia = makeAddr("lucia");
    uint256 internal workerKeyPk = 0xA11CE; // Alice's "spending key" — derived in real life from FluidKey
    address internal workerKey;
    uint256 internal otherPk = 0xBEEF;
    address internal stealth = makeAddr("stealth-1");
    address internal relayer = makeAddr("relayer");

    bytes32 internal taskId = keccak256("kilian-bicycle-saturday");
    bytes internal ephPub = hex"0203";
    bytes1 internal viewTag = bytes1(0xab);

    function setUp() public {
        announcer = new MockAnnouncer();
        escrow = new PragueConnectEscrowV2(address(announcer));
        vm.deal(lucia, 10 ether);
        vm.deal(relayer, 1 ether);
        workerKey = vm.addr(workerKeyPk);
    }

    function _digest(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", escrow.domainSeparator(), structHash));
    }

    function _signAccept(uint256 pk, address recipient, bytes memory eph, bytes1 tag) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(escrow.ACCEPT_TYPEHASH(), taskId, recipient, keccak256(eph), tag)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(structHash));
        return abi.encodePacked(r, s, v);
    }

    function _signDeliver(uint256 pk) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(escrow.DELIVER_TYPEHASH(), taskId));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(structHash));
        return abi.encodePacked(r, s, v);
    }

    function _signRelease(uint256 pk, uint8 rating) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(escrow.RELEASE_TYPEHASH(), taskId, rating));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(structHash));
        return abi.encodePacked(r, s, v);
    }

    function _phaseOf(bytes32 id) internal view returns (PragueConnectEscrowV2.Phase) {
        (, , , , , PragueConnectEscrowV2.Phase p, , , ) = escrow.tasks(id);
        return p;
    }

    function _acceptedAtOf(bytes32 id) internal view returns (uint40) {
        (, , , , uint40 a, , , , ) = escrow.tasks(id);
        return a;
    }

    function test_HappyPath_SignedFlow_FunderRelays() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragueConnectEscrowV2.Phase.Nigredo));

        // Worker signs accept off-chain. Funder (or relayer) submits.
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        vm.prank(relayer);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragueConnectEscrowV2.Phase.Albedo));

        // Worker signs deliver off-chain. Anyone submits.
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        vm.prank(relayer);
        escrow.deliverWithSig(taskId, deliverSig);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragueConnectEscrowV2.Phase.Citrinitas));

        // Funder direct release.
        uint256 stealthBefore = stealth.balance;
        vm.prank(lucia);
        escrow.releaseAsFunder(taskId, 5);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragueConnectEscrowV2.Phase.Rubedo));
        assertEq(stealth.balance - stealthBefore, 0.01 ether);
    }

    function test_FunderSignsRelease_RelayerSubmits() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        // Funder is offline but signs Release intent. Relayer submits.
        // For lucia (a vm.addr-derived test account), we'd need her pk. Use makeAddrAndKey.
        (address luciaSigner, uint256 luciaPk) = makeAddrAndKey("lucia-signer");
        vm.deal(luciaSigner, 1 ether);
        vm.prank(luciaSigner);
        bytes32 sigTaskId = keccak256("signer-task");
        escrow.fund{ value: 0.01 ether }(sigTaskId, workerKey);
        // Sign accept + deliver for the new task.
        bytes32 acceptHash = keccak256(
            abi.encode(escrow.ACCEPT_TYPEHASH(), sigTaskId, stealth, keccak256(ephPub), viewTag)
        );
        (uint8 av, bytes32 ar, bytes32 as_) = vm.sign(workerKeyPk, _digest(acceptHash));
        escrow.acceptWithSig(sigTaskId, stealth, ephPub, viewTag, abi.encodePacked(ar, as_, av));
        bytes32 deliverHash = keccak256(abi.encode(escrow.DELIVER_TYPEHASH(), sigTaskId));
        (uint8 dv, bytes32 dr, bytes32 ds) = vm.sign(workerKeyPk, _digest(deliverHash));
        escrow.deliverWithSig(sigTaskId, abi.encodePacked(dr, ds, dv));

        bytes32 relStruct = keccak256(abi.encode(escrow.RELEASE_TYPEHASH(), sigTaskId, uint8(4)));
        (uint8 rv, bytes32 rr, bytes32 rs) = vm.sign(luciaPk, _digest(relStruct));
        bytes memory releaseSig = abi.encodePacked(rr, rs, rv);
        // Submit from relayer.
        vm.prank(relayer);
        escrow.releaseWithSig(sigTaskId, 4, releaseSig);
        assertEq(stealth.balance, 0.01 ether);
    }

    function test_WorkerCanSelfReleaseAfter24h() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        vm.warp(block.timestamp + 25 hours);
        bytes memory releaseSig = _signRelease(workerKeyPk, 4);
        vm.prank(relayer);
        escrow.releaseWithSig(taskId, 4, releaseSig);
        assertEq(stealth.balance, 0.01 ether);
    }

    function test_WorkerSelfReleaseEarlyReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        bytes memory releaseSig = _signRelease(workerKeyPk, 4);
        vm.expectRevert(PragueConnectEscrowV2.NotPartyOrTimeout.selector);
        escrow.releaseWithSig(taskId, 4, releaseSig);
    }

    function test_BadAcceptSigReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        // Sig from wrong key.
        bytes memory badSig = _signAccept(otherPk, stealth, ephPub, viewTag);
        vm.expectRevert(PragueConnectEscrowV2.InvalidSignature.selector);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, badSig);
    }

    function test_AcceptReplayReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        // Phase moves past Nigredo so even a valid sig hits WrongPhase first.
        vm.expectRevert();
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
    }

    function test_ReleaseReplayReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        vm.prank(lucia);
        escrow.releaseAsFunder(taskId, 5);

        // Same release sig now hits WrongPhase since we're in Rubedo.
        bytes memory releaseSig = _signRelease(workerKeyPk, 5);
        vm.warp(block.timestamp + 25 hours);
        vm.expectRevert();
        escrow.releaseWithSig(taskId, 5, releaseSig);
    }

    function test_RefundOnlyDuringNigredo() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        uint256 luciaBefore = lucia.balance;
        vm.prank(lucia);
        escrow.refund(taskId);
        assertEq(lucia.balance - luciaBefore, 0.01 ether);
    }

    function test_RefundAfterAcceptReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        vm.expectRevert();
        vm.prank(lucia);
        escrow.refund(taskId);
    }

    function test_InvalidRatingReverts() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        vm.expectRevert(PragueConnectEscrowV2.InvalidRating.selector);
        vm.prank(lucia);
        escrow.releaseAsFunder(taskId, 0);

        vm.expectRevert(PragueConnectEscrowV2.InvalidRating.selector);
        vm.prank(lucia);
        escrow.releaseAsFunder(taskId, 6);
    }

    function test_ReputationCommitment() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        bytes32 expected = keccak256(abi.encodePacked(stealth, taskId, uint8(5)));
        vm.expectEmit(true, false, false, true);
        emit PragueConnectEscrowV2.TaskReleased(taskId, 5, expected);
        vm.prank(lucia);
        escrow.releaseAsFunder(taskId, 5);
    }

    function test_NoMsgSenderInWorkerEvents() public {
        // Sanity: workerKey (a key-derived address with no real balance/EOA
        // history) never appears as msg.sender. Submission can be from anywhere.
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        // Submit accept from a pristine address that has no prior chain history.
        address random = makeAddr("random-relayer");
        vm.deal(random, 0.001 ether);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        vm.prank(random);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        // Workers only signature is reflected in storage; msg.sender of the
        // accept tx (random) has no privileged role.
        (, address storedKey, , , , , address storedStealth, , ) = escrow.tasks(taskId);
        assertEq(storedKey, workerKey);
        assertEq(storedStealth, stealth);
    }

    // ---- new in v2.1 (workerKey != 0, cancelByFunder, acceptedAt) ----

    function test_FundRevertsOnZeroWorkerKey() public {
        vm.prank(lucia);
        vm.expectRevert(PragueConnectEscrowV2.ZeroAddress.selector);
        escrow.fund{ value: 0.01 ether }(taskId, address(0));
    }

    function test_AcceptedAtRecordedOnAccept() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        uint40 before = _acceptedAtOf(taskId);
        assertEq(before, 0);
        vm.warp(1_700_000_000);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        assertEq(_acceptedAtOf(taskId), uint40(1_700_000_000));
    }

    function test_CancelByFunderRevertsBeforeGrace() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);

        vm.prank(lucia);
        vm.expectRevert(PragueConnectEscrowV2.TooEarly.selector);
        escrow.cancelByFunder(taskId);

        // 6 days in: still too early (grace is 7d)
        vm.warp(block.timestamp + 6 days);
        vm.prank(lucia);
        vm.expectRevert(PragueConnectEscrowV2.TooEarly.selector);
        escrow.cancelByFunder(taskId);
    }

    function test_CancelByFunderSucceedsAfterGrace() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);

        uint256 luciaBefore = lucia.balance;
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(lucia);
        escrow.cancelByFunder(taskId);
        assertEq(lucia.balance - luciaBefore, 0.01 ether);
        assertEq(uint8(_phaseOf(taskId)), uint8(PragueConnectEscrowV2.Phase.Refunded));
    }

    function test_CancelByFunderRevertsForNonFunder() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);
        vm.warp(block.timestamp + 8 days);

        address randomCaller = makeAddr("random-caller");
        vm.deal(randomCaller, 1 ether);
        vm.prank(randomCaller);
        vm.expectRevert(PragueConnectEscrowV2.NotFunder.selector);
        escrow.cancelByFunder(taskId);
    }

    function test_CancelByFunderRevertsOutsideAlbedo() public {
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        // still Nigredo — not Albedo
        vm.warp(block.timestamp + 8 days);
        vm.prank(lucia);
        vm.expectRevert();
        escrow.cancelByFunder(taskId);
    }

    function test_DeliverAfterPartialGraceUnblocksRelease() public {
        // Worker delivering before the funder's cancel-grace expires should
        // close the cancel path: phase moves to Citrinitas so cancelByFunder
        // reverts on phase check.
        vm.prank(lucia);
        escrow.fund{ value: 0.01 ether }(taskId, workerKey);
        bytes memory acceptSig = _signAccept(workerKeyPk, stealth, ephPub, viewTag);
        escrow.acceptWithSig(taskId, stealth, ephPub, viewTag, acceptSig);

        vm.warp(block.timestamp + 6 days);
        bytes memory deliverSig = _signDeliver(workerKeyPk);
        escrow.deliverWithSig(taskId, deliverSig);

        // Even past the grace, cancel is no longer valid — release path takes over.
        vm.warp(block.timestamp + 2 days);
        vm.prank(lucia);
        vm.expectRevert();
        escrow.cancelByFunder(taskId);
    }
}
