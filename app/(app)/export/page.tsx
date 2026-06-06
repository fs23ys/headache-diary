'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, getDaysInMonth, getDay,
  differenceInCalendarMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { Printer, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordsForRange } from '@/lib/firestore';
import { getIntensityBgPrint, getIntensityLabel, getIntensityEmoji } from '@/lib/utils';
import type { HeadacheRecord } from '@/types';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

/* ─── helpers ─── */

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDuration(min?: number) {
  if (!min) return '不明';
  return min < 60 ? `${min}分` : `${Math.round((min / 60) * 10) / 10}時間`;
}

function buildCalendarRows(
  year: number, month: number, byDate: Map<string, HeadacheRecord[]>,
) {
  const first = new Date(year, month, 1);
  const days = getDaysInMonth(first);
  const startDow = getDay(first);
  const cells: Array<{ date: Date; records: HeadacheRecord[] } | null> = Array(startDow).fill(null);
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, records: byDate.get(format(date, 'yyyy-MM-dd')) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/* ─── summary calculation ─── */

interface Summary {
  totalRecords: number;
  totalHeadacheDays: number;
  avgMonthlyAttacks: number;
  avgIntensity: number;
  maxIntensity: number;
  dist: { mild: number; moderate: number; severe: number };
  topTriggers: [string, number][];
  topSymptoms: [string, number][];
  medDays: number;
  medUsageRate: number;
  topMeds: [string, number][];
  effectDist: [string, number][];
  topSevere: HeadacheRecord[];
  monthlyStats: { label: string; headacheDays: number; avgInt: number; medDays: number }[];
}

function computeSummary(records: HeadacheRecord[], startDate: Date, endDate: Date): Summary {
  const headacheDates = new Set(
    records.filter(r => r.intensity > 0).map(r => format(r.occurredAt, 'yyyy-MM-dd')),
  );
  const totalHeadacheDays = headacheDates.size;
  const monthCount = differenceInCalendarMonths(endDate, startDate) + 1;
  const avgMonthlyAttacks = monthCount > 0 ? totalHeadacheDays / monthCount : 0;

  const intensityRecs = records.filter(r => r.intensity > 0);
  const avgIntensity = intensityRecs.length
    ? intensityRecs.reduce((s, r) => s + r.intensity, 0) / intensityRecs.length : 0;
  const maxIntensity = records.reduce((m, r) => Math.max(m, r.intensity), 0);

  const dist = { mild: 0, moderate: 0, severe: 0 };
  records.forEach(r => {
    if (r.intensity >= 1 && r.intensity <= 3) dist.mild++;
    else if (r.intensity >= 4 && r.intensity <= 6) dist.moderate++;
    else if (r.intensity >= 7) dist.severe++;
  });

  const triggerMap = new Map<string, number>();
  const symptomMap = new Map<string, number>();
  records.forEach(r => {
    r.triggers?.forEach(t => triggerMap.set(t, (triggerMap.get(t) ?? 0) + 1));
    r.symptoms?.forEach(s => symptomMap.set(s, (symptomMap.get(s) ?? 0) + 1));
  });
  const topTriggers = Array.from(triggerMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topSymptoms = Array.from(symptomMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const medRecs = records.filter(r => r.medicationUsed);
  const medDays = new Set(medRecs.map(r => format(r.occurredAt, 'yyyy-MM-dd'))).size;
  const medUsageRate = totalHeadacheDays > 0 ? (medDays / totalHeadacheDays) * 100 : 0;
  const medNameMap = new Map<string, number>();
  const effectMap = new Map<string, number>();
  medRecs.forEach(r => {
    const n = r.medicationName ?? '不明';
    medNameMap.set(n, (medNameMap.get(n) ?? 0) + 1);
    if (r.medicationEffect) effectMap.set(r.medicationEffect, (effectMap.get(r.medicationEffect) ?? 0) + 1);
  });
  const topMeds = Array.from(medNameMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const effectDist = Array.from(effectMap.entries()).sort((a, b) => b[1] - a[1]);

  const topSevere = [...records].sort((a, b) => b.intensity - a.intensity || b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 3);

  const months: string[] = [];
  let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cur <= endDate) { months.push(format(cur, 'yyyy-MM')); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  const monthlyStats = months.map(mk => {
    const mr = records.filter(r => format(r.occurredAt, 'yyyy-MM') === mk);
    const hd = new Set(mr.filter(r => r.intensity > 0).map(r => format(r.occurredAt, 'yyyy-MM-dd'))).size;
    const md = new Set(mr.filter(r => r.medicationUsed).map(r => format(r.occurredAt, 'yyyy-MM-dd'))).size;
    const ai = mr.filter(r => r.intensity > 0).length > 0
      ? mr.filter(r => r.intensity > 0).reduce((s, r) => s + r.intensity, 0) / mr.filter(r => r.intensity > 0).length : 0;
    const [y, m] = mk.split('-');
    return { label: `${y}年${Number(m)}月`, headacheDays: hd, avgInt: ai, medDays: md };
  });

  return { totalRecords: records.length, totalHeadacheDays, avgMonthlyAttacks, avgIntensity, maxIntensity, dist, topTriggers, topSymptoms, medDays, medUsageRate, topMeds, effectDist, topSevere, monthlyStats };
}

/* ─── main component ─── */

export default function ExportPage() {
  const { user } = useAuth();
  const currentYM = todayYM();
  const [startYM, setStartYM] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
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

  const summary = records ? computeSummary(records, startDate, endDate) : null;

  const byDate = new Map<string, HeadacheRecord[]>();
  if (records) {
    for (const r of records) {
      const k = format(r.occurredAt, 'yyyy-MM-dd');
      const arr = byDate.get(k) ?? [];
      arr.push(r);
      byDate.set(k, arr);
    }
  }

  const months: { year: number; month: number }[] = [];
  if (records) {
    let cur = new Date(startDate);
    while (cur <= endDate) { months.push({ year: cur.getFullYear(), month: cur.getMonth() }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  }

  return (
    <>
      {/* ── 操作パネル（印刷時非表示）── */}
      <div className="no-print max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-lg font-bold text-slate-700">PDF出力</h1>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">患者氏名（任意）</label>
          <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="例：山田 太郎"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[['開始月', startYM, (v: string) => setStartYM(v), ''],
            ['終了月', endYM, (v: string) => setEndYM(v), startYM]
          ].map(([label, val, fn, min]) => (
            <div key={label as string}>
              <label className="block text-sm font-medium text-gray-600 mb-1">{label as string}</label>
              <input type="month" value={val as string} min={min as string || undefined} onChange={e => (fn as (v: string) => void)(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          ))}
        </div>

        <button onClick={handleFetch} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-700 text-white rounded-xl font-medium disabled:opacity-60">
          <Search className="w-5 h-5" />
          {loading ? 'データ取得中...' : 'プレビューを表示'}
        </button>

        {records !== null && (
          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-medium active:bg-indigo-700">
            <Printer className="w-5 h-5" />
            印刷 / PDFに保存
          </button>
        )}

        {records !== null && summary && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 space-y-0.5">
            <p>記録数: {summary.totalRecords}件　頭痛日数: {summary.totalHeadacheDays}日　月平均: {summary.avgMonthlyAttacks.toFixed(1)}日</p>
            <p>平均強度: {summary.avgIntensity.toFixed(1)}/10　痛み止め使用: {summary.medDays}日</p>
          </div>
        )}
      </div>

      {/* ── 印刷コンテンツ ── */}
      {records !== null && summary && (
        <div className="print-area bg-white">

          {/* ════ PAGE 1: 診察サマリー ════ */}
          <div style={{ pageBreakAfter: 'always' }} className="px-6 pt-6 pb-4">

            {/* ヘッダー */}
            <div className="flex justify-between items-start border-b-2 border-slate-700 pb-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800">頭痛ダイアリー　診察サマリー</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  {format(startDate, 'yyyy年M月d日', { locale: ja })} 〜 {format(endDate, 'yyyy年M月d日', { locale: ja })}
                </p>
                {patientName && <p className="text-sm text-gray-600">患者氏名: {patientName}</p>}
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>印刷日: {format(new Date(), 'yyyy年M月d日', { locale: ja })}</p>
                <p className="mt-0.5 text-xs text-gray-400">※ 本データは参考情報であり医療診断ではありません</p>
              </div>
            </div>

            {/* ① 発作概要 */}
            <Section title="① 発作概要">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: '総頭痛日数', value: `${summary.totalHeadacheDays}日` },
                  { label: '月平均発作日', value: `${summary.avgMonthlyAttacks.toFixed(1)}日` },
                  { label: '平均強度', value: `${summary.avgIntensity.toFixed(1)}/10` },
                  { label: '最大強度', value: `${summary.maxIntensity}/10` },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-gray-200 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-lg font-bold text-slate-700 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">強度分布：</span>
                {[
                  { label: '軽度(1-3)', count: summary.dist.mild, color: 'bg-blue-200' },
                  { label: '中等度(4-6)', count: summary.dist.moderate, color: 'bg-yellow-200' },
                  { label: '重度(7-10)', count: summary.dist.severe, color: 'bg-rose-300' },
                ].map(({ label, count, color }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={`inline-block w-3 h-3 rounded ${color}`} />
                    {label}: {count}回
                  </span>
                ))}
              </div>
            </Section>

            {/* ② 主な誘因 */}
            {summary.topTriggers.length > 0 && (
              <Section title="② 主な誘因ランキング">
                <div className="space-y-1.5">
                  {summary.topTriggers.map(([trigger, count], i) => {
                    const max = summary.topTriggers[0][1];
                    return (
                      <div key={trigger} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-4">{i + 1}.</span>
                        <span className="text-xs text-gray-700 w-28 flex-shrink-0">{trigger}</span>
                        <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                          <div className="h-4 rounded bg-indigo-400" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-10 text-right">{count}回</span>
                        <span className="text-xs text-gray-400 w-12">
                          ({summary.totalRecords > 0 ? Math.round((count / summary.totalRecords) * 100) : 0}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                {summary.topSymptoms.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    主な随伴症状: {summary.topSymptoms.map(([s, n]) => `${s}(${n}回)`).join('、')}
                  </p>
                )}
              </Section>
            )}

            {/* ③ 薬剤使用パターン */}
            <Section title="③ 薬剤使用パターン">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">使用日数</div>
                  <div className="text-base font-bold text-slate-700">{summary.medDays}日</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">頭痛日の使用率</div>
                  <div className="text-base font-bold text-slate-700">{summary.medUsageRate.toFixed(0)}%</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-500">最多使用薬</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5 leading-tight">
                    {summary.topMeds[0]?.[0] ?? 'なし'}
                  </div>
                </div>
              </div>
              {summary.topMeds.length > 0 && (
                <p className="text-xs text-gray-600">
                  使用薬剤: {summary.topMeds.map(([n, c]) => `${n}(${c}回)`).join('　')}
                </p>
              )}
              {summary.effectDist.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  効果: {summary.effectDist.map(([e, c]) => `${e}(${c}回)`).join('　')}
                </p>
              )}
              {summary.medDays >= 10 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                  ⚠ 月10日以上の痛み止め使用あり。薬物乱用頭痛（MOH）の可能性について確認を推奨します。
                </p>
              )}
            </Section>

            {/* ④ 最重症発作 */}
            {summary.topSevere.length > 0 && summary.topSevere[0].intensity > 0 && (
              <Section title="④ 最重症発作 Top3">
                <div className="space-y-2">
                  {summary.topSevere.filter(r => r.intensity > 0).map((r, i) => (
                    <div key={r.id} className="border border-gray-200 rounded-lg p-2.5 flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-rose-600">{r.intensity}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">
                          {format(r.occurredAt, 'yyyy年M月d日（E）HH:mm', { locale: ja })}
                          {r.durationMinutes && <span className="font-normal text-gray-500">　持続: {formatDuration(r.durationMinutes)}</span>}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                          {r.character?.length > 0 && <span>性質: {r.character.join('・')}</span>}
                          {r.locations?.length > 0 && <span>部位: {r.locations.join('・')}</span>}
                          {r.symptoms?.length > 0 && <span>症状: {r.symptoms.join('・')}</span>}
                        </p>
                        <p className="text-xs text-gray-600 flex flex-wrap gap-x-3">
                          {r.triggers?.length > 0 && <span>誘因: {r.triggers.join('・')}</span>}
                          {r.medicationUsed && <span>服薬: {r.medicationName ?? '使用'}{r.medicationEffect ? `（${r.medicationEffect}）` : ''}</span>}
                          {r.recoveryLevel && <span>回復: {r.recoveryLevel}</span>}
                        </p>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5">メモ: {r.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ⑤ 月別推移 */}
            {summary.monthlyStats.length > 1 && (
              <Section title="⑤ 月別推移">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-1.5 text-left font-medium text-gray-600">月</th>
                      <th className="border border-gray-200 px-3 py-1.5 text-center font-medium text-gray-600">頭痛日数</th>
                      <th className="border border-gray-200 px-3 py-1.5 text-center font-medium text-gray-600">平均強度</th>
                      <th className="border border-gray-200 px-3 py-1.5 text-center font-medium text-gray-600">痛み止め使用日</th>
                      <th className="border border-gray-200 px-3 py-1.5 text-center font-medium text-gray-600">傾向</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.monthlyStats.map((ms, i) => (
                      <tr key={ms.label} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-3 py-1.5 font-medium text-gray-700">{ms.label}</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-700">{ms.headacheDays}日</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-700">
                          {ms.avgInt > 0 ? ms.avgInt.toFixed(1) : '—'}
                        </td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-700">{ms.medDays}日</td>
                        <td className="border border-gray-200 px-3 py-1.5 text-center">
                          {getIntensityEmoji(Math.round(ms.avgInt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}
          </div>

          {/* ════ PAGE 2+: カレンダー ════ */}
          <div style={{ pageBreakBefore: 'always' }} className="px-6 pt-4">
            <h2 className="text-base font-bold text-slate-700 mb-1">月間カレンダー</h2>
            <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-blue-100 border border-blue-200 rounded inline-block" />軽度(1-3)</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded inline-block" />中等度(4-6)</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-rose-300 border border-rose-400 rounded inline-block" />重度(7-10)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />痛み止め使用</span>
            </div>

            {months.map(({ year, month }) => {
              const rows = buildCalendarRows(year, month, byDate);
              return (
                <div key={`${year}-${month}`} className="mb-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-1.5">{year}年{month + 1}月</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {DOW.map((d, i) => (
                          <th key={d} className={`text-center py-1 font-medium ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-gray-600'}`}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => {
                            if (!cell) return <td key={ci} className="border border-gray-100 p-1 h-10" />;
                            const { date, records: dr } = cell;
                            const maxInt = dr.length > 0 ? Math.max(...dr.map(r => r.intensity)) : 0;
                            const hasMed = dr.some(r => r.medicationUsed);
                            const dow = getDay(date);
                            return (
                              <td key={ci} className={`border border-gray-200 p-1 h-10 align-top relative ${getIntensityBgPrint(maxInt)}`}>
                                <span className={`text-xs font-medium ${dow === 0 ? 'text-rose-600' : dow === 6 ? 'text-indigo-600' : 'text-gray-700'}`}>
                                  {date.getDate()}
                                </span>
                                {maxInt > 0 && (
                                  <span className="block text-sm leading-tight">{getIntensityEmoji(maxInt)}</span>
                                )}
                                {hasMed && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-indigo-500" />}
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
          </div>

          {/* ════ PAGE 3+: 詳細記録 ════ */}
          {records.length > 0 && (
            <div style={{ pageBreakBefore: 'always' }} className="px-6 pt-4 pb-6">
              <h2 className="text-base font-bold text-slate-700 mb-3">詳細記録一覧</h2>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    {['日時', '強', '性質', '部位', '随伴症状', '誘因', '持続', '痛み止め・効果', '回復', 'メモ'].map(h => (
                      <th key={h} className="border border-gray-200 px-1.5 py-1.5 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className={getIntensityBgPrint(r.intensity)}>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700 whitespace-nowrap">{format(r.occurredAt, 'M/d HH:mm')}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-center font-bold text-gray-700">{r.intensity}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.character?.join('・') ?? ''}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.locations?.join('・') ?? ''}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.symptoms?.join('・') ?? ''}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.triggers?.join('・') ?? ''}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700 whitespace-nowrap">{formatDuration(r.durationMinutes)}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">
                        {r.medicationUsed ? `${r.medicationName ?? '使用'}${r.medicationAmount ? ` ${r.medicationAmount}錠` : ''}${r.medicationEffect ? `\n${r.medicationEffect}` : ''}` : ''}
                      </td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.recoveryLevel ?? ''}</td>
                      <td className="border border-gray-200 px-1.5 py-1.5 text-gray-700">{r.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-4">このデータは医療診断に使用するものではなく、受診時の参考情報です。</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-slate-700 bg-gray-100 px-3 py-1.5 rounded mb-2">{title}</h2>
      {children}
    </div>
  );
}
