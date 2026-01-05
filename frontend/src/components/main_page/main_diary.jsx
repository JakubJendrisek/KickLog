import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "kicklog.diary.meta.v1";
const DIARIES_KEY = "kicklog.diary.items.v1";
const FOLDERS_KEY = "kicklog.diary.folders.v1";
const ACTIVE_DIARY_KEY = "kicklog.diary.activeId.v1";
const ENTRIES_PREFIX = "kicklog.diary.entries.v1:";
const ENTRY_SAVED_PREFIX = "kicklog.diary.entry.saved.v1:";
const ENTRY_DRAFT_PREFIX = "kicklog.diary.entry.draft.v1:";

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

function clampNumber(value, { min, max, fallback }) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function normalizeEntries(value) {
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
			highlights: typeof e.highlights === "string" ? e.highlights : "",
			improvements: typeof e.improvements === "string" ? e.improvements : "",
			// Shared
			notes: typeof e.notes === "string" ? e.notes : "",
		}))
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
		createdAt: now,
		updatedAt: now,
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

export default function MainDiary({ darkMode, onBack }) {
	const [text, setText] = useState("");
	const [lastSavedText, setLastSavedText] = useState("");
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [savedMeta, setSavedMeta] = useState(null);
	const [meta, setMeta] = useState(null);
	const [view, setView] = useState("chooser"); // chooser | load | create | book

	// Setup form state
	const [name, setName] = useState("");
	const [themeKey, setThemeKey] = useState("accent");
	const [motiveKey, setMotiveKey] = useState("clean");

	const [folders, setFoldersState] = useState([]);
	const [diaries, setDiariesState] = useState([]);
	const [loadFolderId, setLoadFolderId] = useState("all"); // all | unfiled | <folderId>

	const [entries, setEntries] = useState([]);
	const [activeEntryId, setActiveEntryId] = useState(null);
	const [spread, setSpread] = useState("index"); // index | edit | report
	const [form, setForm] = useState(null);
	const [savedSnapshot, setSavedSnapshot] = useState(null);
	const [isFlipping, setIsFlipping] = useState(false);
	const [flipDir, setFlipDir] = useState("next");

	const activeEntry = useMemo(() => {
		if (!activeEntryId) return null;
		return entries.find((e) => e.id === activeEntryId) ?? null;
	}, [activeEntryId, entries]);

	useEffect(() => {
		const refresh = () => {
			setFoldersState(loadFolders());
			setDiariesState(loadDiaries());
		};
		refresh();
		window.addEventListener("kicklog:foldersChanged", refresh);
		window.addEventListener("kicklog:diariesChanged", refresh);
		window.addEventListener("kicklog:diaryEntriesChanged", refresh);
		return () => {
			window.removeEventListener("kicklog:foldersChanged", refresh);
			window.removeEventListener("kicklog:diariesChanged", refresh);
			window.removeEventListener("kicklog:diaryEntriesChanged", refresh);
		};
	}, []);

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				// Single-diary mode: always have exactly one diary.
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
				setView("book");
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
					themeKey: parsed.themeKey,
					motiveKey: parsed.motiveKey,
					createdAt: parsed.createdAt ?? Date.now(),
					folderId: typeof parsed.folderId === "string" ? parsed.folderId : null,
				});
				setSavedMeta(migrated);
				setMeta(migrated);
				setName(migrated.name ?? "My Diary");
				setThemeKey(migrated.themeKey ?? "accent");
				setMotiveKey(migrated.motiveKey ?? "clean");
				setView("book");
				setDiariesState(loadDiaries());
			}
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		if (!meta?.createdAt) return;
		const list = loadEntries(meta.createdAt);
		setEntries(list);
		setActiveEntryId((prev) => {
			if (prev && list.some((e) => e.id === prev)) return prev;
			return list[0]?.id ?? null;
		});
		setSpread("index");
		setForm(null);
		setSavedSnapshot(null);
	}, [meta?.createdAt]);

	useEffect(() => {
		if (!activeEntryId) {
			setForm(null);
			setSavedSnapshot(null);
			return;
		}
		const current = entries.find((e) => e.id === activeEntryId);
		if (!current) {
			setForm(null);
			setSavedSnapshot(null);
			return;
		}
		setForm((prev) => {
			if (prev && prev.id === current.id) return prev;
			return { ...current };
		});
		setSavedSnapshot({ ...current });
	}, [activeEntryId, entries]);

	useEffect(() => {
		if (!isFlipping) return;
		const t = window.setTimeout(() => setIsFlipping(false), FLIP_DUR_MS + 30);
		return () => window.clearTimeout(t);
	}, [isFlipping]);

	const flipTo = (dir, nextSpread) => {
		setFlipDir(dir === "prev" ? "prev" : "next");
		setIsFlipping(true);
		window.setTimeout(() => {
			setSpread(nextSpread);
		}, FLIP_DUR_MS * 0.45);
	};

	const createNewEntry = (type) => {
		if (!meta?.createdAt) return;
		const entry = makeEntry(type);
		const next = [entry, ...entries];
		setEntries(next);
		saveEntries(meta.createdAt, next);
		setActiveEntryId(entry.id);
		setForm({ ...entry });
		setSavedSnapshot({ ...entry });
		flipTo("next", "edit");
	};

	const openEntry = (id) => {
		setActiveEntryId(id);
		flipTo("next", "edit");
	};

	const openIndex = () => {
		flipTo("prev", "index");
	};

	const openReport = () => {
		flipTo("next", "report");
	};

	const openEdit = () => {
		flipTo("prev", "edit");
	};

	const setField = (key, value) => {
		setForm((prev) => {
			if (!prev) return prev;
			return { ...prev, [key]: value, updatedAt: Date.now() };
		});
	};

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

	// Load saved/draft entry when diary meta becomes available.
	useEffect(() => {
		if (!entryKeys) return;
		try {
			const draftRaw = window.localStorage.getItem(entryKeys.draft);
			const savedRaw = window.localStorage.getItem(entryKeys.saved);
			const initial = draftRaw ?? savedRaw ?? "";
			setText(initial);
			setLastSavedText(savedRaw ?? "");
			setLastSavedAt(savedRaw != null ? Date.now() : null);

			if (meta?.createdAt) {
				const existingEntries = loadEntries(meta.createdAt);
				if (existingEntries.length === 0 && (savedRaw || draftRaw)) {
					const migrated = { ...makeEntry("practice"), notes: initial, updatedAt: Date.now() };
					const next = [migrated];
					saveEntries(meta.createdAt, next);
					setEntries(next);
					setActiveEntryId(migrated.id);
				}
			}
		} catch {
			// ignore
		}
	}, [entryKeys]);

	const isDirty = useMemo(() => {
		if (!form || !savedSnapshot) return false;
		return JSON.stringify(form) !== JSON.stringify(savedSnapshot);
	}, [form, savedSnapshot]);

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

	const saveEntry = () => {
		if (!entryKeys || !meta || !meta.createdAt || !form) return;
		try {
			// Keep legacy saved/draft keys in sync with notes (best-effort).
			window.localStorage.setItem(entryKeys.saved, String(form.notes ?? ""));
			window.localStorage.removeItem(entryKeys.draft);
		} catch {
			// ignore
		}

		const now = Date.now();
		const nextEntry = normalizeEntries([{ ...form, updatedAt: now }])[0];
		const nextEntries = entries.some((e) => e.id === nextEntry.id)
			? entries.map((e) => (e.id === nextEntry.id ? nextEntry : e))
			: [nextEntry, ...entries];
		setEntries(nextEntries);
		saveEntries(meta.createdAt, nextEntries);
		setSavedSnapshot({ ...nextEntry });
		setLastSavedText(String(nextEntry.notes ?? ""));
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
					k.startsWith(ENTRY_DRAFT_PREFIX)
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
		setEntries([]);
		setActiveEntryId(null);
		setSpread("index");
		setForm(null);
		setSavedSnapshot(null);
		setText("");
		setLastSavedText("");
		setLastSavedAt(null);
		setView("book");
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(createdAt));
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
			if (metaToClear?.createdAt) {
				const id = String(metaToClear.createdAt);
				window.localStorage.removeItem(`${ENTRY_SAVED_PREFIX}${id}`);
				window.localStorage.removeItem(`${ENTRY_DRAFT_PREFIX}${id}`);
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

	const deleteDiary = () => {
		resetAllDiaries();
	};

	const styles = useMemo(() => {
		const coverBg = darkMode ? "#0b1220" : "#ffffff";
		const coverBorder = darkMode ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
		const titleColor = darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)";
		const subColor = darkMode ? "rgba(226,232,240,0.78)" : "rgba(71,85,105,0.92)";

		const accentStrong = "var(--accent-green, #16a34a)";
		const accentSoft = "var(--accent-green-soft, #bbf7d0)";
		const spineA = themeKey === "soft" ? accentSoft : accentStrong;
		const spineB = themeKey === "ink" ? "rgba(148,163,184,0.40)" : "rgba(0,0,0,0.00)";

		const glow =
			themeKey === "soft"
				? darkMode
					? "rgba(187,247,208,0.16)"
					: "rgba(187,247,208,0.20)"
				: darkMode
					? "rgba(22,163,74,0.14)"
					: "rgba(22,163,74,0.10)";

		const pagesPattern =
			motiveKey === "lined"
				? "repeating-linear-gradient(180deg, rgba(15,23,42,0.06) 0px, rgba(15,23,42,0.06) 1px, transparent 1px, transparent 28px)"
				: motiveKey === "grid"
					? "repeating-linear-gradient(0deg, rgba(15,23,42,0.06) 0px, rgba(15,23,42,0.06) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(15,23,42,0.04) 0px, rgba(15,23,42,0.04) 1px, transparent 1px, transparent 28px)"
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

		const next = { name: trimmed, themeKey, motiveKey, createdAt: Date.now(), folderId: null };
		setSavedMeta(next);
		setMeta(next);
		setView("editor");
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(next.createdAt));
		} catch {
			// ignore
		}
		upsertDiary({
			id: String(next.createdAt),
			name: next.name,
			themeKey: next.themeKey,
			motiveKey: next.motiveKey,
			createdAt: next.createdAt,
			folderId: next.folderId,
		});
	};

	const startNewDiary = () => {
		setMeta(null);
		setText("");
		setLastSavedText("");
		setLastSavedAt(null);
		setName("");
		setThemeKey("accent");
		setMotiveKey("clean");
		setView("create");
	};

	const openLoadDiary = () => {
		setLoadFolderId("all");
		setView("load");
	};

	const loadDiaryById = (id) => {
		const found = diaries.find((d) => d.id === id);
		if (!found) return;
		setSavedMeta(found);
		setMeta(found);
		setName(found.name ?? "");
		setThemeKey(found.themeKey ?? "accent");
		setMotiveKey(found.motiveKey ?? "clean");
		setView("editor");
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
			window.localStorage.setItem(ACTIVE_DIARY_KEY, String(found.id));
		} catch {
			// ignore
		}
	};

	return (
		<>
			<style>{`
				.kl-diary-wrap {
					height: 100%;
					width: 100%;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.kl-book {
					width: min(820px, 94%);
					height: min(520px, 78vh);
					position: relative;
					transform: perspective(1100px) rotateY(-7deg);
					transform-origin: 40% 50%;
				}
				@media (max-width: 720px) {
					.kl-book {
						transform: none;
						height: min(600px, 78vh);
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
					background: linear-gradient(180deg, rgba(241,245,249,1), rgba(226,232,240,1));
					box-shadow: inset 0 0 0 1px rgba(15,23,42,0.10);
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
					background: linear-gradient(180deg, rgba(248,250,252,1), rgba(241,245,249,1));
					box-shadow: inset 0 0 0 1px rgba(15,23,42,0.10);
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
					background: rgba(255,255,255,0.72);
					border: 1px solid rgba(15,23,42,0.10);
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
					color: rgba(15,23,42,0.88);
					letter-spacing: 0.01em;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}
				.kl-status {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					width: fit-content;
					font-weight: 900;
					font-size: 12px;
					color: rgba(71,85,105,0.92);
					padding: 6px 10px;
					border-radius: 999px;
					background: rgba(226,232,240,0.65);
					border: 1px solid rgba(15,23,42,0.10);
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
					border: 1px solid rgba(15,23,42,0.14);
					padding: 10px 14px;
					font-weight: 900;
					cursor: pointer;
					background: rgba(255,255,255,0.72);
					color: rgba(15,23,42,0.92);
				}
				.kl-dangerBtn:hover {
					border-color: rgba(239,68,68,0.35);
					box-shadow: 0 0 0 3px rgba(254,202,202,0.65);
				}
				.kl-backBtn {
					border-radius: 999px;
					border: 1px solid rgba(15,23,42,0.14);
					padding: 10px 14px;
					font-weight: 900;
					cursor: pointer;
					background: rgba(255,255,255,0.72);
					color: rgba(15,23,42,0.92);
				}
				.kl-backBtn:hover {
					border-color: rgba(15,23,42,0.22);
					box-shadow: 0 0 0 3px rgba(226,232,240,0.85);
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
					background: rgba(255,255,255,0.82);
					border: 1px solid rgba(15,23,42,0.10);
					box-shadow: inset 0 0 0 1px rgba(255,255,255,0.34);
					padding: 12px;
					overflow: auto;
				}
				.kl-pageTitle {
					font-weight: 900;
					font-size: 14px;
					color: rgba(15,23,42,0.86);
					margin-bottom: 10px;
					padding-bottom: 8px;
					border-bottom: 1px solid rgba(15,23,42,0.08);
				}
				.kl-label {
					font-weight: 900;
					font-size: 12px;
					color: rgba(71,85,105,0.90);
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
					border: 1px solid rgba(15,23,42,0.14);
					padding: 12px 12px;
					font-weight: 800;
					outline: none;
					background: rgba(255,255,255,0.85);
					color: rgba(15,23,42,0.92);
					font-family: inherit;
				}
				.kl-entryItem {
					width: 100%;
					border-radius: 14px;
					border: 1px solid rgba(15,23,42,0.14);
					padding: 10px 10px;
					font-weight: 900;
					cursor: pointer;
					background: rgba(255,255,255,0.72);
					color: rgba(15,23,42,0.92);
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
					background: linear-gradient(90deg, rgba(248,250,252,1), rgba(226,232,240,1));
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
					color: rgba(15,23,42,0.92);
					font-weight: 700;
					font-size: 15px;
					line-height: 1.55;
					font-family: inherit;
					position: relative;
					z-index: 1;
				}
				.kl-pages textarea::placeholder {
					color: rgba(71,85,105,0.70);
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
				}
				.kl-loadItem {
					width: 100%;
					border-radius: 16px;
					border: 1px solid rgba(15,23,42,0.14);
					padding: 12px 12px;
					font-weight: 900;
					cursor: pointer;
					background: rgba(255,255,255,0.72);
					color: rgba(15,23,42,0.92);
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 10px;
				}
				.kl-loadMeta {
					font-weight: 800;
					font-size: 12px;
					opacity: 0.7;
					white-space: nowrap;
				}
				.kl-setup-row {
					display: flex;
					gap: 12px;
					flex-wrap: wrap;
				}
				.kl-pill {
					border: 1px solid rgba(15,23,42,0.12);
					border-radius: 999px;
					padding: 9px 12px;
					background: rgba(255,255,255,0.65);
					cursor: pointer;
					font-weight: 800;
					font-size: 13px;
					color: rgba(15,23,42,0.92);
				}
				.kl-pill[data-active="true"] {
					border-color: rgba(22,163,74,0.45);
					box-shadow: 0 0 0 3px rgba(187,247,208,0.65);
				}
				.kl-input {
					width: 100%;
					border-radius: 14px;
					border: 1px solid rgba(15,23,42,0.14);
					padding: 12px 12px;
					font-weight: 800;
					outline: none;
					background: rgba(255,255,255,0.85);
					color: rgba(15,23,42,0.92);
				}
				.kl-input::placeholder {
					color: rgba(71,85,105,0.72);
					font-weight: 800;
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
					border: 1px solid rgba(15,23,42,0.14);
					padding: 12px 16px;
					font-weight: 900;
					cursor: pointer;
					background: rgba(255,255,255,0.72);
					color: rgba(15,23,42,0.92);
				}
				.kl-primary[disabled] {
					opacity: 0.55;
					cursor: not-allowed;
				}
				.kl-secondary[disabled] {
					opacity: 0.55;
					cursor: not-allowed;
				}

				@media (prefers-reduced-motion: reduce) {
					.kl-book { transform: none !important; }
					.kl-flipSheet { animation: none !important; }
				}
			`}</style>

			<div className="kl-diary-wrap">
				<div className="kl-book" aria-label="Diary">
					<div className="kl-book-spine" />
					<div className="kl-book-cover">
						<div className="kl-book-title">{meta?.name ?? "My Diary"}</div>
						<div className="kl-book-sub">Write today’s entry</div>

						<div className="kl-pages">
							{(() => {
									const statusText = isDirty ? "Unsaved changes" : lastSavedAt ? "Saved" : "Not saved yet";
									const titleLeft = spread === "index" ? "Entries" : spread === "edit" ? "Edit" : "Report";
									const titleRight =
										spread === "index"
											? "New"
											: spread === "edit"
												? "Notes"
												: "Summary";

									const renderIndexLeft = () => (
										<div className="kl-page" aria-label="Entries list">
											<div className="kl-pageTitle">{titleLeft}</div>
											{entries.length === 0 ? (
												<div style={{ fontWeight: 800, fontSize: 13, color: "rgba(71,85,105,0.92)" }}>
													No entries yet. Create your first Practice or Match.
												</div>
											) : (
												<div style={{ display: "grid", gap: 10 }}>
													{entries.map((e) => {
														const headline =
															e.type === "match"
																? `${e.date} — Match ${e.opponent ? `vs ${e.opponent}` : ""}`.trim()
															: `${e.date} — Practice`;
														const metaText =
															e.type === "match"
																? `${e.goalsFor}-${e.goalsAgainst} · ${e.minutes} min`
															: `${e.durationMin} min · RPE ${e.rpe}`;
														return (
															<button
																key={e.id}
																type="button"
																className="kl-entryItem"
																onClick={() => openEntry(e.id)}
																aria-label={`Open ${headline}`}
															>
																		<div className="kl-entryText">
																			<div className="kl-entryHeadline">{headline}</div>
																			<div className="kl-entryMeta">{metaText}</div>
																		</div>
															</button>
														);
													})}
												</div>
											)}
										</div>
									);

									const renderIndexRight = () => (
										<div className="kl-page" aria-label="New entry">
											<div className="kl-pageTitle">{titleRight}</div>
											<div style={{ fontWeight: 800, fontSize: 13, color: "rgba(71,85,105,0.92)", marginBottom: 10 }}>
												Choose what you want to write today.
											</div>
												<div className="kl-ctaRow">
												<button type="button" className="kl-primary" onClick={() => createNewEntry("practice")} aria-label="New practice">
													Practice
												</button>
												<button type="button" className="kl-secondary" onClick={() => createNewEntry("match")} aria-label="New match">
													Match
												</button>
											</div>
										</div>
									);

									const renderEditLeft = () => (
										<div className="kl-page" aria-label="Edit fields">
											<div className="kl-pageTitle">{activeEntry?.type === "match" ? "Match" : "Practice"}</div>
											<div className="kl-field">
												<div className="kl-label">Date</div>
												<input
													type="date"
													className="kl-input"
													value={form?.date ?? todayISO()}
													onChange={(e) => setField("date", e.target.value)}
													aria-label="Entry date"
												/>
											</div>

											{(form?.type ?? "practice") === "practice" ? (
												<>
													<div className="kl-field">
														<div className="kl-label">Duration (minutes)</div>
														<input
															type="number"
															className="kl-input"
															value={String(form?.durationMin ?? 0)}
															onChange={(e) => setField("durationMin", clampNumber(e.target.value, { min: 0, max: 600, fallback: 0 }))}
															aria-label="Duration"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">Focus</div>
														<input
															className="kl-input"
															value={form?.focus ?? ""}
															onChange={(e) => setField("focus", e.target.value)}
															placeholder="e.g. first touch, passing"
															aria-label="Focus"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">Drills</div>
														<input
															className="kl-input"
															value={form?.drills ?? ""}
															onChange={(e) => setField("drills", e.target.value)}
															placeholder="e.g. rondos, finishing"
															aria-label="Drills"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">RPE (1–10)</div>
														<input
															type="number"
															className="kl-input"
															value={String(form?.rpe ?? 5)}
															onChange={(e) => setField("rpe", clampNumber(e.target.value, { min: 1, max: 10, fallback: 5 }))}
															aria-label="RPE"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">Feeling</div>
														<input
															className="kl-input"
															value={form?.feeling ?? ""}
															onChange={(e) => setField("feeling", e.target.value)}
															placeholder="e.g. sharp, tired"
															aria-label="Feeling"
														/>
													</div>
												</>
											) : (
												<>
													<div className="kl-field">
														<div className="kl-label">Opponent</div>
														<input
															className="kl-input"
															value={form?.opponent ?? ""}
															onChange={(e) => setField("opponent", e.target.value)}
															placeholder="e.g. FC Example"
															aria-label="Opponent"
														/>
													</div>
													<div className="kl-field">
														<div className="kl-label">Venue</div>
														<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
															<button type="button" className="kl-pill" data-active={form?.venue === "home" ? "true" : "false"} onClick={() => setField("venue", "home")} aria-label="Home">
																Home
															</button>
															<button type="button" className="kl-pill" data-active={form?.venue === "away" ? "true" : "false"} onClick={() => setField("venue", "away")} aria-label="Away">
																Away
															</button>
														</div>
													</div>
													<div className="kl-field">
														<div className="kl-label">Score (us–them)</div>
														<div style={{ display: "flex", gap: 10 }}>
															<input type="number" className="kl-input" value={String(form?.goalsFor ?? 0)} onChange={(e) => setField("goalsFor", clampNumber(e.target.value, { min: 0, max: 99, fallback: 0 }))} aria-label="Goals for" />
															<input type="number" className="kl-input" value={String(form?.goalsAgainst ?? 0)} onChange={(e) => setField("goalsAgainst", clampNumber(e.target.value, { min: 0, max: 99, fallback: 0 }))} aria-label="Goals against" />
														</div>
													</div>
													<div className="kl-field">
														<div className="kl-label">Minutes</div>
														<input type="number" className="kl-input" value={String(form?.minutes ?? 0)} onChange={(e) => setField("minutes", clampNumber(e.target.value, { min: 0, max: 180, fallback: 0 }))} aria-label="Minutes" />
													</div>
													<div className="kl-field">
														<div className="kl-label">Position</div>
														<input className="kl-input" value={form?.position ?? ""} onChange={(e) => setField("position", e.target.value)} placeholder="e.g. RW" aria-label="Position" />
													</div>
													<div className="kl-field">
														<div className="kl-label">Goals / Assists</div>
														<div style={{ display: "flex", gap: 10 }}>
															<input type="number" className="kl-input" value={String(form?.goals ?? 0)} onChange={(e) => setField("goals", clampNumber(e.target.value, { min: 0, max: 20, fallback: 0 }))} aria-label="Goals" />
															<input type="number" className="kl-input" value={String(form?.assists ?? 0)} onChange={(e) => setField("assists", clampNumber(e.target.value, { min: 0, max: 20, fallback: 0 }))} aria-label="Assists" />
														</div>
													</div>
													<div className="kl-field">
														<div className="kl-label">Highlights</div>
														<input className="kl-input" value={form?.highlights ?? ""} onChange={(e) => setField("highlights", e.target.value)} placeholder="What went well" aria-label="Highlights" />
													</div>
													<div className="kl-field">
														<div className="kl-label">Improvements</div>
														<input className="kl-input" value={form?.improvements ?? ""} onChange={(e) => setField("improvements", e.target.value)} placeholder="What to improve next time" aria-label="Improvements" />
													</div>
												</>
											)}

												<div className="kl-pageActions">
												<button type="button" className="kl-secondary" onClick={openIndex} aria-label="Back to entries">
													Entries
												</button>
												<button type="button" className="kl-primary" onClick={openReport} disabled={!activeEntryId} aria-label="Preview report">
													Preview
												</button>
											</div>
										</div>
									);

									const renderEditRight = () => (
										<div className="kl-page" aria-label="Notes">
											<div className="kl-pageTitle">{titleRight}</div>
											<div className="kl-field">
												<div className="kl-label">Free notes</div>
												<textarea
													className="kl-textarea"
													value={form?.notes ?? ""}
													onChange={(e) => setField("notes", e.target.value)}
													placeholder="Anything else you want to remember…"
													aria-label="Notes"
												/>
											</div>
										</div>
									);

									const renderReportLeft = () => (
										<div className="kl-page" aria-label="Report">
											<div className="kl-pageTitle">Report</div>
											{!form ? (
												<div style={{ fontWeight: 800, fontSize: 13, color: "rgba(71,85,105,0.92)" }}>No entry selected.</div>
											) : form.type === "practice" ? (
												<div style={{ display: "grid", gap: 8, fontWeight: 800, color: "rgba(15,23,42,0.90)" }}>
													<div><span style={{ opacity: 0.72 }}>Date:</span> {form.date}</div>
													<div><span style={{ opacity: 0.72 }}>Duration:</span> {form.durationMin} min</div>
													<div><span style={{ opacity: 0.72 }}>Focus:</span> {form.focus || "—"}</div>
													<div><span style={{ opacity: 0.72 }}>Drills:</span> {form.drills || "—"}</div>
													<div><span style={{ opacity: 0.72 }}>RPE:</span> {form.rpe}/10</div>
													<div><span style={{ opacity: 0.72 }}>Feeling:</span> {form.feeling || "—"}</div>
												</div>
											) : (
												<div style={{ display: "grid", gap: 8, fontWeight: 800, color: "rgba(15,23,42,0.90)" }}>
													<div><span style={{ opacity: 0.72 }}>Date:</span> {form.date}</div>
													<div><span style={{ opacity: 0.72 }}>Opponent:</span> {form.opponent || "—"}</div>
													<div><span style={{ opacity: 0.72 }}>Venue:</span> {form.venue}</div>
													<div><span style={{ opacity: 0.72 }}>Score:</span> {form.goalsFor}-{form.goalsAgainst}</div>
													<div><span style={{ opacity: 0.72 }}>Minutes:</span> {form.minutes}</div>
													<div><span style={{ opacity: 0.72 }}>Position:</span> {form.position || "—"}</div>
													<div><span style={{ opacity: 0.72 }}>G/A:</span> {form.goals}/{form.assists}</div>
													<div><span style={{ opacity: 0.72 }}>Highlights:</span> {form.highlights || "—"}</div>
													<div><span style={{ opacity: 0.72 }}>Improvements:</span> {form.improvements || "—"}</div>
												</div>
											)}

												<div className="kl-pageActions">
												<button type="button" className="kl-secondary" onClick={openEdit} aria-label="Back to edit">
													Edit
												</button>
												<button type="button" className="kl-secondary" onClick={openIndex} aria-label="Back to entries">
													Entries
												</button>
											</div>
										</div>
									);

									const renderReportRight = () => (
										<div className="kl-page" aria-label="Notes preview">
											<div className="kl-pageTitle">{titleRight}</div>
											<div style={{ whiteSpace: "pre-wrap", fontWeight: 800, color: "rgba(15,23,42,0.90)", fontSize: 13, lineHeight: 1.5 }}>
												{(form?.notes ?? "").trim() ? form.notes : "No notes."}
											</div>
										</div>
									);

									const left = spread === "index" ? renderIndexLeft() : spread === "edit" ? renderEditLeft() : renderReportLeft();
									const right = spread === "index" ? renderIndexRight() : spread === "edit" ? renderEditRight() : renderReportRight();

									return (
										<>
											<div className="kl-pagesPattern" aria-hidden="true" />
											<div className="kl-pagesTop">
												<div className="kl-pagesTopLeft">
													<div className="kl-pagesTitle">{titleLeft} • {titleRight}</div>
													<div className="kl-status" data-dirty={isDirty ? "true" : "false"}>
														<span className="kl-statusDot" aria-hidden="true" />
														{statusText}
													</div>
												</div>
												<div className="kl-actions">
													<button type="button" className="kl-backBtn" onClick={goBack} aria-label="Back">
														Back
													</button>
													<button type="button" className="kl-dangerBtn" onClick={deleteDiary} aria-label="Reset diary">
														Reset
													</button>
													<button type="button" className="kl-saveBtn" onClick={saveEntry} disabled={!isDirty} aria-label="Save entry">
														Save
													</button>
												</div>
											</div>
											<div className="kl-spreadArea" aria-label="Diary book">
												<div className="kl-spreadGrid">
													{left}
													{right}
												</div>
												{isFlipping ? <div className="kl-flipSheet" data-dir={flipDir} aria-hidden="true" /> : null}
											</div>
										</>
									);
							})()}
						</div>
					</div>
					<div className="kl-book-pages-edge" />
				</div>
			</div>
		</>
	);
}

