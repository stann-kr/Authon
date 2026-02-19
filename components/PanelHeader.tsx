'use client';

/**
 * PanelHeader — 리스트 패널(main-content-panel 등)의 공통 헤더.
 * border-b 구분선, 제목, 그리고 Sort / Refresh 등 액션 버튼을 통일.
 *
 * 사용 예:
 * <PanelHeader
 *   title="GUEST LIST"
 *   count={25}
 *   sortMode={sortMode}
 *   onSortToggle={() => setSortMode(prev => prev === 'default' ? 'alpha' : 'default')}
 *   onRefresh={loadData}
 * />
 */

interface PanelHeaderProps {
  title: string;
  count?: number;
  /** 정렬 모드. 전달하지 않으면 Sort 버튼 숨김 */
  sortMode?: 'default' | 'alpha';
  onSortToggle?: () => void;
  /** 전달하지 않으면 Refresh 버튼 숨김 */
  onRefresh?: () => void;
  /** 추가 액션 버튼(슬롯) */
  actions?: React.ReactNode;
}

export default function PanelHeader({
  title,
  count,
  sortMode,
  onSortToggle,
  onRefresh,
  actions,
}: PanelHeaderProps) {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;

  return (
    <div className="border-b border-gray-700 p-4 flex items-center justify-between flex-shrink-0">
      <h3 className="font-mono text-xs sm:text-sm tracking-wider text-white uppercase">
        {displayTitle}
      </h3>
      <div className="flex items-center gap-2">
        {sortMode !== undefined && onSortToggle && (
          <button
            onClick={onSortToggle}
            className="px-3 py-1 bg-gray-800 text-gray-400 font-mono text-xs tracking-wider uppercase hover:text-white transition-colors border border-gray-700"
          >
            SORT: {sortMode === 'alpha' ? 'ABC' : 'DEFAULT'}
          </button>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-gray-800 text-gray-400 font-mono text-xs tracking-wider uppercase hover:text-white transition-colors border border-gray-700"
          >
            <i className="ri-refresh-line mr-1"></i>REFRESH
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
