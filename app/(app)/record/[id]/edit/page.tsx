'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRecord, updateRecord } from '@/lib/firestore';
import { RecordForm } from '@/components/record/RecordForm';
import type { HeadacheRecord, HeadacheRecordInput } from '@/types';

export default function EditRecordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<HeadacheRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    getRecord(user.uid, id).then(r => {
      if (!r) setNotFound(true);
      else setRecord(r);
      setLoading(false);
    });
  }, [user, id]);

  async function handleSubmit(data: HeadacheRecordInput) {
    if (!user) return;
    await updateRecord(user.uid, id, data);
    router.push('/');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400 text-sm">
        読み込み中...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400 text-sm">
        記録が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-gray-800">記録を編集</h1>
      </div>

      {record && (
        <RecordForm
          initialData={record}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      )}
    </div>
  );
}
