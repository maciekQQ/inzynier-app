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

export default function PrzypisywaniePage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<"ALL" | "SINGLE" | "SUBJECT">("ALL");
  const [selectedSessionSubject, setSelectedSessionSubject] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
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
      setStudents([]);
      setTasks([]);
      setSelectedTask(null);
      return;
    }
    apiFetch<any[]>(`${API_URL}/api/teacher/class-groups/${selectedGroup}/students`, token)
      .then(setStudents)
      .catch(() => setStudents([]));
    apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token)
      .then((data) => {
        setTasks(data || []);
        setSelectedTask(data && data.length ? data[0].id : null);
        setSelectedSessionFilter("ALL");
        setSelectedSessionSubject(null);
      })
      .catch(() => {
        setTasks([]);
        setSelectedTask(null);
        setSelectedSessionFilter("ALL");
        setSelectedSessionSubject(null);
      });
    setSelectedStudents([]);
    setAvailableStudents([]);
  }, [selectedGroup, token]);

  useEffect(() => {
    if (!selectedTask || !token) {
      setAvailableStudents([]);
      setSelectedStudents([]);
      return;
    }
    apiFetch<any[]>(`${API_URL}/api/teacher/tasks/${selectedTask}/students/available`, token)
      .then((data) => {
        setAvailableStudents(Array.isArray(data) ? data : []);
        setSelectedStudents([]);
      })
      .catch(() => {
        setAvailableStudents([]);
        setSelectedStudents([]);
      });
  }, [selectedTask, token]);

  const sessionOptions = useMemo(() => {
    const map = new Map<number, string>();
    tasks
      .filter((t) => t.sessionId)
      .forEach((t) => {
        const name = t.sessionName || `Przedmiot #${t.sessionId}`;
        map.set(t.sessionId as number, name);
      });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const tasksForDropdown = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedSessionFilter === "ALL") return true;
      if (selectedSessionFilter === "SINGLE") return !t.sessionId;
      if (selectedSessionFilter === "SUBJECT") return selectedSessionSubject ? t.sessionId === selectedSessionSubject : false;
      return true;
    });
  }, [tasks, selectedSessionFilter, selectedSessionSubject]);

  const getStudentId = (s: any) => (s.studentId != null ? Number(s.studentId) : Number(s.id));

  const toggleStudentSelection = (id: number) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const assignAll = async () => {
    if (!selectedTask) return;
    setMsg("Przypisywanie wszystkich...");
    try {
      const res = await fetch(`${API_URL}/api/teacher/tasks/${selectedTask}/students/assign-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Przypisano wszystkich studentów do zadania.");
    } catch (e) {
      setMsg("Błąd przypisywania: " + (e as Error).message);
    }
  };

  const assignSelected = async () => {
    if (!selectedTask || selectedStudents.length === 0) {
      setMsg("Wybierz zadanie i studentów.");
      return;
    }
    setMsg("Przypisywanie wybranych...");
    try {
      const res = await fetch(`${API_URL}/api/teacher/tasks/${selectedTask}/students/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Przypisano wybranych studentów.");
    } catch (e) {
      setMsg("Błąd przypisywania: " + (e as Error).message);
    }
  };

  const assignSessionAll = async () => {
    if (selectedSessionFilter !== "SUBJECT" || !selectedSessionSubject) return;
    const tasksInSession = tasks.filter((t) => t.sessionId === selectedSessionSubject);
    if (tasksInSession.length === 0) return;
    setMsg("Przypisywanie całej sesji (wszyscy studenci)...");
    try {
      for (const t of tasksInSession) {
        const res = await fetch(`${API_URL}/api/teacher/tasks/${t.id}/students/assign-all`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setMsg("Przypisano całą sesję do wszystkich studentów.");
    } catch (e) {
      setMsg("Błąd przypisywania sesji: " + (e as Error).message);
    }
  };

  const assignSessionSelected = async () => {
    if (selectedSessionFilter !== "SUBJECT" || !selectedSessionSubject) return;
    if (selectedStudents.length === 0) {
      setMsg("Wybierz studentów.");
      return;
    }
    const tasksInSession = tasks.filter((t) => t.sessionId === selectedSessionSubject);
    if (tasksInSession.length === 0) return;
    setMsg("Przypisywanie całej sesji (wybrani studenci)...");
    try {
      for (const t of tasksInSession) {
        const res = await fetch(`${API_URL}/api/teacher/tasks/${t.id}/students/assign`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studentIds: selectedStudents }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      setMsg("Przypisano całą sesję wybranym studentom.");
    } catch (e) {
      setMsg("Błąd przypisywania sesji: " + (e as Error).message);
    }
  };

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);
  const notifications: string[] = [];

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-3 py-6">
        <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby przypisywać zadania.</p>
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Praca ze studentami</p>
            <h1 className="text-2xl font-bold text-slate-900">Przypisywanie zadań</h1>
            <p className="text-sm text-slate-600 mt-1">Wybierz grupę, tryb i studentów. Logika bez zmian.</p>
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
        <p className="text-sm text-slate-700">Wybierz grupę, aby przypisywać zadania.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">📌 Przypisywanie</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tryb</label>
              <select
                value={selectedSessionFilter}
                onChange={(e) => {
                  const val = e.target.value as "ALL" | "SINGLE" | "SUBJECT";
                  setSelectedSessionFilter(val);
                  if (val === "SUBJECT") {
                    const firstSubject = sessionOptions[0] ?? null;
                    setSelectedSessionSubject(firstSubject ? firstSubject.id : null);
                    const firstTask = tasks.find((t) => (firstSubject ? t.sessionId === firstSubject.id : false));
                    setSelectedTask(firstTask ? firstTask.id : null);
                  } else {
                    setSelectedSessionSubject(null);
                    const first = tasks.filter((t) => {
                      if (val === "ALL") return true;
                      if (val === "SINGLE") return !t.sessionId;
                      return true;
                    })[0];
                    setSelectedTask(first ? first.id : null);
                  }
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ALL">Wszystkie</option>
                <option value="SINGLE">Zadania pojedyncze</option>
                <option value="SUBJECT">Przedmiot (Lab/Wykład)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Przedmiot z kreatora (Lab/Wykład)
              </label>
              <select
                value={selectedSessionSubject ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const nextSubject = val ? Number(val) : null;
                  setSelectedSessionSubject(nextSubject);
                  setSelectedSessionFilter("SUBJECT");
                  const first = tasks.filter((t) => (nextSubject ? t.sessionId === nextSubject : false))[0];
                  setSelectedTask(first ? first.id : null);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={sessionOptions.length === 0}
              >
                <option value="">-- wybierz przedmiot --</option>
                {sessionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Zadanie</label>
              <select
                value={selectedTask ?? ""}
                onChange={(e) => setSelectedTask(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- wybierz zadanie --</option>
                {tasksForDropdown.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sessionName ? `${t.sessionName} · ${t.title}` : t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-1">
              <button
                onClick={assignAll}
                disabled={!selectedTask}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                Przypisz wszystkim
              </button>
              <button
                onClick={assignSelected}
                disabled={!selectedTask || selectedStudents.length === 0}
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                Przypisz wybranych
              </button>
            </div>
          </div>

          {selectedSessionFilter === "SUBJECT" && selectedSessionSubject && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs text-slate-600">
                Przypisywanie całego przedmiotu {selectedSessionSubject} (wszystkie zadania w sesji):
              </span>
              <button
                onClick={assignSessionAll}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Sesja — wszyscy
              </button>
              <button
                onClick={assignSessionSelected}
                disabled={selectedStudents.length === 0}
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-300 hover:bg-indigo-700"
              >
                Sesja — wybrani
              </button>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-800">👥 Studenci</h4>
            <div className="mt-3 divide-y divide-slate-100">
              {students.length === 0 ? (
                <p className="text-sm text-slate-600">Brak studentów w tej grupie.</p>
              ) : (
                (availableStudents.length > 0
                  ? availableStudents.filter((s) => !s.isAssigned && !s.assigned)
                  : students
                ).map((s) => {
                  const sid = getStudentId(s);
                  return (
                    <div key={sid} className="flex items-center justify-between py-3">
                      <label className="flex flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(sid)}
                          onChange={() => toggleStudentSelection(sid)}
                          className="h-4 w-4"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-xs text-slate-600">
                            Album: {s.albumNumber || "brak"} | Email: {s.email}
                          </p>
                        </div>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

        {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
      </div>
      <PageFooter />
    </div>
  );
}

