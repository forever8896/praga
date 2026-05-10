// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { PragueConnectTip } from "../src/PragueConnectTip.sol";

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

contract PragueConnectTipTest is Test {
    PragueConnectTip internal tip;
    MockAnnouncer internal announcer;

    address payable internal recipient = payable(makeAddr("recipient-stealth"));
    address payable internal inviter = payable(makeAddr("inviter-stealth"));
    address internal kilian = makeAddr("kilian");

    bytes internal recipientEph = hex"0201020102010201";
    bytes internal inviterEph = hex"0202020202020202";
    bytes1 internal recipientTag = bytes1(0xab);
    bytes1 internal inviterTag = bytes1(0xcd);

    function setUp() public {
        announcer = new MockAnnouncer();
        tip = new PragueConnectTip(address(announcer));
        vm.deal(kilian, 10 ether);
    }

    // ---- single-leg tip (existing behaviour) ----

    function test_Tip_TransfersFunds() public {
        vm.prank(kilian);
        tip.tip{value: 1 ether}(recipient, recipientEph, recipientTag, "thanks");
        assertEq(recipient.balance, 1 ether);
        assertEq(address(tip).balance, 0);
    }

    function test_Tip_RevertsOnZero() public {
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.ZeroAmount.selector);
        tip.tip(recipient, recipientEph, recipientTag, "");
    }

    function test_Tip_RevertsOnZeroAddress() public {
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.ZeroAddress.selector);
        tip.tip{value: 1 ether}(payable(address(0)), recipientEph, recipientTag, "");
    }

    // ---- tipWithReferral ----

    function test_TipWithReferral_Splits95_5_Exactly() public {
        vm.prank(kilian);
        tip.tipWithReferral{value: 1 ether}(
            recipient, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            "thanks"
        );
        assertEq(recipient.balance, 0.95 ether);
        assertEq(inviter.balance, 0.05 ether);
        assertEq(address(tip).balance, 0);
    }

    function test_TipWithReferral_NoDustOnIndivisibleAmount() public {
        // 997123456789 wei is not divisible by 20. Verify floor + remainder pattern.
        uint256 amount = 997123456789;
        vm.deal(kilian, amount);
        uint256 expectedRecipient = (amount * 95) / 100;
        uint256 expectedInviter = amount - expectedRecipient;

        vm.prank(kilian);
        tip.tipWithReferral{value: amount}(
            recipient, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            ""
        );
        assertEq(recipient.balance, expectedRecipient);
        assertEq(inviter.balance, expectedInviter);
        assertEq(recipient.balance + inviter.balance, amount);
    }

    function test_TipWithReferral_RevertsOnZeroValue() public {
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.ZeroAmount.selector);
        tip.tipWithReferral(
            recipient, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            ""
        );
    }

    function test_TipWithReferral_RevertsOnZeroRecipient() public {
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.ZeroAddress.selector);
        tip.tipWithReferral{value: 1 ether}(
            payable(address(0)), recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            ""
        );
    }

    function test_TipWithReferral_RevertsOnZeroInviter() public {
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.ZeroAddress.selector);
        tip.tipWithReferral{value: 1 ether}(
            recipient, recipientEph, recipientTag,
            payable(address(0)), inviterEph, inviterTag,
            ""
        );
    }

    function test_TipWithReferral_AnnouncesBothLegs() public {
        // Two announcer events expected: one for recipient leg, one for inviter leg.
        vm.recordLogs();
        vm.prank(kilian);
        tip.tipWithReferral{value: 1 ether}(
            recipient, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            "thanks"
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        // Count Announced events
        bytes32 announcedSig = keccak256("Announced(uint256,address,bytes,bytes)");
        uint256 announcedCount = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == announcedSig) {
                announcedCount++;
            }
        }
        assertEq(announcedCount, 2, "expected two announcer events");
    }

    function test_TipWithReferral_EmitsReferralAndTwoTippedEvents() public {
        vm.recordLogs();
        vm.prank(kilian);
        tip.tipWithReferral{value: 1 ether}(
            recipient, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            "thanks"
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 tippedSig = keccak256("Tipped(address,address,uint256,bytes,bytes1,bytes32)");
        bytes32 referralSig = keccak256("Referral(address,address,address,uint256,uint256)");
        uint256 tippedCount = 0;
        uint256 referralCount = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length == 0) continue;
            if (logs[i].topics[0] == tippedSig) tippedCount++;
            if (logs[i].topics[0] == referralSig) referralCount++;
        }
        assertEq(tippedCount, 2, "expected two Tipped events");
        assertEq(referralCount, 1, "expected one Referral event");
    }

    // ---- new privacy/standards-conformance assertions ----

    function test_Tip_MetadataIsCanonicalErc5564Layout() public {
        // Expect: bytes1 viewTag || bytes4 0xeeeeeeee || uint256 amount
        // = 1 + 4 + 32 = 37 bytes. v1 emitted 1 + 32 = 33 bytes (no funcsig).
        vm.recordLogs();
        vm.prank(kilian);
        tip.tip{value: 0.5 ether}(recipient, recipientEph, recipientTag, "");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 announcedSig = keccak256("Announced(uint256,address,bytes,bytes)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length == 0 || logs[i].topics[0] != announcedSig) continue;
            // Announced(uint256, address, bytes, bytes) — none indexed.
            (, , , bytes memory metadata) = abi.decode(logs[i].data, (uint256, address, bytes, bytes));
            assertEq(metadata.length, 37, "metadata should be 1+4+32");
            // viewTag in slot 0
            assertEq(metadata[0], recipientTag, "viewTag mismatch");
            // funcsig 0xeeeeeeee at offset 1..4
            assertEq(uint8(metadata[1]), 0xee, "funcsig byte 0");
            assertEq(uint8(metadata[2]), 0xee, "funcsig byte 1");
            assertEq(uint8(metadata[3]), 0xee, "funcsig byte 2");
            assertEq(uint8(metadata[4]), 0xee, "funcsig byte 3");
            // amount at offset 5..36
            uint256 amt;
            assembly {
                amt := mload(add(metadata, 37))
            }
            assertEq(amt, 0.5 ether, "amount mismatch");
            found = true;
            break;
        }
        assertTrue(found, "expected an Announced event");
    }

    function test_Tip_MemoIsHashedNotPlaintext() public {
        vm.recordLogs();
        string memory memo = "for the cookies, alice";
        vm.prank(kilian);
        tip.tip{value: 1 ether}(recipient, recipientEph, recipientTag, memo);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 tippedSig = keccak256("Tipped(address,address,uint256,bytes,bytes1,bytes32)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length == 0 || logs[i].topics[0] != tippedSig) continue;
            // Decode non-indexed: amount (uint256), ephemeralPubKey (bytes), viewTag (bytes1), memoHash (bytes32)
            (, , , bytes32 memoHash) = abi.decode(logs[i].data, (uint256, bytes, bytes1, bytes32));
            assertEq(memoHash, keccak256(bytes(memo)), "memoHash should be keccak256 of plaintext");
            found = true;
            break;
        }
        assertTrue(found, "expected a Tipped event");
    }

    function test_Tip_EmptyMemoEmitsZero() public {
        vm.recordLogs();
        vm.prank(kilian);
        tip.tip{value: 1 ether}(recipient, recipientEph, recipientTag, "");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 tippedSig = keccak256("Tipped(address,address,uint256,bytes,bytes1,bytes32)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length == 0 || logs[i].topics[0] != tippedSig) continue;
            (, , , bytes32 memoHash) = abi.decode(logs[i].data, (uint256, bytes, bytes1, bytes32));
            assertEq(memoHash, bytes32(0), "empty memo should hash to zero");
            found = true;
            break;
        }
        assertTrue(found, "expected a Tipped event");
    }

    function test_TipWithReferral_SameAddressForBothLegs() public {
        // Reciprocate flow: both legs land on the same stealth address; total equals msg.value.
        vm.prank(kilian);
        tip.tipWithReferral{value: 1 ether}(
            inviter, recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            "thanks for the intro"
        );
        assertEq(inviter.balance, 1 ether);
        assertEq(address(tip).balance, 0);
    }

    function test_TipWithReferral_RevertingRecipientReverts() public {
        // Deploy a refusing recipient and assert PayoutFailed bubbles up.
        Refuser refuser = new Refuser();
        vm.prank(kilian);
        vm.expectRevert(PragueConnectTip.PayoutFailed.selector);
        tip.tipWithReferral{value: 1 ether}(
            payable(address(refuser)), recipientEph, recipientTag,
            inviter, inviterEph, inviterTag,
            ""
        );
        // Both legs rolled back: inviter received nothing.
        assertEq(inviter.balance, 0);
    }
}

contract Refuser {
    receive() external payable {
        revert("nope");
    }
}
