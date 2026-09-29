"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string; dinerType?: "regular" | "occasional"; photoUrl?: string | null; likes: string[]; favourites: string[]; dislikes: string[]; never: string[] };
type MenuDay = { day: number; lunch: string; supper: string; supperSplit?: boolean; lunchLocked?: boolean; supperLocked?: boolean };
type Account = { id: string; email: string; name: string; role?: string | null };

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
      const url = `${window.location.origin}/dashboard?invite=${encodeURIComponent(data.inviteToken)}`;
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
    const params = new URLSearchParams(window.location.search);
    const hasInvite = params.has("invite");
    const auth = params.get("auth");
    if (hasInvite && !account) setAccountPanel("register");
    if (hasInvite && account) acceptInviteFromUrl();
    if (!hasInvite && !account && auth === "login") setAccountPanel("login");
    if (!hasInvite && !account && auth === "register") setAccountPanel("register");
  }, [account?.id]);

  const uploadPersonPhoto = async (person: Person, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSaveState("saving");
    try {
      const photoData = await new Promise<string>((resolve, reject) => {
        const image = new Image();
        const reader = new FileReader();
        reader.onload = () => {
          image.onload = () => {
            const size = 320;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Could not process image."));
            const scale = Math.max(size / image.width, size / image.height);
            const width = image.width * scale;
            const height = image.height * scale;
            ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
            resolve(canvas.toDataURL("image/jpeg", .72));
          };
          image.onerror = () => reject(new Error("Could not read image."));
          image.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error("Could not read image."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-person-photo", personId: person.id, photoData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save photo.");
      setPeople((all) => all.map((p) => p.id === person.id ? { ...p, photoUrl: data.photoUrl } : p));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  };

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
    <header><a className="brand" href="/"><div className="brandmark">FM</div><div><strong>Feed Me</strong><span>What are we eating this month?</span></div></a><div className="headright">{people.length ? <nav><button onClick={() => setView("mealbank")}>Meal bank</button><button onClick={() => setView("month")}>This month</button></nav> : null}<button className="accountbtn" onClick={() => setAccountPanel(account ? "manage" : "login")}>{account ? account.name : "Sign in"}</button></div></header>
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
      <div className="workspaceIntro"><div><small>YOUR HOUSEHOLD</small><h1>Meal Bank</h1><p>Add the meals you actually eat. Feed Me uses these preferences to build your month.</p></div><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : month.length ? "Regenerate month" : "Generate month"}</button></div>
      <div className="setuphint"><b>Build your Meal Bank</b><span>Add the meals you actually eat. Paste several at once, separated by commas.</span>{!account ? <button className="savehousehold" onClick={() => setAccountPanel("register")}>Save this household</button> : null}</div>
      <div className="people">{people.map((p) => <div className={selectedId === p.id ? "personcard active" : "personcard"} key={p.id}>
        <button className="personselect" onClick={() => setSelectedId(p.id)}>
          <span className="avatar">{p.photoUrl ? <img src={p.photoUrl} alt="" /> : p.name.slice(0,1).toUpperCase()}</span>
          <span className="personcopy"><b>{p.name}</b><small>{p.dinerType === "occasional" ? "Occasional diner" : "Regular diner"}</small></span>
        </button>
        <label className="photoedit" title={`Add a photo for ${p.name}`}><input type="file" accept="image/*" onChange={(e) => uploadPersonPhoto(p, e.target.files?.[0])}/><span>Photo</span></label>
        <button className="deleteperson" title={`Delete ${p.name}`} onClick={() => deletePerson(p)}>×</button>
      </div>)}<button className="personcard addperson" onClick={addPerson}><span className="avatar addavatar">+</span><span className="personcopy"><b>Add person</b><small>Regular or occasional</small></span></button><span className={`savestate ${saveState}`}>{loading ? "Loading…" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn’t save" : ""}</span></div>
      <div className="grid">{list("Likes","likes")}{list("Favourites","favourites")}{list("Dislikes","dislikes")}{list("Never serve","never")}</div>
    </> : <section className="month"><div className="monthtop"><div><div className="monthbadge">🍽️ {householdLabel.toUpperCase()}</div><h1>This month</h1><p>Your household plan, built from the Meal Banks above.</p></div><button className="regen" onClick={generateMonth} disabled={generating}>{generating ? "Sorting…" : "Regenerate"}</button></div>{month.length ? <div className="monthgrid">{month.map((d) => <article key={d.day} className={d.supperSplit ? "splitday" : ""}><b>Day {d.day}</b><label>Lunch</label><div className="mealrow"><div>{d.lunch}</div><div className="mealactions"><button onClick={() => swapMeal(d.day, "lunch")}>Swap</button></div></div><label>Supper {d.supperSplit ? "· mixed supper" : ""}</label><div className="mealrow"><div>{d.supper}</div><div className="mealactions"><button onClick={() => swapMeal(d.day, "supper")}>Swap</button></div></div></article>)}</div> : <div className="emptymonth"><h2>No month yet</h2><p>Generate a month from your household Meal Banks.</p><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : "Generate my month"}</button></div>}</section>}
    <style jsx global>{`
      :root{--ink:#1a1d1b;--muted:#737772;--paper:rgba(255,255,255,.54);--line:rgba(255,255,255,.78);--softline:rgba(48,54,48,.10);--accent:#d9f28b;--deep:#263025;--shadow:0 18px 50px rgba(54,61,52,.10)}
      *{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 12% 4%,rgba(218,238,198,.72),transparent 27%),radial-gradient(circle at 88% 12%,rgba(207,223,239,.68),transparent 24%),linear-gradient(145deg,#f5f4ef,#ebece7 62%,#f4f2ec)}
      body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.25),transparent 40%);z-index:-1}button,input{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}
      header{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:14px 5vw;background:rgba(247,247,242,.62);backdrop-filter:blur(24px) saturate(125%);border-bottom:1px solid rgba(255,255,255,.72);box-shadow:0 8px 30px rgba(55,60,50,.04)}
      .brand{display:flex;align-items:center;gap:10px}.brandmark{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.88);box-shadow:inset 0 1px 0 #fff,0 8px 20px rgba(55,60,50,.08);font:700 11px Georgia,serif;letter-spacing:.04em}.brand strong{display:block;font:600 27px/1 Georgia,serif;letter-spacing:-.7px}.brand span{font-size:10px;color:var(--muted)}
      .headright{display:flex;align-items:center;gap:8px}nav{display:flex;gap:7px}nav button,.accountbtn,.savehousehold,.regen{border:1px solid var(--line);background:rgba(255,255,255,.48);backdrop-filter:blur(18px);border-radius:999px;padding:9px 14px;color:var(--ink);box-shadow:inset 0 1px 0 rgba(255,255,255,.8);transition:.18s}nav button:hover,.accountbtn:hover,.savehousehold:hover,.regen:hover{background:rgba(255,255,255,.72);transform:translateY(-1px)}
      .workspaceIntro{max-width:1180px;margin:0 auto;padding:66px 24px 30px;display:flex;align-items:end;justify-content:space-between;gap:28px}.workspaceIntro small,.monthbadge,.accountpanel small{font-size:10px;letter-spacing:.11em;font-weight:800;color:#747a71}.workspaceIntro h1,.month h1,.onboarding h1{font:500 clamp(44px,6vw,68px)/1 Georgia,serif;letter-spacing:-2px;margin:7px 0 9px}.workspaceIntro p,.month p,.onboarding p{color:var(--muted);font-size:15px;line-height:1.55;margin:0;max-width:640px}
      .cta{border:0;border-radius:999px;background:var(--deep);color:#fff;padding:13px 20px;font-weight:700;box-shadow:0 12px 28px rgba(28,34,27,.16);transition:.18s;white-space:nowrap}.cta:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(28,34,27,.20)}
      .setuphint{max-width:1180px;margin:0 auto 14px;padding:0 24px;display:flex;gap:9px;align-items:center}.setuphint b{font-size:13px}.setuphint span{color:var(--muted);font-size:12px}.setuphint .savehousehold{margin-left:auto}
      .people{max-width:1180px;margin:0 auto;padding:0 24px 22px;display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}.personcard{position:relative;display:flex;align-items:center;min-width:210px;padding:8px 38px 8px 8px;border-radius:20px;border:1px solid var(--line);background:rgba(255,255,255,.40);backdrop-filter:blur(18px);box-shadow:inset 0 1px 0 rgba(255,255,255,.88),0 10px 24px rgba(55,60,50,.05);transition:.18s}.personcard.active{background:rgba(255,255,255,.72);box-shadow:inset 0 1px 0 #fff,0 15px 32px rgba(55,60,50,.09);border-color:rgba(255,255,255,.95)}.personselect{display:flex;align-items:center;gap:10px;border:0;background:transparent;padding:0;text-align:left;flex:1}.avatar{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#dce6d1,#eef1e8);overflow:hidden;font:600 19px Georgia,serif}.avatar img{width:100%;height:100%;object-fit:cover}.personcopy b,.personcopy small{display:block}.personcopy b{font-size:14px}.personcopy small{font-size:10px;color:var(--muted);margin-top:2px}.photoedit{position:absolute;right:8px;bottom:7px;font-size:9px;color:#7f847c;cursor:pointer}.photoedit input{display:none}.deleteperson{position:absolute;right:7px;top:5px;border:0;background:transparent;color:#9b9f99;font-size:16px}.deleteperson:hover{color:#7d4d4d}.addperson{padding-right:12px;border-style:dashed;cursor:pointer}.addavatar{font-size:24px;color:#6e756c}.savestate{align-self:center;margin-left:auto;font-size:11px;color:var(--muted)}.savestate.saved{color:#557057}.savestate.error{color:#985b5b}
      .grid{max-width:1180px;margin:0 auto;padding:0 24px 80px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:linear-gradient(135deg,rgba(255,255,255,.62),rgba(255,255,255,.31));border:1px solid var(--line);border-radius:26px;padding:22px;box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(26px)}.card h3{margin:0;font:600 23px Georgia,serif}.cardtitle{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:15px}.cardtitle span{font-size:10px;color:var(--muted)}.chips{display:flex;gap:7px;flex-wrap:wrap;min-height:36px}.chipwrap{display:flex;align-items:center;background:rgba(255,255,255,.48);border:1px solid rgba(255,255,255,.76);border-radius:999px;padding-left:5px}.chip{border:0;background:transparent;color:#485047;border-radius:999px;padding:7px 10px 7px 5px}.favstar{border:0;background:transparent;color:#a8aaa2;font-size:14px;padding:5px 3px}.favstar.active{color:#a48932}.addrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:16px}.addrow input,.onboarding input,.accountform input,.invitelink input{border:1px solid rgba(60,65,58,.11);border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.58);outline:none}.addrow input:focus,.onboarding input:focus,.accountform input:focus{border-color:rgba(62,82,60,.30);box-shadow:0 0 0 4px rgba(190,215,173,.20)}.addrow button{border:0;border-radius:14px;background:var(--deep);color:white;padding:0 18px;font-weight:700}
      .month{max-width:1180px;margin:auto;padding:62px 24px 80px}.monthtop{display:flex;justify-content:space-between;align-items:end;gap:24px}.monthtop h1{font-size:62px;margin:10px 0 8px}.monthbadge{display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.43);border:1px solid var(--line);backdrop-filter:blur(18px)}.monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}.monthgrid article{background:linear-gradient(135deg,rgba(255,255,255,.62),rgba(255,255,255,.31));border:1px solid var(--line);border-radius:22px;padding:17px;min-height:185px;box-shadow:0 12px 28px rgba(55,60,50,.06),inset 0 1px 0 rgba(255,255,255,.85);backdrop-filter:blur(20px)}.monthgrid article.splitday{background:linear-gradient(135deg,rgba(240,246,226,.70),rgba(255,255,255,.36))}.monthgrid label{display:block;margin-top:14px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8b9089;font-weight:800}.mealrow{display:grid;gap:8px}.mealactions{display:flex;gap:6px}.mealactions button{border:1px solid var(--softline);background:rgba(255,255,255,.48);border-radius:999px;padding:5px 9px;font-size:10px}.emptymonth{text-align:center;background:rgba(255,255,255,.48);border:1px solid var(--line);border-radius:26px;padding:52px;margin-top:28px;box-shadow:var(--shadow);backdrop-filter:blur(24px)}.emptymonth h2{font:600 34px Georgia,serif;margin:0 0 9px}
      .onboarding{max-width:650px;margin:0 auto;padding:100px 24px;text-align:center}.stepbadge{display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.48);border:1px solid var(--line);font-size:10px;letter-spacing:.1em;font-weight:800}.onboardingicon{font:500 30px Georgia,serif;margin-top:24px}.onboarding form{max-width:430px;margin:30px auto 0;display:grid;gap:12px}.typepick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.typepick button{border:1px solid var(--line);background:rgba(255,255,255,.44);border-radius:14px;padding:12px}.typepick button.active{background:var(--deep);color:white;border-color:var(--deep)}.onboardingerror{font-size:12px;color:#985b5b}
      .accountoverlay{position:fixed;inset:0;z-index:50;background:rgba(31,35,30,.20);backdrop-filter:blur(10px);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px}.accountpanel{position:relative;width:min(430px,100%);background:linear-gradient(135deg,rgba(255,255,255,.80),rgba(255,255,255,.52));border:1px solid rgba(255,255,255,.92);border-radius:28px;padding:28px;box-shadow:0 30px 80px rgba(35,40,33,.16),inset 0 1px 0 #fff;backdrop-filter:blur(30px)}.accountpanel h2{font:600 35px Georgia,serif;margin:8px 0}.accountpanel p{color:var(--muted)}.closepanel{position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:26px;color:#888}.accountform{display:grid;gap:10px;margin-top:18px}.textbutton{border:0;background:transparent;color:#596557;text-decoration:underline;margin-top:14px}.accountnote{background:rgba(255,255,255,.40);border:1px solid rgba(255,255,255,.72);border-radius:14px;padding:14px}.invitelink{display:grid;gap:6px;margin-top:14px}button:disabled{opacity:.6;cursor:wait}
      @media(max-width:950px){.monthgrid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:700px){header{padding:13px 15px}.brand span{display:none}.headright{gap:5px}nav button,.accountbtn{padding:8px 10px;font-size:11px}.workspaceIntro,.monthtop{align-items:flex-start;flex-direction:column}.workspaceIntro{padding-top:44px}.workspaceIntro .cta{width:100%}.grid,.monthgrid{grid-template-columns:1fr}.setuphint{align-items:flex-start;flex-direction:column}.setuphint .savehousehold{margin-left:0}.personcard{min-width:calc(50% - 5px);flex:1}.savestate{width:100%;margin-left:0}.monthtop h1{font-size:50px}.accountoverlay{padding:70px 10px 10px}}
      @media(max-width:460px){.personcard{min-width:100%}.grid{padding-left:14px;padding-right:14px}.people,.setuphint,.workspaceIntro,.month{padding-left:14px;padding-right:14px}}
    `}</style>
  </main>;
}
