import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode,      setMode]      = useState("signin"); // signin | signup
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [fullName,  setFullName]  = useState("");
  const [userType,  setUserType]  = useState("maxx_employee");
  const [error,     setError]     = useState(null);
  const [message,   setMessage]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        await signUp(email, password, fullName, userType);
        setMessage("Account created! Your request is pending admin approval. You'll be notified once access is granted.");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none",
    boxSizing: "border-box", color: "#1e293b",
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ fontFamily: "Inter,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "20px 28px", color: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🦴 Knee & Hip Volume Dashboard</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Sales View · Maxx Orthopedics</div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "40px 48px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: "100%", maxWidth: 440 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
            {mode === "signin" ? "Welcome back" : "Request access"}
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            {mode === "signin" ? "Sign in to your account" : "Create an account — admin approval required"}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith" style={inputStyle} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle} />
            </div>

            {mode === "signup" && (
              <div>
                <label style={labelStyle}>I am a…</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { val: "maxx_employee", label: "Maxx Employee" },
                    { val: "distributor",   label: "Distributor"   },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setUserType(opt.val)} style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: "pointer", border: "1.5px solid",
                      background: userType === opt.val ? "#2563eb" : "#f1f5f9",
                      color:      userType === opt.val ? "#fff"    : "#374151",
                      borderColor:userType === opt.val ? "#2563eb" : "#e2e8f0",
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error / message */}
          {error   && <div style={{ marginTop: 16, padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontSize: 13 }}>{error}</div>}
          {message && <div style={{ marginTop: 16, padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: 8, fontSize: 13 }}>{message}</div>}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", marginTop: 24, padding: "12px", borderRadius: 8,
            background: loading ? "#93c5fd" : "#2563eb", color: "#fff",
            fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "default" : "pointer",
          }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Request Access"}
          </button>

          {/* Toggle */}
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
            {mode === "signin" ? (
              <>Don't have an account?{" "}
                <span onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                  style={{ color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>Request access</span>
              </>
            ) : (
              <>Already have an account?{" "}
                <span onClick={() => { setMode("signin"); setError(null); setMessage(null); }}
                  style={{ color: "#2563eb", fontWeight: 600, cursor: "pointer" }}>Sign in</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}