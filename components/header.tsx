import Image from 'next/image';

export function Header({ badge = 'Browser build' }: { badge?: string }) {
  return (
    <header className="header">
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 16,
          paddingBottom: 16,
        }}
      >
        <div className="row">
          <Image
            src="/mealmagic-logo.svg"
            alt="MealMagic logo"
            width={40}
            height={40}
            priority
            style={{ borderRadius: 12 }}
          />
          <div>
            <div className="small">Household meal planning</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>MealMagic</div>
          </div>
        </div>
        <div className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
          {badge}
        </div>
      </div>
    </header>
  );
}
