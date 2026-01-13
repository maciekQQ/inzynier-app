"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";

export default function StatystykiPage() {
  const [stats, setStats] = useState<
    { taskId: number; taskTitle: string; courseName: string; passed: number; failed: number; pending: number }[]
  >([]);

  useEffect(() => {
    fetch(`${API_URL}/api/stats/overview`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStats(Array.isArray(data) ? data : []))
      .catch(() => setStats([]));
  }, []);

  const totals = useMemo(() => {
    const all = stats.reduce(
      (acc, s) => {
        acc.passed += s.passed;
        acc.failed += s.failed;
        acc.pending += s.pending;
        return acc;
      },
      { passed: 0, failed: 0, pending: 0 }
    );
    const sum = all.passed + all.failed + all.pending || 1;
    return {
      ...all,
      total: sum,
      pctPassed: Math.round((all.passed / sum) * 100),
      pctFailed: Math.round((all.failed / sum) * 100),
      pctPending: Math.round((all.pending / sum) * 100),
    };
  }, [stats]);

  const donutStyle = {
    background: `conic-gradient(#22c55e 0deg ${totals.pctPassed * 3.6}deg, #f97316 ${totals.pctPassed * 3.6}deg ${
      (totals.pctPassed + totals.pctFailed) * 3.6
    }deg, #94a3b8 ${(totals.pctPassed + totals.pctFailed) * 3.6}deg 360deg)`,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Statystyki</h1>
            <p className="text-sm text-slate-600">Podsumowanie zaliczeń i oddań dla zadań/przedmiotów.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-6 py-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Łączne</p>
            <div className="grid grid-cols-[120px,1fr] items-center gap-4">
              <div className="mx-auto h-28 w-28 rounded-full border border-slate-200 shadow-inner" style={donutStyle}>
                <div className="m-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-slate-800 shadow">
                  {totals.total} razem
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500"></span> Zaliczono
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {totals.passed} ({totals.pctPassed}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-orange-500"></span> Niezaliczone
                  </span>
                  <span className="font-semibold text-orange-700">
                    {totals.failed} ({totals.pctFailed}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-400"></span> Brak oddania
                  </span>
                  <span className="font-semibold text-slate-600">
                    {totals.pending} ({totals.pctPending}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Szybki podgląd</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Zaliczono</p>
                <p className="text-lg font-bold text-emerald-700">{totals.passed}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Niezaliczone</p>
                <p className="text-lg font-bold text-orange-600">{totals.failed}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Brak oddania</p>
                <p className="text-lg font-bold text-slate-700">{totals.pending}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">Łącznie</p>
                <p className="text-lg font-bold text-slate-900">{totals.total}</p>
              </div>
            </div>
          </div>
        </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-3">Lista zadań / przedmiotów</p>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="pb-2 pr-4">Nazwa</th>
                  <th className="pb-2 pr-4">Zaliczono</th>
                  <th className="pb-2 pr-4">Niezaliczone</th>
                  <th className="pb-2 pr-4">Brak oddania</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s) => (
                  <tr key={`${s.taskId}-${s.taskTitle}`} className="text-slate-800">
                    <td className="py-2 pr-4 font-semibold">{s.taskTitle}</td>
                    <td className="py-2 pr-4">{s.courseName}</td>
                    <td className="py-2 pr-4 text-emerald-700">{s.passed}</td>
                    <td className="py-2 pr-4 text-orange-700">{s.failed}</td>
                    <td className="py-2 pr-4 text-slate-600">{s.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

