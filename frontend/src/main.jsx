import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  BadgeCheck,
  Cloud,
  Code2,
  Container,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  LogOut,
  ServerCog,
  ShieldCheck,
  ShieldX,
  UserRound,
  UsersRound,
} from "lucide-react";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "nextkode_deploylab_token";

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Request failed. Please try again.");
  }

  return data;
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    const onRouteChange = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onRouteChange);
    return () => window.removeEventListener("popstate", onRouteChange);
  }, []);

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
        <Dashboard onLogout={handleLogout} />
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
      setError(requestError.message);
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

function Dashboard({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [statuses, setStatuses] = useState([]);
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
      try {
        const [profileData, statusData] = await Promise.all([
          apiRequest("/api/user/profile"),
          apiRequest("/api/deployment/status"),
        ]);

        if (active) {
          setProfile(profileData);
          setStatuses(statusData);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
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
              <p className="eyebrow">Deployment Verified</p>
              <h1>Next Kode School Lab</h1>
              <p>Welcome, {profile?.username}</p>
            </div>
            <span className="verified-badge">
              <BadgeCheck size={18} />
              Production Ready
            </span>
          </header>

          <section className="success-card">
            <div className="success-icon">
              <BadgeCheck size={34} />
            </div>
            <div className="success-copy">
              <p className="eyebrow">All Services Online</p>
              <h2>Awesome!</h2>
              <strong>You have Successfully Deployed the Application!</strong>
              <p>Frontend, Backend and Database are Connected Successfully.</p>
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
              <ArchitectureFlow />
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
                status={statusByComponent.Frontend?.status || "Running"}
              />
              <StatusCard
                icon={<ServerCog />}
                name="Backend"
                stack="Python + FastAPI"
                status={statusByComponent.Backend?.status || "Connected"}
              />
              <StatusCard
                icon={<Database />}
                name="Database"
                stack="PostgreSQL"
                status={statusByComponent.PostgreSQL?.status || "Connected"}
              />
            </div>
          </Panel>
        </>
      )}
    </section>
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

function ArchitectureFlow() {
  const items = [
    { label: "React Frontend", icon: <Code2 /> },
    { label: "FastAPI Backend", icon: <ServerCog /> },
    { label: "PostgreSQL", icon: <Database /> },
  ];

  return (
    <div className="architecture-flow">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <div className="architecture-node">
            {item.icon}
            <span>{item.label}</span>
            <strong>Healthy</strong>
          </div>
          {index < items.length - 1 ? <ArrowDown className="connector-arrow" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function StatusCard({ icon, name, stack, status }) {
  return (
    <article className="status-card">
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
