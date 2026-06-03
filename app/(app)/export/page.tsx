'use client';

import { useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Printer, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordsForRange } from '@/lib/firestore';
import { getIntensityBgPrint, getIntensityLabel, getIntensityEmoji } from '@/lib/utils';
import type { HeadacheRecord } from '@/types';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function formatYM(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function todayYM() {
  const d = new Date();
  return formatYM(d.getFullYear(), d.getMonth());
}

function buildCalendarRows(year: number, month: number, recordsByDate: Map<string, HeadacheRecord[]>) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = getDaysInMonth(firstDay);
  const startDow = getDay(firstDay);

  const cells: Array<{ date: Date; records: HeadacheRecord[] } | null> = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = format(date, 'yyyy-MM-dd');
    cells.push({ date, records: recordsByDate.get(key) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function ExportPage() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const currentYM = todayYM();
  const [startYM, setStartYM] = useState(currentYM);
  const [endYM, setEndYM] = useState(currentYM);
  const [patientName, setPatientName] = useState('');
  const [records, setRecords] = useState<HeadacheRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  const startDate = new Date(startYM + '-01');
  const endDate = endOfMonth(new Date(endYM + '-01'));

  async function handleFetch() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRecordsForRange(user.uid, startDate, endDate);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // Group records by date key for display
  const recordsByDate = new Map<string, HeadacheRecord[]>();
  if (records) {
    for (const r of records) {
      const key = format(r.occurredAt, 'yyyy-MM-dd');
      const arr = recordsByDate.get(key) ?? [];
      arr.push(r);
      recordsByDate.set(key, arr);
    }
  }

  // Get unique months in the range
  const months: { year: number; month: number }[] = [];
  if (records !== null) {
    let cur = new Date(startDate);
    while (cur <= endDate) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  const headacheDays = records
    ? new Set(records.filter(r => r.intensity > 0).map(r => format(r.occurredAt, 'yyyy-MM-dd'))).size
    : 0;
  const medDays = records
    ? new Set(records.filter(r => r.medicationUsed).map(r => format(r.occurredAt, 'yyyy-MM-dd'))).size
    : 0;

  return (
    <>
      {/* Form (hidden on print) */}
      <div className="no-print max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-slate-700">PDF出力</h1>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">患者氏名（任意）</label>
          <input
            type="text"
            value={patientName}
            onChange={e => setPatientName(e.target.value)}
            placeholder="例：山田 太郎"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">開始月</label>
            <input
              type="month"
              value={startYM}
              onChange={e => setStartYM(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">終了月</label>
            <input
              type="month"
              value={endYM}
              min={startYM}
              onChange={e => setEndYM(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <button
          onClick={handleFetch}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-700 text-white rounded-xl font-medium text-base disabled:opacity-60"
        >
          <Search className="w-5 h-5" />
          {loading ? 'データを取得中...' : 'プレビューを表示'}
        </button>

        {records !== null && (
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-medium text-base active:bg-indigo-700"
          >
            <Printer className="w-5 h-5" />
            印刷 / PDFに保存
          </button>
        )}

        {records !== null && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
            取得件数: {records.length}件　頭痛発生日: {headacheDays}日　痛み止め: {medDays}日
          </div>
        )}
      </div>

      {/* Printable content */}
      {records !== null && (
        <div ref={printRef} className="print-area bg-white">
          {/* Print header */}
          <div className="print-header px-6 pt-6 pb-4 border-b border-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">頭痛ダイアリー</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {format(startDate, 'yyyy年M月d日', { locale: ja })} 〜{' '}
                  {format(endDate, 'yyyy年M月d日', { locale: ja })}
                </p>
                {patientName && (
                  <p className="text-sm text-gray-600">患者氏名: {patientName}</p>
                )}
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>印刷日: {format(new Date(), 'yyyy年M月d日', { locale: ja })}</p>
                <p>頭痛日数: {headacheDays}日</p>
                <p>痛み止め: {medDays}日</p>
              </div>
            </div>
          </div>

          {/* Color legend */}
          <div className="px-6 py-3 flex gap-6 text-xs text-gray-500 border-b border-gray-200">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-amber-100 border border-amber-200 rounded" />軽度(1–3)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-orange-200 border border-orange-300 rounded" />中等度(4–6)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 bg-rose-300 border border-rose-400 rounded" />重度(7–10)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />痛み止め使用
            </span>
          </div>

          {/* Monthly calendars */}
          {months.map(({ year, month }) => {
            const rows = buildCalendarRows(year, month, recordsByDate);
            return (
              <div key={`${year}-${month}`} className="px-6 py-4">
                <h2 className="text-base font-bold text-gray-700 mb-2">
                  {year}年{month + 1}月
                </h2>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {DOW.map((d, i) => (
                        <th
                          key={d}
                          className={`text-center py-1 font-medium ${
                            i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-gray-600'
                          }`}
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          if (!cell) {
                            return <td key={ci} className="border border-gray-100 p-1 h-12" />;
                          }
                          const { date, records: dr } = cell;
                          const maxInt = dr.length > 0 ? Math.max(...dr.map(r => r.intensity)) : 0;
                          const hasMed = dr.some(r => r.medicationUsed);
                          const dow = getDay(date);
                          return (
                            <td
                              key={ci}
                              className={`border border-gray-200 p-1 h-12 align-top relative ${getIntensityBgPrint(maxInt)}`}
                            >
                              <span
                                className={`text-xs font-medium ${
                                  dow === 0 ? 'text-rose-600' : dow === 6 ? 'text-indigo-600' : 'text-gray-700'
                                }`}
                              >
                                {date.getDate()}
                              </span>
                              {maxInt > 0 && (
                                <span className="block text-sm leading-tight">
                                  {getIntensityEmoji(maxInt)}
                                </span>
                              )}
                              {hasMed && (
                                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-indigo-500" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Detailed records */}
          {records.length > 0 && (
            <div className="px-6 py-4">
              <h2 className="text-base font-bold text-gray-700 mb-3">詳細記録</h2>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600 w-24">日時</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-center font-medium text-gray-600 w-10">強度</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600">部位</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600">随伴症状</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600">誘因</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600">痛み止め</th>
                    <th className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className={getIntensityBgPrint(r.intensity)}>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {format(r.occurredAt, 'M/d HH:mm')}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold text-gray-700">
                        {r.intensity}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {r.locations.join('、')}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {r.symptoms.join('、')}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {r.triggers.join('、')}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {r.medicationUsed
                          ? `${r.medicationName ?? '使用'}${r.medicationAmount ? ` ${r.medicationAmount}錠` : ''}`
                          : ''}
                      </td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-700">
                        {r.notes ?? ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 text-xs text-gray-400 border-t border-gray-200">
            このデータは医療診断に使用するものではなく、受診時の参考情報です。
          </div>
        </div>
      )}
    </>
  );
}
