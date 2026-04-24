import Image from 'next/image';
import Link from 'next/link';

type HeaderProps = {
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function Header({ badge, ctaHref, ctaLabel }: HeaderProps) {
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
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" className="row" style={{ minWidth: 0 }}>
          <Image
            src="/mealmagic-brand-mark.svg"
            alt="MealMagic logo"
            width={42}
            height={42}
            priority
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div className="small">Household meal planning</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>MealMagic</div>
          </div>
        </Link>

        <div className="row" style={{ marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {badge ? (
            <div className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
              {badge}
            </div>
          ) : null}

          {ctaHref && ctaLabel ? (
            <Link href={ctaHref} className="btn btn-secondary">
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
