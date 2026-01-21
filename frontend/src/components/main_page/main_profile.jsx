import React, { useEffect, useMemo, useState } from "react";

const DIARIES_KEY = "kicklog.diary.items.v1";
const FOLDERS_KEY = "kicklog.diary.folders.v1";
const ACTIVE_DIARY_KEY = "kicklog.diary.activeId.v1";
const RECENT_DIARIES_KEY = "kicklog.diary.recent.v1";

const safeParseJSON = (raw, fallback) => {
	try {
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
};

const loadDiaries = () => {
	const list = safeParseJSON(window.localStorage.getItem(DIARIES_KEY), []);
	if (!Array.isArray(list)) return [];
	return list
		.filter((d) => d && typeof d === "object")
		.map((d) => ({
			id: typeof d.id === "string" ? d.id : String(d.createdAt ?? ""),
			name: typeof d.name === "string" ? d.name : "Untitled",
			folderId: typeof d.folderId === "string" ? d.folderId : null,
			createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
		}))
		.filter((d) => d.id);
};

const loadFolders = () => {
	const list = safeParseJSON(window.localStorage.getItem(FOLDERS_KEY), []);
	if (!Array.isArray(list)) return [];
	return list
		.filter((f) => f && typeof f === "object")
		.map((f) => ({
			id: typeof f.id === "string" ? f.id : String(f.createdAt ?? ""),
			name: typeof f.name === "string" ? f.name : "Untitled",
		}))
		.filter((f) => f.id);
};

const loadRecentDiaryLog = () => {
	const list = safeParseJSON(window.localStorage.getItem(RECENT_DIARIES_KEY), []);
	if (!Array.isArray(list)) return [];
	return list
		.filter((x) => x && typeof x === "object")
		.map((x) => ({ id: String(x.id ?? ""), at: typeof x.at === "number" ? x.at : 0 }))
		.filter((x) => x.id);
};

const formatWhen = (ms) => {
	if (!ms) return "—";
	try {
		return new Date(ms).toLocaleString();
	} catch {
		return "—";
	}
};

const readToken = () => {
	try {
		return localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
	} catch {
		return "";
	}
};

const decodeJwtPayload = (token) => {
	const parts = (token || "").split(".");
	if (parts.length < 2) return null;
	try {
		const base64Url = parts[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
		return JSON.parse(atob(padded));
	} catch {
		return null;
	}
};

const formatExp = (expSeconds) => {
	if (!expSeconds) return "—";
	try {
		return new Date(expSeconds * 1000).toLocaleString();
	} catch {
		return "—";
	}
};

export default function MainProfile({ darkMode }) {
	const { token, payload } = useMemo(() => {
		const t = readToken();
		return { token: t, payload: t ? decodeJwtPayload(t) : null };
	}, []);

	const [diaries, setDiaries] = useState([]);
	const [folders, setFolders] = useState([]);
	const [recentLog, setRecentLog] = useState([]);
	const [activeDiaryId, setActiveDiaryId] = useState("");

	useEffect(() => {
		const refresh = () => {
			try {
				setDiaries(loadDiaries());
				setFolders(loadFolders());
				setRecentLog(loadRecentDiaryLog());
				setActiveDiaryId(String(window.localStorage.getItem(ACTIVE_DIARY_KEY) || ""));
			} catch {
				// ignore
			}
		};
		refresh();
		window.addEventListener("kicklog:diariesChanged", refresh);
		window.addEventListener("kicklog:foldersChanged", refresh);
		window.addEventListener("kicklog:recentDiariesChanged", refresh);
		return () => {
			window.removeEventListener("kicklog:diariesChanged", refresh);
			window.removeEventListener("kicklog:foldersChanged", refresh);
			window.removeEventListener("kicklog:recentDiariesChanged", refresh);
		};
	}, []);

	const username = payload?.username || payload?.name || "User";
	const email = payload?.email || "—";

	const folderNameById = useMemo(() => {
		const m = new Map();
		folders.forEach((f) => m.set(f.id, f.name));
		return m;
	}, [folders]);

	const recentDiaries = useMemo(() => {
		const byId = new Map(diaries.map((d) => [String(d.id), d]));
		const fromLog = recentLog
			.map((x) => ({ diary: byId.get(String(x.id)) || null, at: x.at }))
			.filter((x) => x.diary);

		if (fromLog.length > 0) return fromLog.slice(0, 8);

		// Fallback: show active diary first, then latest created.
		const active = activeDiaryId ? byId.get(String(activeDiaryId)) : null;
		const rest = diaries
			.filter((d) => String(d.id) !== String(activeDiaryId))
			.slice()
			.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
			.slice(0, 7)
			.map((d) => ({ diary: d, at: 0 }));
		return (active ? [{ diary: active, at: 0 }] : []).concat(rest);
	}, [diaries, recentLog, activeDiaryId]);

	const initials = useMemo(() => {
		const base = String(username || "").trim();
		if (!base) return "U";
		const parts = base.split(/\s+/).filter(Boolean);
		const a = parts[0]?.[0] || "U";
		const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
		return (a + b).toUpperCase();
	}, [username]);

	const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
	const [pwStatus, setPwStatus] = useState({ type: "idle", message: "" });

	const submitChangePassword = async (e) => {
		e.preventDefault();
		setPwStatus({ type: "idle", message: "" });

		if (!token) {
			setPwStatus({ type: "error", message: "You are not signed in." });
			return;
		}
		if (!pw.current || !pw.next) {
			setPwStatus({ type: "error", message: "Fill current + new password." });
			return;
		}
		if (pw.next.length < 8) {
			setPwStatus({ type: "error", message: "New password must be at least 8 characters." });
			return;
		}
		if (pw.next !== pw.confirm) {
			setPwStatus({ type: "error", message: "Passwords do not match." });
			return;
		}

		setPwStatus({ type: "loading", message: "Changing password…" });
		try {
			const res = await fetch("http://localhost:5000/api/users/change-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setPwStatus({ type: "error", message: data?.message || "Failed to change password." });
				return;
			}
			setPwStatus({ type: "success", message: data?.message || "Password changed." });
			setPw({ current: "", next: "", confirm: "" });
		} catch {
			setPwStatus({ type: "error", message: "Network error." });
		}
	};

	return (
		<div className="h-full w-full min-h-0 p-2 sm:p-4">
			<style>{`
				.kl-prof-shell{height:100%;width:100%;min-height:0;border-radius:28px;overflow:hidden;position:relative}
				.kl-prof-shell:before{content:"";position:absolute;inset:-2px;background:
					radial-gradient(1200px 520px at 16% 6%, rgba(34,197,94,.30), transparent 60%),
					radial-gradient(900px 520px at 82% 12%, rgba(16,185,129,.22), transparent 62%),
					radial-gradient(900px 720px at 60% 72%, rgba(34,197,94,.18), transparent 64%);
					filter:blur(0px);pointer-events:none}
				.kl-prof-inner{position:relative;height:100%;min-height:0;width:100%;padding:18px;border-radius:28px;border:1px solid rgba(15,23,42,.10);background:color-mix(in srgb, #ffffff 86%, rgba(187,247,208,.25));backdrop-filter:blur(12px);
					box-shadow:0 22px 64px rgba(15,23,42,.10)}
				.kl-prof-inner.dark{border:1px solid rgba(255,255,255,.10);background:color-mix(in srgb, #0b1220 88%, rgba(34,197,94,.16));box-shadow:0 22px 64px rgba(0,0,0,.38)}
				.kl-prof-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
				.kl-prof-id{display:flex;align-items:center;gap:14px;min-width:0}
				.kl-prof-avatar{height:50px;width:50px;border-radius:18px;display:grid;place-items:center;font-weight:950;letter-spacing:.04em;
					background:linear-gradient(135deg, rgba(34,197,94,.95), rgba(16,185,129,.70));color:white;
					box-shadow:0 10px 30px rgba(34,197,94,.32)}
				.kl-prof-name{font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
				.kl-prof-sub{margin-top:6px;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86}
				.kl-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-weight:900;font-size:12px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.65)}
				.kl-prof-inner.dark .kl-pill{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
				.kl-dot{height:10px;width:10px;border-radius:999px;background:rgba(34,197,94,.95);box-shadow:0 0 0 4px rgba(34,197,94,.18)}
				.kl-prof-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
				.kl-btn{border-radius:999px;padding:10px 14px;font-weight:950;font-size:13px;border:1px solid rgba(15,23,42,.14);background:rgba(255,255,255,.75);color:rgba(15,23,42,.92);transition:transform .12s ease, box-shadow .12s ease, background-color .12s ease}
				.kl-btn:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(15,23,42,.10)}
				.kl-btn.primary{border:none;background:linear-gradient(135deg, rgba(34,197,94,.98), rgba(16,185,129,.92));color:white;box-shadow:0 14px 34px rgba(34,197,94,.28)}
				.kl-btn.primary:hover{box-shadow:0 18px 44px rgba(34,197,94,.34)}
				.kl-prof-inner.dark .kl-btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92)}
				.kl-prof-inner.dark .kl-btn.primary{border:none;color:white}
				.kl-grid{margin-top:16px;display:grid;gap:12px;grid-template-columns:1fr}
				@media (min-width: 860px){.kl-grid{grid-template-columns:1.2fr .8fr}}
				.kl-card{border-radius:22px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.70);backdrop-filter:blur(12px);padding:16px;min-height:0}
				.kl-prof-inner.dark .kl-card{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05)}
				.kl-cardTitle{font-weight:950;font-size:14px;letter-spacing:.12em;text-transform:uppercase;opacity:.82}
				.kl-value{margin-top:8px;font-weight:950;font-size:16px}
				.kl-muted{margin-top:6px;font-weight:800;font-size:12px;opacity:.78}
				.kl-list{margin-top:10px;display:grid;gap:10px}
				.kl-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px 12px;border-radius:16px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.55)}
				.kl-prof-inner.dark .kl-item{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04)}
				.kl-itemName{font-weight:950}
				.kl-itemMeta{margin-top:4px;font-weight:800;font-size:12px;opacity:.78}
				.kl-tag{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-weight:950;font-size:12px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.75)}
				.kl-prof-inner.dark .kl-tag{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
				.kl-input{width:100%;border-radius:14px;border:1px solid rgba(15,23,42,.14);padding:11px 12px;font-weight:900;outline:none;background:rgba(255,255,255,.75);color:rgba(15,23,42,.92)}
				.kl-prof-inner.dark .kl-input{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92)}
				.kl-banner{margin-top:12px;border-radius:16px;padding:10px 12px;font-weight:900;font-size:13px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.65)}
				.kl-prof-inner.dark .kl-banner{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
				.kl-banner.ok{border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.10)}
				.kl-banner.err{border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.10)}
				.kl-stats{display:grid;grid-template-columns:1fr;gap:12px}
				@media (min-width: 640px){.kl-stats{grid-template-columns:1fr 1fr}}
				@media (min-width: 980px){.kl-stats{grid-template-columns:1fr 1fr 1fr}}
			`}</style>

			<div className="kl-prof-shell">
				<div className={["kl-prof-inner", darkMode ? "dark" : ""].join(" ")}
					style={{
						color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
					}}
				>
					<div className="kl-prof-top">
						<div className="kl-prof-id">
							<div className="kl-prof-avatar" aria-hidden="true">{initials}</div>
							<div style={{ minWidth: 0 }}>
								<div className="kl-prof-name">{username}</div>
								<div className="kl-prof-sub">Profile overview</div>
							</div>
						</div>

						<div className="kl-prof-actions">
							<div className="kl-pill" title="Authentication status">
								<span className="kl-dot" />
								{token ? "Authenticated" : "No token"}
							</div>
							<button
								type="button"
								onClick={() => {
									try {
										localStorage.removeItem("token");
										localStorage.removeItem("accessToken");
									} catch {}
									window.location.href = "/auth";
								}}
								className="kl-btn"
							>
								Log out
							</button>
						</div>
					</div>

					<div className="kl-grid">
						<div className="kl-card">
							<div className="kl-stats">
								<div className="kl-card" style={{ padding: 16 }}>
									<div className="kl-cardTitle">Email</div>
									<div className="kl-value">{email}</div>
									<div className="kl-muted">Used for sign-in + account recovery.</div>
								</div>

								<div className="kl-card" style={{ padding: 16 }}>
									<div className="kl-cardTitle">Diaries</div>
									<div className="kl-value">{diaries.length}</div>
									<div className="kl-muted">Your notebooks and logs.</div>
								</div>
							</div>

							<div style={{ marginTop: 12 }}>
								<div className="kl-cardTitle">Recent diaries</div>
								<div className="kl-list">
									{recentDiaries.length === 0 ? (
										<div className="kl-muted">No diaries yet.</div>
									) : (
										recentDiaries.map(({ diary, at }) => {
											const isActive = String(diary.id) === String(activeDiaryId);
											const folderName = diary.folderId ? folderNameById.get(diary.folderId) : "Unfiled";
											return (
												<div key={diary.id} className="kl-item">
													<div style={{ minWidth: 0 }}>
														<div className="kl-itemName" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
															{diary.name}
														</div>
														<div className="kl-itemMeta">
															{folderName}{at ? ` • opened ${formatWhen(at)}` : isActive ? " • active" : ""}
														</div>
													</div>
													{isActive ? <div className="kl-tag">Active</div> : null}
												</div>
											);
										})
									)}
								</div>
							</div>
						</div>

						<div className="kl-card">
							<div className="kl-cardTitle">Change password</div>
							<div className="kl-muted" style={{ marginTop: 8 }}>
								Update your account password securely.
							</div>
							<form onSubmit={submitChangePassword} style={{ marginTop: 12, display: "grid", gap: 10 }}>
								<input
									type="password"
									value={pw.current}
									onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
									placeholder="Current password"
									className="kl-input"
									autoComplete="current-password"
									disabled={!token || pwStatus.type === "loading"}
								/>
								<input
									type="password"
									value={pw.next}
									onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
									placeholder="New password (min 8 chars)"
									className="kl-input"
									autoComplete="new-password"
									disabled={!token || pwStatus.type === "loading"}
								/>
								<input
									type="password"
									value={pw.confirm}
									onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
									placeholder="Confirm new password"
									className="kl-input"
									autoComplete="new-password"
									disabled={!token || pwStatus.type === "loading"}
								/>
								<div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
									<button type="submit" className="kl-btn primary" disabled={!token || pwStatus.type === "loading"}>
										{pwStatus.type === "loading" ? "Working…" : "Update password"}
									</button>
									<button
										type="button"
										onClick={() => setPw({ current: "", next: "", confirm: "" })}
										className="kl-btn"
										disabled={pwStatus.type === "loading"}
									>
										Clear
									</button>
								</div>
							</form>
							{pwStatus.message ? (
								<div className={["kl-banner", pwStatus.type === "success" ? "ok" : pwStatus.type === "error" ? "err" : ""].join(" ")}>
									{pwStatus.message}
								</div>
							) : null}
							{!token ? <div className="kl-muted" style={{ marginTop: 10 }}>Sign in to change password.</div> : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

