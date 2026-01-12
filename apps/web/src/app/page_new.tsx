 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch } from "./lib/api";

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
type Task = { id: number; title: string; description?: string };
type Stage = { id: number; name: string; weightPercent: number };

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

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => setHealth(data.status ?? "ok"))
      .catch(() => setHealth("offline"));
  }, []);

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

  const content = useMemo(() => {
    if (!profile || !token) return null;
    if (profile.role === "TEACHER") {
      return <TeacherView token={token} />;
    }
    if (profile.role === "STUDENT") {
      return <StudentView token={token} profile={profile} />;
    }
    return <AdminView token={token} />;
  }, [profile, token]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Panel dydaktyczny
            </h1>
            <p className="text-sm text-slate-600">
              Demo loginy: admin@example.com/admin123 ·
              teacher@example.com/teacher123 · s1@example.com/student123
            </p>
          </div>
          <div className="flex items-center gap-3" aria-live="polite">
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

      <div className="mx-auto max-w-6xl px-6 py-6">
        {!token || !profile ? (
          <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              Zalogowano jako{" "}
              <span className="font-semibold">
                {profile.firstName} {profile.lastName}
              </span>{" "}
              ({profile.role})
            </p>
          </div>
        )}

        {content ? (
          content
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Zaloguj się, aby zobaczyć dane.
          </p>
        )}
      </div>
    </div>
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
      .then((data) => setAllStudents(data))
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
      setAllStudents(students);
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
      setAllStudents(students);
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
    </div>
  );
}

function TeacherView({ token }: { token: string }) {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ClassGroup[]>(`${API_URL}/api/teacher/class-groups`, token)
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [token]);

  useEffect(() => {
    if (!selectedGroup) return;
    apiFetch<any[]>(`${API_URL}/api/teacher/class-groups/${selectedGroup}/students`, token)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [selectedGroup, token]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Moje grupy zajęciowe</h2>
        <p className="mt-1 text-sm text-slate-600">Przeglądaj grupy, którymi zarządzasz.</p>
        
        <div className="mt-4 space-y-2">
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedGroup ?? ""}
            onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
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
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">👥 Studenci w grupie</h3>
          <div className="mt-3 divide-y divide-slate-100">
            {students.length === 0 ? (
              <p className="text-sm text-slate-600">Brak studentów w tej grupie.</p>
            ) : (
              students.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Album: {s.albumNumber || "brak"} | Email: {s.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {msg && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm text-indigo-900">{msg}</p>
        </div>
      )}
    </div>
  );
}

function StudentView({ token, profile }: { token: string; profile: Profile }) {
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStudentProfile)
      .catch(() => {});
  }, [token]);

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
        <h2 className="text-lg font-bold text-slate-900">Zmiana hasła</h2>
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
        {msg && (
          <p className="mt-3 text-sm text-slate-600">{msg}</p>
        )}
      </div>
    </div>
  );
}

