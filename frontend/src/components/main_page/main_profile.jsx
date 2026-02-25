import React, { useEffect, useMemo, useState } from "react";

const DIARIES_KEY = "kicklog.diary.items.v1";
const ENTRIES_PREFIX = "kicklog.diary.entries.v1:";
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

const entriesKey = (diaryId) => `${ENTRIES_PREFIX}${String(diaryId ?? "")}`;

const todayISO = () => {
	const d = new Date();
	const yyyy = String(d.getFullYear());
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const addDaysISO = (iso, days) => {
	const [y, m, d] = String(iso ?? "").split("-").map((x) => Number(x));
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return todayISO();
	const dt = new Date(y, m - 1, d);
	dt.setDate(dt.getDate() + Number(days));
	const yyyy = String(dt.getFullYear());
	const mm = String(dt.getMonth() + 1).padStart(2, "0");
	const dd = String(dt.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

const isISODate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const maxLoggedISODate = (entries) => {
	let max = todayISO();
	(entries ?? []).forEach((e) => {
		const d = e?.date;
		if (!isISODate(d)) return;
		if (d > max) max = d;
	});
	return max;
};

const normalizeEntries = (value) => {
	if (!Array.isArray(value)) return [];
	return value
		.filter((e) => e && typeof e === "object")
		.map((e) => ({
			id: typeof e.id === "string" ? e.id : String(e.createdAt ?? Date.now()),
			type: e.type === "match" ? "match" : "practice",
			date: typeof e.date === "string" ? e.date : todayISO(),
			createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
			updatedAt:
				typeof e.updatedAt === "number"
					? e.updatedAt
					: typeof e.createdAt === "number"
						? e.createdAt
						: Date.now(),
			durationMin: typeof e.durationMin === "number" ? e.durationMin : 0,
			rpe: typeof e.rpe === "number" ? e.rpe : 0,
			minutes: typeof e.minutes === "number" ? e.minutes : 0,
			goals: typeof e.goals === "number" ? e.goals : 0,
			assists: typeof e.assists === "number" ? e.assists : 0,
		}))
		.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

const loadAllEntriesForDiaries = (diaries) => {
	const all = [];
	(diaries ?? []).forEach((d) => {
		const raw = safeParseJSON(window.localStorage.getItem(entriesKey(d.id)), []);
		const entries = normalizeEntries(raw);
		entries.forEach((e) => all.push(e));
	});
	return all;
};

const makeLastNDaysSeries = (entries, nDays, metricKey) => {
	const n = Math.max(7, Math.min(180, Number(nDays) || 30));
	const end = maxLoggedISODate(entries);
	const start = addDaysISO(end, -(n - 1));
	const buckets = new Map();
	for (let i = 0; i < n; i += 1) {
		const date = addDaysISO(start, i);
		buckets.set(date, 0);
	}

	(entries ?? []).forEach((e) => {
		if (!e || typeof e !== "object") return;
		const date = typeof e.date === "string" ? e.date : null;
		if (!date || !buckets.has(date)) return;
		let v = 0;
		if (metricKey === "sessions") v = 1;
		else if (metricKey === "load") {
			v = e.type === "practice" ? (Number(e.durationMin) || 0) * (Number(e.rpe) || 0) : Number(e.minutes) || 0;
		} else if (metricKey === "minutes") {
			v = e.type === "match" ? Number(e.minutes) || 0 : Number(e.durationMin) || 0;
		} else if (metricKey === "g+a") {
			v = e.type === "match" ? (Number(e.goals) || 0) + (Number(e.assists) || 0) : 0;
		}
		buckets.set(date, (buckets.get(date) || 0) + v);
	});

	return Array.from(buckets.entries()).map(([date, value]) => ({ date, value }));
};

const makePolylinePoints = (series, w, h, pad) => {
	const pts = (series ?? []).map((p) => Number(p.value) || 0);
	const max = Math.max(1, ...pts);
	const min = Math.min(0, ...pts);
	const usableW = Math.max(10, w - pad * 2);
	const usableH = Math.max(10, h - pad * 2);
	return (series ?? [])
		.map((p, idx) => {
			const x = pad + (idx / Math.max(1, series.length - 1)) * usableW;
			const t = (Number(p.value) || 0) - min;
			const denom = max - min;
			const y = pad + usableH - (denom ? (t / denom) * usableH : 0);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(" ");
};

function Sparkline({ id, series, width = 320, height = 96, pad = 10, label = "", unit = "" }) {
	const [hoverIdx, setHoverIdx] = useState(null);
	const safeId = useMemo(() => {
		const raw = String(id || "kl-spark");
		return raw.replace(/[^a-zA-Z0-9_-]/g, "-");
	}, [id]);
	const pts = useMemo(() => makePolylinePoints(series, width, height, pad), [series, width, height, pad]);

	const onMove = (e) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const xCss = e.clientX - rect.left;
		const scaleX = rect.width ? width / rect.width : 1;
		const x = xCss * scaleX;
		const usableW = Math.max(10, width - pad * 2);
		const t = (x - pad) / usableW;
		const idx = Math.round(Math.max(0, Math.min(1, t)) * Math.max(0, (series?.length || 1) - 1));
		setHoverIdx(idx);
	};
	const onLeave = () => setHoverIdx(null);

	const point = hoverIdx == null ? null : series?.[hoverIdx] || null;
	return (
		<div className="kl-pulse-spark">
			<svg
				className="kl-pulse-sparkSvg"
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				onMouseMove={onMove}
				onMouseLeave={onLeave}
				role="img"
				aria-label={label}
			>
				<defs>
					<linearGradient id={`${safeId}-fill`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="var(--accent-green)" stopOpacity="0.28" />
						<stop offset="1" stopColor="transparent" />
					</linearGradient>
				</defs>
				<polyline className="kl-pulse-line" points={pts} fill="none" />
				<polyline
					className="kl-pulse-area"
					points={`${pts} ${width - pad},${height - pad} ${pad},${height - pad}`}
					fill={`url(#${safeId}-fill)`}
					opacity="0.95"
				/>
				{point && (
					<g>
						<circle
							className="kl-pulse-dot"
							r={4}
							cx={pad + (hoverIdx / Math.max(1, series.length - 1)) * (width - pad * 2)}
							cy={(() => {
								const values = (series ?? []).map((p) => Number(p.value) || 0);
								const max = Math.max(1, ...values);
								const min = Math.min(0, ...values);
								const denom = max - min;
								const usableH = Math.max(10, height - pad * 2);
								const t = (Number(point.value) || 0) - min;
								return pad + usableH - (denom ? (t / denom) * usableH : 0);
							})()}
						/>
					</g>
				)}
			</svg>
			<div className="kl-pulse-meta">
				{point ? (
					<>
						<span className="kl-pulse-date">{point.date}</span>
						<span className="kl-pulse-val">
							{Number(point.value || 0).toFixed(0)}
							{unit}
						</span>
					</>
				) : (
					<>
						<span className="kl-pulse-date">Hover the graph</span>
						<span className="kl-pulse-val">—</span>
					</>
				)}
			</div>
		</div>
	);
}

function ProgressPulseCard() {
	const [metric, setMetric] = useState("sessions");
	const [snap, setSnap] = useState({ diaries: 0, entries: 0, streak: 0, last7: 0, series: [] });
	const [animKey, setAnimKey] = useState(0);

	useEffect(() => {
		const refresh = () => {
			try {
				const diaries = loadDiaries();
				const entries = loadAllEntriesForDiaries(diaries);
				const series = makeLastNDaysSeries(entries, 21, metric);
				const sessions7 = makeLastNDaysSeries(entries, 7, "sessions");
				const last7 = sessions7.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

				const sessionDates = new Set(
					entries
						.filter((e) => e && isISODate(e.date))
						.map((e) => e.date)
				);
				let streak = 0;
				let d = todayISO();
				for (let i = 0; i < 365; i += 1) {
					if (!sessionDates.has(d)) break;
					streak += 1;
					d = addDaysISO(d, -1);
				}

				setSnap({ diaries: diaries.length, entries: entries.length, streak, last7, series });
				setAnimKey((k) => k + 1);
			} catch {
				// ignore
			}
		};

		refresh();
		window.addEventListener("kicklog:diariesChanged", refresh);
		window.addEventListener("kicklog:diaryEntriesChanged", refresh);
		window.addEventListener("storage", refresh);
		return () => {
			window.removeEventListener("kicklog:diariesChanged", refresh);
			window.removeEventListener("kicklog:diaryEntriesChanged", refresh);
			window.removeEventListener("storage", refresh);
		};
	}, [metric]);

	const metrics = useMemo(
		() => [
			{ key: "sessions", label: "Sessions", unit: "" },
			{ key: "load", label: "Load", unit: "" },
			{ key: "minutes", label: "Minutes", unit: "m" },
			{ key: "g+a", label: "G + A", unit: "" },
		],
		[]
	);
	const active = metrics.find((m) => m.key === metric) ?? metrics[0];

	return (
		<div className="kl-card kl-pulse-card" role="region" aria-label="Progress pulse">
			<div className="kl-pulse-head">
				<div className="kl-cardTitle">Progress pulse</div>
				<div className="kl-pulse-tag">Last 21 days</div>
			</div>

			<div className="kl-pulse-chips">
				<div className="kl-pulse-chip">
					<div className="kl-pulse-num">{snap.diaries}</div>
					<div className="kl-pulse-lbl">Diaries</div>
				</div>
				<div className="kl-pulse-chip">
					<div className="kl-pulse-num">{snap.entries}</div>
					<div className="kl-pulse-lbl">Entries</div>
				</div>
				<div className="kl-pulse-chip">
					<div className="kl-pulse-num">{snap.streak}</div>
					<div className="kl-pulse-lbl">Day streak</div>
				</div>
				<div className="kl-pulse-chip">
					<div className="kl-pulse-num">{snap.last7}</div>
					<div className="kl-pulse-lbl">Last 7 sessions</div>
				</div>
			</div>

			<div className="kl-pulse-tabs" role="tablist" aria-label="Progress metrics">
				{metrics.map((m) => {
					const isOn = m.key === metric;
					return (
						<button
							key={m.key}
							type="button"
							role="tab"
							aria-selected={isOn}
							className={["kl-pulse-tab", isOn ? "is-active" : ""].join(" ")}
							onClick={() => setMetric(m.key)}
						>
							{m.label}
						</button>
					);
				})}
			</div>

			<div className="kl-pulse-graph" key={`g-${metric}-${animKey}`}>
				<Sparkline id={`kl-prof-${metric}`} series={snap.series} label={`${active.label} graph`} unit={active.unit} />
			</div>
		</div>
	);
}

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

const THEME_STORAGE_KEY = "kicklog.theme.v1";

const TEXT_STORAGE_KEY = "kicklog.text.v1";
const DEFAULT_TEXT_PREFS = { contrast: "normal", font: "default" }; // contrast: normal|high, font: default|mono

const DEFAULT_THEME = {
	presetId: "default",
	primary: "#16a34a",
	secondary: "#bbf7d0",
};

const normalizeHex = (value, fallback) => {
	const v = String(value || "").trim();
	if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
	return fallback;
};

const hexToRgbTriplet = (hex, fallbackTriplet) => {
	const v = normalizeHex(hex, "");
	if (!v) return fallbackTriplet;
	const r = Number.parseInt(v.slice(1, 3), 16);
	const g = Number.parseInt(v.slice(3, 5), 16);
	const b = Number.parseInt(v.slice(5, 7), 16);
	if (![r, g, b].every((n) => Number.isFinite(n))) return fallbackTriplet;
	return `${r},${g},${b}`;
};

const readStoredTheme = () => {
	try {
		const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
		const parsed = safeParseJSON(raw, null);
		if (!parsed || typeof parsed !== "object") return DEFAULT_THEME;
		const presetId = typeof parsed.presetId === "string" ? parsed.presetId : DEFAULT_THEME.presetId;
		const primary = normalizeHex(parsed.primary, DEFAULT_THEME.primary);
		const secondary = normalizeHex(parsed.secondary, DEFAULT_THEME.secondary);
		return { presetId, primary, secondary };
	} catch {
		return DEFAULT_THEME;
	}
};

const readStoredTextPrefs = () => {
	try {
		const raw = window.localStorage.getItem(TEXT_STORAGE_KEY);
		const parsed = safeParseJSON(raw, null);
		if (!parsed || typeof parsed !== "object") return DEFAULT_TEXT_PREFS;
		const contrast = parsed.contrast === "high" ? "high" : "normal";
		const font = parsed.font === "mono" ? "mono" : "default";
		return { contrast, font };
	} catch {
		return DEFAULT_TEXT_PREFS;
	}
};

const saveTextPrefs = (nextPrefs) => {
	try {
		window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(nextPrefs));
	} catch {
		// ignore
	}
	window.dispatchEvent(new Event("kicklog:textChanged"));
};

const applyThemeVars = (theme) => {
	try {
		const root = document.documentElement;
		const primary = theme?.primary || DEFAULT_THEME.primary;
		const secondary = theme?.secondary || DEFAULT_THEME.secondary;
		root.style.setProperty("--accent-green", primary);
		root.style.setProperty("--accent-green-soft", secondary);
		root.style.setProperty("--accent-green-rgb", hexToRgbTriplet(primary, "22,163,74"));
		root.style.setProperty("--accent-green-soft-rgb", hexToRgbTriplet(secondary, "187,247,208"));
		window.dispatchEvent(new Event("kicklog:themeChanged"));
	} catch {
		// ignore
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

	const motives = useMemo(
		() => [
			{ id: "default", name: "Default", primary: "#16a34a", secondary: "#bbf7d0" },
			{ id: "ocean", name: "Ocean Blue", primary: "#2563eb", secondary: "#7dd3fc" },
			{ id: "purple", name: "Purple", primary: "#7c3aed", secondary: "#c4b5fd" },
			{ id: "pink", name: "Pink", primary: "#db2777", secondary: "#fbcfe8" },
			{ id: "orange", name: "Orange", primary: "#f97316", secondary: "#fed7aa" },
			{ id: "teal", name: "Teal", primary: "#0d9488", secondary: "#99f6e4" },
			{ id: "peach", name: "Peach", primary: "#fb7185", secondary: "#fed7aa" },
		],
		[]
	);

	const [themeDraft, setThemeDraft] = useState(() => readStoredTheme());
	const [themeSaved, setThemeSaved] = useState(false);
	const [textPrefs, setTextPrefs] = useState(() => readStoredTextPrefs());

	useEffect(() => {
		// Preview changes live.
		applyThemeVars(themeDraft);
	}, [themeDraft]);

	useEffect(() => {
		const refresh = () => setTextPrefs(readStoredTextPrefs());
		window.addEventListener("kicklog:textChanged", refresh);
		window.addEventListener("storage", refresh);
		return () => {
			window.removeEventListener("kicklog:textChanged", refresh);
			window.removeEventListener("storage", refresh);
		};
	}, []);

	const pickPreset = (presetId) => {
		const p = motives.find((m) => m.id === presetId);
		if (!p) {
			setThemeDraft((t) => ({ ...t, presetId: "custom" }));
			return;
		}
		setThemeDraft({ presetId: p.id, primary: p.primary, secondary: p.secondary });
	};

	const saveTheme = () => {
		try {
			const next = {
				presetId: String(themeDraft.presetId || "custom"),
				primary: normalizeHex(themeDraft.primary, DEFAULT_THEME.primary),
				secondary: normalizeHex(themeDraft.secondary, DEFAULT_THEME.secondary),
			};
			window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
			applyThemeVars(next);
			setThemeSaved(true);
			window.setTimeout(() => setThemeSaved(false), 1200);
		} catch {
			// ignore
		}
	};

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
				.kl-prof-shell{height:100%;width:100%;min-height:0;border-radius:28px;overflow:hidden;position:relative;contain:paint}
				.kl-prof-shell:before{content:"";position:absolute;inset:-2px;background:
					radial-gradient(1200px 520px at 16% 6%, rgba(var(--accent-green-rgb, 22,163,74), .30), transparent 60%),
					radial-gradient(900px 520px at 82% 12%, rgba(var(--accent-green-soft-rgb, 187,247,208), .20), transparent 62%),
					radial-gradient(900px 720px at 60% 72%, rgba(var(--accent-green-rgb, 22,163,74), .18), transparent 64%);
					filter:blur(0px);pointer-events:none}
				.kl-prof-inner{position:relative;height:100%;min-height:0;width:100%;padding:18px;border-radius:28px;border:1px solid rgba(15,23,42,.10);background:color-mix(in srgb, #ffffff 86%, rgba(var(--accent-green-soft-rgb, 187,247,208), .25));
					box-shadow:0 22px 64px rgba(15,23,42,.10)}
				.kl-prof-inner.dark{border:1px solid rgba(255,255,255,.10);background:color-mix(in srgb, var(--kl-bg, #0b1220) 92%, var(--accent-green) 8%);box-shadow:0 22px 64px rgba(0,0,0,.38)}
				.kl-prof-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
				.kl-prof-id{display:flex;align-items:center;gap:14px;min-width:0}
				.kl-prof-avatar{height:50px;width:50px;border-radius:18px;display:grid;place-items:center;font-weight:950;letter-spacing:.04em;
					background:linear-gradient(135deg, var(--accent-green), color-mix(in srgb, var(--accent-green) 62%, var(--accent-green-soft)));color:white;
					box-shadow:0 10px 30px rgba(var(--accent-green-rgb, 22,163,74), .32)}
				.kl-prof-name{font-size:30px;line-height:1.05;font-weight:950;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
				.kl-prof-sub{margin-top:6px;font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.86}
				.kl-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-weight:900;font-size:12px;border:1px solid rgba(15,23,42,.12);background:rgba(255,255,255,.65)}
				.kl-prof-inner.dark .kl-pill{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06)}
				.kl-dot{height:10px;width:10px;border-radius:999px;background:var(--accent-green);box-shadow:0 0 0 4px rgba(var(--accent-green-rgb, 22,163,74), .18)}
				.kl-prof-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
				.kl-btn{border-radius:999px;padding:10px 14px;font-weight:950;font-size:13px;border:1px solid rgba(15,23,42,.14);background:rgba(255,255,255,.75);color:rgba(15,23,42,.92);translate:0 0;scale:1;will-change:translate, box-shadow, background-color, filter;transition:translate .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s cubic-bezier(.2,.8,.2,1), background-color .22s cubic-bezier(.2,.8,.2,1), filter .22s cubic-bezier(.2,.8,.2,1)}
				.kl-btn:hover{translate:0 -1px;box-shadow:0 14px 28px rgba(15,23,42,.10);filter:brightness(1.02)}
				.kl-btn.primary{border:none;background:linear-gradient(135deg, var(--accent-green), color-mix(in srgb, var(--accent-green) 70%, var(--accent-green-soft)));color:white;box-shadow:0 14px 34px rgba(var(--accent-green-rgb, 22,163,74), .28)}
				.kl-btn.primary:hover{box-shadow:0 18px 44px rgba(var(--accent-green-rgb, 22,163,74), .34);filter:brightness(1.03)}
				.kl-prof-inner.dark .kl-btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92)}
				.kl-prof-inner.dark .kl-btn.primary{border:none;color:white}
				.kl-grid{margin-top:16px;display:grid;gap:12px;grid-template-columns:1fr}
				@media (min-width: 860px){.kl-grid{grid-template-columns:1.2fr .8fr}}
				.kl-card{border-radius:22px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.70);padding:16px;min-height:0}
				.kl-prof-inner.dark .kl-card{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05)}
				.kl-cardTitle{font-weight:950;font-size:14px;letter-spacing:.12em;text-transform:uppercase;opacity:.82}
				.kl-value{margin-top:8px;font-weight:950;font-size:16px}
				.kl-muted{margin-top:6px;font-weight:800;font-size:12px;color:var(--kl-text-muted, currentColor);opacity:1}
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
				.kl-banner.ok{border-color:rgba(var(--accent-green-rgb, 22,163,74), .35);background:rgba(var(--accent-green-rgb, 22,163,74), .10)}
				.kl-banner.err{border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.10)}
				.kl-divider{margin-top:14px;margin-bottom:14px;height:1px;background:rgba(255,255,255,.08)}
				.kl-prof-inner:not(.dark) .kl-divider{background:rgba(15,23,42,.10)}
				.kl-settingsHead{margin-top:14px;text-align:center}
				.kl-settingsTitle{font-weight:1000;font-size:14px;letter-spacing:.12em;text-transform:uppercase;opacity:.86}
				.kl-settingsRow{margin-top:10px;display:grid;grid-template-columns:1fr;gap:10px;align-items:center}
				@media (min-width: 520px){.kl-settingsRow{grid-template-columns:160px 1fr}}
				.kl-settingsLabel{font-weight:950;font-size:13px;opacity:.88}
				.kl-settingsCtl{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
				.kl-select{
					border-radius:14px;border:1px solid rgba(15,23,42,.14);padding:11px 12px;font-weight:900;
					outline:none;background:rgba(255,255,255,.75);color:rgba(15,23,42,.92);
					min-width:220px;
				}
				.kl-prof-inner.dark .kl-select{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.92);color-scheme:light}
				.kl-select option{color:rgba(15,23,42,.92);background:rgba(255,255,255,.98)}
				.kl-swatch{width:18px;height:18px;border-radius:999px;border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 24px rgba(0,0,0,.18)}
				.kl-prof-inner:not(.dark) .kl-swatch{border:1px solid rgba(15,23,42,.12);box-shadow:0 10px 24px rgba(15,23,42,.10)}
				.kl-color{width:42px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:transparent;padding:0;cursor:pointer;overflow:hidden}
				.kl-prof-inner:not(.dark) .kl-color{border:1px solid rgba(15,23,42,.14)}
				.kl-color::-webkit-color-swatch-wrapper{padding:0}
				.kl-color::-webkit-color-swatch{border:none}
				.kl-saveRow{margin-top:12px;display:flex;justify-content:flex-end;gap:10px;align-items:center;flex-wrap:wrap}
				.kl-saved{font-weight:950;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
				.kl-stats{display:grid;grid-template-columns:1fr;gap:12px}
				@media (min-width: 640px){.kl-stats{grid-template-columns:1fr 1fr}}
				@media (min-width: 980px){.kl-stats{grid-template-columns:1fr 1fr 1fr}}

				.kl-pulse-card{padding:16px}
				.kl-pulse-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
				.kl-pulse-tag{font-weight:950;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.70}
				.kl-pulse-chips{margin-top:10px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
				@media (min-width: 520px){.kl-pulse-chips{grid-template-columns:repeat(4,1fr)}}
				.kl-pulse-chip{border-radius:16px;padding:10px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.55)}
				.kl-prof-inner.dark .kl-pulse-chip{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04)}
				.kl-pulse-num{font-weight:1000;font-size:18px;letter-spacing:-.02em}
				.kl-pulse-lbl{margin-top:2px;font-weight:950;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.66}
				.kl-pulse-tabs{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
				.kl-pulse-tab{border:none;cursor:pointer;border-radius:999px;padding:8px 10px;font-weight:950;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
					color:rgba(15,23,42,.82);background:rgba(255,255,255,.65);border:1px solid rgba(15,23,42,.12);
					transition:translate .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s cubic-bezier(.2,.8,.2,1), filter .22s cubic-bezier(.2,.8,.2,1), background-color .22s cubic-bezier(.2,.8,.2,1)}
				.kl-pulse-tab:hover{translate:0 -1px;box-shadow:0 14px 28px rgba(15,23,42,.08);filter:brightness(1.02)}
				.kl-pulse-tab.is-active{border-color:rgba(var(--accent-green-rgb, 22,163,74), .36);background:rgba(var(--accent-green-rgb, 22,163,74), .12);color:rgba(15,23,42,.92)}
				.kl-prof-inner.dark .kl-pulse-tab{color:rgba(255,255,255,.88);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
				.kl-prof-inner.dark .kl-pulse-tab.is-active{border-color:rgba(var(--accent-green-rgb, 22,163,74), .36);background:rgba(var(--accent-green-rgb, 22,163,74), .16);color:rgba(255,255,255,.92)}
				.kl-pulse-tab:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(var(--accent-green-rgb, 22,163,74), .25)}
				.kl-pulse-graph{margin-top:10px}

				.kl-pulse-spark{border-radius:16px;padding:10px;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.55)}
				.kl-prof-inner.dark .kl-pulse-spark{border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04)}
				.kl-pulse-sparkSvg{width:100%;height:auto;display:block}
				.kl-pulse-line{stroke:rgba(var(--accent-green-rgb, 22,163,74), .85);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
				.kl-pulse-dot{fill:rgba(var(--accent-green-rgb, 22,163,74), .95);stroke:rgba(255,255,255,.92);stroke-width:2}
				.kl-prof-inner.dark .kl-pulse-dot{stroke:rgba(11,18,32,.92)}
				.kl-pulse-meta{margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;
					font-weight:950;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75}
			`}</style>

			<div className="kl-prof-shell">
				<div className={["kl-prof-inner", darkMode ? "dark" : ""].join(" ")}
					style={{
						color: "var(--kl-text, inherit)",
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

							<div style={{ marginTop: 14 }}>
								<ProgressPulseCard />
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

							<div className="kl-divider" />

							<div className="kl-settingsHead">
								<div className="kl-settingsTitle">User settings</div>
								<div className="kl-muted" style={{ marginTop: 8 }}>
									Change the app motive colors (preset or custom).
								</div>
							</div>

							<div className="kl-settingsRow" aria-label="Theme motive">
								<div className="kl-settingsLabel">Choose motive</div>
								<div className="kl-settingsCtl">
									<select
										className="kl-select"
										value={themeDraft.presetId || "custom"}
										onChange={(e) => pickPreset(e.target.value)}
										aria-label="Choose a theme preset"
									>
										{motives.map((m) => (
											<option key={m.id} value={m.id}>
												{m.name}
											</option>
										))}
										<option value="custom">Custom</option>
									</select>
									<span className="kl-swatch" style={{ background: themeDraft.primary }} aria-hidden="true" />
									<span className="kl-swatch" style={{ background: themeDraft.secondary }} aria-hidden="true" />
								</div>
							</div>

							<div className="kl-settingsRow" aria-label="Primary color">
								<div className="kl-settingsLabel">Primary color</div>
								<div className="kl-settingsCtl">
									<input
										type="color"
										className="kl-color"
										value={normalizeHex(themeDraft.primary, DEFAULT_THEME.primary)}
										onChange={(e) =>
											setThemeDraft((t) => ({
												...t,
												presetId: "custom",
												primary: normalizeHex(e.target.value, t.primary),
											}))
										}
										aria-label="Primary color"
									/>
									<input
										type="text"
										className="kl-input"
										value={themeDraft.primary}
										onChange={(e) =>
											setThemeDraft((t) => ({
												...t,
												presetId: "custom",
												primary: e.target.value,
											}))
										}
										placeholder="#16a34a"
										spellCheck={false}
										style={{ maxWidth: 160, textTransform: "lowercase" }}
										aria-label="Primary color hex"
									/>
								</div>
							</div>

							<div className="kl-settingsRow" aria-label="Secondary color">
								<div className="kl-settingsLabel">Secondary color</div>
								<div className="kl-settingsCtl">
									<input
										type="color"
										className="kl-color"
										value={normalizeHex(themeDraft.secondary, DEFAULT_THEME.secondary)}
										onChange={(e) =>
											setThemeDraft((t) => ({
												...t,
												presetId: "custom",
												secondary: normalizeHex(e.target.value, t.secondary),
											}))
										}
										aria-label="Secondary color"
									/>
									<input
										type="text"
										className="kl-input"
										value={themeDraft.secondary}
										onChange={(e) =>
											setThemeDraft((t) => ({
												...t,
												presetId: "custom",
												secondary: e.target.value,
											}))
										}
										placeholder="#bbf7d0"
										spellCheck={false}
										style={{ maxWidth: 160, textTransform: "lowercase" }}
										aria-label="Secondary color hex"
									/>
								</div>
							</div>

							<div className="kl-saveRow">
								{themeSaved ? <div className="kl-saved">Saved</div> : null}
								<button type="button" className="kl-btn primary" onClick={saveTheme} aria-label="Save theme colors">
									Save
								</button>
							</div>

							<div className="kl-divider" style={{ marginTop: 16, marginBottom: 16 }} />

							<div className="kl-settingsHead">
								<div className="kl-settingsTitle">Text settings</div>
								<div className="kl-muted" style={{ marginTop: 8 }}>
									Adjust font + readability.
								</div>
							</div>

							<div className="kl-settingsRow" aria-label="Text contrast">
								<div className="kl-settingsLabel">Contrast</div>
								<div className="kl-settingsCtl" style={{ gap: 10, flexWrap: "wrap" }}>
									<button
										type="button"
										className={"kl-btn" + (textPrefs.contrast !== "high" ? " primary" : "")}
										onClick={() => {
											const next = { ...textPrefs, contrast: "normal" };
											setTextPrefs(next);
											saveTextPrefs(next);
										}}
									>
										Normal
									</button>
									<button
										type="button"
										className={"kl-btn" + (textPrefs.contrast === "high" ? " primary" : "")}
										onClick={() => {
											const next = { ...textPrefs, contrast: "high" };
											setTextPrefs(next);
											saveTextPrefs(next);
										}}
									>
										High
									</button>
								</div>
							</div>

							<div className="kl-settingsRow" aria-label="Font">
								<div className="kl-settingsLabel">Font</div>
								<div className="kl-settingsCtl">
									<select
										className="kl-select"
										value={textPrefs.font}
										onChange={(e) => {
											const next = { ...textPrefs, font: e.target.value };
											setTextPrefs(next);
											saveTextPrefs(next);
										}}
										aria-label="Choose font"
									>
										<option value="default">Default</option>
										<option value="mono">Mono</option>
									</select>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

