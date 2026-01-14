"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";

type ContrastMode = "normal" | "high1" | "high2";

const TeacherHeader = ({
  contrastMode,
  setContrastMode,
  notificationsOpen,
  onToggleNotifications,
}: {
  contrastMode: ContrastMode;
  setContrastMode: (v: ContrastMode) => void;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
}) => (
  <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Panel dydaktyczny</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="relative">
          <button
            className="relative rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
            title="Powiadomienia"
            onClick={onToggleNotifications}
          >
            🔔
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                Powiadomienia
              </div>
              <div className="max-h-64 overflow-y-auto text-sm">
                <p className="px-3 py-2 text-slate-500">Brak nowych powiadomień.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1" aria-label="Zmiana kontrastu">
          <button
            onClick={() => setContrastMode("normal")}
            className={`rounded-md px-2 py-1 font-semibold ${
              contrastMode === "normal" ? "bg-slate-300 text-slate-900" : "bg-slate-100 text-slate-700"
            }`}
          >
            Normalny
          </button>
          <button
            onClick={() => setContrastMode("high1")}
            className={`rounded-md px-2 py-1 font-semibold ${
              contrastMode === "high1" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Kontrast 1
          </button>
          <button
            onClick={() => setContrastMode("high2")}
            className={`rounded-md px-2 py-1 font-semibold ${
              contrastMode === "high2" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Kontrast 2
          </button>
        </div>
        <a
          href="/"
          className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
        >
          ← Strona główna
        </a>
      </div>
    </div>
  </header>
);

export default function StatystykiPage() {
  const [contrastMode, setContrastMode] = useState<ContrastMode>("normal");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<
    { taskId: number; taskTitle: string; courseName: string; passed: number; failed: number; pending: number }[]
  >([]);
  useEffect(() => {
    document.documentElement.classList.remove("contrast-high1", "contrast-high2");
    if (contrastMode === "high1") document.documentElement.classList.add("contrast-high1");
    if (contrastMode === "high2") document.documentElement.classList.add("contrast-high2");
  }, [contrastMode]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/stats/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setStats(Array.isArray(data) ? data : []))
      .catch(() => setStats([]));
  }, [token]);

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
      <TeacherHeader
        contrastMode={contrastMode}
        setContrastMode={setContrastMode}
        notificationsOpen={notificationsOpen}
        onToggleNotifications={() => setNotificationsOpen((v) => !v)}
      />
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Statystyki</h2>
            <p className="text-sm text-slate-600">Podsumowanie zaliczeń i oddań dla zadań/przedmiotów.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-6 py-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">Łączne</p>
            <div className="grid grid-cols-[140px,1fr] items-center gap-4">
              <div
                className="mx-auto rounded-full border border-slate-200 shadow-inner"
                style={{ ...donutStyle, height: "9rem", width: "9rem" }}
              >
                <div
                  className="flex items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-slate-800 shadow"
                  style={{ margin: "1.25rem", height: "6.5rem", width: "6.5rem" }}
                >
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
                  <th className="pb-2 pr-4">Nazwa zadania</th>
                  <th className="pb-2 pr-4">Przedmiot</th>
                  <th className="pb-2 pr-4">Zaliczono</th>
                  <th className="pb-2 pr-4">Niezaliczone</th>
                  <th className="pb-2 pr-4">Brak oddania</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((s) => (
                  <tr key={`${s.taskId}-${s.taskTitle}`} className="text-slate-800">
                    <td className="py-2 pr-4 font-semibold">{s.taskTitle}</td>
                    <td className="py-2 pr-4 text-slate-700">{s.courseName}</td>
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

