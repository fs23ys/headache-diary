'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save, User, Pill, Plus, X, Pencil, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';

const DEFAULT_MEDICATIONS = [
  'イブプロフェン（ブルフェン）',
  'アセトアミノフェン（カロナール）',
  'ロキソプロフェン（ロキソニン）',
  'スマトリプタン（イミグラン）',
  'エレトリプタン（レルパックス）',
  'ゾルミトリプタン（ゾーミッグ）',
];

export default function SettingsPage() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [newMed, setNewMed] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(p => {
      if (p?.displayName) setDisplayName(p.displayName);
      setMedications(p?.medications ?? DEFAULT_MEDICATIONS);
    });
  }, [user]);

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveUserProfile(user.uid, {
        displayName: displayName.trim() || undefined,
        medications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function addMedication() {
    const name = newMed.trim();
    if (!name || medications.includes(name)) return;
    setMedications(prev => [...prev, name]);
    setNewMed('');
  }

  function removeMedication(index: number) {
    setMedications(prev => prev.filter((_, i) => i !== index));
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(medications[index]);
  }

  function commitEdit(index: number) {
    const trimmed = editingValue.trim();
    if (trimmed && !medications.some((m, i) => m === trimmed && i !== index)) {
      setMedications(prev => prev.map((m, i) => (i === index ? trimmed : m)));
    }
    setEditingIndex(null);
  }

  async function handleLogout() {
    if (!confirm('ログアウトしますか？')) return;
    await logOut();
    router.push('/login');
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-bold text-slate-700">設定</h1>

      {/* プロフィール */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-500">プロフィール</span>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
            <div className="px-4 py-3 rounded-xl bg-gray-50 text-base text-gray-500">{user?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">お名前（PDF出力に使用）</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="例：山田 太郎"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
      </div>

      {/* 薬リスト管理 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Pill className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-500">痛み止めリスト</span>
          <span className="text-xs text-gray-400 ml-1">（追加・編集・削除できます）</span>
        </div>
        <div className="p-4 space-y-2">
          {medications.map((med, index) => (
            <div key={index} className="flex items-center gap-2 group">
              {editingIndex === index ? (
                <>
                  <input
                    ref={editInputRef}
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(index); if (e.key === 'Escape') setEditingIndex(null); }}
                    onBlur={() => commitEdit(index)}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button onClick={() => commitEdit(index)} className="p-2 text-indigo-500">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 px-3 py-2.5 rounded-lg bg-gray-50 text-sm text-gray-700">{med}</span>
                  <button onClick={() => startEdit(index)} className="p-2 text-gray-400 hover:text-indigo-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeMedication(index)} className="p-2 text-gray-400 hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 追加フォーム */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={newMed}
              onChange={e => setNewMed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              placeholder="薬の名前を追加"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button type="button" onClick={addMedication} disabled={!newMed.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-40">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-60">
        <Save className="w-4 h-4" />
        {saved ? '保存しました！' : saving ? '保存中...' : '設定を保存'}
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm text-gray-400">
          このアプリは頭痛の記録補助ツールです。医療診断を行うものではありません。
        </p>
      </div>

      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-rose-200 text-rose-500 font-medium active:bg-rose-50">
        <LogOut className="w-5 h-5" />
        ログアウト
      </button>
    </div>
  );
}
