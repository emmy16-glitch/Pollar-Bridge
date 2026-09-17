import { useState } from "react";
import { api } from "../api";

export function Sender({ onCreated }: { onCreated: (id: string) => void }) {
  const [corridors, setCorridors] = useState<{ id: string }[]>([]);
  const [corridorId, setCorridorId] = useState("NG-NGN-BANK-BO-USDC");
  const [amount, setAmount] = useState("100000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setCorridors(await api.corridors(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load corridors");
    }
  }
  if (corridors.length === 0 && !error) void load();

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const t = await api.createTransfer(corridorId, Number(amount));
      onCreated(t.transferId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>1 · Sender — choose corridor, get quote, pay</h2>
      <label>
        Corridor
        <select value={corridorId} onChange={(e) => setCorridorId(e.target.value)}>
          <option value={corridorId}>{corridorId}</option>
          {corridors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount (local currency)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
      </label>
      <button onClick={submit} disabled={loading}>
        {loading ? "Creating…" : "Get quote + payment instructions"}
      </button>
      {error && <p className="err">{error}</p>}
    </section>
  );
}
