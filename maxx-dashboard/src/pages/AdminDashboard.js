import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const ROLE_COLORS = {
  pending:  { bg: "#fef9c3", color: "#92400e" },
  global:   { bg: "#d1fae5", color: "#065f46" },
  regional: { bg: "#dbeafe", color: "#1e40af" },
  admin:    { bg: "#ede9fe", color: "#5b21b6" },
};

const TYPE_COLORS = {
  maxx_employee: { bg: "#f0f9ff", color: "#0369a1" },
  distributor:   { bg: "#fdf4ff", color: "#7e22ce" },
};

const ALL_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
];

export default function AdminDashboard({ onExit }) {
  const { profile, signOut } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editingId,  setEditingId]  = useState(null);
  const [editRole,   setEditRole]   = useState("");
  const [editStates, setEditStates] = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState("pending"); // pending | all

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditStates(user.allowed_states || []);
  };

  const saveUser = async (userId) => {
    setSaving(true);
    await supabase.from("user_profiles").update({
      role:           editRole,
      allowed_states: editRole === "regional" ? editStates : null,
      updated_at:     new Date().toISOString(),
    }).eq("id", userId);
    setEditingId(null);
    await fetchUsers();
    setSaving(false);
  };

  const toggleState = (s) => {
    setEditStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const displayedUsers = tab === "pending"
    ? users.filter(u => u.role === "pending")
    : users.filter(u => u.role !== "pending");

  return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "16px 28px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Admin Dashboard</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Maxx Orthopedics · {profile?.email}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onExit} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>
            ← Back to Dashboard
          </button>
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "7px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", border: "1px solid rgba(255,255,255,0.3)" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1000, margin: "0 auto" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Pending",  val: users.filter(u => u.role === "pending").length,  color: "#b45309" },
            { label: "Global",   val: users.filter(u => u.role === "global").length,   color: "#059669" },
            { label: "Regional", val: users.filter(u => u.role === "regional").length, color: "#2563eb" },
            { label: "Total",    val: users.length,                                    color: "#7c3aed" },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: `4px solid ${k.color}` }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{k.label} Users</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { val: "pending", label: `Pending Approval (${users.filter(u => u.role === "pending").length})` },
            { val: "all",     label: "Active Users" },
          ].map(t => (
            <button key={t.val} onClick={() => setTab(t.val)} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "1.5px solid",
              background: tab === t.val ? "#2563eb" : "#fff",
              color:      tab === t.val ? "#fff"    : "#374151",
              borderColor:tab === t.val ? "#2563eb" : "#e2e8f0",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading users…</div>
          ) : displayedUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              {tab === "pending" ? "No pending users 🎉" : "No active users yet"}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>User</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Role</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>States</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Signed Up</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u, i) => {
                  const isEditing = editingId === u.id;
                  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.pending;
                  const tc = u.user_type ? TYPE_COLORS[u.user_type] : null;
                  return (
                    <>
                      <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{u.full_name || "—"}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          {tc ? (
                            <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color }}>
                              {u.user_type === "maxx_employee" ? "Maxx Employee" : "Distributor"}
                            </span>
                          ) : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: rc.bg, color: rc.color }}>
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 12px", fontSize: 12, color: "#64748b", maxWidth: 200 }}>
                          {u.role === "global" || u.role === "admin" ? "All states" :
                           u.role === "regional" && u.allowed_states?.length ? u.allowed_states.join(", ") : "—"}
                        </td>
                        <td style={{ padding: "12px 12px", fontSize: 12, color: "#64748b" }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 12px", textAlign: "center" }}>
                          <button onClick={() => isEditing ? setEditingId(null) : startEdit(u)}
                            style={{ background: isEditing ? "#fee2e2" : "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: isEditing ? "#991b1b" : "#475569", fontWeight: 600 }}>
                            {isEditing ? "Cancel" : "Edit"}
                          </button>
                        </td>
                      </tr>

                      {/* Edit panel */}
                      {isEditing && (
                        <tr key={u.id + "_edit"} style={{ background: "#f0f9ff" }}>
                          <td colSpan={6} style={{ padding: "16px 20px" }}>
                            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                              {/* Role selector */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Access Level</div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  {["global", "regional", "admin", "pending"].map(r => (
                                    <button key={r} onClick={() => setEditRole(r)} style={{
                                      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                                      cursor: "pointer", border: "1.5px solid",
                                      background: editRole === r ? "#2563eb" : "#fff",
                                      color:      editRole === r ? "#fff"    : "#374151",
                                      borderColor:editRole === r ? "#2563eb" : "#e2e8f0",
                                    }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
                                  ))}
                                </div>
                              </div>

                              {/* State selector — only for regional */}
                              {editRole === "regional" && (
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
                                    Allowed States ({editStates.length} selected)
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 120, overflowY: "auto" }}>
                                    {ALL_STATES.map(s => (
                                      <button key={s} onClick={() => toggleState(s)} style={{
                                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        cursor: "pointer", border: "1.5px solid",
                                        background: editStates.includes(s) ? "#2563eb" : "#f1f5f9",
                                        color:      editStates.includes(s) ? "#fff"    : "#374151",
                                        borderColor:editStates.includes(s) ? "#2563eb" : "#e2e8f0",
                                      }}>{s}</button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Save button */}
                              <div style={{ alignSelf: "flex-end" }}>
                                <button onClick={() => saveUser(u.id)} disabled={saving} style={{
                                  padding: "8px 20px", borderRadius: 8, background: "#059669", color: "#fff",
                                  fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                                }}>
                                  {saving ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}