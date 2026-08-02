# Deploying TrustLend for real

TrustLend has two independent halves that both need to go live:

1. **The smart contract** — deployed once to BNB Smart Chain. This is what actually
   holds and moves funds.
2. **The frontend** — a static website that talks to the contract from the user's
   browser via their wallet. It never touches your funds directly.

Do the contract first, then point the frontend at it.

---

## Part 0 — Before you touch mainnet

This contract moves real money with **no owner-controlled pause switch, no upgrade
path, and no external audit**. Treat testnet as mandatory, not optional:

- Deploy to testnet first and run every action (`lend`, `addBorrower`, `repay`) at
  least once.
- Keep round sizes small until you've watched a few full cycles complete.
- Consider a professional audit before real users send meaningful amounts — this
  code came out of a hackathon, not a security review.
- Use a **dedicated deployment wallet**, separate from any wallet holding your own
  funds, and never commit its seed phrase anywhere.

---

## Part 1 — Deploy the smart contract

### 1. Install prerequisites

- [Node.js](https://nodejs.org) 18 or later
- A wallet (e.g. [MetaMask](https://metamask.io)) — create a **fresh wallet just for
  deploying**, don't reuse your personal one

```bash
cd contract
npm install
```

### 2. Get testnet BNB

1. In MetaMask, add BNB Smart Chain Testnet (the frontend can do this for you
   automatically the first time you connect — see Part 2 — or add it manually:
   RPC `https://data-seed-prebsc-1-s1.binance.org:8545`, chain ID `97`).
2. Copy your deployment wallet's address.
3. Request free test BNB from the [BNB Chain testnet faucet](https://testnet.bnbchain.org/faucet-smart).

### 3. Configure your environment

```bash
cp .env.example .env
```

Open `.env` and paste your deployment wallet's 12-word seed phrase into
`TESTNET_MNEMONIC`. This file is already listed in `.gitignore` — double check it
never gets committed.

### 4. Deploy to testnet

```bash
npm run migrate:testnet
```

Truffle will print something like:

```
TrustLend
   contract address:    0xAbCdEf1234567890...
```

**Copy that address.** You'll need it for the frontend.

### 5. Verify the contract on BscScan (optional but recommended)

Verifying lets anyone read your contract's source code on
[testnet.bscscan.com](https://testnet.bscscan.com), which builds trust with lenders
and borrowers who don't want to take your word for what the contract does.

1. Go to your contract's address on BscScan testnet.
2. Click **Contract → Verify and Publish**.
3. Choose compiler version `0.5.8`, license, single file, and paste in the contents
   of `contract/contracts/TrustLend.sol`.

### 6. Test a full cycle on testnet

Using the frontend (Part 2) or `npm run console:testnet`:

1. `lend([borrowerA, borrowerB])` with a small amount from the lender wallet.
2. Confirm `borrowerA` received the funds.
3. From `borrowerA`'s wallet, send funds back to the contract address, then call
   `repay()`.
4. Confirm `borrowerB` received the funds and `getIndex()` incremented.
5. Repeat until the queue empties and funds return to the lender.

### 7. Deploy to mainnet

Only after step 6 works cleanly:

1. Add `MAINNET_MNEMONIC` to `.env` (can be the same wallet, or a separate one).
2. Fund that wallet with a small amount of real BNB for gas.
3. Run:

```bash
npm run migrate:mainnet
```

4. Copy the new mainnet contract address — it's different from the testnet one.
5. Verify it on [bscscan.com](https://bscscan.com) the same way as step 5.

---

## Part 2 — Connect and deploy the frontend

The frontend is a static site (`index.html` + `style.css` + `app.js` +
`config.js`) — no build step, no server required.

### 1. Point it at your contract

Open `frontend/config.js` and set:

```js
const CONTRACT_ADDRESS = "0xAbCdEf1234567890..."; // from Part 1
const NETWORK = "testnet"; // or "mainnet" once you deploy there
```

That's the only file that needs to change.

### 2. Test it locally

Any static file server works. From the `frontend` folder:

```bash
npx serve .
# or: python3 -m http.server 8080
```

Open the printed URL, click **Connect wallet**, and confirm the stats panel loads
your contract's real data.

### 3. Deploy the frontend for real

Pick one — all are free for a static site like this.

**Netlify (drag-and-drop, easiest)**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the `frontend` folder in.
3. Netlify gives you a live URL immediately. Add a custom domain under
   **Site settings → Domain management** if you have one.

**Vercel**
```bash
npm i -g vercel
cd frontend
vercel --prod
```

**GitHub Pages**
1. Push this repo to GitHub.
2. In **Settings → Pages**, set the source to the `frontend` folder on your main
   branch.
3. GitHub publishes it at `https://<username>.github.io/<repo>/`.

Any of these works equally well — pick whichever you're already using.

### 4. Switch the frontend to mainnet

When you're ready to go live for real:

1. Update `frontend/config.js`: `NETWORK = "mainnet"` and the mainnet
   `CONTRACT_ADDRESS`.
2. Redeploy using whichever method you picked above (Netlify/Vercel auto-redeploy
   on push if connected to a repo; otherwise just re-drag or re-run the deploy
   command).

---

## Post-launch checklist

- [ ] Contract deployed to testnet and a full lend → repay cycle tested
- [ ] Contract verified on BscScan (testnet)
- [ ] Contract deployed to mainnet from a funded deployment wallet
- [ ] Contract verified on BscScan (mainnet)
- [ ] `frontend/config.js` points at the mainnet address with `NETWORK = "mainnet"`
- [ ] Frontend deployed and reachable at a public URL
- [ ] `.env` was never committed to git (check `git log --all --full-history -- contract/.env`)
- [ ] You've told your first lender and borrower to double check the contract
      address against BscScan before sending funds
