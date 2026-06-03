import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { HeadacheRecord, HeadacheRecordInput, UserProfile } from '@/types';

function recordsCol(userId: string) {
  return collection(db, 'users', userId, 'records');
}

function ts(date?: Date) {
  return date ? Timestamp.fromDate(date) : null;
}

function docToRecord(id: string, data: Record<string, unknown>): HeadacheRecord {
  return {
    id,
    userId: data.userId as string,
    occurredAt: (data.occurredAt as Timestamp).toDate(),
    intensity: data.intensity as number,
    character: (data.character as string[]) ?? [],
    locations: (data.locations as string[]) ?? [],
    symptoms: (data.symptoms as string[]) ?? [],
    triggers: (data.triggers as string[]) ?? [],
    durationMinutes: data.durationMinutes as number | undefined,
    medicationUsed: data.medicationUsed as boolean,
    medicationName: data.medicationName as string | undefined,
    medicationAmount: data.medicationAmount as number | undefined,
    medicationTime: data.medicationTime ? (data.medicationTime as Timestamp).toDate() : undefined,
    medicationEffect: data.medicationEffect as string | undefined,
    recoveryTime: data.recoveryTime ? (data.recoveryTime as Timestamp).toDate() : undefined,
    recoveryLevel: data.recoveryLevel as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

function inputToFirestore(input: HeadacheRecordInput) {
  return {
    ...input,
    occurredAt: Timestamp.fromDate(input.occurredAt),
    medicationTime: ts(input.medicationTime),
    recoveryTime: ts(input.recoveryTime),
    medicationName: input.medicationName ?? null,
    medicationAmount: input.medicationAmount ?? null,
    medicationEffect: input.medicationEffect ?? null,
    recoveryLevel: input.recoveryLevel ?? null,
    durationMinutes: input.durationMinutes ?? null,
    notes: input.notes ?? null,
  };
}

export async function addRecord(userId: string, input: HeadacheRecordInput): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(recordsCol(userId), {
    ...inputToFirestore(input),
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateRecord(userId: string, recordId: string, input: HeadacheRecordInput): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'records', recordId), {
    ...inputToFirestore(input),
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRecord(userId: string, recordId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'records', recordId));
}

export async function getRecord(userId: string, recordId: string): Promise<HeadacheRecord | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'records', recordId));
  if (!snap.exists()) return null;
  return docToRecord(snap.id, snap.data() as Record<string, unknown>);
}

export async function getRecordsForMonth(userId: string, year: number, month: number): Promise<HeadacheRecord[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const q = query(recordsCol(userId), where('occurredAt', '>=', Timestamp.fromDate(start)), where('occurredAt', '<=', Timestamp.fromDate(end)), orderBy('occurredAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function getRecordsForRange(userId: string, start: Date, end: Date): Promise<HeadacheRecord[]> {
  const endWithTime = new Date(end);
  endWithTime.setHours(23, 59, 59, 999);
  const q = query(recordsCol(userId), where('occurredAt', '>=', Timestamp.fromDate(start)), where('occurredAt', '<=', Timestamp.fromDate(endWithTime)), orderBy('occurredAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => docToRecord(d.id, d.data() as Record<string, unknown>));
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'profile', 'data'));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'profile', 'data'), profile, { merge: true });
}
