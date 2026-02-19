'use client';

import Footer from './Footer';

interface PageLayoutProps {
  /** 고정 헤더 요소 (AdminHeader, 커스텀 헤더 등) */
  header: React.ReactNode;
  children: React.ReactNode;
  /** 스크롤 영역의 클래스 오버라이드 (기본: page-scroll) */
  scrollClassName?: string;
}

/**
 * 앱 페이지 공통 레이아웃.
 * page-shell → header → scrollable(page-container + footer) 구조를 통일.
 */
export default function PageLayout({
  header,
  children,
  scrollClassName = 'page-scroll',
}: PageLayoutProps) {
  return (
    <div className="page-shell">
      {header}
      <div className={scrollClassName}>
        <div className="page-container">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
