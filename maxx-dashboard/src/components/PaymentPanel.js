import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const fmtUSD = n => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentPanel({ doctor, onClose }) {
  const [open, setOpen] = useState(!!onClose); // inline mode starts open; standalone starts closed
  const [status,     setStatus]     = useState("idle");
  const [payments,   setPayments]   = useState([]);
  const [expandedCo, setExpandedCo] = useState(null);

  // Load when opened for the first time
  useEffect(() => {
    if (!open || status !== "idle") return;
    setStatus("loading");

    const parts     = doctor.trim().split(" ");
    const firstName = parts[0].toUpperCase();
    const lastName  = parts.slice(1).join(" ").toUpperCase();

    supabase
      .from("doctor_payments")
      .select("company, nature, total_payments, num_payments, year")
      .eq("last_name",  lastName)
      .eq("first_name", firstName)
      .order("year",            { ascending: false })
      .order("total_payments",  { ascending: false })
      .then(({ data, error }) => {
        if (error) { setStatus("error"); return; }
        setPayments(data || []);
        setStatus("done");
      });
  }, [open, doctor, status]);

  // Reset when doctor changes
  useEffect(() => {
    setOpen(!!onClose);
    setStatus("idle");
    setPayments([]);
    setExpandedCo(null);
  }, [doctor, onClose]);

  // Group by company across all years
  const byCompany = {};
  payments.forEach(p => {
    const key = p.company;
    if (!byCompany[key]) byCompany[key] = { company: key, total: 0, count: 0, byYear: {}, natures: {} };
    byCompany[key].total += p.total_payments || 0;
    byCompany[key].count += p.num_payments   || 0;
    const yr  = p.year || "N/A";
    byCompany[key].byYear[yr]  = (byCompany[key].byYear[yr]  || 0) + (p.total_payments || 0);
    const nat = p.nature || "Other";
    byCompany[key].natures[nat] = (byCompany[key].natures[nat] || 0) + (p.total_payments || 0);
  });
  const companies  = Object.values(byCompany).sort((a, b) => b.total - a.total);
  const totalAll   = companies.reduce((s, c) => s + c.total, 0);
  const allYears   = [...new Set(payments.map(p => p.year))].filter(Boolean).sort((a, b) => b - a);

  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, overflow: "hidden", marginTop: 16 }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>💰</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0369a1" }}>CMS Open Payments — {doctor}</span>
          {status === "done" && (
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {companies.length} companies · {fmtUSD(totalAll)} total
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onClose && (
            <button onClick={onClose} style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>✕ Close</button>
          )}
          <span style={{ fontSize: 12, color: "#0369a1", fontWeight: 600 }}>{open ? "▲ Hide" : "▼ Show"}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 20px 16px 20px" }}>
          {status === "loading" && <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>⏳ Loading payment data…</div>}
          {status === "error"   && <div style={{ textAlign: "center", padding: "16px 0", color: "#991b1b", fontSize: 13 }}>⚠️ Could not load payment data.</div>}
          {status === "done" && companies.length === 0 && <div style={{ textAlign: "center", padding: "16px 0", color: "#64748b", fontSize: 13 }}>No payment records found for this doctor in the CMS dataset.</div>}

          {status === "done" && companies.length > 0 && (
            <>


              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#e0f2fe", position: "sticky", top: 0 }}>
                      <th style={{ padding: "8px 12px", textAlign: "left",  color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Company</th>
                      {allYears.map(y => (
                        <th key={y} style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{y}</th>
                      ))}
                      <th style={{ padding: "8px 12px", textAlign: "center",color: "#0369a1", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>By Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Totals row */}
                    <tr style={{ background: "#0369a1" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>TOTAL (All Companies)</td>
                      {allYears.map(y => (
                        <td key={y} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#fff" }}>
                          {fmtUSD(companies.reduce((s, c) => s + (c.byYear[y] || 0), 0))}
                        </td>
                      ))}
                      <td style={{ padding: "10px 12px", textAlign: "center" }} />
                    </tr>
                    {/* Company rows */}
                    {companies.map((co, i) => (
                      <>
                        <tr key={co.company} style={{ borderTop: "1px solid #bae6fd", background: i % 2 === 0 ? "#fff" : "#f0f9ff" }}>
                          <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>{co.company}</td>
                          {allYears.map(y => (
                            <td key={y} style={{ padding: "9px 12px", textAlign: "right", color: "#64748b" }}>
                              {co.byYear[y] ? fmtUSD(co.byYear[y]) : "—"}
                            </td>
                          ))}
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            <button onClick={() => setExpandedCo(expandedCo === co.company ? null : co.company)}
                              style={{ background: "#e0f2fe", border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 11, color: "#0369a1", fontWeight: 600 }}>
                              {expandedCo === co.company ? "▲" : "▼"}
                            </button>
                          </td>
                        </tr>
                        {expandedCo === co.company && (
                          <tr key={co.company + "_exp"} style={{ background: "#f8fafc" }}>
                            <td colSpan={allYears.length + 2} style={{ padding: "8px 12px 12px 28px" }}>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}