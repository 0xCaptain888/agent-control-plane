// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title AgentGuard VerifyPay Escrow V2
/// @notice Testnet-grade native ETH and ERC-20 escrow with explicit policy and
///         evidence events. Policy evaluation stays in AgentGuard; this
///         contract enforces the settlement boundary and timeout safety.
contract PolicyEscrowV2 {
    enum Status { NONE, FUNDED, SUBMITTED, VERIFIED, FROZEN, REFUNDED, EXPIRED }

    struct Task {
        address creator;
        address executor;
        address asset; // address(0) means native ETH
        uint256 budget;
        uint256 deadline;
        bytes32 policyHash;
        bytes32 evidenceHash;
        Status status;
    }

    error Unauthorized();
    error InvalidTask();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidEvidence();
    error InvalidState();
    error Paused();
    error TransferFailed();

    address public immutable owner;
    uint256 public nextTaskId = 1;
    uint256 private _entered;
    bool public paused;
    mapping(uint256 => Task) public tasks;

    event PolicyEvaluated(uint256 indexed taskId, bytes32 indexed policyHash, bool allowed, bytes32 decisionReason);
    event TaskCreated(uint256 indexed taskId, address indexed creator, address indexed executor, address asset, uint256 budget, uint256 deadline, bytes32 policyHash);
    event TaskSubmitted(uint256 indexed taskId, bytes32 evidenceHash);
    event PaymentReleased(uint256 indexed taskId, address indexed asset, address indexed recipient, uint256 amount, bytes32 evidenceHash);
    event TaskFrozen(uint256 indexed taskId, bytes32 evidenceHash, bytes32 reason);
    event TaskRefunded(uint256 indexed taskId, address indexed asset, address indexed recipient, uint256 amount);
    event TaskExpired(uint256 indexed taskId);
    event PausedStateChanged(bool paused);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 0) revert InvalidState();
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor() {
        owner = msg.sender;
    }

    function setPaused(bool value) external onlyOwner {
        paused = value;
        emit PausedStateChanged(value);
    }

    function createNativeTask(address executor, bytes32 policyHash, uint256 deadline)
        external
        payable
        whenNotPaused
        returns (uint256 taskId)
    {
        taskId = _create(executor, address(0), msg.value, policyHash, deadline);
    }

    function createTokenTask(address token, address executor, uint256 amount, bytes32 policyHash, uint256 deadline)
        external
        whenNotPaused
        returns (uint256 taskId)
    {
        if (token == address(0)) revert InvalidTask();
        if (!IERC20Minimal(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        taskId = _create(executor, token, amount, policyHash, deadline);
    }

    function _create(address executor, address asset, uint256 amount, bytes32 policyHash, uint256 deadline)
        internal
        returns (uint256 taskId)
    {
        if (executor == address(0)) revert InvalidTask();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        taskId = nextTaskId++;
        tasks[taskId] = Task({
            creator: msg.sender,
            executor: executor,
            asset: asset,
            budget: amount,
            deadline: deadline,
            policyHash: policyHash,
            evidenceHash: bytes32(0),
            status: Status.FUNDED
        });
        emit PolicyEvaluated(taskId, policyHash, true, bytes32(0));
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

    function verifyTask(uint256 taskId, bool approved, bytes32 evidenceHash, bytes32 decisionReason)
        external
        nonReentrant
        whenNotPaused
    {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert InvalidTask();
        if (msg.sender != task.creator) revert Unauthorized();
        if (task.status != Status.SUBMITTED || block.timestamp > task.deadline) revert InvalidState();
        if (evidenceHash == bytes32(0) || evidenceHash != task.evidenceHash) revert InvalidEvidence();
        emit PolicyEvaluated(taskId, task.policyHash, approved, decisionReason);
        if (!approved) {
            task.status = Status.FROZEN;
            emit TaskFrozen(taskId, evidenceHash, decisionReason);
            return;
        }
        task.status = Status.VERIFIED;
        _transfer(task.asset, task.executor, task.budget);
        emit PaymentReleased(taskId, task.asset, task.executor, task.budget, evidenceHash);
    }

    function refundFrozen(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert InvalidTask();
        if (msg.sender != task.creator) revert Unauthorized();
        if (task.status != Status.FROZEN) revert InvalidState();
        task.status = Status.REFUNDED;
        _transfer(task.asset, task.creator, task.budget);
        emit TaskRefunded(taskId, task.asset, task.creator, task.budget);
    }

    function refundExpired(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        if (task.creator == address(0)) revert InvalidTask();
        if (msg.sender != task.creator) revert Unauthorized();
        if ((task.status != Status.FUNDED && task.status != Status.SUBMITTED) || block.timestamp <= task.deadline) revert InvalidState();
        task.status = Status.EXPIRED;
        _transfer(task.asset, task.creator, task.budget);
        emit TaskExpired(taskId);
        emit TaskRefunded(taskId, task.asset, task.creator, task.budget);
    }

    function _transfer(address asset, address recipient, uint256 amount) internal {
        if (asset == address(0)) {
            (bool sent, ) = payable(recipient).call{value: amount}("");
            if (!sent) revert TransferFailed();
        } else if (!IERC20Minimal(asset).transfer(recipient, amount)) {
            revert TransferFailed();
        }
    }
}
