import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  BadgeCheck,
  Boxes,
  Cloud,
  CloudCog,
  Code2,
  Computer,
  Container,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  Github,
  LogOut,
  ServerCog,
  ShieldCheck,
  ShieldX,
  SquareTerminal,
  UserRound,
  UsersRound,
  Workflow,
} from "lucide-react";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "nextkode_deploylab_token";
const OFFLINE_TOKEN_PREFIX = "offline-demo";
const DEMO_USERS = {
  admin: {
    password: "admin@123",
    role: "admin",
    full_name: "Admin",
  },
  student1: {
    password: "student@1",
    role: "student",
    full_name: "Student1",
  },
  student2: {
    password: "student@2",
    role: "student",
    full_name: "Student2",
  },
};
const COURSE_FALLBACK_MODULES = [
  { title: "Operating System", skill: "Linux", icon: "computer", accent: "#22c55e", accent_rgb: "34, 197, 94" },
  { title: "Scripting", skill: "Shell Scripting", icon: "terminal", accent: "#06b6d4", accent_rgb: "6, 182, 212" },
  { title: "Cloud Computing", skill: "AWS", icon: "cloud-cog", accent: "#f59e0b", accent_rgb: "245, 158, 11" },
  { title: "VCS", skill: "Git and GitHub", icon: "github", accent: "#a855f7", accent_rgb: "168, 85, 247" },
  { title: "IaC", skill: "Terraform", icon: "code", accent: "#7c3aed", accent_rgb: "124, 58, 237" },
  { title: "CI/CD", skill: "GitHub Actions", icon: "workflow", accent: "#3b82f6", accent_rgb: "59, 130, 246" },
  { title: "Containerization", skill: "Docker", icon: "container", accent: "#0ea5e9", accent_rgb: "14, 165, 233" },
  { title: "Container Orchestration", skill: "Kubernetes", icon: "boxes", accent: "#14b8a6", accent_rgb: "20, 184, 166" },
];
const ICONS_BY_KEY = {
  boxes: Boxes,
  "cloud-cog": CloudCog,
  code: Code2,
  computer: Computer,
  container: Container,
  github: Github,
  terminal: SquareTerminal,
  workflow: Workflow,
};

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  let response;

  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (requestError) {
    const error = new Error("Backend unavailable");
    error.isBackendUnavailable = true;
    error.cause = requestError;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || "Request failed. Please try again.");
    error.status = response.status;
    error.isBackendUnavailable = response.status >= 500;
    throw error;
  }

  return data;
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function isBackendUnavailable(error) {
  return error?.isBackendUnavailable || /backend unavailable|failed to fetch|network/i.test(error?.message || "");
}

function getOfflineToken(username) {
  return `${OFFLINE_TOKEN_PREFIX}:${username}`;
}

function getOfflineUsername(token) {
  return token?.startsWith(`${OFFLINE_TOKEN_PREFIX}:`)
    ? token.slice(OFFLINE_TOKEN_PREFIX.length + 1)
    : "";
}

function getJwtUsername(token) {
  if (!token || token.startsWith(`${OFFLINE_TOKEN_PREFIX}:`)) return "";

  try {
    const payload = JSON.parse(window.atob(token.split(".")[1]));
    return payload.sub || "";
  } catch {
    return "";
  }
}

function getOfflineProfile(token) {
  const username = getOfflineUsername(token) || getJwtUsername(token);
  const demoUser = DEMO_USERS[username] || {
    role: "offline",
    full_name: username || "Student",
  };

  if (!username) return null;

  return {
    id: 0,
    username,
    full_name: demoUser.full_name,
    email: `${username}@nextkodeschool.com`,
    role: demoUser.role,
    created_at: new Date().toISOString(),
  };
}

function canUseOfflineLogin(username, password) {
  const normalizedUsername = username.trim().toLowerCase();
  return DEMO_USERS[normalizedUsername]?.password === password;
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    const onRouteChange = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onRouteChange);
    return () => window.removeEventListener("popstate", onRouteChange);
  }, [token]);

  useEffect(() => {
    if (token && route === "/") navigate("/dashboard");
    if (!token && route !== "/") navigate("/");
  }, [route, token]);

  function handleLogin(accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    navigate("/dashboard");
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    navigate("/");
  }

  return (
    <main className="app-shell">
      {token && route === "/dashboard" ? (
        <Dashboard onLogout={handleLogout} token={token} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </main>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="Next Kode School Lab">
      <img src="/nox-kode-logo.png" alt="Next Kode School" />
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(data.access_token);
    } catch (requestError) {
      const normalizedUsername = username.trim().toLowerCase();

      if (
        isBackendUnavailable(requestError) &&
        canUseOfflineLogin(normalizedUsername, password)
      ) {
        onLogin(getOfflineToken(normalizedUsername));
        return;
      }

      setError(
        isBackendUnavailable(requestError)
          ? "Backend is offline. Use valid classroom demo credentials to view the UI without database data."
          : requestError.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-screen">
      <div className="login-grid">
        <div className="login-copy">
          <BrandMark />
          <p className="eyebrow">Build. Deploy. Verify. Learn.</p>
          <h1>Next Kode School Lab</h1>
          <p className="lead">Deploy. Connect. Verify.</p>
          <div className="pipeline-strip" aria-label="DevOps deployment flow">
            <span>
              <Code2 size={18} /> Code
            </span>
            <ArrowDown size={16} />
            <span>
              <Container size={18} /> Docker
            </span>
            <ArrowDown size={16} />
            <span>
              <GitBranch size={18} /> CI/CD
            </span>
            <ArrowDown size={16} />
            <span>
              <Cloud size={18} /> Cloud
            </span>
          </div>
          <p className="school-note">A deployment practice environment by Next Kode School</p>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="form-heading">
            <ShieldCheck size={30} />
            <div>
              <h2>User Login</h2>
              <p>Authenticate through the full container chain.</p>
            </div>
          </div>

          <label>
            Username
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
              type="text"
              value={username}
            />
          </label>

          <label>
            Password
            <span className="password-control">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="icon-button"
                onClick={() => setShowPassword((value) => !value)}
                title={showPassword ? "Hide password" : "Show password"}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error ? <p className="error-message">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Dashboard({ onLogout, token }) {
  const [profile, setProfile] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersVisible, setUsersVisible] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersPanelKey, setUsersPanelKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const usersPanelRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const [profileResult, statusResult, progressResult] = await Promise.allSettled([
        apiRequest("/api/user/profile"),
        apiRequest("/api/deployment/status"),
        apiRequest("/api/student/progress"),
      ]);

      if (!active) return;

      const apiHealthy =
        profileResult.status === "fulfilled" &&
        statusResult.status === "fulfilled" &&
        progressResult.status === "fulfilled";

      setBackendAvailable(apiHealthy);
      setProfile(
        profileResult.status === "fulfilled"
          ? profileResult.value
          : getOfflineProfile(token),
      );
      setStatuses(statusResult.status === "fulfilled" ? statusResult.value : []);
      setProgressData(progressResult.status === "fulfilled" ? progressResult.value : null);

      if (!apiHealthy && !getOfflineProfile(token)) {
        setError("Backend unavailable");
      }

      setLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const statusByComponent = useMemo(
    () =>
      statuses.reduce((collection, item) => {
        collection[item.component] = item;
        return collection;
      }, {}),
    [statuses],
  );

  async function handleUsersClick() {
    setUsersVisible(true);
    setUsersPanelKey((key) => key + 1);
    setUsersLoading(true);
    setUsersError("");

    requestAnimationFrame(() => {
      usersPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    try {
      const data = await apiRequest("/api/users");
      setUsers(data);
    } catch (requestError) {
      setUsers([]);
      setUsersError(requestError.message);
    } finally {
      setUsersLoading(false);
    }
  }

  return (
    <section className="dashboard-screen">
      <nav className="top-nav">
        <BrandMark />
        <div className="nav-actions">
          <button className="ghost-button" onClick={handleUsersClick} type="button">
            <UsersRound size={18} />
            Users
          </button>
          <button className="ghost-button" onClick={onLogout} type="button">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {loading ? (
        <div className="loading-panel">Loading deployment data...</div>
      ) : error ? (
        <div className="loading-panel error-message">{error}</div>
      ) : (
        <>
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Student Progress</p>
              <h1>Next Kode School Lab</h1>
              <p>Welcome back, {profile?.full_name || profile?.username}</p>
            </div>
            <span className="verified-badge">
              <BadgeCheck size={18} />
              {backendAvailable ? "Learning Path Active" : "Backend Offline"}
            </span>
          </header>

          <CourseProgress progressData={progressData} backendAvailable={backendAvailable} />

          <section className={`success-card ${backendAvailable ? "" : "offline-card"}`}>
            <div className="success-icon">
              {backendAvailable ? <BadgeCheck size={34} /> : <ServerCog size={34} />}
            </div>
            <div className="success-copy">
              <p className="eyebrow">
                {backendAvailable ? "All Services Online" : "Backend Fetch Failed"}
              </p>
              <h2>{backendAvailable ? "Awesome!" : "No Data"}</h2>
              <strong>
                {backendAvailable
                  ? "You have Successfully Deployed the Application!"
                  : "The frontend is running, but backend data could not be loaded."}
              </strong>
              <p>
                {backendAvailable
                  ? "Frontend, Backend and Database are Connected Successfully."
                  : "Start the backend again to restore profile, progress, and database-backed service data."}
              </p>
              <div className="success-identity">
                <strong>Logged in with {profile?.username} user</strong>
                <span>Role: {profile?.role}</span>
              </div>
            </div>
          </section>

          {usersVisible ? (
            <section
              className="users-spotlight"
              key={usersPanelKey}
              ref={usersPanelRef}
            >
              <Panel title="Application Users">
                <UsersPanel users={users} loading={usersLoading} error={usersError} />
              </Panel>
            </section>
          ) : null}

          <section className="dashboard-grid">
            <Panel title="Application Architecture" className="architecture-panel">
              <ArchitectureFlow backendAvailable={backendAvailable} />
            </Panel>

            <Panel title="Authenticated User">
              <StudentInfo profile={profile} />
            </Panel>
          </section>

          <Panel title="Service Status">
            <div className="status-grid">
              <StatusCard
                icon={<Code2 />}
                name="Frontend"
                stack="React + Vite"
                status="Running"
              />
              <StatusCard
                icon={<ServerCog />}
                name="Backend"
                stack="Python + FastAPI"
                status={
                  backendAvailable
                    ? statusByComponent.Backend?.status || "Connected"
                    : "Unavailable"
                }
                unavailable={!backendAvailable}
              />
              <StatusCard
                icon={<Database />}
                name="Database"
                stack="PostgreSQL"
                status={
                  backendAvailable
                    ? statusByComponent.PostgreSQL?.status || "Connected"
                    : "No data"
                }
                unavailable={!backendAvailable}
              />
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}

function CourseProgress({ progressData, backendAvailable }) {
  const hasDatabaseProgress = backendAvailable && progressData?.courses?.length;
  const summary = progressData?.summary;
  const courses = hasDatabaseProgress ? progressData.courses : COURSE_FALLBACK_MODULES;

  return (
    <section className="progress-showcase" aria-label="Student course progress">
      <div className="progress-hero">
        <div>
          <p className="eyebrow">Your DevOps Roadmap</p>
          <h2>
            {hasDatabaseProgress
              ? "Track every skill from Linux foundations to Kubernetes delivery."
              : "The frontend is alive, but database progress is not available."}
          </h2>
        </div>
        <div
          className={`progress-ring ${hasDatabaseProgress ? "" : "no-data-ring"}`}
          style={{
            "--progress-deg": hasDatabaseProgress
              ? `${summary.overall_progress * 3.6}deg`
              : "0deg",
          }}
          aria-label={
            hasDatabaseProgress
              ? `${summary.overall_progress}% overall progress`
              : "No progress data"
          }
        >
          <strong>{hasDatabaseProgress ? `${summary.overall_progress}%` : "No data"}</strong>
          <span>{hasDatabaseProgress ? "Overall" : "Backend"}</span>
        </div>
      </div>

      <div className="progress-stats" aria-label="Progress summary">
        <span>
          <strong>{hasDatabaseProgress ? summary.total_modules : "No data"}</strong>
          Modules
        </span>
        <span>
          <strong>{hasDatabaseProgress ? summary.strong_modules : "No data"}</strong>
          Strong
        </span>
        <span>
          <strong>{hasDatabaseProgress ? summary.in_progress_modules : "No data"}</strong>
          In Progress
        </span>
      </div>

      <div className="course-grid">
        {courses.map((course) => (
          <CourseCard
            course={course}
            hasDatabaseProgress={hasDatabaseProgress}
            key={course.skill}
          />
        ))}
      </div>
    </section>
  );
}

function CourseCard({ course, hasDatabaseProgress }) {
  const Icon = ICONS_BY_KEY[course.icon] || Code2;

  return (
    <article
      className={`course-card ${hasDatabaseProgress ? "" : "no-data-card"}`}
      style={{
        "--accent": course.accent,
        "--accent-rgb": course.accent_rgb,
        "--progress": hasDatabaseProgress ? `${course.progress_percent}%` : "0%",
      }}
    >
      <div className="course-icon">
        <Icon size={26} />
      </div>
      <div className="course-heading">
        <span>{course.title}</span>
        <h3>{course.skill}</h3>
      </div>
      <p>
        {hasDatabaseProgress
          ? course.summary
          : "No database data. Backend failed to fetch this progress record."}
      </p>
      <div
        className="course-meter"
        aria-label={
          hasDatabaseProgress
            ? `${course.skill} ${course.progress_percent}% complete`
            : `${course.skill} has no progress data`
        }
      >
        <span />
      </div>
      <div className="course-footer">
        <strong>{hasDatabaseProgress ? `${course.progress_percent}%` : "No data"}</strong>
        <span>{hasDatabaseProgress ? course.status_label : "Backend offline"}</span>
      </div>
    </article>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ArchitectureFlow({ backendAvailable }) {
  const items = [
    { label: "React Frontend", icon: <Code2 />, status: "Healthy" },
    {
      label: "FastAPI Backend",
      icon: <ServerCog />,
      status: backendAvailable ? "Healthy" : "Unavailable",
      unavailable: !backendAvailable,
    },
    {
      label: "PostgreSQL",
      icon: <Database />,
      status: backendAvailable ? "Healthy" : "No data",
      unavailable: !backendAvailable,
    },
  ];

  return (
    <div className="architecture-flow">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <div className={`architecture-node ${item.unavailable ? "unavailable-node" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
            <strong>{item.status}</strong>
          </div>
          {index < items.length - 1 ? <ArrowDown className="connector-arrow" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function StatusCard({ icon, name, stack, status, unavailable = false }) {
  return (
    <article className={`status-card ${unavailable ? "unavailable-card" : ""}`}>
      <div className="status-icon">{icon}</div>
      <div>
        <h3>{name}</h3>
        <p>{stack}</p>
        <span>
          <i aria-hidden="true" />
          Status: {status}
        </span>
      </div>
    </article>
  );
}

function StudentInfo({ profile }) {
  const rows = [
    ["Username", profile?.username],
    ["Role", profile?.role],
  ];

  return (
    <div className="student-card">
      <div className="student-avatar">
        <UserRound size={28} />
      </div>
      <div className="student-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersPanel({ users, loading, error }) {
  if (loading) {
    return <div className="users-state">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="permission-state">
        <div>
          <ShieldX size={28} />
        </div>
        <div>
          <strong>{error}</strong>
          <span>This area is available only for admin users.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="users-table" role="table" aria-label="Application users">
      <div className="users-row users-head" role="row">
        <span role="columnheader">ID</span>
        <span role="columnheader">Username</span>
        <span role="columnheader">Role</span>
        <span role="columnheader">Created</span>
      </div>
      {users.map((user) => (
        <div className="users-row" key={user.id} role="row">
          <span role="cell">#{user.id}</span>
          <strong role="cell">{user.username}</strong>
          <span className="role-pill" role="cell">
            {user.role}
          </span>
          <span role="cell">{new Date(user.created_at).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
