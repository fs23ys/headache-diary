'use client';

import { format, getDaysInMonth, getDay } from 'date-fns';
import { cn, getIntensityBg, getIntensityEmoji } from '@/lib/utils';
import type { HeadacheRecord } from '@/types';

interface Props {
  year: number;
  month: number;
  records: HeadacheRecord[];
  onSelectDate: (date: Date) => void;
}

interface DayData {
  date: Date;
  records: HeadacheRecord[];
  maxIntensity: number;
  hasMedication: boolean;
}

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function buildDays(year: number, month: number, records: HeadacheRecord[]): (DayData | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = getDaysInMonth(firstDay);
  const startDow = getDay(firstDay);

  const recordsByDate = new Map<string, HeadacheRecord[]>();
  for (const r of records) {
    const key = format(r.occurredAt, 'yyyy-MM-dd');
    const arr = recordsByDate.get(key) ?? [];
    arr.push(r);
    recordsByDate.set(key, arr);
  }

  const cells: (DayData | null)[] = Array(startDow).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = format(date, 'yyyy-MM-dd');
    const dayRecords = recordsByDate.get(key) ?? [];
    const maxIntensity = dayRecords.length > 0 ? Math.max(...dayRecords.map(r => r.intensity)) : 0;
    const hasMedication = dayRecords.some(r => r.medicationUsed);
    cells.push({ date, records: dayRecords, maxIntensity, hasMedication });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < remaining; i++) cells.push(null);

  return cells;
}

export function MonthCalendar({ year, month, records, onSelectDate }: Props) {
  const cells = buildDays(year, month, records);
  const today = new Date();

  return (
    <div className="px-1 pt-1">
      {/* Day of week header */}
      <div className="grid grid-cols-7 mb-0.5">
        {DOW.map((d, i) => (
          <div
            key={d}
            className={cn(
              'text-center font-medium py-0.5',
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-gray-500',
            )}
            style={{ fontSize: '0.65rem' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" style={{ gap: '2px' }}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const { date, records: dayRecords, maxIntensity, hasMedication } = cell;
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
          const dow = getDay(date);
          const hasRecord = dayRecords.length > 0;

          return (
            <button
              key={format(date, 'yyyy-MM-dd')}
              onClick={() => hasRecord && onSelectDate(date)}
              disabled={!hasRecord}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded-md relative transition-opacity',
                getIntensityBg(maxIntensity),
                hasRecord ? 'cursor-pointer active:opacity-70' : 'cursor-default',
                isToday && 'ring-2 ring-indigo-400',
              )}
            >
              <span
                className={cn(
                  'font-medium leading-tight',
                  dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-indigo-500' : 'text-gray-700',
                  maxIntensity >= 7 && 'text-rose-800',
                )}
                style={{ fontSize: '0.75rem' }}
              >
                {date.getDate()}
              </span>
              {hasRecord && (
                <span className="text-xs leading-tight">
                  {getIntensityEmoji(maxIntensity)}
                </span>
              )}
              {hasMedication && (
                <span
                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500"
                  title="痛み止め使用"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 px-1 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />🙂 軽度
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200 inline-block" />😟 中等度
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-rose-200 border border-rose-300 inline-block" />😵 重度
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />痛み止め
        </span>
      </div>
    </div>
  );
}
