"use client";

import Link from "next/link";

export default function FeedMeLanding() {
  return (
    <main className="landing">
      <div className="orb orbOne" />
      <div className="orb orbTwo" />
      <header className="landingNav">
        <Link href="/" className="wordmark">Feed Me</Link>
        <div className="navActions">
          <Link href="/dashboard?auth=login" className="ghost">Sign in</Link>
          <Link href="/dashboard" className="primary">Start your Meal Bank</Link>
        </div>
      </header>

      <section className="landingHero">
        <div className="eyebrow">A smarter way to decide what’s for dinner</div>
        <h1>Your household already knows what it likes.<br/><span>Feed Me turns that into a month.</span></h1>
        <p>Build a Meal Bank for the people you feed. Feed Me balances shared favourites, individual tastes, easy lunches and the occasional mixed supper — then gives you a month that actually feels like yours.</p>
        <div className="heroActions">
          <Link href="/dashboard" className="primary large">Build my Meal Bank</Link>
          <a href="#how" className="ghost large">See how it works</a>
        </div>

        <div className="glassDemo">
          <div className="demoTop">
            <div>
              <small>PAUL + DEE</small>
              <strong>Tonight</strong>
            </div>
            <div className="avatars"><span>P</span><span>D</span></div>
          </div>
          <div className="mealPreview">
            <div><small>SUPPER</small><b>Chicken shawarma, flatbreads & salad</b></div>
            <button>Swap</button>
          </div>
          <div className="miniRow"><span>Shared favourite</span><span>Easy sides</span><span>From your Meal Bank</span></div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="sectionHead"><small>HOW IT THINKS</small><h2>Not a random recipe generator.</h2><p>Feed Me works from the food your household genuinely eats.</p></div>
        <div className="featureGrid">
          <article className="glassCard"><span className="num">01</span><h3>Shared meals first</h3><p>Meals regular diners both enjoy are prioritised, so most nights only need one supper.</p></article>
          <article className="glassCard"><span className="num">02</span><h3>Favourites still matter</h3><p>Personal favourites are deliberately worked in instead of disappearing because nobody else chose them.</p></article>
          <article className="glassCard"><span className="num">03</span><h3>Mixed suppers when worth it</h3><p>Two different mains can share the same sides when that is a better household compromise.</p></article>
          <article className="glassCard"><span className="num">04</span><h3>Lunch stays simple</h3><p>Soups, sandwiches, salads, toasties and other low-effort lunches are favoured by default.</p></article>
          <article className="glassCard"><span className="num">05</span><h3>Variety without chaos</h3><p>Your wider Meal Bank supplies swaps and variety without sending you into an endless recipe library.</p></article>
          <article className="glassCard"><span className="num">06</span><h3>Your hard no means no</h3><p>Dislikes and “Never serve” choices stay out of the plan.</p></article>
        </div>
      </section>

      <section className="section personal">
        <div className="personalCopy"><small>MAKE IT YOURS</small><h2>Your food life, not just a planner.</h2><p>Add the people you actually feed, give each person their own Meal Bank and profile, and gradually build a household history around the meals you really cook.</p><p className="muted">Next up: meal photos, “we made this” memories and household favourites that become more useful the longer you use Feed Me.</p></div>
        <div className="profileStack">
          <div className="profileGlass"><div className="profilePhoto">P</div><div><small>PAUL</small><strong>Steak & chips</strong><span>Favourite</span></div></div>
          <div className="profileGlass offset"><div className="profilePhoto second">D</div><div><small>DEE</small><strong>Salmon & samphire</strong><span>Favourite</span></div></div>
        </div>
      </section>

      <section className="finalCta"><div className="glassCta"><small>WHAT ARE WE EATING THIS MONTH?</small><h2>Tell Feed Me what you like.<br/>Let it sort the rest.</h2><Link href="/dashboard" className="primary large">Get started</Link></div></section>

      <footer><span>Feed Me</span><span>Built for real households and real appetites.</span></footer>

      <style jsx global>{`
        :root{--ink:#171918;--muted:#6d716d;--glass:rgba(255,255,255,.55);--line:rgba(255,255,255,.74);--accent:#d8ff67;--deep:#22291c}
        *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;background:#f3f1eb;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        a{text-decoration:none;color:inherit}.landing{min-height:100vh;position:relative;overflow:hidden;background:radial-gradient(circle at 12% 10%,rgba(224,245,190,.85),transparent 26%),radial-gradient(circle at 87% 18%,rgba(204,224,242,.8),transparent 24%),linear-gradient(145deg,#f6f4ef,#ecebe5 55%,#f5f3ec)}
        .orb{position:absolute;border-radius:50%;filter:blur(1px);pointer-events:none}.orbOne{width:380px;height:380px;right:-160px;top:500px;background:rgba(220,255,151,.28)}.orbTwo{width:320px;height:320px;left:-150px;top:1080px;background:rgba(184,213,238,.30)}
        .landingNav{height:80px;max-width:1240px;margin:auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}.wordmark{font:700 30px Georgia,serif;letter-spacing:-1px}.navActions,.heroActions{display:flex;align-items:center;gap:10px}
        .primary,.ghost{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:11px 18px;font-size:13px;font-weight:700;border:1px solid rgba(30,32,29,.10);transition:.2s}.primary{background:var(--deep);color:#fff;box-shadow:0 10px 24px rgba(25,29,22,.14)}.primary:hover,.ghost:hover{transform:translateY(-1px)}.ghost{background:rgba(255,255,255,.5);backdrop-filter:blur(18px)}.large{padding:14px 22px;font-size:14px}
        .landingHero{max-width:1080px;margin:0 auto;padding:105px 28px 85px;text-align:center;position:relative;z-index:1}.eyebrow{display:inline-flex;padding:8px 13px;border-radius:999px;background:rgba(255,255,255,.48);border:1px solid var(--line);backdrop-filter:blur(20px);font-size:11px;font-weight:800;letter-spacing:.08em}.landingHero h1{font:500 clamp(54px,7vw,92px)/.96 Georgia,serif;letter-spacing:-4px;margin:24px auto 24px;max-width:1050px}.landingHero h1 span{color:#535a50}.landingHero>p{max-width:740px;margin:0 auto;color:var(--muted);font-size:18px;line-height:1.6}.heroActions{justify-content:center;margin-top:28px}
        .glassDemo{max-width:720px;margin:72px auto 0;padding:22px;border-radius:30px;background:linear-gradient(135deg,rgba(255,255,255,.74),rgba(255,255,255,.30));border:1px solid rgba(255,255,255,.9);box-shadow:0 30px 80px rgba(66,70,60,.13),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(28px);text-align:left}.demoTop{display:flex;justify-content:space-between;align-items:center}.demoTop small,.glassDemo small,.sectionHead small,.personalCopy small,.glassCta small{font-size:10px;letter-spacing:.11em;font-weight:800;color:#787d75}.demoTop strong{display:block;font:600 32px Georgia,serif;margin-top:3px}.avatars{display:flex}.avatars span{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#e1e8d6;border:3px solid rgba(255,255,255,.8);font-weight:700}.avatars span+span{margin-left:-10px;background:#e3e9ee}.mealPreview{margin-top:18px;background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.76);border-radius:20px;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:20px}.mealPreview b{display:block;font-size:18px;margin-top:5px}.mealPreview button{border:1px solid rgba(30,32,29,.10);background:rgba(255,255,255,.8);border-radius:999px;padding:9px 14px}.miniRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.miniRow span{font-size:11px;padding:7px 10px;border-radius:999px;background:rgba(216,255,103,.30);border:1px solid rgba(255,255,255,.7)}
        .section{max-width:1180px;margin:0 auto;padding:105px 28px;position:relative;z-index:1}.sectionHead{max-width:720px}.sectionHead h2,.personal h2,.finalCta h2{font:500 clamp(42px,5vw,68px)/1 Georgia,serif;letter-spacing:-2px;margin:12px 0 14px}.sectionHead p,.personalCopy p{font-size:17px;line-height:1.55;color:var(--muted)}.featureGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:42px}.glassCard,.profileGlass,.glassCta{background:linear-gradient(135deg,rgba(255,255,255,.65),rgba(255,255,255,.28));border:1px solid var(--line);box-shadow:0 20px 50px rgba(55,60,50,.08),inset 0 1px 0 rgba(255,255,255,.85);backdrop-filter:blur(24px)}.glassCard{border-radius:24px;padding:24px;min-height:200px}.glassCard .num{font:500 14px Georgia,serif;color:#89907f}.glassCard h3{font:600 24px Georgia,serif;margin:30px 0 10px}.glassCard p{font-size:14px;line-height:1.55;color:var(--muted)}
        .personal{display:grid;grid-template-columns:1.05fr .95fr;gap:70px;align-items:center}.personalCopy .muted{font-size:14px}.profileStack{min-height:320px;position:relative}.profileGlass{position:absolute;width:82%;left:0;top:20px;border-radius:26px;padding:18px;display:flex;align-items:center;gap:15px}.profileGlass.offset{left:18%;top:155px}.profilePhoto{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,#d7e4cf,#f5f1df);display:grid;place-items:center;font:600 30px Georgia,serif}.profilePhoto.second{background:linear-gradient(135deg,#dce8ee,#efe4dd)}.profileGlass small,.profileGlass strong,.profileGlass span{display:block}.profileGlass small{font-size:10px;letter-spacing:.1em;color:var(--muted)}.profileGlass strong{font:600 22px Georgia,serif;margin:3px 0}.profileGlass span{font-size:12px;color:var(--muted)}
        .finalCta{max-width:1180px;margin:auto;padding:80px 28px 120px}.glassCta{border-radius:34px;padding:70px 28px;text-align:center}.glassCta h2{margin:14px auto 26px}.glassCta .primary{display:inline-flex}
        footer{max-width:1180px;margin:auto;padding:30px 28px 50px;display:flex;justify-content:space-between;color:var(--muted);font-size:12px}footer span:first-child{font:600 20px Georgia,serif;color:var(--ink)}
        @media(max-width:820px){.featureGrid{grid-template-columns:1fr 1fr}.personal{grid-template-columns:1fr;gap:20px}.landingHero h1{letter-spacing:-2.5px}.profileStack{min-height:300px}}
        @media(max-width:600px){.landingNav{padding:0 16px}.navActions .ghost{display:none}.landingHero{padding:72px 18px 60px}.landingHero h1{font-size:52px}.landingHero>p{font-size:16px}.heroActions{flex-direction:column}.heroActions a{width:100%}.glassDemo{margin-top:52px}.mealPreview{align-items:flex-start}.featureGrid{grid-template-columns:1fr}.section{padding:75px 18px}.finalCta{padding:50px 18px 80px}.glassCta{padding:50px 20px}footer{padding:24px 18px 38px;gap:18px;flex-direction:column}}
      `}</style>
    </main>
  );
}
