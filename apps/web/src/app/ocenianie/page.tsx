"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Task = { id: number; title: string; description?: string; sessionName?: string; sessionId?: number; gradingMode?: string; endDate?: string; startDate?: string; maxPoints?: number; passThreshold?: number | null };
type TeacherQueueEntry = {
  artifactId: number;
  stageId: number;
  taskId: number;
  courseId: number;
  studentId: number;
  albumNumber?: string;
  studentName?: string;
  taskTitle?: string;
  stageName?: string;
  artifactName?: string;
  lastRevisionId?: number;
  lastRevisionStatus?: string;
  lastSubmittedAt?: string;
  softDeadline?: string;
  hardDeadline?: string;
  penaltyPercentApplied?: number;
  lastPointsBrutto?: number;
  lastPointsNetto?: number;
};
type Profile = { id: number; firstName: string; lastName: string; role: "TEACHER" | "STUDENT" | "ADMIN" };

const statusLabel: Record<string, string> = {
  SUBMITTED: "Złożone (oczekuje)",
  NEEDS_FIX: "Do poprawy",
  ACCEPTED: "Zakończone",
  REJECTED: "Odrzucone",
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "–";

const formatPoints = (val?: number | null, mode?: string, maxPoints?: number) => {
  if (val == null) return "brak";
  return mode === "POINTS10" ? `${val}/${maxPoints ?? 10}` : `${val}%`;
};

const TeacherHeader = ({
  contrastMode,
  setContrastMode,
  notifications,
  notificationsOpen,
  onToggleNotifications,
  unreadCount,
}: {
  contrastMode: "normal" | "high1" | "high2";
  setContrastMode: (v: "normal" | "high1" | "high2") => void;
  notifications: string[];
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  unreadCount: number;
}) => (
  <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
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
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-2 py-[2px] text-[10px] font-bold text-white">
                {unreadCount}
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
    <div className="mx-auto max-w-6xl px-4 py-3 text-center text-xs font-semibold text-slate-600">
      Praca Maciej Mika WCY22IJ2N1
    </div>
  </footer>
);

export default function OcenianiePage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>("ALL");
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<number | null>(null);
  const [queue, setQueue] = useState<TeacherQueueEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TeacherQueueEntry | null>(null);
  const [gradeForm, setGradeForm] = useState({ points: "", status: "ACCEPTED", comment: "" });
  const [gradeScale, setGradeScale] = useState<"PERCENT" | "POINTS10">("PERCENT");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [contrastMode, setContrastMode] = useState<"normal" | "high1" | "high2">("normal");
  const feedbackFileInput = useRef<HTMLInputElement | null>(null);
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [uploadingFeedback, setUploadingFeedback] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [revisionCountByArtifact, setRevisionCountByArtifact] = useState<Record<string, number>>({});
  const [readTeacherNotifications, setReadTeacherNotifications] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("teacherNotificationsRead");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  const loadQueue = (preferred?: { artifactId?: number | null; studentId?: number | null }) => {
    if (!selectedGroup || !token) return;
    setLoadingQueue(true);
    apiFetch<TeacherQueueEntry[]>(
      `${API_URL}/api/grading-queue/teacher?courseId=${selectedGroup}`,
      token
    )
      .then((data) => {
        setQueue(data || []);
        const list = data || [];
        const byPreferred =
          preferred && preferred.artifactId && preferred.studentId
            ? list.find(
                (q) => q.artifactId === preferred.artifactId && q.studentId === preferred.studentId
              )
            : null;
        const firstSubmitted = list.find((q) => q.lastSubmittedAt);
        setSelectedEntry(byPreferred || firstSubmitted || list[0] || null);
        setMsg(null);
        // pobierz liczby rewizji dla etapów (etap = liczba rewizji)
        const counts: Record<string, number> = { ...revisionCountByArtifact };
        Promise.all(
          list.map(async (q) => {
            const key = `${q.artifactId}:${q.studentId}`;
            if (counts[key]) return;
            try {
              const hist = await fetch(
                `${API_URL}/api/revisions/artifact/${q.artifactId}/student/${q.studentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              ).then((r) => r.json());
              counts[key] = Array.isArray(hist) ? hist.length : 1;
            } catch {
              counts[key] = counts[key] || 1;
            }
          })
        ).then(() => setRevisionCountByArtifact(counts));
      })
      .catch(() => {
        setQueue([]);
        setSelectedEntry(null);
        setMsg("Nie udało się pobrać prac do ocenienia.");
      })
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => {
    if (!selectedGroup || !token) return;
    apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token)
      .then((data) => {
        setTasks(data || []);
        setSelectedTaskFilter(data && data.length ? data[0].id : null);
        setSelectedSessionFilter("ALL");
      })
      .catch(() => {
        setTasks([]);
        setSelectedTaskFilter(null);
        setSelectedSessionFilter("ALL");
      });
    loadQueue();
  }, [selectedGroup, token]);

  const loadHistory = (entry: TeacherQueueEntry) => {
    if (!entry.artifactId || !entry.studentId || !token) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    apiFetch<any[]>(
      `${API_URL}/api/revisions/artifact/${entry.artifactId}/student/${entry.studentId}`,
      token
    )
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  const sessionOptions = useMemo(
    () => Array.from(new Set(tasks.filter((t) => t.sessionName).map((t) => t.sessionName as string))),
    [tasks]
  );

  const tasksForDropdown = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedSessionFilter === "ALL") return true;
      if (selectedSessionFilter === "SINGLE") return !t.sessionName;
      return t.sessionName === selectedSessionFilter;
    });
  }, [tasks, selectedSessionFilter]);

  const filteredQueue = queue.filter((q) =>
    selectedTaskFilter ? q.taskId === selectedTaskFilter : true
  );
  const submittedEntries = filteredQueue.filter((q) => q.lastSubmittedAt);
  const waitingEntries = filteredQueue.filter((q) => !q.lastSubmittedAt);

  // Powiadomienia tylko dla prac w statusie SUBMITTED (oczekują na ocenę)
  const teacherNotifications = useMemo(() => {
    const pending = queue.filter((q) => q.lastRevisionStatus === "SUBMITTED");
    return pending.map((e) => {
      const key = `${e.artifactId}:${e.studentId}`;
      const stage = revisionCountByArtifact[key] || 1;
      return `Nowe oddanie od ${e.studentName || "Studenta"} do zadania ${e.taskTitle || ""} (Etap ${stage})`;
    });
  }, [queue, revisionCountByArtifact]);
  const unreadTeacherNotifications = teacherNotifications.filter((n) => !readTeacherNotifications.has(n));
  useEffect(() => {
    try {
      localStorage.setItem("teacherNotificationsRead", JSON.stringify(Array.from(readTeacherNotifications)));
    } catch {
      // ignore
    }
  }, [readTeacherNotifications]);
  useEffect(() => {
    if (notificationsOpen && unreadTeacherNotifications.length > 0) {
      setReadTeacherNotifications((prev) => {
        const next = new Set(prev);
        unreadTeacherNotifications.forEach((n) => next.add(n));
        return next;
      });
    }
  }, [notificationsOpen, unreadTeacherNotifications]);

  // Pozwalamy edytować także zaakceptowane rewizje (np. poprawa oceny).
  const canGrade = (entry: TeacherQueueEntry | null) => !!entry && !!entry.lastRevisionId;

  const currentTaskMode =
    selectedEntry ? tasks.find((t) => t.id === selectedEntry.taskId)?.gradingMode || "PERCENT" : "PERCENT";
  const currentTaskMax =
    selectedEntry && currentTaskMode === "POINTS10"
      ? tasks.find((t) => t.id === selectedEntry.taskId)?.maxPoints || 10
      : 100;
  const currentPassThreshold =
    selectedEntry && tasks.find((t) => t.id === selectedEntry.taskId)?.passThreshold != null
      ? tasks.find((t) => t.id === selectedEntry.taskId)?.passThreshold
      : null;

  const belowPassWarning = useMemo(() => {
    if (gradeForm.status !== "ACCEPTED") return false;
    if (currentPassThreshold == null) return false;
    const pts = Number(gradeForm.points || 0);
    return pts < currentPassThreshold;
  }, [gradeForm.points, gradeForm.status, currentPassThreshold]);

  // Liczymy spóźnienie tylko dla pierwszej przesłanej pracy (pierwsza rewizja), kolejne poprawki nie dodają spóźnienia.
  const firstSubmissionDate = useMemo(() => {
    if (!history || history.length === 0) return null;
    const sorted = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return sorted[0]?.createdAt ? new Date(sorted[0].createdAt) : null;
  }, [history]);

  const latePercentInfo = useMemo(() => {
    if (!firstSubmissionDate || !selectedEntry?.softDeadline || !selectedEntry.hardDeadline) return null;
    const soft = new Date(selectedEntry.softDeadline).getTime();
    const hard = new Date(selectedEntry.hardDeadline).getTime();
    const submitted = firstSubmissionDate.getTime();
    if (submitted <= soft || hard <= soft) return 0;
    if (submitted >= hard) return 100;
    const ratio = ((submitted - soft) / (hard - soft)) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  }, [firstSubmissionDate, selectedEntry]);

  const lateBadge = useMemo(() => {
    if (!selectedEntry?.lastSubmittedAt) {
      return { label: "Praca nie oddana", className: "bg-amber-100 text-amber-800" };
    }
    if (latePercentInfo != null && latePercentInfo > 0) {
      return {
        label: `Oddano po terminie (${latePercentInfo}% między preferowanym a ostatecznym)`,
        className: "bg-rose-100 text-rose-800",
      };
    }
    return { label: "Oddano w terminie", className: "bg-emerald-100 text-emerald-800" };
  }, [latePercentInfo, selectedEntry]);

  const handleSelectEntry = (entry: TeacherQueueEntry) => {
    setSelectedEntry(entry);
    const taskMode = tasks.find((t) => t.id === entry.taskId)?.gradingMode;
    setGradeScale(taskMode === "POINTS10" ? "POINTS10" : "PERCENT");
    setGradeForm({
      points: entry.lastPointsBrutto != null ? entry.lastPointsBrutto.toString() : "",
      status: entry.lastRevisionStatus === "NEEDS_FIX" ? "NEEDS_FIX" : "ACCEPTED",
      comment: "",
    });
    setFeedbackFile(null);
    if (feedbackFileInput.current) feedbackFileInput.current.value = "";
    loadHistory(entry);
  };

  const handleFeedbackUpload = async (revisionId: number) => {
    if (!feedbackFile || !token) return;
    setUploadingFeedback(true);
    try {
      const presignRes = await fetch(`${API_URL}/api/storage/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "revision-feedback",
          originalFileName: feedbackFile.name,
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const presign = await presignRes.json();
      await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": feedbackFile.type || "application/octet-stream" },
        body: feedbackFile,
      });
      const addRes = await fetch(`${API_URL}/api/revisions/${revisionId}/feedback-materials`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileKey: presign.fileKey, originalFileName: feedbackFile.name }),
      });
      if (!addRes.ok) throw new Error(await addRes.text());
      setMsg("Dołączono plik do zwrotki.");
      setFeedbackFile(null);
      if (feedbackFileInput.current) feedbackFileInput.current.value = "";
    } finally {
      setUploadingFeedback(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedEntry || !token) return;
    if (!selectedEntry.lastRevisionId) {
      setMsg("Brak rewizji do oceny - poproś studenta o przesłanie pracy.");
      return;
    }
    if (!canGrade(selectedEntry)) {
      setMsg("Ta rewizja jest już zakończona (zaakceptowana/odrzucona).");
      return;
    }
    try {
      setMsg("Wysyłam ocenę...");
      if (belowPassWarning) {
        const ok = window.confirm(
          "Akceptujesz pracę z punktacją poniżej progu zaliczenia. Kontynuować?"
        );
        if (!ok) {
          setMsg("Anulowano zapis oceny.");
          return;
        }
      }
      if (gradeForm.status === "NEEDS_FIX" && feedbackFile) {
        await handleFeedbackUpload(selectedEntry.lastRevisionId);
      }
      const pointsValue = Number(gradeForm.points || 0);
      const res = await fetch(`${API_URL}/api/grades`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          revisionId: selectedEntry.lastRevisionId,
          points: pointsValue,
          comment: gradeForm.comment || null,
          statusAfterGrade: gradeForm.status,
          // kara punktowa ma być tylko informacyjna – zawsze pomijamy
          skipPenalty: true,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }
      setMsg("Ocena zapisana. Odświeżam listę...");
      loadQueue({ artifactId: selectedEntry.artifactId, studentId: selectedEntry.studentId });
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const ready = useMemo(() => !!token && profile?.role === "TEACHER", [token, profile]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-sm text-slate-700">Zaloguj się jako nauczyciel, aby oceniać.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherHeader
        contrastMode={contrastMode}
        setContrastMode={setContrastMode}
        notifications={teacherNotifications}
        notificationsOpen={notificationsOpen}
        onToggleNotifications={() => setNotificationsOpen((v) => !v)}
        unreadCount={unreadTeacherNotifications.length}
      />
      <div className="mx-auto max-w-7xl px-5 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Ocena prac</p>
          <h1 className="text-2xl font-bold text-slate-900">Panel oceniania</h1>
          <p className="text-sm text-slate-600 mt-1">Logika bez zmian: wybierz grupę, filtruj zadania, oceń.</p>
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
        <p className="text-sm text-slate-700">Wybierz grupę, aby oceniać prace.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-4">
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-700">Tryb</label>
            <select
              value={selectedSessionFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSessionFilter(val);
                const first = tasks.filter((t) => {
                  if (val === "ALL") return true;
                  if (val === "SINGLE") return !t.sessionName;
                  return t.sessionName === val;
                })[0];
                setSelectedTaskFilter(first ? first.id : null);
              }}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs"
            >
              <option value="ALL">Wszystkie</option>
              <option value="SINGLE">Zadania pojedyncze</option>
              {sessionOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold text-slate-700">Zadanie</label>
            <select
              value={selectedTaskFilter ?? ""}
              onChange={(e) => setSelectedTaskFilter(e.target.value ? Number(e.target.value) : null)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs"
            >
              {tasksForDropdown.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.sessionName ? `${t.sessionName} · ${t.title}` : t.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadQueue()}
              className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Odśwież
            </button>
          </div>

          {loadingQueue ? (
            <p className="mt-3 text-sm text-slate-600">Ładowanie prac...</p>
          ) : queue.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              Brak prac w kolejce dla tej grupy. Upewnij się, że zadanie ma etap i formę zwrotu, oraz że studenci są przypisani.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">✅ Oddane prace</h4>
                <div className="mt-2 space-y-2">
                  {submittedEntries.length === 0 ? (
                    <p className="text-sm text-slate-600">Nikt jeszcze nie złożył pracy.</p>
                  ) : (
                    submittedEntries.map((e) => (
                      <button
                        key={`${e.artifactId}-${e.studentId}`}
                        onClick={() => handleSelectEntry(e)}
                        className={`w-full rounded-md border px-3 py-3 text-left text-sm shadow-sm transition ${
                          selectedEntry?.artifactId === e.artifactId && selectedEntry?.studentId === e.studentId
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-indigo-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {e.studentName || "Student"} ({e.albumNumber || "brak albumu"})
                          </span>
                          <span className="text-xs font-semibold text-indigo-700">
                            {statusLabel[e.lastRevisionStatus || "SUBMITTED"] || "Złożone"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">Złożone: {formatDate(e.lastSubmittedAt)}</p>
                        <p className="text-xs text-slate-600">
                          Kara: {e.penaltyPercentApplied != null ? `${e.penaltyPercentApplied}%` : "0%"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800">⌛ Jeszcze nie oddali</h4>
                <div className="mt-2 space-y-2">
                  {waitingEntries.length === 0 ? (
                    <p className="text-sm text-slate-600">Wszyscy już coś złożyli.</p>
                  ) : (
                    waitingEntries.map((e) => (
                      <div
                        key={`${e.artifactId}-${e.studentId}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectEntry(e)}
                        onKeyDown={(ev) => ev.key === "Enter" && handleSelectEntry(e)}
                        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {e.studentName || "Student"} ({e.albumNumber || "brak albumu"})
                          </span>
                          <span className="text-xs text-slate-600">Brak przesłanej pracy</span>
                        </div>
                        <p className="text-xs text-slate-600">Termin preferowany: {formatDate(e.softDeadline)}</p>
                        <p className="text-xs text-slate-600">Termin ostateczny: {formatDate(e.hardDeadline)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedEntry && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedEntry.studentName || "Student"} ({selectedEntry.albumNumber || "brak albumu"})
                  </p>
                  <p className="text-xs text-slate-600">
                    Status: {statusLabel[selectedEntry.lastRevisionStatus || "SUBMITTED"]}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedEntry.taskTitle || "Zadanie"} · Etap {revisionCountByArtifact[`${selectedEntry.artifactId}:${selectedEntry.studentId}`] || 1} ·{" "}
                    {selectedEntry.artifactName || "Forma zwrotu"}
                  </p>
                </div>
                <div className="text-xs text-slate-600 text-right">
                  <p>Termin preferowany: {formatDate(selectedEntry.softDeadline)}</p>
                  <p>Termin ostateczny: {formatDate(selectedEntry.hardDeadline)}</p>
                </div>
              </div>

              <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
                <p>
                  Termin preferowany = bez kary. Termin ostateczny = po nim zadanie się zamyka. Kara punktowa jest tylko
                  informacyjna – punkty brutto wpisuje nauczyciel, system nie odejmuje automatycznie.
                </p>
                {latePercentInfo != null ? (
                  <p>
                    Oddano po terminie preferowanym: {latePercentInfo}% czasu między preferowanym a ostatecznym
                    ({formatDate(selectedEntry.softDeadline)} → {formatDate(selectedEntry.hardDeadline)}).
                  </p>
                ) : null}
                <p>
                  Punkty procentowe (tryb %): skala 0-100%. Punkty (tryb punktowy 1-x): skala 1-{currentTaskMax}.
                </p>
                <p>
                  {currentPassThreshold != null
                    ? `Próg zaliczenia zadania: ${
                        currentTaskMode === "POINTS10" ? `${currentPassThreshold}/${currentTaskMax}` : `${currentPassThreshold}%`
                      }.`
                    : "Próg zaliczenia zadania: nie ustawiono."}
                </p>
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">Punkty wpisane (ostatnie)</p>
                  <p className="font-semibold text-slate-900">
                    {selectedEntry.lastPointsBrutto != null ? selectedEntry.lastPointsBrutto : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">Punkty informacyjne (po karze)</p>
                  <p className="font-semibold text-slate-900">
                    {selectedEntry.lastPointsNetto != null ? selectedEntry.lastPointsNetto : "—"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">Kara za spóźnienie</p>
                  <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${lateBadge.className}`}>
                    {lateBadge.label}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {currentTaskMode === "POINTS10"
                      ? `Ocena punktowa (1-${currentTaskMax || 10})`
                      : "Punktacja procentowa (1-100)"}
                  </label>
                  <input
                    type="number"
                    min={currentTaskMode === "POINTS10" ? 0 : 0}
                    max={currentTaskMode === "POINTS10" ? currentTaskMax : 100}
                    value={gradeForm.points}
                    onChange={(e) => setGradeForm((f) => ({ ...f, points: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                      {currentTaskMode === "POINTS10" ? `Skala 1-${currentTaskMax || 10}` : "Skala 1-100%"}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Kary są tylko informacyjne – punkty wpisuje nauczyciel.
                    </span>
                    {belowPassWarning && (
                      <span className="rounded-md bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                        Poniżej progu: zaakceptujesz mimo braku zaliczenia
                      </span>
                    )}
                  </div>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="statusSelect">
                      Status pracy
                    </label>
                    <select
                      id="statusSelect"
                      value={gradeForm.status}
                      onChange={(e) => setGradeForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="ACCEPTED">Zakończ (zaakceptuj)</option>
                      <option value="NEEDS_FIX">Pozwól na poprawę</option>
                      <option value="REJECTED">Odrzuć</option>
                    </select>
                  </div>
                  {(selectedEntry?.lastRevisionStatus === "ACCEPTED" ||
                    selectedEntry?.lastRevisionStatus === "REJECTED") && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        className="rounded-md border border-indigo-200 px-3 py-1 font-semibold text-indigo-700 hover:bg-indigo-50"
                        onClick={() => setGradeForm((f) => ({ ...f, status: "ACCEPTED" }))}
                      >
                        Edytuj ocenę (pozostaw zakończone)
                      </button>
                      <button
                        className="rounded-md border border-amber-200 px-3 py-1 font-semibold text-amber-700 hover:bg-amber-50"
                        onClick={() => setGradeForm((f) => ({ ...f, status: "NEEDS_FIX" }))}
                      >
                        Wyślij do poprawy
                      </button>
                    </div>
                  )}
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Komentarz dla studenta
                  </label>
                  <input
                    type="text"
                    value={gradeForm.comment}
                    onChange={(e) => setGradeForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Co poprawić / uzasadnienie"
                  />
                </div>
              </div>

              {gradeForm.status === "NEEDS_FIX" && canGrade(selectedEntry) && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    ref={feedbackFileInput}
                    type="file"
                    className="hidden"
                    onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                    aria-label="Załącz plik do poprawy"
                  />
                  <button
                    onClick={() => feedbackFileInput.current?.click()}
                    className="rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200"
                    disabled={uploadingFeedback}
                  >
                    Załącz plik do poprawy (opcjonalnie)
                  </button>
                  {feedbackFile ? (
                    <span className="text-slate-600">
                      {feedbackFile.name} ({Math.round(feedbackFile.size / 1024)} KB)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Plik zostanie wysłany razem z „Wyślij pracę do poprawy”.
                    </span>
                  )}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGrade}
                  disabled={!canGrade(selectedEntry) || uploadingFeedback}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {gradeForm.status === "NEEDS_FIX" ? "Wyślij pracę do poprawy" : "Zapisz ocenę"}
                </button>
                {!canGrade(selectedEntry) && (
                  <p className="text-xs text-slate-600">
                    Ta rewizja jest już zakończona lub brak przesłanej pracy.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800">Historia oddań</h4>
                {loadingHistory ? (
                  <p className="text-xs text-slate-600">Ładowanie historii...</p>
                ) : history && history.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {history.map((h) => (
                      <div key={h.revisionId ?? h.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`font-semibold px-2 py-1 rounded ${
                              h.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : h.status === "NEEDS_FIX"
                                ? "bg-amber-100 text-amber-800"
                                : h.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {statusLabel[h.status] || h.status}
                          </span>
                          <span className="text-slate-500">{formatDate(h.createdAt)}</span>
                        </div>
                        {h.comment ? <p className="text-slate-700">Opis: {h.comment}</p> : null}
                        <p className="text-slate-700">
                          Student przesłał: {h.originalFileName} · Rozmiar: {h.sizeBytes ?? 0} B{" "}
                          {h.downloadUrl ? (
                            <a
                              href={h.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-700 font-semibold hover:underline"
                            >
                              Pobierz
                            </a>
                          ) : null}
                        </p>
                        {h.grades && h.grades.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {h.grades.map((g: any) => (
                              <div key={g.gradeId} className="rounded bg-slate-50 px-2 py-1">
                                <span className="font-semibold text-slate-900">
                                  {g.pointsBrutto != null ? `${formatPoints(g.pointsBrutto, currentTaskMode, currentTaskMax)} (wpisane)` : "—"}
                                </span>
                                {g.pointsNetto != null ? (
                                  <span className="text-slate-700">
                                    {" "}
                                    → {formatPoints(g.pointsNetto, currentTaskMode, currentTaskMax)} (po karze, info)
                                  </span>
                                ) : null}
                                <span className="text-slate-500"> · {statusLabel[g.statusAfterGrade] || g.statusAfterGrade}</span>
                                {g.comment ? <span className="text-slate-700"> · {g.comment}</span> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">Brak ocen dla tej rewizji.</p>
                        )}
                        {h.feedbackMaterials && h.feedbackMaterials.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-700">Wysłano do studenta:</p>
                            {h.feedbackMaterials.map((f: any) => (
                              <a
                                key={f.id}
                                href={f.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-700 hover:underline"
                              >
                                {f.originalFileName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">Brak historii oddań.</p>
                )}
              </div>
            </div>
          )}
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

