'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-gray-500 text-sm">エラーが発生しました</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
