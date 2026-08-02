'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordsForMonth } from '@/lib/firestore';
import { useRecordsCache } from '@/contexts/RecordsContext';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import { RecordDetail } from '@/components/record/RecordDetail';
import type { HeadacheRecord } from '@/types';

const STALE_MS = 30_000;

export default function HomePage() {
  const { user } = useAuth();
  const { getCache, setCache, invalidate } = useRecordsCache();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [records, setRecords] = useState<HeadacheRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cacheKey = `${year}-${month}`;

  const fetchRecords = useCallback(async (force = false) => {
    if (!user) return;
    const cached = getCache(cacheKey);
    if (!force && cached && Date.now() - cached.fetchedAt < STALE_MS) {
      setRecords(cached.records);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getRecordsForMonth(user.uid, year, month);
      setRecords(data);
      setCache(cacheKey, data);
    } finally {
      setLoading(false);
    }
  }, [user, year, month, cacheKey, getCache, setCache]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const headacheDays = new Set(
    records.filter(r => r.intensity > 0).map(r => format(r.occurredAt, 'yyyy-MM-dd')),
  ).size;

  const medicationDays = new Set(
    records.filter(r => r.medicationUsed).map(r => format(r.occurredAt, 'yyyy-MM-dd')),
  ).size;

  const selectedDayRecords = selectedDate
    ? records.filter(
        r => format(r.occurredAt, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
      )
    : [];

  return (
    <>
      {/* Month navigation header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 no-print">
        <button
          onClick={() => setCurrentDate(d => subMonths(d, 1))}
          className="p-2 rounded-full active:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-700">
          {format(currentDate, 'yyyy年M月', { locale: ja })}
        </h1>
        <button
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          className="p-2 rounded-full active:bg-gray-100"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar */}
      <div className="mx-0 mt-3 bg-white border-y border-gray-100 shadow-sm p-3">
        {loading ? (
          <div className="flex justify-center items-center h-48 text-gray-400 text-sm">
            読み込み中...
          </div>
        ) : (
          <MonthCalendar
            year={year}
            month={month}
            records={records}
            onSelectDate={setSelectedDate}
          />
        )}
      </div>

      {/* Monthly summary */}
      <div className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-400 mb-3">月間サマリー</p>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-rose-500">{headacheDays}</div>
            <div className="text-xs text-gray-500 mt-0.5">頭痛発生日数</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-indigo-500">{medicationDays}</div>
            <div className="text-xs text-gray-500 mt-0.5">痛み止め使用日数</div>
          </div>
        </div>
        {medicationDays >= 10 && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            ⚠ 今月の痛み止め使用が10日以上です。薬物乱用頭痛に注意してください。
          </p>
        )}
      </div>

      {/* 水分補給アドバイス */}
      <div className="mx-4 mt-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <p className="text-sm font-medium text-blue-700 mb-1">💧 水分補給で頭痛予防</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          脱水は片頭痛の主要なトリガーのひとつです。こまめな水分補給（1日1.5〜2L目安）が発症予防に効果的とされています。頭痛が来たと感じたら、まず水を1杯飲んでみましょう。
        </p>
      </div>

      {/* Record detail bottom sheet */}
      {selectedDate && (
        <RecordDetail
          date={selectedDate}
          records={selectedDayRecords}
          onClose={() => setSelectedDate(null)}
          onRefresh={() => { invalidate(cacheKey); fetchRecords(true); }}
        />
      )}
    </>
  );
}
