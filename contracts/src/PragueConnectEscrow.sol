// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragueConnectEscrow — the Magnum Opus, on-chain.
/// @notice Non-custodial escrow for the PragueConnect P2P marketplace. Each task moves through the four
///         alchemical phases — Nigredo (Funded) → Albedo (InProgress) → Citrinitas (Delivered)
///         → Rubedo (Released) — and on release, ETH is paid out to a *stealth* address derived
///         from the receiver's ERC-5564 meta-address. The contract emits a reputation
///         commitment so the human behind the stealth address can later prove (via Semaphore /
///         Noir) that they accumulated this rating, without ever revealing which addresses
///         received the funds.
///
/// @dev Designed for Base. EOA or smart-wallet senders both work. The escrow is governed by
///      the funder ("Lucia") and the worker ("Kilian"). Funder funds; worker delivers; funder
///      releases. If 24 hours elapse after delivery, the worker can self-release.
///
/// @dev Stealth integration:
///      - The worker passes `stealthAddress`, `ephemeralPublicKey`, `viewTag` returned by
///        ScopeLift's stealth-address-sdk `generateStealthAddress` against their meta-address.
///      - On release, the contract pays out to `stealthAddress`, then bubbles the ERC-5564
///        announcement so the standard scanner picks it up.
///      - Reputation commitment = keccak256(stealthAddress ‖ taskId ‖ rating). The owner of
///        the spending key behind `stealthAddress` can later ZK-prove ownership of N
///        commitments rated ≥ M.
///
///      ERC-5564 announcer on Base (and 8 other chains, deterministic):
///      0x55649E01B5Df198D18D95b5cc5051630cfD45564
///      ScopeLift, MIT — https://github.com/ScopeLift/stealth-address-erc-contracts
interface IERC5564Announcer {
    /// @param schemeId 1 = SECP256k1 / EIP-191 / SHA-256 / view-tag
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external;
}

contract PragueConnectEscrow {
    enum Phase {
        None, // 0 — uninitialized
        Nigredo, // 1 — Funded; the work has not yet begun
        Albedo, // 2 — InProgress; the worker has begun
        Citrinitas, // 3 — Delivered; awaiting release
        Rubedo, // 4 — Released; the seal is broken in joy
        Refunded // 5 — funder reclaimed
    }

    struct Task {
        address funder; // Lucia
        address worker; // Kilian — controls the stealth meta-address
        uint96 amount; // wei
        uint40 deliveredAt; // unix seconds when worker marked Delivered
        Phase phase;
        // Stealth payment params published when worker accepts the task.
        // The worker computes these client-side from their ERC-5564 meta-address.
        address stealthRecipient;
        bytes ephemeralPubKey; // EIP-5564 §3 — sender ephemeral pubkey
        bytes1 viewTag; // EIP-5564 §3 — first byte of the shared secret hash
    }

    /// @dev keccak256(taskId, rating, recipient) — used for ZK rep proofs after stealth release
    event TaskFunded(bytes32 indexed taskId, address indexed funder, address indexed worker, uint96 amount);
    event TaskAccepted(bytes32 indexed taskId, address stealthRecipient);
    event TaskDelivered(bytes32 indexed taskId);
    event TaskReleased(bytes32 indexed taskId, uint8 rating, bytes32 reputationCommitment);
    event TaskRefunded(bytes32 indexed taskId);

    error WrongPhase(Phase have, Phase want);
    error NotFunder();
    error NotWorker();
    error NotPartyOrTimeout();
    error ZeroAmount();
    error AlreadyExists();
    error InvalidRating();
    error PayoutFailed();

    /// @dev 24-hour grace period after delivery before worker can self-release
    uint40 public constant DELIVERY_GRACE = 24 hours;

    address public immutable announcer;

    mapping(bytes32 => Task) public tasks;

    constructor(address announcer_) {
        announcer = announcer_;
    }

    /// @notice Funder opens an escrow at task `taskId`.
    /// @dev `taskId` must be unique. Convention: keccak256(funder, worker, threadId, salt).
    function fund(bytes32 taskId, address worker) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (tasks[taskId].phase != Phase.None) revert AlreadyExists();
        tasks[taskId] = Task({
            funder: msg.sender,
            worker: worker,
            amount: uint96(msg.value),
            deliveredAt: 0,
            phase: Phase.Nigredo,
            stealthRecipient: address(0),
            ephemeralPubKey: "",
            viewTag: 0
        });
        emit TaskFunded(taskId, msg.sender, worker, uint96(msg.value));
    }

    /// @notice Worker accepts the task and publishes a stealth recipient. The contract does
    ///         not verify the meta-address derivation — sender provides whatever stealth
    ///         address it wishes funds to land at.
    function accept(
        bytes32 taskId,
        address stealthRecipient,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag
    ) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Nigredo) revert WrongPhase(t.phase, Phase.Nigredo);
        if (msg.sender != t.worker) revert NotWorker();
        t.phase = Phase.Albedo;
        t.stealthRecipient = stealthRecipient;
        t.ephemeralPubKey = ephemeralPubKey;
        t.viewTag = viewTag;
        emit TaskAccepted(taskId, stealthRecipient);
    }

    /// @notice Worker marks the task as delivered. Starts the grace timer.
    function deliver(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Albedo) revert WrongPhase(t.phase, Phase.Albedo);
        if (msg.sender != t.worker) revert NotWorker();
        t.phase = Phase.Citrinitas;
        t.deliveredAt = uint40(block.timestamp);
        emit TaskDelivered(taskId);
    }

    /// @notice Release funds to the worker's stealth address with a rating.
    ///         Funder can release at any point after delivery. Worker may
    ///         self-release after `DELIVERY_GRACE`.
    function release(bytes32 taskId, uint8 rating) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Citrinitas) revert WrongPhase(t.phase, Phase.Citrinitas);
        if (rating < 1 || rating > 5) revert InvalidRating();

        bool isFunder = msg.sender == t.funder;
        bool workerTimeout = msg.sender == t.worker && block.timestamp >= t.deliveredAt + DELIVERY_GRACE;
        if (!isFunder && !workerTimeout) revert NotPartyOrTimeout();

        t.phase = Phase.Rubedo;

        // Pay out to the stealth recipient. The "stealth" property survives because the
        // funds land at an unlinkable address; only the holder of the spending key can move
        // them. Reputation commitment lets the holder later ZK-prove ownership.
        bytes32 commitment = keccak256(abi.encodePacked(t.stealthRecipient, taskId, rating));
        emit TaskReleased(taskId, rating, commitment);

        // Bubble the announcement so off-chain stealth scanners (FluidKey, ScopeLift SDK,
        // Goldsky subgraph) pick it up exactly the way they would for any direct payment.
        // schemeId 1 = SECP256k1 / EIP-191 / SHA-256 / view-tag, per EIP-5564.
        bytes memory metadata = abi.encodePacked(t.viewTag, bytes32(uint256(t.amount)));
        IERC5564Announcer(announcer).announce(1, t.stealthRecipient, t.ephemeralPubKey, metadata);

        (bool ok, ) = t.stealthRecipient.call{value: t.amount}("");
        if (!ok) revert PayoutFailed();
    }

    /// @notice Funder reclaims funds while the work has not started (Nigredo only).
    function refund(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Nigredo) revert WrongPhase(t.phase, Phase.Nigredo);
        if (msg.sender != t.funder) revert NotFunder();
        t.phase = Phase.Refunded;
        uint96 amt = t.amount;
        emit TaskRefunded(taskId);
        (bool ok, ) = t.funder.call{value: amt}("");
        if (!ok) revert PayoutFailed();
    }
}
