import { useState } from "react";
import { BRAND } from "../constants";
import { Card, SectionLabel, ToggleBtn, Inp, PrimaryBtn } from "../ui";

export default function ManualPayment({ members, getName, onSave }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const save = () => {
    const amt = parseFloat(amount.replace(",", "."));
    if (!from || !to || from === to || isNaN(amt) || amt <= 0) return;
    onSave(from, to, amt);
    setFrom(""); setTo(""); setAmount(""); setOpen(false);
  };

  if (members.length < 2) return null;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{ marginBottom: "1rem", padding: "8px 18px", borderRadius: 9, border: `1.5px solid ${BRAND}`, background: open ? "var(--brand-a10)" : "transparent", color: BRAND, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        {open ? "Abbrechen" : "+ Zahlung manuell eintragen"}
      </button>
      {open && (
        <Card style={{ padding: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div><SectionLabel>Von (zahlt)</SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{members.map(uid => <ToggleBtn key={uid} active={from === uid} onClick={() => setFrom(f => f === uid ? "" : uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
            <div><SectionLabel>An (empfängt)</SectionLabel><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{members.filter(uid => uid !== from).map(uid => <ToggleBtn key={uid} active={to === uid} onClick={() => setTo(t => t === uid ? "" : uid)}>{getName(uid)}</ToggleBtn>)}</div></div>
            <Inp placeholder="Betrag (€)" value={amount} onChange={e => setAmount(e.target.value)} />
            <PrimaryBtn onClick={save} disabled={!from || !to || !amount} full>Speichern</PrimaryBtn>
          </div>
        </Card>
      )}
    </div>
  );
}
