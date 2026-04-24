"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ShoppingCart, Sparkles, Users, X } from "lucide-react";

const featureCards = [
  {
    icon: CalendarDays,
    title: "Plan the full week in one place",
    text: "Organise breakfast, lunch and dinner clearly so the whole household can see the plan at a glance.",
  },
  {
    icon: Users,
    title: "Built around real household needs",
    text: "Keep diets, allergies and cuisine preferences together so planning feels practical for everyone.",
  },
  {
    icon: ShoppingCart,
    title: "Shopping becomes simpler",
    text: "Turn the week into a cleaner shopping list and keep your progress saved between visits.",
  },
];

const previewPanels = [
  {
    title: "A clearer weekly planner",
    text: "See the week at a glance and make swaps without losing the overall structure of the plan.",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Balanced and practical meal choices",
    text: "Build a week that feels realistic, varied and supportive of a balanced diet without extra effort.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Recipes and shopping in one flow",
    text: "Keep household favourites, recipe ideas and shopping decisions connected in one experience.",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

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

    setAuthOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div>
      <header className="header">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <div className="row">
            <img
              src="/mealmagic-logo.svg"
              alt="MealMagic logo"
              width={40}
              height={40}
              style={{ borderRadius: 12 }}
            />
            <div>
              <div className="small">Household meal planning</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>MealMagic</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <section
          className="card"
          style={{
            overflow: "hidden",
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.80) 0%, rgba(15,23,42,0.62) 42%, rgba(15,23,42,0.18) 100%), url('https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1600&q=80') center/cover",
            color: "white",
          }}
        >
          <div style={{ padding: "clamp(24px, 5vw, 44px)", maxWidth: 760 }}>
            <div
              className="badge"
              style={{ background: "rgba(255,255,255,0.14)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Sparkles size={14} /> Welcome to MealMagic
            </div>

            <h1 style={{ fontSize: "clamp(34px, 6vw, 58px)", lineHeight: 1.02, margin: "18px 0 12px" }}>
              Meal planning for real households, not just ideal ones.
            </h1>

            <p
              style={{
                fontSize: 18,
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.88)",
                maxWidth: 640,
                margin: 0,
              }}
            >
              Sign in to save your household, generate weekly breakfast, lunch and dinner plans, build shopping lists faster, and keep recipes together in one place.
            </p>

            <div className="row" style={{ marginTop: 24, flexWrap: "wrap" }}>
              <button className="btn btn-primary" type="button" onClick={() => { setMode("login"); setAuthOpen(true); }}>
                Sign in to get started
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => { setMode("signup"); setAuthOpen(true); }}>
                Create account
              </button>
            </div>

            <div className="row" style={{ marginTop: 26, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "rgba(255,255,255,0.92)", color: "#166534" }}>
                Balanced weekly planning
              </span>
              <span className="badge" style={{ background: "rgba(255,255,255,0.92)", color: "#9a3412" }}>
                Shopping lists
              </span>
              <span className="badge" style={{ background: "rgba(255,255,255,0.92)", color: "#3730a3" }}>
                Household preferences
              </span>
            </div>
          </div>
        </section>

        <section className="section grid grid-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card" style={{ padding: 24 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff7ed",
                    color: "#ea580c",
                    marginBottom: 14,
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3 style={{ marginTop: 0, marginBottom: 10 }}>{feature.title}</h3>
                <p className="small" style={{ lineHeight: 1.7, margin: 0 }}>{feature.text}</p>
              </div>
            );
          })}
        </section>

        <section className="section">
          <div className="card" style={{ padding: 26 }}>
            <div className="badge" style={{ marginBottom: 14 }}>Why sign in?</div>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 34 }}>
              Keep your household plans saved and ready to return to.
            </h2>
            <p className="small" style={{ fontSize: 16, lineHeight: 1.8 }}>
              Signing in lets MealMagic remember your household, your saved recipes, your weekly planner and your shopping progress, so the experience feels personal and useful every time you come back.
            </p>
            <div className="list" style={{ marginTop: 18 }}>
              {[
                "Save your household setup and dietary preferences",
                "Generate personalised weekly plans for breakfast, lunch and dinner",
                "Manage your own recipes and keep favourites together",
                "Return to your shopping list and planner on any device",
              ].map((item) => (
                <div key={item} className="row" style={{ alignItems: "flex-start" }}>
                  <CheckCircle2 size={18} style={{ color: "#059669", marginTop: 2, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.7 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="row-between" style={{ alignItems: "end", flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div className="badge" style={{ marginBottom: 12 }}>Inside the app</div>
              <h2 style={{ margin: 0, fontSize: 34 }}>A cleaner way to plan the week</h2>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => { setMode("login"); setAuthOpen(true); }}>
              Open sign in
            </button>
          </div>

          <div className="grid grid-3">
            {previewPanels.map((panel) => (
              <div key={panel.title} className="card" style={{ overflow: "hidden" }}>
                <img src={panel.image} alt={panel.title} style={{ width: "100%", height: 220, objectFit: "cover" }} />
                <div style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 10 }}>{panel.title}</h3>
                  <p className="small" style={{ lineHeight: 1.7, margin: 0 }}>{panel.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {authOpen && (
        <div
          onClick={() => !loading && setAuthOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(480px, 100%)",
              background: "rgba(255,255,255,0.98)",
              border: "1px solid #fed7aa",
              borderRadius: 28,
              boxShadow: "0 30px 80px rgba(15,23,42,0.22)",
              padding: 24,
            }}
          >
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="badge" style={{ marginBottom: 10 }}>
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </div>
                <h2 style={{ margin: 0 }}>{mode === "login" ? "Sign in" : "Create account"}</h2>
              </div>
              <button
                type="button"
                onClick={() => !loading && setAuthOpen(false)}
                style={{ border: 0, background: "transparent", cursor: loading ? "default" : "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setMode("login")}
                style={{
                  border: "1px solid #fed7aa",
                  borderRadius: 14,
                  background: mode === "login" ? "#f97316" : "#fff7ed",
                  color: mode === "login" ? "white" : "#9a3412",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                style={{
                  border: "1px solid #fed7aa",
                  borderRadius: 14,
                  background: mode === "signup" ? "#f97316" : "#fff7ed",
                  color: mode === "signup" ? "white" : "#9a3412",
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Create account
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="btn btn-primary" type="button" onClick={submit} disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
              </button>
              {error && <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
