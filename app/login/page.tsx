"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");

    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>

      <div style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #d4d4d4" }}
        />
        <button onClick={submit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
        </button>
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account?" : "Already have an account?"}
        </button>
        {error && <p>{error}</p>}
      </div>
    </main>
  );
}
