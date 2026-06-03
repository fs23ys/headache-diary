'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, PenLine, Brain, Printer, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: CalendarDays, label: 'カレンダー' },
  { href: '/record/new', icon: PenLine, label: '記録' },
  { href: '/analyze', icon: Brain, label: 'AI分析' },
  { href: '/export', icon: Printer, label: 'PDF' },
  { href: '/settings', icon: Settings, label: '設定' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 no-print">
      <div className="flex">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href === '/record/new' && pathname.startsWith('/record'));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors',
                active ? 'text-indigo-600' : 'text-gray-400',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
