"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";
import { Toast } from "../components/Toast";

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Profile = { id: number; firstName: string; lastName: string; role: "TEACHER" | "STUDENT" | "ADMIN" };

const TeacherHeader = ({
  contrastMode,
  setContrastMode,
  notifications = [],
  notificationsOpen,
  onToggleNotifications,
}: {
  contrastMode: "normal" | "high1" | "high2";
  setContrastMode: (v: "normal" | "high1" | "high2") => void;
  notifications?: string[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
}) => (
  <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-3 py-3">
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
            {notifications.length > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-2 py-[2px] text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                Powiadomienia
              </div>
              <div className="max-h-64 overflow-y-auto text-sm">
                {notifications.length === 0 ? (
                  <p className="px-3 py-2 text-slate-500">Brak nowych powiadomień.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                      {n}
                    </div>
                  ))
                )}
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

const PageFooter = () => (
  <footer className="border-t border-slate-200 bg-white">
    <div className="mx-auto max-w-5xl px-3 py-3 text-center text-xs font-semibold text-slate-600">
      Praca Maciej Mika WCY22IJ2N1
    </div>
  </footer>
);

export default function EksportPage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [contrastMode, setContrastMode] = useState<"normal" | "high1" | "high2">("normal");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("contrast-high1", "contrast-high2");
    if (contrastMode === "high1") document.documentElement.classList.add("contrast-high1");
    if (contrastMode === "high2") document.documentElement.classList.add("contrast-high2");
  }, [contrastMode]);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) setToken(saved);
    const savedGroup = localStorage.getItem("selectedGroup");
    if (savedGroup) setSelectedGroup(Number(savedGroup));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((p) => setProfile(p))
      .catch(() => setProfile(null));
  }, [token]);

  useEffect(() => {
    if (!token || !profile || profile.role !== "TEACHER") return;
    apiFetch<ClassGroup[]>(`${API_URL}/api/teacher/class-groups`, token)
      .then((data) => {
        setGroups(data || []);
        if (!selectedGroup && data && data.length) {
          setSelectedGroup(data[0].id);
          localStorage.setItem("selectedGroup", String(data[0].id));
        }
      })
      .catch(() => setGroups([]));
  }, [token, profile]);

  useEffect(() => {
    if (selectedGroup) {
      localStorage.setItem("selectedGroup", String(selectedGroup));
    }
  }, [selectedGroup]);

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);
  const notifications: string[] = [];

  const downloadFile = async (url: string, filename: string) => {
    if (!token) return;
    try {
      setMsg("Przygotowuję plik do pobrania...");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(href);
      setMsg("Pobrano plik.");
    } catch (e) {
      setMsg("Błąd pobierania: " + (e as Error).message);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby eksportować dane.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader
        contrastMode={contrastMode}
        setContrastMode={setContrastMode}
        notifications={notifications}
        notificationsOpen={notificationsOpen}
        onToggleNotifications={() => setNotificationsOpen((v) => !v)}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Narzędzia</p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Eksport / archiwum</h1>
              <p className="text-sm text-slate-600 mt-1">
                Pobierz dane kursu w formie CSV lub pełnego archiwum ZIP. Dostęp tylko dla nauczycieli kursu.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-2">Grupa</p>
              <select
                value={selectedGroup ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedGroup(v === "" ? null : Number(v));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- wybierz --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.studentCount || 0})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Wybierz grupę, aby udostępnić eksport. Lista grup pochodzi z kursów, do których masz dostęp.
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 shadow-sm">
              CSV szczegółowe = wszystkie prace i statusy. CSV końcowe = wyniki końcowe. ZIP = komplet plików i CSV.
            </div>
            {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
          </aside>

          <main className="space-y-4">
            {!selectedGroup ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                Wybierz grupę po lewej, aby pobrać eksport.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      downloadFile(
                        `${API_URL}/api/export/course/${selectedGroup}/csv-detailed`,
                        `course-${selectedGroup}-szczegolowe.csv`
                      )
                    }
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    CSV: prace szczegółowe
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        `${API_URL}/api/export/course/${selectedGroup}/csv-aggregated`,
                        `course-${selectedGroup}-oceny-koncowe.csv`
                      )
                    }
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    CSV: oceny końcowe
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        `${API_URL}/api/archive/course/${selectedGroup}?anonymize=false`,
                        `course-${selectedGroup}-archiwum.zip`
                      )
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    ZIP: pełne archiwum
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <PageFooter />
    </div>
  );
}

