// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragueConnectTip — one-shot sealed gift, with optional finder's mark.
/// @notice For private tips/gifts on PragueConnect that don't need the four-phase Magnum Opus escrow:
///         the sender derives a stealth address from the recipient's ERC-5564 meta-address
///         client-side, calls `tip(...)`, and the contract atomically (a) announces via the
///         canonical ERC-5564 announcer so the recipient's scanner picks it up and
///         (b) transfers the ETH to the stealth address.
///
///         `tipWithReferral(...)` adds a second leg: 95% to the recipient's stealth address
///         and 5% to the inviter's stealth address — atomic, two announces, two transfers.
///         When a user is reciprocating to the person who introduced them, both stealth
///         addresses can resolve to the same person; the dual-receipt is still meaningful
///         pedagogy about how the mechanic works for third-party tips.
interface IERC5564Announcer {
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external;
}

contract PragueConnectTip {
    address public immutable announcer;

    /// @dev schemeId 1 = SECP256k1 / EIP-191 / SHA-256 / view-tag, per EIP-5564.
    uint256 internal constant SCHEME_ID = 1;

    /// @notice Recipient's share when tipWithReferral is used. Inviter gets the remainder.
    uint256 public constant RECIPIENT_SHARE_PCT = 95;

    event Tipped(
        address indexed from,
        address indexed stealthRecipient,
        uint256 amount,
        bytes ephemeralPubKey,
        bytes1 viewTag,
        string memo
    );

    /// @notice Companion event when a tip carries an inviter finder's mark.
    event Referral(
        address indexed from,
        address indexed stealthRecipient,
        address indexed stealthInviter,
        uint256 recipientAmount,
        uint256 inviterAmount
    );

    error ZeroAmount();
    error ZeroAddress();
    error PayoutFailed();

    constructor(address announcer_) {
        announcer = announcer_;
    }

    /// @param stealthRecipient ERC-5564 derived address — funds land here, not on the recipient's ENS-bound address.
    /// @param ephemeralPubKey EIP-5564 §3 ephemeral public key, recipient's scanner uses this to detect the tip.
    /// @param viewTag EIP-5564 §3 first byte of shared secret hash, lets scanners filter cheaply.
    /// @param memo short human-readable note (kept off-chain in production; on-chain here for demo provenance).
    function tip(
        address payable stealthRecipient,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        string calldata memo
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (stealthRecipient == address(0)) revert ZeroAddress();

        bytes memory metadata = abi.encodePacked(viewTag, bytes32(uint256(msg.value)));
        IERC5564Announcer(announcer).announce(SCHEME_ID, stealthRecipient, ephemeralPubKey, metadata);

        emit Tipped(msg.sender, stealthRecipient, msg.value, ephemeralPubKey, viewTag, memo);

        (bool ok, ) = stealthRecipient.call{value: msg.value}("");
        if (!ok) revert PayoutFailed();
    }

    /// @notice Atomic 95/5 split. Recipient receives RECIPIENT_SHARE_PCT%, inviter receives
    ///         the remainder. Both legs announce via ERC-5564 and transfer in this same tx —
    ///         either both succeed or the whole thing reverts. No dust retained by the contract.
    /// @dev    `recipientStealth` and `inviterStealth` may resolve to the same person (the
    ///         reciprocate flow); the announces and emits remain distinct for indexer clarity.
    function tipWithReferral(
        address payable recipientStealth,
        bytes calldata recipientEphPubKey,
        bytes1 recipientViewTag,
        address payable inviterStealth,
        bytes calldata inviterEphPubKey,
        bytes1 inviterViewTag,
        string calldata memo
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (recipientStealth == address(0) || inviterStealth == address(0)) revert ZeroAddress();

        uint256 recipientShare = (msg.value * RECIPIENT_SHARE_PCT) / 100;
        uint256 inviterShare = msg.value - recipientShare;

        bytes memory recipientMeta = abi.encodePacked(recipientViewTag, bytes32(recipientShare));
        IERC5564Announcer(announcer).announce(SCHEME_ID, recipientStealth, recipientEphPubKey, recipientMeta);
        emit Tipped(msg.sender, recipientStealth, recipientShare, recipientEphPubKey, recipientViewTag, memo);

        bytes memory inviterMeta = abi.encodePacked(inviterViewTag, bytes32(inviterShare));
        IERC5564Announcer(announcer).announce(SCHEME_ID, inviterStealth, inviterEphPubKey, inviterMeta);
        emit Tipped(msg.sender, inviterStealth, inviterShare, inviterEphPubKey, inviterViewTag, "");

        emit Referral(msg.sender, recipientStealth, inviterStealth, recipientShare, inviterShare);

        (bool okR, ) = recipientStealth.call{value: recipientShare}("");
        if (!okR) revert PayoutFailed();
        (bool okI, ) = inviterStealth.call{value: inviterShare}("");
        if (!okI) revert PayoutFailed();
    }
}
