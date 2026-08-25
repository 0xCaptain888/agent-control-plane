// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20MinimalV3 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title AgentGuard VerifyPay Escrow V3
/// @notice Reference deployment for independent verifier attestations. The
///         live hackathon proof remains PolicyEscrowV2; this contract removes
///         the creator-as-verifier limitation with an EIP-712 verifier key.
contract PolicyEscrowV3 {
    enum Status { NONE, FUNDED, SUBMITTED, VERIFIED, FROZEN, REFUNDED, EXPIRED }
    struct Task { address creator; address executor; address asset; uint256 budget; uint256 deadline; bytes32 policyHash; bytes32 evidenceHash; Status status; }
    struct Attestation { uint256 taskId; bytes32 policyHash; bytes32 evidenceHash; bool approved; bytes32 decisionReason; uint256 issuedAt; uint256 expiresAt; }

    error Unauthorized();
    error InvalidTask();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidEvidence();
    error InvalidState();
    error Paused();
    error TransferFailed();
    error InvalidAttestation();

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256("Attestation(uint256 taskId,bytes32 policyHash,bytes32 evidenceHash,bool approved,bytes32 decisionReason,uint256 issuedAt,uint256 expiresAt)");
    address public immutable owner;
    address public immutable verifier;
    bytes32 public immutable DOMAIN_SEPARATOR;
    uint256 public nextTaskId = 1;
    uint256 private _entered;
    bool public paused;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed creator, address indexed executor, address asset, uint256 budget, uint256 deadline, bytes32 policyHash);
    event TaskSubmitted(uint256 indexed taskId, bytes32 evidenceHash);
    event PolicyEvaluated(uint256 indexed taskId, bytes32 indexed policyHash, bool allowed, bytes32 decisionReason, address indexed verifier);
    event PaymentReleased(uint256 indexed taskId, address indexed asset, address indexed recipient, uint256 amount, bytes32 evidenceHash, address verifier);
    event TaskFrozen(uint256 indexed taskId, bytes32 evidenceHash, bytes32 reason, address verifier);
    event TaskRefunded(uint256 indexed taskId, address indexed asset, address indexed recipient, uint256 amount);
    event TaskExpired(uint256 indexed taskId);
    event PausedStateChanged(bool paused);

    modifier onlyOwner() { if (msg.sender != owner) revert Unauthorized(); _; }
    modifier whenNotPaused() { if (paused) revert Paused(); _; }
    modifier nonReentrant() { if (_entered != 0) revert InvalidState(); _entered = 1; _; _entered = 0; }

    constructor(address verifier_) {
        if (verifier_ == address(0)) revert InvalidTask();
        owner = msg.sender;
        verifier = verifier_;
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("AgentGuard Policy Escrow")),
            keccak256(bytes("3")),
            block.chainid,
            address(this)
        ));
    }

    function setPaused(bool value) external onlyOwner { paused = value; emit PausedStateChanged(value); }

    function createNativeTask(address executor, bytes32 policyHash, uint256 deadline) external payable whenNotPaused returns (uint256 taskId) {
        taskId = _create(executor, address(0), msg.value, policyHash, deadline);
    }

    function createTokenTask(address token, address executor, uint256 amount, bytes32 policyHash, uint256 deadline) external whenNotPaused returns (uint256 taskId) {
        if (token == address(0)) revert InvalidTask();
        if (!IERC20MinimalV3(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        taskId = _create(executor, token, amount, policyHash, deadline);
    }

    function _create(address executor, address asset, uint256 amount, bytes32 policyHash, uint256 deadline) internal returns (uint256 taskId) {
        if (executor == address(0)) revert InvalidTask();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        taskId = nextTaskId++;
        tasks[taskId] = Task(msg.sender, executor, asset, amount, deadline, policyHash, bytes32(0), Status.FUNDED);
        emit TaskCreated(taskId, msg.sender, executor, asset, amount, deadline, policyHash);
    }

    function submitTask(uint256 taskId, bytes32 evidenceHash) external whenNotPaused {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert InvalidTask();
        if (msg.sender != task.executor) revert Unauthorized();
        if (task.status != Status.FUNDED || block.timestamp > task.deadline) revert InvalidState();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();
        task.evidenceHash = evidenceHash;
        task.status = Status.SUBMITTED;
        emit TaskSubmitted(taskId, evidenceHash);
    }

    function verifyTask(uint256 taskId, Attestation calldata attestation, bytes calldata signature) external nonReentrant whenNotPaused {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert InvalidTask();
        if (task.status != Status.SUBMITTED || block.timestamp > task.deadline) revert InvalidState();
        if (attestation.taskId != taskId || attestation.policyHash != task.policyHash || attestation.evidenceHash != task.evidenceHash) revert InvalidAttestation();
        if (attestation.issuedAt > block.timestamp + 60 || attestation.expiresAt < block.timestamp || attestation.expiresAt < attestation.issuedAt) revert InvalidAttestation();
        bytes32 structHash = keccak256(abi.encode(ATTESTATION_TYPEHASH, attestation.taskId, attestation.policyHash, attestation.evidenceHash, attestation.approved, attestation.decisionReason, attestation.issuedAt, attestation.expiresAt));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (_recover(digest, signature) != verifier) revert Unauthorized();
        emit PolicyEvaluated(taskId, task.policyHash, attestation.approved, attestation.decisionReason, verifier);
        if (!attestation.approved) {
            task.status = Status.FROZEN;
            emit TaskFrozen(taskId, task.evidenceHash, attestation.decisionReason, verifier);
            return;
        }
        task.status = Status.VERIFIED;
        _transfer(task.asset, task.executor, task.budget);
        emit PaymentReleased(taskId, task.asset, task.executor, task.budget, task.evidenceHash, verifier);
    }

    function refundFrozen(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0) || msg.sender != task.creator || task.status != Status.FROZEN) revert InvalidState();
        task.status = Status.REFUNDED;
        _transfer(task.asset, task.creator, task.budget);
        emit TaskRefunded(taskId, task.asset, task.creator, task.budget);
    }

    function refundExpired(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0) || msg.sender != task.creator || (task.status != Status.FUNDED && task.status != Status.SUBMITTED) || block.timestamp <= task.deadline) revert InvalidState();
        task.status = Status.EXPIRED;
        _transfer(task.asset, task.creator, task.budget);
        emit TaskExpired(taskId);
        emit TaskRefunded(taskId, task.asset, task.creator, task.budget);
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address recovered) {
        if (signature.length != 65) revert InvalidAttestation();
        bytes32 r; bytes32 s; uint8 v;
        assembly { r := calldataload(signature.offset) s := calldataload(add(signature.offset, 32)) v := byte(0, calldataload(add(signature.offset, 64))) }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidAttestation();
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert InvalidAttestation();
        recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidAttestation();
    }

    function _transfer(address asset, address recipient, uint256 amount) internal {
        if (asset == address(0)) { (bool sent,) = payable(recipient).call{value: amount}(""); if (!sent) revert TransferFailed(); }
        else if (!IERC20MinimalV3(asset).transfer(recipient, amount)) revert TransferFailed();
    }
}
