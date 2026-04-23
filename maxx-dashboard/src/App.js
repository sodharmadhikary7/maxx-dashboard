import { useState, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PaymentPanel from "./components/PaymentPanel";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import "./mobile.css";

const fmtN = n => n == null ? "-" : Number(n).toLocaleString();
const PAGE_SIZE = 100;

// ── Doctor Detail Panel ────────────────────────────────────
function DoctorDetailPanel({ doctor }) {
  const [data,    setData]    = useState([]);
  const [open,    setOpen]    = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctor) return;
    setLoading(true);
    setData([]);
    supabase
      .from("surgeon_data")
      .select("surgery, product, state, county, hospital, qty")
      .eq("doctor", doctor)
      .then(({ data: rows }) => { setData(rows || []); setLoading(false); });
  }, [doctor]);

  const byType = {};
  data.forEach(r => {
    if (!byType[r.surgery]) byType[r.surgery] = { surgery: r.surgery, product: r.product, total: 0 };
    byType[r.surgery].total += r.qty || 0;
  });
  const surgeryRows = Object.values(byType).sort((a, b) => b.total - a.total);
  const grandTotal  = surgeryRows.reduce((s, r) => s + r.total, 0);
  const kneeTotal   = data.filter(r => r.product === "Knee").reduce((s, r) => s + (r.qty || 0), 0);
  const hipTotal    = data.filter(r => r.product === "Hip").reduce((s, r)  => s + (r.qty || 0), 0);

  const byStateCounty = {};
  data.forEach(r => {
    const key = `${r.state}__${r.county || "Unknown"}`;
    if (!byStateCounty[key]) byStateCounty[key] = { state: r.state, county: r.county || "Unknown", total: 0, knee: 0, hip: 0 };
    byStateCounty[key].total += r.qty || 0;
    if (r.product === "Knee") byStateCounty[key].knee += r.qty || 0;
    if (r.product === "Hip")  byStateCounty[key].hip  += r.qty || 0;
  });
  const stateCountyRows = Object.values(byStateCounty).sort((a, b) => a.state < b.state ? -1 : a.state > b.state ? 1 : b.total - a.total);

  const byHospital = {};
  data.forEach(r => {
    const key = r.hospital || "Unknown";
    if (!byHospital[key]) byHospital[key] = { hospital: key, total: 0, knee: 0, hip: 0 };
    byHospital[key].total += r.qty || 0;
    if (r.product === "Knee") byHospital[key].knee += r.qty || 0;
    if (r.product === "Hip")  byHospital[key].hip  += r.qty || 0;
  });
  const hospitalRows = Object.values(byHospital).sort((a, b) => b.total - a.total);

  const thR = { padding: "8px 12px", textAlign: "right",  color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", background: "#f8fafc", whiteSpace: "nowrap" };
  const thL = { ...thR, textAlign: "left" };
  const tdR = { padding: "8px 12px", textAlign: "right",  fontSize: 13, color: "#374151" };
  const tdL = { ...tdR, textAlign: "left", fontWeight: 600, color: "#1e293b" };

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#f8fafc", border: "none", cursor: "pointer", borderBottom: open ? "1px solid #e2e8f0" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>👨‍⚕️</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>Case Summary — {doctor}</span>
          {!loading && <span style={{ fontSize: 12, color: "#64748b" }}>{fmtN(grandTotal)} total cases</span>}
        </div>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr", gap: 20 }} className="detail-grid">
          {loading ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 24, color: "#94a3b8" }}>⏳ Loading…</div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>By Surgery Type</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={thL}>Surgery</th><th style={thR}>Cases</th><th style={thR}>%</th></tr></thead>
                  <tbody>
                    {surgeryRows.map((r, i) => (
                      <tr key={r.surgery} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={tdL}>{r.surgery}</td>
                        <td style={{ ...tdR, color: r.product === "Knee" ? "#7c3aed" : "#059669", fontWeight: 700 }}>{fmtN(r.total)}</td>
                        <td style={{ ...tdR, color: "#94a3b8" }}>{grandTotal ? `${((r.total / grandTotal) * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                      <td style={{ ...tdL, color: "#64748b" }}>Total</td>
                      <td style={{ ...tdR, fontWeight: 700, color: "#1e293b" }}>{fmtN(grandTotal)}</td>
                      <td style={{ ...tdR, color: "#94a3b8" }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>By State & County</div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ position: "sticky", top: 0 }}>
                      <tr><th style={thL}>State</th><th style={thL}>County</th><th style={thR}>Total</th><th style={{ ...thR, color: "#7c3aed" }}>Knee</th><th style={{ ...thR, color: "#059669" }}>Hip</th></tr>
                    </thead>
                    <tbody>
                      {stateCountyRows.map((r, i) => (
                        <tr key={r.state + r.county} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={tdL}>{r.state}</td>
                          <td style={{ ...tdL, fontWeight: 400, color: "#64748b" }}>{r.county}</td>
                          <td style={{ ...tdR, fontWeight: 700, color: "#1e293b" }}>{fmtN(r.total)}</td>
                          <td style={{ ...tdR, color: "#7c3aed" }}>{fmtN(r.knee)}</td>
                          <td style={{ ...tdR, color: "#059669" }}>{fmtN(r.hip)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                        <td style={{ ...tdL, color: "#64748b" }} colSpan={2}>Total</td>
                        <td style={{ ...tdR, fontWeight: 700, color: "#1e293b" }}>{fmtN(grandTotal)}</td>
                        <td style={{ ...tdR, color: "#7c3aed", fontWeight: 600 }}>{fmtN(kneeTotal)}</td>
                        <td style={{ ...tdR, color: "#059669", fontWeight: 600 }}>{fmtN(hipTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>By Hospital</div>
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead style={{ position: "sticky", top: 0 }}>
                      <tr><th style={thL}>Hospital</th><th style={thR}>Total</th><th style={{ ...thR, color: "#7c3aed" }}>Knee</th><th style={{ ...thR, color: "#059669" }}>Hip</th></tr>
                    </thead>
                    <tbody>
                      {hospitalRows.map((r, i) => (
                        <tr key={r.hospital} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ ...tdL, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.hospital}</td>
                          <td style={{ ...tdR, fontWeight: 700, color: "#1e293b" }}>{fmtN(r.total)}</td>
                          <td style={{ ...tdR, color: "#7c3aed" }}>{fmtN(r.knee)}</td>
                          <td style={{ ...tdR, color: "#059669" }}>{fmtN(r.hip)}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                        <td style={{ ...tdL, color: "#64748b" }}>Total</td>
                        <td style={{ ...tdR, fontWeight: 700, color: "#1e293b" }}>{fmtN(grandTotal)}</td>
                        <td style={{ ...tdR, color: "#7c3aed", fontWeight: 600 }}>{fmtN(kneeTotal)}</td>
                        <td style={{ ...tdR, color: "#059669", fontWeight: 600 }}>{fmtN(hipTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  const [selectedStates,    setSelectedStates]    = useState([]);
  const [selectedCounties,  setSelectedCounties]  = useState([]);
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const [selectedDoctors,   setSelectedDoctors]   = useState([]);
  const [productFilter,     setProductFilter]     = useState("All");

  const [sortCol,        setSortCol]        = useState("total_qty");
  const [sortDir,        setSortDir]        = useState("desc");
  const [expandedRow,    setExpandedRow]    = useState(null);
  const [paymentDoctor,  setPaymentDoctor]  = useState(null);
  const [stateSearch,    setStateSearch]    = useState("");
  const [countySearch,   setCountySearch]   = useState("");
  const [hospSearch,     setHospSearch]     = useState("");
  const [docSearch,      setDocSearch]      = useState("");
  const [page,           setPage]           = useState(0);
  const [totalCount,     setTotalCount]     = useState(0);

  const [allStates,    setAllStates]    = useState([]);
  const [allCounties,  setAllCounties]  = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [allDoctors,   setAllDoctors]   = useState([]);
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [totals,       setTotals]       = useState({ totalQty: 0, kneeQty: 0, hipQty: 0 });

  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    supabase.from("distinct_states").select("state").then(({ data }) => {
      if (data) {
        let states = data.map(r => r.state).filter(Boolean).sort();
        if (profile.role === "regional" && profile.allowed_states?.length)
          states = states.filter(s => profile.allowed_states.includes(s));
        setAllStates(states);
      }
    });
  }, [user, profile]);

  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    if (countySearch.length < 2 && selectedStates.length === 0) { setAllCounties([]); return; }
    let q = supabase.from("distinct_counties").select("county").limit(200);
    if (countySearch.length >= 2) q = q.ilike("county", `%${countySearch}%`);
    if (selectedStates.length > 0) q = q.in("state", selectedStates);
    q.then(({ data }) => { if (data) setAllCounties([...new Set(data.map(r => r.county))].filter(Boolean).sort()); });
  }, [countySearch, selectedStates, user, profile]);

  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    if (hospSearch.length < 2 && selectedStates.length === 0) { setAllHospitals([]); return; }
    let q = supabase.from("distinct_hospitals").select("hospital").limit(200);
    if (hospSearch.length >= 2) q = q.ilike("hospital", `%${hospSearch}%`);
    if (selectedStates.length > 0) q = q.in("state", selectedStates);
    else if (profile.role === "regional" && profile.allowed_states?.length) q = q.in("state", profile.allowed_states);
    if (selectedCounties.length > 0) q = q.in("county", selectedCounties);
    q.then(({ data }) => { if (data) setAllHospitals([...new Set(data.map(r => r.hospital))].filter(Boolean).sort()); });
  }, [hospSearch, selectedStates, selectedCounties, user, profile]);

  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    if (docSearch.length < 2 && selectedStates.length === 0 && selectedHospitals.length === 0) { setAllDoctors([]); return; }
    let q = supabase.from("distinct_doctors").select("doctor").limit(200);
    if (docSearch.length >= 2) q = q.ilike("doctor", `%${docSearch}%`);
    if (selectedStates.length > 0) q = q.in("state", selectedStates);
    else if (profile.role === "regional" && profile.allowed_states?.length) q = q.in("state", profile.allowed_states);
    if (selectedHospitals.length > 0) q = q.in("hospital", selectedHospitals);
    q.then(({ data }) => { if (data) setAllDoctors([...new Set(data.map(r => r.doctor))].filter(Boolean).sort()); });
  }, [docSearch, selectedStates, selectedHospitals, user, profile]);

  const isDocView   = selectedDoctors.length === 0;
  const nameKey     = isDocView ? "doctor" : "hospital";
  const groupLabel  = isDocView ? "Doctor" : "Hospital";
  const regionLabel = isDocView ? "Region" : "Location";

  const applyFilters = useCallback((q) => {
    const states = profile?.role === "regional" ? profile.allowed_states : selectedStates;
    if (states && states.length > 0) q = states.length === 1 ? q.eq("state", states[0]) : q.in("state", states);
    if (selectedCounties.length > 0)  q = selectedCounties.length  === 1 ? q.eq("county",   selectedCounties[0])  : q.in("county",   selectedCounties);
    if (selectedHospitals.length > 0) q = selectedHospitals.length === 1 ? q.eq("hospital", selectedHospitals[0]) : q.in("hospital", selectedHospitals);
    if (selectedDoctors.length > 0)   q = selectedDoctors.length   === 1 ? q.eq("doctor",   selectedDoctors[0])   : q.in("doctor",   selectedDoctors);
    return q;
  }, [selectedStates, selectedCounties, selectedHospitals, selectedDoctors, profile]); // eslint-disable-line

  const loadTotals = useCallback(async () => {
    if (!user || !profile || profile.role === "pending") return;
    const hasFilter = selectedStates.length > 0 || selectedCounties.length > 0 || selectedHospitals.length > 0 || selectedDoctors.length > 0 || profile.role === "regional";
    if (!hasFilter) {
      const { data } = productFilter !== "All"
        ? await supabase.from("national_totals").select("product, total_qty").eq("product", productFilter)
        : await supabase.from("national_totals").select("product, total_qty");
      if (data) setTotals({ totalQty: data.reduce((s, r) => s + (r.total_qty || 0), 0), kneeQty: data.filter(r => r.product === "Knee").reduce((s, r) => s + (r.total_qty || 0), 0), hipQty: data.filter(r => r.product === "Hip").reduce((s, r) => s + (r.total_qty || 0), 0) });
      return;
    }
    let q = supabase.from("filter_totals").select("product, total_qty");
    q = applyFilters(q);
    if (productFilter !== "All") q = q.eq("product", productFilter);
    const { data } = await q;
    if (data) setTotals({ totalQty: data.reduce((s, r) => s + (r.total_qty || 0), 0), kneeQty: data.filter(r => r.product === "Knee").reduce((s, r) => s + (r.total_qty || 0), 0), hipQty: data.filter(r => r.product === "Hip").reduce((s, r) => s + (r.total_qty || 0), 0) });
  }, [selectedStates, selectedCounties, selectedHospitals, selectedDoctors, productFilter, user, profile, applyFilters]); // eslint-disable-line

  useEffect(() => { loadTotals(); }, [loadTotals]);

  const loadResults = useCallback(async () => {
    if (!user || !profile || profile.role === "pending") return;
    setLoading(true); setError(null);
    try {
      const from = page * PAGE_SIZE;
      const to   = (page + 1) * PAGE_SIZE - 1;
      let rq = supabase.from("surgeon_data").select(`${nameKey}, state, region, hospital_address, product, qty`);
      if (productFilter !== "All") rq = rq.eq("product", productFilter);
      rq = applyFilters(rq);
      const { data: raw } = await rq;
      if (raw) {
        const map = {};
        raw.forEach(r => {
          const k = r[nameKey]; if (!k) return;
          if (!map[k]) map[k] = { [nameKey]: k, state: r.state, region: r.region, hospital_address: r.hospital_address, total_qty: 0, knee_qty: 0, hip_qty: 0 };
          map[k].total_qty += r.qty || 0;
          if (r.product === "Knee") map[k].knee_qty += r.qty || 0;
          if (r.product === "Hip")  map[k].hip_qty  += r.qty || 0;
        });
        const arr = Object.values(map).sort((a, b) => sortDir === "desc" ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]);
        setTotalCount(arr.length);
        setRows(arr.slice(from, to + 1));
      }
    } catch (e) { setError("Failed to load data from Supabase."); }
    setLoading(false);
  }, [selectedStates, selectedCounties, selectedHospitals, selectedDoctors, productFilter, page, sortCol, sortDir, nameKey, user, profile, applyFilters]); // eslint-disable-line

  useEffect(() => { loadResults(); }, [loadResults]);

  const loadDetail = async (name) => {
    if (expandedRow === name) { setExpandedRow(null); return; }
    setExpandedRow(name);
  };

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3 }}>{sortCol === col && sortDir === "asc" ? "▲" : "▼"}</span>
  );

  const toggle = (setter, val) => setter(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const clearAll = () => {
    setSelectedStates([]); setSelectedCounties([]); setSelectedHospitals([]); setSelectedDoctors([]);
    setExpandedRow(null); setPaymentDoctor(null); setPage(0);
    setStateSearch(""); setCountySearch(""); setHospSearch(""); setDocSearch("");
  };

  const FilterBtn = ({ val, active, onClick, color }) => (
    <button onClick={onClick} style={{ padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", background: active ? color : "#f1f5f9", color: active ? "#fff" : "#374151", borderColor: active ? color : "#e2e8f0", transition: "all 0.15s", whiteSpace: "nowrap" }}>{val}</button>
  );

  const filtStates = allStates.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasFilter  = selectedStates.length > 0 || selectedCounties.length > 0 || selectedHospitals.length > 0 || selectedDoctors.length > 0;
  const isNational = !hasFilter && profile?.role !== "regional";

  if (authLoading) return <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div><div style={{ fontSize: 15, color: "#64748b" }}>Loading…</div></div></div>;
  if (!user) return <LoginPage />;
  if (profile?.role === "pending") return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "20px 28px", color: "#fff" }}><div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Knee & Hip Volume Dashboard</div></div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 56px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Access Pending</div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Your account is awaiting admin approval.</div>
          <button onClick={signOut} style={{ background: "#f1f5f9", color: "#374151", padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
  if (showAdmin && profile?.role === "admin") return <AdminDashboard onExit={() => setShowAdmin(false)} />;

  return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "16px 28px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} className="header-inner">
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Knee & Hip Volume Dashboard</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
              Sales View · Maxx Orthopedics
              {profile?.user_type && <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", padding: "1px 8px", borderRadius: 20, fontSize: 11 }}>{profile.user_type === "maxx_employee" ? "Maxx Employee" : "Distributor"}</span>}
              {profile?.role === "regional" && profile?.allowed_states?.length > 0 && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>· {profile.allowed_states.join(", ")}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }} className="header-buttons">
            <button onClick={() => { loadResults(); loadTotals(); }} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>↻ Refresh</button>
            {profile?.role === "admin" && <button onClick={() => setShowAdmin(true)} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>⚙️ Admin</button>}
            <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }} className="main-content">
        {/* Filter panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }} className="filter-grid">
          {[
            { label: "State",    items: filtStates,   search: stateSearch,  setSearch: setStateSearch,  selected: selectedStates,    onSelect: s => { toggle(setSelectedStates, s); setSelectedCounties([]); setSelectedHospitals([]); setSelectedDoctors([]); setPage(0); setCountySearch(""); setHospSearch(""); setDocSearch(""); }, color: "#2563eb", placeholder: "Search states…", hint: "" },
            { label: "County",   items: allCounties,  search: countySearch, setSearch: setCountySearch, selected: selectedCounties,   onSelect: s => { toggle(setSelectedCounties, s); setSelectedHospitals([]); setSelectedDoctors([]); setPage(0); }, color: "#0891b2", placeholder: selectedStates.length > 0 ? "Search counties…" : "Select a state first…", hint: selectedStates.length === 0 && countySearch.length < 2 ? "Select a state or type to search" : "" },
            { label: "Hospital", items: allHospitals, search: hospSearch,   setSearch: setHospSearch,   selected: selectedHospitals,  onSelect: s => { toggle(setSelectedHospitals, s); setSelectedDoctors([]); setPage(0); setDocSearch(""); }, color: "#7c3aed", placeholder: selectedStates.length > 0 ? "Search hospitals…" : "Type 2+ letters to search…", hint: selectedStates.length === 0 && hospSearch.length < 2 ? "Select a state or type to search" : "" },
            { label: "Doctor",   items: allDoctors,   search: docSearch,    setSearch: setDocSearch,    selected: selectedDoctors,    onSelect: s => { toggle(setSelectedDoctors, s); setPage(0); }, color: "#059669", placeholder: selectedStates.length > 0 ? "Search doctors…" : "Type 2+ letters to search…", hint: selectedStates.length === 0 && selectedHospitals.length === 0 && docSearch.length < 2 ? "Select a state or type to search" : "" },
          ].map(panel => (
            <div key={panel.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {panel.label} {panel.selected.length > 0 && <span style={{ color: panel.color }}>({panel.selected.length})</span>}
              </div>
              <input value={panel.search} onChange={e => panel.setSearch(e.target.value)} placeholder={panel.placeholder}
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 130, overflowY: "auto" }}>
                {panel.items.slice(0, 200).map(item => (
                  <FilterBtn key={item} val={item} active={panel.selected.includes(item)} onClick={() => panel.onSelect(item)} color={panel.color} />
                ))}
                {panel.hint && <span style={{ fontSize: 11, color: "#94a3b8", padding: "4px" }}>{panel.hint}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Product + active tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }} className="product-row">
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Product:</span>
          {["All", "Knee", "Hip"].map(p => <FilterBtn key={p} val={p} active={productFilter === p} onClick={() => { setProductFilter(p); setPage(0); }} color="#0f172a" />)}
          <div style={{ flex: 1 }} />
          {hasFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} className="filter-tags">
              {selectedStates.map(s    => <span key={s} onClick={() => toggle(setSelectedStates,    s)} style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📍 {s} ✕</span>)}
              {selectedCounties.map(s  => <span key={s} onClick={() => toggle(setSelectedCounties,  s)} style={{ background: "#cffafe", color: "#0e7490", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏘️ {s} ✕</span>)}
              {selectedHospitals.map(s => <span key={s} onClick={() => toggle(setSelectedHospitals, s)} style={{ background: "#ede9fe", color: "#5b21b6", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏥 {s} ✕</span>)}
              {selectedDoctors.map(s   => <span key={s} onClick={() => toggle(setSelectedDoctors,   s)} style={{ background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>👨‍⚕️ {s} ✕</span>)}
              <button onClick={clearAll} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#fee2e2", color: "#991b1b", border: "none" }}>✕ Clear All</button>
            </div>
          )}
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }} className="kpi-grid">
          {[
            { label: isNational ? "Total Cases (National)" : "Total Cases", val: fmtN(totals.totalQty), color: "#2563eb" },
            { label: isNational ? "Knee Cases (National)"  : "Knee Cases",  val: fmtN(totals.kneeQty),  color: "#7c3aed" },
            { label: isNational ? "Hip Cases (National)"   : "Hip Cases",   val: fmtN(totals.hipQty),   color: "#059669" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${k.color}` }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Results table */}
        {selectedDoctors.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Results by {groupLabel} </span>
                <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 13 }}>({rows.length} shown · {totalCount.toLocaleString()} total)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="pagination">
                {loading && <span style={{ fontSize: 12, color: "#64748b" }}>Loading…</span>}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: page === 0 ? "#f1f5f9" : "#fff", color: page === 0 ? "#94a3b8" : "#374151", cursor: page === 0 ? "default" : "pointer", fontWeight: 600, fontSize: 12 }}>← Prev</button>
                    <span style={{ fontSize: 12, color: "#64748b" }}>Page {page + 1} of {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: page + 1 >= totalPages ? "#f1f5f9" : "#fff", color: page + 1 >= totalPages ? "#94a3b8" : "#374151", cursor: page + 1 >= totalPages ? "default" : "pointer", fontWeight: 600, fontSize: 12 }}>Next →</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ overflowX: "auto" }} className="table-wrapper">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left",   color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{groupLabel}</th>
                    <th style={{ padding: "10px 12px", textAlign: "left",   color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{regionLabel}</th>
                    <th style={{ padding: "10px 12px", textAlign: "right",  color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }} onClick={() => handleSort("total_qty")}>Total <SortIcon col="total_qty" /></th>
                    <th style={{ padding: "10px 12px", textAlign: "right",  color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }} onClick={() => handleSort("knee_qty")}>Knee <SortIcon col="knee_qty" /></th>
                    <th style={{ padding: "10px 12px", textAlign: "right",  color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }} onClick={() => handleSort("hip_qty")}>Hip <SortIcon col="hip_qty" /></th>
                    <th style={{ padding: "10px 12px", textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Detail</th>
                    {isDocView && <th style={{ padding: "10px 12px", textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payments</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const name          = row[nameKey];
                    const isExpanded    = expandedRow === name;
                    const isPaymentOpen = paymentDoctor === name;
                    return (
                      <>
                        <tr key={name + i} style={{ borderTop: "1px solid #f1f5f9", background: isExpanded || isPaymentOpen ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 200 }}>{name}</td>
                          <td style={{ padding: "11px 12px", color: "#64748b", fontSize: 12 }}>{isDocView ? row.region : row.hospital_address}</td>
                          <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmtN(row.total_qty)}</td>
                          <td style={{ padding: "11px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>{fmtN(row.knee_qty)}</td>
                          <td style={{ padding: "11px 12px", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmtN(row.hip_qty)}</td>
                          <td style={{ padding: "11px 12px", textAlign: "center" }}>
                            <button onClick={() => loadDetail(name)}
                              style={{ background: isExpanded ? "#2563eb" : "#f1f5f9", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: isExpanded ? "#fff" : "#475569", fontWeight: 600 }}>
                              {isExpanded ? "▲ Hide" : "▼ Show"}
                            </button>
                          </td>
                          {isDocView && (
                            <td style={{ padding: "11px 12px", textAlign: "center" }}>
                              <button onClick={() => setPaymentDoctor(isPaymentOpen ? null : name)}
                                style={{ background: isPaymentOpen ? "#0369a1" : "#e0f2fe", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: isPaymentOpen ? "#fff" : "#0369a1", fontWeight: 600 }}>
                                💰
                              </button>
                            </td>
                          )}
                        </tr>
                        {isExpanded && (
                          <tr key={name + i + "_exp"}>
                            <td colSpan={isDocView ? 7 : 6} style={{ padding: "0 16px 16px 16px", background: "#f8fafc" }}>
                              {isDocView && <DoctorDetailPanel doctor={name} />}
                            </td>
                          </tr>
                        )}
                        {isPaymentOpen && (
                          <tr key={name + i + "_pay"}>
                            <td colSpan={7} style={{ padding: "0 16px 14px 16px" }}>
                              <PaymentPanel doctor={name} onClose={() => setPaymentDoctor(null)} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No results match your current filters.</div>}
            {error && <div style={{ padding: 20, textAlign: "center", color: "#991b1b", fontSize: 13 }}>{error}</div>}
          </div>
        )}

        {/* Doctor detail + CMS payments for filter-selected doctors */}
        {selectedDoctors.map(doc => (
          <div key={doc}>
            <DoctorDetailPanel doctor={doc} />
            <PaymentPanel doctor={doc} />
          </div>
        ))}
      </div>
    </div>
  );
}