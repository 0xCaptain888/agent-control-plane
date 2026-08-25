// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title AgentGuard Policy Escrow
/// @notice Minimal Arbitrum Sepolia settlement contract for the hackathon demo.
///         Policy decisions remain in AgentGuard; this contract only holds and
///         releases native testnet ETH after an evidence-backed verification.
contract PolicyEscrow {
    enum Status { NONE, FUNDED, SUBMITTED, VERIFIED, FROZEN, REFUNDED }

    struct Task {
        address creator;
        address executor;
        uint256 budget;
        bytes32 policyHash;
        bytes32 evidenceHash;
        Status status;
        uint64 createdAt;
    }

    uint256 public nextTaskId = 1;
    uint256 private _entered;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed creator, address indexed executor, uint256 budget, bytes32 policyHash);
    event TaskSubmitted(uint256 indexed taskId, bytes32 evidenceHash);
    event TaskVerified(uint256 indexed taskId, bytes32 evidenceHash, uint256 payout);
    event TaskFrozen(uint256 indexed taskId, bytes32 evidenceHash);
    event TaskRefunded(uint256 indexed taskId, uint256 amount);

    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }

    function createTask(address executor, bytes32 policyHash) external payable returns (uint256 taskId) {
        require(executor != address(0), "executor_zero");
        require(msg.value > 0, "budget_zero");
        taskId = nextTaskId++;
        tasks[taskId] = Task({
            creator: msg.sender,
            executor: executor,
            budget: msg.value,
            policyHash: policyHash,
            evidenceHash: bytes32(0),
            status: Status.FUNDED,
            createdAt: uint64(block.timestamp)
        });
        emit TaskCreated(taskId, msg.sender, executor, msg.value, policyHash);
    }

    function submitTask(uint256 taskId, bytes32 evidenceHash) external {
        Task storage task = tasks[taskId];
        require(task.creator != address(0), "task_missing");
        require(msg.sender == task.executor, "not_executor");
        require(task.status == Status.FUNDED, "not_funded");
        require(evidenceHash != bytes32(0), "evidence_zero");
        task.evidenceHash = evidenceHash;
        task.status = Status.SUBMITTED;
        emit TaskSubmitted(taskId, evidenceHash);
    }

    function verifyTask(uint256 taskId, bool approved, bytes32 evidenceHash) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.creator != address(0), "task_missing");
        require(msg.sender == task.creator, "not_creator");
        require(task.status == Status.SUBMITTED, "not_submitted");
        require(evidenceHash == task.evidenceHash, "evidence_mismatch");
        if (!approved) {
            task.status = Status.FROZEN;
            emit TaskFrozen(taskId, evidenceHash);
            return;
        }
        task.status = Status.VERIFIED;
        uint256 payout = task.budget;
        (bool sent, ) = payable(task.executor).call{value: payout}("");
        require(sent, "payout_failed");
        emit TaskVerified(taskId, evidenceHash, payout);
    }

    function refundFrozen(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.creator != address(0), "task_missing");
        require(msg.sender == task.creator, "not_creator");
        require(task.status == Status.FROZEN, "not_frozen");
        task.status = Status.REFUNDED;
        uint256 amount = task.budget;
        (bool sent, ) = payable(task.creator).call{value: amount}("");
        require(sent, "refund_failed");
        emit TaskRefunded(taskId, amount);
    }
}
