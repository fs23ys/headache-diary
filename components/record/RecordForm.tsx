'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Activity, Sparkles, MapPin, Clock, Zap, Pill, RefreshCw, ChevronDown, NotebookPen } from 'lucide-react';
import { formatDatetimeLocal, getSliderTrackColor, getIntensityLabel } from '@/lib/utils';
import { getUserProfile } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { HeadacheRecord, HeadacheRecordInput } from '@/types';

const CHARACTER_OPTIONS = ['拍動性（ズキズキ）', '締め付け（ギューッ）', '刺すような痛み', '重だるい', '圧迫感', '燃えるような痛み'];
const LOCATIONS = ['右前頭部', '左前頭部', '右後頭部', '左後頭部', 'こめかみ（右）', 'こめかみ（左）', '全体'];
const SYMPTOMS = ['吐き気', '嘔吐', '光過敏', '音過敏', 'めまい', '首・肩のこり', '目の疲れ'];
const TRIGGERS = ['睡眠不足', '寝すぎ', 'ストレス', '天気・気圧変化', '飲酒', '月経', '食事・空腹', 'PC・スマホ疲れ', '運動不足'];
const EFFECT_OPTIONS = ['効果あり（完全に楽になった）', '少し効いた', 'あまり効かなかった', '効果なし'];
const RECOVERY_OPTIONS = ['完全に回復', 'ほぼ回復（少し残る）', '少し改善', '改善なし'];
const DURATION_OPTIONS = [
  { label: '〜30分', value: 30 },
  { label: '約1時間', value: 60 },
  { label: '2〜3時間', value: 150 },
  { label: '4〜6時間', value: 300 },
  { label: '半日（8時間前後）', value: 480 },
  { label: '12時間以上', value: 720 },
  { label: '1日以上', value: 1440 },
];

const DEFAULT_MEDICATIONS = [
  'イブプロフェン（ブルフェン）',
  'アセトアミノフェン（カロナール）',
  'ロキソプロフェン（ロキソニン）',
  'スマトリプタン（イミグラン）',
  'エレトリプタン（レルパックス）',
  'ゾルミトリプタン（ゾーミッグ）',
];

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

function getTimeStr(date?: Date): string {
  if (!date) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function combineWithDate(base: Date, timeStr: string): Date | undefined {
  if (!timeStr) return undefined;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

interface Props {
  initialData?: HeadacheRecord;
  defaultDate?: Date;
  onSubmit: (data: HeadacheRecordInput) => Promise<void>;
  onCancel: () => void;
}

export function RecordForm({ initialData, defaultDate, onSubmit, onCancel }: Props) {
  const { user } = useAuth();
  const defaultDatetime = initialData?.occurredAt ?? defaultDate ?? new Date();

  const [occurredAt, setOccurredAt] = useState(defaultDatetime);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(initialData?.durationMinutes);
  const [intensity, setIntensity] = useState(initialData?.intensity ?? 5);
  const [character, setCharacter] = useState<string[]>(initialData?.character ?? []);
  const [locations, setLocations] = useState<string[]>(initialData?.locations ?? []);
  const [symptoms, setSymptoms] = useState<string[]>(initialData?.symptoms ?? []);
  const [triggers, setTriggers] = useState<string[]>(initialData?.triggers ?? []);
  const [medicationUsed, setMedicationUsed] = useState(initialData?.medicationUsed ?? false);
  const [medicationList, setMedicationList] = useState<string[]>(DEFAULT_MEDICATIONS);
  const [medicationPreset, setMedicationPreset] = useState('');
  const [medicationCustomName, setMedicationCustomName] = useState('');
  const [medicationAmount, setMedicationAmount] = useState(initialData?.medicationAmount ?? 1);
  const [medicationTimeStr, setMedicationTimeStr] = useState(getTimeStr(initialData?.medicationTime));
  const [medicationEffect, setMedicationEffect] = useState(initialData?.medicationEffect ?? '');
  const [recoveryTimeStr, setRecoveryTimeStr] = useState(getTimeStr(initialData?.recoveryTime));
  const [recoveryLevel, setRecoveryLevel] = useState(initialData?.recoveryLevel ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(profile => {
      const list = profile?.medications ?? DEFAULT_MEDICATIONS;
      setMedicationList(list);
      const initName = initialData?.medicationName;
      if (initName) {
        setMedicationPreset(list.includes(initName) ? initName : '自由入力');
        if (!list.includes(initName)) setMedicationCustomName(initName);
      }
    });
  }, [user, initialData?.medicationName]);

  const trackColor = getSliderTrackColor(intensity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const finalMedName = medicationPreset === '自由入力' ? medicationCustomName : medicationPreset;
      await onSubmit({
        occurredAt,
        durationMinutes,
        intensity,
        character,
        locations,
        symptoms,
        triggers,
        medicationUsed,
        medicationName: medicationUsed ? (finalMedName || undefined) : undefined,
        medicationAmount: medicationUsed ? medicationAmount : undefined,
        medicationTime: medicationUsed ? combineWithDate(occurredAt, medicationTimeStr) : undefined,
        medicationEffect: medicationUsed ? (medicationEffect || undefined) : undefined,
        recoveryTime: combineWithDate(occurredAt, recoveryTimeStr),
        recoveryLevel: recoveryLevel || undefined,
        notes: notes || undefined,
      });
    } catch {
      setError('保存に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8 pt-4">

      {/* 日時・持続時間 */}
      <Section icon={<CalendarDays className="w-4 h-4" />} title="日時・持続時間">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={formatDatetimeLocal(occurredAt)}
              onChange={e => setOccurredAt(new Date(e.target.value))}
              required
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="button"
              onClick={() => setOccurredAt(new Date())}
              className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium whitespace-nowrap active:bg-indigo-100"
            >
              今すぐ
            </button>
          </div>
          <div className="relative">
            <select
              value={durationMinutes ?? ''}
              onChange={e => setDurationMinutes(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none"
            >
              <option value="">持続時間（任意）</option>
              {DURATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </Section>

      {/* 頭痛の強さ */}
      <Section icon={<Activity className="w-4 h-4" />} title={`頭痛の強さ　${getIntensityLabel(intensity)}`}>
        <div className="px-2">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>0　なし</span>
            <span>最大　10</span>
          </div>
          <input
            type="range" min={0} max={10} step={1} value={intensity}
            onChange={e => setIntensity(Number(e.target.value))}
            style={{ background: `linear-gradient(to right, ${trackColor} ${intensity * 10}%, #e5e7eb ${intensity * 10}%)`, color: trackColor }}
            className="w-full"
          />
          <div className="flex justify-center mt-3">
            <span className="text-5xl font-bold tabular-nums" style={{ color: trackColor }}>{intensity}</span>
          </div>
        </div>
      </Section>

      {/* 頭痛の性質 */}
      <Section icon={<Sparkles className="w-4 h-4" />} title="頭痛の性質">
        <PillGroup options={CHARACTER_OPTIONS} selected={character} onChange={v => setCharacter(toggle(character, v))} />
      </Section>

      {/* 頭痛の部位 */}
      <Section icon={<MapPin className="w-4 h-4" />} title="頭痛の部位">
        <PillGroup options={LOCATIONS} selected={locations} onChange={v => setLocations(toggle(locations, v))} />
      </Section>

      {/* 随伴症状 */}
      <Section icon={<Clock className="w-4 h-4" />} title="随伴症状">
        <PillGroup options={SYMPTOMS} selected={symptoms} onChange={v => setSymptoms(toggle(symptoms, v))} />
      </Section>

      {/* 誘因 */}
      <Section icon={<Zap className="w-4 h-4" />} title="誘因">
        <PillGroup options={TRIGGERS} selected={triggers} onChange={v => setTriggers(toggle(triggers, v))} />
      </Section>

      {/* 痛み止め */}
      <Section icon={<Pill className="w-4 h-4" />} title="痛み止め">
        <div className="space-y-3">
          <div onClick={() => setMedicationUsed(v => !v)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 cursor-pointer select-none">
            <div className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${medicationUsed ? 'bg-indigo-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${medicationUsed ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-base font-medium text-gray-700">{medicationUsed ? '使用した' : '使用しなかった'}</span>
          </div>

          {medicationUsed && (
            <div className="space-y-3 pl-1">
              <div>
                <label className="block text-sm text-gray-500 mb-1.5">薬の種類</label>
                <div className="relative">
                  <select value={medicationPreset} onChange={e => setMedicationPreset(e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none">
                    <option value="">選択してください</option>
                    {medicationList.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="自由入力">自由入力（その他）</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {medicationPreset === '自由入力' && (
                  <input type="text" value={medicationCustomName} onChange={e => setMedicationCustomName(e.target.value)}
                    placeholder="薬の名前を入力" autoFocus
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">服薬時刻</label>
                  <input type="time" value={medicationTimeStr} onChange={e => setMedicationTimeStr(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">服用量</label>
                  <div className="flex items-center gap-2 h-[50px]">
                    <button type="button" onClick={() => setMedicationAmount(a => Math.max(1, a - 1))}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 text-xl text-gray-600 flex items-center justify-center flex-shrink-0">−</button>
                    <span className="text-xl font-bold text-gray-800 w-6 text-center tabular-nums">{medicationAmount}</span>
                    <button type="button" onClick={() => setMedicationAmount(a => a + 1)}
                      className="w-10 h-10 rounded-full bg-white border border-gray-200 text-xl text-gray-600 flex items-center justify-center flex-shrink-0">＋</button>
                    <span className="text-sm text-gray-500">錠</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1.5">効果</label>
                <PillGroup options={EFFECT_OPTIONS} selected={medicationEffect ? [medicationEffect] : []}
                  onChange={v => setMedicationEffect(prev => prev === v ? '' : v)} />
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 回復記録 */}
      <Section icon={<RefreshCw className="w-4 h-4" />} title="回復記録">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">回復時刻（任意）</label>
            <input type="time" value={recoveryTimeStr} onChange={e => setRecoveryTimeStr(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">回復の程度</label>
            <PillGroup options={RECOVERY_OPTIONS} selected={recoveryLevel ? [recoveryLevel] : []}
              onChange={v => setRecoveryLevel(prev => prev === v ? '' : v)} />
          </div>
        </div>
      </Section>

      {/* メモ */}
      <Section icon={<NotebookPen className="w-4 h-4" />} title="メモ（任意）">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="気になること・特記事項・その日何をしたかなど"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
      </Section>

      {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mx-4">{error}</p>}

      <div className="flex gap-3 px-4">
        <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-600 font-medium text-base">キャンセル</button>
        <button type="submit" disabled={loading} className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-medium text-base disabled:opacity-60 active:bg-indigo-700">
          {loading ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="px-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
        <span className="text-gray-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function PillGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (val: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
              isSelected ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
            }`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
