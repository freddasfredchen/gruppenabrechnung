export function computeBalances(members, expenses, payments) {
  const bal = {};
  members.forEach(m => bal[m] = 0);
  expenses.forEach(exp => {
    const parts = exp.participants.length > 0 ? exp.participants : members;
    const share = exp.amount / parts.length;
    bal[exp.payer] = (bal[exp.payer] || 0) + exp.amount;
    parts.forEach(uid => { bal[uid] = (bal[uid] || 0) - share; });
  });
  (payments || []).forEach(p => {
    bal[p.from] = (bal[p.from] || 0) + p.amount;
    bal[p.to]   = (bal[p.to]   || 0) - p.amount;
  });
  return bal;
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
