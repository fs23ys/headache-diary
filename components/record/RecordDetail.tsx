'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
import { deleteRecord } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getIntensityLabel, getIntensityBg, getIntensityTextColor } from '@/lib/utils';
import type { HeadacheRecord } from '@/types';

interface Props {
  date: Date;
  records: HeadacheRecord[];
  onClose: () => void;
  onRefresh: () => void;
}

export function RecordDetail({ date, records, onClose, onRefresh }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!user || !confirm('この記録を削除しますか？')) return;
    setDeleting(id);
    try {
      await deleteRecord(user.uid, id);
      onRefresh();
      if (records.length <= 1) onClose();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end no-print" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {format(date, 'M月d日（E）', { locale: ja })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                router.push(
                  `/record/new?date=${format(date, 'yyyy-MM-dd')}`,
                );
              }}
              className="flex items-center gap-1 text-sm text-indigo-600 px-3 py-1.5 rounded-lg bg-indigo-50"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
            <button onClick={onClose} className="p-1 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Records */}
        <div className="p-4 space-y-4 pb-8">
          {records.length === 0 ? (
            <p className="text-center text-gray-400 py-8">この日の記録はありません</p>
          ) : (
            records.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={() => {
                  onClose();
                  router.push(`/record/${record.id}/edit`);
                }}
                onDelete={() => handleDelete(record.id)}
                deleting={deleting === record.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  onEdit,
  onDelete,
  deleting,
}: {
  record: HeadacheRecord;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border border-gray-100 ${getIntensityBg(record.intensity)}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-sm text-gray-500">
            {format(record.occurredAt, 'HH:mm')}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-2xl font-bold ${getIntensityTextColor(record.intensity)}`}
            >
              {record.intensity}
            </span>
            <span className="text-sm text-gray-600">/ 10　{getIntensityLabel(record.intensity)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 rounded-lg bg-white border border-gray-200 text-rose-400 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {record.locations.length > 0 && (
        <TagRow label="部位" tags={record.locations} />
      )}
      {record.symptoms.length > 0 && (
        <TagRow label="症状" tags={record.symptoms} />
      )}
      {record.triggers.length > 0 && (
        <TagRow label="誘因" tags={record.triggers} />
      )}

      {record.medicationUsed && (
        <div className="mt-2 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">
          <span>💊</span>
          <span>
            {record.medicationName ?? '痛み止め'}
            {record.medicationAmount ? `　${record.medicationAmount}錠` : ''}
          </span>
        </div>
      )}

      {record.notes && (
        <p className="mt-2 text-sm text-gray-600 bg-white/60 px-3 py-2 rounded-lg">
          {record.notes}
        </p>
      )}
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      <span className="text-xs text-gray-500 self-center">{label}：</span>
      {tags.map(t => (
        <span key={t} className="text-xs bg-white/70 border border-gray-200 px-2 py-0.5 rounded-full text-gray-700">
          {t}
        </span>
      ))}
    </div>
  );
}
