'use client';

/**
 * DatePicker — 날짜 선택 패널 컴포넌트.
 *
 * 사용 예:
 * <DatePicker value={selectedDate} onChange={setSelectedDate} />
 */

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  return (
    <div className={`bg-gray-900 border border-gray-700 p-4 sm:p-5 ${className}`}>
      <div className="mb-2">
        <h3 className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase">
          SELECT DATE
        </h3>
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-auto sm:min-w-[250px] bg-black border border-gray-600 px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-white"
      />
    </div>
  );
}
