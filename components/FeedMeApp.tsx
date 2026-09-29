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
          password: String(fd.get("password") || "")
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not continue.");
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
    if (account) acceptInviteFromUrl();
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
    <header><div><strong>Feed Me</strong><span>What are we eating this month?</span></div><div className="headright">{people.length ? <nav><button onClick={() => setView("mealbank")}>Meal bank</button><button onClick={() => setView("month")}>This month</button></nav> : null}<button className="accountbtn" onClick={() => setAccountPanel(account ? "manage" : "login")}>{account ? account.name : "Sign in"}</button></div></header>
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
      <small>STEP 1 OF 2</small>
      <h1>Who are we feeding?</h1>
      <p>Start with one person. You can add everyone else next.</p>
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
      <div className="hero"><small>THREE CLICKS. MONTH SORTED.</small><h1>Tell us what you like.<br/>We’ll sort the month.</h1><p>No recipe hunting. Just the meals your household actually enjoys.</p><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : month.length ? "Regenerate my month" : "Generate my month"}</button></div>
      <div className="setuphint"><b>Build your Meal Bank</b><span>Add the meals you actually eat. Paste several at once, separated by commas.</span>{!account ? <button className="savehousehold" onClick={() => setAccountPanel("register")}>Save this household</button> : null}</div>
      <div className="people">{people.map((p) => <div className="personwrap" key={p.id}><button className={selectedId === p.id ? "person active" : "person"} onClick={() => setSelectedId(p.id)}>{p.name}{p.dinerType === "occasional" ? " · occasional" : ""}</button><button className="deleteperson" title={`Delete ${p.name}`} onClick={() => deletePerson(p)}>×</button></div>)}<button className="person addperson" onClick={addPerson}>+ Add person</button><span className={`savestate ${saveState}`}>{loading ? "Loading Meal Bank…" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn’t save" : ""}</span></div>
      <div className="grid">{list("Likes","likes")}{list("Favourites","favourites")}{list("Dislikes","dislikes")}{list("Never serve","never")}</div>
    </> : <section className="month"><div className="monthtop"><div><small>{householdLabel.toUpperCase()}</small><h1>This month</h1><p>This isn’t a random list. Feed Me builds the month around your household’s Meal Banks, balancing shared meals, personal favourites and practical cooking.</p></div><button className="regen" onClick={generateMonth} disabled={generating}>{generating ? "Sorting…" : "Regenerate"}</button></div><div className="logic">
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
      *{box-sizing:border-box} body{margin:0;background:#f7f6f2;color:#20251f;font-family:Arial,sans-serif} button,input{font:inherit} button{cursor:pointer}
      header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:18px 5vw;background:rgba(247,246,242,.95);border-bottom:1px solid #e5e2d9}.headright{display:flex;align-items:center;gap:8px}.accountbtn,.savehousehold{border:1px solid #ddd8cc;background:white;border-radius:999px;padding:9px 14px} header strong{display:block;font:700 28px Georgia,serif} header span{font-size:12px;color:#777} nav{display:flex;gap:8px} nav button,.person,.regen{border:1px solid #ddd8cc;background:white;border-radius:999px;padding:9px 14px}
      .hero{max-width:900px;margin:auto;text-align:center;padding:90px 24px 60px}.hero small,.month small{color:#657062;font-weight:700;letter-spacing:.08em}.hero h1,.month h1{font:600 clamp(46px,7vw,78px)/1 Georgia,serif;letter-spacing:-2px;margin:18px 0}.hero p,.month p{color:#73776f;font-size:18px}.cta{border:0;border-radius:14px;background:#263126;color:white;padding:14px 20px;font-weight:700;margin-top:10px}
      .accountoverlay{position:fixed;inset:0;z-index:50;background:rgba(25,29,24,.32);display:flex;align-items:flex-start;justify-content:flex-end;padding:76px 24px 24px}.accountpanel{position:relative;width:min(420px,100%);background:#fff;border:1px solid #e2ded2;border-radius:22px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.15)}.accountpanel h2{font:600 34px Georgia,serif;margin:8px 0}.accountpanel p{color:#73776f}.closepanel{position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:26px;color:#888}.accountform{display:grid;gap:10px;margin-top:18px}.accountform input,.invitelink input{border:1px solid #d8d3c7;border-radius:12px;padding:12px;width:100%}.textbutton{border:0;background:transparent;color:#596557;text-decoration:underline;margin-top:14px}.accountnote{background:#f3f2ed;border-radius:12px;padding:12px}.invitelink{display:grid;gap:6px;margin-top:14px}.onboarding{max-width:620px;margin:0 auto;padding:110px 24px;text-align:center}.onboarding small{color:#657062;font-weight:700;letter-spacing:.08em}.onboarding h1{font:600 clamp(48px,7vw,72px)/1 Georgia,serif;letter-spacing:-2px;margin:18px 0}.onboarding p{color:#73776f;font-size:18px}.onboarding form{max-width:430px;margin:32px auto 0;display:grid;gap:12px}.onboarding input{width:100%;border:1px solid #d8d3c7;border-radius:14px;padding:14px 16px;background:white}.typepick{display:grid;grid-template-columns:1fr 1fr;gap:8px}.typepick button{border:1px solid #ddd8cc;background:white;border-radius:12px;padding:12px}.typepick button.active{background:#263126;color:white;border-color:#263126}.onboardingerror{font-size:13px;color:#9b3b32}.setuphint{max-width:1180px;margin:0 auto 14px;padding:0 24px;display:flex;gap:10px;align-items:center}.setuphint .savehousehold{margin-left:auto}.setuphint span{color:#777;font-size:13px}.people,.grid,.month{max-width:1180px;margin:auto}.people{padding:0 24px 18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.personwrap{display:flex;align-items:center;position:relative}.personwrap .person{padding-right:30px}.deleteperson{position:absolute;right:6px;border:0;background:transparent;color:#999;font-size:18px;line-height:1;padding:4px}.deleteperson:hover{color:#9b3b32}.person.active{background:#263126;color:white;border-color:#263126}.person.active+.deleteperson{color:#d9ded6}.addperson{border-style:dashed}.savestate{margin-left:auto;font-size:12px;color:#777}.savestate.error{color:#9b3b32}.savestate.saved{color:#4f6b4a}.grid{padding:0 24px 80px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:white;border:1px solid #e4e0d5;border-radius:20px;padding:20px}.card h3{margin:0}.cardtitle{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:14px}.cardtitle span{font-size:11px;color:#888}.chips{display:flex;gap:7px;flex-wrap:wrap;min-height:38px}.chipwrap{display:flex;align-items:center;background:#edf2e9;border-radius:999px;padding-left:5px}.chip{border:0;background:transparent;color:#465342;border-radius:999px;padding:7px 10px 7px 5px}.favstar{border:0;background:transparent;color:#aaa;font-size:14px;padding:5px 3px}.favstar.active{color:#9a7622}.addrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px}.addrow input{border:1px solid #ddd8cc;border-radius:12px;padding:11px}.addrow button{border:0;border-radius:12px;background:#263126;color:white;padding:0 16px}
      .month{padding:56px 24px 80px}.logic{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:24px}.logic div{background:#efeee8;border-radius:14px;padding:14px}.logic b{display:block;font-size:13px;margin-bottom:4px}.logic span{font-size:12px;color:#74786f;line-height:1.35}.monthtop{display:flex;justify-content:space-between;align-items:end;gap:24px}.monthtop h1{font-size:64px;margin-bottom:10px}.monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}.monthgrid article{background:white;border:1px solid #e4e0d5;border-radius:18px;padding:18px;min-height:170px}.monthgrid article.splitday{border-style:dashed;background:#fbfaf6}.monthgrid label{display:block;margin-top:14px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888}.mealrow{display:grid;gap:8px}.mealactions{display:flex;gap:6px}.mealactions button{border:1px solid #ddd8cc;background:#faf9f5;border-radius:999px;padding:5px 9px;font-size:11px}.mealactions button:disabled{opacity:.4;cursor:not-allowed}
      .emptymonth{text-align:center;background:white;border:1px solid #e4e0d5;border-radius:20px;padding:48px;margin-top:28px}.emptymonth h2{font:600 34px Georgia,serif;margin:0 0 10px}button:disabled{opacity:.6;cursor:wait} @media(max-width:850px){.monthgrid{grid-template-columns:repeat(2,1fr)}.logic{grid-template-columns:repeat(2,1fr)}} @media(max-width:650px){.grid,.monthgrid,.logic{grid-template-columns:1fr}.monthtop{align-items:flex-start;flex-direction:column}header span{display:none}.hero{padding-top:60px}}
    `}</style>
  </main>;
}
