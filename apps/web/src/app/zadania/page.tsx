"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";
import { Toast } from "../components/Toast";

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Task = { id: number; title: string; description?: string; sessionName?: string; sessionId?: number; gradingMode?: string; endDate?: string; startDate?: string; maxPoints?: number; passThreshold?: number | null };
type TaskMaterial = { id: number; taskId: number; fileKey: string; originalFileName: string; downloadUrl: string };
type Profile = { id: number; firstName: string; lastName: string; role: "TEACHER" | "STUDENT" | "ADMIN" };

const gradingLabel = (mode?: string, maxPoints?: number) =>
  mode === "POINTS10" ? `Ocena punktowa (1-${maxPoints || 10})` : "Punktacja procentowa (1-100)";

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
            aria-label="Powiadomienia"
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
              <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-b border-slate-100">
                Powiadomienia
              </div>
              <div className="max-h-64 overflow-y-auto text-sm">
                {notifications.length === 0 ? (
                  <p className="px-3 py-2 text-slate-500">Brak nowych powiadomień.</p>
                ) : (
                  notifications.map((n, idx) => (
                    <div key={idx} className="px-3 py-2 border-b border-slate-100 last:border-b-0">
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

export default function ZadaniaPage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT", maxPoints: 10, passThreshold: "" as number | string | undefined });
  const [newSession, setNewSession] = useState({
    name: "",
    type: "LAB",
    tasksCount: 1,
    gradingMode: "PERCENT",
    maxPoints: 10,
    passThreshold: "" as number | string | undefined,
  });
  const [sessionPassTouched, setSessionPassTouched] = useState(false);
  const [sessionTasks, setSessionTasks] = useState<
    Array<{
      title: string;
      description: string;
      soft: string;
      hard: string;
      maxPoints?: number;
      passThreshold?: number | null;
      material?: { fileKey: string; originalFileName: string };
    }>
  >([
    {
      title: "",
      description: "",
      soft: "",
      hard: "",
      maxPoints: 10,
      passThreshold: null,
    },
  ]);
  const [sessionTasksPage, setSessionTasksPage] = useState(0);
  const [materials, setMaterials] = useState<TaskMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const fileInputTeacher = useRef<HTMLInputElement | null>(null);
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
    if (!selectedGroup) return;
    localStorage.setItem("selectedGroup", String(selectedGroup));
  }, [selectedGroup]);

  // Synchronizuj maks punkty przy zmianie trybu sesji (ukrycie/ustawienie domyślne)
  useEffect(() => {
    setSessionTasks((prev) =>
      prev.map((t) => ({
        ...t,
        maxPoints: newSession.gradingMode === "POINTS10" ? t.maxPoints ?? newSession.maxPoints ?? 10 : undefined,
      }))
    );
    setSessionPassTouched(false);
  }, [newSession.gradingMode, newSession.maxPoints]);

  // Auto-sugeruj próg zaliczenia przedmiotu jako sumę progów zadań (dla punktów) lub sumę % (ucięte do 100)
  const suggestedSessionPass = useMemo(() => {
    const values = sessionTasks
      .map((t) => (t.passThreshold === null || t.passThreshold === undefined || Number.isNaN(Number(t.passThreshold)) ? null : Number(t.passThreshold)))
      .filter((v): v is number => v !== null);
    if (!values.length) return "";
    const sum = values.reduce((a, b) => a + b, 0);
    if (newSession.gradingMode === "POINTS10") return sum;
    return Math.min(100, Math.round(sum));
  }, [sessionTasks, newSession.gradingMode]);

  useEffect(() => {
    if (sessionPassTouched) return;
    setNewSession((s) => ({ ...s, passThreshold: suggestedSessionPass === "" ? "" : suggestedSessionPass }));
  }, [suggestedSessionPass, sessionPassTouched]);

  const handleTeacherFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    try {
      setUploadingMaterial(true);
      setMsg("Wysyłam materiał...");
      const presignRes = await fetch(`${API_URL}/api/storage/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "teacher-materials",
          originalFileName: file.name,
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const presign = await presignRes.json();
      await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      setMsg("Materiał wysłany (dodaj do zadania po utworzeniu).");
    } catch (err) {
      setMsg("Błąd dodawania materiału: " + (err as Error).message);
    } finally {
      setUploadingMaterial(false);
      if (fileInputTeacher.current) fileInputTeacher.current.value = "";
    }
  };

  const handleUploadSessionTaskMaterial = async (index: number, file: File) => {
    try {
      setMsg("Wysyłam materiał zadania...");
      const presignRes = await fetch(`${API_URL}/api/storage/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "session-task-materials",
          originalFileName: file.name,
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const presign = await presignRes.json();
      await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      setSessionTasks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], material: { fileKey: presign.fileKey, originalFileName: file.name } };
        return next;
      });
      setMsg("Dodano materiał do zadania.");
    } catch (e) {
      setMsg("Błąd dodawania materiału: " + (e as Error).message);
    }
  };

  const createTaskFlow = async () => {
    if (!selectedGroup) {
      setMsg("Wybierz grupę.");
      return;
    }
    if (!newTask.title || !newTask.soft || !newTask.hard) {
      setMsg("Uzupełnij tytuł oraz terminy.");
      return;
    }
    if (new Date(newTask.hard) < new Date(newTask.soft)) {
      setMsg("Termin ostateczny nie może być wcześniejszy niż preferowany.");
      return;
    }
    try {
      setMsg("Tworzę zadanie...");
      const softIso = new Date(newTask.soft).toISOString();
      const hardIso = new Date(newTask.hard).toISOString();
      const taskRes = await fetch(`${API_URL}/api/course/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedGroup,
          title: newTask.title,
          description: newTask.description,
          startDate: softIso,
          endDate: hardIso,
          gradingMode: newTask.gradingMode,
          maxPoints: newTask.gradingMode === "POINTS10" ? Number(newTask.maxPoints || 10) : undefined,
          passThreshold:
            newTask.passThreshold !== "" && newTask.passThreshold !== undefined
              ? Number(newTask.passThreshold)
              : undefined,
        }),
      });
      if (!taskRes.ok) throw new Error(await taskRes.text());
      setMsg("Zadanie utworzone.");
      setNewTask({ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT", maxPoints: 10, passThreshold: "" });
    } catch (e) {
      setMsg("Błąd tworzenia zadania: " + (e as Error).message);
    }
  };

  const updateSessionTask = (index: number, patch: Partial<(typeof sessionTasks)[number]>) => {
    setSessionTasks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const createSessionFlow = async () => {
    if (!selectedGroup) {
      setMsg("Wybierz grupę.");
      return;
    }
    if (!newSession.name) {
      setMsg("Uzupełnij nazwę sesji.");
      return;
    }
    if (sessionTasks.length !== Number(newSession.tasksCount || 1)) {
      setMsg("Liczba kart zadań musi odpowiadać polu 'Liczba zadań'.");
      return;
    }
    const invalidDate = sessionTasks.find((t) => t.soft && t.hard && new Date(t.hard) < new Date(t.soft));
    if (invalidDate) {
      setMsg("Termin ostateczny nie może być wcześniejszy niż preferowany w którymkolwiek zadaniu.");
      return;
    }
    try {
      setMsg("Tworzę sesję (Lab/Wykład) i zadania...");
      const res = await fetch(`${API_URL}/api/course/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedGroup,
          name: newSession.name,
          type: newSession.type,
          tasksCount: Number(newSession.tasksCount || 1),
          gradingMode: newSession.gradingMode,
          passThreshold:
            newSession.passThreshold !== "" && newSession.passThreshold !== undefined
              ? Number(newSession.passThreshold)
              : undefined,
          startDate: null,
          endDate: null,
          tasks: sessionTasks.map((t) => ({
            title: t.title || null,
            description: t.description || null,
            startDate: t.soft ? new Date(t.soft).toISOString() : null,
            endDate: t.hard ? new Date(t.hard).toISOString() : null,
            gradingMode: newSession.gradingMode,
            maxPoints: newSession.gradingMode === "POINTS10" ? Number(t.maxPoints || 10) : undefined,
            passThreshold:
              t.passThreshold !== null && t.passThreshold !== undefined
                ? Number(t.passThreshold)
                : undefined,
            materialFileKey: t.material?.fileKey || null,
            materialOriginalFileName: t.material?.originalFileName || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Sesja utworzona.");
      setNewSession({ name: "", type: "LAB", tasksCount: 1, gradingMode: "PERCENT", maxPoints: 10, passThreshold: "" });
      setSessionTasks([{ title: "", description: "", soft: "", hard: "", maxPoints: undefined, passThreshold: null }]);
      setSessionTasksPage(0);
    } catch (e) {
      setMsg("Błąd tworzenia sesji: " + (e as Error).message);
    }
  };

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sessionTasks.length / pageSize));
  const currentPage = Math.min(sessionTasksPage, totalPages - 1);
  const start = currentPage * pageSize;
  const slice = sessionTasks.slice(start, start + pageSize);

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);
  const notifications: string[] = []; // brak backendowego feedu – pokazujemy pusty panel

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby tworzyć zadania.</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Tworzenie</p>
            <h1 className="text-2xl font-bold text-slate-900">Zadania i sesje (Lab/Wykład)</h1>
            <p className="text-sm text-slate-600 mt-1">Logika bez zmian: twórz pojedyncze zadania lub całe sesje.</p>
          </div>
          <div className="flex items-center gap-2 text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <label className="font-semibold text-slate-700" htmlFor="task-group-select">
              Grupa
            </label>
            <select
              id="task-group-select"
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
            Wybierz grupę, aby tworzyć zadania.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pojedyncze zadanie */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">🆕 Kreator zadań (pojedyncze)</h3>
                <span className="text-xs text-slate-600">Tworzenie pojedynczego zadania</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-title">
                    Tytuł
                  </label>
                  <input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Np. Zadanie 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-description">
                    Opis
                  </label>
                  <input
                    id="task-description"
                    value={newTask.description}
                    onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Instrukcja dla studentów"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-soft">
                    Termin preferowany
                  </label>
                  <input
                    id="task-soft"
                    type="datetime-local"
                    value={newTask.soft}
                    onChange={(e) => setNewTask((t) => ({ ...t, soft: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-hard">
                    Termin ostateczny
                  </label>
                  <input
                    id="task-hard"
                    type="datetime-local"
                    value={newTask.hard}
                    onChange={(e) => setNewTask((t) => ({ ...t, hard: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-grading-mode">
                    Tryb oceny
                  </label>
                  <select
                    id="task-grading-mode"
                    value={newTask.gradingMode}
                    onChange={(e) => setNewTask((t) => ({ ...t, gradingMode: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENT">Procentowa (1-100)</option>
                    <option value="POINTS10">Punktowa (1-x)</option>
                  </select>
                </div>
                {newTask.gradingMode === "POINTS10" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-max-points">
                      Maks. punktów (x)
                    </label>
                    <input
                      id="task-max-points"
                      type="number"
                      min={1}
                      max={9999}
                      value={newTask.maxPoints}
                      onChange={(e) => setNewTask((t) => ({ ...t, maxPoints: Number(e.target.value) }))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="task-pass">
                    Próg zaliczenia ({newTask.gradingMode === "POINTS10" ? "pkt" : "%"})
                  </label>
                  <input
                    id="task-pass"
                    type="number"
                    min={0}
                    max={newTask.gradingMode === "POINTS10" ? newTask.maxPoints || 10 : 100}
                    value={newTask.passThreshold ?? ""}
                    onChange={(e) => setNewTask((t) => ({ ...t, passThreshold: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder={newTask.gradingMode === "POINTS10" ? "np. 6" : "np. 51"}
                  />
                </div>
              </div>
              <button
                onClick={createTaskFlow}
                className="mt-3 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Utwórz zadanie
              </button>
              <p className="mt-2 text-xs text-slate-600">
                Brutto = punkty przed karą, Netto = po karze. Kara może być tylko informacyjna (nauczyciel może ją pominąć).
              </p>
            </div>

            {/* Sesja / zestaw zadań */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">🧪 Kreator zadań Laboratoria/Wykłady</h3>
                <span className="text-xs text-slate-600">Tworzenie zadań w sesji</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="session-name">
                    Nazwa przedmiotu
                  </label>
                  <input
                    id="session-name"
                    value={newSession.name}
                    onChange={(e) => setNewSession((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Laboratorium 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="session-type">
                    Typ
                  </label>
                  <select
                    id="session-type"
                    value={newSession.type}
                    onChange={(e) => setNewSession((s) => ({ ...s, type: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="LAB">Laboratorium</option>
                    <option value="LECTURE">Wykład</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="session-count">
                    Liczba zadań
                  </label>
                  <input
                    id="session-count"
                    type="number"
                    min={1}
                    max={50}
                    value={newSession.tasksCount}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const val = Math.max(1, Math.min(50, raw === "" ? 1 : Number(raw) || 1));
                      setNewSession((s) => ({ ...s, tasksCount: val }));
                      setSessionTasks((prev) => {
                        const next = [...prev];
                        if (val > next.length) {
                          for (let i = next.length; i < val; i++) {
                            next.push({
                              title: "",
                              description: "",
                              soft: "",
                              hard: "",
                              maxPoints: newSession.gradingMode === "POINTS10" ? newSession.maxPoints || 10 : undefined,
                              passThreshold: null,
                            });
                          }
                        } else if (val < next.length) {
                          next.length = val;
                        }
                        return next;
                      });
                      setSessionTasksPage(0);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="session-grading-mode">
                    Tryb oceny domyślny
                  </label>
                  <select
                    id="session-grading-mode"
                    value={newSession.gradingMode}
                    onChange={(e) => setNewSession((s) => ({ ...s, gradingMode: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PERCENT">Procentowa (1-100)</option>
                    <option value="POINTS10">Punktowa (1-x)</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="session-pass">
                  Próg zaliczenia przedmiotu ({newSession.gradingMode === "POINTS10" ? "pkt" : "%"})
                </label>
                <input
                  id="session-pass"
                  type="number"
                  min={0}
                  max={newSession.gradingMode === "POINTS10" ? newSession.maxPoints || 10 : 100}
                  value={newSession.passThreshold ?? ""}
                  onChange={(e) => {
                    setSessionPassTouched(true);
                    setNewSession((s) => ({ ...s, passThreshold: e.target.value === "" ? "" : Number(e.target.value) }));
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder={newSession.gradingMode === "POINTS10" ? "np. 25" : "np. 60"}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  To próg zaliczenia przedmiotu; każde zadanie może mieć własny próg i max punktów w konfiguracji poniżej.
                </p>
              </div>
              <button
                onClick={createSessionFlow}
                className="mt-3 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"
              >
                Utwórz sesję i zadania
              </button>
              <p className="mt-2 text-xs text-slate-600">
                Tworzy sesję (Lab/Wykład) i automatycznie dodaje wskazaną liczbę zadań (1 etap, forma pliku), z podanym trybem oceniania.
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Zadania w sesji (konfiguracja)</p>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>{sessionTasks.length} zadań</span>
                    <span>
                      Strona {currentPage + 1} / {totalPages}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setSessionTasksPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
                    aria-label="Poprzednia strona zadań"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setSessionTasksPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
                    aria-label="Następna strona zadań"
                  >
                    →
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {slice.map((task, idxLocal) => {
                    const idx = start + idxLocal;
                    return (
                      <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Zadanie {idx + 1}</span>
                          <span>{task.material?.originalFileName ? "Materiał dodany" : "Brak materiału"}</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Tytuł</label>
                            <input
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={task.title}
                              onChange={(e) => updateSessionTask(idx, { title: e.target.value })}
                              placeholder={`Zadanie ${idx + 1}`}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Opis</label>
                            <input
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={task.description}
                              onChange={(e) => updateSessionTask(idx, { description: e.target.value })}
                              placeholder="Opis / instrukcja"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600">Termin preferowany</label>
                              <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={task.soft}
                                onChange={(e) => updateSessionTask(idx, { soft: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600">Termin ostateczny</label>
                              <input
                                type="datetime-local"
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={task.hard}
                                onChange={(e) => updateSessionTask(idx, { hard: e.target.value })}
                              />
                            </div>
                          </div>
                          {newSession.gradingMode === "POINTS10" ? (
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600">Maks. punktów (x)</label>
                              <input
                                type="number"
                                min={1}
                                max={9999}
                                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                value={task.maxPoints ?? newSession.maxPoints ?? 10}
                                onChange={(e) => updateSessionTask(idx, { maxPoints: Number(e.target.value) })}
                              />
                            </div>
                          ) : null}
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">
                              Próg zaliczenia ({newSession.gradingMode === "POINTS10" ? "pkt" : "%"})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={newSession.gradingMode === "POINTS10" ? task.maxPoints || newSession.maxPoints || 10 : 100}
                              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                              value={task.passThreshold ?? ""}
                              onChange={(e) =>
                                updateSessionTask(idx, { passThreshold: e.target.value === "" ? null : Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              className="rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.onchange = (ev) => {
                                  const file = (ev.target as HTMLInputElement).files?.[0];
                                  if (file) handleUploadSessionTaskMaterial(idx, file);
                                };
                                input.click();
                              }}
                            >
                              Dodaj materiał
                            </button>
                            {task.material?.originalFileName ? (
                              <span className="text-slate-600">{task.material.originalFileName}</span>
                            ) : (
                              <span className="text-slate-500">Opcjonalnie</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Tryb oceniania i skala punktowa są wspólne dla całej sesji (ustawione powyżej).
                            Nazwę, opis, materiał i terminy możesz później edytować w zakładce „Edycja zadań”.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

