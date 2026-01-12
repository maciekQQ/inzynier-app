"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Task = { id: number; title: string; description?: string; sessionName?: string; sessionId?: number; gradingMode?: string; endDate?: string; startDate?: string; maxPoints?: number; passThreshold?: number | null };
type TaskMaterial = { id: number; taskId: number; fileKey: string; originalFileName: string; downloadUrl: string };
type Profile = { id: number; firstName: string; lastName: string; role: "TEACHER" | "STUDENT" | "ADMIN" };
type EditForm = { title: string; description: string; soft: string; hard: string; maxPoints?: number; passThreshold?: number | null };
type TeacherQueueEntry = { taskId: number; lastSubmittedAt?: string | null };

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

export default function MaterialyPage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [materials, setMaterials] = useState<TaskMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputTeacher = useRef<HTMLInputElement | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: "", description: "", soft: "", hard: "", maxPoints: 10, passThreshold: null });
  const [contrastMode, setContrastMode] = useState<"normal" | "high1" | "high2">("normal");
  const [submissionsByTask, setSubmissionsByTask] = useState<Record<number, number>>({});
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
      setSelectedTask(null);
      setMaterials([]);
      setSubmissionsByTask({});
      return;
    }
    apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token)
      .then((data) => {
        setTasks(data || []);
        const firstId = data && data.length ? data[0].id : null;
        setSelectedTask(firstId);
      })
      .catch(() => {
        setTasks([]);
        setSelectedTask(null);
      });
    apiFetch<TeacherQueueEntry[]>(`${API_URL}/api/grading-queue/teacher?courseId=${selectedGroup}`, token)
      .then((data) => {
        const map: Record<number, number> = {};
        (data || []).forEach((q) => {
          if (q.lastSubmittedAt) {
            map[q.taskId] = (map[q.taskId] || 0) + 1;
          }
        });
        setSubmissionsByTask(map);
      })
      .catch(() => setSubmissionsByTask({}));
  }, [selectedGroup, token]);

  useEffect(() => {
    if (!selectedTask || !token) {
      setMaterials([]);
      setEditForm({ title: "", description: "", soft: "", hard: "", maxPoints: 10, passThreshold: null });
      return;
    }
    const t = tasks.find((x) => x.id === selectedTask);
    setEditForm({
      title: t?.title || "",
      description: t?.description || "",
      soft: t?.startDate ? new Date(t.startDate).toISOString().slice(0, 16) : "",
      hard: t?.endDate ? new Date(t.endDate).toISOString().slice(0, 16) : "",
      maxPoints: t?.maxPoints ?? 10,
      passThreshold: t?.passThreshold ?? null,
    });
    apiFetch<TaskMaterial[]>(`${API_URL}/api/course/tasks/${selectedTask}/materials`, token)
      .then((data) => setMaterials(data || []))
      .catch(() => setMaterials([]));
  }, [selectedTask, token, tasks]);

  const toIso = (value: string) => (value ? new Date(value).toISOString() : null);

  const handlePickMaterial = () => {
    fileInputTeacher.current?.click();
  };

  const handleTeacherFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
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
      const addRes = await fetch(`${API_URL}/api/course/tasks/${selectedTask}/materials`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey: presign.fileKey,
          originalFileName: file.name,
        }),
      });
      if (!addRes.ok) throw new Error(await addRes.text());
      const saved = await addRes.json();
      setMaterials((m) => [...m, saved]);
      setMsg("Dodano materiał do zadania.");
    } catch (err) {
      setMsg("Błąd dodawania materiału: " + (err as Error).message);
    } finally {
      setUploadingMaterial(false);
      if (fileInputTeacher.current) fileInputTeacher.current.value = "";
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`${API_URL}/api/course/tasks/${selectedTask}/materials/${materialId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setMaterials((m) => m.filter((mm) => mm.id !== materialId));
      setMsg("Usunięto materiał.");
    } catch (err) {
      setMsg("Błąd usuwania materiału: " + (err as Error).message);
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTask || !token) return;
    if (editForm.soft && editForm.hard && new Date(editForm.hard) < new Date(editForm.soft)) {
      setMsg("Termin ostateczny nie może być wcześniejszy niż preferowany.");
      return;
    }
    const current = tasks.find((t) => t.id === selectedTask);
    try {
      const res = await fetch(`${API_URL}/api/course/tasks/${selectedTask}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          startDate: toIso(editForm.soft),
          endDate: toIso(editForm.hard),
          gradingMode: current?.gradingMode || "PERCENT",
          maxPoints: current?.gradingMode === "POINTS10" ? Number(editForm.maxPoints || 10) : undefined,
          passThreshold:
            editForm.passThreshold !== null && editForm.passThreshold !== undefined
              ? Number(editForm.passThreshold)
              : undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask
            ? {
                ...t,
                title: saved.title,
                description: saved.description,
                startDate: saved.startDate,
                endDate: saved.endDate,
                maxPoints: saved.maxPoints,
              }
            : t
        )
      );
      setMsg("Zapisano zmiany zadania.");
    } catch (e) {
      setMsg("Błąd zapisu zadania: " + (e as Error).message);
    }
  };

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);
  const hasSubmissions = selectedTask ? (submissionsByTask[selectedTask] || 0) > 0 : false;
  const notifications = useMemo(() => {
    const now = new Date();
    const ended = tasks.filter((t) => (t.endDate ? new Date(t.endDate) < now : false));
    return ended.map((t) => `Zadanie po terminie: ${t.title}`);
  }, [tasks]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby zarządzać materiałami.</p>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Edycja</p>
            <h1 className="text-3xl font-bold text-slate-900">Edycja zadań</h1>
            <p className="text-sm text-slate-600 mt-1">
              Edytuj nazwę, opis, terminy i materiały. Tryb oceniania bez zmian; termin preferowany blokuje się po pierwszym oddaniu.
            </p>
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
            Wybierz grupę, aby edytować zadania i materiały.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-2">Zadanie</p>
                <select
                  value={selectedTask ?? ""}
                  onChange={(e) => setSelectedTask(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">-- wybierz zadanie --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {selectedTask ? (
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] font-semibold text-indigo-700">
                        {tasks.find((t) => t.id === selectedTask)?.gradingMode === "POINTS10"
                          ? `Punkty (1-${tasks.find((t) => t.id === selectedTask)?.maxPoints || 10})`
                          : "Procent"}
                      </span>
                      {hasSubmissions ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-[2px] text-[11px] font-semibold text-amber-700">
                          Ma oddania
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-[2px] text-[11px] font-semibold text-emerald-700">
                          Bez oddań
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Termin preferowany jest blokowany po pierwszym oddaniu. Możesz zawsze zmienić termin ostateczny.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Wybierz zadanie, aby edytować szczegóły.</p>
                )}
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 shadow-sm">
                Wskazówka: zmiana terminu ostatecznego jest zawsze dostępna, nawet przy oddaniach.
              </div>
              {msg && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 shadow-sm">
                  {msg}
                </div>
              )}
            </aside>

            <main className="space-y-4">
              {!selectedTask ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
                  Wybierz zadanie po lewej, aby edytować szczegóły i materiały.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nazwa zadania</label>
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Opis</label>
                        <input
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Opcjonalnie"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Termin preferowany</label>
                        <input
                          type="datetime-local"
                          value={editForm.soft}
                          onChange={(e) => setEditForm((f) => ({ ...f, soft: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          disabled={hasSubmissions}
                        />
                        {hasSubmissions ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Termin preferowany jest zablokowany po pierwszym oddaniu. Zmień tylko termin ostateczny.
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Termin ostateczny</label>
                        <input
                          type="datetime-local"
                          value={editForm.hard}
                          onChange={(e) => setEditForm((f) => ({ ...f, hard: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Próg zaliczenia ({tasks.find((t) => t.id === selectedTask)?.gradingMode === "POINTS10" ? "pkt" : "%"})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={
                            tasks.find((t) => t.id === selectedTask)?.gradingMode === "POINTS10"
                              ? tasks.find((t) => t.id === selectedTask)?.maxPoints || 10
                              : 100
                          }
                          value={editForm.passThreshold ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, passThreshold: e.target.value === "" ? null : Number(e.target.value) }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      {tasks.find((t) => t.id === selectedTask)?.gradingMode === "POINTS10" ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Maks. punktów (x)</label>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={editForm.maxPoints}
                            onChange={(e) => setEditForm((f) => ({ ...f, maxPoints: Number(e.target.value) }))}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveTask}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        Zapisz zmiany zadania
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Materiały</span>
                        {uploadingMaterial ? (
                          <span className="inline-flex rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] font-semibold text-indigo-700">
                            Wysyłanie...
                          </span>
                        ) : null}
                      </div>
                      {!selectedTask ? (
                        <span className="text-[11px] text-slate-500">Wybierz zadanie, aby dodać materiał</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputTeacher}
                        type="file"
                        className="hidden"
                        onChange={handleTeacherFileChange}
                        aria-label="Dodaj materiał"
                      />
                      <button
                        onClick={handlePickMaterial}
                        disabled={!selectedTask || uploadingMaterial}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        Dodaj materiał
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      {materials.length === 0 ? (
                        <p className="text-slate-600">Brak materiałów dla tego zadania.</p>
                      ) : (
                        materials.map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                            <div>
                              <p className="font-semibold text-slate-900">{m.originalFileName}</p>
                              <a
                                className="text-xs text-indigo-600 hover:underline"
                                href={m.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Pobierz
                              </a>
                            </div>
                            <button
                              onClick={() => handleDeleteMaterial(m.id)}
                              className="text-xs font-semibold text-rose-700 hover:underline"
                            >
                              Usuń
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        )}

        {msg && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm text-indigo-900">{msg}</p>
          </div>
        )}
      </div>
      <PageFooter />
    </div>
  );
}

