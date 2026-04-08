import { useState, useEffect } from "react";

const fmtUSD = n => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function fetchPayments(firstName, lastName) {
  const where = `covered_recipient_last_name='${lastName}' AND covered_recipient_first_name='${firstName}'`;
  const select = [
    "applicable_manufacturer_or_applicable_gpo_making_payment_name",
    "total_amount_of_payment_usdollars",
    "nature_of_payment_or_transfer_of_value",
  ].join(",");

  const url = `https://openpaymentsdata.cms.gov/resource/5ia3-vtt7.json?$where=${encodeURIComponent(where)}&$select=${encodeURIComponent(select)}&$limit=5000`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

function aggregatePayments(records) {
  const map = {};
  records.forEach(r => {
    const co  = r.applicable_manufacturer_or_applicable_gpo_making_payment_name || "Unknown";
    const amt = parseFloat(r.total_amount_of_payment_usdollars) || 0;
    if (!map[co]) map[co] = { company: co, total: 0, count: 0, natures: {} };
    map[co].total += amt;
    map[co].count += 1;
    const nat = r.nature_of_payment_or_transfer_of_value || "Other";
    map[co].natures[nat] = (map[co].natures[nat] || 0) + amt;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export default function PaymentPanel({ doctor, onClose }) {
  const [status, setStatus]   = useState("loading");
  const [payments, setPayments] = useState([]);
  const [expandedCo, setExpandedCo] = useState(null);

  useEffect(() => {
    setStatus("loading");
    setPayments([]);
    const parts     = doctor.trim().split(" ");
    const firstName = parts[0];
    const lastName  = parts.slice(1).join(" ");
    fetchPayments(firstName, lastName)
      .then(records => { setPayments(aggregatePayments(records)); setStatus("done"); })
      .catch(() => setStatus("error"));
  }, [doctor]);

  const totalAll = payments.reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "18px 20px", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0369a1" }}>💰 CMS Open Payments — {doctor}</span>
          {status === "done" && (
            <span style={{ marginLeft: 10, fontSize: 12, color: "#64748b" }}>
              {payments.length} companies · {fmtUSD(totalAll)} total
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>✕ Close</button>
      </div>

      {status === "loading" && <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>⏳ Fetching from CMS Open Payments…</div>}
      {status === "error"   && <div style={{ textAlign: "center", padding: "16px 0", color: "#991b1b", fontSize: 13 }}>⚠️ Could not load payment data. Check your connection.</div>}
      {status === "done" && payments.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 13 }}>No payment records found for this doctor in the 2024 dataset.</div>}

      {status === "done" && payments.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#e0f2fe" }}>
                <th style={{ padding: "8px 12px", textAlign: "left",  color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Company</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}># Payments</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Total Received</th>
                <th style={{ padding: "8px 12px", textAlign: "center",color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <>
                  <tr key={p.company} style={{ borderTop: "1px solid #bae6fd", background: i % 2 === 0 ? "#fff" : "#f0f9ff" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>{p.company}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "#64748b" }}>{p.count}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#0369a1" }}>{fmtUSD(p.total)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <button onClick={() => setExpandedCo(expandedCo === p.company ? null : p.company)}
                        style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 11, color: "#0369a1", fontWeight: 600 }}>
                        {expandedCo === p.company ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {expandedCo === p.company && (
                    <tr key={p.company + "_exp"} style={{ background: "#f8fafc" }}>
                      <td colSpan={4} style={{ padding: "8px 12px 12px 28px" }}>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>Payment Types</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(p.natures).sort((a, b) => b[1] - a[1]).map(([nat, amt]) => (
                            <div key={nat} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
                              <span style={{ color: "#64748b" }}>{nat}: </span>
                              <span style={{ fontWeight: 700, color: "#0369a1" }}>{fmtUSD(amt)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}