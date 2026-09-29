"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string; dinerType?: "regular" | "occasional"; likes: string[]; favourites: string[]; dislikes: string[]; never: string[] };
type MenuDay = { day: number; lunch: string; supper: string; supperSplit?: boolean };

export default function FeedMeApp() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedId, setSelectedId] = useState("");
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingType, setOnboardingType] = useState<"regular" | "occasional">("regular");
  const [onboardingError, setOnboardingError] = useState("");
  const [view, setView] = useState<"mealbank" | "month">("mealbank");
  const [month, setMonth] = useState<MenuDay[]>([]);
  const [generating, setGenerating] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountPanel, setAccountPanel] = useState<"closed" | "login" | "register" | "manage">("closed");
  const [accountError, setAccountError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/feed-me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data.people)) return;
        setPeople(data.people);
        if (data.people.length) {
          setSelectedId((current) => data.people.some((p: Person) => p.id === current) ? current : data.people[0].id);
        }
        if (Array.isArray(data.menu?.days)) setMonth(data.menu.days);
        setAccount(data.account || null);
      })
      .catch((error) => {
        setSaveState("error");
        setOnboardingError(error instanceof Error ? error.message : "Could not load Meal Bank.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const reloadApp = async () => {
    const res = await fetch("/api/feed-me", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Could not refresh.");
    setPeople(Array.isArray(data.people) ? data.people : []);
    setSelectedId((current) => data.people?.some((p: Person) => p.id === current) ? current : data.people?.[0]?.id || "");
    setMonth(Array.isArray(data.menu?.days) ? data.menu.days : []);
    setAccount(data.account || null);
  };

  const submitAccount = async (event: React.FormEvent<HTMLFormElement>, action: "login" | "register") => {
    event.preventDefault();
    setAccountError("");
    setSaveState("saving");
    const fd = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          password: String(fd.get("password") || ""),
          inviteToken: new URLSearchParams(window.location.search).get("invite") || ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not continue.");
      if (action === "register" && new URLSearchParams(window.location.search).get("invite")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      await reloadApp();
      setAccountPanel("manage");
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      setAccountError(error instanceof Error ? error.message : "Could not continue.");
    }
  };

  const logout = async () => {
    await fetch("/api/feed-me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAccount(null);
    setAccountPanel("closed");
    setInviteLink("");
  };

  const createInvite = async () => {
    setAccountError("");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create-invite" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create invite.");
      const url = `${window.location.origin}?invite=${encodeURIComponent(data.inviteToken)}`;
      setInviteLink(url);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not create invite.");
    }
  };

  const acceptInviteFromUrl = async () => {
    const inviteToken = new URLSearchParams(window.location.search).get("invite");
    if (!inviteToken || !account) return;
    const res = await fetch("/api/feed-me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "accept-invite", inviteToken })
    });
    const data = await res.json();
    if (!res.ok) {
      setAccountError(data.error || "Could not join household.");
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    await reloadApp();
  };

  useEffect(() => {
    const hasInvite = new URLSearchParams(window.location.search).has("invite");
    if (hasInvite && !account) setAccountPanel("register");
    if (hasInvite && account) acceptInviteFromUrl();
  }, [account?.id]);

  const selected = people.find((p) => p.id === selectedId) || people[0];
  const householdLabel = people.filter((p) => p.dinerType !== "occasional").map((p) => p.name).join(" + ") || people.map((p) => p.name).join(" + ");

  const updateMealState = (day: number, mealType: "lunch" | "supper", patch: Partial<MenuDay>) => {
    setMonth((days) => days.map((item) => item.day === day ? { ...item, ...patch } : item));
  };

  const swapMeal = async (day: number, mealType: "lunch" | "supper") => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "swap-meal", day, mealType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not swap meal.");
      updateMealState(day, mealType, mealType === "lunch"
        ? { lunch: data.mealName }
        : { supper: data.mealName, supperSplit: false });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  };

  const generateMonth = async () => {
    setGenerating(true);
    setSaveState("saving");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "generate-month" })
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.menu?.days)) throw new Error("generation failed");
      setMonth(data.menu.days);
      setView("month");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    } finally {
      setGenerating(false);
    }
  };

  const setPreference = async (personId: string, mealName: string, preference: "like" | "favourite" | "dislike" | "never") => {
    const res = await fetch("/api/feed-me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "preference", personId, mealName, preference, remove: false })
    });
    if (!res.ok) throw new Error("save failed");
  };

  const toggleFavourite = async (mealName: string) => {
    if (!selected) return;
    const isFavourite = selected.favourites.some((x) => x.toLowerCase() === mealName.toLowerCase());
    const before = people;
    setPeople((all) => all.map((p) => {
      if (p.id !== selected.id) return p;
      if (isFavourite) {
        return {
          ...p,
          favourites: p.favourites.filter((x) => x.toLowerCase() !== mealName.toLowerCase()),
          likes: p.likes.some((x) => x.toLowerCase() === mealName.toLowerCase()) ? p.likes : [...p.likes, mealName]
        };
      }
      return {
        ...p,
        likes: p.likes.filter((x) => x.toLowerCase() !== mealName.toLowerCase()),
        favourites: p.favourites.some((x) => x.toLowerCase() === mealName.toLowerCase()) ? p.favourites : [...p.favourites, mealName]
      };
    }));
    setSaveState("saving");
    try {
      await setPreference(selected.id, mealName, isFavourite ? "like" : "favourite");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setPeople(before);
      setSaveState("error");
    }
  };

  const updateList = async (field: "likes" | "favourites" | "dislikes" | "never", value: string, remove = false) => {
    if (!selected) return;
    const meals = remove
      ? [value.trim()]
      : value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
    if (!meals.length) return;

    const uniqueMeals = [...new Map(meals.map((meal) => [meal.toLowerCase(), meal])).values()];
    const before = people;
    setPeople((all) => all.map((p) => {
      if (p.id !== selected.id) return p;
      if (remove) return { ...p, [field]: p[field].filter((x) => x.toLowerCase() !== uniqueMeals[0].toLowerCase()) };
      const existing = new Set(p[field].map((x) => x.toLowerCase()));
      return { ...p, [field]: [...p[field], ...uniqueMeals.filter((meal) => !existing.has(meal.toLowerCase()))] };
    }));

    setSaveState("saving");
    const preference = field === "likes" ? "like" : field === "favourites" ? "favourite" : field === "dislikes" ? "dislike" : "never";
    try {
      const results = await Promise.all(uniqueMeals.map((mealName) => fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "preference", personId: selected.id, mealName, preference, remove })
      })));
      if (results.some((res) => !res.ok)) throw new Error("save failed");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setPeople(before);
      setSaveState("error");
    }
  };

  const createPerson = async (name: string, dinerType: "regular" | "occasional") => {
    setSaveState("saving");
    const res = await fetch("/api/feed-me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "add-person", name: name.trim(), dinerType })
    });
    const data = await res.json();
    if (!res.ok || !data.person) throw new Error("save failed");
    const person: Person = { ...data.person, likes: [], favourites: [], dislikes: [], never: [] };
    setPeople((all) => [...all, person]);
    setSelectedId(person.id);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1200);
    return person;
  };

  const startHousehold = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = onboardingName.trim();
    if (!name) return;
    setSaveState("saving");
    setOnboardingError("");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start-household", name, dinerType: onboardingType })
      });
      const data = await res.json();
      if (!res.ok || !data.person) throw new Error([data.error, data.detail].filter(Boolean).join(" — ") || "Could not save your name.");
      const person: Person = { ...data.person, likes: [], favourites: [], dislikes: [], never: [] };
      setPeople([person]);
      setSelectedId(person.id);
      setOnboardingName("");
      setView("mealbank");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch (error) {
      setSaveState("error");
      setOnboardingError(error instanceof Error ? error.message : "Could not save your name.");
    }
  };

  const deletePerson = async (person: Person) => {
    if (!window.confirm(`Delete ${person.name} and their Meal Bank?`)) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete-person", personId: person.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete person.");
      const remaining = people.filter((p) => p.id !== person.id);
      setPeople(remaining);
      if (selectedId === person.id) setSelectedId(remaining[0]?.id || "");
      setMonth([]);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  };

  const addPerson = async () => {
    const name = window.prompt("Name of the person to add");
    if (!name?.trim()) return;
    const occasional = window.confirm("Are they an occasional diner?\n\nOK = occasional, Cancel = regular");
    try {
      await createPerson(name.trim(), occasional ? "occasional" : "regular");
    } catch {
      setSaveState("error");
    }
  };

  const list = (title: string, field: "likes" | "favourites" | "dislikes" | "never") => {
    if (!selected) return null;
    const canFavourite = field === "likes" || field === "favourites";
    return (
      <section className="card">
        <div className="cardtitle"><h3>{title}</h3>{field === "likes" ? <span>★ Click the star to make a favourite</span> : null}</div>
        <div className="chips">{selected[field].map((item) => <div className="chipwrap" key={item}>
          {canFavourite ? <button className={field === "favourites" ? "favstar active" : "favstar"} title={field === "favourites" ? "Move back to Likes" : "Make favourite"} onClick={() => toggleFavourite(item)}>★</button> : null}
          <button className="chip" onClick={() => updateList(field, item, true)}>{item} ×</button>
        </div>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateList(field, String(fd.get("meal") || "")); e.currentTarget.reset(); }} className="addrow">
          <input name="meal" placeholder="Type meals, separated by commas…" /><button>Add</button>
        </form>
      </section>
    );
  };

  return <main>
    <header><div className="brand"><div className="brandmark">🍋</div><div><strong>Feed Me</strong><span>What are we eating this month?</span></div></div><div className="headright">{people.length ? <nav><button onClick={() => setView("mealbank")}>Meal bank</button><button onClick={() => setView("month")}>This month</button></nav> : null}<button className="accountbtn" onClick={() => setAccountPanel(account ? "manage" : "login")}>{account ? account.name : "Sign in"}</button></div></header>
    {accountPanel !== "closed" ? <div className="accountoverlay" onClick={() => setAccountPanel("closed")}><section className="accountpanel" onClick={(e) => e.stopPropagation()}>
      <button className="closepanel" onClick={() => setAccountPanel("closed")}>×</button>
      {accountPanel === "manage" && account ? <>
        <small>YOUR ACCOUNT</small><h2>{account.name}</h2><p>{account.email}</p>
        <p className="accountnote">Your Meal Bank and monthly plans now follow your account across devices.</p>
        <button className="cta" onClick={createInvite}>Invite someone to this household</button>
        {inviteLink ? <div className="invitelink"><b>Invite link copied</b><input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} /></div> : null}
        <button className="textbutton" onClick={logout}>Sign out</button>
      </> : <>
        <small>{accountPanel === "register" ? "CREATE ACCOUNT" : "WELCOME BACK"}</small>
        <h2>{accountPanel === "register" ? "Save your household" : "Sign in"}</h2>
        <p>{accountPanel === "register" ? "Create an account and keep the household you have already built." : "Open the same household on any device."}</p>
        <form className="accountform" onSubmit={(e) => submitAccount(e, accountPanel === "register" ? "register" : "login")}>
          {accountPanel === "register" ? <input name="name" placeholder="Your name" required /> : null}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" minLength={8} required />
          <button className="cta">{saveState === "saving" ? "Please wait…" : accountPanel === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <button className="textbutton" onClick={() => { setAccountError(""); setAccountPanel(accountPanel === "register" ? "login" : "register"); }}>{accountPanel === "register" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
      </>}
      {accountError ? <div className="onboardingerror">{accountError}</div> : null}
    </section></div> : null}
    {!loading && people.length === 0 ? <section className="onboarding">
      <div className="stepbadge">STEP 1 OF 2</div>
      <div className="onboardingicon">👋</div>
      <h1>Who are we feeding?</h1>
      <p>Start with one person. Add everyone else in a moment.</p>
      <form onSubmit={startHousehold}>
        <input value={onboardingName} onChange={(e) => setOnboardingName(e.target.value)} placeholder="Name" autoFocus />
        <div className="typepick">
          <button type="button" className={onboardingType === "regular" ? "active" : ""} onClick={() => setOnboardingType("regular")}>Regular diner</button>
          <button type="button" className={onboardingType === "occasional" ? "active" : ""} onClick={() => setOnboardingType("occasional")}>Occasional diner</button>
        </div>
        <button className="cta" disabled={!onboardingName.trim() || saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Continue"}</button>
        {onboardingError ? <div className="onboardingerror">{onboardingError}</div> : null}
      </form>
    </section> : view === "mealbank" ? <>
      <div className="hero"><div className="herobadge">✨ THREE CLICKS. MONTH SORTED.</div><h1>Tell us what you love.<br/><span>We’ll sort the month.</span></h1><p>No endless recipe hunting. Just a smart month of meals built around the people you actually feed.</p><div className="heropills"><span>🍝 Shared favourites</span><span>🥗 Easy lunches</span><span>⭐ Personal picks</span></div><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : month.length ? "Regenerate my month" : "Generate my month"}</button></div>
      <div className="setuphint"><b>Build your Meal Bank</b><span>Add the meals you actually eat. Paste several at once, separated by commas.</span>{!account ? <button className="savehousehold" onClick={() => setAccountPanel("register")}>Save this household</button> : null}</div>
      <div className="people">{people.map((p) => <div className="personwrap" key={p.id}><button className={selectedId === p.id ? "person active" : "person"} onClick={() => setSelectedId(p.id)}>{p.name}{p.dinerType === "occasional" ? " · occasional" : ""}</button><button className="deleteperson" title={`Delete ${p.name}`} onClick={() => deletePerson(p)}>×</button></div>)}<button className="person addperson" onClick={addPerson}>+ Add person</button><span className={`savestate ${saveState}`}>{loading ? "Loading Meal Bank…" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn’t save" : ""}</span></div>
      <div className="grid">{list("Likes","likes")}{list("Favourites","favourites")}{list("Dislikes","dislikes")}{list("Never serve","never")}</div>
    </> : <section className="month"><div className="monthtop"><div><div className="monthbadge">🍽️ {householdLabel.toUpperCase()}</div><h1>This month</h1><p>This isn’t a random list. Feed Me balances shared meals, personal favourites and practical cooking so the plan actually works for your household.</p></div><button className="regen" onClick={generateMonth} disabled={generating}>{generating ? "Sorting…" : "Regenerate"}</button></div><div className="logic">
  <div><b>Shared meals are the default</b><span>Meals the regular diners both enjoy are prioritised so most nights only need one supper.</span></div>
  <div><b>Favourites still matter</b><span>Personal favourites are worked into the month rather than disappearing just because they are not shared.</span></div>
  <div><b>Mixed suppers, occasionally</b><span>When a favourite is worth it, Feed Me can give two different mains while keeping shared sides wherever possible.</span></div>
  <div><b>Lunch stays simple</b><span>Lunches lean towards soups, sandwiches, salads, toasties, baked potatoes and other easy meals.</span></div>
  <div><b>Variety without chaos</b><span>Your wider Meal Bank is used for swap-ins, seasonality and variety instead of repeating the same small set.</span></div>
  <div><b>Flexible nights count too</b><span>Takeaway and low-effort favourites can be useful when cooking separate meals is not worth it.</span></div>
  <div><b>Dislikes are respected</b><span>Anything marked Dislike or Never serve is kept out of the plan.</span></div>
  <div><b>You stay in control</b><span>Swap any meal you do not fancy without regenerating the whole month.</span></div>
</div>{month.length ? <div className="monthgrid">{month.map((d) => <article key={d.day} className={d.supperSplit ? "splitday" : ""}><b>Day {d.day}</b><label>Lunch</label><div className="mealrow"><div>{d.lunch}</div><div className="mealactions"><button onClick={() => swapMeal(d.day, "lunch")}>Swap</button></div></div><label>Supper {d.supperSplit ? "· mixed supper" : ""}</label><div className="mealrow"><div>{d.supper}</div><div className="mealactions"><button onClick={() => swapMeal(d.day, "supper")}>Swap</button></div></div></article>)}</div> : <div className="emptymonth"><h2>No month yet</h2><p>Generate a month from your household Meal Banks.</p><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : "Generate my month"}</button></div>}</section>}
    <style jsx global>{`
      :root{
        --ink:#1d2230;
        --muted:#6f7482;
        --cream:#fffaf0;
        --paper:#ffffff;
        --coral:#ff6b6b;
        --pink:#ff7eb3;
        --yellow:#ffd166;
        --lime:#b8f36a;
        --mint:#8ee3cf;
        --blue:#7ac7ff;
        --purple:#a88bff;
        --line:#ece7dc;
        --shadow:0 18px 45px rgba(46,38,20,.10);
      }
      *{box-sizing:border-box}
      body{
        margin:0;
        color:var(--ink);
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        background:
          radial-gradient(circle at 10% 10%,rgba(255,209,102,.35),transparent 25%),
          radial-gradient(circle at 90% 12%,rgba(122,199,255,.28),transparent 26%),
          linear-gradient(180deg,#fffdf8 0%,#fff8ef 100%);
        min-height:100vh;
      }
      button,input{font:inherit}
      button{cursor:pointer}
      header{
        position:sticky;top:0;z-index:20;
        display:flex;justify-content:space-between;align-items:center;
        padding:16px 5vw;
        background:rgba(255,253,248,.86);
        backdrop-filter:blur(18px);
        border-bottom:1px solid rgba(236,231,220,.9)
      }
      .brand{display:flex;align-items:center;gap:10px}
      .brandmark{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,var(--yellow),#fff3a4);box-shadow:0 8px 20px rgba(255,209,102,.35);font-size:20px}
      header strong{display:block;font:800 28px/1 Georgia,serif;letter-spacing:-.5px}
      header span{font-size:11px;color:var(--muted)}
      .headright{display:flex;align-items:center;gap:8px}
      nav{display:flex;gap:8px}
      nav button,.person,.regen,.accountbtn,.savehousehold{
        border:1px solid var(--line);
        background:rgba(255,255,255,.9);
        border-radius:999px;
        padding:9px 14px;
        color:var(--ink);
        box-shadow:0 4px 14px rgba(46,38,20,.05);
        transition:.2s ease
      }
      nav button:hover,.person:hover,.regen:hover,.accountbtn:hover,.savehousehold:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(46,38,20,.08)}
      .hero{
        max-width:1050px;margin:0 auto;text-align:center;
        padding:88px 24px 54px;
        position:relative
      }
      .hero:before,.hero:after{content:"";position:absolute;border-radius:999px;filter:blur(2px);z-index:-1}
      .hero:before{width:170px;height:170px;background:rgba(255,126,179,.18);left:2%;top:70px}
      .hero:after{width:200px;height:200px;background:rgba(142,227,207,.20);right:2%;top:110px}
      .herobadge,.stepbadge,.monthbadge{
        display:inline-flex;align-items:center;gap:6px;
        background:#fff;border:1px solid var(--line);
        border-radius:999px;padding:8px 12px;
        font-size:11px;font-weight:800;letter-spacing:.08em;
        box-shadow:0 6px 18px rgba(46,38,20,.06)
      }
      .hero h1,.month h1,.onboarding h1{
        font:800 clamp(52px,7vw,88px)/.95 Georgia,serif;
        letter-spacing:-3px;margin:20px 0 18px
      }
      .hero h1 span{
        background:linear-gradient(90deg,var(--coral),var(--purple),var(--blue));
        -webkit-background-clip:text;background-clip:text;color:transparent
      }
      .hero p,.month p,.onboarding p{color:var(--muted);font-size:18px;line-height:1.55}
      .heropills{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:24px}
      .heropills span{background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 12px;font-size:13px}
      .cta{
        border:0;border-radius:16px;
        background:linear-gradient(135deg,var(--coral),var(--pink));
        color:white;padding:14px 22px;font-weight:800;margin-top:18px;
        box-shadow:0 14px 30px rgba(255,107,107,.28);
        transition:.2s ease
      }
      .cta:hover{transform:translateY(-2px);box-shadow:0 18px 38px rgba(255,107,107,.34)}
      .people,.grid,.month{max-width:1180px;margin:auto}
      .setuphint{
        max-width:1180px;margin:0 auto 14px;padding:0 24px;
        display:flex;gap:10px;align-items:center
      }
      .setuphint b{font-size:14px}
      .setuphint span{color:var(--muted);font-size:13px}
      .setuphint .savehousehold{margin-left:auto;background:linear-gradient(135deg,#fff7c7,#fff)}
      .people{padding:0 24px 18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .personwrap{display:flex;align-items:center;position:relative}
      .personwrap .person{padding-right:30px}
      .person.active{background:linear-gradient(135deg,var(--purple),#7e65db);color:white;border-color:transparent}
      .deleteperson{position:absolute;right:6px;border:0;background:transparent;color:#999;font-size:18px;line-height:1;padding:4px}
      .deleteperson:hover{color:var(--coral)}
      .person.active+.deleteperson{color:#eee}
      .addperson{border-style:dashed;background:#fffdf7}
      .savestate{margin-left:auto;font-size:12px;color:var(--muted)}
      .savestate.error{color:#b93838}.savestate.saved{color:#367c5a}
      .grid{padding:0 24px 80px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .card{
        position:relative;overflow:hidden;
        background:rgba(255,255,255,.92);
        border:1px solid var(--line);
        border-radius:24px;padding:22px;
        box-shadow:var(--shadow)
      }
      .card:nth-child(1){background:linear-gradient(180deg,#fff 0%,#fff8d9 100%)}
      .card:nth-child(2){background:linear-gradient(180deg,#fff 0%,#ffe8f3 100%)}
      .card:nth-child(3){background:linear-gradient(180deg,#fff 0%,#eaf8ff 100%)}
      .card:nth-child(4){background:linear-gradient(180deg,#fff 0%,#f0eaff 100%)}
      .card h3{margin:0;font:800 23px Georgia,serif}
      .cardtitle{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:14px}
      .cardtitle span{font-size:11px;color:var(--muted)}
      .chips{display:flex;gap:7px;flex-wrap:wrap;min-height:38px}
      .chipwrap{display:flex;align-items:center;background:rgba(255,255,255,.88);border:1px solid rgba(236,231,220,.8);border-radius:999px;padding-left:5px;box-shadow:0 3px 8px rgba(46,38,20,.05)}
      .chip{border:0;background:transparent;color:#465342;border-radius:999px;padding:7px 10px 7px 5px}
      .favstar{border:0;background:transparent;color:#c5b991;font-size:15px;padding:5px 3px}
      .favstar.active{color:#ffb703;text-shadow:0 2px 8px rgba(255,183,3,.25)}
      .addrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:16px}
      .addrow input,.onboarding input,.accountform input,.invitelink input{
        border:1px solid #ddd7ca;border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.95);outline:none
      }
      .addrow input:focus,.onboarding input:focus,.accountform input:focus{border-color:var(--purple);box-shadow:0 0 0 4px rgba(168,139,255,.12)}
      .addrow button{border:0;border-radius:14px;background:var(--ink);color:white;padding:0 18px;font-weight:700}
      .month{padding:56px 24px 80px}
      .monthtop{display:flex;justify-content:space-between;align-items:end;gap:24px}
      .monthtop h1{font-size:68px;margin:14px 0 10px}
      .regen{background:linear-gradient(135deg,#fff,#f4efff);font-weight:700}
      .logic{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:26px}
      .logic div{
        border-radius:18px;padding:16px;border:1px solid rgba(255,255,255,.75);
        box-shadow:0 10px 24px rgba(46,38,20,.07)
      }
      .logic div:nth-child(1){background:#fff2ce}.logic div:nth-child(2){background:#ffe4f0}
      .logic div:nth-child(3){background:#e8f8ff}.logic div:nth-child(4){background:#eafbea}
      .logic div:nth-child(5){background:#f0eaff}.logic div:nth-child(6){background:#fff0e4}
      .logic div:nth-child(7){background:#e9fbf6}.logic div:nth-child(8){background:#fff7d9}
      .logic b{display:block;font-size:13px;margin-bottom:5px}
      .logic span{font-size:12px;color:#606575;line-height:1.45}
      .monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:28px}
      .monthgrid article{
        background:rgba(255,255,255,.95);
        border:1px solid var(--line);
        border-radius:20px;padding:18px;min-height:190px;
        box-shadow:0 12px 28px rgba(46,38,20,.07);
        transition:.18s ease
      }
      .monthgrid article:hover{transform:translateY(-2px);box-shadow:0 16px 32px rgba(46,38,20,.10)}
      .monthgrid article:nth-child(6n+1){border-top:5px solid var(--yellow)}
      .monthgrid article:nth-child(6n+2){border-top:5px solid var(--pink)}
      .monthgrid article:nth-child(6n+3){border-top:5px solid var(--blue)}
      .monthgrid article:nth-child(6n+4){border-top:5px solid var(--mint)}
      .monthgrid article:nth-child(6n+5){border-top:5px solid var(--purple)}
      .monthgrid article:nth-child(6n){border-top:5px solid var(--coral)}
      .monthgrid article.splitday{background:linear-gradient(180deg,#fff 0%,#fff6fb 100%);border-style:solid}
      .monthgrid label{display:block;margin-top:14px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8a8e98;font-weight:800}
      .mealrow{display:grid;gap:8px}
      .mealactions{display:flex;gap:6px}
      .mealactions button{border:1px solid #e2ddd2;background:#fff;border-radius:999px;padding:5px 9px;font-size:11px}
      .mealactions button.locked{background:var(--ink);color:white;border-color:var(--ink)}
      .mealactions button:disabled{opacity:.4;cursor:not-allowed}
      .emptymonth{text-align:center;background:#fff;border:1px solid var(--line);border-radius:24px;padding:52px;margin-top:28px;box-shadow:var(--shadow)}
      .emptymonth h2{font:700 36px Georgia,serif;margin:0 0 10px}
      .onboarding{max-width:650px;margin:0 auto;padding:100px 24px;text-align:center}
      .onboardingicon{font-size:52px;margin-top:24px}
      .onboarding form{max-width:430px;margin:30px auto 0;display:grid;gap:12px}
      .typepick{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .typepick button{border:1px solid var(--line);background:white;border-radius:14px;padding:12px}
      .typepick button.active{background:linear-gradient(135deg,var(--purple),#7e65db);color:white;border-color:transparent}
      .onboardingerror{font-size:13px;color:#b93838}
      .accountoverlay{position:fixed;inset:0;z-index:50;background:rgba(25,29,24,.34);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px}
      .accountpanel{position:relative;width:min(430px,100%);background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.18)}
      .accountpanel h2{font:700 36px Georgia,serif;margin:8px 0}
      .accountpanel p{color:var(--muted)}
      .closepanel{position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:26px;color:#888}
      .accountform{display:grid;gap:10px;margin-top:18px}
      .textbutton{border:0;background:transparent;color:#596557;text-decoration:underline;margin-top:14px}
      .accountnote{background:linear-gradient(135deg,#f5f0ff,#fff);border-radius:14px;padding:14px}
      .invitelink{display:grid;gap:6px;margin-top:14px}
      button:disabled{opacity:.6;cursor:wait}
      @media(max-width:950px){.logic{grid-template-columns:repeat(2,1fr)}.monthgrid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:700px){
        header{padding:14px 16px}.brandmark{width:36px;height:36px}.headright{gap:5px}
        nav button,.accountbtn{padding:8px 10px;font-size:12px}
        header span{display:none}
        .hero{padding-top:58px}.hero h1,.onboarding h1{letter-spacing:-2px}
        .grid,.monthgrid,.logic{grid-template-columns:1fr}
        .monthtop{align-items:flex-start;flex-direction:column}
        .monthtop h1{font-size:54px}
        .setuphint{align-items:flex-start;flex-direction:column}
        .setuphint .savehousehold{margin-left:0}
        .accountoverlay{padding:70px 10px 10px}
      }
    `}</style>
  </main>;
}
