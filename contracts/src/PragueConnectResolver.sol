// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PragueConnectResolver — ENS CCIP-Read offchain resolver.
/// @notice An ENSIP-10 / EIP-3668 resolver that delegates every query under
///         `pragueconnect.eth` to PragueConnect's own gateway. The gateway returns
///         signed responses; this contract verifies the signature on-chain.
///         Single-domain, single-signer setup. Drop-in replacement for NameStone's
///         hosted resolver — the resolver code, the gateway code, and the data
///         schema are all in this repo and self-hostable. (CROPS · Censorship-
///         Resistant leg, made literal.)
///
///         Reference: ensdomains/offchain-resolver. ECDSA + SupportsInterface
///         inlined so this file compiles without external dependencies.

interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

interface IResolverService {
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        returns (bytes memory result, uint64 expires, bytes memory sig);
}

contract PragueConnectResolver is IExtendedResolver {
    /// @notice Gateway URL template — clients substitute {sender} and {data}.
    ///         e.g. https://pragueconnect-azure.vercel.app/api/ccip/{sender}/{data}.json
    string public url;
    mapping(address => bool) public signers;
    address public owner;

    event NewSigners(address[] signers);
    event SignerAdded(address signer);
    event SignerRemoved(address signer);
    event UrlUpdated(string url);
    event OwnershipTransferred(address previousOwner, address newOwner);

    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );
    error NotOwner();
    error InvalidSignature();
    error SignatureExpired();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(string memory _url, address[] memory _signers) {
        url = _url;
        owner = msg.sender;
        for (uint256 i = 0; i < _signers.length; i++) {
            if (_signers[i] == address(0)) revert ZeroAddress();
            signers[_signers[i]] = true;
        }
        emit NewSigners(_signers);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /// @notice ENSIP-10 entry point. Always reverts with OffchainLookup so the
    ///         client follows EIP-3668 to our gateway and returns a signed payload.
    function resolve(bytes calldata name, bytes calldata data) external view override returns (bytes memory) {
        bytes memory callData = abi.encodeWithSelector(IResolverService.resolve.selector, name, data);
        string[] memory urls = new string[](1);
        urls[0] = url;
        revert OffchainLookup(
            address(this),
            urls,
            callData,
            this.resolveWithProof.selector,
            abi.encode(callData, address(this))
        );
    }

    /// @notice Callback for EIP-3668. Verifies the gateway's signature.
    function resolveWithProof(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(response, (bytes, uint64, bytes));
        if (expires < block.timestamp) revert SignatureExpired();

        (bytes memory request, address sender) = abi.decode(extraData, (bytes, address));
        bytes32 digest = makeSignatureHash(sender, expires, request, result);
        address signer = _recover(digest, sig);
        if (signer == address(0) || !signers[signer]) revert InvalidSignature();
        return result;
    }

    /// @notice EIP-712-ish digest the gateway must sign over. Matches ensdomains
    ///         offchain-resolver SignatureVerifier exactly so any spec-conformant
    ///         CCIP-Read client + gateway pair will interop.
    function makeSignatureHash(
        address target,
        uint64 expires,
        bytes memory request,
        bytes memory result
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(hex"1900", target, expires, keccak256(request), keccak256(result)));
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        // 0x9061b923 = IExtendedResolver.resolve
        // 0x01ffc9a7 = ERC-165
        return interfaceID == 0x9061b923 || interfaceID == 0x01ffc9a7;
    }

    // ---- admin -----------------------------------------------------------

    function addSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        signers[signer] = true;
        emit SignerAdded(signer);
    }

    function removeSigner(address signer) external onlyOwner {
        signers[signer] = false;
        emit SignerRemoved(signer);
    }

    function setUrl(string calldata _url) external onlyOwner {
        url = _url;
        emit UrlUpdated(_url);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ---- internal ECDSA recover (no external deps) -----------------------

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        // Guard against malleable signatures.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return address(0);
        }
        return ecrecover(hash, v, r, s);
    }
}
