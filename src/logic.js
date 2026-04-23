export function computeBalances(members, expenses, payments) {
  const bal = {};
  members.forEach(m => bal[m] = 0);
  expenses.forEach(exp => {
    const parts = exp.participants?.length > 0 ? exp.participants : members;
    let shares = {};

    if (exp.splitMode === "exact" && exp.shares && Object.keys(exp.shares).length > 0) {
      shares = { ...exp.shares };
    } else if (exp.splitMode === "proportional" && exp.shares && Object.keys(exp.shares).length > 0) {
      const total = Object.values(exp.shares).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (total > 0) {
        Object.entries(exp.shares).forEach(([uid, pct]) => {
          shares[uid] = exp.amount * ((parseFloat(pct) || 0) / total);
        });
      }
    } else {
      const share = exp.amount / parts.length;
      parts.forEach(uid => { shares[uid] = share; });
    }

    bal[exp.payer] = (bal[exp.payer] || 0) + exp.amount;
    Object.entries(shares).forEach(([uid, amt]) => {
      bal[uid] = (bal[uid] || 0) - (parseFloat(amt) || 0);
    });
  });
  (payments || []).forEach(p => {
    bal[p.from] = (bal[p.from] || 0) + p.amount;
    bal[p.to]   = (bal[p.to]   || 0) - p.amount;
  });
  return bal;
}

export function computeCrossGroupNetting(groups) {
  const date = new Date().toLocaleDateString("de-DE");
  const groupTxs = groups.map(g => ({
    id: g.id,
    txs: computeTransactions(computeBalances(g.members, g.expenses, g.payments))
  }));

  const remaining = {};
  groupTxs.forEach(({ id, txs }) => txs.forEach((tx, idx) => { remaining[`${id}-${idx}`] = tx.amt; }));

  const added = {};
  groups.forEach(g => { added[g.id] = []; });

  for (let i = 0; i < groupTxs.length; i++) {
    for (let ti = 0; ti < groupTxs[i].txs.length; ti++) {
      const tx1 = groupTxs[i].txs[ti];
      const k1 = `${groupTxs[i].id}-${ti}`;
      if (remaining[k1] <= 0.005) continue;
      for (let j = i + 1; j < groupTxs.length; j++) {
        for (let tj = 0; tj < groupTxs[j].txs.length; tj++) {
          const tx2 = groupTxs[j].txs[tj];
          const k2 = `${groupTxs[j].id}-${tj}`;
          if (remaining[k2] <= 0.005) continue;
          if (tx1.from === tx2.to && tx1.to === tx2.from) {
            const amt = Math.min(remaining[k1], remaining[k2]);
            if (amt > 0.005) {
              remaining[k1] -= amt;
              remaining[k2] -= amt;
              const mkId = () => `netting-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              added[groupTxs[i].id].push({ id: mkId(), from: tx1.from, to: tx1.to, amount: amt, date, type: "netting" });
              added[groupTxs[j].id].push({ id: mkId(), from: tx2.from, to: tx2.to, amount: amt, date, type: "netting" });
            }
          }
        }
      }
    }
  }

  return groups.filter(g => added[g.id].length > 0).map(g => ({ ...g, payments: [...g.payments, ...added[g.id]] }));
}

export function computeTransactions(balances) {
  const d = [], c = [];
  Object.entries(balances).forEach(([id, v]) => {
    if (v > 0.005) c.push({ id, amt: v });
    else if (v < -0.005) d.push({ id, amt: -v });
  });
  c.sort((a, b) => b.amt - a.amt);
  d.sort((a, b) => b.amt - a.amt);
  const txs = []; let ci = 0, di = 0;
  while (ci < c.length && di < d.length) {
    const amt = Math.min(c[ci].amt, d[di].amt);
    txs.push({ from: d[di].id, to: c[ci].id, amt });
    c[ci].amt -= amt; d[di].amt -= amt;
    if (c[ci].amt < 0.005) ci++;
    if (d[di].amt < 0.005) di++;
  }
  return txs;
}
