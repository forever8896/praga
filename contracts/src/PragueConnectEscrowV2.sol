// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragueConnectEscrowV2 — sig-authorised escrow for end-to-end privacy.
/// @notice The v1 contract bound `msg.sender == t.worker` on accept/deliver/
///         release, which forced the worker's main EOA onto the chain three
///         times per task and publicly tied the stealth recipient to that EOA
///         via the accept tx. v2 drops `msg.sender`-based auth in favour of
///         EIP-712 signatures from the worker's spending key. Anyone can
///         submit the txs (the funder, a relayer, the worker themselves
///         from any address — it doesn't matter); the contract verifies the
///         signature against the spending-key-derived address committed at
///         fund time.
///
/// @dev Worker identity:
///         The spending-key-derived address is committed as `workerKey` on
///         fund(). All worker actions verify ECDSA signatures recovering to
///         that address. The worker never appears as `msg.sender` of any
///         escrow tx, so their main EOA stays out of every event log.
///
/// @dev Funder convenience:
///         `releaseAsFunder()` keeps the gas-cheap direct path for funders
///         who are online — they don't need to sign EIP-712 typed data
///         when their msg.sender is already authoritative.
///
/// @dev ERC-5564 announcer on Base + 8 other chains (deterministic):
///         0x55649E01B5Df198D18D95b5cc5051630cfD45564
interface IERC5564Announcer {
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes memory ephemeralPubKey,
        bytes memory metadata
    ) external;
}

contract PragueConnectEscrowV2 {
    enum Phase {
        None,
        Nigredo,
        Albedo,
        Citrinitas,
        Rubedo,
        Refunded
    }

    struct Task {
        address funder;             // funder's address — pays gas on fund(), authoritative for direct release
        address workerKey;          // address derived from worker's stealth spending pubkey
        uint96 amount;
        uint40 deliveredAt;
        Phase phase;
        address stealthRecipient;
        bytes ephemeralPubKey;
        bytes1 viewTag;
    }

    event TaskFunded(bytes32 indexed taskId, address indexed funder, address indexed workerKey, uint96 amount);
    event TaskAccepted(bytes32 indexed taskId, address stealthRecipient);
    event TaskDelivered(bytes32 indexed taskId);
    event TaskReleased(bytes32 indexed taskId, uint8 rating, bytes32 reputationCommitment);
    event TaskRefunded(bytes32 indexed taskId);

    error WrongPhase(Phase have, Phase want);
    error NotFunder();
    error NotPartyOrTimeout();
    error InvalidSignature();
    error ZeroAmount();
    error AlreadyExists();
    error InvalidRating();
    error PayoutFailed();
    error AlreadyConsumed();

    uint40 public constant DELIVERY_GRACE = 24 hours;

    address public immutable announcer;
    bytes32 public immutable domainSeparator;

    bytes32 public constant ACCEPT_TYPEHASH =
        keccak256("Accept(bytes32 taskId,address stealthRecipient,bytes ephemeralPubKey,bytes1 viewTag)");
    bytes32 public constant DELIVER_TYPEHASH = keccak256("Deliver(bytes32 taskId)");
    bytes32 public constant RELEASE_TYPEHASH = keccak256("Release(bytes32 taskId,uint8 rating)");

    mapping(bytes32 => Task) public tasks;
    /// @dev Replay protection: action-typehash -> taskId -> consumed.
    mapping(bytes32 => mapping(bytes32 => bool)) public consumed;

    constructor(address announcer_) {
        announcer = announcer_;
        domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("PragueConnectEscrowV2")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Funder opens an escrow and commits to a worker public-key-derived
    ///         address. Convention: `workerKey` is the Ethereum address of the
    ///         worker's stealth spending public key — i.e. the address that a
    ///         signature with their spending privkey ecrecovers to.
    function fund(bytes32 taskId, address workerKey) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (tasks[taskId].phase != Phase.None) revert AlreadyExists();
        tasks[taskId] = Task({
            funder: msg.sender,
            workerKey: workerKey,
            amount: uint96(msg.value),
            deliveredAt: 0,
            phase: Phase.Nigredo,
            stealthRecipient: address(0),
            ephemeralPubKey: "",
            viewTag: 0
        });
        emit TaskFunded(taskId, msg.sender, workerKey, uint96(msg.value));
    }

    /// @notice Anyone can submit; the worker's spending-key signature is the auth.
    function acceptWithSig(
        bytes32 taskId,
        address stealthRecipient,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata workerSig
    ) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Nigredo) revert WrongPhase(t.phase, Phase.Nigredo);
        if (consumed[ACCEPT_TYPEHASH][taskId]) revert AlreadyConsumed();
        bytes32 structHash = keccak256(
            abi.encode(ACCEPT_TYPEHASH, taskId, stealthRecipient, keccak256(ephemeralPubKey), viewTag)
        );
        _verifySigner(t.workerKey, structHash, workerSig);
        consumed[ACCEPT_TYPEHASH][taskId] = true;

        t.phase = Phase.Albedo;
        t.stealthRecipient = stealthRecipient;
        t.ephemeralPubKey = ephemeralPubKey;
        t.viewTag = viewTag;
        emit TaskAccepted(taskId, stealthRecipient);
    }

    /// @notice Anyone can submit. Worker's spending-key signs Deliver(taskId).
    function deliverWithSig(bytes32 taskId, bytes calldata workerSig) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Albedo) revert WrongPhase(t.phase, Phase.Albedo);
        if (consumed[DELIVER_TYPEHASH][taskId]) revert AlreadyConsumed();
        bytes32 structHash = keccak256(abi.encode(DELIVER_TYPEHASH, taskId));
        _verifySigner(t.workerKey, structHash, workerSig);
        consumed[DELIVER_TYPEHASH][taskId] = true;

        t.phase = Phase.Citrinitas;
        t.deliveredAt = uint40(block.timestamp);
        emit TaskDelivered(taskId);
    }

    /// @notice Sig-driven release path. Sig may come from funder (anytime) or
    ///         worker (after DELIVERY_GRACE). Anyone submits.
    function releaseWithSig(bytes32 taskId, uint8 rating, bytes calldata sig) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Citrinitas) revert WrongPhase(t.phase, Phase.Citrinitas);
        if (rating < 1 || rating > 5) revert InvalidRating();
        if (consumed[RELEASE_TYPEHASH][taskId]) revert AlreadyConsumed();

        bytes32 structHash = keccak256(abi.encode(RELEASE_TYPEHASH, taskId, rating));
        bytes32 digest = _hashTyped(structHash);
        address signer = _recover(digest, sig);
        if (signer == address(0)) revert InvalidSignature();
        bool funderAuth = signer == t.funder;
        bool workerAuth = signer == t.workerKey && block.timestamp >= t.deliveredAt + DELIVERY_GRACE;
        if (!funderAuth && !workerAuth) revert NotPartyOrTimeout();
        consumed[RELEASE_TYPEHASH][taskId] = true;

        _payout(t, taskId, rating);
    }

    /// @notice Funder-direct release. msg.sender authoritative — no sig needed.
    ///         Cheaper for funders who are online when Citrinitas opens.
    function releaseAsFunder(bytes32 taskId, uint8 rating) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Citrinitas) revert WrongPhase(t.phase, Phase.Citrinitas);
        if (msg.sender != t.funder) revert NotFunder();
        if (rating < 1 || rating > 5) revert InvalidRating();
        if (consumed[RELEASE_TYPEHASH][taskId]) revert AlreadyConsumed();
        consumed[RELEASE_TYPEHASH][taskId] = true;

        _payout(t, taskId, rating);
    }

    function refund(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        if (t.phase != Phase.Nigredo) revert WrongPhase(t.phase, Phase.Nigredo);
        if (msg.sender != t.funder) revert NotFunder();
        t.phase = Phase.Refunded;
        uint96 amt = t.amount;
        emit TaskRefunded(taskId);
        (bool ok, ) = t.funder.call{ value: amt }("");
        if (!ok) revert PayoutFailed();
    }

    function _payout(Task storage t, bytes32 taskId, uint8 rating) internal {
        t.phase = Phase.Rubedo;
        bytes32 commitment = keccak256(abi.encodePacked(t.stealthRecipient, taskId, rating));
        emit TaskReleased(taskId, rating, commitment);

        bytes memory metadata = abi.encodePacked(t.viewTag, bytes32(uint256(t.amount)));
        IERC5564Announcer(announcer).announce(1, t.stealthRecipient, t.ephemeralPubKey, metadata);

        (bool ok, ) = t.stealthRecipient.call{ value: t.amount }("");
        if (!ok) revert PayoutFailed();
    }

    function _verifySigner(address expected, bytes32 structHash, bytes calldata sig) internal view {
        bytes32 digest = _hashTyped(structHash);
        address signer = _recover(digest, sig);
        if (signer == address(0) || signer != expected) revert InvalidSignature();
    }

    function _hashTyped(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        return ecrecover(hash, v, r, s);
    }
}
