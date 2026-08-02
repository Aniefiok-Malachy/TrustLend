/* TrustLend frontend logic.
 * Talks to the TrustLend contract described in config.js using ethers.js.
 * All wallet connection/detection lives in wallet.js — this file only calls
 * the TrustLendWallet API (connectWallet, disconnectWallet, getProvider,
 * getSigner, getAccount, getWalletName, isConnected) and reacts to the
 * "trustlend:wallet-changed" event it dispatches. Nothing here touches
 * window.ethereum directly.
 */

const els = {
  connectBtn: document.getElementById("connect-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIcon: document.getElementById("theme-icon"),
  explorerLink: document.getElementById("explorer-link"),
  explorerLink2: document.getElementById("explorer-link-2"),
  footerNetwork: document.getElementById("footer-network"),

  statAmount: document.getElementById("stat-amount"),
  statRound: document.getElementById("stat-round"),
  statIndex: document.getElementById("stat-index"),
  statCount: document.getElementById("stat-count"),
  statStatus: document.getElementById("stat-status"),
  statusDot: document.getElementById("status-dot"),
  statContract: document.getElementById("stat-contract"),

  walletCard: document.getElementById("wallet-card"),
  walletName: document.getElementById("wallet-name"),
  walletAddr: document.getElementById("wallet-addr"),
  walletNetwork: document.getElementById("wallet-network"),
  walletBalance: document.getElementById("wallet-balance"),

  ringIndex: document.getElementById("ring-index"),
  ringTotal: document.getElementById("ring-total"),
  ringLenderAddr: document.getElementById("ring-lender-addr"),
  ringNodes: document.getElementById("ring-nodes"),

  timelineList: document.getElementById("timeline-list"),
  borrowerCards: document.getElementById("borrower-cards"),

  refreshBtn: document.getElementById("refresh-btn"),

  lendBorrowers: document.getElementById("lend-borrowers"),
  lendAmount: document.getElementById("lend-amount"),
  lendBtn: document.getElementById("lend-btn"),
  lendStatus: document.getElementById("lend-status"),

  addBorrowerAddress: document.getElementById("add-borrower-address"),
  addBorrowerBtn: document.getElementById("add-borrower-btn"),
  addBorrowerStatus: document.getElementById("add-borrower-status"),

  repayBtn: document.getElementById("repay-btn"),
  repayStatus: document.getElementById("repay-status"),

  toast: document.getElementById("toast"),
};

const netConf = NETWORKS[NETWORK];

// The one place app.js builds a contract instance — always from whatever
// signer wallet.js currently has, never from window.ethereum directly.
function getWritableContract() {
  const signer = TrustLendWallet.getSigner();
  if (!signer) return null;
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/* -------------------- theme -------------------- */

function initTheme() {
  const saved = "dark";
  document.documentElement.setAttribute("data-theme", saved);
  els.themeIcon.textContent = saved === "dark" ? "🌙" : "☀️";
}

els.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  els.themeIcon.textContent = next === "dark" ? "🌙" : "☀️";
});

/* -------------------- static UI -------------------- */

function initStaticUI() {
  const explorerUrl = `${netConf.blockExplorerUrls[0]}/address/${CONTRACT_ADDRESS}`;
  els.explorerLink.href = explorerUrl;
  els.explorerLink2.href = explorerUrl;
  els.footerNetwork.textContent = `${netConf.chainName} · ${CONTRACT_ADDRESS}`;
  els.statContract.textContent = shortAddr(CONTRACT_ADDRESS);
  els.statContract.href = explorerUrl;
}

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.style.borderColor = isError ? "var(--danger)" : "var(--line)";
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 4200);
}

function setStatus(el, message, kind) {
  el.textContent = message;
  el.className = "status" + (kind ? " " + kind : "");
}

/* -------------------- wallet card -------------------- */

async function renderWalletCard() {
  const disconnectedRow = els.walletCard.querySelector(".wallet-disconnected");
  const connectedRow = els.walletCard.querySelector(".wallet-connected");

  const account = TrustLendWallet.getAccount();
  const provider = TrustLendWallet.getProvider();

  if (!account || !provider) {
    disconnectedRow.hidden = false;
    connectedRow.hidden = true;
    return;
  }

  const walletName = TrustLendWallet.getWalletName();
  els.walletName.textContent = walletName ? `${walletName} Connected` : "Wallet Connected";
  els.walletAddr.textContent = shortAddr(account);
  els.walletNetwork.textContent = netConf.chainName;

  try {
    const balance = await provider.getBalance(account);
    els.walletBalance.textContent = `${Number(ethers.utils.formatEther(balance)).toFixed(4)} ${netConf.nativeCurrency.symbol}`;
  } catch {
    els.walletBalance.textContent = "—";
  }

  disconnectedRow.hidden = true;
  connectedRow.hidden = false;
}

/* -------------------- reads -------------------- */

async function loadContractState() {
  try {
    // Read-only calls work even with no wallet connected — fall back to a
    // public RPC provider so stats load before any wallet connects.
    const provider =
      TrustLendWallet.getProvider() || new ethers.providers.JsonRpcProvider(netConf.rpcUrls[0]);
    const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const [lender, amount, index, borrowers] = await Promise.all([
      readContract.lender(),
      readContract.getAmount(),
      readContract.getIndex(),
      readContract.getBorrowers(),
    ]);

    els.statAmount.textContent = `${ethers.utils.formatEther(amount)} ${netConf.nativeCurrency.symbol}`;
    els.statRound.textContent = borrowers.length ? "current round" : "no round funded yet";
    els.statIndex.textContent = borrowers.length ? `${index} / ${borrowers.length - 1}` : "—";
    els.statCount.textContent = String(borrowers.length);

    const roundActive = borrowers.length > 0 && index < borrowers.length;
    els.statStatus.textContent = borrowers.length === 0 ? "Idle" : roundActive ? "Active" : "Settled";
    els.statusDot.className = "status-dot" + (roundActive ? " active" : borrowers.length ? "" : " idle");

    renderRing(lender, index, borrowers);
    renderTimeline(index, borrowers);
    renderBorrowerCards(index, borrowers);

    const account = TrustLendWallet.getAccount();
    const isLender = account && lender.toLowerCase() === account.toLowerCase();
    els.lendBtn.disabled = !account || !isLender;
    els.addBorrowerBtn.disabled = !account || !isLender;
    els.repayBtn.disabled = !account;
  } catch (err) {
    console.error(err);
    showToast("Couldn't load contract state. Check CONTRACT_ADDRESS in config.js.", true);
  }
}

function renderRing(lender, index, borrowers) {
  els.ringLenderAddr.textContent = shortAddr(lender);
  els.ringIndex.textContent = String(index);
  els.ringTotal.textContent = String(borrowers.length);

  els.ringNodes.innerHTML = "";
  const total = borrowers.length;
  if (total === 0) return;

  const cx = 180, cy = 180, r = 150;
  borrowers.forEach((addr, i) => {
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let cls = "ring-node";
    if (i < index) cls += " filled";
    if (i === index) cls += " active";
    g.setAttribute("class", cls);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 20);
    g.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y + 3);
    text.textContent = String(i + 1);
    g.appendChild(text);

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = addr;
    g.appendChild(title);

    els.ringNodes.appendChild(g);
  });
}

function renderTimeline(index, borrowers) {
  els.timelineList.innerHTML = "";
  if (!borrowers.length) {
    els.timelineList.innerHTML = `<li class="queue-empty">No round funded yet — the queue is empty.</li>`;
    return;
  }

  borrowers.forEach((addr, i) => {
    const li = document.createElement("li");
    let dotClass = "timeline-dot";
    let label = "Waiting";
    if (i < index) { dotClass += " paid"; label = "Repaid"; }
    if (i === index) { dotClass += " active"; label = "Currently funded"; }

    li.innerHTML = `
      <span class="${dotClass}"></span>
      <span class="timeline-addr">${shortAddr(addr)}</span>
      <span class="timeline-state">${label}</span>
    `;
    els.timelineList.appendChild(li);
  });
}

function renderBorrowerCards(index, borrowers) {
  els.borrowerCards.innerHTML = "";
  if (!borrowers.length) {
    els.borrowerCards.innerHTML = `<div class="glass-card borrower-card empty-card">No round funded yet.</div>`;
    return;
  }

  borrowers.forEach((addr, i) => {
    let statusClass = "waiting", statusLabel = "Waiting", progress = 0;
    if (i < index) { statusClass = "repaid"; statusLabel = "Repaid"; progress = 100; }
    if (i === index) { statusClass = "funded"; statusLabel = "Funded"; progress = 55; }

    const card = document.createElement("div");
    card.className = "glass-card borrower-card";
    card.innerHTML = `
      <div class="bc-top">👤 Borrower #${i + 1}</div>
      <span class="bc-addr mono">${shortAddr(addr)}</span>
      <span class="bc-status ${statusClass}">${statusLabel}</span>
      <div class="bc-progress"><div class="bc-progress-fill" style="width:${progress}%"></div></div>
    `;
    els.borrowerCards.appendChild(card);
  });
}

/* -------------------- writes -------------------- */

async function handleLend() {
  const contract = getWritableContract();
  if (!contract) return showToast("Connect your wallet first.", true);

  const rawAddrs = els.lendBorrowers.value.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!rawAddrs.length) return setStatus(els.lendStatus, "Add at least one borrower address.", "err");
  for (const a of rawAddrs) {
    if (!ethers.utils.isAddress(a)) return setStatus(els.lendStatus, `"${a}" is not a valid address.`, "err");
  }

  const amountStr = els.lendAmount.value.trim();
  if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
    return setStatus(els.lendStatus, "Enter a valid BNB amount.", "err");
  }

  try {
    setStatus(els.lendStatus, "Confirm the transaction in your wallet…");
    els.lendBtn.disabled = true;
    const tx = await contract.lend(rawAddrs, { value: ethers.utils.parseEther(amountStr) });
    setStatus(els.lendStatus, "Transaction submitted, waiting for confirmation…");
    await tx.wait();
    setStatus(els.lendStatus, "Pool funded — the queue is live.", "ok");
    showToast("Round started.");
    await loadContractState();
  } catch (err) {
    console.error(err);
    setStatus(els.lendStatus, err.reason || err.message || "Transaction failed.", "err");
  } finally {
    els.lendBtn.disabled = false;
  }
}

async function handleAddBorrower() {
  const contract = getWritableContract();
  if (!contract) return showToast("Connect your wallet first.", true);

  const addr = els.addBorrowerAddress.value.trim();
  if (!ethers.utils.isAddress(addr)) return setStatus(els.addBorrowerStatus, "Enter a valid address.", "err");

  try {
    setStatus(els.addBorrowerStatus, "Confirm the transaction in your wallet…");
    els.addBorrowerBtn.disabled = true;
    const tx = await contract.addBorrower(addr);
    setStatus(els.addBorrowerStatus, "Transaction submitted, waiting for confirmation…");
    await tx.wait();
    setStatus(els.addBorrowerStatus, "Borrower added to the queue.", "ok");
    els.addBorrowerAddress.value = "";
    await loadContractState();
  } catch (err) {
    console.error(err);
    setStatus(els.addBorrowerStatus, err.reason || err.message || "Transaction failed.", "err");
  } finally {
    els.addBorrowerBtn.disabled = false;
  }
}

async function handleRepay() {
  const contract = getWritableContract();
  if (!contract) return showToast("Connect your wallet first.", true);

  try {
    setStatus(els.repayStatus, "Confirm the transaction in your wallet…");
    els.repayBtn.disabled = true;
    const tx = await contract.repay();
    setStatus(els.repayStatus, "Transaction submitted, waiting for confirmation…");
    await tx.wait();
    setStatus(els.repayStatus, "Repaid — queue advanced.", "ok");
    await loadContractState();
  } catch (err) {
    console.error(err);
    setStatus(els.repayStatus, err.reason || err.message || "Transaction failed.", "err");
  } finally {
    els.repayBtn.disabled = false;
  }
}

/* -------------------- wallet buttons -------------------- */

async function handleConnectClick() {
  try {
    await TrustLendWallet.connectWallet();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not connect wallet.", true);
  }
}

async function handleDisconnectClick() {
  try {
    await TrustLendWallet.disconnectWallet();
    showToast("Wallet disconnected.");
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not disconnect wallet.", true);
  }
}

/* -------------------- wire up -------------------- */

els.connectBtn.addEventListener("click", handleConnectClick);
els.walletCard.querySelector(".wallet-connect-btn").addEventListener("click", handleConnectClick);
els.walletCard.querySelector(".wallet-disconnect-btn").addEventListener("click", handleDisconnectClick);
els.refreshBtn.addEventListener("click", loadContractState);
els.lendBtn.addEventListener("click", handleLend);
els.addBorrowerBtn.addEventListener("click", handleAddBorrower);
els.repayBtn.addEventListener("click", handleRepay);

// wallet.js dispatches this on connect, disconnect, account switch, network
// switch, AND on auto-reconnect after a page refresh — one handler covers
// every case.
window.addEventListener("trustlend:wallet-changed", async () => {
  const connected = TrustLendWallet.isConnected();
  els.connectBtn.textContent = connected ? shortAddr(TrustLendWallet.getAccount()) : "Connect Wallet";
  els.connectBtn.classList.toggle("btn-gradient", !connected);
  els.connectBtn.classList.toggle("btn-glass", connected);

  await renderWalletCard();
  await loadContractState();
});

initTheme();
initStaticUI();
loadContractState();
