import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBook, FaCalendar, FaFolder, FaTrash } from "react-icons/fa";
import {
	BIN_TYPES,
	emptyBinPermanently,
	getBinSubscriptionEventName,
	loadBinItems,
	permanentlyDeleteBinItem,
	restoreBinItem,
} from "./bin_store.js";

const THEME_STORAGE_KEY = "kicklog.theme.v1";

const TYPE_OPTIONS = [
	{ key: "all", label: "Everything" },
	{ key: BIN_TYPES.diary, label: "Diaries" },
	{ key: BIN_TYPES.folder, label: "Folders" },
	{ key: BIN_TYPES.note, label: "Notes" },
	{ key: BIN_TYPES.session, label: "Sessions" },
	{ key: BIN_TYPES.chapter, label: "Chapters" },
];

const TYPE_LABELS = {
	[BIN_TYPES.diary]: "Diary",
	[BIN_TYPES.folder]: "Folder",
	[BIN_TYPES.note]: "Note",
	[BIN_TYPES.session]: "Session",
	[BIN_TYPES.chapter]: "Chapter",
};

function readThemePreset() {
	try {
		const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
		if (!raw) return "default";
		const parsed = JSON.parse(raw);
		return typeof parsed?.presetId === "string" ? parsed.presetId : "custom";
	} catch {
		return "custom";
	}
}

function formatDateTime(ms) {
	if (!ms) return "Unknown time";
	try {
		return new Date(ms).toLocaleString();
	} catch {
		return "Unknown time";
	}
}

function relativeTime(ms) {
	const diffMs = Date.now() - Number(ms || 0);
	if (!Number.isFinite(diffMs) || diffMs < 0) return "just now";
	const mins = Math.floor(diffMs / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} min ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days} d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months} mo ago`;
	const years = Math.floor(months / 12);
	return `${years} y ago`;
}

function detailsForItem(item) {
	if (!item || typeof item !== "object") return "Deleted item";
	if (item.type === BIN_TYPES.diary) {
		const entryCount = Number(item?.payload?.entryCount || 0);
		const chapterCount = Number(item?.payload?.chapterCount || 0);
		const folderName = item?.payload?.folderName || "Unfiled";
		return `${folderName} | ${chapterCount} chapters | ${entryCount} sessions`;
	}
	if (item.type === BIN_TYPES.folder) {
		const linked = Number(item?.payload?.linkedDiaryCount || 0);
		return `${linked} diaries were linked to this folder`;
	}
	if (item.type === BIN_TYPES.note) {
		const event = item?.payload?.event;
		const date = event?.date ? `Date: ${event.date}` : "Date unknown";
		const category = event?.category ? `Category: ${event.category}` : "Category: practice";
		return `${date} | ${category}`;
	}
	if (item.type === BIN_TYPES.session) {
		const entry = item?.payload?.entry;
		const mode = entry?.type === "match" ? "Match" : "Practice";
		return `${mode} | ${entry?.date || "No date"}`;
	}
	if (item.type === BIN_TYPES.chapter) {
		const chapter = item?.payload?.chapter;
		const category = String(chapter?.category || "").trim() || "No category";
		const textLen = String(chapter?.text || "").trim().length;
		return `${category} | ${textLen} chars`;
	}
	return "Deleted item";
}

function iconForType(type) {
	if (type === BIN_TYPES.diary || type === BIN_TYPES.chapter) return FaBook;
	if (type === BIN_TYPES.folder) return FaFolder;
	if (type === BIN_TYPES.note || type === BIN_TYPES.session) return FaCalendar;
	return FaTrash;
}

function Notice({ notice }) {
	if (!notice) return null;
	return (
		<div className={["kl-bin-notice", notice.kind === "error" ? "is-error" : "is-ok"].join(" ")} aria-live="polite">
			{notice.text}
		</div>
	);
}

export default function MainBin({ darkMode }) {
	const [items, setItems] = useState([]);
	const [query, setQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [typeMenuOpen, setTypeMenuOpen] = useState(false);
	const [busyId, setBusyId] = useState("");
	const [notice, setNotice] = useState(null);
	const [themePreset, setThemePreset] = useState(() => readThemePreset());
	const typeMenuRef = useRef(null);

	const refresh = () => {
		setItems(loadBinItems());
	};

	useEffect(() => {
		refresh();
		const onChanged = () => refresh();
		const binEvent = getBinSubscriptionEventName();
		window.addEventListener(binEvent, onChanged);
		window.addEventListener("storage", onChanged);
		return () => {
			window.removeEventListener(binEvent, onChanged);
			window.removeEventListener("storage", onChanged);
		};
	}, []);

	useEffect(() => {
		if (!notice) return undefined;
		const t = window.setTimeout(() => setNotice(null), 2400);
		return () => window.clearTimeout(t);
	}, [notice]);

	useEffect(() => {
		const refreshPreset = () => setThemePreset(readThemePreset());
		refreshPreset();
		window.addEventListener("kicklog:themeChanged", refreshPreset);
		window.addEventListener("storage", refreshPreset);
		return () => {
			window.removeEventListener("kicklog:themeChanged", refreshPreset);
			window.removeEventListener("storage", refreshPreset);
		};
	}, []);

	const normalizedQuery = query.trim().toLowerCase();

	const stats = useMemo(() => {
		const base = {
			total: items.length,
			[BIN_TYPES.diary]: 0,
			[BIN_TYPES.folder]: 0,
			[BIN_TYPES.note]: 0,
			[BIN_TYPES.session]: 0,
			[BIN_TYPES.chapter]: 0,
		};
		items.forEach((item) => {
			if (Object.prototype.hasOwnProperty.call(base, item.type)) {
				base[item.type] += 1;
			}
		});
		return base;
	}, [items]);

	const filtered = useMemo(() => {
		return items.filter((item) => {
			if (typeFilter !== "all" && item.type !== typeFilter) return false;
			if (!normalizedQuery) return true;
			const haystack = [
				item.label,
				TYPE_LABELS[item.type] || "",
				detailsForItem(item),
				String(item?.payload?.folderName || ""),
				String(item?.payload?.event?.note || ""),
				String(item?.payload?.chapter?.category || ""),
			]
				.join(" ")
				.toLowerCase();
			return haystack.includes(normalizedQuery);
		});
	}, [items, normalizedQuery, typeFilter]);

	const selectedTypeOption = useMemo(() => {
		return TYPE_OPTIONS.find((option) => option.key === typeFilter) || TYPE_OPTIONS[0];
	}, [typeFilter]);

	useEffect(() => {
		if (!typeMenuOpen) return undefined;
		const onPointerDown = (event) => {
			if (!typeMenuRef.current) return;
			if (!typeMenuRef.current.contains(event.target)) {
				setTypeMenuOpen(false);
			}
		};
		const onKeyDown = (event) => {
			if (event.key === "Escape") {
				setTypeMenuOpen(false);
			}
		};
		window.addEventListener("mousedown", onPointerDown);
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("mousedown", onPointerDown);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [typeMenuOpen]);

	const handleTypeSelect = (nextType) => {
		setTypeFilter(nextType);
		setTypeMenuOpen(false);
	};

	const handleRestore = (item) => {
		if (!item) return;
		setBusyId(item.id);
		const result = restoreBinItem(item.id);
		setBusyId("");
		if (!result?.ok) {
			setNotice({ kind: "error", text: result?.message || "Could not restore this item." });
			return;
		}
		setNotice({ kind: "ok", text: `${item.label} restored.` });
		refresh();
	};

	const handlePermanentDelete = (item) => {
		if (!item) return;
		const ok = window.confirm(`Permanently delete "${item.label}" from Bin?`);
		if (!ok) return;
		setBusyId(item.id);
		const result = permanentlyDeleteBinItem(item.id);
		setBusyId("");
		if (!result?.ok) {
			setNotice({ kind: "error", text: result?.message || "Could not delete this item." });
			return;
		}
		setNotice({ kind: "ok", text: `${item.label} permanently deleted.` });
		refresh();
	};

	const handleEmptyBin = () => {
		if (items.length === 0) return;
		const ok = window.confirm("Permanently delete everything in Bin?");
		if (!ok) return;
		const result = emptyBinPermanently();
		if (!result?.ok) {
			setNotice({ kind: "error", text: "Could not empty Bin." });
			return;
		}
		setNotice({ kind: "ok", text: "Bin emptied." });
		refresh();
	};

	const hasNoMatches = items.length > 0 && filtered.length === 0;

	return (
		<div
			className="kl-bin-root"
			data-theme={darkMode ? "dark" : "light"}
			data-theme-preset={themePreset || "custom"}
		>
			<style>{`
				@keyframes klBinFadeIn {
					0% { opacity: 0; transform: translate3d(0, 14px, 0); }
					100% { opacity: 1; transform: translate3d(0, 0, 0); }
				}
				@keyframes klBinFloat {
					0% { transform: translate3d(0, 0, 0); }
					50% { transform: translate3d(8px, -6px, 0); }
					100% { transform: translate3d(0, 0, 0); }
				}
				.kl-bin-root {
					height: 100%;
					width: 100%;
					min-height: 0;
					overflow: auto;
					padding: 10px;
					box-sizing: border-box;
					font-family: var(--kl-font-family, inherit);
					--kl-bin-list-pattern-opacity: 0.24;
					--kl-bin-list-pattern:
						radial-gradient(580px 190px at 10% 0%, rgba(var(--accent-green-rgb, 22,163,74), 0.24), transparent 65%),
						radial-gradient(620px 210px at 96% 4%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.26), transparent 70%);
					background:
						radial-gradient(700px 260px at 0% -8%, rgba(var(--accent-green-rgb, 22,163,74), 0.20), transparent 60%),
						radial-gradient(760px 280px at 110% 8%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.26), transparent 62%),
						linear-gradient(165deg, rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.08));
				}
				.kl-bin-root[data-theme="dark"] {
					--kl-bin-list-pattern-opacity: 0.30;
					background:
						radial-gradient(700px 260px at 0% -8%, rgba(var(--accent-green-rgb, 22,163,74), 0.18), transparent 60%),
						radial-gradient(760px 280px at 110% 8%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.14), transparent 62%),
						linear-gradient(165deg, rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.92));
				}
				.kl-bin-root[data-theme-preset="ocean"] {
					--kl-bin-list-pattern:
						repeating-linear-gradient(155deg, rgba(var(--accent-green-rgb, 22,163,74), 0.14) 0 2px, transparent 2px 20px),
						radial-gradient(560px 190px at 20% 0%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.24), transparent 66%);
				}
				.kl-bin-root[data-theme-preset="purple"] {
					--kl-bin-list-pattern:
						radial-gradient(420px 180px at 12% 0%, rgba(var(--accent-green-rgb, 22,163,74), 0.22), transparent 68%),
						radial-gradient(460px 200px at 88% 0%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.22), transparent 70%);
				}
				.kl-bin-root[data-theme-preset="pink"] {
					--kl-bin-list-pattern:
						repeating-linear-gradient(0deg, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.16) 0 1px, transparent 1px 22px),
						radial-gradient(540px 220px at 94% 0%, rgba(var(--accent-green-rgb, 22,163,74), 0.20), transparent 70%);
				}
				.kl-bin-root[data-theme-preset="orange"] {
					--kl-bin-list-pattern:
						repeating-linear-gradient(125deg, rgba(var(--accent-green-rgb, 22,163,74), 0.13) 0 2px, transparent 2px 18px),
						radial-gradient(520px 180px at 82% 0%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.24), transparent 70%);
				}
				.kl-bin-root[data-theme-preset="teal"] {
					--kl-bin-list-pattern:
						repeating-linear-gradient(90deg, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.16) 0 1px, transparent 1px 20px),
						radial-gradient(500px 180px at 10% 0%, rgba(var(--accent-green-rgb, 22,163,74), 0.20), transparent 70%);
				}
				.kl-bin-root[data-theme-preset="peach"] {
					--kl-bin-list-pattern:
						repeating-linear-gradient(155deg, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.18) 0 1px, transparent 1px 18px),
						radial-gradient(540px 220px at 90% 2%, rgba(var(--accent-green-rgb, 22,163,74), 0.18), transparent 70%);
				}
				.kl-bin-wrap {
					width: min(100%, 1180px);
					margin: 0 auto;
					display: flex;
					flex-direction: column;
					gap: 12px;
					animation: klBinFadeIn 540ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
				}
				.kl-bin-hero {
					position: relative;
					isolation: isolate;
					overflow: hidden;
					border-radius: 22px;
					padding: 18px 18px 16px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background: color-mix(in srgb, #ffffff 86%, var(--accent-green-soft, #bbf7d0) 14%);
					box-shadow: 0 18px 40px rgba(15, 23, 42, 0.09);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-hero {
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 82%, transparent);
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
				}
				.kl-bin-hero::before {
					content: "";
					position: absolute;
					inset: -10px;
					pointer-events: none;
					opacity: 0.82;
					filter: blur(20px) saturate(1.2);
					animation: klBinFloat 16s ease-in-out infinite;
					background:
						radial-gradient(520px 220px at 6% 0%, rgba(var(--accent-green-rgb, 22,163,74), 0.22), transparent 60%),
						radial-gradient(620px 220px at 94% 0%, rgba(var(--accent-green-soft-rgb, 187,247,208), 0.35), transparent 64%);
				}
				.kl-bin-heroTitle {
					position: relative;
					z-index: 1;
					font-size: clamp(22px, 3.2vw, 34px);
					font-weight: 900;
					line-height: 1.05;
					letter-spacing: 0.01em;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 96%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-heroTitle {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 95%, transparent);
				}
				.kl-bin-heroSub {
					position: relative;
					z-index: 1;
					margin-top: 6px;
					font-weight: 700;
					font-size: 13px;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 70%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-heroSub {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 70%, transparent);
				}
				.kl-bin-stats {
					position: relative;
					z-index: 1;
					margin-top: 12px;
					display: grid;
					grid-template-columns: repeat(3, minmax(120px, 1fr));
					gap: 8px;
				}
				.kl-bin-stat {
					border-radius: 14px;
					padding: 10px 12px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 10%, transparent);
					background: color-mix(in srgb, #ffffff 82%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-stat {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);
				}
				.kl-bin-statLabel {
					font-size: 11px;
					font-weight: 800;
					letter-spacing: 0.06em;
					text-transform: uppercase;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 62%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-statLabel {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 62%, transparent);
				}
				.kl-bin-statValue {
					margin-top: 3px;
					font-size: 24px;
					line-height: 1;
					font-weight: 900;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 94%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-statValue {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 94%, transparent);
				}
				.kl-bin-controls {
					display: grid;
					grid-template-columns: 1fr auto auto auto;
					gap: 8px;
					padding: 8px;
					border-radius: 24px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background: color-mix(in srgb, #ffffff 74%, transparent);
					box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
					overflow: visible;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-controls {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 14%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 66%, transparent);
					box-shadow: 0 14px 32px rgba(0, 0, 0, 0.30);
				}
				.kl-bin-searchWrap {
					display: flex;
					align-items: center;
					gap: 8px;
					border-radius: 18px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 10%, transparent);
					background: color-mix(in srgb, #ffffff 86%, transparent);
					padding: 0 12px;
					box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 18%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-searchWrap {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);
				}
				.kl-bin-search {
					width: 100%;
					border: 0;
					outline: 0;
					background: transparent;
					padding: 12px 0;
					font-size: 14px;
					font-weight: 700;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-search {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
				}
				.kl-bin-selectTrigger,
				.kl-bin-btn {
					border-radius: 18px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background: color-mix(in srgb, #ffffff 90%, transparent);
					padding: 11px 13px;
					font-size: 13px;
					font-weight: 800;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent);
					box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-selectTrigger,
				.kl-bin-root[data-theme="dark"] .kl-bin-btn {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
					box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26);
				}
				.kl-bin-selectWrap {
					position: relative;
					min-width: 164px;
					z-index: 12;
				}
				.kl-bin-selectWrap[data-open="true"] {
					z-index: 70;
				}
				.kl-bin-selectTrigger {
					width: 100%;
					display: inline-flex;
					align-items: center;
					justify-content: space-between;
					gap: 10px;
					cursor: pointer;
					text-align: left;
				}
				.kl-bin-selectChevron {
					flex: 0 0 auto;
					width: 14px;
					height: 14px;
					opacity: 0.78;
					transition: transform 180ms ease;
				}
				.kl-bin-selectTrigger[aria-expanded="true"] .kl-bin-selectChevron {
					transform: rotate(180deg);
				}
				.kl-bin-selectMenu {
					position: absolute;
					top: calc(100% + 8px);
					left: 0;
					right: 0;
					z-index: 60;
					padding: 6px;
					border-radius: 20px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 14%, transparent);
					background: color-mix(in srgb, #ffffff 90%, var(--accent-green-soft, #bbf7d0) 10%);
					box-shadow: 0 18px 36px rgba(15, 23, 42, 0.24);
					overflow: hidden;
					display: grid;
					gap: 4px;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-selectMenu {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 18%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 82%, var(--accent-green-soft, #bbf7d0) 18%);
					box-shadow: 0 20px 40px rgba(0, 0, 0, 0.44);
				}
				.kl-bin-selectOption {
					width: 100%;
					border: 0;
					border-radius: 14px;
					background: transparent;
					padding: 10px 12px;
					text-align: left;
					font-size: 14px;
					font-weight: 800;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 94%, transparent);
					cursor: pointer;
					transition: background-color 140ms ease, color 140ms ease;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-selectOption {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 95%, transparent);
				}
				.kl-bin-selectOption:hover {
					background: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 36%, transparent);
				}
				.kl-bin-selectOption.is-active {
					background: color-mix(in srgb, var(--accent-green, #16a34a) 40%, transparent);
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 98%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-selectOption.is-active {
					color: #ffffff;
				}
				.kl-bin-selectTrigger:focus,
				.kl-bin-btn:focus {
					outline: none;
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 58%, var(--kl-fg, #0f172a));
					box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 62%, transparent);
				}
				.kl-bin-btn {
					cursor: pointer;
					transition: transform 180ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
				}
				.kl-bin-btn:hover {
					transform: translateY(-1px);
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 42%, transparent);
				}
				.kl-bin-btn.is-danger {
					border-color: rgba(239, 68, 68, 0.35);
					color: rgba(220, 38, 38, 0.95);
				}
				.kl-bin-notice {
					border-radius: 12px;
					padding: 10px 12px;
					font-size: 13px;
					font-weight: 800;
					border: 1px solid;
				}
				.kl-bin-notice.is-ok {
					border-color: rgba(16, 185, 129, 0.35);
					background: rgba(16, 185, 129, 0.12);
					color: rgba(5, 150, 105, 0.98);
				}
				.kl-bin-notice.is-error {
					border-color: rgba(239, 68, 68, 0.35);
					background: rgba(239, 68, 68, 0.12);
					color: rgba(220, 38, 38, 0.98);
				}
				.kl-bin-grid {
					position: relative;
					display: grid;
					grid-template-columns: repeat(2, minmax(0, 1fr));
					gap: 12px;
					padding: 12px;
					border-radius: 30px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background: color-mix(in srgb, #ffffff 72%, transparent);
					box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 18%, transparent);
					isolation: isolate;
					overflow: hidden;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-grid {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 14%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 68%, transparent);
				}
				.kl-bin-grid::before {
					content: "";
					position: absolute;
					inset: 0;
					border-radius: inherit;
					pointer-events: none;
					opacity: var(--kl-bin-list-pattern-opacity, 0.24);
					background: var(--kl-bin-list-pattern);
				}
				.kl-bin-grid > * {
					position: relative;
					z-index: 1;
				}
				.kl-bin-card {
					border-radius: 26px;
					padding: 15px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background:
						linear-gradient(
							180deg,
							color-mix(in srgb, #ffffff 92%, transparent),
							color-mix(in srgb, #ffffff 84%, var(--accent-green-soft, #bbf7d0) 16%)
						);
					box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
					display: flex;
					flex-direction: column;
					gap: 10px;
					opacity: 0;
					transform: translate3d(0, 10px, 0);
					animation: klBinFadeIn 520ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
					animation-delay: var(--item-delay, 0ms);
					transition: transform 190ms ease, border-color 220ms ease, box-shadow 220ms ease;
				}
				.kl-bin-card:hover {
					transform: translate3d(0, -2px, 0);
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 38%, transparent);
					box-shadow: 0 22px 38px rgba(15, 23, 42, 0.14);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-card {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background:
						linear-gradient(
							180deg,
							color-mix(in srgb, var(--kl-bg, #0b1220) 84%, transparent),
							color-mix(in srgb, var(--kl-bg, #0b1220) 74%, var(--accent-green-soft, #bbf7d0) 26%)
						);
					box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34);
				}
				.kl-bin-cardHead {
					display: flex;
					align-items: flex-start;
					gap: 10px;
				}
				.kl-bin-icon {
					width: 34px;
					height: 34px;
					border-radius: 11px;
					display: grid;
					place-items: center;
					background: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 70%, transparent);
					color: color-mix(in srgb, var(--accent-green, #16a34a) 84%, black 16%);
					flex-shrink: 0;
				}
				.kl-bin-type {
					font-size: 11px;
					font-weight: 900;
					letter-spacing: 0.06em;
					text-transform: uppercase;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 62%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-type {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 62%, transparent);
				}
				.kl-bin-label {
					margin-top: 2px;
					font-weight: 900;
					font-size: 16px;
					line-height: 1.15;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 95%, transparent);
					word-break: break-word;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-label {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 95%, transparent);
				}
				.kl-bin-time {
					margin-top: 4px;
					font-size: 11px;
					font-weight: 700;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 58%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-time {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 58%, transparent);
				}
				.kl-bin-meta {
					margin: 0;
					font-size: 13px;
					font-weight: 700;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 72%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-meta {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 72%, transparent);
				}
				.kl-bin-actions {
					display: flex;
					gap: 8px;
					margin-top: auto;
				}
				.kl-bin-action {
					flex: 1;
					border-radius: 16px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 12%, transparent);
					background: color-mix(in srgb, #ffffff 90%, transparent);
					padding: 9px 10px;
					font-size: 12px;
					font-weight: 900;
					cursor: pointer;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent);
					transition: transform 160ms ease, border-color 200ms ease, box-shadow 200ms ease;
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-action {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 82%, transparent);
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
				}
				.kl-bin-action:hover {
					transform: translateY(-1px);
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 40%, transparent);
					box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
				}
				.kl-bin-action.is-danger {
					border-color: rgba(239, 68, 68, 0.35);
					color: rgba(220, 38, 38, 0.95);
				}
				.kl-bin-action:disabled,
				.kl-bin-btn:disabled {
					opacity: 0.55;
					cursor: not-allowed;
				}
				.kl-bin-empty {
					border-radius: 24px;
					padding: 34px 18px;
					text-align: center;
					border: 1px dashed color-mix(in srgb, var(--kl-fg, #0f172a) 18%, transparent);
					background: color-mix(in srgb, #ffffff 78%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-empty {
					border-color: color-mix(in srgb, var(--kl-fg, #ffffff) 18%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 74%, transparent);
				}
				.kl-bin-emptyTitle {
					font-size: 22px;
					font-weight: 900;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 94%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-emptyTitle {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 94%, transparent);
				}
				.kl-bin-emptySub {
					margin-top: 6px;
					font-size: 13px;
					font-weight: 700;
					color: color-mix(in srgb, var(--kl-fg, #0f172a) 66%, transparent);
				}
				.kl-bin-root[data-theme="dark"] .kl-bin-emptySub {
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 66%, transparent);
				}
				@media (max-width: 960px) {
					.kl-bin-controls {
						grid-template-columns: 1fr 1fr;
					}
					.kl-bin-selectWrap {
						min-width: 0;
					}
					.kl-bin-grid {
						grid-template-columns: 1fr;
					}
				}
				@media (max-width: 640px) {
					.kl-bin-stats {
						grid-template-columns: 1fr 1fr;
					}
					.kl-bin-controls {
						grid-template-columns: 1fr;
					}
				}
			`}</style>

			<div className="kl-bin-wrap">
				<div className="kl-bin-hero">
					<div className="kl-bin-heroTitle">Bin & Recovery Center</div>
					<div className="kl-bin-heroSub">
						Deleted diaries, folders, sessions, chapters, and notes land here first so you can recover safely.
					</div>
					<div className="kl-bin-stats">
						<div className="kl-bin-stat">
							<div className="kl-bin-statLabel">Total items</div>
							<div className="kl-bin-statValue">{stats.total}</div>
						</div>
						<div className="kl-bin-stat">
							<div className="kl-bin-statLabel">Diaries + folders</div>
							<div className="kl-bin-statValue">{stats[BIN_TYPES.diary] + stats[BIN_TYPES.folder]}</div>
						</div>
						<div className="kl-bin-stat">
							<div className="kl-bin-statLabel">Notes + sessions</div>
							<div className="kl-bin-statValue">{stats[BIN_TYPES.note] + stats[BIN_TYPES.session]}</div>
						</div>
					</div>
				</div>

				<div className="kl-bin-controls">
					<label className="kl-bin-searchWrap" aria-label="Search bin items">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<circle cx="11" cy="11" r="8" />
							<line x1="21" y1="21" x2="16.65" y2="16.65" />
						</svg>
						<input
							className="kl-bin-search"
							type="text"
							placeholder="Search by name, type, or details"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</label>

					<div className="kl-bin-selectWrap" ref={typeMenuRef} data-open={typeMenuOpen ? "true" : "false"}>
						<button
							type="button"
							className="kl-bin-selectTrigger"
							onClick={() => setTypeMenuOpen((prev) => !prev)}
							aria-haspopup="listbox"
							aria-expanded={typeMenuOpen ? "true" : "false"}
							aria-label="Filter bin by type"
						>
							<span>{selectedTypeOption?.label || "Everything"}</span>
							<svg className="kl-bin-selectChevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path d="M3.5 5.5L8 10l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
						{typeMenuOpen ? (
							<div className="kl-bin-selectMenu" role="listbox" aria-label="Filter bin by type options">
								{TYPE_OPTIONS.map((option) => (
									<button
										key={option.key}
										type="button"
										role="option"
										aria-selected={typeFilter === option.key}
										className={["kl-bin-selectOption", typeFilter === option.key ? "is-active" : ""].join(" ")}
										onClick={() => handleTypeSelect(option.key)}
									>
										{option.label}
									</button>
								))}
							</div>
						) : null}
					</div>

					<button type="button" className="kl-bin-btn" onClick={refresh} aria-label="Refresh bin">
						Refresh
					</button>

					<button
						type="button"
						className="kl-bin-btn is-danger"
						onClick={handleEmptyBin}
						disabled={items.length === 0}
						aria-label="Empty bin permanently"
					>
						Empty bin
					</button>
				</div>

				<Notice notice={notice} />

				{filtered.length === 0 ? (
					<div className="kl-bin-empty">
						<div className="kl-bin-emptyTitle">{hasNoMatches ? "No matching items" : "Bin is clean"}</div>
						<div className="kl-bin-emptySub">
							{hasNoMatches
								? "Try a different search or filter to see deleted content."
								: "When you delete diaries, folders, notes, chapters, or sessions, they appear here."}
						</div>
					</div>
				) : (
					<div className="kl-bin-grid">
						{filtered.map((item, idx) => {
							const Icon = iconForType(item.type);
							const disabled = busyId === item.id;
							return (
								<article key={item.id} className="kl-bin-card" style={{ "--item-delay": `${Math.min(idx * 52, 360)}ms` }}>
									<div className="kl-bin-cardHead">
										<div className="kl-bin-icon">
											<Icon size={16} />
										</div>
										<div>
											<div className="kl-bin-type">{TYPE_LABELS[item.type] || "Item"}</div>
											<div className="kl-bin-label">{item.label}</div>
											<div className="kl-bin-time">
												{relativeTime(item.deletedAt)} | {formatDateTime(item.deletedAt)}
											</div>
										</div>
									</div>

									<p className="kl-bin-meta">{detailsForItem(item)}</p>

									<div className="kl-bin-actions">
										<button
											type="button"
											className="kl-bin-action"
											onClick={() => handleRestore(item)}
											disabled={disabled}
											aria-label={`Restore ${item.label}`}
										>
											Restore
										</button>
										<button
											type="button"
											className="kl-bin-action is-danger"
											onClick={() => handlePermanentDelete(item)}
											disabled={disabled}
											aria-label={`Delete ${item.label} forever`}
										>
											Delete forever
										</button>
									</div>
								</article>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
