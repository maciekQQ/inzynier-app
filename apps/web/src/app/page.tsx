 "use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "./lib/api";
import { Toast } from "./components/Toast";

type LoginState = {
  email: string;
  password: string;
};

type Profile = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  albumNumber?: string;
  groupName?: string;
};

type ClassGroup = { id: number; name: string; studentCount?: number; teacherCount?: number };
type Task = {
  id: number;
  title: string;
  description?: string;
  sessionName?: string;
  sessionId?: number;
  gradingMode?: string;
  endDate?: string;
  startDate?: string;
  maxPoints?: number;
  passThreshold?: number | null;
};
type Stage = { id: number; name: string; weightPercent: number };
type TaskMaterial = { id: number; taskId: number; fileKey: string; originalFileName: string; downloadUrl: string };
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

const formatPoints = (val?: number | null, mode?: string, maxPoints?: number) => {
  if (val == null) return "brak";
  return mode === "POINTS10" ? `${val}/${maxPoints ?? 10}` : `${val}%`;
};
const gradingLabel = (mode?: string, maxPoints?: number) =>
  mode === "POINTS10" ? `Ocena punktowa (1-${maxPoints || 10})` : "Punktacja procentowa (1-100)";

type AdminUserForm = {
  email: string;
  password: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  firstName: string;
  lastName: string;
};

export default function Home() {
  const [health, setHealth] = useState<string>("checking…");
  const [loginState, setLoginState] = useState<LoginState>({
    email: "admin@example.com",
    password: "admin123",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fontScale, setFontScale] = useState<number>(100);
  const [contrastMode, setContrastMode] = useState<"normal" | "high1" | "high2">("normal");

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => setHealth(data.status ?? "ok"))
      .catch(() => setHealth("offline"));
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.classList.remove("contrast-high1", "contrast-high2");
    if (contrastMode === "high1") document.documentElement.classList.add("contrast-high1");
    if (contrastMode === "high2") document.documentElement.classList.add("contrast-high2");
  }, [contrastMode]);

  const changeFont = (delta: number) => {
    setFontScale((v) => Math.min(140, Math.max(80, v + delta)));
  };

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      setToken(saved);
      fetch(`${API_URL}/api/auth/me`, {
        method: "POST",
        headers: { Authorization: `Bearer ${saved}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
        .then((data) => setProfile(data))
        .catch(() => {
          setToken(null);
          localStorage.removeItem("token");
        });
    }
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginState),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem("token", data.token);
      setProfile(data.profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setToken(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem("token");
  };

  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<ClassGroup[]>([]);

  useEffect(() => {
    if (!token) return;
    const savedGroup = localStorage.getItem("selectedGroup");
    if (savedGroup) setSelectedGroup(Number(savedGroup));
  }, [token]);

  useEffect(() => {
    if (!token || !profile || profile.role !== "TEACHER") return;
    apiFetch<ClassGroup[]>(`${API_URL}/api/teacher/class-groups`, token)
      .then((data) => {
        setTeacherGroups(data || []);
        if (!selectedGroup && data && data.length) {
          setSelectedGroup(data[0].id);
          localStorage.setItem("selectedGroup", String(data[0].id));
        }
      })
      .catch(() => setTeacherGroups([]));
  }, [token, profile]);

  useEffect(() => {
    if (selectedGroup) {
      localStorage.setItem("selectedGroup", String(selectedGroup));
    }
  }, [selectedGroup]);

  const content = useMemo(() => {
    if (!profile || !token) return null;
    if (profile.role === "TEACHER") {
      return <TeacherHomeLinks />;
    }
    if (profile.role === "STUDENT") {
      return <StudentView token={token} profile={profile} />;
    }
    return <AdminView token={token} />;
  }, [profile, token]);

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Panel dydaktyczny
            </h1>
            <p className="text-sm text-slate-600">Zaloguj się, aby korzystać z panelu.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap" aria-live="polite">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                health === "ok"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  health === "ok" ? "bg-emerald-500" : "bg-amber-500"
                }`}
                aria-hidden
              />
              {health === "ok" ? "API online" : "API offline"}
            </span>
            <div className="flex items-center gap-1" aria-label="Zmiana kontrastu">
              <button
                onClick={() => setContrastMode("normal")}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  contrastMode === "normal" ? "bg-slate-300 text-slate-900" : "bg-slate-100 text-slate-700"
                }`}
              >
                Normalny
              </button>
              <button
                onClick={() => setContrastMode("high1")}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  contrastMode === "high1" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Kontrast 1
              </button>
              <button
                onClick={() => setContrastMode("high2")}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  contrastMode === "high2" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Kontrast 2
              </button>
            </div>
            <div className="flex items-center gap-1" aria-label="Regulacja wielkości czcionki">
              <button
                onClick={() => changeFont(-10)}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                A-
              </button>
              <button
                onClick={() => changeFont(10)}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                A+
              </button>
            </div>
            {profile?.role === "TEACHER" && (
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-slate-700">Grupa</label>
                <select
                  value={selectedGroup ?? ""}
                  onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">-- wybierz --</option>
                  {teacherGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.studentCount || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {token && profile ? (
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {profile.firstName} {profile.lastName} · {profile.role}
                <button
                  onClick={logout}
                  className="text-indigo-600 hover:underline"
                  aria-label="Wyloguj"
                >
                  Wyloguj
                </button>
              </div>
            ) : null}
          </div>
        </div>
        </div>

        <div className="mx-auto w-full max-w-screen-xl px-6 py-6 space-y-4 flex flex-col items-center">
          {!token || !profile ? (
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <form
                className="flex flex-col gap-4"
                onSubmit={onSubmit}
                aria-label="Formularz logowania"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    aria-label="Email"
                    autoComplete="email"
                    required
                    value={loginState.email}
                    onChange={(e) =>
                      setLoginState((state) => ({
                        ...state,
                        email: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Hasło
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    aria-label="Hasło"
                    autoComplete="current-password"
                    required
                    value={loginState.password}
                    onChange={(e) =>
                      setLoginState((state) => ({
                        ...state,
                        password: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {loading ? "Logowanie..." : "Zaloguj"}
                </button>
                {error ? (
                  <p
                    className="text-sm font-medium text-rose-700"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            </div>
          ) : (
            <div className="mb-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-700">
                Zalogowano jako{" "}
                <span className="font-semibold">
                  {profile.firstName} {profile.lastName}
                </span>{" "}
                ({profile.role})
              </p>
            </div>
          )}

          <div className="w-full">
            {content ? (
              content
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Zaloguj się, aby zobaczyć dane.
              </p>
            )}
          </div>
        </div>
      </div>
    <style jsx global>{`
      .contrast-high1 body {
        filter: invert(1) hue-rotate(180deg);
        background: #000 !important;
      }
      .contrast-high2 body {
        background: #000 !important;
        color: #ffd800 !important;
      }
      .contrast-high2 a,
      .contrast-high2 button,
      .contrast-high2 input,
      .contrast-high2 select,
      .contrast-high2 textarea {
        color: #ffd800 !important;
        border-color: #ffd800 !important;
        background: #111 !important;
      }
      .contrast-high2 .bg-white,
      .contrast-high2 .bg-slate-50,
      .contrast-high2 .bg-slate-100,
      .contrast-high2 .bg-indigo-600,
      .contrast-high2 .bg-emerald-100,
      .contrast-high2 .bg-amber-100,
      .contrast-high2 .bg-rose-100,
      .contrast-high2 .bg-indigo-50 {
        background: #111 !important;
        color: #ffd800 !important;
      }
      .contrast-high2 .text-slate-900,
      .contrast-high2 .text-slate-800,
      .contrast-high2 .text-slate-700,
      .contrast-high2 .text-slate-600,
      .contrast-high2 .text-slate-500 {
        color: #ffd800 !important;
      }
    `}</style>
    </>
  );
}

function AdminView({ token }: { token: string }) {
  const [userForm, setUserForm] = useState<AdminUserForm>({
    email: "",
    password: "",
    role: "TEACHER",
    firstName: "",
    lastName: "",
  });
  const [groupForm, setGroupForm] = useState({ name: "" });
  const [taskForm, setTaskForm] = useState({
    courseId: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [assignTeacherForm, setAssignTeacherForm] = useState({
    groupId: "",
    teacherId: "",
  });
  const [assignStudentForm, setAssignStudentForm] = useState({
    groupId: "",
    studentId: "",
    albumNumber: "",
  });
  const [csvForm, setCsvForm] = useState({
    groupId: "",
    csv: "albumNumber,firstName,lastName,email\nA100,Jan,Student,jan.student@example.com",
  });
  const [msg, setMsg] = useState<string | null>(null);
  
  // Listy rozwijane
  const [allGroups, setAllGroups] = useState<ClassGroup[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  useEffect(() => {
    // Pobierz listę grup zajęciowych
    fetch(`${API_URL}/api/admin/class-groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAllGroups(data))
      .catch(() => {});

    // Pobierz listę prowadzących
    fetch(`${API_URL}/api/admin/class-groups/available-teachers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAllTeachers(data))
      .catch(() => {});
    
    // Pobierz listę studentów
    fetch(`${API_URL}/api/admin/class-groups/available-students`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAllStudents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  const postJson = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json().catch(() => ({}));
  };

  const handleCreateUser = async () => {
    try {
      setMsg("Tworzenie użytkownika...");
      await postJson(`${API_URL}/api/admin/users`, userForm);
      setMsg("Utworzono użytkownika.");
      // Odśwież listy jeśli utworzono studenta lub nauczyciela
      if (userForm.role === "TEACHER") {
        const teachers = await fetch(`${API_URL}/api/admin/class-groups/available-teachers`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        setAllTeachers(teachers);
      } else if (userForm.role === "STUDENT") {
        const students = await fetch(`${API_URL}/api/admin/class-groups/available-students`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        setAllStudents(students);
      }
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setMsg("Tworzenie grupy zajęciowej...");
      await postJson(`${API_URL}/api/admin/class-groups`, groupForm);
      setMsg("Utworzono grupę zajęciową.");
      // Odśwież listę grup
      const groups = await fetch(`${API_URL}/api/admin/class-groups`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setAllGroups(groups);
      setGroupForm({ name: "" });
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const handleCreateTask = async () => {
    try {
      setMsg("Tworzenie zadania...");
      if (!taskForm.courseId) {
        throw new Error("Wybierz grupę (courseId)");
      }
      await postJson(`${API_URL}/api/course/tasks`, {
        courseId: taskForm.courseId,
        title: taskForm.title,
        description: taskForm.description,
        startDate: taskForm.startDate,
        endDate: taskForm.endDate,
      });
      setMsg("Utworzono zadanie.");
      setTaskForm({ courseId: "", title: "", description: "", startDate: "", endDate: "" });
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const handleAssignTeacher = async () => {
    try {
      setMsg("Przypisywanie prowadzącego...");
      await postJson(
        `${API_URL}/api/admin/class-groups/${assignTeacherForm.groupId}/teachers/${assignTeacherForm.teacherId}`,
        {}
      );
      setMsg("Przypisano prowadzącego do grupy.");
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const handleAssignStudent = async () => {
    try {
      setMsg("Przypisywanie studenta...");
      await postJson(
        `${API_URL}/api/admin/class-groups/${assignStudentForm.groupId}/students/${assignStudentForm.studentId}`,
        { albumNumber: assignStudentForm.albumNumber }
      );
      setMsg("Przypisano studenta do grupy.");
      // Odśwież listę studentów
      const students = await fetch(`${API_URL}/api/admin/class-groups/available-students`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setAllStudents(Array.isArray(students) ? students : []);
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const handleImportCsv = async () => {
    try {
      setMsg("Import CSV...");
      const res = await fetch(
        `${API_URL}/api/admin/class-groups/${csvForm.groupId}/students/import-csv`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain"
          },
          body: csvForm.csv,
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const results = await res.json();
      const successCount = results.filter((r: any) => r.status === "ok").length;
      setMsg(`Zaimportowano ${successCount} z ${results.length} studentów.`);
      // Odśwież listę studentów
      const students = await fetch(`${API_URL}/api/admin/class-groups/available-students`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setAllStudents(Array.isArray(students) ? students : []);
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">👤 Utwórz użytkownika</h2>
        <p className="mt-1 text-xs text-slate-600">Dodaj nowego admina, prowadzącego lub studenta.</p>
        <div className="mt-3 space-y-2 text-sm">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Email"
            value={userForm.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Hasło"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
          />
          <div className="flex gap-2">
            <select
              className="w-1/3 rounded border px-3 py-2"
              value={userForm.role}
              onChange={(e) =>
                setUserForm((f) => ({
                  ...f,
                  role: e.target.value as "ADMIN" | "TEACHER" | "STUDENT",
                }))
              }
            >
              <option value="ADMIN">🔑 Admin</option>
              <option value="TEACHER">👨‍🏫 Prowadzący</option>
              <option value="STUDENT">🎓 Student</option>
            </select>
            <input
              className="w-1/3 rounded border px-3 py-2"
              placeholder="Imię"
              value={userForm.firstName}
              onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <input
              className="w-1/3 rounded border px-3 py-2"
              placeholder="Nazwisko"
              value={userForm.lastName}
              onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <button
            onClick={handleCreateUser}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Utwórz użytkownika
          </button>
        </div>
      </div>

      {/* Tworzenie zadania */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
        <h2 className="text-sm font-semibold text-slate-800">📝 Utwórz zadanie</h2>
        <p className="mt-1 text-xs text-slate-600">Po wybraniu grupy utwórz zadanie z datami.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-5 text-sm">
          <select
            className="w-full rounded border px-3 py-2"
            value={taskForm.courseId}
            onChange={(e) => setTaskForm((f) => ({ ...f, courseId: e.target.value }))}
          >
            <option value="">-- Wybierz grupę --</option>
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Tytuł zadania"
            value={taskForm.title}
            onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Opis"
            value={taskForm.description}
            onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="w-full rounded border px-3 py-2"
            value={taskForm.startDate}
            onChange={(e) => setTaskForm((f) => ({ ...f, startDate: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="w-full rounded border px-3 py-2"
            value={taskForm.endDate}
            onChange={(e) => setTaskForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
        <div className="mt-3">
          <button
            onClick={handleCreateTask}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Utwórz zadanie
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">📚 Utwórz grupę zajęciową</h2>
        <p className="mt-1 text-xs text-slate-600">Nazwa grupy (np. 4ABW3CII)</p>
        <div className="mt-3 space-y-2 text-sm">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nazwa grupy zajęciowej (np. 4ABW3CII)"
            value={groupForm.name}
            onChange={(e) => setGroupForm({ name: e.target.value })}
          />
          <button
            onClick={handleCreateGroup}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Utwórz grupę zajęciową
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">🔗 Przypisz prowadzącego</h2>
        <p className="mt-1 text-xs text-slate-600">Wybierz grupę i prowadzącego.</p>
        <div className="mt-3 space-y-2 text-sm">
          <select
            className="w-full rounded border px-3 py-2"
            value={assignTeacherForm.groupId}
            onChange={(e) => setAssignTeacherForm((f) => ({ ...f, groupId: e.target.value }))}
          >
            <option value="">-- Wybierz grupę zajęciową --</option>
            {allGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={assignTeacherForm.teacherId}
            onChange={(e) => setAssignTeacherForm((f) => ({ ...f, teacherId: e.target.value }))}
          >
            <option value="">-- Wybierz prowadzącego --</option>
            {allTeachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName} ({t.groups && t.groups.length > 0 ? t.groups.join(", ") : "brak grup"})
              </option>
            ))}
          </select>
          <button
            onClick={handleAssignTeacher}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Przypisz prowadzącego
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800">👤 Przypisz studenta do grupy</h2>
        <p className="mt-1 text-xs text-slate-600">Wybierz grupę i studenta.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            <select
              className="w-full rounded border px-3 py-2"
              value={assignStudentForm.groupId}
              onChange={(e) => setAssignStudentForm((f) => ({ ...f, groupId: e.target.value }))}
            >
              <option value="">-- Wybierz grupę zajęciową --</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded border px-3 py-2"
              value={assignStudentForm.studentId}
              onChange={(e) => setAssignStudentForm((f) => ({ ...f, studentId: e.target.value }))}
            >
              <option value="">-- Wybierz studenta --</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.group})
                </option>
              ))}
            </select>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Numer albumu (np. A100)"
              value={assignStudentForm.albumNumber}
              onChange={(e) => setAssignStudentForm((f) => ({ ...f, albumNumber: e.target.value }))}
            />
            <button
              onClick={handleAssignStudent}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Przypisz studenta
            </button>
          </div>
          <div className="rounded border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold">💡 Jak to działa?</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Wybierz grupę zajęciową (np. 4ABW3CII)</li>
              <li>Wybierz studenta z listy - w nawiasie jest nazwa jego grupy lub &quot;brak grupy&quot;</li>
              <li>Podaj numer albumu (np. A100)</li>
              <li>Kliknij &quot;Przypisz studenta&quot;</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
        <h2 className="text-sm font-semibold text-slate-800">📥 Import studentów (CSV)</h2>
        <p className="mt-1 text-xs text-slate-600">Prześlij listę studentów w formacie CSV.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="space-y-2 text-sm">
            <select
              className="w-full rounded border px-3 py-2"
              value={csvForm.groupId}
              onChange={(e) => setCsvForm((f) => ({ ...f, groupId: e.target.value }))}
            >
              <option value="">-- Wybierz grupę zajęciową --</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600">
              Format CSV:<br/>
              <span className="font-mono bg-slate-100 px-2 py-1 rounded text-[11px] block mt-1">
                albumNumber,firstName,lastName,email
              </span>
              <span className="font-mono bg-slate-100 px-2 py-1 rounded text-[11px] block mt-1">
                A100,Jan,Kowalski,jan.k@example.com
              </span>
            </p>
            <button
              onClick={handleImportCsv}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Importuj CSV
            </button>
          </div>
          <div className="lg:col-span-2">
            <textarea
              className="min-h-[200px] w-full rounded border px-3 py-2 text-sm font-mono"
              value={csvForm.csv}
              onChange={(e) => setCsvForm((f) => ({ ...f, csv: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 lg:col-span-3">
        <p className="font-semibold">Podpowiedzi</p>
        <div className="mt-1 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <p>Health: /api/health</p>
          <p>Auth: /api/auth/login, /api/auth/me</p>
          <p>Grupy: /api/admin/class-groups</p>
          <p>Przypisywanie: POST .../class-groups/{`{id}`}/teachers/{`{id}`}</p>
        </div>
        {msg ? <p className="mt-2 text-xs text-emerald-900">Status: {msg}</p> : null}
      </div>
      {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}

function TeacherHomeLinks() {
  const links = [
    { href: "/zadania", label: "Zadania (tworzenie)" },
    { href: "/przypisywanie", label: "Przypisywanie zadań" },
    { href: "/ocenianie", label: "Panel oceniania" },
    { href: "/materialy", label: "Edycja zadań" },
    { href: "/usuwanie", label: "Usuwanie zadań" },
    { href: "/eksport", label: "Eksport / archiwum" },
    { href: "/statystyki", label: "Statystyki" },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Nauczyciel</p>
        <h1 className="text-xl font-bold text-slate-900">Przejdź do modułu</h1>
        <p className="text-sm text-slate-600 mt-1">
          Wybierz sekcję, aby tworzyć, przypisywać, oceniać i edytować zadania. Ustawienia grup są dostępne na dedykowanych podstronach.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-indigo-700">{l.label}</p>
            <p className="text-xs text-slate-600">Przejdź do: {l.href}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function TeacherView({
  token,
  selectedGroup,
  onChangeGroup,
  groups,
}: {
  token: string;
  selectedGroup: number | null;
  onChangeGroup: (id: number | null) => void;
  groups: ClassGroup[];
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<number | null>(null);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>("ALL");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    soft: "",
    hard: "",
  });
  const [materials, setMaterials] = useState<TaskMaterial[]>([]);
  const fileInputTeacher = useRef<HTMLInputElement | null>(null);
  const feedbackFileInput = useRef<HTMLInputElement | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [newSession, setNewSession] = useState({
    name: "",
    type: "LAB",
    tasksCount: 1,
    gradingMode: "PERCENT",
    soft: "",
    hard: "",
  });
  const [sessionTasks, setSessionTasks] = useState<
    Array<{
      title: string;
      description: string;
      soft: string;
      hard: string;
      gradingMode: "PERCENT" | "POINTS10";
      material?: { fileKey: string; originalFileName: string };
    }>
  >([{ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT" }]);
  const [sessionTasksPage, setSessionTasksPage] = useState(0);
  const [queue, setQueue] = useState<TeacherQueueEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TeacherQueueEntry | null>(null);
  const [gradeForm, setGradeForm] = useState({ points: "", status: "ACCEPTED", comment: "", skipPenalty: false });
  const [gradeScale, setGradeScale] = useState<"PERCENT" | "POINTS10">("PERCENT");
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [history, setHistory] = useState<any[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [uploadingFeedback, setUploadingFeedback] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(true);
  const [showGradingPanel, setShowGradingPanel] = useState(true);
  const [showSessionCreator, setShowSessionCreator] = useState(true);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGroup) return;
    apiFetch<any[]>(`${API_URL}/api/teacher/class-groups/${selectedGroup}/students`, token)
      .then(setStudents)
      .catch(() => setStudents([]));
    apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token)
      .then((data) => {
        setTasks(data || []);
        setSelectedTask(data && data.length ? data[0].id : null);
        setSelectedTaskFilter(data && data.length ? data[0].id : null);
        setSelectedSessionFilter("ALL");
        setDeleteSelection([]);
      })
      .catch(() => {
        setTasks([]);
        setSelectedTask(null);
        setSelectedTaskFilter(null);
        setSelectedSessionFilter("ALL");
        setDeleteSelection([]);
      });
    setSelectedStudents([]);
    setSessionTasks([{ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT" }]);
    setSessionTasksPage(0);
  }, [selectedGroup, token]);

  useEffect(() => {
    if (!selectedTask) {
      setMaterials([]);
      return;
    }
    apiFetch<TaskMaterial[]>(`${API_URL}/api/course/tasks/${selectedTask}/materials`, token)
      .then((data) => setMaterials(data || []))
      .catch(() => setMaterials([]));
  }, [selectedTask, token]);

  const loadQueue = () => {
    if (!selectedGroup) return;
    setLoadingQueue(true);
    apiFetch<TeacherQueueEntry[]>(
      `${API_URL}/api/grading-queue/teacher?courseId=${selectedGroup}`,
      token
    )
      .then((data) => {
        setQueue(data || []);
        const firstSubmitted = (data || []).find((q) => q.lastSubmittedAt);
        setSelectedEntry(firstSubmitted || (data || [])[0] || null);
        setMsg(null);
      })
      .catch(() => {
        setQueue([]);
        setSelectedEntry(null);
        setMsg("Nie udało się pobrać prac do ocenienia.");
      })
      .finally(() => setLoadingQueue(false));
  };

  useEffect(() => {
    loadQueue();
  }, [selectedGroup, token]);

  const loadHistory = (entry: TeacherQueueEntry) => {
    if (!entry.artifactId || !entry.studentId) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    setFeedbackFile(null);
    apiFetch<any[]>(
      `${API_URL}/api/revisions/artifact/${entry.artifactId}/student/${entry.studentId}`,
      token
    )
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  const statusLabel: Record<string, string> = {
    SUBMITTED: "Złożone (oczekuje)",
    NEEDS_FIX: "Do poprawy",
    ACCEPTED: "Zakończone",
    REJECTED: "Odrzucone",
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "—";

  const formatPoints = (val?: number | null, mode?: string, maxPoints?: number) => {
    if (val == null) return "brak";
    return mode === "POINTS10" ? `${val}/${maxPoints ?? 10}` : `${val}%`;
  };

  const canGrade = (entry: TeacherQueueEntry | null) =>
    !!entry && !!entry.lastRevisionId && entry.lastRevisionStatus === "SUBMITTED";

  const handleSelectEntry = (entry: TeacherQueueEntry) => {
    setSelectedEntry(entry);
    const taskMode = tasks.find((t) => t.id === entry.taskId)?.gradingMode;
    setGradeScale(taskMode === "POINTS10" ? "POINTS10" : "PERCENT");
    setFeedbackFile(null);
    setGradeForm({
      points: entry.lastPointsBrutto != null ? entry.lastPointsBrutto.toString() : "",
      status: entry.lastRevisionStatus === "NEEDS_FIX" ? "NEEDS_FIX" : "ACCEPTED",
      comment: "",
      skipPenalty: false,
    });
    loadHistory(entry);
  };

  const handleGrade = async () => {
    if (!selectedEntry) return;
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
      if (gradeForm.status === "NEEDS_FIX" && feedbackFile) {
        await uploadFeedbackMaterial(selectedEntry.lastRevisionId);
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
          skipPenalty: gradeForm.skipPenalty,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }
      setMsg("Ocena zapisana. Odświeżam listę...");
      setFeedbackFile(null);
      feedbackFileInput.current && (feedbackFileInput.current.value = "");
      loadQueue();
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  const filteredQueue = queue.filter((q) =>
    selectedTaskFilter ? q.taskId === selectedTaskFilter : true
  );
  const sessionOptions = Array.from(
    new Set(tasks.filter((t) => t.sessionName).map((t) => t.sessionName as string))
  );
  const tasksForDropdown = tasks.filter((t) => {
    if (selectedSessionFilter === "ALL") return true;
    if (selectedSessionFilter === "SINGLE") return !t.sessionName;
    return t.sessionName === selectedSessionFilter;
  });
  const submittedEntries = filteredQueue.filter((q) => q.lastSubmittedAt);
  const waitingEntries = filteredQueue.filter((q) => !q.lastSubmittedAt);
  const currentTaskMode =
    selectedEntry ? tasks.find((t) => t.id === selectedEntry.taskId)?.gradingMode || "PERCENT" : "PERCENT";
  const currentTaskMax =
    selectedEntry && currentTaskMode === "POINTS10"
      ? tasks.find((t) => t.id === selectedEntry.taskId)?.maxPoints || 10
      : 100;

  const toggleStudentSelection = (id: number) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      loadQueue();
    } catch (e) {
      setMsg("Błąd przypisywania: " + (e as Error).message);
    }
  };

  const assignSessionAll = async () => {
    if (selectedSessionFilter === "ALL" || selectedSessionFilter === "SINGLE") return;
    const tasksInSession = tasks.filter((t) => t.sessionName === selectedSessionFilter);
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
      loadQueue();
    } catch (e) {
      setMsg("Błąd przypisywania sesji: " + (e as Error).message);
    }
  };

  const assignSessionSelected = async () => {
    if (selectedSessionFilter === "ALL" || selectedSessionFilter === "SINGLE") return;
    if (selectedStudents.length === 0) {
      setMsg("Wybierz studentów.");
      return;
    }
    const tasksInSession = tasks.filter((t) => t.sessionName === selectedSessionFilter);
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
      loadQueue();
    } catch (e) {
      setMsg("Błąd przypisywania sesji: " + (e as Error).message);
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
      loadQueue();
    } catch (e) {
      setMsg("Błąd przypisywania: " + (e as Error).message);
    }
  };

  const createTaskFlow = async () => {
    if (!selectedGroup) {
      setMsg("Wybierz grupę.");
      return;
    }
    if (!newTask.title || !newTask.soft || !newTask.hard) {
      setMsg("Uzupełnij tytuł oraz terminy soft/hard.");
      return;
    }
    try {
      setMsg("Tworzę zadanie...");
      const nowIso = new Date().toISOString();
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
          startDate: nowIso,
          endDate: hardIso,
        }),
      });
      if (!taskRes.ok) throw new Error(await taskRes.text());
      const task = await taskRes.json();

      const stageRes = await fetch(`${API_URL}/api/course/stages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: task.id,
          name: "Etap 1",
          weightPercent: 100,
          softDeadline: softIso,
          hardDeadline: hardIso,
          penaltyKPercentPer24h: 0,
          penaltyMaxMPercent: 100,
        }),
      });
      if (!stageRes.ok) throw new Error(await stageRes.text());
      const stage = await stageRes.json();

      const artifactRes = await fetch(`${API_URL}/api/course/artifacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stageId: stage.id,
          name: "Plik do oddania",
          type: "OTHER",
          maxSizeBytes: 104857600,
          allowedExtensionsCsv: "",
        }),
      });
      if (!artifactRes.ok) throw new Error(await artifactRes.text());

      setMsg("Zadanie utworzone.");
      setNewTask({ title: "", description: "", soft: "", hard: "" });
      // odśwież listę zadań
      const data = await apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token);
      setTasks(data || []);
      setSelectedTask(data && data.length ? data[data.length - 1].id : null);
      loadQueue();
    } catch (e) {
      setMsg("Błąd tworzenia zadania: " + (e as Error).message);
    }
  };

  const toggleDeleteSelection = (taskId: number) => {
    setDeleteSelection((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const selectEndedTasks = () => {
    const now = new Date();
    const ids = tasks
      .filter((t) => t.endDate && new Date(t.endDate) < now)
      .map((t) => t.id);
    setDeleteSelection(ids);
  };

  const selectAllTasks = () => setDeleteSelection(tasks.map((t) => t.id));
  const clearDeleteSelection = () => setDeleteSelection([]);

  const handleDeleteTasks = async () => {
    if (!selectedGroup) {
      setMsg("Wybierz grupę.");
      return;
    }
    if (deleteSelection.length === 0) {
      setMsg("Zaznacz zadania do usunięcia.");
      return;
    }
    try {
      setMsg("Usuwam zadania...");
      const res = await fetch(`${API_URL}/api/course/tasks/bulk`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: selectedGroup, taskIds: deleteSelection }),
      });
      if (!res.ok) throw new Error(await res.text());
      // zaktualizuj listy lokalnie
      setTasks((prev) => prev.filter((t) => !deleteSelection.includes(t.id)));
      setSelectedTask((prev) => (prev && deleteSelection.includes(prev) ? null : prev));
      setSelectedTaskFilter((prev) => (prev && deleteSelection.includes(prev) ? null : prev));
      setDeleteSelection([]);
      loadQueue();
      setMsg("Usunięto zaznaczone zadania.");
    } catch (e) {
      setMsg("Błąd usuwania zadań: " + (e as Error).message);
    }
  };

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
    try {
      setMsg("Tworzę sesję (Lab/Wykład) i zadania...");
      const softIso = newSession.soft ? new Date(newSession.soft).toISOString() : null;
      const hardIso = newSession.hard ? new Date(newSession.hard).toISOString() : null;
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
          gradingMode: "PERCENT",
          startDate: softIso,
          endDate: hardIso,
          tasks: sessionTasks.map((t) => ({
            title: t.title || null,
            description: t.description || null,
            startDate: t.soft ? new Date(t.soft).toISOString() : null,
            endDate: t.hard ? new Date(t.hard).toISOString() : null,
            gradingMode: t.gradingMode,
            materialFileKey: t.material?.fileKey || null,
            materialOriginalFileName: t.material?.originalFileName || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Sesja utworzona.");
      setNewSession({ name: "", type: "LAB", tasksCount: 1, gradingMode: "PERCENT", soft: "", hard: "" });
      setSessionTasks([{ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT" }]);
      setSessionTasksPage(0);
      const data = await apiFetch<Task[]>(`${API_URL}/api/course/${selectedGroup}/tasks`, token);
      setTasks(data || []);
      setSelectedTask(data && data.length ? data[data.length - 1].id : null);
      setSelectedTaskFilter(data && data.length ? data[data.length - 1].id : null);
      loadQueue();
    } catch (e) {
      setMsg("Błąd tworzenia sesji: " + (e as Error).message);
    }
  };

  const updateSessionTask = (index: number, patch: Partial<(typeof sessionTasks)[number]>) => {
    setSessionTasks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
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
      updateSessionTask(index, { material: { fileKey: presign.fileKey, originalFileName: file.name } });
      setMsg("Dodano materiał do zadania.");
    } catch (e) {
      setMsg("Błąd dodawania materiału: " + (e as Error).message);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (e) {
      setMsg("Błąd pobierania: " + (e as Error).message);
    }
  };

  const handleFeedbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFeedbackFile(file);
  };

  const uploadFeedbackMaterial = async (revisionId: number) => {
    if (!feedbackFile) return;
    try {
      setUploadingFeedback(true);
      const presignRes = await fetch(`${API_URL}/api/storage/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "teacher-feedback",
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
      const res = await fetch(`${API_URL}/api/revisions/${revisionId}/feedback-materials`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileKey: presign.fileKey, originalFileName: feedbackFile.name }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Dodano materiał dla studenta.");
      setFeedbackFile(null);
      feedbackFileInput.current && (feedbackFileInput.current.value = "");
      if (selectedEntry) loadHistory(selectedEntry);
    } catch (e) {
      setMsg("Błąd dodawania materiału: " + (e as Error).message);
    } finally {
      setUploadingFeedback(false);
    }
  };

  if (!selectedGroup) {
  return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-sm text-slate-700">Wybierz grupę w nagłówku, aby pracować na zadaniach.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Panel nauczyciela</h2>
            <p className="text-sm text-slate-600">Wybierz grupę i przejdź do sekcji.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <a href="#creator" className="rounded-md border px-2 py-1 hover:bg-slate-100">Kreator zadań</a>
            <a href="#assign" className="rounded-md border px-2 py-1 hover:bg-slate-100">Przypisywanie</a>
            <a href="#grading" className="rounded-md border px-2 py-1 hover:bg-slate-100">Panel oceniania</a>
            <a href="#materials" className="rounded-md border px-2 py-1 hover:bg-slate-100">Materiały</a>
            <a href="#delete" className="rounded-md border px-2 py-1 hover:bg-slate-100">Usuwanie</a>
            <a href="#export" className="rounded-md border px-2 py-1 hover:bg-slate-100">Eksport</a>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedGroup ?? ""}
            onChange={(e) => onChangeGroup(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Wybierz grupę zajęciową --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.studentCount || 0} studentów)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedGroup && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="creator-single">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">🆕 Kreator zadań (pojedyncze)</h3>
              <span className="text-xs text-slate-600">Tworzenie pojedynczego zadania</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tytuł</label>
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Np. Zadanie 1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Opis</label>
                <input
                  value={newTask.description}
                  onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Instrukcja dla studentów"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Termin preferowany</label>
                <input
                  type="datetime-local"
                  value={newTask.soft}
                  onChange={(e) => setNewTask((t) => ({ ...t, soft: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Termin ostateczny</label>
                <input
                  type="datetime-local"
                  value={newTask.hard}
                  onChange={(e) => setNewTask((t) => ({ ...t, hard: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              Brutto = punkty przed karą za spóźnienie, Netto = po karze. Kara może być jedynie informacyjna
              (nauczyciel może pominąć jej zastosowanie przy ocenianiu).
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="creator">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">🧪 Kreator zadań Laboratoria/Wykłady</h3>
              <button
                onClick={() => setShowSessionCreator((v) => !v)}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                {showSessionCreator ? "Zwiń" : "Rozwiń"}
              </button>
            </div>
            {showSessionCreator && (
            <>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nazwa przedmiotu</label>
                <input
                  value={newSession.name}
                  onChange={(e) => setNewSession((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Laboratorium 1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Typ</label>
                <select
                  value={newSession.type}
                  onChange={(e) => setNewSession((s) => ({ ...s, type: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="LAB">Laboratorium</option>
                  <option value="LECTURE">Wykład</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Liczba zadań</label>
                <input
                  type="number"
                  min={1}
                  value={newSession.tasksCount}
                  onChange={(e) => setNewSession((s) => ({ ...s, tasksCount: Number(e.target.value) }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Termin preferowany</label>
                <input
                  type="datetime-local"
                  value={newSession.soft}
                  onChange={(e) => setNewSession((s) => ({ ...s, soft: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Termin ostateczny</label>
                <input
                  type="datetime-local"
                  value={newSession.hard}
                  onChange={(e) => setNewSession((s) => ({ ...s, hard: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={createSessionFlow}
              className="mt-3 rounded-md bg-indigo-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800"
            >
              Utwórz sesję i zadania
            </button>
            <p className="mt-2 text-xs text-slate-600">
              Tworzy sesję (Lab/Wykład) i automatycznie dodaje wskazaną liczbę zadań (1 etap, forma pliku), z podanym
              trybem oceniania (procenty lub punkty 1–10).
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Zadania w sesji (konfiguracja)</p>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>{sessionTasks.length} zadań</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newSession.tasksCount}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                    setNewSession((s) => ({ ...s, tasksCount: val }));
                    setSessionTasks((prev) => {
                      const next = [...prev];
                      if (val > next.length) {
                        for (let i = next.length; i < val; i++) {
                          next.push({ title: "", description: "", soft: "", hard: "", gradingMode: "PERCENT" });
                        }
                      } else if (val < next.length) {
                        next.length = val;
                      }
                      return next;
                    });
                    setSessionTasksPage(0);
                  }}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1"
                />
                <span className="text-slate-600">Liczba kart zadań do konfiguracji</span>
              </div>

              {(() => {
                const pageSize = 10;
                const totalPages = Math.max(1, Math.ceil(sessionTasks.length / pageSize));
                const currentPage = Math.min(sessionTasksPage, totalPages - 1);
                const start = currentPage * pageSize;
                const slice = sessionTasks.slice(start, start + pageSize);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSessionTasksPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
                      >
                        ←
                      </button>
                      <span>
                        Strona {currentPage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setSessionTasksPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
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
                              <div>
                                <label className="text-[11px] font-semibold text-slate-600">Tryb oceniania</label>
                                <select
                                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                  value={task.gradingMode}
                                  onChange={(e) =>
                                    updateSessionTask(idx, { gradingMode: e.target.value as "PERCENT" | "POINTS10" })
                                  }
                                >
                                  <option value="PERCENT">Procenty (brutto/netto)</option>
                                  <option value="POINTS10">Punkty 1-10</option>
                                </select>
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            </>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="grading">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">📊 Panel oceniania</h3>
                <p className="text-xs text-slate-600">
                  Oddane prace po lewej, brak złożenia po prawej. Wybierz pracę, aby ocenić.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGradingPanel((s) => !s)}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  {showGradingPanel ? "Zwiń" : "Rozwiń"}
                </button>
              </div>
            </div>
            {showGradingPanel && (
              <>
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
                    onChange={(e) =>
                      setSelectedTaskFilter(e.target.value ? Number(e.target.value) : null)
                    }
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  >
                    {tasksForDropdown.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.sessionName ? `${t.sessionName} · ${t.title}` : t.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadQueue}
                    className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Odśwież
                  </button>
                </div>

                {selectedSessionFilter !== "ALL" && selectedSessionFilter !== "SINGLE" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-600">
                      Przypisywanie całego {selectedSessionFilter} (wszystkie zadania w sesji):
                    </span>
                    <button
                      onClick={assignSessionAll}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Przypisz sesję — wszyscy
                    </button>
                    <button
                      onClick={assignSessionSelected}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                      Przypisz sesję — wybrani
                    </button>
                  </div>
                )}

                {loadingQueue ? (
                  <p className="mt-3 text-sm text-slate-600">Ładowanie prac...</p>
                ) : queue.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Brak prac w kolejce dla tej grupy. Upewnij się, że zadanie ma etap i formę zwrotu, oraz że studenci
                    są przypisani.
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
                          {selectedEntry.taskTitle || "Zadanie"} · {selectedEntry.stageName || "Etap"} ·{" "}
                          {selectedEntry.artifactName || "Forma zwrotu"}
                        </p>
                      </div>
                      <div className="text-xs text-slate-600 text-right">
                    <p>Termin preferowany: {formatDate(selectedEntry.softDeadline)}</p>
                    <p>Termin ostateczny: {formatDate(selectedEntry.hardDeadline)}</p>
                      </div>
                    </div>

                <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Termin preferowany = bez kary, Termin ostateczny = po nim zadanie się zamyka. Brutto = punkty przed karą, Netto = po karze.
                </div>

                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Punkty brutto (ostatnie)</p>
                        <p className="font-semibold text-slate-900">
                          {selectedEntry.lastPointsBrutto != null ? selectedEntry.lastPointsBrutto : "—"}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Punkty netto (po karze)</p>
                        <p className="font-semibold text-slate-900">
                          {selectedEntry.lastPointsNetto != null ? selectedEntry.lastPointsNetto : "—"}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs text-slate-500">Kara za spóźnienie</p>
                        <p className="font-semibold text-slate-900">
                          {selectedEntry.penaltyPercentApplied != null ? `${selectedEntry.penaltyPercentApplied}%` : "0%"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {gradingLabel(currentTaskMode, currentTaskMax)}
                    </label>
                        <input
                          type="number"
                        min={currentTaskMode === "POINTS10" ? 0 : 0}
                        max={currentTaskMode === "POINTS10" ? currentTaskMax : 100}
                          value={gradeForm.points}
                          onChange={(e) => setGradeForm((f) => ({ ...f, points: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                          checked={currentTaskMode === "PERCENT"}
                          readOnly
                          disabled
                            />
                            % (brutto/netto)
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                          checked={currentTaskMode === "POINTS10"}
                          readOnly
                          disabled
                            />
                          Skala 1-{currentTaskMax || 10}
                          </label>
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={gradeForm.skipPenalty}
                            onChange={(e) => setGradeForm((f) => ({ ...f, skipPenalty: e.target.checked }))}
                          />
                          Nie stosuj kary (tylko informacja o spóźnieniu)
                        </label>
                      </div>
                      <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Wybierz status pracy
                    </label>
                        <select
                          value={gradeForm.status}
                          onChange={(e) => setGradeForm((f) => ({ ...f, status: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          <option value="ACCEPTED">Zakończ (zaakceptuj)</option>
                          <option value="NEEDS_FIX">Pozwól na poprawę</option>
                          <option value="REJECTED">Odrzuć</option>
                        </select>
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

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleGrade}
                        disabled={!canGrade(selectedEntry)}
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

                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-800">Historia oddań</h4>
                      {selectedEntry?.lastRevisionStatus !== "SUBMITTED" && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                          Czekamy na nową oddaną pracę od studenta. Nie możesz wysłać kolejnej zwrotki ani oceny, dopóki
                          student nie prześle kolejnej wersji.
                        </div>
                      )}
                      {selectedEntry?.lastRevisionStatus === "SUBMITTED" && gradeForm.status === "NEEDS_FIX" && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <input
                            ref={feedbackFileInput}
                            type="file"
                            className="hidden"
                            onChange={handleFeedbackFileChange}
                            aria-label="Załącz plik do poprawy"
                          />
                          <button
                            onClick={() => feedbackFileInput.current?.click()}
                            className="rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200"
                          >
                            Załącz plik do poprawy (opcjonalnie)
                          </button>
                          {feedbackFile ? (
                            <span className="text-slate-600">
                              {feedbackFile.name} ({Math.round(feedbackFile.size / 1024)} KB)
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Plik opcjonalny, dołączany przy „Wyślij pracę do poprawy”.</span>
                          )}
                        </div>
                      )}
                  {history && history.length > 0 ? (
                    <div className="mt-1">
                      <button
                        onClick={() => {
                          const latest = history[0];
                          if (latest?.downloadUrl) {
                            window.open(latest.downloadUrl, "_blank");
                          }
                        }}
                        className="text-xs font-semibold text-indigo-700 hover:underline"
                      >
                        Pobierz ostatnią pracę
                      </button>
                    </div>
                  ) : null}
                      {loadingHistory ? (
                        <p className="text-xs text-slate-600">Ładowanie historii...</p>
                      ) : history && history.length > 0 ? (
                        <div className="mt-2 space-y-2">
                      {history.map((h) => (
                        <div key={h.revisionId ?? h.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
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
                            Plik: {h.originalFileName} · Rozmiar: {h.sizeBytes ?? 0} B{" "}
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
                                        {g.pointsBrutto != null
                                      ? `${formatPoints(g.pointsBrutto, currentTaskMode, currentTaskMax)} brutto`
                                          : "—"}
                                      </span>
                                      {g.pointsNetto != null ? (
                                        <span className="text-slate-700">
                                      {" "}
                                      → {formatPoints(g.pointsNetto, currentTaskMode, currentTaskMax)} netto
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
                                  <p className="text-[11px] font-semibold text-slate-700">Materiały od nauczyciela:</p>
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
              </>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">📌 Przypisywanie zadań</h3>
              <button
                onClick={() => setShowAssignPanel((s) => !s)}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                {showAssignPanel ? "Zwiń" : "Rozwiń"}
              </button>
            </div>
            {showAssignPanel && (
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 lg:col-span-1 max-h-[420px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-800">👥 Studenci w grupie</h4>
                    <span className="text-[11px] text-slate-600">{students.length} os.</span>
                  </div>
            {students.length === 0 ? (
              <p className="text-sm text-slate-600">Brak studentów w tej grupie.</p>
            ) : (
                    <div className="divide-y divide-slate-100">
                      {students.map((s) => (
                        <label key={s.id} className="flex items-start gap-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => toggleStudentSelection(s.id)}
                            className="mt-1 h-4 w-4"
                          />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-slate-600">
                              Album: {s.albumNumber || "brak"} · {s.email}
                    </p>
                  </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Tryb</label>
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
                          setSelectedTask(first ? first.id : null);
                        }}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="ALL">Wszystkie</option>
                        <option value="SINGLE">Zadania pojedyncze</option>
                        {sessionOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
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

                  <p className="text-xs text-slate-600">
                    Grupa jest wybrana wyżej. „Przypisz wszystkim” / „Przypisz wybranych” działa dla wybranego zadania.
                    W trybie sesji (Lab/Wykład) możesz jednym kliknięciem przypisać wszystkie zadania z sesji.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="materials">
            <h3 className="text-sm font-semibold text-slate-800">📂 Materiały do zadania</h3>
            <p className="text-xs text-slate-600">
              Dodaj pliki (PDF, obraz, CSV itp.), które zobaczą studenci przy tym zadaniu.
            </p>
            <div className="mt-3 flex items-center gap-3">
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
              <select
                value={selectedTask ?? ""}
                onChange={(e) => setSelectedTask(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- wybierz zadanie --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-2 text-sm">
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

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="delete">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">🗑️ Usuwanie zadań</h3>
              <button
                onClick={() => setShowDeletePanel((s) => !s)}
                className="text-xs font-semibold text-indigo-700 hover:underline"
              >
                {showDeletePanel ? "Zwiń" : "Rozwiń"}
              </button>
            </div>
            {showDeletePanel && (
              <div className="mt-3 space-y-3">
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
                    <span className="text-xs text-slate-600">
                      Zaznaczone: {deleteSelection.length}
                    </span>
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
                      return (
                        <label
                          key={t.id}
                          className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={deleteSelection.includes(t.id)}
                            onChange={() => toggleDeleteSelection(t.id)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {t.sessionName ? `${t.sessionName} · ${t.title}` : t.title}
                              </p>
                              {ended ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  po terminie
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-600">{t.description || "Brak opisu"}</p>
                            {t.endDate ? (
                              <p className="text-[11px] text-slate-500">
                                Koniec: {new Date(t.endDate).toLocaleString("pl-PL")}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
        </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm" id="export">
            <h3 className="text-sm font-semibold text-slate-800">📦 Eksport / archiwum</h3>
            <p className="mt-1 text-xs text-slate-600">
              CSV szczegółowe = wszystkie prace i statusy, CSV końcowe = wyniki końcowe, ZIP = pełne archiwum prac.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  downloadFile(
                    `${API_URL}/api/export/course/${selectedGroup}/csv-detailed`,
                    `course-${selectedGroup}-szczegolowe.csv`
                  )
                }
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
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
                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
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
                className="rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                ZIP: pełne archiwum
              </button>
            </div>
          </div>
        </>
      )}

      {msg && <Toast message={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}

function StudentView({ token, profile }: { token: string; profile: Profile }) {
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [courses, setCourses] = useState<ClassGroup[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [tasksOverview, setTasksOverview] = useState<any[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [sessionSummary, setSessionSummary] = useState<
    {
      sessionName: string;
      mode: "POINTS" | "PERCENT";
      total: number;
      max: number;
      pct: number;
      passedCount: number;
      taskCount: number;
      passThreshold?: number | null;
      maxPoints?: number | null;
    }[]
  >([]);

  const uniqueTasks = useMemo(() => Array.from(new Map(tasksOverview.map((t) => [t.taskId, t])).values()), [tasksOverview]);
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ artifactId: number; taskId: number } | null>(null);
  const [uploadCommentByArtifact, setUploadCommentByArtifact] = useState<Record<number, string>>({});
  const [historyByArtifact, setHistoryByArtifact] = useState<Record<number, any[]>>({});
  const [revisionCountByArtifact, setRevisionCountByArtifact] = useState<Record<number, number>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskFilter, setTaskFilter] = useState<"ALL" | "DONE" | "FAILED" | "TODO" | "FIX">("ALL");
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(() => new Set());
  const [readStudentNotifications, setReadStudentNotifications] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = localStorage.getItem("studentNotificationsRead");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("studentNotificationsRead", JSON.stringify(Array.from(readStudentNotifications)));
    } catch {
      // ignore
    }
  }, [readStudentNotifications]);

  const studentNotifications = useMemo(() => {
    return tasksOverview
      .map((t) => {
        if (!t.lastRevisionStatus && !t.lastSubmittedAt) {
          return { type: "NEW_TASK", message: `Nowe zadanie: ${t.taskTitle || t.stageName || "Zadanie"}` };
        }
        if (t.lastRevisionStatus === "NEEDS_FIX") {
          return { type: "FEEDBACK", message: `Zadanie do poprawy: ${t.taskTitle || "Zadanie"}` };
        }
        if (t.lastRevisionStatus === "ACCEPTED") {
          return { type: "ACCEPTED", message: `Zadanie zaakceptowane: ${t.taskTitle || "Zadanie"}` };
        }
        return null;
      })
      .filter(Boolean) as { type: string; message: string }[];
  }, [tasksOverview]);
  const unreadStudentNotifications = studentNotifications.filter((n) => !readStudentNotifications.has(n.message));
  const notificationsCount = unreadStudentNotifications.length;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  useEffect(() => {
    if (notificationsOpen && unreadStudentNotifications.length > 0) {
      setReadStudentNotifications((prev) => {
        const next = new Set(prev);
        unreadStudentNotifications.forEach((n) => next.add(n.message));
        return next;
      });
    }
  }, [notificationsOpen, unreadStudentNotifications]);

  const sessions = useMemo(
    () => Array.from(new Set(tasksOverview.map((t) => t.sessionName).filter(Boolean))) as string[],
    [tasksOverview]
  );
  const filteredTasks = useMemo(() => {
    let list = sessionFilter === "ALL" ? tasksOverview : tasksOverview.filter((t) => t.sessionName === sessionFilter);
    if (taskFilter !== "ALL") {
      list = list.filter((t) => {
        const status = t.lastRevisionStatus;
        const hasSubmission = !!t.lastSubmittedAt;
        if (taskFilter === "DONE") return status === "ACCEPTED";
        if (taskFilter === "FAILED") return status === "REJECTED";
        if (taskFilter === "FIX") return status === "NEEDS_FIX";
        if (taskFilter === "TODO") return !hasSubmission;
        return true;
      });
    }
    return list;
  }, [tasksOverview, sessionFilter, taskFilter]);

  useEffect(() => {
    const summaryMap: Record<
      string,
      {
        sessionName: string;
        mode: "POINTS" | "PERCENT";
        total: number;
        max: number;
        passedCount: number;
        taskCount: number;
        passThreshold?: number | null;
        maxPoints?: number | null;
      }
    > = {};

    filteredTasks.forEach((t) => {
      const key = t.sessionName || "Zadania pojedyncze";
      if (!summaryMap[key]) {
        summaryMap[key] = {
          sessionName: key,
          mode: t.gradingMode === "POINTS10" ? "POINTS" : "PERCENT",
          total: 0,
          max: 0,
          passedCount: 0,
          taskCount: 0,
          passThreshold: t.passThreshold ?? null,
          maxPoints: t.maxPoints ?? null,
        };
      }
      const bucket = summaryMap[key];
      const isPoints = t.gradingMode === "POINTS10";
      const max = isPoints ? t.maxPoints || 10 : 100;
      const val = t.lastPointsNetto != null ? t.lastPointsNetto : 0;

      if (isPoints) {
        bucket.total += val;
        bucket.max += max;
      } else {
        // procenty: sumujemy (ograniczone do 100) i uśredniamy na końcu, max prezentacyjny = 100
        bucket.total += Math.min(100, val);
      }
      bucket.taskCount += 1;
      if (t.passThreshold != null && val >= t.passThreshold) {
        bucket.passedCount += 1;
      }
      if (t.passThreshold != null) {
        bucket.passThreshold = bucket.passThreshold == null ? t.passThreshold : Math.max(bucket.passThreshold, t.passThreshold);
      }
      if (bucket.maxPoints == null && t.maxPoints != null) {
        bucket.maxPoints = t.maxPoints;
      }
    });

    const arr = Object.values(summaryMap).map((s) => {
      if (s.mode === "POINTS") {
        const pct = s.max > 0 ? Math.round((s.total / s.max) * 100) : 0;
        return { ...s, pct, max: s.max };
      }
      // procenty: pokazujemy średnią procentową, max = 100
      const avg = s.taskCount > 0 ? s.total / s.taskCount : 0;
      return { ...s, total: avg, max: 100, pct: Math.round(avg) };
    });

    setSessionSummary(arr);
  }, [filteredTasks]);

  useEffect(() => {
    fetch(`${API_URL}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStudentProfile)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetch(`${API_URL}/api/student/courses`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setCourses(data || []);
        if (data && data.length) {
          setSelectedCourse(data[0].id);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedCourse) return;
    fetch(`${API_URL}/api/student/courses/${selectedCourse}/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(async (data) => {
        const list = Array.isArray(data) ? data : [];
        setTasksOverview(list);
        // pobierz liczby rewizji dla każdego artefaktu, aby wyznaczyć etap = liczba zwrotek
        const counts: Record<number, number> = { ...revisionCountByArtifact };
        await Promise.all(
          list.map(async (item) => {
            if (counts[item.artifactId]) return;
            try {
              const hist = await fetch(`${API_URL}/api/revisions/artifact/${item.artifactId}/me`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((r) => r.json());
              counts[item.artifactId] = Array.isArray(hist) ? hist.length : 1;
            } catch {
              counts[item.artifactId] = counts[item.artifactId] || 1;
            }
          })
        );
        setRevisionCountByArtifact(counts);
      })
      .catch(() => setTasksOverview([]));
  }, [selectedCourse, token]);

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "—";

  const statusLabel: Record<string, string> = {
    SUBMITTED: "Złożone (oczekuje)",
    NEEDS_FIX: "Do poprawy",
    ACCEPTED: "Zakończone",
    REJECTED: "Odrzucone",
  };

  const statusColor = (status?: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-amber-100 text-amber-800";
      case "NEEDS_FIX":
        return "bg-orange-100 text-orange-800";
      case "ACCEPTED":
        return "bg-emerald-100 text-emerald-800";
      case "REJECTED":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const groupedTasks = filteredTasks.reduce((acc: Record<string, any[]>, item) => {
    const key = item.taskId ? `TASK_${item.taskId}` : item.sessionName || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const handlePickFile = (artifactId: number, taskId: number) => {
    setUploadTarget({ artifactId, taskId });
    setSelectedFile(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) setMsg(`Wybrano plik: ${file.name}`);
  };

  const handleSubmitUpload = async () => {
    if (!uploadTarget || !selectedFile) {
      setMsg("Wybierz plik przed oddaniem.");
      return;
    }
    try {
      setMsg("Wysyłam plik...");
      const file = selectedFile;
      // 1) presign
      const presignRes = await fetch(`${API_URL}/api/storage/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "student-submissions",
          originalFileName: file.name,
        }),
      });
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const presign = await presignRes.json();
      // 2) upload PUT
      await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      // 3) submit revision
      const submitRes = await fetch(`${API_URL}/api/revisions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artifactId: uploadTarget.artifactId,
          fileKey: presign.fileKey,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          comment: uploadCommentByArtifact[uploadTarget.artifactId] || null,
        }),
      });
      if (!submitRes.ok) throw new Error(await submitRes.text());
      setMsg("Praca wysłana. Odświeżam...");
      // reload overview
      if (selectedCourse) {
        const data = await fetch(`${API_URL}/api/student/courses/${selectedCourse}/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setTasksOverview(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setMsg("Błąd wysyłki: " + (err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadTarget(null);
      setSelectedFile(null);
      setUploadCommentByArtifact((prev) => {
        const copy = { ...prev };
        if (uploadTarget) delete copy[uploadTarget.artifactId];
        return copy;
      });
    }
  };

  const handleChangePassword = async () => {
    try {
      setMsg("Zmiana hasła...");
      const res = await fetch(`${API_URL}/api/student/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changePasswordForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zmiany hasła");
      }
      setMsg("Hasło zostało zmienione.");
      setChangePasswordForm({ oldPassword: "", newPassword: "" });
    } catch (e) {
      setMsg("Błąd: " + (e as Error).message);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm relative">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Panel studenta</h2>
          <p className="text-sm text-slate-600">Przegląd zadań i zwrotek</p>
        </div>
        <div className="relative">
          <button
            className="relative rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            title="Powiadomienia"
            onClick={() => setNotificationsOpen((v) => !v)}
          >
            🔔
            {notificationsCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-rose-500 px-2 py-[2px] text-[10px] font-bold text-white">
                {notificationsCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold text-slate-700 border-b border-slate-100">Powiadomienia</div>
              <div className="max-h-64 overflow-y-auto text-sm">
                {studentNotifications.length === 0 ? (
                  <p className="px-3 py-2 text-slate-500">Brak nowych powiadomień.</p>
                ) : (
                  studentNotifications.map((n, idx) => (
                    <div key={idx} className="px-3 py-2 border-b border-slate-100 last:border-b-0">
                      {n.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Mój profil</h2>
        {studentProfile ? (
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-600">Imię i nazwisko</p>
              <p className="text-slate-900">{studentProfile.firstName} {studentProfile.lastName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Email</p>
              <p className="text-slate-900">{studentProfile.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Numer albumu</p>
              <p className="text-slate-900">{studentProfile.albumNumber || "Brak"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Grupa zajęciowa</p>
              <p className="text-slate-900">{studentProfile.groupName}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Ładowanie...</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Zmiana hasła</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Stare hasło
            </label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2"
              value={changePasswordForm.oldPassword}
              onChange={(e) => setChangePasswordForm((f) => ({ ...f, oldPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nowe hasło
            </label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2"
              value={changePasswordForm.newPassword}
              onChange={(e) => setChangePasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            />
          </div>
          <button
            onClick={handleChangePassword}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Zmień hasło
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Moje zadania</h2>
              <p className="text-sm text-slate-600">Zadania przydzielone w Twoich grupach.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Grupa</label>
              <select
                value={selectedCourse ?? ""}
                onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="font-semibold text-slate-700">Zadania</label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Wszystkie</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value as any)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Wszystkie statusy</option>
              <option value="DONE">Zakończone (zaliczone)</option>
              <option value="FAILED">Zakończone (niezaliczone)</option>
              <option value="TODO">Do oddania (brak zwrotki)</option>
              <option value="FIX">Do poprawy (zwrotka nauczyciela)</option>
            </select>
          </div>

          {(sessionFilter === "ALL" ? uniqueTasks : sessionSummary).length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-800 mb-2">Podsumowanie przedmiotów / zadań</p>
              <div className="grid gap-2 md:grid-cols-2">
                {sessionFilter === "ALL"
                  ? uniqueTasks.map((t) => {
                      const isPoints = t.gradingMode === "POINTS10";
                      const max = isPoints ? t.maxPoints || 10 : 100;
                      const valRaw = t.lastPointsNetto ?? 0;
                      const val = isPoints ? valRaw : Math.min(100, valRaw);
                      const pct = isPoints ? Math.round(((val || 0) / max) * 100) : Math.round(Math.min(100, val || 0));
                      const passLabel =
                        t.passThreshold != null
                          ? isPoints
                            ? `Próg: ${t.passThreshold}/${max} pkt`
                            : `Próg: ${t.passThreshold}%`
                          : "Próg: brak";
                      return (
                        <div key={`${t.taskId}-${t.artifactId}`} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">
                              {t.taskTitle
                                ? t.sessionName
                                  ? `${t.sessionName} · ${t.taskTitle}`
                                  : t.taskTitle
                                : t.sessionName || `Zadanie ${t.taskId}`}
                            </span>
                            <span className="text-indigo-700 font-semibold">{pct}%</span>
                          </div>
                          <p className="text-slate-700">
                            Suma: {Math.round((val || 0) * 100) / 100} / {max} {isPoints ? "pkt" : "%"}
                          </p>
                          <p className="text-slate-700">{passLabel}</p>
                        </div>
                      );
                    })
                  : sessionSummary.map((s) => {
                      const isPoints = s.mode === "POINTS";
                    const displayMax = isPoints ? s.max || s.maxPoints || 0 : 100;
                    const passLabel =
                        s.passThreshold != null
                          ? isPoints
                            ? `Próg: ${s.passThreshold}/${displayMax || ""} pkt`
                            : `Próg: ${s.passThreshold}%`
                          : "Próg: brak";
                      return (
                        <div key={s.sessionName} className="rounded border border-slate-200 bg-white px-3 py-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{s.sessionName}</span>
                            <span className="text-indigo-700 font-semibold">{s.pct}%</span>
                          </div>
                          <p className="text-slate-700">
                          Suma: {Math.round(s.total * 100) / 100} / {displayMax} {isPoints ? "pkt" : "%"} ({s.pct}%)
                          </p>
                          <p className="text-slate-700">Zaliczone zadania: {s.passedCount}/{s.taskCount}</p>
                          <p className="text-slate-700">{passLabel}</p>
                        </div>
                      );
                    })}
              </div>
            </div>
          ) : null}

          {/* global hidden file input for student uploads */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Wybierz plik do wysłania"
          />

          {Object.keys(groupedTasks).length === 0 ? (
            <p className="text-sm text-slate-600">Brak przydzielonych zadań w tej grupie.</p>
          ) : (
            Object.entries(groupedTasks).map(([groupKey, items]) => {
              const task = items[0];
            const isExpanded = expandedTasks.has(task.taskId);
              return (
                <div key={groupKey} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {task.sessionName ? `${task.sessionName} · ${task.taskTitle}` : task.taskTitle || `Zadanie ${task.taskId}`}
                      </h3>
                      <p className="text-sm text-slate-700">{task.taskDescription || "Brak opisu"}</p>
                      {task.gradingMode ? (
                        <p className="text-xs text-slate-600">
                          Tryb oceniania:{" "}
                          {task.gradingMode === "POINTS10"
                            ? `Punkty 1-${task.maxPoints || 10}`
                            : "Procenty (0-100%)"}
                          {task.passThreshold != null
                            ? ` · Próg zaliczenia: ${
                                task.gradingMode === "POINTS10"
                                  ? `${task.passThreshold}/${task.maxPoints || 10} pkt`
                                  : `${task.passThreshold}%`
                              }`
                            : " · Próg zaliczenia: brak"}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() =>
                        setExpandedTasks((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.taskId)) next.delete(task.taskId);
                          else next.add(task.taskId);
                          return next;
                        })
                      }
                      className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 shadow-sm"
                    >
                      {isExpanded ? "Zwiń" : "Rozwiń"}
                    </button>
                  </div>

                {isExpanded && (
                <div className="space-y-2">
                    {items.map((item: any) => (
                      <div key={item.artifactId} className="rounded-md border border-slate-200 p-3">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.artifactName}</p>
                                <p className="text-xs text-slate-600">
                                  Termin preferowany: {formatDate(item.softDeadline)} · Termin ostateczny: {formatDate(item.hardDeadline)}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusColor(item.lastRevisionStatus)}`}
                              >
                                {item.statusLabel}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              <p>Etap: Etap {revisionCountByArtifact[item.artifactId] || 1}</p>
                              <p>
                                Ostatnia punktacja:{" "}
                                {item.lastPointsNetto != null
                                  ? formatPoints(item.lastPointsNetto, task.gradingMode, task.maxPoints)
                                  : "brak"}{" "}
                                · Ostatnie oddanie: {formatDate(item.lastSubmittedAt)}
                              </p>
                            {task.passThreshold != null ? (
                              <p className="text-xs font-semibold text-slate-700">
                                Próg:{" "}
                                {task.gradingMode === "POINTS10"
                                  ? `${task.passThreshold}/${task.maxPoints || 10} pkt`
                                  : `${task.passThreshold}%`}{" "}
                                · Status:{" "}
                                {item.lastPointsNetto != null &&
                                item.lastPointsNetto >=
                                  (task.gradingMode === "POINTS10" ? task.passThreshold : task.passThreshold)
                                  ? "zaliczone"
                                  : "niezaliczone"}
                              </p>
                            ) : (
                              <p className="text-xs font-semibold text-slate-700">Próg: brak</p>
                            )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700">Materiały od nauczyciela:</p>
                              {(() => {
                                const feedbackMaterials =
                                  historyByArtifact[item.artifactId]?.flatMap((h: any) => h.feedbackMaterials || []) || [];
                                const combined = [...(task.materials || []), ...feedbackMaterials];
                                return combined.length > 0 ? (
                                  <ul className="mt-1 space-y-1 text-xs">
                                    {combined.map((m: any, idx: number) => (
                                      <li key={m.id ?? `${m.originalFileName}-${idx}`}>
                                        <a
                                          href={m.downloadUrl}
                                          className="text-indigo-600 hover:underline"
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {m.originalFileName}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500">Brak materiałów.</p>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              {/*
                                Student może oddać plik tylko, gdy nie ma jeszcze oddania
                                albo gdy nauczyciel poprosił o poprawę (NEEDS_FIX).
                                Blokujemy ponowne oddania w statusach SUBMITTED/ACCEPTED.
                              */}
                              {(() => {
                                const status = item.lastRevisionStatus;
                                const canSubmit = !status || status === "NEEDS_FIX";
                                const disabledSubmit =
                                  !canSubmit ||
                                  !selectedFile ||
                                  !uploadTarget ||
                                  uploadTarget.artifactId !== item.artifactId;
                                return (
                                  <>
                                    <textarea
                                      value={uploadCommentByArtifact[item.artifactId] || ""}
                                      onChange={(e) =>
                                        setUploadCommentByArtifact((prev) => ({
                                          ...prev,
                                          [item.artifactId]: e.target.value,
                                        }))
                                      }
                                      placeholder="Opcjonalny opis/komentarz do oddania"
                                      className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                                      disabled={!canSubmit}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handlePickFile(item.artifactId, item.taskId)}
                                        className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200"
                                        disabled={!canSubmit}
                                      >
                                        Wybierz plik
                                      </button>
                                      <button
                                        onClick={handleSubmitUpload}
                                        disabled={disabledSubmit}
                                        className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-indigo-300"
                                      >
                                        Oddaj
                                      </button>
                                    </div>
                                    {selectedFile && uploadTarget?.artifactId === item.artifactId ? (
                                      <p className="text-[11px] text-slate-600 mt-1">
                                        Wybrano: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                      </p>
                                    ) : null}
                                    {!canSubmit && (
                                      <p className="mt-1 text-[11px] font-semibold text-slate-600">
                                        Kolejne oddanie będzie możliwe po prośbie o poprawę.
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            <div>
                              <button
                                onClick={async () => {
                                  if (historyByArtifact[item.artifactId]) {
                                    const copy = { ...historyByArtifact };
                                    delete copy[item.artifactId];
                                    setHistoryByArtifact(copy);
                                    return;
                                  }
                                  try {
                                    const data = await fetch(`${API_URL}/api/revisions/artifact/${item.artifactId}/me`, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    }).then((r) => r.json());
                                    setHistoryByArtifact((h) => ({ ...h, [item.artifactId]: data }));
      if (Array.isArray(data)) {
        setRevisionCountByArtifact((prev) => ({ ...prev, [item.artifactId]: data.length }));
      }
                                  } catch {
                                    setHistoryByArtifact((h) => ({ ...h, [item.artifactId]: [] }));
                                  }
                                }}
                                className="text-xs font-semibold text-indigo-700 hover:underline"
                              >
                                {historyByArtifact[item.artifactId] ? "Ukryj historię oddań" : "Pokaż historię oddań"}
                              </button>

                              {historyByArtifact[item.artifactId] && (
                                <div className="mt-2 space-y-3 border-t border-slate-200 pt-2">
                                  {historyByArtifact[item.artifactId].length === 0 ? (
                                    <p className="text-xs text-slate-600">Brak historii oddań.</p>
                                  ) : (
                                    historyByArtifact[item.artifactId].map((h: any) => (
                                      <div
                                        key={h.revisionId}
                                        className="grid gap-3 md:grid-cols-2 items-start"
                                      >
                                        <div className="space-y-2 md:pr-4">
                                          {h.grades && h.grades.length > 0 ? (
                                            h.grades.map((g: any) => (
                                              <div
                                                key={g.gradeId}
                                                className={`rounded px-3 py-2 text-xs shadow-sm ${
                                                  g.statusAfterGrade === "ACCEPTED"
                                                    ? "bg-emerald-100 text-emerald-900"
                                                    : g.statusAfterGrade === "NEEDS_FIX"
                                                      ? "bg-amber-100 text-amber-900"
                                                      : "bg-rose-100 text-rose-900"
                                                }`}
                                              >
                                                <div className="flex justify-between">
                                                  <span className="font-semibold">
                                                    {g.pointsNetto != null
                                                      ? `Punkty: ${formatPoints(g.pointsNetto, item.gradingMode, task.maxPoints)}`
                                                      : "Punkty: —"}
                                                  </span>
                                                  <span>
                                                    ({statusLabel[g.statusAfterGrade] || g.statusAfterGrade})
                                                  </span>
                                                </div>
                                        {g.comment ? <p className="text-xs">Komentarz: {g.comment}</p> : null}
                                        {h.feedbackMaterials && h.feedbackMaterials.length > 0 ? (
                                          <div className="mt-1 space-y-1">
                                            <p className="text-[11px] font-semibold">Materiały dodatkowe:</p>
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
                                            ))
                                          ) : (
                                            <p className="text-xs text-slate-500">Brak ocen nauczyciela.</p>
                                          )}
                                        </div>
                                        <div className="md:pl-4">
                                          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs shadow-sm">
                                            <div className="flex items-center justify-between gap-2">
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
                                            {h.comment ? <p className="text-slate-700 mt-1">Opis: {h.comment}</p> : null}
                                            <p className="text-slate-600">
                                              Plik: {h.originalFileName} · Rozmiar: {h.sizeBytes ?? 0} B{" "}
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
                            {/* Materiały ze zwrotki pokazujemy tylko po stronie ocen (żółta karta),
                                w historii po stronie studenta ten blok ukryty, żeby nie dublować */}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

