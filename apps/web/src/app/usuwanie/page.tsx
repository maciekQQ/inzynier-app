"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";
import { Toast } from "../components/Toast";

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Task = { id: number; title: string; description?: string; sessionName?: string; sessionId?: number; gradingMode?: string; endDate?: string; startDate?: string; maxPoints?: number; passThreshold?: number | null };
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

export default function UsuwaniePage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deleteSelection, setDeleteSelection] = useState<number[]>([]);
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

  useEffect(() => {
    if (!selectedGroup || !token) {
      setTasks([]);
      setDeleteSelection([]);
      return;
    }
    apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token)
      .then((data) => {
        setTasks(data || []);
        setDeleteSelection([]);
      })
      .catch(() => {
        setTasks([]);
        setDeleteSelection([]);
      });
  }, [selectedGroup, token]);

  const selectEndedTasks = () => {
    const now = new Date();
    setDeleteSelection(tasks.filter((t) => (t.endDate ? new Date(t.endDate) < now : false)).map((t) => t.id));
  };

  const selectAllTasks = () => {
    setDeleteSelection(tasks.map((t) => t.id));
  };

  const clearDeleteSelection = () => setDeleteSelection([]);

  const toggleTask = (id: number) => {
    setDeleteSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteTasks = async () => {
    if (deleteSelection.length === 0) {
      setMsg("Zaznacz zadania do usunięcia.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/course/tasks/bulk`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: selectedGroup, taskIds: deleteSelection }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTasks((t) => t.filter((task) => !deleteSelection.includes(task.id)));
      setDeleteSelection([]);
      setMsg("Usunięto zaznaczone zadania.");
    } catch (e) {
      setMsg("Błąd usuwania zadań: " + (e as Error).message);
    }
  };

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);
  const notifications = useMemo(() => {
    const now = new Date();
    const ended = tasks.filter((t) => (t.endDate ? new Date(t.endDate) < now : false));
    return ended.map((t) => `Zadanie po terminie: ${t.sessionName ? `${t.sessionName} · ` : ""}${t.title}`);
  }, [tasks]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby usuwać zadania.</p>
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
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Czyszczenie</p>
          <h1 className="text-2xl font-bold text-slate-900">Usuwanie zadań</h1>
          <p className="text-sm text-slate-600 mt-1">Wybierz grupę, zaznacz zadania i usuń. Logika bez zmian.</p>
        </div>
        <div className="flex items-center gap-2 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <label className="font-semibold text-slate-700">Grupa</label>
          <select
            value={selectedGroup ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedGroup(v === "" ? null : Number(v));
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">-- wybierz --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.studentCount || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedGroup ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          Wybierz grupę, aby usuwać zadania.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectEndedTasks}
              className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
            >
              Zaznacz zakończone (po terminie)
            </button>
            <button
              onClick={selectAllTasks}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              Zaznacz wszystkie
            </button>
            <button
              onClick={clearDeleteSelection}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              Wyczyść zaznaczenie
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-600">Zaznaczone: {deleteSelection.length}</span>
              <button
                onClick={handleDeleteTasks}
                className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed"
                disabled={deleteSelection.length === 0}
              >
                Usuń zaznaczone
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-600">Brak zadań w tej grupie.</p>
          ) : (
            <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
              {tasks.map((t) => {
                const ended = t.endDate ? new Date(t.endDate) < new Date() : false;
                const checked = deleteSelection.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(t.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.sessionName ? `${t.sessionName} · ${t.title}` : t.title}
                      </p>
                      <p className="text-xs text-slate-600">{t.description || "Brak opisu"}</p>
                      <p className="text-[11px] text-slate-500">
                        Termin ostateczny: {t.endDate ? new Date(t.endDate).toLocaleString("pl-PL") : "brak"}{" "}
                        {ended ? "· zakończone" : ""}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
    </div>
      <PageFooter />
    </div>
  );
}

