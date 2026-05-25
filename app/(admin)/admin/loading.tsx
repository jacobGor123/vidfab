const rows = Array.from({ length: 8 }, (_, index) => index);

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-slate-200" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-md bg-slate-200" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row} className="grid grid-cols-5 gap-4 px-4 py-4">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
