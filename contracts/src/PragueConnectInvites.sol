// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragueConnectInvites — patronage-as-onboarding.
/// @notice Each invite code can carry attached funds. The inviter calls
///         createFundedInvite() with ETH; later, when the invitee actually
///         claims their subname, the server-operated `claim()` releases the
///         funds to the new user's wallet — atomically with their seal.
///         If the code is never used, the inviter can reclaim() at any time.
///
///         Trust model: only `operator` (the platform's claim service) can
///         call `claim()`. Front-running is impossible because the code-hash
///         alone is not authorization. We already trust the operator with
///         resolver writes and faucet drips, so the trust surface here adds
///         nothing new.
///
///         Privacy: the codeHash is committed on-chain at invite creation.
///         The plaintext code is only revealed off-chain (in the URL the
///         inviter shares). On-chain observers see the commitment + the
///         eventual `claim` (with recipient) but cannot link them to a
///         specific plaintext code without already knowing it.
contract PragueConnectInvites {
    address public immutable operator;

    struct Invite {
        address inviter;
        uint256 amount;
        bool claimed;
    }

    mapping(bytes32 => Invite) public invites;

    event InviteFunded(bytes32 indexed codeHash, address indexed inviter, uint256 amount);
    event InviteClaimed(bytes32 indexed codeHash, address indexed recipient, uint256 amount);
    event InviteReclaimed(bytes32 indexed codeHash, address indexed inviter, uint256 amount);

    error AlreadyExists();
    error NotFound();
    error AlreadyClaimed();
    error NotOperator();
    error NotInviter();
    error TransferFailed();
    error NoFundsAttached();

    constructor(address _operator) {
        require(_operator != address(0), "zero operator");
        operator = _operator;
    }

    /// @notice Inviter attaches ETH to a code. The codeHash is keccak256 of
    ///         the plaintext invite code (computed off-chain). msg.value is
    ///         what the invitee will receive on claim.
    function createFundedInvite(bytes32 codeHash) external payable {
        if (invites[codeHash].inviter != address(0)) revert AlreadyExists();
        if (msg.value == 0) revert NoFundsAttached();
        invites[codeHash] = Invite({
            inviter: msg.sender,
            amount: msg.value,
            claimed: false
        });
        emit InviteFunded(codeHash, msg.sender, msg.value);
    }

    /// @notice Server-side claim. Releases attached funds to `recipient`. The
    ///         server is responsible for validating that `recipient` is the
    ///         legitimate claimer of the code (Privy auth, code unused, etc.).
    function claim(bytes32 codeHash, address payable recipient) external {
        if (msg.sender != operator) revert NotOperator();
        Invite storage inv = invites[codeHash];
        if (inv.inviter == address(0)) revert NotFound();
        if (inv.claimed) revert AlreadyClaimed();
        inv.claimed = true;
        uint256 amount = inv.amount;
        emit InviteClaimed(codeHash, recipient, amount);
        (bool ok, ) = recipient.call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Inviter takes their funds back if the invite was never used.
    ///         No expiry — they can reclaim at any time as long as the code
    ///         hasn't been claimed by an invitee.
    function reclaim(bytes32 codeHash) external {
        Invite storage inv = invites[codeHash];
        if (inv.inviter != msg.sender) revert NotInviter();
        if (inv.claimed) revert AlreadyClaimed();
        inv.claimed = true;
        uint256 amount = inv.amount;
        emit InviteReclaimed(codeHash, msg.sender, amount);
        (bool ok, ) = payable(msg.sender).call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    /// @notice View — is this code still claimable?
    function isClaimable(bytes32 codeHash) external view returns (bool) {
        Invite storage inv = invites[codeHash];
        return inv.inviter != address(0) && !inv.claimed;
    }

    /// @notice View — how much is attached to this code?
    function amountFor(bytes32 codeHash) external view returns (uint256) {
        Invite storage inv = invites[codeHash];
        if (inv.claimed) return 0;
        return inv.amount;
    }
}
