// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragaTip — one-shot sealed gift.
/// @notice For private tips/gifts on Praga that don't need the four-phase Magnum Opus escrow:
///         the sender derives a stealth address from the recipient's ERC-5564 meta-address
///         client-side, calls `tip(...)`, and the contract atomically (a) announces via the
///         canonical ERC-5564 announcer so the recipient's scanner picks it up and
///         (b) transfers the ETH to the stealth address.
///
///         The sender therefore never reveals which address belongs to which ENS name on
///         chain — the link is broken at the speed of one transaction.
interface IERC5564Announcer {
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external;
}

contract PragaTip {
    address public immutable announcer;

    /// @notice Indexed for the receipt UI to scan; metadata mirrors the announcer args.
    event Tipped(
        address indexed from,
        address indexed stealthRecipient,
        uint256 amount,
        bytes ephemeralPubKey,
        bytes1 viewTag,
        string memo
    );

    error ZeroAmount();
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

        // schemeId 1 = SECP256k1 / EIP-191 / SHA-256 / view-tag, per EIP-5564.
        bytes memory metadata = abi.encodePacked(viewTag, bytes32(uint256(msg.value)));
        IERC5564Announcer(announcer).announce(1, stealthRecipient, ephemeralPubKey, metadata);

        emit Tipped(msg.sender, stealthRecipient, msg.value, ephemeralPubKey, viewTag, memo);

        (bool ok, ) = stealthRecipient.call{value: msg.value}("");
        if (!ok) revert PayoutFailed();
    }
}
