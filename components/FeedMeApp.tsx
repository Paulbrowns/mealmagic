"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string; dinerType?: "regular" | "occasional"; likes: string[]; favourites: string[]; dislikes: string[]; never: string[] };
type MenuDay = { day: number; lunch: string; supper: string; supperSplit?: boolean };

const seedPeople: Person[] = [
  { id: "paul", name: "Paul", likes: ["Roast chicken","Sea bass","Lasagne","Lamb kofta","Scallops","Schnitzel","French onion soup","Raclette","Crab","Smoked salmon"], favourites: ["Steak & chips","Lobster linguine","Lancashire hotpot","Osso buco"], dislikes: [], never: [] },
  { id: "dee", name: "Dee", likes: ["Roast chicken","Lasagne","Salmon with samphire","Prawn & chorizo linguine","Thai green curry","Chicken shawarma","Fish & chips","French onion soup","Raclette","Crab"], favourites: ["Steak & chips","Roast lamb","Chicken & ham pie","Salmon with tabbouleh"], dislikes: [], never: [] }
];


export default function FeedMeApp() {
  const [people, setPeople] = useState<Person[]>(seedPeople);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedId, setSelectedId] = useState("paul");
  const [view, setView] = useState<"mealbank" | "month">("mealbank");
  const [month, setMonth] = useState<MenuDay[]>([]);
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/feed-me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data.people) || data.people.length === 0) return;
        setPeople(data.people);
        setSelectedId((current) => data.people.some((p: Person) => p.id === current) ? current : data.people[0].id);
        if (Array.isArray(data.menu?.days)) setMonth(data.menu.days);
      })
      .catch(() => setSaveState("error"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selected = people.find((p) => p.id === selectedId) || people[0];
  const householdLabel = people.filter((p) => p.dinerType !== "occasional").map((p) => p.name).join(" + ") || people.map((p) => p.name).join(" + ");

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

  const updateList = async (field: "likes" | "favourites" | "dislikes" | "never", value: string, remove = false) => {
    const clean = value.trim(); if (!clean || !selected) return;
    const before = people;
    setPeople((all) => all.map((p) => {
      if (p.id !== selected.id) return p;
      const next = remove ? p[field].filter((x) => x !== clean) : p[field].some((x) => x.toLowerCase() === clean.toLowerCase()) ? p[field] : [...p[field], clean];
      return { ...p, [field]: next };
    }));
    setSaveState("saving");
    const preference = field === "likes" ? "like" : field === "favourites" ? "favourite" : field === "dislikes" ? "dislike" : "never";
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "preference", personId: selected.id, mealName: clean, preference, remove })
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setPeople(before);
      setSaveState("error");
    }
  };

  const addPerson = async () => {
    const name = window.prompt("Name of the person to add");
    if (!name?.trim()) return;
    const occasional = window.confirm("Are they an occasional diner?\n\nOK = occasional, Cancel = regular");
    setSaveState("saving");
    try {
      const res = await fetch("/api/feed-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add-person", name: name.trim(), dinerType: occasional ? "occasional" : "regular" })
      });
      const data = await res.json();
      if (!res.ok || !data.person) throw new Error("save failed");
      const person: Person = { ...data.person, likes: [], favourites: [], dislikes: [], never: [] };
      setPeople((all) => [...all, person]);
      setSelectedId(person.id);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  };

  const list = (title: string, field: "likes" | "favourites" | "dislikes" | "never") => (
    <section className="card"><h3>{title}</h3><div className="chips">{selected[field].map((item) => <button className="chip" key={item} onClick={() => updateList(field, item, true)}>{item} ×</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateList(field, String(fd.get("meal") || "")); e.currentTarget.reset(); }} className="addrow">
        <input name="meal" placeholder="Type a meal…" /><button>Add</button>
      </form>
    </section>
  );

  return <main>
    <header><div><strong>Feed Me</strong><span>What are we eating this month?</span></div><nav><button onClick={() => setView("mealbank")}>Meal bank</button><button onClick={() => setView("month")}>This month</button></nav></header>
    {view === "mealbank" ? <>
      <div className="hero"><small>THREE CLICKS. MONTH SORTED.</small><h1>Tell us what you like.<br/>We’ll sort the month.</h1><p>No recipe hunting. Just the meals your household actually enjoys.</p><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : month.length ? "Regenerate my month" : "Generate my month"}</button></div>
      <div className="people">{people.map((p) => <button className={selectedId === p.id ? "person active" : "person"} key={p.id} onClick={() => setSelectedId(p.id)}>{p.name}{p.dinerType === "occasional" ? " · occasional" : ""}</button>)}<button className="person addperson" onClick={addPerson}>+ Add person</button><span className={`savestate ${saveState}`}>{loading ? "Loading Meal Bank…" : saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn’t save" : ""}</span></div>
      <div className="grid">{list("Likes","likes")}{list("Favourites","favourites")}{list("Dislikes","dislikes")}{list("Never serve","never")}</div>
    </> : <section className="month"><div className="monthtop"><div><small>{householdLabel.toUpperCase()}</small><h1>This month</h1><p>Shared meals first. Individual favourites when they are worth the extra effort.</p></div><button className="regen" onClick={generateMonth} disabled={generating}>{generating ? "Sorting…" : "Regenerate"}</button></div>{month.length ? <div className="monthgrid">{month.map((d) => <article key={d.day} className={d.supperSplit ? "splitday" : ""}><b>Day {d.day}</b><label>Lunch</label><div>{d.lunch}</div><label>Supper {d.supperSplit ? "· split" : ""}</label><div>{d.supper}</div></article>)}</div> : <div className="emptymonth"><h2>No month yet</h2><p>Generate a month from your household Meal Banks.</p><button className="cta" onClick={generateMonth} disabled={generating}>{generating ? "Sorting your month…" : "Generate my month"}</button></div>}</section>}
    <style jsx global>{`
      *{box-sizing:border-box} body{margin:0;background:#f7f6f2;color:#20251f;font-family:Arial,sans-serif} button,input{font:inherit} button{cursor:pointer}
      header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:18px 5vw;background:rgba(247,246,242,.95);border-bottom:1px solid #e5e2d9} header strong{display:block;font:700 28px Georgia,serif} header span{font-size:12px;color:#777} nav{display:flex;gap:8px} nav button,.person,.regen{border:1px solid #ddd8cc;background:white;border-radius:999px;padding:9px 14px}
      .hero{max-width:900px;margin:auto;text-align:center;padding:90px 24px 60px}.hero small,.month small{color:#657062;font-weight:700;letter-spacing:.08em}.hero h1,.month h1{font:600 clamp(46px,7vw,78px)/1 Georgia,serif;letter-spacing:-2px;margin:18px 0}.hero p,.month p{color:#73776f;font-size:18px}.cta{border:0;border-radius:14px;background:#263126;color:white;padding:14px 20px;font-weight:700;margin-top:10px}
      .people,.grid,.month{max-width:1180px;margin:auto}.people{padding:0 24px 18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.person.active{background:#263126;color:white;border-color:#263126}.addperson{border-style:dashed}.savestate{margin-left:auto;font-size:12px;color:#777}.savestate.error{color:#9b3b32}.savestate.saved{color:#4f6b4a}.grid{padding:0 24px 80px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:white;border:1px solid #e4e0d5;border-radius:20px;padding:20px}.card h3{margin-top:0}.chips{display:flex;gap:7px;flex-wrap:wrap;min-height:38px}.chip{border:0;background:#edf2e9;color:#465342;border-radius:999px;padding:7px 10px}.addrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px}.addrow input{border:1px solid #ddd8cc;border-radius:12px;padding:11px}.addrow button{border:0;border-radius:12px;background:#263126;color:white;padding:0 16px}
      .month{padding:56px 24px 80px}.monthtop{display:flex;justify-content:space-between;align-items:end;gap:24px}.monthtop h1{font-size:64px;margin-bottom:10px}.monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}.monthgrid article{background:white;border:1px solid #e4e0d5;border-radius:18px;padding:18px;min-height:170px}.monthgrid article.splitday{border-style:dashed;background:#fbfaf6}.monthgrid label{display:block;margin-top:14px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888}
      .emptymonth{text-align:center;background:white;border:1px solid #e4e0d5;border-radius:20px;padding:48px;margin-top:28px}.emptymonth h2{font:600 34px Georgia,serif;margin:0 0 10px}button:disabled{opacity:.6;cursor:wait} @media(max-width:850px){.monthgrid{grid-template-columns:repeat(2,1fr)}} @media(max-width:650px){.grid,.monthgrid{grid-template-columns:1fr}.monthtop{align-items:flex-start;flex-direction:column}header span{display:none}.hero{padding-top:60px}}
    `}</style>
  </main>;
}
