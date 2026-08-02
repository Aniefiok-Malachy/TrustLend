// ---------------------------------------------------------------------------
// TrustLend wallet layer — Reown AppKit (WalletConnect v2) + ethers v5
//
// This file is the ONLY place that talks to Reown AppKit or any wallet
// provider directly. app.js never touches window.ethereum or AppKit itself —
// it only calls the functions exposed on window.TrustLendWallet below:
//
//   await TrustLendWallet.connectWallet()
//   await TrustLendWallet.disconnectWallet()
//   TrustLendWallet.getProvider()   -> ethers.providers.Web3Provider | null
//   TrustLendWallet.getSigner()     -> ethers.Signer | null
//   TrustLendWallet.getAccount()    -> "0x..." | null
//   TrustLendWallet.getWalletName() -> "MetaMask" | "Trust Wallet" | ... | null
//   TrustLendWallet.isConnected()   -> boolean
//
// Whenever the connection state changes (connect, disconnect, account switch,
// network switch, or the auto-reconnect on page load) this file dispatches:
//
//   window.dispatchEvent(new CustomEvent("trustlend:wallet-changed"))
//
// app.js listens for that event and re-renders. It never needs to know HOW
// the wallet connected (MetaMask extension, WalletConnect QR, a mobile
// wallet's in-app browser, etc) - that's fully encapsulated here.
//
// NOTE ON PACKAGE NAMES: Reown AppKit ships fast and has renamed packages
// before (it began life as WalletConnect's "Web3Modal"). The import below
// targets @reown/appkit + @reown/appkit-adapter-ethers5, which is the
// vanilla-JS, ethers-v5-compatible adapter as of this writing. If the import
// fails after `npm install`, check https://docs.reown.com/appkit/javascript/ethers/installation
// for the current package name and update the two import lines below —
// nothing else in this file or in app.js needs to change.
// ---------------------------------------------------------------------------

import { createAppKit } from "https://esm.sh/@reown/appkit@1?bundle";
import { Ethers5Adapter } from "https://esm.sh/@reown/appkit-adapter-ethers5@1?bundle";

const NAMESPACE = "eip155"; // EVM chains, per AppKit's CAIP-2 namespace convention

// --- Build AppKit network objects from the existing NETWORKS config in config.js ---
// (config.js is loaded as a classic <script> before this module, so NETWORKS,
// CONTRACT_ADDRESS, CONTRACT_ABI, WALLETCONNECT_PROJECT_ID, APP_METADATA are
// already defined as globals by the time this file runs.)
function toAppKitNetwork(key, conf) {
  return {
    id: parseInt(conf.chainIdHex, 16),
    caipNetworkId: `${NAMESPACE}:${parseInt(conf.chainIdHex, 16)}`,
    chainNamespace: NAMESPACE,
    name: conf.chainName,
    nativeCurrency: conf.nativeCurrency,
    rpcUrls: { default: { http: conf.rpcUrls } },
    blockExplorers: { default: { name: "Explorer", url: conf.blockExplorerUrls[0] } },
  };
}

const testnetNetwork = toAppKitNetwork("testnet", NETWORKS.testnet);
const mainnetNetwork = toAppKitNetwork("mainnet", NETWORKS.mainnet);
const defaultNetwork = NETWORK === "mainnet" ? mainnetNetwork : testnetNetwork;

const ethersAdapter = new Ethers5Adapter();

const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: [testnetNetwork, mainnetNetwork],
  defaultNetwork,
  projectId: WALLETCONNECT_PROJECT_ID,
  metadata: APP_METADATA,
  features: {
    analytics: false,
  },
  // Surfaces MetaMask, Trust Wallet, Coinbase Wallet, OKX, Rabby, Rainbow, and
  // "all wallets" (WalletConnect QR / deep link) in the picker automatically.
  // Mobile deep linking into installed wallet apps is handled by AppKit/
  // WalletConnect itself - no extra code needed here.
});

// --- Internal state, kept in sync with AppKit's own subscriptions ---
let cachedProvider = null; // ethers.providers.Web3Provider
let cachedSigner = null;
let cachedAccount = null;
let cachedWalletName = null;

function notifyChange() {
  window.dispatchEvent(new CustomEvent("trustlend:wallet-changed"));
}

async function refreshFromAppKit() {
  const account = appKit.getAccount(NAMESPACE);
  const eip1193Provider = appKit.getProvider(NAMESPACE);

  if (!account || !account.isConnected || !eip1193Provider) {
    cachedProvider = null;
    cachedSigner = null;
    cachedAccount = null;
    cachedWalletName = null;
    return;
  }

  cachedProvider = new ethers.providers.Web3Provider(eip1193Provider);
  cachedSigner = cachedProvider.getSigner();
  cachedAccount = account.address;

  try {
    // getWalletInfo() reports which wallet the user picked (MetaMask, Trust
    // Wallet, Rainbow, etc) - falls back gracefully if unavailable.
    const info = appKit.getWalletInfo ? appKit.getWalletInfo() : null;
    cachedWalletName = (info && info.name) || null;
  } catch {
    cachedWalletName = null;
  }
}

// AppKit fires this on every connect / disconnect / account switch / chain
// switch, INCLUDING automatically restoring a session on page load - this is
// how "auto reconnect after refresh" and "disconnect" both get handled
// without any extra code from us.
appKit.subscribeProviders(async () => {
  await refreshFromAppKit();
  notifyChange();
});

appKit.subscribeAccount(async () => {
  await refreshFromAppKit();
  notifyChange();
});

// Populate cached state immediately in case a session is already restored
// synchronously (covers the "auto reconnect after refresh" requirement even
// before the first subscription callback fires).
refreshFromAppKit().then(notifyChange);

// --- Public API -------------------------------------------------------

async function connectWallet() {
  // Opens the wallet-selection modal (MetaMask / Trust Wallet / Coinbase /
  // OKX / Rabby / Rainbow / WalletConnect / "all wallets"). On mobile, AppKit
  // deep-links directly into an installed wallet app when the user picks one;
  // on desktop without an extension it falls back to a WalletConnect QR code.
  await appKit.open({ view: "Connect" });

  // Wait for the connection to complete (or the user to close the modal).
  await new Promise((resolve) => {
    const unsubscribe = appKit.subscribeAccount((state) => {
      if (state.isConnected) {
        unsubscribe();
        resolve();
      }
    });
    // Also resolve if the modal gets closed without connecting, so callers
    // don't hang forever.
    const unsubscribeModal = appKit.subscribeState((state) => {
      if (!state.open) {
        unsubscribeModal();
        resolve();
      }
    });
  });

  await refreshFromAppKit();
  await ensureTargetNetwork();
  notifyChange();
}

async function disconnectWallet() {
  await appKit.disconnect();
  cachedProvider = null;
  cachedSigner = null;
  cachedAccount = null;
  cachedWalletName = null;
  notifyChange();
}

async function ensureTargetNetwork() {
  // Prompts a switch to the configured network (testnet or mainnet per
  // config.js). AppKit/the wallet itself handles "network missing -> add it"
  // via wallet_addEthereumChain, using the rpcUrls/blockExplorers/currency
  // supplied in the network object above - no manual add-chain code needed.
  try {
    await appKit.switchNetwork(defaultNetwork);
  } catch (err) {
    console.warn("Could not switch network automatically:", err);
  }
}

function getProvider() {
  return cachedProvider;
}

function getSigner() {
  return cachedSigner;
}

function getAccount() {
  return cachedAccount;
}

function getWalletName() {
  return cachedWalletName;
}

function isConnected() {
  return Boolean(cachedAccount);
}

window.TrustLendWallet = {
  connectWallet,
  disconnectWallet,
  getProvider,
  getSigner,
  getAccount,
  getWalletName,
  isConnected,
};
