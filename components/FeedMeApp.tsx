"use client";

import { useMemo, useState } from "react";

type Person = { id: string; name: string; likes: string[]; favourites: string[]; dislikes: string[]; never: string[] };

const seedPeople: Person[] = [
  { id: "paul", name: "Paul", likes: ["Roast chicken","Sea bass","Lasagne","Lamb kofta","Scallops","Schnitzel","French onion soup","Raclette","Crab","Smoked salmon"], favourites: ["Steak & chips","Lobster linguine","Lancashire hotpot","Osso buco"], dislikes: [], never: [] },
  { id: "dee", name: "Dee", likes: ["Roast chicken","Lasagne","Salmon with samphire","Prawn & chorizo linguine","Thai green curry","Chicken shawarma","Fish & chips","French onion soup","Raclette","Crab"], favourites: ["Steak & chips","Roast lamb","Chicken & ham pie","Salmon with tabbouleh"], dislikes: [], never: [] }
];

const lunches = ["Tomato & red pepper soup","Ham & cheese toasties","Coronation chicken sandwiches","Smoked mackerel pâté on toast","Carrot & coriander soup","Crab & avocado open sandwiches","French onion soup","Baked potato & cheese"];
const suppers = ["Roast chicken, roast potatoes & vegetables","Lasagne & salad","Steak & chips with peppercorn sauce","Raclette with potatoes & cornichons","Fish & chips","Roast lamb & vegetables","Chicken & ham pie with peas","Salmon with samphire & new potatoes","Prawn & chorizo linguine","Chicken shawarma, flatbreads & salad","Thai green chicken curry & rice","Sea bass with potatoes & greens"];

export default function FeedMeApp() {
  const [people, setPeople] = useState(seedPeople);
  const [selectedId, setSelectedId] = useState("paul");
  const [view, setView] = useState<"foodbank" | "month">("foodbank");
  const [version, setVersion] = useState(0);
  const selected = people.find((p) => p.id === selectedId) || people[0];
  const month = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ day: i + 1, lunch: lunches[(i + version) % lunches.length], supper: suppers[(i * 3 + version) % suppers.length] })), [version]);

  const updateList = (field: "likes" | "favourites" | "dislikes" | "never", value: string, remove = false) => {
    const clean = value.trim(); if (!clean) return;
    setPeople((all) => all.map((p) => {
      if (p.id !== selected.id) return p;
      const next = remove ? p[field].filter((x) => x !== clean) : p[field].some((x) => x.toLowerCase() === clean.toLowerCase()) ? p[field] : [...p[field], clean];
      return { ...p, [field]: next };
    }));
  };

  const list = (title: string, field: "likes" | "favourites" | "dislikes" | "never") => (
    <section className="card"><h3>{title}</h3><div className="chips">{selected[field].map((item) => <button className="chip" key={item} onClick={() => updateList(field, item, true)}>{item} ×</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); updateList(field, String(fd.get("meal") || "")); e.currentTarget.reset(); }} className="addrow">
        <input name="meal" placeholder="Type a meal…" /><button>Add</button>
      </form>
    </section>
  );

  return <main>
    <header><div><strong>Feed Me</strong><span>What are we eating this month?</span></div><nav><button onClick={() => setView("foodbank")}>Food bank</button><button onClick={() => setView("month")}>This month</button></nav></header>
    {view === "foodbank" ? <>
      <div className="hero"><small>THREE CLICKS. MONTH SORTED.</small><h1>Tell us what you like.<br/>We’ll sort the month.</h1><p>No recipe hunting. Just the meals your household actually enjoys.</p><button className="cta" onClick={() => setView("month")}>Generate my month</button></div>
      <div className="people">{people.map((p) => <button className={selectedId === p.id ? "person active" : "person"} key={p.id} onClick={() => setSelectedId(p.id)}>{p.name}</button>)}</div>
      <div className="grid">{list("Likes","likes")}{list("Favourites","favourites")}{list("Dislikes","dislikes")}{list("Never serve","never")}</div>
    </> : <section className="month"><div className="monthtop"><div><small>PAUL + DEE</small><h1>This month</h1><p>Shared meals first. Individual favourites when they are worth the extra effort.</p></div><button className="regen" onClick={() => setVersion((v) => v + 1)}>Regenerate</button></div><div className="monthgrid">{month.map((d) => <article key={d.day}><b>Day {d.day}</b><label>Lunch</label><div>{d.lunch}</div><label>Supper</label><div>{d.supper}</div></article>)}</div></section>}
    <style jsx global>{`
      *{box-sizing:border-box} body{margin:0;background:#f7f6f2;color:#20251f;font-family:Arial,sans-serif} button,input{font:inherit} button{cursor:pointer}
      header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:18px 5vw;background:rgba(247,246,242,.95);border-bottom:1px solid #e5e2d9} header strong{display:block;font:700 28px Georgia,serif} header span{font-size:12px;color:#777} nav{display:flex;gap:8px} nav button,.person,.regen{border:1px solid #ddd8cc;background:white;border-radius:999px;padding:9px 14px}
      .hero{max-width:900px;margin:auto;text-align:center;padding:90px 24px 60px}.hero small,.month small{color:#657062;font-weight:700;letter-spacing:.08em}.hero h1,.month h1{font:600 clamp(46px,7vw,78px)/1 Georgia,serif;letter-spacing:-2px;margin:18px 0}.hero p,.month p{color:#73776f;font-size:18px}.cta{border:0;border-radius:14px;background:#263126;color:white;padding:14px 20px;font-weight:700;margin-top:10px}
      .people,.grid,.month{max-width:1180px;margin:auto}.people{padding:0 24px 18px;display:flex;gap:8px}.person.active{background:#263126;color:white;border-color:#263126}.grid{padding:0 24px 80px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{background:white;border:1px solid #e4e0d5;border-radius:20px;padding:20px}.card h3{margin-top:0}.chips{display:flex;gap:7px;flex-wrap:wrap;min-height:38px}.chip{border:0;background:#edf2e9;color:#465342;border-radius:999px;padding:7px 10px}.addrow{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px}.addrow input{border:1px solid #ddd8cc;border-radius:12px;padding:11px}.addrow button{border:0;border-radius:12px;background:#263126;color:white;padding:0 16px}
      .month{padding:56px 24px 80px}.monthtop{display:flex;justify-content:space-between;align-items:end;gap:24px}.monthtop h1{font-size:64px;margin-bottom:10px}.monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}.monthgrid article{background:white;border:1px solid #e4e0d5;border-radius:18px;padding:18px;min-height:170px}.monthgrid label{display:block;margin-top:14px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888}
      @media(max-width:850px){.monthgrid{grid-template-columns:repeat(2,1fr)}} @media(max-width:650px){.grid,.monthgrid{grid-template-columns:1fr}.monthtop{align-items:flex-start;flex-direction:column}header span{display:none}.hero{padding-top:60px}}
    `}</style>
  </main>;
}
