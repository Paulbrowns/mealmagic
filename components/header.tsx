import { ChefHat } from 'lucide-react';

export function Header({ badge = 'Browser build' }: { badge?: string }) {
  return (
    <header className="header">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 16 }}>
        <div className="row">
          <div style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'linear-gradient(135deg,#f97316,#059669)', color: 'white' }}>
            <ChefHat size={20} />
          </div>
          <div>
            <div className="small">Household meal planning</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>MealMap</div>
          </div>
        </div>
        <div className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>{badge}</div>
      </div>
    </header>
  );
}
