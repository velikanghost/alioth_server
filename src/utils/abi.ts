// Token ABI for approvals
export const TOKEN_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
] as const;

export const MULTI_ASSET_VAULT_V2_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_aliothYieldOptimizer',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_owner',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'MAX_FEE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MIN_SHARES',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'addToken',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'minDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'maxDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'aliothYieldOptimizer',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IAliothYieldOptimizer',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'authorizeAIBackend',
    inputs: [
      {
        name: 'aiBackend',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'authorizedAIBackends',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minShares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'targetProtocol',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositFee',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeRecipient',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSupportedTokens',
    inputs: [],
    outputs: [
      {
        name: 'tokens',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenStats',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'totalShares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'totalValue',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'receiptTokenAddress',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserPortfolio',
    inputs: [
      {
        name: 'user',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'tokens',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'receiptTokens',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'shares',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'symbols',
        type: 'string[]',
        internalType: 'string[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isTokenSupported',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'isSupported',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewDeposit',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewWithdraw',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'receiptTokenFactory',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ReceiptTokenFactory',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'removeToken',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeAIBackend',
    inputs: [
      {
        name: 'aiBackend',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setDepositFee',
    inputs: [
      {
        name: '_depositFee',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeeRecipient',
    inputs: [
      {
        name: '_feeRecipient',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setWithdrawalFee',
    inputs: [
      {
        name: '_withdrawalFee',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportedTokens',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenInfo',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'isSupported',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'receiptToken',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'totalDeposits',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'totalWithdrawals',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'maxDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'symbol',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'decimals',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateTokenLimits',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'newMinDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'newMaxDeposit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'shares',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'minAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'targetProtocol',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawalFee',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'AIBackendAuthorized',
    inputs: [
      {
        name: 'aiBackend',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AIBackendRevoked',
    inputs: [
      {
        name: 'aiBackend',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'DepositFeeUpdated',
    inputs: [
      {
        name: 'oldFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeeRecipientUpdated',
    inputs: [
      {
        name: 'oldRecipient',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'newRecipient',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenAdded',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiptToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'symbol',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenDeposit',
    inputs: [
      {
        name: 'user',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiptToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'shares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'optimizationId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'timestamp',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenLimitsUpdated',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'oldMinDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'oldMaxDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newMinDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newMaxDeposit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenRemoved',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiptToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenWithdraw',
    inputs: [
      {
        name: 'user',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiptToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'shares',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'timestamp',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalFeeUpdated',
    inputs: [
      {
        name: 'oldFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'newFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
] as const;

export const CCIP_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_router',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_linkToken',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_feeCollector',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'fallback',
    stateMutability: 'payable',
  },
  {
    type: 'receive',
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'ADMIN_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DEFAULT_ADMIN_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'EMERGENCY_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_GAS_LIMIT',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MIN_GAS_LIMIT',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SENDER_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: '_handleMessage',
    inputs: [
      {
        name: 'message',
        type: 'tuple',
        internalType: 'struct ICCIPMessenger.CrossChainMessage',
        components: [
          {
            name: 'sourceChain',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'destinationChain',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'sender',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'receiver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'data',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'token',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'messageId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'timestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowlistDestinationChain',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'ccipRouter',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'gasLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowlistSender',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'allowed',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowlistSourceChain',
    inputs: [
      {
        name: 'sourceChainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'allowed',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowlistedSenders',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowlistedSourceChains',
    inputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ccipReceive',
    inputs: [
      {
        name: 'message',
        type: 'tuple',
        internalType: 'struct Client.Any2EVMMessage',
        components: [
          {
            name: 'messageId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'sourceChainSelector',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'sender',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'data',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'destTokenAmounts',
            type: 'tuple[]',
            internalType: 'struct Client.EVMTokenAmount[]',
            components: [
              {
                name: 'token',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'chainConfigs',
    inputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    outputs: [
      {
        name: 'isSupported',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'ccipRouter',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'gasLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'allowlistEnabled',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'denylistDestinationChain',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'emergencyWithdraw',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'failedMessages',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeCollector',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeRate',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getChainConfig',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICCIPMessenger.ChainConfig',
        components: [
          {
            name: 'isSupported',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'ccipRouter',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'gasLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'allowlistEnabled',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getFee',
    inputs: [
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    outputs: [
      {
        name: 'fee',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLastMessage',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICCIPMessenger.CrossChainMessage',
        components: [
          {
            name: 'sourceChain',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'destinationChain',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'sender',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'receiver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'data',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'token',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'messageId',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'timestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMessageTypeConfig',
    inputs: [
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICCIPMessenger.MessageTypeConfig',
        components: [
          {
            name: 'gasLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'enabled',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'maxRetries',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRetryCount',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRoleAdmin',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRouter',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'grantRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'i_linkToken',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract LinkTokenInterface',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isAllowlistedSender',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSupportedChain',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'lastMessages',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'sourceChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'timestamp',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'messageTypeConfigs',
    inputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
    ],
    outputs: [
      {
        name: 'gasLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'enabled',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'maxRetries',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'processedMessages',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'callerConfirmation',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'retryCount',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'retryFailedMessage',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sendCollateralTransfer',
    inputs: [
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'lendingContract',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'loanId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'payFeesIn',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    outputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sendLoanRequest',
    inputs: [
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'lendingContract',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'collateralToken',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'borrowToken',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'collateralAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'requestedAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'maxRate',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'duration',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'payFeesIn',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    outputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sendMessage',
    inputs: [
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'receiver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'payFeesIn',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    outputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'sendYieldRebalance',
    inputs: [
      {
        name: 'destinationChain',
        type: 'uint64',
        internalType: 'uint64',
      },
      {
        name: 'yieldOptimizer',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'targetProtocol',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'payFeesIn',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    outputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'setEmergencyStop',
    inputs: [
      {
        name: 'active',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeeCollector',
    inputs: [
      {
        name: '_feeCollector',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeeRate',
    inputs: [
      {
        name: '_feeRate',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setLinkToken',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'updateMessageTypeConfig',
    inputs: [
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
      {
        name: 'gasLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'enabled',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'maxRetries',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawFees',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ChainAllowlisted',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'allowed',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EmergencyStopActivated',
    inputs: [
      {
        name: 'active',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageFailed',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'reason',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageReceived',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sourceChain',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'messageType',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ICCIPMessenger.MessageType',
      },
      {
        name: 'success',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MessageSent',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'destinationChain',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'receiver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'messageType',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ICCIPMessenger.MessageType',
      },
      {
        name: 'fees',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'payFeesIn',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ICCIPMessenger.PayFeesIn',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleAdminChanged',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'previousAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'newAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SenderAllowlisted',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'allowed',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokensReceived',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'sourceChain',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokensSent',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'destinationChain',
        type: 'uint64',
        indexed: true,
        internalType: 'uint64',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'receiver',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Unpaused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'neededRole',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },
  {
    type: 'error',
    name: 'ChainNotAllowlisted',
    inputs: [
      {
        name: 'chainSelector',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
  },
  {
    type: 'error',
    name: 'EnforcedPause',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExpectedPause',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientFee',
    inputs: [
      {
        name: 'required',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidGasLimit',
    inputs: [
      {
        name: 'gasLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidPercentage',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidRouter',
    inputs: [
      {
        name: 'router',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'MaxRetriesExceeded',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },
  {
    type: 'error',
    name: 'MessageAlreadyProcessed',
    inputs: [
      {
        name: 'messageId',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
  },
  {
    type: 'error',
    name: 'MessageTypeDisabled',
    inputs: [
      {
        name: 'messageType',
        type: 'uint8',
        internalType: 'enum ICCIPMessenger.MessageType',
      },
    ],
  },
  {
    type: 'error',
    name: 'OnlySelf',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SenderNotAllowlisted',
    inputs: [
      {
        name: 'sender',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
] as const;
