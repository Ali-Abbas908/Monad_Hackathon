// GroupPool ABI for keeper
export const GROUP_POOL_ABI = [
  {
    "type": "function",
    "name": "groupCount",
    "inputs": [],
    "outputs": [{ "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGroup",
    "inputs": [{ "name": "groupId", "type": "uint256" }],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "name": "config",
            "type": "tuple",
            "components": [
              { "name": "name", "type": "string" },
              { "name": "mode", "type": "uint8" },
              { "name": "goal", "type": "uint256" },
              { "name": "contributionAmount", "type": "uint256" },
              { "name": "period", "type": "uint64" },
              { "name": "openSpendCap", "type": "uint256" },
              { "name": "approvalBps", "type": "uint16" },
              { "name": "approvalWindow", "type": "uint64" }
            ]
          },
          { "name": "status", "type": "uint8" },
          { "name": "delegate", "type": "address" },
          { "name": "balance", "type": "uint256" },
          { "name": "totalContributed", "type": "uint256" },
          { "name": "memberCount", "type": "uint32" },
          { "name": "paymentCount", "type": "uint256" },
          { "name": "proposalCount", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "members",
    "inputs": [{ "name": "groupId", "type": "uint256" }],
    "outputs": [{ "type": "address[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "memberInfo",
    "inputs": [
      { "name": "groupId", "type": "uint256" },
      { "name": "account", "type": "address" }
    ],
    "outputs": [
      { "name": "contributed", "type": "uint256" },
      { "name": "maxPerAction", "type": "uint256" },
      { "name": "lastPulledAt", "type": "uint64" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pull",
    "inputs": [
      { "name": "groupId", "type": "uint256" },
      { "name": "member", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Events
  {
    "type": "event",
    "name": "GroupCreated",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "name", "type": "string", "indexed": false },
      { "name": "mode", "type": "uint8", "indexed": false },
      { "name": "goal", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "MemberJoined",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "MemberLeft",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true },
      { "name": "refunded", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Contributed",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "newBalance", "type": "uint256", "indexed": false },
      { "name": "viaPull", "type": "bool", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "GoalReached",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "balance", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Spent",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "by", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "memo", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DelegateVoted",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "voter", "type": "address", "indexed": true },
      { "name": "candidate", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "DelegateChanged",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "newDelegate", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "ProposalCreated",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "proposalId", "type": "uint256", "indexed": true },
      { "name": "proposer", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": false },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "memo", "type": "string", "indexed": false },
      { "name": "expiresAt", "type": "uint64", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ProposalApproved",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "proposalId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true },
      { "name": "approvals", "type": "uint32", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ProposalExecuted",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "proposalId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "GroupPayment",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "paymentId", "type": "uint256", "indexed": true },
      { "name": "payer", "type": "address", "indexed": true },
      { "name": "to", "type": "address", "indexed": false },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "share", "type": "uint256", "indexed": false },
      { "name": "memo", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ShareDebited",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "paymentId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ShareShortfall",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "paymentId", "type": "uint256", "indexed": true },
      { "name": "member", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ExpenseAdded",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "payer", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "share", "type": "uint256", "indexed": false },
      { "name": "memo", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DebtSettled",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "debtor", "type": "address", "indexed": true },
      { "name": "creditor", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DebtOffset",
    "inputs": [
      { "name": "groupId", "type": "uint256", "indexed": true },
      { "name": "a", "type": "address", "indexed": true },
      { "name": "b", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  }
];
