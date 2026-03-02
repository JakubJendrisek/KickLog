import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "kicklog.diary.meta.v1";
const DIARIES_KEY = "kicklog.diary.items.v1";
const FOLDERS_KEY = "kicklog.diary.folders.v1";
const ACTIVE_DIARY_KEY = "kicklog.diary.activeId.v1";
const RECENT_DIARIES_KEY = "kicklog.diary.recent.v1";
const ENTRIES_PREFIX = "kicklog.diary.entries.v1:";
const ENTRY_SAVED_PREFIX = "kicklog.diary.entry.saved.v1:";
const ENTRY_DRAFT_PREFIX = "kicklog.diary.entry.draft.v1:";

const CHAPTERS_SAVED_PREFIX = "kicklog.diary.chapters.saved.v1:";
const CHAPTERS_DRAFT_PREFIX = "kicklog.diary.chapters.draft.v1:";
const ACTIVE_CHAPTER_PREFIX = "kicklog.diary.chapter.activeId.v1:";

const FLIP_DUR_MS = 520;

function entriesKey(diaryId) {
	return `${ENTRIES_PREFIX}${String(diaryId ?? "")}`;
}

function todayISO() {
	const d = new Date();
	const yyyy = String(d.getFullYear());
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function nowHHMM() {
	const d = new Date();
	const hh = String(d.getHours()).padStart(2, "0");
	const mm = String(d.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

function parseSeasonYears(seasonStr) {
	const s = String(seasonStr ?? "").trim();
	const m = s.match(/(20\d{2})\s*\/\s*(\d{2}|20\d{2})/);
	if (!m) return null;
	const startYear = Number(m[1]);
	const rawEnd = m[2];
	let endYear = rawEnd.length === 2 ? Number(String(startYear).slice(0, 2) + rawEnd) : Number(rawEnd);
	if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
	if (endYear < startYear) endYear = startYear + 1;
	return { startYear, endYear };
}

function generateFootballSeasonMonths(seasonStr) {
	const years = parseSeasonYears(seasonStr);
	if (!years) return [];
	const { startYear, endYear } = years;
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	// Typical football season: Aug–May.
	const months = [
		{ y: startYear, m: 7 },
		{ y: startYear, m: 8 },
		{ y: startYear, m: 9 },
		{ y: startYear, m: 10 },
		{ y: startYear, m: 11 },
		{ y: endYear, m: 0 },
		{ y: endYear, m: 1 },
		{ y: endYear, m: 2 },
		{ y: endYear, m: 3 },
		{ y: endYear, m: 4 },
	];
	return months.map(({ y, m }) => ({
		title: `${monthNames[m]} ${y}`,
		key: `${y}-${String(m + 1).padStart(2, "0")}`,
	}));
}

function clampNumber(value, { min, max, fallback }) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function addDaysISO(iso, days) {
	const [y, m, d] = String(iso ?? "").split("-").map((x) => Number(x));
	if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return todayISO();
	const dt = new Date(y, m - 1, d);
	dt.setDate(dt.getDate() + Number(days));
	const yyyy = String(dt.getFullYear());
	const mm = String(dt.getMonth() + 1).padStart(2, "0");
	const dd = String(dt.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function isISODate(value) {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function maxLoggedISODate(entries) {
	let max = todayISO();
	(entries ?? []).forEach((e) => {
		const d = e?.date;
		if (!isISODate(d)) return;
		if (d > max) max = d;
	});
	return max;
}

function makeLastNDaysSeries(entries, nDays, metricKey) {
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
			if (e.type === "practice") v = (Number(e.durationMin) || 0) * (Number(e.rpe) || 0);
			else v = Number(e.minutes) || 0;
		} else if (metricKey === "minutes") v = e.type === "match" ? Number(e.minutes) || 0 : Number(e.durationMin) || 0;
		else if (metricKey === "rpe") v = e.type === "practice" ? Number(e.rpe) || 0 : 0;
		else if (metricKey === "g+a") v = e.type === "match" ? (Number(e.goals) || 0) + (Number(e.assists) || 0) : 0;
		buckets.set(date, (buckets.get(date) || 0) + v);
	});

	return Array.from(buckets.entries()).map(([date, value]) => ({ date, value }));
}

function makePolylinePoints(series, w, h, pad) {
	const pts = (series ?? []).map((p) => Number(p.value) || 0);
	const max = Math.max(1, ...pts);
	const min = Math.min(0, ...pts);
	const usableW = Math.max(10, w - pad * 2);
	const usableH = Math.max(10, h - pad * 2);
	return (series ?? [])
		.map((p, idx) => {
			const x = pad + (idx / Math.max(1, (series.length - 1))) * usableW;
			const t = (Number(p.value) || 0) - min;
			const denom = max - min;
			const y = pad + usableH - (denom ? (t / denom) * usableH : 0);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(" ");
}

function normalizeEntries(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter((e) => e && typeof e === "object")
		.map((e) => {
			const rawHighlights = typeof e.highlights === "string" ? e.highlights : "";
			const rawImprovements = typeof e.improvements === "string" ? e.improvements : "";
			const didGood = typeof e.didGood === "string" ? e.didGood : rawHighlights;
			const needWork = typeof e.needWork === "string" ? e.needWork : rawImprovements;
			return {
				id: typeof e.id === "string" ? e.id : String(e.createdAt ?? Date.now()),
				type: e.type === "match" ? "match" : "practice",
				date: typeof e.date === "string" ? e.date : todayISO(),
				time: typeof e.time === "string" ? e.time : "",
				createdAt: typeof e.createdAt === "number" ? e.createdAt : Date.now(),
				updatedAt:
					typeof e.updatedAt === "number"
						? e.updatedAt
						: typeof e.createdAt === "number"
							? e.createdAt
							: Date.now(),
				// Structured review
				did: typeof e.did === "string" ? e.did : "",
				didGood,
				needWork,
				// Practice
				durationMin: typeof e.durationMin === "number" ? e.durationMin : 0,
				focus: typeof e.focus === "string" ? e.focus : "",
				drills: typeof e.drills === "string" ? e.drills : "",
				rpe: typeof e.rpe === "number" ? e.rpe : 5,
				feeling: typeof e.feeling === "string" ? e.feeling : "",
				// Match
				opponent: typeof e.opponent === "string" ? e.opponent : "",
				venue: e.venue === "away" ? "away" : "home",
				goalsFor: typeof e.goalsFor === "number" ? e.goalsFor : 0,
				goalsAgainst: typeof e.goalsAgainst === "number" ? e.goalsAgainst : 0,
				minutes: typeof e.minutes === "number" ? e.minutes : 0,
				position: typeof e.position === "string" ? e.position : "",
				goals: typeof e.goals === "number" ? e.goals : 0,
				assists: typeof e.assists === "number" ? e.assists : 0,
				// Backward compatible fields
				highlights: didGood,
				improvements: needWork,
				// Shared
				notes: typeof e.notes === "string" ? e.notes : "",
			};
		})
		.sort((a, b) => b.createdAt - a.createdAt);
}

function loadEntries(diaryId) {
	if (!diaryId) return [];
	return normalizeEntries(safeParseJSON(window.localStorage.getItem(entriesKey(diaryId)), []));
}

function saveEntries(diaryId, next) {
	if (!diaryId) return;
	try {
		window.localStorage.setItem(entriesKey(diaryId), JSON.stringify(next));
		window.dispatchEvent(new Event("kicklog:diaryEntriesChanged"));
	} catch {
		// ignore
	}
}

function makeEntry(type) {
	const now = Date.now();
	const base = {
		id: String(now),
		type: type === "match" ? "match" : "practice",
		date: todayISO(),
		time: nowHHMM(),
		createdAt: now,
		updatedAt: now,
		did: "",
		didGood: "",
		needWork: "",
		notes: "",
	};
	return type === "match"
		? {
			...base,
			opponent: "",
			venue: "home",
			goalsFor: 0,
			goalsAgainst: 0,
			minutes: 0,
			position: "",
			goals: 0,
			assists: 0,
			highlights: "",
			improvements: "",
		}
		: {
			...base,
			durationMin: 0,
			focus: "",
			drills: "",
			rpe: 5,
			feeling: "",
		};
}

function safeParseJSON(raw, fallback) {
	try {
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function recordRecentDiary(diaryId) {
	const id = String(diaryId ?? "").trim();
	if (!id) return;
	try {
		const existing = safeParseJSON(window.localStorage.getItem(RECENT_DIARIES_KEY), []);
		const list = Array.isArray(existing) ? existing : [];
		const now = Date.now();
		const next = [{ id, at: now }, ...list.filter((x) => x && typeof x === "object" && String(x.id) !== id)].slice(0, 12);
		window.localStorage.setItem(RECENT_DIARIES_KEY, JSON.stringify(next));
		window.dispatchEvent(new Event("kicklog:recentDiariesChanged"));
	} catch {
		// ignore
	}
}

function normalizeChapters(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter((c) => c && typeof c === "object")
		.map((c) => {
			const createdAt = typeof c.createdAt === "number" ? c.createdAt : Date.now();
			return {
				id: typeof c.id === "string" ? c.id : String(createdAt),
				title: typeof c.title === "string" && c.title.trim() ? c.title : "Untitled",
				category: typeof c.category === "string" ? c.category : "",
				createdAt,
				updatedAt:
					typeof c.updatedAt === "number" ? c.updatedAt : typeof c.createdAt === "number" ? c.createdAt : Date.now(),
				text: typeof c.text === "string" ? c.text : "",
			};
		})
		.sort((a, b) => a.createdAt - b.createdAt);
}

function makeDefaultChapter(text = "") {
	const now = Date.now();
	return { id: String(now), title: "Chapter 1", category: "", createdAt: now, updatedAt: now, text: String(text ?? "") };
}

function normalizeFolders(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter((f) => f && typeof f === "object")
		.map((f) => ({
			id: typeof f.id === "string" ? f.id : String(f.createdAt ?? Date.now()),
			name: typeof f.name === "string" ? f.name : "Untitled",
			createdAt: typeof f.createdAt === "number" ? f.createdAt : Date.now(),
		}))
		.filter((f) => f.name.trim().length > 0);
}

function loadFolders() {
	return normalizeFolders(safeParseJSON(window.localStorage.getItem(FOLDERS_KEY), []));
}

function saveFolders(next) {
	try {
		window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
		window.dispatchEvent(new Event("kicklog:foldersChanged"));
	} catch {
		// ignore
	}
}

function normalizeDiaries(value) {
	if (!Array.isArray(value)) return [];
	return value
		.filter((d) => d && typeof d === "object")
		.map((d) => ({
			id: typeof d.id === "string" ? d.id : String(d.createdAt ?? Date.now()),
			name: typeof d.name === "string" ? d.name : "Untitled",
			description: typeof d.description === "string" ? d.description : "",
			sport: d.sport === "football" ? "football" : "football",
			club: typeof d.club === "string" ? d.club : "",
			role: typeof d.role === "string" ? d.role : "",
			season: typeof d.season === "string" ? d.season : "",
			goals: typeof d.goals === "string" ? d.goals : "",
			focus: typeof d.focus === "string" ? d.focus : "",
			themeKey: typeof d.themeKey === "string" ? d.themeKey : "accent",
			motiveKey: typeof d.motiveKey === "string" ? d.motiveKey : "clean",
			createdAt: typeof d.createdAt === "number" ? d.createdAt : Date.now(),
			folderId: typeof d.folderId === "string" ? d.folderId : null,
		}));
}

function loadDiaries() {
	return normalizeDiaries(safeParseJSON(window.localStorage.getItem(DIARIES_KEY), []));
}

function saveDiaries(next) {
	try {
		window.localStorage.setItem(DIARIES_KEY, JSON.stringify(next));
		window.dispatchEvent(new Event("kicklog:diariesChanged"));
	} catch {
		// ignore
	}
}

function upsertDiary(nextDiary) {
	const list = loadDiaries();
	const id = typeof nextDiary?.id === "string" ? nextDiary.id : String(nextDiary?.createdAt ?? Date.now());
	const normalized = {
		id,
		name: typeof nextDiary?.name === "string" ? nextDiary.name : "Untitled",
		description: typeof nextDiary?.description === "string" ? nextDiary.description : "",
		sport: nextDiary?.sport === "football" ? "football" : "football",
		club: typeof nextDiary?.club === "string" ? nextDiary.club : "",
		role: typeof nextDiary?.role === "string" ? nextDiary.role : "",
		season: typeof nextDiary?.season === "string" ? nextDiary.season : "",
		goals: typeof nextDiary?.goals === "string" ? nextDiary.goals : "",
		focus: typeof nextDiary?.focus === "string" ? nextDiary.focus : "",
		themeKey: typeof nextDiary?.themeKey === "string" ? nextDiary.themeKey : "accent",
		motiveKey: typeof nextDiary?.motiveKey === "string" ? nextDiary.motiveKey : "clean",
		createdAt: typeof nextDiary?.createdAt === "number" ? nextDiary.createdAt : Date.now(),
		folderId: typeof nextDiary?.folderId === "string" ? nextDiary.folderId : null,
	};
	const exists = list.some((d) => d.id === id);
	const next = exists ? list.map((d) => (d.id === id ? { ...d, ...normalized } : d)) : [normalized, ...list];
	saveDiaries(next);
	return normalized;
}

function folderNameById(folders, folderId) {
	if (!folderId) return "Unfiled";
	const found = (folders ?? []).find((f) => f.id === folderId);
	return found?.name ?? "Unfiled";
}

const THEME_OPTIONS = [
	{ key: "accent", label: "KickLog", hint: "Signature" },
	{ key: "soft", label: "Soft", hint: "Calm" },
	{ key: "ink", label: "Ink", hint: "Minimal" },
];

const MOTIVE_OPTIONS = [
	{ key: "clean", label: "Clean" },
	{ key: "lined", label: "Lined" },
	{ key: "grid", label: "Grid" },
];

export default function MainDiary({ darkMode, onBack, initialView }) {
	const didApplyInitialViewRef = useRef(false);
	const editorRef = useRef(null);
	const [openLoadMenuDiaryId, setOpenLoadMenuDiaryId] = useState(null);
	const [text, setText] = useState("");
	const [lastSavedChaptersJson, setLastSavedChaptersJson] = useState("[]");
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [savedMeta, setSavedMeta] = useState(null);
	const [meta, setMeta] = useState(null);
	const [view, setView] = useState("editor"); // editor | load | create
	const [editorMode, setEditorMode] = useState("chapters"); // chapters | sessions

	const [chapters, setChapters] = useState([]);
	const [activeChapterId, setActiveChapterId] = useState(null);
	const [chapterCategoryFilter, setChapterCategoryFilter] = useState("all");

	// Setup form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [club, setClub] = useState("");
	const [role, setRole] = useState("");
	const [season, setSeason] = useState("");
	const [goals, setGoals] = useState("");
	const [focus, setFocus] = useState("");
	const [themeKey, setThemeKey] = useState("accent");
	const [motiveKey, setMotiveKey] = useState("clean");
	const [createStep, setCreateStep] = useState(0); // 0 basics | 1 style | 2 confirm

	const [folders, setFoldersState] = useState([]);
	const [diaries, setDiariesState] = useState([]);
	const [loadFolderId, setLoadFolderId] = useState("all"); // all | unfiled | <folderId>

	const [entries, setEntries] = useState([]);
	const [activeEntryId, setActiveEntryId] = useState(null);
	const [lastSavedEntriesJson, setLastSavedEntriesJson] = useState("[]");
	const [progressMetric, setProgressMetric] = useState("load"); // load | sessions | minutes | rpe | g+a

	useEffect(() => {
		const refresh = () => {
			setFoldersState(loadFolders());
			setDiariesState(loadDiaries());
		};
		refresh();
		window.addEventListener("kicklog:foldersChanged", refresh);
		window.addEventListener("kicklog:diariesChanged", refresh);
		return () => {
			window.removeEventListener("kicklog:foldersChanged", refresh);
			window.removeEventListener("kicklog:diariesChanged", refresh);
		};
	}, []);

	useEffect(() => {
		if (!openLoadMenuDiaryId) return;
		const onPointerDown = (e) => {
			const t = e.target;
			if (t && typeof t === "object" && t instanceof Element) {
				// Click inside the menu should NOT close it.
				if (t.closest?.('[data-kl-load-menu="true"]')) return;
			}
			setOpenLoadMenuDiaryId(null);
		};
		const onKeyDown = (e) => {
			if (e.key === "Escape") setOpenLoadMenuDiaryId(null);
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [openLoadMenuDiaryId]);

	useEffect(() => {
		try {
			const normalizedInitial =
				initialView === "create" ? "create" : initialView === "load" ? "load" : null;
			if (normalizedInitial) {
				// When the host explicitly asks for create/load, don't auto-load the last diary.
				didApplyInitialViewRef.current = true;
				setSavedMeta(null);
				setMeta(null);
				setName("");
				setDescription("");
				setClub("");
				setRole("");
				setSeason("");
				setGoals("");
				setFocus("");
				setThemeKey("accent");
				setMotiveKey("clean");
				setCreateStep(0);
				setView(normalizedInitial);
				return;
			}

			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				// Single-diary mode: always have exactly one diary.
				const createdAt = Date.now();
				const next = {
					name: "My Diary",
					description: "",
					sport: "football",
					club: "",
					role: "",
					season: "",
					goals: "",
					focus: "",
					themeKey: "accent",
					motiveKey: "clean",
					createdAt,
					folderId: null,
				};
				setSavedMeta(next);
				setMeta(next);
				setName(next.name);
				setDescription(next.description);
				setClub(next.club);
				setRole(next.role);
				setSeason(next.season);
				setGoals(next.goals);
				setFocus(next.focus);
				setThemeKey(next.themeKey);
				setMotiveKey(next.motiveKey);
				setView("editor");
				try {
					window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
					window.localStorage.setItem(ACTIVE_DIARY_KEY, String(createdAt));
				} catch {
					// ignore
				}
				return;
			}
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
				const migrated = upsertDiary({
					id: String(parsed.createdAt ?? Date.now()),
					name: parsed.name,
					description: typeof parsed.description === "string" ? parsed.description : "",
					sport: parsed.sport === "football" ? "football" : "football",
					club: typeof parsed.club === "string" ? parsed.club : "",
					role: typeof parsed.role === "string" ? parsed.role : "",
					season: typeof parsed.season === "string" ? parsed.season : "",
					goals: typeof parsed.goals === "string" ? parsed.goals : "",
					focus: typeof parsed.focus === "string" ? parsed.focus : "",
					themeKey: parsed.themeKey,
					motiveKey: parsed.motiveKey,
					createdAt: parsed.createdAt ?? Date.now(),
					folderId: typeof parsed.folderId === "string" ? parsed.folderId : null,
				});
				setSavedMeta(migrated);
				setMeta(migrated);
				setName(migrated.name ?? "My Diary");
				setDescription(migrated.description ?? "");
				setClub(migrated.club ?? "");
				setRole(migrated.role ?? "");
				setSeason(migrated.season ?? "");
				setGoals(migrated.goals ?? "");
				setFocus(migrated.focus ?? "");
				setThemeKey(migrated.themeKey ?? "accent");
				setMotiveKey(migrated.motiveKey ?? "clean");
				setView("editor");
				setDiariesState(loadDiaries());
			}
		} catch {
			// ignore
		}
	}, []);

	// (Entries/spread UI removed; this diary is now a writing-focused editor.)

	const folderIdSet = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

	const filteredDiaries = useMemo(() => {
		if (loadFolderId === "all") return diaries;
		if (loadFolderId === "unfiled") {
			return diaries.filter((d) => !d.folderId || !folderIdSet.has(d.folderId));
		}
		return diaries.filter((d) => d.folderId === loadFolderId);
	}, [diaries, folderIdSet, loadFolderId]);

	const entryKeys = useMemo(() => {
		if (!meta?.createdAt) return null;
		const id = String(meta.createdAt);
		return {
			saved: `${ENTRY_SAVED_PREFIX}${id}`,
			draft: `${ENTRY_DRAFT_PREFIX}${id}`,
		};
	}, [meta?.createdAt]);

	const chapterKeys = useMemo(() => {
		if (!meta?.createdAt) return null;
		const id = String(meta.createdAt);
		return {
			saved: `${CHAPTERS_SAVED_PREFIX}${id}`,
			draft: `${CHAPTERS_DRAFT_PREFIX}${id}`,
			activeId: `${ACTIVE_CHAPTER_PREFIX}${id}`,
		};
	}, [meta?.createdAt]);

	const activeChapter = useMemo(() => {
		if (!activeChapterId) return null;
		return chapters.find((c) => c.id === activeChapterId) ?? null;
	}, [activeChapterId, chapters]);

	const activeEntry = useMemo(() => {
		if (!activeEntryId) return null;
		return entries.find((e) => e.id === activeEntryId) ?? null;
	}, [activeEntryId, entries]);

	const chaptersJson = useMemo(() => JSON.stringify(chapters), [chapters]);
	const entriesJson = useMemo(() => JSON.stringify(entries), [entries]);

	useEffect(() => {
		if (!meta?.createdAt) return;
		try {
			const loaded = loadEntries(String(meta.createdAt));
			setEntries(loaded);
			setLastSavedEntriesJson(JSON.stringify(loaded));
			setActiveEntryId((prev) => {
				if (prev && loaded.some((e) => e.id === prev)) return prev;
				return loaded[0]?.id ?? null;
			});
		} catch {
			// ignore
		}
	}, [meta?.createdAt]);

	useEffect(() => {
		if (!meta?.createdAt) return;
		if (entriesJson === lastSavedEntriesJson) return;
		const t = window.setTimeout(() => {
			try {
				saveEntries(String(meta.createdAt), entries);
				setLastSavedEntriesJson(entriesJson);
			} catch {
				// ignore
			}
		}, 350);
		return () => window.clearTimeout(t);
	}, [entriesJson, lastSavedEntriesJson, meta?.createdAt]);

	// Load saved/draft chapters when diary meta becomes available.
	useEffect(() => {
		if (!chapterKeys) return;
		try {
			const draftRaw = window.localStorage.getItem(chapterKeys.draft);
			const savedRaw = window.localStorage.getItem(chapterKeys.saved);
			const base = draftRaw ?? savedRaw ?? null;
			let loaded = normalizeChapters(safeParseJSON(base, []));

			// Migration: if no chapters exist yet, fall back to legacy single-text keys.
			if (loaded.length === 0 && entryKeys) {
				const legacyDraft = window.localStorage.getItem(entryKeys.draft);
				const legacySaved = window.localStorage.getItem(entryKeys.saved);
				const legacyInitial = legacyDraft ?? legacySaved ?? "";
				if (legacyInitial) {
					loaded = [makeDefaultChapter(legacyInitial)];
					try {
						const raw = JSON.stringify(loaded);
						if (legacyDraft != null) window.localStorage.setItem(chapterKeys.draft, raw);
						if (legacyDraft == null) window.localStorage.setItem(chapterKeys.saved, raw);
					} catch {
						// ignore
					}
				}
			}

			if (loaded.length === 0) loaded = [makeDefaultChapter("")];
			setChapters(loaded);

			const savedJson = JSON.stringify(normalizeChapters(safeParseJSON(savedRaw, [])));
			setLastSavedChaptersJson(savedJson === "[]" ? JSON.stringify(loaded) : savedJson);
			setLastSavedAt(savedRaw != null ? Date.now() : null);

			let nextActiveId = null;
			try {
				nextActiveId = window.localStorage.getItem(chapterKeys.activeId);
			} catch {
				// ignore
			}
			const exists = nextActiveId && loaded.some((c) => c.id === nextActiveId);
			const finalActiveId = exists ? nextActiveId : loaded[0]?.id ?? null;
			setActiveChapterId(finalActiveId);
			setText(loaded.find((c) => c.id === finalActiveId)?.text ?? "");
		} catch {
			// ignore
		}
	}, [chapterKeys]);

	const isDirty = useMemo(() => {
		return chaptersJson !== lastSavedChaptersJson;
	}, [chaptersJson, lastSavedChaptersJson]);

	useEffect(() => {
		if (view !== "editor") return;
		const t = window.setTimeout(() => {
			try {
				editorRef.current?.focus?.();
			} catch {
				// ignore
			}
		}, 0);
		return () => window.clearTimeout(t);
	}, [activeChapterId, meta?.createdAt, view]);

	useEffect(() => {
		if (!chapterKeys) return;
		if (!isDirty) {
			try {
				window.localStorage.removeItem(chapterKeys.draft);
			} catch {
				// ignore
			}
			return;
		}

		const t = window.setTimeout(() => {
			try {
				window.localStorage.setItem(chapterKeys.draft, chaptersJson);
			} catch {
				// ignore
			}
		}, 350);
		return () => window.clearTimeout(t);
	}, [chapterKeys, chaptersJson, isDirty]);

	useEffect(() => {
		if (!chapterKeys) return;
		if (!activeChapterId) return;
		try {
			window.localStorage.setItem(chapterKeys.activeId, String(activeChapterId));
		} catch {
			// ignore
		}
	}, [activeChapterId, chapterKeys]);

	useEffect(() => {
		if (!activeChapter) return;
		if (text === activeChapter.text) return;
		setText(activeChapter.text ?? "");
	}, [activeChapterId]);

	useEffect(() => {
		if (!activeChapterId) return;
		setChapters((prev) => {
			const idx = prev.findIndex((c) => c.id === activeChapterId);
			if (idx < 0) return prev;
			const current = prev[idx];
			if ((current.text ?? "") === (text ?? "")) return prev;
			const next = [...prev];
			next[idx] = { ...current, text: String(text ?? ""), updatedAt: Date.now() };
			return next;
		});
	}, [activeChapterId, text]);

	const ensureFolderForSave = () => {
		if (!meta) return null;
		if (typeof meta.folderId === "string" && meta.folderId) return meta.folderId;

		const folders = loadFolders();

		if (folders.length === 0) {
			const name = window.prompt("No folder exists yet. Create a folder name to save this diary into:", "My diaries");
			if (name == null) return null;
			const trimmed = name.trim();
			if (!trimmed) return null;
			const newFolder = { id: String(Date.now()), name: trimmed, createdAt: Date.now() };
			saveFolders([newFolder]);
			return newFolder.id;
		}

		const promptText =
			"Save this diary into which folder?\n\n" +
			folders.map((f, i) => `${i + 1}) ${f.name}`).join("\n") +
			"\n\nType a number, or type a new folder name:";
		const answer = window.prompt(promptText, "1");
		if (answer == null) return null;
		const trimmed = String(answer).trim();
		if (!trimmed) return null;

		const idx = Number(trimmed);
		if (Number.isInteger(idx) && idx >= 1 && idx <= folders.length) {
			return folders[idx - 1].id;
		}

		// Treat as new folder name
		const newFolder = { id: String(Date.now()), name: trimmed, createdAt: Date.now() };
		saveFolders([newFolder, ...folders]);
		return newFolder.id;
	};

	const saveText = () => {
		if (!chapterKeys) return;
		const now = Date.now();
		try {
			window.localStorage.setItem(chapterKeys.saved, chaptersJson);
			window.localStorage.removeItem(chapterKeys.draft);
		} catch {
			// ignore
		}
		setLastSavedChaptersJson(chaptersJson);
		setLastSavedAt(now);
	};

	const goBack = () => {
		if (typeof onBack === "function") {
			onBack();
			return;
		}
	};

	const resetAllDiaries = () => {
		const ok = window.confirm("Delete ALL existing diaries and entries? This cannot be undone.");
		if (!ok) return;
		try {
			for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
				const k = window.localStorage.key(i);
				if (!k) continue;
				if (
					k === STORAGE_KEY ||
					k === DIARIES_KEY ||
					k === FOLDERS_KEY ||
					k === ACTIVE_DIARY_KEY ||
					k.startsWith(ENTRIES_PREFIX) ||
					k.startsWith(ENTRY_SAVED_PREFIX) ||
					k.startsWith(ENTRY_DRAFT_PREFIX) ||
					k.startsWith(CHAPTERS_SAVED_PREFIX) ||
					k.startsWith(CHAPTERS_DRAFT_PREFIX) ||
					k.startsWith(ACTIVE_CHAPTER_PREFIX)
				) {
					window.localStorage.removeItem(k);
				}
			}
		} catch {
			// ignore
		}

		const createdAt = Date.now();
		const next = {
			name: "My Diary",
			themeKey: "accent",
			motiveKey: "clean",
			createdAt,
			folderId: null,
		};
		setSavedMeta(next);
		setMeta(next);
		setName(next.name);
		setThemeKey(next.themeKey);
		setMotiveKey(next.motiveKey);
		const initialChapter = makeDefaultChapter("");
		setChapters([initialChapter]);
		setActiveChapterId(initialChapter.id);
		setText("");
		setLastSavedChaptersJson(JSON.stringify([initialChapter]));
		setLastSavedAt(null);
		setView("editor");
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(createdAt));
			recordRecentDiary(String(createdAt));
			window.localStorage.setItem(`${CHAPTERS_SAVED_PREFIX}${String(createdAt)}`, JSON.stringify([initialChapter]));
			window.localStorage.setItem(`${ACTIVE_CHAPTER_PREFIX}${String(createdAt)}`, String(initialChapter.id));
		} catch {
			// ignore
		}
	};

	const clearSavedDiaryFromStorage = (metaToClear) => {
		try {
			// only clear STORAGE_KEY if it points to this diary
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (parsed && typeof parsed === "object" && String(parsed.createdAt) === String(metaToClear?.createdAt)) {
						window.localStorage.removeItem(STORAGE_KEY);
					}
				}
			} catch {
				// ignore
			}
			// Clear active diary selection if it points to this diary.
			try {
				const active = window.localStorage.getItem(ACTIVE_DIARY_KEY);
				if (active && String(active) === String(metaToClear?.createdAt)) {
					window.localStorage.removeItem(ACTIVE_DIARY_KEY);
				}
			} catch {
				// ignore
			}
			if (metaToClear?.createdAt) {
				const id = String(metaToClear.createdAt);
				window.localStorage.removeItem(`${ENTRY_SAVED_PREFIX}${id}`);
				window.localStorage.removeItem(`${ENTRY_DRAFT_PREFIX}${id}`);
				window.localStorage.removeItem(`${CHAPTERS_SAVED_PREFIX}${id}`);
				window.localStorage.removeItem(`${CHAPTERS_DRAFT_PREFIX}${id}`);
				window.localStorage.removeItem(`${ACTIVE_CHAPTER_PREFIX}${id}`);
				window.localStorage.removeItem(entriesKey(id));
			}
			// keep DIARIES_KEY in sync
			if (metaToClear?.createdAt) {
				const id = String(metaToClear.createdAt);
				const list = loadDiaries();
				const next = list.filter((d) => d.id !== id);
				saveDiaries(next);
			}
		} catch {
			// ignore
		}
	};

	const renameDiaryById = (id) => {
		const found = diaries.find((d) => d.id === id);
		if (!found) return;
		const nextName = window.prompt("Rename diary:", found.name ?? "");
		if (nextName == null) return;
		const trimmed = String(nextName).trim();
		if (!trimmed) return;
		const list = loadDiaries();
		const next = list.map((d) => (d.id === id ? { ...d, name: trimmed } : d));
		saveDiaries(next);
		setDiariesState(next);
		if (String(meta?.createdAt) === String(id)) {
			setMeta((prev) => (prev ? { ...prev, name: trimmed } : prev));
			setSavedMeta((prev) => (prev ? { ...prev, name: trimmed } : prev));
			setName(trimmed);
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...(meta ?? found), name: trimmed }));
			} catch {
				// ignore
			}
		}
	};

	const moveDiaryById = (id) => {
		const found = diaries.find((d) => d.id === id);
		if (!found) return;
		const foldersNow = loadFolders();
		if (foldersNow.length === 0) {
			window.alert("No folders exist yet. Create a folder first in the Folder section.");
			return;
		}
		const currentName = folderNameById(foldersNow, found.folderId);
		const promptText =
			"Move diary into which folder?\n\n" +
			["0) Unfiled", ...foldersNow.map((f, i) => `${i + 1}) ${f.name}`)].join("\n") +
			`\n\nCurrent: ${currentName}`;
		const answer = window.prompt(promptText, "1");
		if (answer == null) return;
		const trimmed = String(answer).trim();
		if (!trimmed) return;
		const idx = Number(trimmed);
		if (!Number.isInteger(idx) || idx < 0 || idx > foldersNow.length) return;
		const nextFolderId = idx === 0 ? null : foldersNow[idx - 1].id;
		const list = loadDiaries();
		const next = list.map((d) => (d.id === id ? { ...d, folderId: nextFolderId } : d));
		saveDiaries(next);
		setFoldersState(foldersNow);
		setDiariesState(next);
		if (String(meta?.createdAt) === String(id)) {
			setMeta((prev) => (prev ? { ...prev, folderId: nextFolderId } : prev));
			setSavedMeta((prev) => (prev ? { ...prev, folderId: nextFolderId } : prev));
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...(meta ?? found), folderId: nextFolderId }));
			} catch {
				// ignore
			}
		}
	};

	const deleteDiaryById = (id) => {
		const found = diaries.find((d) => d.id === id);
		if (!found) return;
		const ok = window.confirm(`Delete diary “${found.name ?? "this diary"}”? This will remove its chapters and sessions.`);
		if (!ok) return;
		setOpenLoadMenuDiaryId(null);
		clearSavedDiaryFromStorage({ createdAt: Number(id) || found.createdAt });
		const next = loadDiaries();
		setDiariesState(next);
		// If current diary was deleted, return to Load screen.
		if (String(meta?.createdAt) === String(id)) {
			setMeta(null);
			setSavedMeta(null);
			setChapters([]);
			setActiveChapterId(null);
			setText("");
			setEntries([]);
			setActiveEntryId(null);
			setView("load");
			setEditorMode("chapters");
		}
	};

	const deleteDiary = () => {
		resetAllDiaries();
	};

	const styles = useMemo(() => {
		const coverBg = "var(--kl-diary-cover, #0b1220)";
		const coverBorder = "var(--kl-diary-stroke, rgba(255,255,255,0.12))";
		const titleColor = "var(--kl-diary-title, rgba(255,255,255,0.92))";
		const subColor = "var(--kl-diary-muted, rgba(226,232,240,0.78))";

		const accentRgb = "var(--accent-green-rgb, 22,163,74)";
		const accentSoftRgb = "var(--accent-green-soft-rgb, 187,247,208)";

		const accentStrong = "var(--accent-green, #16a34a)";
		const accentSoft = "var(--accent-green-soft, #bbf7d0)";
		const spineA = themeKey === "soft" ? accentSoft : accentStrong;
		const spineB = themeKey === "ink" ? "rgba(148,163,184,0.40)" : "rgba(0,0,0,0.00)";

		const glow =
			themeKey === "soft"
				? darkMode
					? `rgba(${accentSoftRgb},0.16)`
					: `rgba(${accentSoftRgb},0.20)`
				: darkMode
					? `rgba(${accentRgb},0.14)`
					: `rgba(${accentRgb},0.10)`;

		const pagesPattern =
			motiveKey === "lined"
				? "repeating-linear-gradient(180deg, var(--kl-diary-rule-strong) 0px, var(--kl-diary-rule-strong) 1px, transparent 1px, transparent 28px)"
				: motiveKey === "grid"
					? "repeating-linear-gradient(0deg, var(--kl-diary-rule-strong) 0px, var(--kl-diary-rule-strong) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, var(--kl-diary-rule-soft) 0px, var(--kl-diary-rule-soft) 1px, transparent 1px, transparent 28px)"
					: "none";

		return {
			coverBg,
			coverBorder,
			titleColor,
			subColor,
			spineA,
			spineB,
			glow,
			pagesPattern,
		};
	}, [darkMode, motiveKey, themeKey]);

	const createDiary = () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const trimmedDescription = String(description ?? "").trim();
		const trimmedClub = String(club ?? "").trim();
		const trimmedRole = String(role ?? "").trim();
		const trimmedSeason = String(season ?? "").trim();
		const trimmedGoals = String(goals ?? "").trim();
		const trimmedFocus = String(focus ?? "").trim();

		const next = {
			name: trimmed,
			description: trimmedDescription,
			sport: "football",
			club: trimmedClub,
			role: trimmedRole,
			season: trimmedSeason,
			goals: trimmedGoals,
			focus: trimmedFocus,
			themeKey,
			motiveKey,
			createdAt: Date.now(),
			folderId: null,
		};
		setSavedMeta(next);
		setMeta(next);
		setView("editor");
		setEditorMode("sessions");
		const initialChapter = {
			id: String(Date.now()),
			title: "Notes",
			category: "",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			text: "",
		};
		const nextChapters = [initialChapter];
		setChapters(nextChapters);
		setActiveChapterId(nextChapters[0].id);
		setText(nextChapters[0].text ?? "");
		setLastSavedChaptersJson(JSON.stringify(nextChapters));
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(next.createdAt));
			recordRecentDiary(String(next.createdAt));
			window.localStorage.setItem(`${CHAPTERS_SAVED_PREFIX}${String(next.createdAt)}`, JSON.stringify(nextChapters));
			window.localStorage.setItem(`${ACTIVE_CHAPTER_PREFIX}${String(next.createdAt)}`, String(nextChapters[0].id));
		} catch {
			// ignore
		}
		upsertDiary({
			id: String(next.createdAt),
			name: next.name,
			description: next.description,
			sport: next.sport,
			club: next.club,
			role: next.role,
			season: next.season,
			goals: next.goals,
			focus: next.focus,
			themeKey: next.themeKey,
			motiveKey: next.motiveKey,
			createdAt: next.createdAt,
			folderId: next.folderId,
		});
	};

	const startNewDiary = () => {
		setMeta(null);
		setChapters([]);
		setActiveChapterId(null);
		setText("");
		setLastSavedChaptersJson("[]");
		setLastSavedAt(null);
		setEntries([]);
		setActiveEntryId(null);
		setLastSavedEntriesJson("[]");
		setEditorMode("chapters");
		setName("");
		setDescription("");
		setClub("");
		setRole("");
		setSeason("");
		setGoals("");
		setFocus("");
		setThemeKey("accent");
		setMotiveKey("clean");
		setCreateStep(0);
		setView("create");
	};

	const openLoadDiary = () => {
		setOpenLoadMenuDiaryId(null);
		setLoadFolderId("all");
		setView("load");
	};

	useEffect(() => {
		if (didApplyInitialViewRef.current) return;
		const normalized = initialView === "create" ? "create" : initialView === "load" ? "load" : null;
		if (!normalized) return;
		didApplyInitialViewRef.current = true;
		if (normalized === "create") startNewDiary();
		if (normalized === "load") openLoadDiary();
	}, [initialView]);

	const loadDiaryById = (id) => {
		const found = diaries.find((d) => d.id === id);
		if (!found) return;
		setOpenLoadMenuDiaryId(null);
		setSavedMeta(found);
		setMeta(found);
		setName(found.name ?? "");
		setDescription(found.description ?? "");
		setClub(found.club ?? "");
		setRole(found.role ?? "");
		setSeason(found.season ?? "");
		setGoals(found.goals ?? "");
		setFocus(found.focus ?? "");
		setThemeKey(found.themeKey ?? "accent");
		setMotiveKey(found.motiveKey ?? "clean");
		setView("editor");
		setEditorMode("chapters");
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(found.id));
			recordRecentDiary(String(found.id));
		} catch {
			// ignore
		}
	};

	const addSession = (type) => {
		if (!meta?.createdAt) return;
		const next = makeEntry(type);
		setEntries((prev) => normalizeEntries([next, ...prev]));
		setActiveEntryId(next.id);
		setEditorMode("sessions");
	};

	const deleteSession = () => {
		if (!activeEntry) return;
		const ok = window.confirm("Delete this session?");
		if (!ok) return;
		setEntries((prev) => prev.filter((e) => e.id !== activeEntry.id));
		setActiveEntryId((prevId) => {
			if (prevId !== activeEntry.id) return prevId;
			const remaining = entries.filter((e) => e.id !== activeEntry.id);
			return remaining[0]?.id ?? null;
		});
	};

	const updateActiveEntry = (patch) => {
		if (!activeEntryId) return;
		setEntries((prev) =>
			prev.map((e) => {
				if (e.id !== activeEntryId) return e;
				const next = { ...e, ...patch, updatedAt: Date.now() };
				if (typeof next.didGood === "string") next.highlights = next.didGood;
				if (typeof next.needWork === "string") next.improvements = next.needWork;
				return next;
			})
		);
	};

	const chapterCategories = useMemo(() => {
		const set = new Set(
			chapters
				.map((c) => (typeof c.category === "string" ? c.category.trim() : ""))
				.filter((c) => c.length > 0)
		);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [chapters]);

	const filteredChapters = useMemo(() => {
		if (chapterCategoryFilter === "all") return chapters;
		return chapters.filter((c) => String(c.category ?? "").trim() === chapterCategoryFilter);
	}, [chapters, chapterCategoryFilter]);

	const addChapter = () => {
		const title = window.prompt("Chapter title:", `Chapter ${chapters.length + 1}`);
		if (title == null) return;
		const trimmed = String(title).trim();
		if (!trimmed) return;
		const category = window.prompt("Category (optional):", "") ?? "";
		const now = Date.now();
		const next = {
			id: String(now),
			title: trimmed,
			category: String(category ?? "").trim(),
			createdAt: now,
			updatedAt: now,
			text: "",
		};
		setChapters((prev) => [...prev, next]);
		setActiveChapterId(next.id);
		setText("");
		setView("editor");
	};

	const renameChapter = () => {
		if (!activeChapter) return;
		const nextTitle = window.prompt("Rename chapter:", activeChapter.title);
		if (nextTitle == null) return;
		const trimmed = String(nextTitle).trim();
		if (!trimmed) return;
		setChapters((prev) =>
			prev.map((c) => (c.id === activeChapter.id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
		);
	};

	const setChapterCategory = () => {
		if (!activeChapter) return;
		const nextCategory = window.prompt("Set chapter category (blank to clear):", activeChapter.category ?? "");
		if (nextCategory == null) return;
		const trimmed = String(nextCategory).trim();
		setChapters((prev) =>
			prev.map((c) => (c.id === activeChapter.id ? { ...c, category: trimmed, updatedAt: Date.now() } : c))
		);
	};

	const deleteChapter = () => {
		if (!activeChapter) return;
		const ok = window.confirm(`Delete chapter “${activeChapter.title}”?`);
		if (!ok) return;
		setChapters((prev) => {
			const next = prev.filter((c) => c.id !== activeChapter.id);
			if (next.length === 0) {
				const fallback = makeDefaultChapter("");
				setActiveChapterId(fallback.id);
				setText("");
				return [fallback];
			}
			const nextActive = next[0];
			setActiveChapterId(nextActive.id);
			setText(nextActive.text ?? "");
			return next;
		});
	};

	return (
		<>
			<style>{`
				.kl-diary-root {
					height: 100%;
					width: 100%;
				}
				.kl-diary-root[data-theme="dark"] {
					--kl-diary-cover: color-mix(in srgb, var(--kl-bg, #0b1220) 92%, #000000);
					--kl-diary-paper-a: color-mix(in srgb, var(--kl-bg, #0b1220) 86%, var(--accent-green-soft, #bbf7d0) 14%);
					--kl-diary-paper-b: color-mix(in srgb, var(--kl-bg, #0b1220) 78%, var(--accent-green-soft, #bbf7d0) 22%);
					--kl-diary-ink: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
					--kl-diary-muted: color-mix(in srgb, var(--kl-fg, #ffffff) 74%, transparent);
					--kl-diary-stroke: color-mix(in srgb, var(--kl-fg, #ffffff) 14%, transparent);
					--kl-diary-stroke-weak: color-mix(in srgb, var(--kl-fg, #ffffff) 10%, transparent);
					--kl-diary-title: color-mix(in srgb, var(--kl-fg, #ffffff) 94%, transparent);
					--kl-diary-surface: color-mix(in srgb, var(--kl-bg, #0b1220) 62%, transparent);
					--kl-diary-surface-2: color-mix(in srgb, var(--kl-bg, #0b1220) 74%, transparent);
					--kl-diary-rule-strong: color-mix(in srgb, var(--kl-fg, #ffffff) 10%, transparent);
					--kl-diary-rule-soft: color-mix(in srgb, var(--kl-fg, #ffffff) 6%, transparent);
				}
				.kl-diary-root[data-theme="light"] {
					--kl-diary-cover: color-mix(in srgb, var(--kl-bg, #ffffff) 96%, var(--accent-green-soft, #bbf7d0) 4%);
					--kl-diary-paper-a: color-mix(in srgb, var(--kl-bg, #ffffff) 92%, var(--accent-green-soft, #bbf7d0) 8%);
					--kl-diary-paper-b: color-mix(in srgb, var(--kl-bg, #f8fafc) 88%, var(--accent-green-soft, #bbf7d0) 12%);
					--kl-diary-ink: color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent);
					--kl-diary-muted: color-mix(in srgb, var(--kl-fg, #0f172a) 68%, transparent);
					--kl-diary-stroke: color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					--kl-diary-stroke-weak: color-mix(in srgb, var(--kl-fg, #0f172a) 9%, transparent);
					--kl-diary-title: color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent);
					--kl-diary-surface: color-mix(in srgb, var(--kl-bg, #ffffff) 72%, transparent);
					--kl-diary-surface-2: color-mix(in srgb, var(--kl-bg, #ffffff) 82%, transparent);
					--kl-diary-rule-strong: color-mix(in srgb, var(--kl-fg, #0f172a) 6%, transparent);
					--kl-diary-rule-soft: color-mix(in srgb, var(--kl-fg, #0f172a) 4%, transparent);
				}

				.kl-diary-wrap {
					height: 100%;
					width: 100%;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 8px;
					box-sizing: border-box;
				}
				.kl-editorShell {
					height: 100%;
					width: 100%;
					display: flex;
					flex-direction: column;
					gap: 12px;
					padding: 10px;
					box-sizing: border-box;
				}
				.kl-editorTop {
					display: grid;
					grid-template-columns: 1fr auto;
					align-items: center;
					gap: 12px;
					padding: 10px;
					border-radius: 14px;
					background: var(--kl-diary-surface);
					border: 1px solid var(--kl-diary-stroke);
					box-shadow: 0 10px 26px rgba(0,0,0,0.10);
				}
				@media (max-width: 720px) {
					.kl-editorTop { grid-template-columns: 1fr; align-items: stretch; }
				}
				.kl-editorBody {
					flex: 1;
					min-height: 0;
					display: flex;
					justify-content: stretch;
				}
				.kl-editorPaper {
					width: 100%;
					height: 100%;
					border-radius: 18px;
					background: linear-gradient(180deg, var(--kl-diary-paper-b), var(--kl-diary-paper-a));
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke), 0 22px 56px rgba(0,0,0,0.18);
					position: relative;
					overflow: hidden;
				}
				.kl-editorGrid {
					height: 100%;
					display: grid;
					grid-template-columns: 260px 1fr;
					gap: 12px;
					padding: 12px;
					box-sizing: border-box;
				}
				@media (max-width: 720px) {
					.kl-editorGrid { grid-template-columns: 1fr; }
				}
				.kl-chaptersPane {
					border-radius: 16px;
					background: var(--kl-diary-surface);
					border: 1px solid var(--kl-diary-stroke);
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke-weak);
					overflow: hidden;
					display: flex;
					flex-direction: column;
					min-height: 0;
				}
				.kl-chaptersHead {
					padding: 12px;
					display: grid;
					gap: 10px;
					border-bottom: 1px solid var(--kl-diary-stroke-weak);
				}
				.kl-chaptersTitle {
					font-weight: 950;
					color: var(--kl-diary-ink);
					letter-spacing: 0.01em;
				}
				.kl-select {
					width: 100%;
					border-radius: 12px;
					border: 1px solid var(--kl-diary-stroke);
					background: color-mix(in srgb, var(--kl-diary-paper-a) 70%, transparent);
					color: var(--kl-diary-ink);
					font-weight: 850;
					padding: 10px 10px;
					outline: none;
				}
				.kl-chaptersList {
					padding: 10px;
					overflow: auto;
					display: grid;
					gap: 8px;
					min-height: 0;
				}
				.kl-chapterItem {
					width: 100%;
					text-align: left;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					background: var(--kl-diary-surface-2);
					padding: 10px;
					cursor: pointer;
					color: var(--kl-diary-ink);
					display: grid;
					gap: 4px;
				}
				.kl-chapterItem[data-active="true"] {
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 55%, var(--kl-diary-stroke));
					box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 60%, transparent);
				}
				.kl-chapterTitle {
					font-weight: 950;
					font-size: 13px;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.kl-chapterMeta {
					font-weight: 850;
					font-size: 12px;
					color: var(--kl-diary-muted);
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.kl-chaptersActions {
					padding: 10px;
					display: flex;
					gap: 8px;
					flex-wrap: wrap;
					border-top: 1px solid var(--kl-diary-stroke-weak);
				}
				.kl-editorMain {
					position: relative;
					border-radius: 16px;
					overflow: hidden;
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke);
				}
				.kl-editorInner {
					position: relative;
					height: 100%;
					padding: 14px;
					box-sizing: border-box;
					z-index: 1;
				}
				.kl-editorTextarea {
					width: 100%;
					height: 100%;
					resize: none;
					border: none;
					outline: none;
					background: transparent;
					color: var(--kl-diary-ink);
					font-weight: 750;
					font-size: 16px;
					line-height: 1.7;
					font-family: inherit;
					padding: 16px;
					box-sizing: border-box;
				}
				.kl-editorTextarea::placeholder {
					color: color-mix(in srgb, var(--kl-diary-muted) 78%, transparent);
					font-weight: 750;
				}
				.kl-book {
					width: min(820px, 94%);
					height: min(520px, calc(100% - 8px));
					position: relative;
					transform: perspective(1100px) rotateY(-7deg);
					transform-origin: 40% 50%;
				}
				@media (max-width: 720px) {
					.kl-book {
						transform: none;
						height: min(600px, calc(100% - 8px));
					}
				}
				.kl-book-cover {
					position: absolute;
					inset: 0;
					border-radius: 22px;
					background: ${styles.coverBg};
					border: 1px solid ${styles.coverBorder};
					box-shadow: 0 26px 64px rgba(0,0,0,0.28);
					overflow: hidden;
				}
				.kl-book-cover::before {
					content: "";
					position: absolute;
					inset: 0;
					background:
						radial-gradient(1000px 320px at 8% 0%, ${styles.glow}, transparent 58%),
						linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.10));
					pointer-events: none;
				}
				.kl-book-spine {
					position: absolute;
					left: -18px;
					top: 16px;
					bottom: 16px;
					width: 34px;
					border-radius: 18px;
					background: linear-gradient(180deg, ${styles.spineA}, ${styles.spineB});
					box-shadow: 0 18px 40px rgba(0,0,0,0.22);
				}
				.kl-book-pages-edge {
					position: absolute;
					right: -12px;
					top: 22px;
					bottom: 22px;
					width: 26px;
					border-radius: 16px;
					background: linear-gradient(180deg, var(--kl-diary-paper-b), var(--kl-diary-paper-a));
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke);
				}
				.kl-book-title {
					position: absolute;
					left: 28px;
					top: 26px;
					font-weight: 900;
					letter-spacing: 0.01em;
					font-size: 34px;
					color: ${styles.titleColor};
				}
				.kl-book-sub {
					position: absolute;
					left: 28px;
					top: 74px;
					font-weight: 700;
					font-size: 14px;
					color: ${styles.subColor};
				}
				.kl-pages {
					position: absolute;
					left: 22px;
					right: 22px;
					top: 116px;
					bottom: 22px;
					border-radius: 18px;
					background: linear-gradient(180deg, var(--kl-diary-paper-b), var(--kl-diary-paper-a));
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke);
					padding: 14px;
					box-sizing: border-box;
					overflow: hidden;
				}
				.kl-pagesTop {
					display: grid;
					grid-template-columns: 1fr auto;
					align-items: center;
					gap: 12px;
					padding: 10px;
					border-radius: 14px;
					background: var(--kl-diary-surface);
					border: 1px solid var(--kl-diary-stroke);
					box-shadow: 0 10px 26px rgba(0,0,0,0.10);
					position: relative;
					z-index: 2;
				}
				@media (max-width: 720px) {
					.kl-pagesTop { grid-template-columns: 1fr; align-items: stretch; }
				}
				.kl-pagesTopLeft {
					display: flex;
					flex-direction: column;
					gap: 6px;
					min-width: 0;
				}
				.kl-pagesTitle {
					font-weight: 950;
					font-size: 14px;
					color: var(--kl-diary-ink);
					letter-spacing: 0.01em;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.kl-metaLine {
					display: flex;
					gap: 8px;
					flex-wrap: wrap;
				}
				.kl-metaPill {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					width: fit-content;
					font-weight: 900;
					font-size: 12px;
					color: var(--kl-diary-muted);
					padding: 6px 10px;
					border-radius: 999px;
					background: var(--kl-diary-surface-2);
					border: 1px solid var(--kl-diary-stroke);
				}
				.kl-status {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					width: fit-content;
					font-weight: 900;
					font-size: 12px;
					color: var(--kl-diary-muted);
					padding: 6px 10px;
					border-radius: 999px;
					background: var(--kl-diary-surface-2);
					border: 1px solid var(--kl-diary-stroke);
				}
				.kl-statusDot {
					width: 8px;
					height: 8px;
					border-radius: 999px;
					background: rgba(148,163,184,0.95);
					box-shadow: 0 0 0 3px rgba(148,163,184,0.18);
				}
				.kl-status[data-dirty="true"] .kl-statusDot {
					background: rgba(239,68,68,0.95);
					box-shadow: 0 0 0 3px rgba(239,68,68,0.16);
				}
				.kl-actions {
					display: flex;
					gap: 8px;
					align-items: center;
					justify-content: flex-end;
					flex-wrap: wrap;
				}
				@media (max-width: 720px) {
					.kl-actions { justify-content: flex-start; }
				}
				.kl-saveBtn {
					border-radius: 999px;
					border: 0;
					padding: 10px 14px;
					font-weight: 900;
					cursor: pointer;
					background: var(--accent-green, #16a34a);
					color: white;
					box-shadow: 0 14px 30px rgba(0,0,0,0.14);
				}
				.kl-saveBtn[disabled] {
					opacity: 0.55;
					cursor: not-allowed;
				}
				.kl-dangerBtn {
					border-radius: 999px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 10px 14px;
					font-weight: 900;
					cursor: pointer;
					background: var(--kl-diary-surface);
					color: var(--kl-diary-ink);
				}
				.kl-dangerBtn:hover {
					border-color: rgba(239,68,68,0.35);
					box-shadow: 0 0 0 3px rgba(254,202,202,0.65);
				}
				.kl-backBtn {
					border-radius: 999px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 10px 14px;
					font-weight: 900;
					cursor: pointer;
					background: var(--kl-diary-surface);
					color: var(--kl-diary-ink);
				}
				.kl-backBtn:hover {
					border-color: color-mix(in srgb, var(--kl-diary-stroke) 70%, var(--accent-green, #16a34a));
					box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 60%, transparent);
				}
				.kl-pagesPattern {
					position: absolute;
					inset: 0;
					background: ${styles.pagesPattern};
					pointer-events: none;
					opacity: 1;
				}
				.kl-spreadArea {
					position: relative;
					height: calc(100% - 70px);
					z-index: 1;
				}
				.kl-spreadGrid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 12px;
					height: 100%;
				}
				@media (max-width: 720px) {
					.kl-spreadArea { height: calc(100% - 124px); }
					.kl-spreadGrid { grid-template-columns: 1fr; }
				}
				.kl-page {
					border-radius: 14px;
					background: var(--kl-diary-surface-2);
					border: 1px solid var(--kl-diary-stroke);
					box-shadow: inset 0 0 0 1px var(--kl-diary-stroke-weak);
					padding: 12px;
					box-sizing: border-box;
					overflow: auto;
				}
				.kl-pageTitle {
					font-weight: 900;
					font-size: 14px;
					color: var(--kl-diary-ink);
					margin-bottom: 10px;
					padding-bottom: 8px;
					border-bottom: 1px solid var(--kl-diary-stroke-weak);
				}
				.kl-label {
					font-weight: 900;
					font-size: 12px;
					color: var(--kl-diary-muted);
					margin-bottom: 6px;
				}
				.kl-field {
					margin-bottom: 10px;
				}
				.kl-textarea {
					width: 100%;
					min-height: 96px;
					resize: vertical;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 12px 12px;
					font-weight: 800;
					outline: none;
					background: color-mix(in srgb, var(--kl-diary-paper-a) 80%, transparent);
					color: var(--kl-diary-ink);
					font-family: inherit;
				}
				.kl-entryItem {
					width: 100%;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 10px 10px;
					font-weight: 900;
					cursor: pointer;
					background: var(--kl-diary-surface);
					color: var(--kl-diary-ink);
					display: flex;
					align-items: flex-start;
					justify-content: space-between;
					gap: 10px;
					text-align: left;
				}
				.kl-entryText {
					min-width: 0;
					display: grid;
					gap: 2px;
				}
				.kl-entryHeadline {
					font-weight: 950;
					font-size: 13px;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.kl-entryMeta {
					font-weight: 850;
					font-size: 12px;
					opacity: 0.72;
					white-space: nowrap;
				}
				@media (max-width: 720px) {
					.kl-entryMeta { white-space: normal; }
				}
				.kl-ctaRow {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 10px;
				}
				@media (max-width: 720px) {
					.kl-ctaRow { grid-template-columns: 1fr; }
				}
				.kl-pageActions {
					display: flex;
					gap: 10px;
					flex-wrap: wrap;
					margin-top: 10px;
				}
				.kl-flipSheet {
					position: absolute;
					top: 0;
					bottom: 0;
					width: 50%;
					border-radius: 14px;
					z-index: 10;
					background: linear-gradient(90deg, var(--kl-diary-paper-b), var(--kl-diary-paper-a));
					box-shadow: 0 18px 44px rgba(0,0,0,0.18);
					backface-visibility: hidden;
					transform-style: preserve-3d;
				}
				.kl-flipSheet[data-dir="next"] {
					right: 0;
					transform-origin: left center;
					animation: klFlipNext ${FLIP_DUR_MS}ms ease-in-out;
				}
				.kl-flipSheet[data-dir="prev"] {
					left: 0;
					transform-origin: right center;
					animation: klFlipPrev ${FLIP_DUR_MS}ms ease-in-out;
				}
				@keyframes klFlipNext {
					from { transform: rotateY(0deg); }
					to { transform: rotateY(-180deg); }
				}
				@keyframes klFlipPrev {
					from { transform: rotateY(0deg); }
					to { transform: rotateY(180deg); }
				}
				.kl-pages textarea {
					width: 100%;
					height: calc(100% - 44px);
					resize: none;
					border: none;
					outline: none;
					background: transparent;
					color: var(--kl-diary-ink);
					font-weight: 700;
					font-size: 15px;
					line-height: 1.55;
					font-family: inherit;
					position: relative;
					z-index: 1;
				}
				.kl-pages textarea::placeholder {
					color: color-mix(in srgb, var(--kl-diary-muted) 78%, transparent);
					font-weight: 700;
				}

				.kl-setup {
					height: 100%;
					display: flex;
					flex-direction: column;
					gap: 14px;
				}
				.kl-chooser {
					height: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 14px;
				}
				.kl-chooserBtns {
					display: flex;
					gap: 12px;
					flex-wrap: wrap;
					justify-content: center;
				}
				.kl-load {
					height: 100%;
					display: flex;
					flex-direction: column;
					gap: 12px;
					flex: 1 1 auto;
					min-height: 0;
				}
				.kl-loadFolders {
					display: flex;
					gap: 10px;
					flex-wrap: wrap;
				}
				.kl-loadList {
					display: grid;
					gap: 10px;
					overflow: auto;
					padding-right: 2px;
					flex: 1 1 auto;
					min-height: 0;
					align-content: start;
				}
				.kl-loadRow {
					display: block;
				}
				.kl-loadItem {
					width: 100%;
					border-radius: 16px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 12px 12px;
					font-weight: 900;
					cursor: default;
					background: var(--kl-diary-surface);
					color: var(--kl-diary-ink);
					display: flex;
					align-items: flex-start;
					justify-content: space-between;
					gap: 10px;
				}
				.kl-loadItemMain {
					flex: 1 1 auto;
					min-width: 0;
					border: none;
					background: transparent;
					padding: 0;
					margin: 0;
					color: inherit;
					font: inherit;
					text-align: left;
					cursor: pointer;
				}
				.kl-loadName {
					display: block;
					min-width: 0;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				.kl-loadRight {
					display: inline-flex;
					align-items: flex-start;
					gap: 10px;
					flex: 0 0 auto;
				}
				.kl-loadMeta {
					font-weight: 800;
					font-size: 12px;
					opacity: 0.7;
					white-space: nowrap;
				}
				.kl-loadMenuWrap {
					position: relative;
					display: flex;
					flex-direction: column;
					align-items: flex-end;
					gap: 8px;
					flex: 0 0 auto;
				}
				.kl-loadMenuBtn {
					border: 1px solid var(--kl-diary-stroke);
					border-radius: 12px;
					background: color-mix(in srgb, var(--kl-diary-surface) 88%, transparent);
					color: color-mix(in srgb, var(--kl-diary-ink) 78%, var(--kl-diary-muted));
					padding: 8px;
					cursor: pointer;
					line-height: 0;
					display: grid;
					place-items: center;
				}
				.kl-loadMenuBtn:hover {
					background: color-mix(in srgb, var(--kl-diary-surface) 70%, var(--kl-diary-paper-a));
					color: var(--kl-diary-ink);
				}
				.kl-loadMenu {
					position: static;
					min-width: 160px;
					padding: 6px;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					background: color-mix(in srgb, var(--kl-diary-surface) 92%, var(--kl-diary-paper-a));
					box-shadow: 0 18px 44px rgba(0,0,0,0.22);
					display: grid;
					gap: 4px;
				}
				.kl-loadMenuItem {
					width: 100%;
					border: none;
					background: transparent;
					color: var(--kl-diary-ink);
					font-weight: 850;
					font-size: 13px;
					padding: 10px 10px;
					border-radius: 12px;
					cursor: pointer;
					text-align: left;
				}
				.kl-loadMenuItem:hover {
					background: color-mix(in srgb, var(--kl-diary-ink) 10%, transparent);
				}
				.kl-loadMenuItemDanger {
					color: color-mix(in srgb, #ef4444 78%, var(--kl-diary-ink));
				}
				.kl-loadMenuItemDanger:hover {
					background: color-mix(in srgb, #ef4444 14%, transparent);
				}
				.kl-setup-row {
					display: flex;
					gap: 12px;
					flex-wrap: wrap;
				}
				.kl-pill {
					border: 1px solid var(--kl-diary-stroke);
					border-radius: 999px;
					padding: 9px 12px;
					background: var(--kl-diary-surface);
					cursor: pointer;
					font-weight: 800;
					font-size: 13px;
					color: var(--kl-diary-ink);
				}
				.kl-pill[data-active="true"] {
					border-color: rgba(var(--accent-green-rgb, 22,163,74),0.45);
					box-shadow: 0 0 0 3px rgba(var(--accent-green-soft-rgb, 187,247,208),0.65);
				}
				.kl-input {
					width: 100%;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 12px 12px;
					font-weight: 800;
					outline: none;
					background: color-mix(in srgb, var(--kl-diary-paper-a) 80%, transparent);
					color: var(--kl-diary-ink);
				}
				.kl-input::placeholder {
					color: color-mix(in srgb, var(--kl-diary-muted) 80%, transparent);
					font-weight: 800;
				}
				.kl-grid2 {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 10px;
				}
				@media (max-width: 720px) {
					.kl-grid2 { grid-template-columns: 1fr; }
				}
				.kl-desc {
					min-height: 92px;
					resize: vertical;
				}
				.kl-hint {
					margin-top: 6px;
					color: var(--kl-diary-muted);
					font-weight: 800;
					font-size: 12px;
				}
				.kl-stepper {
					display: flex;
					align-items: center;
					gap: 10px;
					flex-wrap: wrap;
					margin: 10px 0 16px;
				}
				.kl-step {
					display: inline-flex;
					align-items: center;
					gap: 10px;
					border-radius: 999px;
					padding: 8px 12px;
					border: 1px solid var(--kl-diary-stroke);
					background: color-mix(in srgb, var(--kl-diary-surface) 70%, transparent);
					color: var(--kl-diary-muted);
					font-weight: 900;
				}
				.kl-step[data-active="true"] {
					color: var(--kl-diary-ink);
					border-color: color-mix(in srgb, var(--kl-diary-ink) 18%, var(--kl-diary-stroke));
					box-shadow: 0 14px 34px rgba(0,0,0,0.12);
				}
				.kl-step[data-done="true"] {
					color: var(--kl-diary-ink);
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 55%, var(--kl-diary-stroke));
					background: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 24%, var(--kl-diary-surface));
				}
				.kl-stepDot {
					width: 22px;
					height: 22px;
					border-radius: 999px;
					display: grid;
					place-items: center;
					border: 1px solid var(--kl-diary-stroke);
					background: var(--kl-diary-surface);
					font-size: 12px;
				}
				.kl-stepCheck {
					width: 14px;
					height: 14px;
					display: block;
				}
				.kl-step[data-active="true"] .kl-stepDot {
					border-color: color-mix(in srgb, var(--kl-diary-ink) 25%, var(--kl-diary-stroke));
					background: color-mix(in srgb, var(--kl-diary-paper-a) 70%, transparent);
				}
				.kl-step[data-done="true"] .kl-stepDot {
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 70%, var(--kl-diary-stroke));
					background: var(--accent-green, #16a34a);
					color: var(--kl-diary-paper-a);
				}
				.kl-summary {
					border: 1px solid var(--kl-diary-stroke);
					border-radius: 18px;
					padding: 14px;
					background: color-mix(in srgb, var(--kl-diary-surface) 55%, transparent);
				}
				.kl-summaryRow {
					display: flex;
					justify-content: space-between;
					gap: 12px;
					padding: 8px 0;
					border-bottom: 1px dashed color-mix(in srgb, var(--kl-diary-stroke) 70%, transparent);
				}
				.kl-summaryRow:last-child {
					border-bottom: 0;
				}
				.kl-summaryKey {
					color: var(--kl-diary-muted);
					font-weight: 900;
				}
				.kl-summaryVal {
					color: var(--kl-diary-ink);
					font-weight: 900;
					text-align: right;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					max-width: 420px;
				}
				.kl-primary {
					border-radius: 999px;
					border: 0;
					padding: 12px 16px;
					font-weight: 900;
					cursor: pointer;
					background: var(--accent-green, #16a34a);
					color: white;
					box-shadow: 0 18px 44px rgba(0,0,0,0.22);
				}
				.kl-secondary {
					border-radius: 999px;
					border: 1px solid var(--kl-diary-stroke);
					padding: 12px 16px;
					font-weight: 900;
					cursor: pointer;
					background: var(--kl-diary-surface);
					color: var(--kl-diary-ink);
				}
				.kl-primary[disabled] {
					opacity: 0.55;
					cursor: not-allowed;
				}
				.kl-secondary[disabled] {
					opacity: 0.55;
					cursor: not-allowed;
				}
				.kl-modeRow {
					display: flex;
					gap: 10px;
					align-items: center;
					flex-wrap: wrap;
					margin-bottom: 10px;
				}
				.kl-sessionItem {
					width: 100%;
					text-align: left;
					border-radius: 14px;
					border: 1px solid var(--kl-diary-stroke);
					background: color-mix(in srgb, var(--kl-diary-surface) 70%, transparent);
					padding: 10px 12px;
					cursor: pointer;
					display: grid;
					gap: 4px;
				}
				.kl-sessionItem[data-active="true"] {
					border-color: color-mix(in srgb, var(--kl-diary-ink) 18%, var(--kl-diary-stroke));
					box-shadow: 0 18px 42px rgba(0,0,0,0.10);
				}
				.kl-sessionTitle {
					font-weight: 950;
					color: var(--kl-diary-ink);
					font-size: 13px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				.kl-sessionMeta {
					font-weight: 900;
					color: var(--kl-diary-muted);
					font-size: 12px;
					display: flex;
					gap: 10px;
					flex-wrap: wrap;
				}
				.kl-progressCard {
					border: 1px solid var(--kl-diary-stroke);
					border-radius: 18px;
					padding: 12px;
					background: color-mix(in srgb, var(--kl-diary-surface) 70%, transparent);
					margin-bottom: 12px;
				}
				.kl-progressTop {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 10px;
					flex-wrap: wrap;
					margin-bottom: 10px;
				}
				.kl-progressTitle {
					font-weight: 950;
					color: var(--kl-diary-ink);
					font-size: 13px;
				}
				.kl-chart {
					width: 100%;
					height: 120px;
					display: block;
				}
				.kl-chartGrid {
					stroke: color-mix(in srgb, var(--kl-diary-stroke) 75%, transparent);
					stroke-width: 1;
				}
				.kl-chartLine {
					fill: none;
					stroke: var(--accent-green, #16a34a);
					stroke-width: 2.5;
					stroke-linejoin: round;
					stroke-linecap: round;
				}
				.kl-chartArea {
					fill: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 40%, transparent);
				}
				.kl-progressKpis {
					display: flex;
					gap: 14px;
					flex-wrap: wrap;
					margin-top: 10px;
					color: var(--kl-diary-muted);
					font-weight: 900;
					font-size: 12px;
				}

				@media (prefers-reduced-motion: reduce) {
					.kl-book { transform: none !important; }
					.kl-flipSheet { animation: none !important; }
				}
			`}</style>

			<div className="kl-diary-root" data-theme={darkMode ? "dark" : "light"}>
				{(() => {
					const title =
						view === "create" ? "New Diary" : view === "load" ? "Load Diary" : meta?.name ?? "My Diary";
					const statusText = isDirty ? "Unsaved changes" : lastSavedAt ? "Saved" : "Not saved yet";
					const profilePills =
						view === "editor" ? [meta?.club, meta?.role, meta?.season].filter((v) => String(v ?? "").trim()) : [];

					const renderCreate = () => {
						const trimmedName = name.trim();
						const themeLabel = THEME_OPTIONS.find((t) => t.key === themeKey)?.label ?? "Theme";
						const motiveLabel = MOTIVE_OPTIONS.find((m) => m.key === motiveKey)?.label ?? "Paper";
						const steps = [
							{ key: 0, label: "Profile" },
							{ key: 1, label: "Plan" },
							{ key: 2, label: "Confirm" },
						];

						return (
							<div className="kl-editorInner" aria-label="Create diary">
								<div className="kl-pagesPattern" aria-hidden="true" />
								<div
									className="kl-page"
										style={{ width: "100%", height: "100%", overflow: "auto" }}
								>
									<div className="kl-pageTitle">Create a new diary</div>

									<div className="kl-stepper" aria-label="Setup steps">
										{steps.map((s) => (
												// done = a previous step already completed
												// We derive this from createStep to keep UX simple.
											<div
												key={s.key}
												className="kl-step"
												data-active={createStep === s.key ? "true" : "false"}
													data-done={createStep > s.key ? "true" : "false"}
												aria-label={`Step ${s.key + 1}: ${s.label}`}
											>
													<div className="kl-stepDot" aria-hidden="true">
														{createStep > s.key ? (
															<svg className="kl-stepCheck" viewBox="0 0 20 20" fill="none" aria-hidden="true">
																<path
																	d="M16.5 5.8l-7.2 8-3.3-3.3"
																	stroke="currentColor"
																	strokeWidth="2.6"
																	strokeLinecap="round"
																	strokeLinejoin="round"
																/>
															</svg>
														) : (
															s.key + 1
														)}
													</div>
												{s.label}
											</div>
										))}
									</div>

									{createStep === 0 ? (
										<>
											<div className="kl-field">
												<div className="kl-label">Name</div>
												<input
													className="kl-input"
													value={name}
													onChange={(e) => setName(e.target.value)}
													placeholder="My Diary"
													aria-label="Diary name"
												/>
												<div className="kl-hint">Football diary setup — your season, team and role.</div>
											</div>

											<div className="kl-grid2">
												<div className="kl-field">
													<div className="kl-label">Team / Club</div>
													<input
														className="kl-input"
														value={club}
														onChange={(e) => setClub(e.target.value)}
														placeholder="FC …"
														aria-label="Team or club"
													/>
												</div>
												<div className="kl-field">
													<div className="kl-label">Position / Role</div>
													<input
														className="kl-input"
														value={role}
														onChange={(e) => setRole(e.target.value)}
														placeholder="CM, ST, GK…"
														aria-label="Position or role"
													/>
												</div>
											</div>

											<div className="kl-field">
												<div className="kl-label">Season</div>
												<input
													className="kl-input"
													value={season}
													onChange={(e) => setSeason(e.target.value)}
													placeholder="2025/26"
													aria-label="Season"
												/>
												<div className="kl-hint">Example: 2025/26, Spring 2026, Pre-season.</div>
											</div>

											<div className="kl-field">
												<div className="kl-label">About</div>
												<textarea
													className="kl-input kl-desc"
													value={description}
													onChange={(e) => setDescription(e.target.value)}
													placeholder="What do you want to improve this season?"
													aria-label="Diary description"
												/>
											</div>

										<div className="kl-pageActions">
											<button type="button" className="kl-secondary" onClick={goBack} aria-label="Cancel">
												Cancel
											</button>
											<button
												type="button"
												className="kl-primary"
												onClick={() => setCreateStep(1)}
												disabled={!trimmedName}
												aria-label="Continue to style"
											>
												Continue
											</button>
										</div>
										</>
									) : createStep === 1 ? (
										<>
											<div className="kl-field">
												<div className="kl-label">Goals</div>
												<textarea
													className="kl-input kl-desc"
													value={goals}
													onChange={(e) => setGoals(e.target.value)}
													placeholder="Example: Improve weak foot, increase sprint endurance, win starting spot…"
													aria-label="Season goals"
												/>
													<div className="kl-hint">Optional — you can also track this later in sessions and progress.</div>
											</div>

											<div className="kl-field">
												<div className="kl-label">Focus areas</div>
												<textarea
													className="kl-input kl-desc"
													value={focus}
													onChange={(e) => setFocus(e.target.value)}
													placeholder="Example: first touch, scanning, finishing, 1v1 defending…"
													aria-label="Training focus areas"
												/>
												<div className="kl-hint">Short list is best (3–6 items).</div>
											</div>

											<div className="kl-field">
												<div className="kl-label">Theme</div>
												<div className="kl-setup-row">
													{THEME_OPTIONS.map((t) => (
														<button
															key={t.key}
															type="button"
															className="kl-pill"
															data-active={themeKey === t.key ? "true" : "false"}
															onClick={() => setThemeKey(t.key)}
															aria-label={`Theme ${t.label}`}
														>
															{t.label}
														</button>
													))}
												</div>
											</div>

											<div className="kl-field">
												<div className="kl-label">Paper</div>
												<div className="kl-setup-row">
													{MOTIVE_OPTIONS.map((m) => (
														<button
															key={m.key}
															type="button"
															className="kl-pill"
															data-active={motiveKey === m.key ? "true" : "false"}
															onClick={() => setMotiveKey(m.key)}
															aria-label={`Paper ${m.label}`}
														>
															{m.label}
														</button>
													))}
												</div>
											</div>

											<div className="kl-pageActions">
												<button
													type="button"
													className="kl-secondary"
													onClick={() => setCreateStep(0)}
													aria-label="Back to basics"
												>
													Back
												</button>
												<button
													type="button"
													className="kl-primary"
													onClick={() => setCreateStep(2)}
													disabled={!trimmedName}
													aria-label="Continue to confirm"
												>
													Continue
												</button>
											</div>
										</>
									) : (
										<>
											<div className="kl-field">
												<div className="kl-label">Review</div>
												<div className="kl-summary" aria-label="Diary summary">
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Name</div>
														<div className="kl-summaryVal">{trimmedName || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Team / Club</div>
														<div className="kl-summaryVal">{club.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Position</div>
														<div className="kl-summaryVal">{role.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Season</div>
														<div className="kl-summaryVal">{season.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Description</div>
														<div className="kl-summaryVal">{description.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Goals</div>
														<div className="kl-summaryVal">{goals.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Focus</div>
														<div className="kl-summaryVal">{focus.trim() || "—"}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Theme</div>
														<div className="kl-summaryVal">{themeLabel}</div>
													</div>
													<div className="kl-summaryRow">
														<div className="kl-summaryKey">Paper</div>
														<div className="kl-summaryVal">{motiveLabel}</div>
													</div>
												</div>
												<div className="kl-hint">Nothing is saved until you click Create.</div>
											</div>

											<div className="kl-pageActions">
												<button
													type="button"
													className="kl-secondary"
													onClick={() => setCreateStep(1)}
													aria-label="Back to style"
												>
													Back
												</button>
												<button
													type="button"
													className="kl-primary"
													onClick={createDiary}
													disabled={!trimmedName}
													aria-label="Create diary"
												>
													Create
												</button>
											</div>
										</>
									)}
								</div>
							</div>
						);
					};

					const renderLoad = () => (
						<div className="kl-editorInner" aria-label="Load diary">
							<div className="kl-pagesPattern" aria-hidden="true" />
							<div
								className="kl-page"
								style={{
									height: "100%",
									overflow: "hidden",
									display: "flex",
									flexDirection: "column",
									minHeight: 0,
									boxSizing: "border-box",
								}}
							>
								<div className="kl-pageTitle">Choose a diary</div>
								<div className="kl-load">
									<div className="kl-loadFolders" aria-label="Folder filter">
										<button
											type="button"
											className="kl-pill"
											data-active={loadFolderId === "all" ? "true" : "false"}
											onClick={() => setLoadFolderId("all")}
										>
											All
										</button>
										<button
											type="button"
											className="kl-pill"
											data-active={loadFolderId === "unfiled" ? "true" : "false"}
											onClick={() => setLoadFolderId("unfiled")}
										>
											Unfiled
										</button>
										{folders.map((f) => (
											<button
												key={f.id}
												type="button"
												className="kl-pill"
												data-active={loadFolderId === f.id ? "true" : "false"}
												onClick={() => setLoadFolderId(f.id)}
												aria-label={`Folder ${f.name}`}
											>
												{f.name}
											</button>
										))}
									</div>
									<div className="kl-loadList" aria-label="Diary list">
										{filteredDiaries.length === 0 ? (
											<div style={{ fontWeight: 800, fontSize: 13, color: "var(--kl-diary-muted)" }}>
												No diaries found.
											</div>
										) : (
											filteredDiaries.map((d) => (
												<div
													key={d.id}
													className="kl-loadRow"
												>
													<div className="kl-loadItem" aria-label={`Diary ${d.name}`}>
														<button
															type="button"
															className="kl-loadItemMain"
															onClick={() => loadDiaryById(d.id)}
															aria-label={`Load ${d.name}`}
														>
															<span className="kl-loadName" title={d.name}>
																{d.name}
															</span>
														</button>

														<div className="kl-loadRight">
															<span className="kl-loadMeta">
																{folderNameById(folders, d.folderId)} • {new Date(d.createdAt).toLocaleDateString()}
															</span>

															<div className="kl-loadMenuWrap" data-kl-load-menu="true">
																<button
																	type="button"
																	className="kl-loadMenuBtn"
																	onClick={(e) => {
																		e.stopPropagation();
																		setOpenLoadMenuDiaryId((prev) => (prev === d.id ? null : d.id));
																	}}
																	aria-label={`Open options for ${d.name}`}
																	title="Options"
																>
																	<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
																		<circle cx="12" cy="5" r="1.8" fill="currentColor" />
																		<circle cx="12" cy="12" r="1.8" fill="currentColor" />
																		<circle cx="12" cy="19" r="1.8" fill="currentColor" />
																	</svg>
																</button>

																{openLoadMenuDiaryId === d.id && (
																	<div className="kl-loadMenu" role="menu" aria-label={`Options for ${d.name}`}>
																		<button
																			type="button"
																			className="kl-loadMenuItem"
																			onClick={() => {
																			setOpenLoadMenuDiaryId(null);
																			renameDiaryById(d.id);
																		}}
																		role="menuitem"
																		aria-label={`Rename ${d.name}`}
																	>
																		Rename
																	</button>
																		<button
																			type="button"
																			className="kl-loadMenuItem"
																			onClick={() => {
																			setOpenLoadMenuDiaryId(null);
																			moveDiaryById(d.id);
																		}}
																		role="menuitem"
																		aria-label={`Move ${d.name}`}
																	>
																		Move
																	</button>
																		<button
																			type="button"
																			className="kl-loadMenuItem kl-loadMenuItemDanger"
																			onClick={() => {
																			setOpenLoadMenuDiaryId(null);
																			deleteDiaryById(d.id);
																		}}
																		role="menuitem"
																		aria-label={`Delete ${d.name}`}
																	>
																		Delete
																	</button>
																	</div>
																)}
															</div>
														</div>
													</div>
												</div>
										))
										)}
									</div>
									<div className="kl-pageActions">
										<button type="button" className="kl-secondary" onClick={() => setView("create")} aria-label="Create new diary">
											New diary
										</button>
									</div>
								</div>
							</div>
						</div>
					);

					const renderEditor = () => (
						<div className="kl-editorGrid" aria-label="Diary editor">
							<div className="kl-chaptersPane" aria-label="Chapters">
								<div className="kl-chaptersHead">
									<div className="kl-modeRow" aria-label="Editor mode">
										<button
											type="button"
											className="kl-pill"
											data-active={editorMode === "chapters" ? "true" : "false"}
											onClick={() => setEditorMode("chapters")}
										>
											Writing
										</button>
										<button
											type="button"
											className="kl-pill"
											data-active={editorMode === "sessions" ? "true" : "false"}
											onClick={() => setEditorMode("sessions")}
										>
											Sessions
										</button>
									</div>

									{editorMode === "chapters" ? (
										<>
											<div className="kl-chaptersTitle">Chapters</div>
											<select
												className="kl-select"
												value={chapterCategoryFilter}
												onChange={(e) => setChapterCategoryFilter(e.target.value)}
												aria-label="Filter chapters by category"
											>
												<option value="all">All categories</option>
												{chapterCategories.map((c) => (
													<option key={c} value={c}>
														{c}
													</option>
												))}
											</select>
											<button type="button" className="kl-primary" onClick={addChapter} aria-label="Add chapter">
												New chapter
											</button>
										</>
									) : (
										<>
											<div className="kl-chaptersTitle">Sessions</div>
											<div className="kl-modeRow" style={{ marginBottom: 0 }}>
												<button type="button" className="kl-primary" onClick={() => addSession("practice")}>
													New practice
												</button>
												<button type="button" className="kl-secondary" onClick={() => addSession("match")}>
													New match
												</button>
											</div>
										</>
									)}
								</div>

								{editorMode === "chapters" ? (
									<>
										<div className="kl-chaptersList">
											{filteredChapters.map((c) => (
												<button
													key={c.id}
													type="button"
													className="kl-chapterItem"
													data-active={c.id === activeChapterId ? "true" : "false"}
													onClick={() => {
														setActiveChapterId(c.id);
														setText(c.text ?? "");
													}}
													aria-label={`Open chapter ${c.title}`}
												>
													<div className="kl-chapterTitle">{c.title}</div>
													<div className="kl-chapterMeta">{(c.category ?? "").trim() ? c.category : "No category"}</div>
												</button>
											))}
										</div>

										<div className="kl-chaptersActions">
											<button type="button" className="kl-secondary" onClick={renameChapter} disabled={!activeChapter}>
												Rename
											</button>
											<button type="button" className="kl-secondary" onClick={setChapterCategory} disabled={!activeChapter}>
												Category
											</button>
											<button type="button" className="kl-secondary" onClick={deleteChapter} disabled={!activeChapter}>
												Delete
											</button>
										</div>
									</>
								) : (
									<>
										<div className="kl-chaptersList" aria-label="Session list">
											{entries.length === 0 ? (
												<div style={{ fontWeight: 800, fontSize: 13, color: "var(--kl-diary-muted)" }}>
													No sessions yet.
												</div>
											) : (
												entries.map((e) => {
													const title =
														e.type === "match"
															? `Match${e.opponent ? ` vs ${e.opponent}` : ""}`
														: "Practice";
													const when = `${e.date}${e.time ? ` ${e.time}` : ""}`;
													const metaLine =
														e.type === "match"
															? `${e.venue === "away" ? "Away" : "Home"} • ${e.goalsFor}-${e.goalsAgainst} • ${e.minutes} min`
														: `${e.durationMin} min • RPE ${e.rpe}`;
													return (
														<button
															key={e.id}
															type="button"
															className="kl-sessionItem"
															data-active={e.id === activeEntryId ? "true" : "false"}
															onClick={() => setActiveEntryId(e.id)}
															aria-label={`Open session ${title}`}
														>
															<div className="kl-sessionTitle">{title}</div>
															<div className="kl-sessionMeta">
																<span>{when}</span>
																<span>{metaLine}</span>
															</div>
														</button>
													);
												})
											)}
										</div>

										<div className="kl-chaptersActions">
											<button type="button" className="kl-secondary" onClick={deleteSession} disabled={!activeEntry}>
												Delete
											</button>
										</div>
									</>
								)}
							</div>

							<div className="kl-editorMain">
								<div className="kl-pagesPattern" aria-hidden="true" />
								{editorMode === "chapters" ? (
									<textarea
										ref={editorRef}
										className="kl-editorTextarea"
										value={text}
										onChange={(e) => setText(e.target.value)}
										placeholder="Write whatever you want…"
										aria-label="Diary text"
									/>
								) : (
									(() => {
										const series = makeLastNDaysSeries(entries, 30, progressMetric);
										const w = 640;
										const h = 120;
										const pad = 10;
										const pts = makePolylinePoints(series, w, h, pad);
										const last7 = series.slice(-7).reduce((acc, p) => acc + (Number(p.value) || 0), 0);
										const last30 = series.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
										const max = Math.max(0, ...series.map((p) => Number(p.value) || 0));
										const metricLabel =
											progressMetric === "sessions"
												? "Sessions"
												: progressMetric === "minutes"
													? "Minutes"
													: progressMetric === "rpe"
														? "RPE"
														: progressMetric === "g+a"
															? "Goals+Assists"
															: "Load";

										const area = pts
											? `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`
											: "";

										return (
											<div className="kl-page" style={{ height: "100%", overflow: "auto" }} aria-label="Sessions">
												<div className="kl-progressCard" aria-label="Progress chart">
													<div className="kl-progressTop">
														<div className="kl-progressTitle">Progress (last 30 days)</div>
														<select
															className="kl-select"
															value={progressMetric}
															onChange={(e) => setProgressMetric(e.target.value)}
															aria-label="Progress metric"
														>
															<option value="load">Load (practice min×RPE, match minutes)</option>
															<option value="sessions">Sessions count</option>
															<option value="minutes">Minutes (match) / duration (practice)</option>
															<option value="rpe">RPE (practice)</option>
															<option value="g+a">Goals + assists (match)</option>
														</select>
													</div>

													<svg className="kl-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="Progress chart">
														<line className="kl-chartGrid" x1="0" y1={h / 2} x2={w} y2={h / 2} />
														<line className="kl-chartGrid" x1="0" y1={h - pad} x2={w} y2={h - pad} />
														{area ? <polygon className="kl-chartArea" points={area} /> : null}
														{pts ? <polyline className="kl-chartLine" points={pts} /> : null}
													</svg>

													<div className="kl-progressKpis" aria-label="Progress stats">
														<span>{metricLabel}</span>
														<span>7d: {Math.round(last7 * 10) / 10}</span>
														<span>30d: {Math.round(last30 * 10) / 10}</span>
														<span>Max/day: {Math.round(max * 10) / 10}</span>
													</div>
												</div>

												{activeEntry ? (
													<>
														<div className="kl-pageTitle">{activeEntry.type === "match" ? "Match" : "Practice"} session</div>

														<div className="kl-grid2">
											<div className="kl-field">
												<div className="kl-label">Date</div>
												<input
													type="date"
													className="kl-input"
													value={activeEntry.date}
													onChange={(e) => updateActiveEntry({ date: e.target.value })}
													aria-label="Session date"
												/>
											</div>
											<div className="kl-field">
												<div className="kl-label">Time</div>
												<input
													type="time"
													className="kl-input"
													value={activeEntry.time || ""}
													onChange={(e) => updateActiveEntry({ time: e.target.value })}
													aria-label="Session time"
												/>
											</div>
										</div>

										<div className="kl-field">
											<div className="kl-label">What I did</div>
											<textarea
												className="kl-input kl-desc"
												value={activeEntry.did}
												onChange={(e) => updateActiveEntry({ did: e.target.value })}
												placeholder="Warmup, drills, tactical work, match role…"
												aria-label="What I did"
											/>
										</div>

										<div className="kl-grid2">
											<div className="kl-field">
												<div className="kl-label">Did good</div>
												<textarea
													className="kl-input kl-desc"
													value={activeEntry.didGood}
													onChange={(e) => updateActiveEntry({ didGood: e.target.value })}
													placeholder="1–3 clear positives"
													aria-label="Did good"
												/>
											</div>
											<div className="kl-field">
												<div className="kl-label">Need work</div>
												<textarea
													className="kl-input kl-desc"
													value={activeEntry.needWork}
													onChange={(e) => updateActiveEntry({ needWork: e.target.value })}
													placeholder="What to improve next time"
													aria-label="Need work"
												/>
											</div>
										</div>

										{activeEntry.type === "practice" ? (
											<>
												<div className="kl-grid2">
													<div className="kl-field">
														<div className="kl-label">Duration (min)</div>
														<input
															type="number"
															className="kl-input"
															value={activeEntry.durationMin}
															onChange={(e) => updateActiveEntry({ durationMin: clampNumber(e.target.value, { min: 0, max: 600, fallback: 0 }) })}
															aria-label="Practice duration"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">RPE (1–10)</div>
														<input
															type="number"
															className="kl-input"
															value={activeEntry.rpe}
															onChange={(e) => updateActiveEntry({ rpe: clampNumber(e.target.value, { min: 1, max: 10, fallback: 5 }) })}
															aria-label="RPE"
														/>
													</div>
												</div>

											<div className="kl-grid2">
													<div className="kl-field">
														<div className="kl-label">Focus</div>
														<input
															className="kl-input"
															value={activeEntry.focus}
															onChange={(e) => updateActiveEntry({ focus: e.target.value })}
															placeholder="First touch, scanning…"
															aria-label="Practice focus"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">Feeling</div>
														<input
															className="kl-input"
															value={activeEntry.feeling}
															onChange={(e) => updateActiveEntry({ feeling: e.target.value })}
															placeholder="Fresh, tired…"
															aria-label="Feeling"
														/>
													</div>
												</div>

											<div className="kl-field">
												<div className="kl-label">Drills / content</div>
												<textarea
													className="kl-input kl-desc"
													value={activeEntry.drills}
													onChange={(e) => updateActiveEntry({ drills: e.target.value })}
													placeholder="Passing patterns, 1v1, finishing…"
													aria-label="Drills"
												/>
											</div>
										</>
									) : (
										<>
											<div className="kl-field">
												<div className="kl-label">Opponent</div>
												<input
													className="kl-input"
													value={activeEntry.opponent}
													onChange={(e) => updateActiveEntry({ opponent: e.target.value })}
													placeholder="Opponent name"
													aria-label="Opponent"
												/>
											</div>

											<div className="kl-grid2">
												<div className="kl-field">
													<div className="kl-label">Venue</div>
													<select
														className="kl-select"
														value={activeEntry.venue}
														onChange={(e) => updateActiveEntry({ venue: e.target.value === "away" ? "away" : "home" })}
														aria-label="Venue"
													>
														<option value="home">Home</option>
														<option value="away">Away</option>
													</select>
												</div>
												<div className="kl-field">
													<div className="kl-label">Minutes</div>
													<input
														type="number"
														className="kl-input"
														value={activeEntry.minutes}
														onChange={(e) => updateActiveEntry({ minutes: clampNumber(e.target.value, { min: 0, max: 130, fallback: 0 }) })}
														aria-label="Minutes played"
													/>
												</div>
											</div>

											<div className="kl-grid2">
												<div className="kl-field">
													<div className="kl-label">Score (us)</div>
													<input
														type="number"
														className="kl-input"
														value={activeEntry.goalsFor}
														onChange={(e) => updateActiveEntry({ goalsFor: clampNumber(e.target.value, { min: 0, max: 99, fallback: 0 }) })}
														aria-label="Goals for"
													/>
												</div>
												<div className="kl-field">
													<div className="kl-label">Score (them)</div>
													<input
														type="number"
														className="kl-input"
														value={activeEntry.goalsAgainst}
														onChange={(e) => updateActiveEntry({ goalsAgainst: clampNumber(e.target.value, { min: 0, max: 99, fallback: 0 }) })}
														aria-label="Goals against"
													/>
												</div>
											</div>

											<div className="kl-grid2">
												<div className="kl-field">
													<div className="kl-label">Position</div>
													<input
														className="kl-input"
														value={activeEntry.position}
														onChange={(e) => updateActiveEntry({ position: e.target.value })}
														placeholder="ST, CM…"
														aria-label="Position"
													/>
												</div>
												<div className="kl-field">
													<div className="kl-label">Goal contrib.</div>
													<div className="kl-grid2">
														<input
															type="number"
															className="kl-input"
															value={activeEntry.goals}
															onChange={(e) => updateActiveEntry({ goals: clampNumber(e.target.value, { min: 0, max: 20, fallback: 0 }) })}
															aria-label="Goals"
														/>
														<input
															type="number"
															className="kl-input"
															value={activeEntry.assists}
															onChange={(e) => updateActiveEntry({ assists: clampNumber(e.target.value, { min: 0, max: 20, fallback: 0 }) })}
															aria-label="Assists"
														/>
													</div>
												</div>
											</div>
										</>
									)}

										<div className="kl-field">
											<div className="kl-label">Notes (optional)</div>
											<textarea
												className="kl-input kl-desc"
												value={activeEntry.notes}
												onChange={(e) => updateActiveEntry({ notes: e.target.value })}
												placeholder="Anything else to remember"
												aria-label="Notes"
											/>
										</div>
										</>
										) : (
											<div style={{ fontWeight: 800, fontSize: 13, color: "var(--kl-diary-muted)" }}>
												Create a practice or match session to start logging.
											</div>
										)}
										</div>
									);
									})()
								)}
							</div>
						</div>
					);

					return (
						<div className="kl-editorShell">
							<div className="kl-editorTop">
								<div className="kl-pagesTopLeft">
									<div className="kl-pagesTitle">{title}</div>
									{profilePills.length ? (
										<div className="kl-metaLine" aria-label="Diary profile">
											{profilePills.map((t) => (
												<span key={t} className="kl-metaPill">
													{t}
												</span>
											))}
										</div>
									) : null}
									{view === "editor" ? (
										<div className="kl-status" data-dirty={isDirty ? "true" : "false"}>
											<span className="kl-statusDot" aria-hidden="true" />
											{statusText}
										</div>
									) : null}
								</div>
								<div className="kl-actions">
									<button type="button" className="kl-backBtn" onClick={goBack} aria-label="Back">
										Back
									</button>
									{view === "editor" ? (
										<>
											<button type="button" className="kl-dangerBtn" onClick={deleteDiary} aria-label="Reset diary">
											Reset
										</button>
										<button
											type="button"
											className="kl-saveBtn"
											onClick={saveText}
											disabled={!chapterKeys || !isDirty}
											aria-label="Save diary"
										>
											Save
										</button>
									</>
									) : null}
								</div>
							</div>

							<div className="kl-editorBody">
								<div className="kl-editorPaper">
									{view === "create" ? renderCreate() : view === "load" ? renderLoad() : renderEditor()}
								</div>
							</div>
						</div>
					);
				})()}
			</div>
		</>
	);
}

