'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuthModal } from '@/components/AuthModal';
import { Header } from '@/components/header';
import { createClient } from '@/lib/supabase/browser';

const featureCards = [
  {
    icon: CalendarDays,
    title: 'Weekly planning made simple',
    text: 'Build breakfast, lunch and dinner plans for the whole week without juggling notes, screenshots, or separate lists.',
  },
  {
    icon: Users,
    title: 'Household-aware meal choices',
    text: 'Keep diets, allergies, cuisines and preferences in one place so plans feel realistic for everyone at home.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping lists in seconds',
    text: 'Turn your weekly plan into a clearer shopping list and keep your selections saved for the next trip.',
  },
];

const previewPanels = [
  {
    title: 'A clear weekly planner',
    text: 'See breakfast, lunch and dinner together so the whole week feels organised at a glance.',
    image:
      'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Balanced week guidance',
    text: 'Plans are designed to support a balanced and nutritious diet across the week, without overloading the experience.',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Manage recipes and shopping',
    text: 'Save household favourites, add your own recipes, and keep shopping practical with grouped ingredients and product suggestions.',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  },
];

function LandingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [authOpen, setAuthOpen] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setHasSession(Boolean(data.user));
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (searchParams.get('auth') === '1') {
      setAuthOpen(true);
    }
  }, [searchParams]);

  const closeAuth = () => {
    setAuthOpen(false);
    if (searchParams.get('auth') === '1') {
      router.replace(pathname || '/');
    }
  };

  return (
    <div>
      <Header ctaHref="/?auth=1" ctaLabel={hasSession ? 'Switch account' : 'Sign in'} />

      <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <section
          className="card"
          style={{
            overflow: 'hidden',
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.80) 0%, rgba(15,23,42,0.62) 42%, rgba(15,23,42,0.18) 100%), url('https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1600&q=80') center/cover",
            color: 'white',
          }}
        >
          <div style={{ padding: 'clamp(24px, 5vw, 44px)', maxWidth: 760 }}>
            <div className="badge" style={{ background: 'rgba(255,255,255,0.14)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Sparkles size={14} /> Meal planning for real households
            </div>

            <h1 style={{ fontSize: 'clamp(34px, 6vw, 58px)', lineHeight: 1.02, margin: '18px 0 12px' }}>
              MealMagic helps your household plan meals that everyone can actually eat.
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)', maxWidth: 640, margin: 0 }}>
              Save your household preferences, generate weekly breakfast, lunch and dinner plans, build shopping lists quickly, and keep meals simple, balanced and practical across the week.
            </p>

            <div className="row" style={{ marginTop: 24, flexWrap: 'wrap' }}>
              {hasSession ? (
                <Link href="/dashboard" className="btn btn-primary">
                  Open dashboard
                </Link>
              ) : (
                <button className="btn btn-primary" type="button" onClick={() => setAuthOpen(true)}>
                  Sign in to get started
                </button>
              )}
              <button className="btn btn-secondary" type="button" onClick={() => setAuthOpen(true)}>
                Create account
              </button>
            </div>

            <div className="row" style={{ marginTop: 26, flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.92)', color: '#166534' }}>Balanced weekly planning</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.92)', color: '#9a3412' }}>Shopping lists</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.92)', color: '#3730a3' }}>Household preferences</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.92)', color: '#065f46' }}>Seasonal produce encouraged</span>
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
                    display: 'grid',
                    placeItems: 'center',
                    background: '#fff7ed',
                    color: '#ea580c',
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

        <section className="section grid grid-2" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ padding: 26 }}>
            <div className="badge" style={{ marginBottom: 14 }}>Why sign in?</div>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 34 }}>Keep your household planning saved and ready to return to.</h2>
            <p className="small" style={{ fontSize: 16, lineHeight: 1.8 }}>
              Signing in lets MealMagic remember your household, your saved recipes, your weekly planner and your shopping choices, so the experience feels personal and useful every time you come back.
            </p>
            <div className="list" style={{ marginTop: 18 }}>
              {[
                'Save your household setup and dietary preferences',
                'Generate personalised weekly plans for breakfast, lunch and dinner',
                'Manage your own recipes and keep favourites together',
                'Return to your shopping list and planner on any device',
              ].map((item) => (
                <div key={item} className="row" style={{ alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} style={{ color: '#059669', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.7 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', minHeight: 460 }}>
              <Image
                src="/mealmagic-brand-mark.svg"
                alt="MealMagic"
                fill
                style={{ objectFit: 'contain', padding: 48, background: 'linear-gradient(135deg,#fff7ed 0%, #ecfdf5 100%)' }}
                priority
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="row-between" style={{ alignItems: 'end', flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div className="badge" style={{ marginBottom: 12 }}>Inside the app</div>
              <h2 style={{ margin: 0, fontSize: 34 }}>A cleaner way to plan the week</h2>
            </div>
            {!hasSession ? (
              <button className="btn btn-secondary" type="button" onClick={() => setAuthOpen(true)}>
                Sign in to continue
              </button>
            ) : (
              <Link href="/dashboard" className="btn btn-secondary">Go to dashboard</Link>
            )}
          </div>

          <div className="grid grid-3">
            {previewPanels.map((panel) => (
              <div key={panel.title} className="card" style={{ overflow: 'hidden' }}>
                <img src={panel.image} alt={panel.title} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                <div style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 10 }}>{panel.title}</h3>
                  <p className="small" style={{ lineHeight: 1.7, margin: 0 }}>{panel.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AuthModal isOpen={authOpen} onClose={closeAuth} />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div />}>
      <LandingPage />
    </Suspense>
  );
}
