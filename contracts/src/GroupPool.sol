// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IGroupPool.sol";

contract GroupPool is IGroupPool {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    uint256 private _groupCount;
    mapping(uint256 => Group) private _groups;
    mapping(uint256 => address[]) private _members;
    mapping(uint256 => mapping(address => bool)) private _isMember;
    mapping(uint256 => mapping(address => uint256)) private _contributed;
    mapping(uint256 => mapping(address => uint256)) private _maxPerAction;
    mapping(uint256 => mapping(address => uint64)) private _lastPulledAt;

    mapping(uint256 => mapping(uint256 => Proposal)) private _proposals;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _hasApproved;

    mapping(uint256 => mapping(address => address)) private _delegateVotes;
    mapping(uint256 => mapping(address => uint32)) private _delegateVoteCounts;

    mapping(uint256 => mapping(address => mapping(address => uint256))) private _owed;

    constructor(IERC20 _token) {
        token = _token;
    }

    // ---- groups and members ----

    /// @inheritdoc IGroupPool
    function createGroup(GroupConfig calldata cfg, uint256 maxPerAction) external override returns (uint256 groupId) {
        groupId = ++_groupCount;

        Group storage g = _groups[groupId];
        g.config = cfg;
        if (g.config.approvalBps == 0) {
            g.config.approvalBps = 5001;
        }
        if (g.config.approvalWindow == 0) {
            g.config.approvalWindow = 86400;
        }
        g.status = Status.Saving;
        if (cfg.mode == Mode.Delegate) {
            g.delegate = msg.sender;
        }
        g.memberCount = 1;

        _members[groupId].push(msg.sender);
        _isMember[groupId][msg.sender] = true;
        _maxPerAction[groupId][msg.sender] = maxPerAction;

        emit GroupCreated(groupId, msg.sender, cfg.name, cfg.mode, cfg.goal);
        emit MemberJoined(groupId, msg.sender);
    }

    /// @inheritdoc IGroupPool
    function join(uint256 groupId, uint256 maxPerAction) external override {
        if (groupId == 0 || groupId > _groupCount) revert NotMember();
        if (_isMember[groupId][msg.sender]) revert AlreadyMember();

        _isMember[groupId][msg.sender] = true;
        _members[groupId].push(msg.sender);
        _groups[groupId].memberCount++;
        _maxPerAction[groupId][msg.sender] = maxPerAction;

        emit MemberJoined(groupId, msg.sender);
    }

    /// @inheritdoc IGroupPool
    function setMaxPerAction(uint256 groupId, uint256 maxPerAction) external override {
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        _maxPerAction[groupId][msg.sender] = maxPerAction;
    }

    /// @inheritdoc IGroupPool
    function leave(uint256 groupId) external override {
        if (!_isMember[groupId][msg.sender]) revert NotMember();

        Group storage g = _groups[groupId];
        uint256 userContributed = _contributed[groupId][msg.sender];
        uint256 refund = 0;
        if (g.totalContributed > 0 && userContributed > 0) {
            refund = (g.balance * userContributed) / g.totalContributed;
        }

        _isMember[groupId][msg.sender] = false;

        address[] storage memList = _members[groupId];
        uint256 len = memList.length;
        for (uint256 i = 0; i < len; i++) {
            if (memList[i] == msg.sender) {
                memList[i] = memList[len - 1];
                memList.pop();
                break;
            }
        }

        g.memberCount--;
        g.balance -= refund;
        g.totalContributed -= userContributed;
        _contributed[groupId][msg.sender] = 0;
        _maxPerAction[groupId][msg.sender] = 0;
        _lastPulledAt[groupId][msg.sender] = 0;

        if (g.config.mode == Mode.Delegate) {
            if (g.delegate == msg.sender) {
                g.delegate = address(0);
            }
            address votedCandidate = _delegateVotes[groupId][msg.sender];
            if (votedCandidate != address(0)) {
                _delegateVoteCounts[groupId][votedCandidate]--;
                _delegateVotes[groupId][msg.sender] = address(0);
            }
        }

        emit MemberLeft(groupId, msg.sender, refund);

        if (refund > 0) {
            token.safeTransfer(msg.sender, refund);
        }
    }

    // ---- saving ----

    /// @inheritdoc IGroupPool
    function contribute(uint256 groupId, uint256 amount) external override {
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (amount == 0) revert InvalidAmount();

        Group storage g = _groups[groupId];
        g.balance += amount;
        g.totalContributed += amount;
        _contributed[groupId][msg.sender] += amount;

        if (g.status == Status.Saving && g.config.goal > 0 && g.balance >= g.config.goal) {
            g.status = Status.Ready;
            emit GoalReached(groupId, g.balance);
        }

        emit Contributed(groupId, msg.sender, amount, g.balance, false);

        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc IGroupPool
    function pull(uint256 groupId, address member) external override {
        if (groupId == 0 || groupId > _groupCount) revert NotMember();
        if (!_isMember[groupId][member]) revert NotMember();

        Group storage g = _groups[groupId];
        if (g.config.contributionAmount == 0) revert InvalidAmount();
        if (g.status == Status.Ready) revert GoalAlreadyReached();

        uint64 lastPull = _lastPulledAt[groupId][member];
        if (lastPull != 0 && block.timestamp < lastPull + g.config.period) {
            revert TooEarly(lastPull + g.config.period);
        }

        uint256 pullAmount = g.config.contributionAmount;
        if (pullAmount > _maxPerAction[groupId][member]) revert CapExceeded();

        _lastPulledAt[groupId][member] = uint64(block.timestamp);
        g.balance += pullAmount;
        g.totalContributed += pullAmount;
        _contributed[groupId][member] += pullAmount;

        if (g.status == Status.Saving && g.config.goal > 0 && g.balance >= g.config.goal) {
            g.status = Status.Ready;
            emit GoalReached(groupId, g.balance);
        }

        emit Contributed(groupId, member, pullAmount, g.balance, true);

        token.safeTransferFrom(member, address(this), pullAmount);
    }

    // ---- spending ----

    /// @inheritdoc IGroupPool
    function spend(uint256 groupId, address to, uint256 amount, string calldata memo) external override {
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (amount == 0 || to == address(0)) revert InvalidAmount();

        Group storage g = _groups[groupId];
        if (g.config.mode == Mode.Delegate) {
            if (msg.sender != g.delegate) revert NotDelegate();
        } else if (g.config.mode == Mode.Open) {
            if (g.config.openSpendCap > 0 && amount > g.config.openSpendCap) revert CapExceeded();
        } else {
            revert WrongMode();
        }

        if (g.balance < amount) revert InsufficientPool();

        g.balance -= amount;
        g.paymentCount++;

        emit Spent(groupId, msg.sender, to, amount, memo);

        token.safeTransfer(to, amount);
    }

    /// @inheritdoc IGroupPool
    function voteDelegate(uint256 groupId, address candidate) external override {
        Group storage g = _groups[groupId];
        if (g.config.mode != Mode.Delegate) revert WrongMode();
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (!_isMember[groupId][candidate]) revert NotMember();

        address prev = _delegateVotes[groupId][msg.sender];
        if (prev != candidate) {
            if (prev != address(0)) {
                _delegateVoteCounts[groupId][prev]--;
            }
            _delegateVotes[groupId][msg.sender] = candidate;
            _delegateVoteCounts[groupId][candidate]++;
        }

        emit DelegateVoted(groupId, msg.sender, candidate);

        if (candidate != g.delegate && _delegateVoteCounts[groupId][candidate] * 2 > g.memberCount) {
            g.delegate = candidate;
            emit DelegateChanged(groupId, candidate);
        }
    }

    /// @inheritdoc IGroupPool
    function propose(uint256 groupId, address to, uint256 amount, string calldata memo)
        external
        override
        returns (uint256 proposalId)
    {
        Group storage g = _groups[groupId];
        if (g.config.mode != Mode.Approval) revert WrongMode();
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (amount == 0 || to == address(0)) revert InvalidAmount();
        if (g.balance < amount) revert InsufficientPool();

        proposalId = ++g.proposalCount;
        uint64 expiresAt = uint64(block.timestamp + g.config.approvalWindow);

        Proposal storage p = _proposals[groupId][proposalId];
        p.proposer = msg.sender;
        p.to = to;
        p.amount = amount;
        p.memo = memo;
        p.expiresAt = expiresAt;
        p.approvals = 1;
        p.memberSnapshot = g.memberCount;
        p.executed = false;

        _hasApproved[groupId][proposalId][msg.sender] = true;

        emit ProposalCreated(groupId, proposalId, msg.sender, to, amount, memo, expiresAt);
        emit ProposalApproved(groupId, proposalId, msg.sender, 1);

        if (uint256(p.approvals) * 10000 >= uint256(p.memberSnapshot) * g.config.approvalBps) {
            p.executed = true;
            g.balance -= p.amount;
            g.paymentCount++;
            emit ProposalExecuted(groupId, proposalId);
            token.safeTransfer(p.to, p.amount);
        }
    }

    /// @inheritdoc IGroupPool
    function approve(uint256 groupId, uint256 proposalId) external override {
        Group storage g = _groups[groupId];
        if (g.config.mode != Mode.Approval) revert WrongMode();
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (proposalId == 0 || proposalId > g.proposalCount) revert ProposalNotFound();

        Proposal storage p = _proposals[groupId][proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp >= p.expiresAt) revert ProposalExpired();
        if (_hasApproved[groupId][proposalId][msg.sender]) revert AlreadyApproved();

        _hasApproved[groupId][proposalId][msg.sender] = true;
        p.approvals++;

        emit ProposalApproved(groupId, proposalId, msg.sender, p.approvals);

        if (uint256(p.approvals) * 10000 >= uint256(p.memberSnapshot) * g.config.approvalBps) {
            if (g.balance < p.amount) revert InsufficientPool();
            p.executed = true;
            g.balance -= p.amount;
            g.paymentCount++;
            emit ProposalExecuted(groupId, proposalId);
            token.safeTransfer(p.to, p.amount);
        }
    }

    // ---- pay for the group and split bill ----

    /// @inheritdoc IGroupPool
    function payForGroup(uint256 groupId, address to, uint256 amount, string calldata memo)
        external
        override
        returns (uint256 paymentId)
    {
        Group storage g = _groups[groupId];
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (amount == 0 || to == address(0)) revert InvalidAmount();

        paymentId = ++g.paymentCount;
        uint256 share = amount / g.memberCount;

        token.safeTransferFrom(msg.sender, to, amount);

        emit GroupPayment(groupId, paymentId, msg.sender, to, amount, share, memo);

        address[] storage mems = _members[groupId];
        uint256 len = mems.length;
        for (uint256 i = 0; i < len; i++) {
            address m = mems[i];
            if (m == msg.sender) continue;
            _processShare(groupId, paymentId, m, msg.sender, share);
        }
    }

    function _processShare(uint256 groupId, uint256 paymentId, address member, address payer, uint256 share) private {
        bool canCover = (
            token.balanceOf(member) >= share &&
            token.allowance(member, address(this)) >= share &&
            _maxPerAction[groupId][member] >= share
        );

        if (canCover) {
            (bool success, bytes memory ret) = address(token).call(
                abi.encodeWithSelector(IERC20.transferFrom.selector, member, payer, share)
            );
            if (success && (ret.length == 0 || abi.decode(ret, (bool)))) {
                emit ShareDebited(groupId, paymentId, member, share);
                return;
            }
        }

        _owed[groupId][member][payer] += share;
        emit ShareShortfall(groupId, paymentId, member, share);
    }

    /// @inheritdoc IGroupPool
    function addExpense(uint256 groupId, uint256 amount, address[] calldata participants, string calldata memo)
        external
        override
    {
        if (!_isMember[groupId][msg.sender]) revert NotMember();
        if (amount == 0) revert InvalidAmount();

        bool senderIncluded = false;
        for (uint256 i = 0; i < participants.length; i++) {
            if (!_isMember[groupId][participants[i]]) revert NotMember();
            if (participants[i] == msg.sender) {
                senderIncluded = true;
            }
        }

        uint256 totalSplitCount = senderIncluded ? participants.length : participants.length + 1;
        if (totalSplitCount == 0) revert InvalidAmount();
        uint256 share = amount / totalSplitCount;

        for (uint256 i = 0; i < participants.length; i++) {
            address p = participants[i];
            if (p != msg.sender) {
                _owed[groupId][p][msg.sender] += share;
            }
        }

        emit ExpenseAdded(groupId, msg.sender, amount, share, memo);
    }

    /// @inheritdoc IGroupPool
    function settleDebt(uint256 groupId, address creditor, uint256 amount) external override {
        if (amount == 0) revert InvalidAmount();

        uint256 currentOwed = _owed[groupId][msg.sender][creditor];
        if (currentOwed == 0) revert NothingToSettle();
        if (amount > currentOwed) revert InvalidAmount();

        _owed[groupId][msg.sender][creditor] -= amount;

        emit DebtSettled(groupId, msg.sender, creditor, amount);

        token.safeTransferFrom(msg.sender, creditor, amount);
    }

    /// @inheritdoc IGroupPool
    function offset(uint256 groupId, address a, address b) external override {
        if (a == b) revert InvalidAmount();

        uint256 owedAtoB = _owed[groupId][a][b];
        uint256 owedBtoA = _owed[groupId][b][a];
        uint256 minOwed = owedAtoB < owedBtoA ? owedAtoB : owedBtoA;

        if (minOwed == 0) revert NothingToSettle();

        _owed[groupId][a][b] -= minOwed;
        _owed[groupId][b][a] -= minOwed;

        emit DebtOffset(groupId, a, b, minOwed);
    }

    // ---- views ----

    /// @inheritdoc IGroupPool
    function groupCount() external view override returns (uint256) {
        return _groupCount;
    }

    /// @inheritdoc IGroupPool
    function getGroup(uint256 groupId) external view override returns (Group memory) {
        return _groups[groupId];
    }

    /// @inheritdoc IGroupPool
    function isMember(uint256 groupId, address account) external view override returns (bool) {
        return _isMember[groupId][account];
    }

    /// @inheritdoc IGroupPool
    function members(uint256 groupId) external view override returns (address[] memory) {
        return _members[groupId];
    }

    /// @inheritdoc IGroupPool
    function memberInfo(uint256 groupId, address account)
        external
        view
        override
        returns (uint256 contributed, uint256 maxPerAction, uint64 lastPulledAt)
    {
        return (_contributed[groupId][account], _maxPerAction[groupId][account], _lastPulledAt[groupId][account]);
    }

    /// @inheritdoc IGroupPool
    function getProposal(uint256 groupId, uint256 proposalId) external view override returns (Proposal memory) {
        return _proposals[groupId][proposalId];
    }

    /// @inheritdoc IGroupPool
    function hasApproved(uint256 groupId, uint256 proposalId, address account) external view override returns (bool) {
        return _hasApproved[groupId][proposalId][account];
    }

    /// @inheritdoc IGroupPool
    function owed(uint256 groupId, address debtor, address creditor) external view override returns (uint256) {
        return _owed[groupId][debtor][creditor];
    }
}
