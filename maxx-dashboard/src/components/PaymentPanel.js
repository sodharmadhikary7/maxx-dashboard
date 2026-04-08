import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const fmtUSD = n => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentPanel({ doctor, onClose }) {
  const [status,     setStatus]     = useState("loading");
  const [payments,   setPayments]   = useState([]);
  const [yearFilter, setYearFilter] = useState("All");
  const [expandedCo, setExpandedCo] = useState(null);

  useEffect(() => {
    setStatus("loading");
    setPayments([]);
    setExpandedCo(null);

    const parts     = doctor.trim().split(" ");
    const firstName = parts[0].toUpperCase();
    const lastName  = parts.slice(1).join(" ").toUpperCase();

    let q = supabase
      .from("doctor_payments")
      .select("company, nature, total_payments, num_payments, year")
      .eq("last_name",  lastName)
      .eq("first_name", firstName)
      .order("total_payments", { ascending: false });

    q.then(({ data, error }) => {
      if (error) { setStatus("error"); return; }
      setPayments(data || []);
      setStatus("done");
    });
  }, [doctor]);

  // Filter by year client-side
  const filtered = yearFilter === "All"
    ? payments
    : payments.filter(p => p.year === parseInt(yearFilter));

  // Group by company
  const byCompany = {};
  filtered.forEach(p => {
    if (!byCompany[p.company]) byCompany[p.company] = { company: p.company, total: 0, count: 0, natures: {} };
    byCompany[p.company].total += p.total_payments || 0;
    byCompany[p.company].count += p.num_payments || 0;
    const nat = p.nature || "Other";
    byCompany[p.company].natures[nat] = (byCompany[p.company].natures[nat] || 0) + (p.total_payments || 0);
  });
  const companies = Object.values(byCompany).sort((a, b) => b.total - a.total);
  const totalAll  = companies.reduce((s, c) => s + c.total, 0);

  const availableYears = [...new Set(payments.map(p => p.year))].filter(Boolean).sort((a,b) => b - a);

  const TabBtn = ({ val, label }) => (
    <button onClick={() => setYearFilter(val)} style={{
      padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: "1.5px solid",
      background: yearFilter === val ? "#0369a1" : "#fff",
      color: yearFilter === val ? "#fff" : "#0369a1",
      borderColor: "#0369a1",
    }}>{label}</button>
  );

  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "18px 20px", marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0369a1" }}>💰 CMS Open Payments — {doctor}</span>
          {status === "done" && (
            <span style={{ marginLeft: 10, fontSize: 12, color: "#64748b" }}>
              {companies.length} companies · {fmtUSD(totalAll)} total
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>✕ Close</button>
      </div>

      {/* Year filter */}
      {status === "done" && availableYears.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <TabBtn val="All" label="All Years" />
          {availableYears.map(y => <TabBtn key={y} val={String(y)} label={String(y)} />)}
        </div>
      )}

      {status === "loading" && <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>⏳ Loading payment data…</div>}
      {status === "error"   && <div style={{ textAlign: "center", padding: "16px 0", color: "#991b1b", fontSize: 13 }}>⚠️ Could not load payment data.</div>}
      {status === "done" && companies.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 13 }}>No payment records found for this doctor.</div>}

      {status === "done" && companies.length > 0 && (
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#e0f2fe" }}>
                <th style={{ padding: "8px 12px", textAlign: "left",  color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Company</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}># Payments</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Total</th>
                <th style={{ padding: "8px 12px", textAlign: "center",color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>By Type</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((co, i) => (
                <>
                  <tr key={co.company} style={{ borderTop: "1px solid #bae6fd", background: i % 2 === 0 ? "#fff" : "#f0f9ff" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>{co.company}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: "#64748b" }}>{co.count}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#0369a1" }}>{fmtUSD(co.total)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <button onClick={() => setExpandedCo(expandedCo === co.company ? null : co.company)}
                        style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 11, color: "#0369a1", fontWeight: 600 }}>
                        {expandedCo === co.company ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {expandedCo === co.company && (
                    <tr key={co.company + "_exp"} style={{ background: "#f8fafc" }}>
                      <td colSpan={4} style={{ padding: "8px 12px 12px 28px" }}>
                        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>Payment Types</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(co.natures).sort((a, b) => b[1] - a[1]).map(([nat, amt]) => (
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