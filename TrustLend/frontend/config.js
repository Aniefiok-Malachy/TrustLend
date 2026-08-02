// ---------------------------------------------------------------------------
// TrustLend frontend config
//
// This is the ONLY file you need to edit to point the frontend at your
// deployed contract. Fill in CONTRACT_ADDRESS after you run
// `npm run migrate:testnet` (or `migrate:mainnet`) inside /contract.
// ---------------------------------------------------------------------------

// Get a free Project ID at https://cloud.reown.com (formerly cloud.walletconnect.com).
// Required for WalletConnect / Reown AppKit to work at all - without it, the
// wallet-selection modal will refuse to open.
const WALLETCONNECT_PROJECT_ID = "b03066e264e7743ea510fd0da27f3ccf";

// Shown inside wallet apps during the connection request (WalletConnect deep
// link screens, mobile wallet prompts, etc). Update the url/icon for your
// real deployment domain before going to production.
const APP_METADATA = {
  name: "TrustLend",
  description: "Decentralized, uncollateralized peer-to-peer lending pool",
  url: "http://127.0.0.1:5500", // must match the deployed origin
  icons: ["https://your-trustlend-domain.example/icon.png"],
};

// Address Truffle prints after a successful migration, e.g. "0x1234...".
const CONTRACT_ADDRESS = "0x19f4DaE018C8DD472A9BdA53c4Ba24638220b821";

// Which BNB Smart Chain network the address above was deployed to.
// "testnet" = BSC Testnet (chain id 97)   -> use this while building/testing
// "mainnet" = BNB Smart Chain (chain id 56) -> real funds, deploy last
const NETWORK = "testnet";

const NETWORKS = {
  testnet: {
    chainIdHex: "0x61", // 97
    chainName: "BNB Smart Chain Testnet",
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    blockExplorerUrls: ["https://testnet.bscscan.com"],
  },
  mainnet: {
    chainIdHex: "0x38", // 56
    chainName: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed1.binance.org"],
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorerUrls: ["https://bscscan.com"],
  },
};

const CONTRACT_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "lender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "borrowerCount", "type": "uint256" }
    ],
    "name": "Lent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "previousIndex", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "nextRecipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Repaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "borrower", "type": "address" }
    ],
    "name": "BorrowerAdded",
    "type": "event"
  },
  { "constant": true, "inputs": [], "name": "amount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "borrowers", "outputs": [{ "internalType": "address payable", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [], "name": "index", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [], "name": "lender", "outputs": [{ "internalType": "address payable", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{ "internalType": "address payable[]", "name": "initialBorrowers", "type": "address[]" }], "name": "lend", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" },
  { "constant": false, "inputs": [], "name": "repay", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" },
  { "constant": false, "inputs": [{ "internalType": "address payable", "name": "borrower", "type": "address" }], "name": "addBorrower", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" },
  { "constant": true, "inputs": [], "name": "getBorrowers", "outputs": [{ "internalType": "address payable[]", "name": "", "type": "address[]" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [], "name": "getAmount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [], "name": "getIndex", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }
];
