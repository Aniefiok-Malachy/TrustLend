# TrustLend

**A revolving, uncollateralized P2P loan pool on BNB Smart Chain.**

## The problem

Roughly 1.7 billion people worldwide are unbanked and shut out of basic services
like education because they have no money and no credit history. Most lending
requires collateral or a credit score neither of them have — and the people willing
to lend as an act of charity have no simple, low-overhead way to reach them.

## The idea

One pool, one queue. A lender funds a smart contract with a list of borrowers in
order. The first borrower gets the funds immediately. When they repay, the balance
moves automatically to the next borrower in line — no middleman, no manual transfer,
no credit check. Once the last borrower repays, the funds return to the lender.

Anyone can also add themselves — or someone else — to the end of an active queue,
and anyone can look up the full queue and see who's repaid, entirely on-chain.

## What's in this repo

```
TrustLend/
├── contract/     Solidity smart contract + Truffle project (deploy to BNB Smart Chain)
└── frontend/     Static white-and-blue web UI that connects a wallet to the contract
```

- [`contract/`](./contract) — the `TrustLend.sol` contract, Truffle migrations, and
  network config for BSC testnet/mainnet.
- [`frontend/`](./frontend) — plain HTML/CSS/JS (via ethers.js) that lets a lender
  start a round, add borrowers, and lets borrowers repay — all through MetaMask.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — step-by-step guide to deploying the contract
  and the frontend for real, from testnet through mainnet.

## Quick start

```bash
# 1. Deploy the contract (see DEPLOYMENT.md for full detail)
cd contract
npm install
cp .env.example .env   # fill in TESTNET_MNEMONIC
npm run migrate:testnet

# 2. Point the frontend at it
#    edit frontend/config.js -> CONTRACT_ADDRESS = "<address from step 1>"

# 3. Run the frontend locally
cd ../frontend
npx serve .
```

Full production deployment (testnet → mainnet, hosting the frontend, verifying on
BscScan) is covered in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## How a round moves

1. **Lender funds the pool** — sets the ordered borrower queue and sends BNB.
2. **Borrower uses the funds** — education, business, healthcare, whatever they
   described off-chain.
3. **Borrower repays** — sends funds back to the contract, then calls `repay()`.
4. **Next borrower is funded** — the queue advances automatically.
5. **Balance returns to the lender** once the queue is exhausted.

## Status

Contract logic is unchanged from the original hackathon build (only renamed, with
events added for the frontend to listen to). It has **not been audited** — see
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for a pre-mainnet checklist before using it with
real funds.
