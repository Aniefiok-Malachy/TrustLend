require("dotenv").config();

/**
 * TrustLend Truffle configuration.
 *
 * Networks:
 *  - development: local Ganache/Hardhat node for testing
 *  - testnet:     BNB Smart Chain testnet (chain id 97) - use this first
 *  - bsc:         BNB Smart Chain mainnet (chain id 56) - real funds, deploy last
 *
 * Requires a .env file (copy .env.example -> .env) with:
 *   TESTNET_MNEMONIC="your twelve word seed phrase"
 *   MAINNET_MNEMONIC="your twelve word seed phrase"
 */
const HDWalletProvider = require("@truffle/hdwallet-provider");

const testnetMnemonic = process.env.TESTNET_MNEMONIC;
const mainnetMnemonic = process.env.MAINNET_MNEMONIC;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    testnet: {
      provider: () =>
        new HDWalletProvider(
          testnetMnemonic,
          "https://data-seed-prebsc-1-s1.binance.org:8545"
        ),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    bsc: {
      provider: () =>
        new HDWalletProvider(
          mainnetMnemonic,
          "https://bsc-dataseed1.binance.org"
        ),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
  mocha: {
    // timeout: 100000
  },
  compilers: {
    solc: {
      version: "0.5.8",
    },
  },
};
