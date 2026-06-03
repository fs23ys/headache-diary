'use client';

import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Brain, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRecordsForRange } from '@/lib/firestore';
import type { HeadacheRecord } from '@/types';

function formatDuration(min?: number): string {
  if (!min) return '不明';
  if (min < 60) return `${min}分`;
  return `${Math.round(min / 60 * 10) / 10}時間`;
}

function buildExportText(records: HeadacheRecord[], months: number): string {
  const end = new Date();
  const start = subMonths(end, months);
  const period = `${format(start, 'yyyy年M月d日', { locale: ja })} 〜 ${format(end, 'yyyy年M月d日', { locale: ja })}`;

  const headacheDays = new Set(
    records.filter(r => r.intensity > 0).map(r => format(r.occurredAt, 'yyyy-MM-dd'))
  ).size;
  const avgIntensity = records.length
    ? (records.reduce((s, r) => s + r.intensity, 0) / records.length).toFixed(1)
    : '0';
  const medDays = new Set(
    records.filter(r => r.medicationUsed).map(r => format(r.occurredAt, 'yyyy-MM-dd'))
  ).size;

  const lines: string[] = [];
  lines.push('# 頭痛ダイアリー データ');
  lines.push('');
  lines.push(`## 分析期間`);
  lines.push(period);
  lines.push('');
  lines.push('## 統計サマリー');
  lines.push(`- 記録件数: ${records.length}件`);
  lines.push(`- 頭痛発生日数: ${headacheDays}日`);
  lines.push(`- 平均強度: ${avgIntensity}/10`);
  lines.push(`- 痛み止め使用日数: ${medDays}日`);
  lines.push('');
  lines.push('## 記録一覧');

  for (const r of records) {
    lines.push('');
    lines.push(`### ${format(r.occurredAt, 'yyyy年M月d日（E） HH:mm', { locale: ja })}`);
    lines.push(`- 強度: ${r.intensity}/10`);
    if (r.character?.length) lines.push(`- 性質: ${r.character.join('、')}`);
    if (r.locations?.length) lines.push(`- 部位: ${r.locations.join('、')}`);
    if (r.symptoms?.length) lines.push(`- 随伴症状: ${r.symptoms.join('、')}`);
    if (r.triggers?.length) lines.push(`- 誘因: ${r.triggers.join('、')}`);
    if (r.durationMinutes) lines.push(`- 持続時間: ${formatDuration(r.durationMinutes)}`);
    if (r.medicationUsed) {
      lines.push(`- 痛み止め: ${r.medicationName ?? '使用'}${r.medicationAmount ? ` ${r.medicationAmount}錠` : ''}`);
      if (r.medicationEffect) lines.push(`- 効果: ${r.medicationEffect}`);
    }
    if (r.recoveryLevel) lines.push(`- 回復程度: ${r.recoveryLevel}`);
    if (r.notes) lines.push(`- メモ: ${r.notes}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## AIへの分析依頼（このまま貼り付けてください）');
  lines.push('');
  lines.push('上記は私の頭痛記録データです。以下の観点で分析してください。');
  lines.push('');
  lines.push('1. 誘発パターン：どの誘因・組み合わせで発症率が高いか（具体的な割合・倍率で）');
  lines.push('2. 時間・曜日パターン：発症しやすい時間帯や曜日');
  lines.push('3. 痛みが特に強くなる条件');
  lines.push('4. 痛み止めが効きやすい/効きにくいパターン');
  lines.push('5. 回復を早める共通点');
  lines.push('6. データに基づく具体的な予防アドバイス（3〜5つ）');
  lines.push('');
  lines.push('数値・割合を積極的に使い、「○○の日は発症率△倍」のような具体的な表現でお願いします。');

  return lines.join('\n');
}

export default function AnalyzePage() {
  const { user } = useAuth();
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [preview, setPreview] = useState('');

  async function handleCopy() {
    if (!user) return;
    setLoading(true);
    try {
      const end = new Date();
      const start = subMonths(end, months);
      const records = await getRecordsForRange(user.uid, start, end);
      setRecordCount(records.length);

      const text = buildExportText(records, months);
      setPreview(text);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-indigo-600" />
        <h1 className="text-lg font-bold text-slate-700">AI分析データ出力</h1>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">
        記録データをコピーして Claude.ai や ChatGPT に貼り付けると、個人固有の頭痛パターンを分析してもらえます。
      </p>

      {/* 期間選択 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">出力期間</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 6, 12].map(m => (
              <button
                key={m}
                onClick={() => { setMonths(m); setPreview(''); setRecordCount(null); }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  months === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m}ヶ月
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCopy}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-medium text-base disabled:opacity-60 active:bg-indigo-700"
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {loading ? '取得中...' : copied ? 'コピーしました！' : 'データをコピー'}
        </button>

        {recordCount !== null && (
          <p className="text-xs text-center text-gray-400">
            {recordCount}件のデータをコピーしました
          </p>
        )}
      </div>

      {/* 手順 */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-indigo-700">使い方</p>
        <ol className="space-y-2">
          {[
            '期間を選んで「データをコピー」を押す',
            'Claude.ai または ChatGPT を開く',
            'テキストエリアに貼り付けて送信',
            '分析結果を確認する',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-indigo-700">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* プレビュー */}
      {preview && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">コピーしたデータのプレビュー</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(preview);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-indigo-600 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              再コピー
            </button>
          </div>
          <pre className="text-xs text-gray-500 p-4 overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed">
            {preview}
          </pre>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        AIの分析は参考情報です。医療診断ではありません。
      </p>
    </div>
  );
}
