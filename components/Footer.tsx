import { BRAND_FOOTER } from '@/lib/brand';

export default function Footer() {
  return (
    <div className="mt-6 text-center pb-2 flex-shrink-0">
      <p className="text-gray-600 font-mono text-xs tracking-wider">
        {BRAND_FOOTER}
      </p>
    </div>
  );
}
