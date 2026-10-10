// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGroupPool {
    enum Mode { Delegate, Approval, Open }
    enum Status { Saving, Ready }

    struct GroupConfig {
        string name;
        Mode mode;
        uint256 goal;               // target pool balance; 0 = no goal
        uint256 contributionAmount; // per periodic pull; 0 = manual contributions only
        uint64 period;              // seconds between pulls
        uint256 openSpendCap;       // Open mode: max per spend; 0 = unlimited
        uint16 approvalBps;         // Approval mode: members needed, basis points; default 5001
        uint64 approvalWindow;      // Approval mode: seconds a proposal stays open; default 86400
    }

    struct Group {
        GroupConfig config;
        Status status;
        address delegate;           // Delegate mode only; zero otherwise
        uint256 balance;            // pool balance held by the contract
        uint256 totalContributed;
        uint32 memberCount;
        uint256 paymentCount;
        uint256 proposalCount;
    }

    struct Proposal {
        address proposer;
        address to;
        uint256 amount;
        string memo;
        uint64 expiresAt;
        uint32 approvals;
        uint32 memberSnapshot;      // member count when proposed
        bool executed;
    }

    // ---- groups and members ----

    /// Creates a group; the caller becomes the first member (and the delegate in Delegate mode).
    function createGroup(GroupConfig calldata cfg, uint256 maxPerAction) external returns (uint256 groupId);

    /// Joins a group and records the most the contract may pull from the caller per action.
    function join(uint256 groupId, uint256 maxPerAction) external;

    function setMaxPerAction(uint256 groupId, uint256 maxPerAction) external;

    /// Leaves the group and returns balance * contributed / totalContributed to the caller.
    function leave(uint256 groupId) external;

    // ---- saving ----

    /// Manual contribution; pulls `amount` from the caller into the pool.
    function contribute(uint256 groupId, uint256 amount) external;

    /// Permissionless. Pulls contributionAmount from `member` into the pool, once per period.
    function pull(uint256 groupId, address member) external;

    // ---- spending ----

    /// Delegate mode (delegate only) and Open mode (any member, up to openSpendCap).
    function spend(uint256 groupId, address to, uint256 amount, string calldata memo) external;

    /// Delegate mode: record the caller's vote for a new delegate. A candidate with more than half
    /// of members' votes becomes delegate.
    function voteDelegate(uint256 groupId, address candidate) external;

    /// Approval mode: creates a proposal; the proposer's approval is counted automatically.
    function propose(uint256 groupId, address to, uint256 amount, string calldata memo)
        external returns (uint256 proposalId);

    /// Approval mode: approves; executes the payment from the pool when approvals * 10000 >=
    /// memberSnapshot * approvalBps. Reverts after expiry or on a second approval by the same member.
    function approve(uint256 groupId, uint256 proposalId) external;

    // ---- pay for the group and split bill ----

    /// Pulls `amount` from the caller and pays `to`; then pulls each other member's equal share
    /// straight to the caller. A member who cannot cover their share (balance, allowance or
    /// maxPerAction) becomes an IOU instead. The caller keeps their share plus the rounding remainder.
    /// Reverts as a whole if the payer's own payment fails.
    function payForGroup(uint256 groupId, address to, uint256 amount, string calldata memo)
        external returns (uint256 paymentId);

    /// Records an expense the caller paid outside the app: each participant (other than the caller)
    /// owes an equal share of `amount` to the caller as an IOU. The caller is included in the split.
    function addExpense(uint256 groupId, uint256 amount, address[] calldata participants, string calldata memo)
        external;

    /// The caller pays `amount` of their IOU to `creditor` from their wallet.
    function settleDebt(uint256 groupId, address creditor, uint256 amount) external;

    /// Cancels the overlap when a and b owe each other. Anyone may call.
    function offset(uint256 groupId, address a, address b) external;

    // ---- views ----

    function groupCount() external view returns (uint256);
    function getGroup(uint256 groupId) external view returns (Group memory);
    function isMember(uint256 groupId, address account) external view returns (bool);
    function members(uint256 groupId) external view returns (address[] memory);
    function memberInfo(uint256 groupId, address account)
        external view returns (uint256 contributed, uint256 maxPerAction, uint64 lastPulledAt);
    function getProposal(uint256 groupId, uint256 proposalId) external view returns (Proposal memory);
    function hasApproved(uint256 groupId, uint256 proposalId, address account) external view returns (bool);
    function owed(uint256 groupId, address debtor, address creditor) external view returns (uint256);

    // ---- events (one feed item each) ----

    event GroupCreated(uint256 indexed groupId, address indexed creator, string name, Mode mode, uint256 goal);
    event MemberJoined(uint256 indexed groupId, address indexed member);
    event MemberLeft(uint256 indexed groupId, address indexed member, uint256 refunded);
    event Contributed(uint256 indexed groupId, address indexed member, uint256 amount, uint256 newBalance, bool viaPull);
    event GoalReached(uint256 indexed groupId, uint256 balance);
    event Spent(uint256 indexed groupId, address indexed by, address indexed to, uint256 amount, string memo);
    event DelegateVoted(uint256 indexed groupId, address indexed voter, address indexed candidate);
    event DelegateChanged(uint256 indexed groupId, address indexed newDelegate);
    event ProposalCreated(uint256 indexed groupId, uint256 indexed proposalId, address indexed proposer, address to, uint256 amount, string memo, uint64 expiresAt);
    event ProposalApproved(uint256 indexed groupId, uint256 indexed proposalId, address indexed member, uint32 approvals);
    event ProposalExecuted(uint256 indexed groupId, uint256 indexed proposalId);
    event GroupPayment(uint256 indexed groupId, uint256 indexed paymentId, address indexed payer, address to, uint256 amount, uint256 share, string memo);
    event ShareDebited(uint256 indexed groupId, uint256 indexed paymentId, address indexed member, uint256 amount);
    event ShareShortfall(uint256 indexed groupId, uint256 indexed paymentId, address indexed member, uint256 amount);
    event ExpenseAdded(uint256 indexed groupId, address indexed payer, uint256 amount, uint256 share, string memo);
    event DebtSettled(uint256 indexed groupId, address indexed debtor, address indexed creditor, uint256 amount);
    event DebtOffset(uint256 indexed groupId, address indexed a, address indexed b, uint256 amount);

    // ---- errors ----

    error NotMember();
    error AlreadyMember();
    error WrongMode();
    error NotDelegate();
    error InvalidAmount();
    error CapExceeded();
    error TooEarly(uint64 availableAt);
    error GoalAlreadyReached();
    error InsufficientPool();
    error ProposalNotFound();
    error ProposalExpired();
    error AlreadyApproved();
    error AlreadyExecuted();
    error NothingToSettle();
}
