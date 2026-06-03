import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getIntensityBg(intensity: number): string {
  if (intensity === 0) return 'bg-white';
  if (intensity <= 3) return 'bg-blue-50';
  if (intensity <= 6) return 'bg-yellow-50';
  return 'bg-rose-200';
}

export function getIntensityBgPrint(intensity: number): string {
  if (intensity === 0) return '';
  if (intensity <= 3) return 'bg-blue-100';
  if (intensity <= 6) return 'bg-yellow-100';
  return 'bg-rose-300';
}

export function getIntensityLabel(intensity: number): string {
  if (intensity === 0) return 'なし';
  if (intensity <= 3) return '軽度';
  if (intensity <= 6) return '中等度';
  return '重度';
}

export function getIntensityTextColor(intensity: number): string {
  if (intensity === 0) return 'text-gray-400';
  if (intensity <= 3) return 'text-amber-700';
  if (intensity <= 6) return 'text-orange-700';
  return 'text-rose-700';
}

export function getIntensityEmoji(intensity: number): string {
  if (intensity === 0) return '😊';
  if (intensity <= 2) return '🙂';
  if (intensity <= 4) return '😟';
  if (intensity <= 6) return '😣';
  if (intensity <= 8) return '😖';
  return '😵';
}

export function getSliderTrackColor(intensity: number): string {
  if (intensity === 0) return '#9ca3af';
  if (intensity <= 3) return '#3b82f6';
  if (intensity <= 6) return '#eab308';
  return '#ef4444';
}

export function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
