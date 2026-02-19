import { BRAND_FOOTER } from '@/lib/brand';

interface FooterProps {
  /** true = 카드 내부용 (auth 페이지 등). false = 전체 페이지 하단용 */
  compact?: boolean;
}

export default function Footer({ compact = false }: FooterProps) {
  if (compact) {
    return (
      <footer className="text-center pt-6 flex-shrink-0">
        <p className="text-gray-600 font-mono text-xs tracking-wider">
          {BRAND_FOOTER}
        </p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-gray-800 flex-shrink-0 mt-auto">
      <div className="text-center py-4">
        <p className="text-gray-600 font-mono text-xs tracking-wider">
          {BRAND_FOOTER}
        </p>
      </div>
    </footer>
  );
}
