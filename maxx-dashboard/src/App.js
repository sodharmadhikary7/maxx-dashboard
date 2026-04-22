import { useState, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import PaymentPanel from "./components/PaymentPanel";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";

const fmtN = n => n == null ? "-" : Number(n).toLocaleString();
const PAGE_SIZE = 100;

export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Filter state ───────────────────────────────────────
  const [selectedStates,   setSelectedStates]   = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor,   setSelectedDoctor]   = useState(null);
  const [productFilter,    setProductFilter]    = useState("All");

  // ── UI state ───────────────────────────────────────────
  const [sortCol,        setSortCol]        = useState("total_qty");
  const [sortDir,        setSortDir]        = useState("desc");
  const [expandedRow,    setExpandedRow]    = useState(null);
  const [expandedDetail, setExpandedDetail] = useState({});
  const [paymentDoctor,  setPaymentDoctor]  = useState(null);
  const [stateSearch,    setStateSearch]    = useState("");
  const [hospSearch,     setHospSearch]     = useState("");
  const [docSearch,      setDocSearch]      = useState("");
  const [page,           setPage]           = useState(0);
  const [totalCount,     setTotalCount]     = useState(0);

  // ── Dimension lists ────────────────────────────────────
  const [allStates,    setAllStates]    = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [allDoctors,   setAllDoctors]   = useState([]);

  // ── Results ────────────────────────────────────────────
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [totals,  setTotals]  = useState({ totalQty: 0, kneeQty: 0, hipQty: 0 });

  // ── Load states on mount ───────────────────────────────
  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    supabase.from("distinct_states").select("state")
      .then(({ data }) => {
        if (data) {
          let states = data.map(r => r.state).filter(Boolean).sort();
          if (profile.role === "regional" && profile.allowed_states?.length) {
            states = states.filter(s => profile.allowed_states.includes(s));
          }
          setAllStates(states);
        }
      });
  }, [user, profile]);

  // ── Load hospitals on demand ───────────────────────────
  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    if (hospSearch.length < 2 && selectedStates.length === 0) { setAllHospitals([]); return; }
    let q = supabase.from("distinct_hospitals").select("hospital").limit(200);
    if (hospSearch.length >= 2) q = q.ilike("hospital", `%${hospSearch}%`);
    if (selectedStates.length > 0) q = q.in("state", selectedStates);
    else if (profile.role === "regional" && profile.allowed_states?.length) q = q.in("state", profile.allowed_states);
    q.then(({ data }) => {
      if (data) setAllHospitals([...new Set(data.map(r => r.hospital))].filter(Boolean).sort());
    });
  }, [hospSearch, selectedStates, user, profile]);

  // ── Load doctors on demand ─────────────────────────────
  useEffect(() => {
    if (!user || !profile || profile.role === "pending") return;
    if (docSearch.length < 2 && selectedStates.length === 0 && !selectedHospital) { setAllDoctors([]); return; }
    let q = supabase.from("distinct_doctors").select("doctor").limit(200);
    if (docSearch.length >= 2) q = q.ilike("doctor", `%${docSearch}%`);
    if (selectedStates.length > 0) q = q.in("state", selectedStates);
    else if (profile.role === "regional" && profile.allowed_states?.length) q = q.in("state", profile.allowed_states);
    if (selectedHospital) q = q.eq("hospital", selectedHospital);
    q.then(({ data }) => {
      if (data) setAllDoctors([...new Set(data.map(r => r.doctor))].filter(Boolean).sort());
    });
  }, [docSearch, selectedStates, selectedHospital, user, profile]);

  // ── View logic ─────────────────────────────────────────
  const isDocView   = !selectedDoctor;
  const statsView   = isDocView ? "doctor_stats" : "hospital_stats";
  const nameKey     = isDocView ? "doctor" : "hospital";
  const groupLabel  = isDocView ? "Doctor" : "Hospital";
  const regionLabel = isDocView ? "Region" : "Location";

  // ── State filter helper ────────────────────────────────
  const applyStateFilter = useCallback((q) => {
    const states = profile?.role === "regional" ? profile.allowed_states : selectedStates;
    if (!states || states.length === 0) return q;
    if (states.length === 1) return q.eq("state", states[0]);
    return q.in("state", states);
  }, [selectedStates, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load true totals ───────────────────────────────────
  const loadTotals = useCallback(async () => {
    if (!user || !profile || profile.role === "pending") return;
    const isRegional = profile.role === "regional";
    const hasFilter = selectedStates.length > 0 || selectedHospital || selectedDoctor || isRegional;

    if (!hasFilter) {
      const { data } = productFilter !== "All"
        ? await supabase.from("national_totals").select("product, total_qty").eq("product", productFilter)
        : await supabase.from("national_totals").select("product, total_qty");
      if (data) setTotals({
        totalQty: data.reduce((s, r) => s + (r.total_qty || 0), 0),
        kneeQty:  data.filter(r => r.product === "Knee").reduce((s, r) => s + (r.total_qty || 0), 0),
        hipQty:   data.filter(r => r.product === "Hip").reduce((s, r) => s + (r.total_qty || 0), 0),
      });
      return;
    }
    let q = supabase.from("filter_totals").select("product, total_qty");
    q = applyStateFilter(q);
    if (selectedHospital)        q = q.eq("hospital", selectedHospital);
    if (selectedDoctor)          q = q.eq("doctor",   selectedDoctor);
    if (productFilter !== "All") q = q.eq("product",  productFilter);
    const { data } = await q;
    if (data) setTotals({
      totalQty: data.reduce((s, r) => s + (r.total_qty || 0), 0),
      kneeQty:  data.filter(r => r.product === "Knee").reduce((s, r) => s + (r.total_qty || 0), 0),
      hipQty:   data.filter(r => r.product === "Hip").reduce((s, r) => s + (r.total_qty || 0), 0),
    });
  }, [selectedStates, selectedHospital, selectedDoctor, productFilter, user, profile, applyStateFilter]);

  useEffect(() => { loadTotals(); }, [loadTotals]);

  // ── Load paginated results ─────────────────────────────
  const loadResults = useCallback(async () => {
    if (!user || !profile || profile.role === "pending") return;
    setLoading(true);
    setError(null);
    try {
      const from = page * PAGE_SIZE;
      const to   = (page + 1) * PAGE_SIZE - 1;

      if (productFilter !== "All") {
        let rq = supabase.from("surgeon_data").select(`${nameKey}, state, region, hospital_address, qty`).eq("product", productFilter);
        rq = applyStateFilter(rq);
        if (selectedHospital) rq = rq.eq("hospital", selectedHospital);
        if (selectedDoctor)   rq = rq.eq("doctor",   selectedDoctor);
        const { data: raw } = await rq;
        if (raw) {
          const map = {};
          raw.forEach(r => {
            const k = r[nameKey]; if (!k) return;
            if (!map[k]) map[k] = { [nameKey]: k, state: r.state, region: r.region, hospital_address: r.hospital_address, total_qty: 0, knee_qty: 0, hip_qty: 0 };
            map[k].total_qty += r.qty || 0;
          });
          const arr = Object.values(map).sort((a, b) => sortDir === "desc" ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]);
          setTotalCount(arr.length);
          setRows(arr.slice(from, to + 1));
          setLoading(false); return;
        }
      }

      let q = supabase.from(statsView).select("*", { count: "exact" }).order(sortCol, { ascending: sortDir === "asc" }).range(from, to);
      q = applyStateFilter(q);
      if (selectedHospital) q = q.eq("hospital", selectedHospital);
      if (selectedDoctor)   q = q.eq("doctor",   selectedDoctor);
      const { data, count, error: err } = await q;
      if (err) throw err;
      setRows(data || []);
      setTotalCount(count || 0);
    } catch (e) {
      setError("Failed to load data from Supabase.");
    }
    setLoading(false);
  }, [selectedStates, selectedHospital, selectedDoctor, productFilter, page, sortCol, sortDir, statsView, nameKey, user, profile, applyStateFilter]); // eslint-disable-line

  useEffect(() => { loadResults(); }, [loadResults]);

  // ── Load surgery detail on expand ─────────────────────
  const loadDetail = async (name) => {
    if (expandedRow === name) { setExpandedRow(null); return; }
    if (expandedDetail[name]) { setExpandedRow(name); return; }
    let q = supabase.from("surgeon_data").select("surgery, qty");
    if (isDocView) q = q.eq("doctor", name); else q = q.eq("hospital", name);
    q = applyStateFilter(q);
    if (selectedHospital) q = q.eq("hospital", selectedHospital);
    if (selectedDoctor)   q = q.eq("doctor",   selectedDoctor);
    if (productFilter !== "All") q = q.eq("product", productFilter);
    const { data } = await q;
    if (data) {
      const breakdown = {};
      data.forEach(r => { breakdown[r.surgery] = (breakdown[r.surgery] || 0) + r.qty; });
      setExpandedDetail(prev => ({ ...prev, [name]: breakdown }));
    }
    setExpandedRow(name);
  };

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.3 }}>
      {sortCol === col && sortDir === "asc" ? "▲" : "▼"}
    </span>
  );

  const toggleState = (s) => {
    setSelectedStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setSelectedHospital(null); setSelectedDoctor(null);
    setExpandedRow(null); setExpandedDetail({}); setPaymentDoctor(null); setPage(0);
    setHospSearch(""); setDocSearch("");
  };

  const clearAll = () => {
    setSelectedStates([]); setSelectedHospital(null); setSelectedDoctor(null);
    setExpandedRow(null); setExpandedDetail({}); setPaymentDoctor(null); setPage(0);
    setStateSearch(""); setHospSearch(""); setDocSearch("");
  };

  const FilterBtn = ({ val, active, onClick, color }) => (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: "1.5px solid",
      background: active ? color : "#f1f5f9",
      color: active ? "#fff" : "#374151",
      borderColor: active ? color : "#e2e8f0",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{val}</button>
  );

  const filtStates = allStates.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasFilter  = selectedStates.length > 0 || selectedHospital || selectedDoctor;
  const isNational = selectedStates.length === 0 && !selectedHospital && !selectedDoctor && profile?.role !== "regional";

  // ── Auth gates (after all hooks) ──────────────────────
  if (authLoading) return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 15, color: "#64748b" }}>Loading…</div>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  if (profile?.role === "pending") return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "20px 28px", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Knee & Hip Volume Dashboard</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Sales View · Maxx Orthopedics</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 56px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Access Pending</div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Your account is awaiting admin approval. You'll receive access shortly.</div>
          <button onClick={signOut} style={{ background: "#f1f5f9", color: "#374151", padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  if (showAdmin && profile?.role === "admin") return <AdminDashboard onExit={() => setShowAdmin(false)} />;

  // ── Main dashboard ─────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "16px 28px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Knee & Hip Volume Dashboard</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
            Sales View · Maxx Orthopedics
            {profile?.user_type && (
              <span style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", padding: "1px 8px", borderRadius: 20, fontSize: 11 }}>
                {profile.user_type === "maxx_employee" ? "Maxx Employee" : "Distributor"}
              </span>
            )}
            {profile?.role === "regional" && profile?.allowed_states?.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>· {profile.allowed_states.join(", ")}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { loadResults(); loadTotals(); }} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>↻ Refresh</button>
          {profile?.role === "admin" && (
            <button onClick={() => setShowAdmin(true)} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>⚙️ Admin</button>
          )}
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Filter panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* State */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              State {selectedStates.length > 0 && <span style={{ color: "#2563eb" }}>({selectedStates.length} selected)</span>}
            </div>
            <input value={stateSearch} onChange={e => setStateSearch(e.target.value)} placeholder="Search states…"
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 130, overflowY: "auto" }}>
              {filtStates.map(item => (
                <FilterBtn key={item} val={item} active={selectedStates.includes(item)} onClick={() => toggleState(item)} color="#2563eb" />
              ))}
            </div>
          </div>

          {/* Hospital */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Hospital</div>
            <input value={hospSearch} onChange={e => setHospSearch(e.target.value)}
              placeholder={selectedStates.length > 0 ? "Search hospitals…" : "Type 2+ letters to search…"}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 130, overflowY: "auto" }}>
              {allHospitals.slice(0, 200).map(item => (
                <FilterBtn key={item} val={item} active={selectedHospital === item}
                  onClick={() => { setSelectedHospital(selectedHospital === item ? null : item); setSelectedDoctor(null); setExpandedRow(null); setExpandedDetail({}); setPaymentDoctor(null); setPage(0); setDocSearch(""); }}
                  color="#7c3aed" />
              ))}
              {selectedStates.length === 0 && hospSearch.length < 2 && <span style={{ fontSize: 11, color: "#94a3b8", padding: "4px" }}>Select a state or type to search</span>}
            </div>
          </div>

          {/* Doctor */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Doctor</div>
            <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
              placeholder={selectedStates.length > 0 ? "Search doctors…" : "Type 2+ letters to search…"}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 130, overflowY: "auto" }}>
              {allDoctors.slice(0, 200).map(item => (
                <FilterBtn key={item} val={item} active={selectedDoctor === item}
                  onClick={() => { setSelectedDoctor(selectedDoctor === item ? null : item); setExpandedRow(null); setExpandedDetail({}); setPaymentDoctor(null); setPage(0); }}
                  color="#059669" />
              ))}
              {selectedStates.length === 0 && !selectedHospital && docSearch.length < 2 && <span style={{ fontSize: 11, color: "#94a3b8", padding: "4px" }}>Select a state or type to search</span>}
            </div>
          </div>
        </div>

        {/* Product filter + active tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Product:</span>
          {["All", "Knee", "Hip"].map(p => (
            <FilterBtn key={p} val={p} active={productFilter === p} onClick={() => { setProductFilter(p); setPage(0); }} color="#0f172a" />
          ))}
          <div style={{ flex: 1 }} />
          {hasFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {selectedStates.map(s => (
                <span key={s} onClick={() => toggleState(s)} style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  📍 {s} ✕
                </span>
              ))}
              {selectedHospital && <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>🏥 {selectedHospital}</span>}
              {selectedDoctor   && <span style={{ background: "#d1fae5", color: "#065f46", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>👨‍⚕️ {selectedDoctor}</span>}
              <button onClick={clearAll} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#fee2e2", color: "#991b1b", border: "none" }}>✕ Clear All</button>
            </div>
          )}
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
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
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Results by {groupLabel} </span>
              <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 13 }}>({rows.length} shown · {totalCount.toLocaleString()} total)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <span style={{ fontSize: 12, color: "#64748b" }}>Loading…</span>}
              {isDocView && !loading && <span style={{ fontSize: 12, color: "#0369a1" }}>💰 click to view CMS payments</span>}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: page === 0 ? "#f1f5f9" : "#fff", color: page === 0 ? "#94a3b8" : "#374151", cursor: page === 0 ? "default" : "pointer", fontWeight: 600, fontSize: 12 }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages}
                    style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: page + 1 >= totalPages ? "#f1f5f9" : "#fff", color: page + 1 >= totalPages ? "#94a3b8" : "#374151", cursor: page + 1 >= totalPages ? "default" : "pointer", fontWeight: 600, fontSize: 12 }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
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
                  const detail        = expandedDetail[name];
                  const isPaymentOpen = paymentDoctor === name;
                  return (
                    <>
                      <tr key={name + i} style={{ borderTop: "1px solid #f1f5f9", background: isPaymentOpen ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "11px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 200 }}>{name}</td>
                        <td style={{ padding: "11px 12px", color: "#64748b", fontSize: 12 }}>{isDocView ? row.region : row.hospital_address}</td>
                        <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmtN(row.total_qty)}</td>
                        <td style={{ padding: "11px 12px", textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>{fmtN(row.knee_qty)}</td>
                        <td style={{ padding: "11px 12px", textAlign: "right", color: "#059669", fontWeight: 600 }}>{fmtN(row.hip_qty)}</td>
                        <td style={{ padding: "11px 12px", textAlign: "center" }}>
                          <button onClick={() => loadDetail(name)}
                            style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#475569", fontWeight: 600 }}>
                            {expandedRow === name ? "▲ Hide" : "▼ Show"}
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
                      {expandedRow === name && detail && (
                        <tr key={name + i + "_exp"} style={{ background: "#f0f9ff" }}>
                          <td colSpan={isDocView ? 7 : 6} style={{ padding: "10px 16px 14px 40px" }}>
                            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>Surgery Breakdown</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {Object.entries(detail).sort((a, b) => b[1] - a[1]).map(([surg, qty]) => (
                                <div key={surg} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12 }}>
                                  <span style={{ color: "#64748b" }}>{surg}: </span>
                                  <span style={{ fontWeight: 700, color: "#1e293b" }}>{fmtN(qty)}</span>
                                </div>
                              ))}
                            </div>
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

        {/* Standalone CMS section when a specific doctor is selected */}
        {selectedDoctor && selectedDoctor.trim() !== "" && (
          <PaymentPanel doctor={selectedDoctor} />
        )}
      </div>
    </div>
  );
}