'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addRecord } from '@/lib/firestore';
import { RecordForm } from '@/components/record/RecordForm';
import type { HeadacheRecordInput } from '@/types';

function NewRecordContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get('date');
  const defaultDate = dateParam ? new Date(dateParam + 'T' + new Date().toTimeString().slice(0, 5)) : undefined;

  async function handleSubmit(data: HeadacheRecordInput) {
    if (!user) return;
    await addRecord(user.uid, data);
    router.push('/');
  }

  return (
    <RecordForm
      defaultDate={defaultDate}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}

export default function NewRecordPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold text-gray-800">頭痛を記録する</h1>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-gray-400">読み込み中...</div>}>
        <NewRecordContent />
      </Suspense>
    </div>
  );
}
