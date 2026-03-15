import React, { useEffect, useMemo, useRef, useState } from "react";
import { moveNoteToBin } from "./bin_store.js";

/* =========================
   Utilities
========================= */

function pad2(n) {
	return String(n).padStart(2, "0");
}

function toISODateLocal(date) {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
		date.getDate()
	)}`;
}

function fromISODateLocal(iso) {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function addDays(date, days) {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function startOfMonth(date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameMonth(a, b) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function ordinal(n) {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
	if (mod10 === 1) return `${n}st`;
	if (mod10 === 2) return `${n}nd`;
	if (mod10 === 3) return `${n}rd`;
	return `${n}th`;
}

const STORAGE_KEY = "kicklog_schedule_events_v2";

const NOTE_CATEGORIES = [
	{ key: "practice", label: "Practice" },
	{ key: "match", label: "Match" },
	{ key: "recovery", label: "Recovery" },
	{ key: "meeting", label: "Meeting" },
	{ key: "gym", label: "Gym" },
	{ key: "other", label: "Other" },
];

function normalizeCategory(value) {
	if (typeof value !== "string") return "practice";
	const v = value.trim().toLowerCase();
	for (const c of NOTE_CATEGORIES) {
		if (c.key === v) return v;
	}
	return "practice";
}

function categoryLabel(key) {
	const k = normalizeCategory(key);
	const hit = NOTE_CATEGORIES.find((c) => c.key === k);
	return hit ? hit.label : "Practice";
}

function autoGrowTextarea(el) {
	if (!el) return;
	el.style.height = "auto";
	el.style.height = `${el.scrollHeight}px`;
}

function IconPencil({ className, style }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={style}
			aria-hidden="true"
		>
			<path d="M12 20h9" />
			<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
		</svg>
	);
}

function IconDotsVertical({ className, style }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
			<circle cx="12" cy="5" r="1.8" />
			<circle cx="12" cy="12" r="1.8" />
			<circle cx="12" cy="19" r="1.8" />
		</svg>
	);
}

function IconCheck({ className, style }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={style}
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

function IconX({ className, style }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			style={style}
			aria-hidden="true"
		>
			<path d="M18 6 6 18" />
			<path d="M6 6l12 12" />
		</svg>
	);
}

/* =========================
   Component
========================= */

export default function MainSchedule({ darkMode = false }) {
	// Tailwind detection (same idea as MainSidebar/MainContent)
	const twProbeRef = useRef(null);
	const [twReady, setTwReady] = useState(false);
	useEffect(() => {
		const el = twProbeRef.current;
		if (!el) return;
		setTwReady(window.getComputedStyle(el).display === "none");
	}, []);

	const todayISO = useMemo(() => toISODateLocal(new Date()), []);
	const [cursorMonth, setCursorMonth] = useState(startOfMonth(new Date()));
	const [selectedISO, setSelectedISO] = useState(todayISO);
	const [hoveredISO, setHoveredISO] = useState(null);
	const [events, setEvents] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [draft, setDraft] = useState({ title: "", time: "", category: "practice", note: "" });
	const [menuOpenId, setMenuOpenId] = useState(null);
	const [openNoteById, setOpenNoteById] = useState({});
	const noteTextareaRef = useRef(null);
	const eventsRef = useRef([]);
	const editingIdRef = useRef(null);
	const draftRef = useRef({ title: "", time: "", category: "practice", note: "" });
	const [toast, setToast] = useState(null);
	const [toastClosing, setToastClosing] = useState(false);
	const [toastKey, setToastKey] = useState(0);
	const toastTimerRef = useRef(0);

	useEffect(() => {
		eventsRef.current = events;
	}, [events]);
	useEffect(() => {
		editingIdRef.current = editingId;
	}, [editingId]);
	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);

	function dismissToast() {
		if (!toast) return;
		setToastClosing(true);
		window.clearTimeout(toastTimerRef.current);
		toastTimerRef.current = window.setTimeout(() => {
			setToast(null);
			setToastClosing(false);
		}, 200);
	}

	function showToast(message) {
		window.clearTimeout(toastTimerRef.current);
		setToastClosing(false);
		setToast({ type: "success", message: String(message || "") });
		setToastKey((k) => k + 1);
		toastTimerRef.current = window.setTimeout(() => {
			dismissToast();
		}, 2000);
	}

	useEffect(() => {
		return () => {
			window.clearTimeout(toastTimerRef.current);
		};
	}, []);

	useEffect(() => {
		setOpenNoteById({});
	}, [selectedISO]);

	useEffect(() => {
		if (editingId === null) return;
		autoGrowTextarea(noteTextareaRef.current);
	}, [editingId, draft.note]);

	useEffect(() => {
		if (menuOpenId === null) return;
		function onDown() {
			setMenuOpenId(null);
		}
		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [menuOpenId]);

	/* =========================
	   Storage
	========================= */

	function persistEvents(nextEvents) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
		} catch {
			// ignore storage failures (private mode, quota, etc.)
		}
	}

	useEffect(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return;
			const normalized = parsed.map((e) => ({
				...e,
				isNew: !!e?.isNew,
				category: normalizeCategory(e?.category),
				note: typeof e?.note === "string" ? e.note : "",
			}));
			setEvents(normalized);
		} catch {
			// ignore malformed storage
		}
	}, []);

	// If the user navigates away mid-edit, commit the draft to storage so it isn't lost.
	useEffect(() => {
		return () => {
			const id = editingIdRef.current;
			if (id === null) return;
			const prev = Array.isArray(eventsRef.current) ? eventsRef.current : [];
			const d = draftRef.current ?? {};
			const next = prev.map((e) =>
				e.id === id
					? {
						...e,
						title: String(d.title ?? "").trim(),
						time: String(d.time ?? "").trim(),
						category: normalizeCategory(d.category),
						note: String(d.note ?? "").trim(),
					}
					: e
			);
			persistEvents(next);
		};
	}, []);

	/* =========================
	   Derived
	========================= */

	const monthLabel = useMemo(() => {
		return new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
		}).format(cursorMonth);
	}, [cursorMonth]);

	const selectedLabel = useMemo(() => {
		const d = fromISODateLocal(selectedISO);
		const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
		const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(d);
		return `${weekday}, ${ordinal(d.getDate())} ${month}`;
	}, [selectedISO]);

	const monthGrid = useMemo(() => {
		const first = startOfMonth(cursorMonth);
		// Week starts on Monday (Mon..Sun)
		const offset = (first.getDay() + 6) % 7; // Monday=0
		const total = daysInMonth(cursorMonth);

		const cells = [];
		for (let i = 0; i < offset; i++) cells.push(null);
		for (let day = 1; day <= total; day++) {
			cells.push(new Date(first.getFullYear(), first.getMonth(), day));
		}
		// pad to end-of-week so the last row looks clean
		while (cells.length % 7 !== 0) cells.push(null);
		// always render a consistent 6-week grid (42 cells)
		while (cells.length < 42) cells.push(null);
		return cells;
	}, [cursorMonth]);

	const selectedEvents = events
		.filter((e) => e.date === selectedISO)
		.sort((a, b) => a.time.localeCompare(b.time));

	/* =========================
	   Actions
	========================= */

	function goMonth(delta) {
		setCursorMonth((prev) => {
			const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
			setSelectedISO((sel) => {
				const selDate = fromISODateLocal(sel);
				return isSameMonth(selDate, next) ? sel : toISODateLocal(next);
			});
			return next;
		});
	}

	function goToday() {
		const now = new Date();
		setCursorMonth(startOfMonth(now));
		setSelectedISO(toISODateLocal(now));
	}

	function addMockEvent() {
		const id = Date.now();
		const newEvent = {
			id,
			date: selectedISO,
			title: "",
			time: "",
			category: "practice",
			note: "",
			completed: false,
			isNew: true,
		};
		setEvents((prev) => {
			const next = [...prev, newEvent];
			persistEvents(next);
			return next;
		});
		setEditingId(id);
		setDraft({ title: "", time: "", category: "practice", note: "" });
	}

	function startEdit(e) {
		setMenuOpenId(null);
		setEditingId(e.id);
		setOpenNoteById((prev) => ({ ...prev, [e.id]: false }));
		setDraft({
			title: e.title ?? "",
			time: e.time ?? "",
			category: normalizeCategory(e?.category),
			note: typeof e?.note === "string" ? e.note : "",
		});
	}

	function cancelEdit() {
		setEditingId(null);
		setDraft({ title: "", time: "", category: "practice", note: "" });
	}

	function saveEdit(id) {
		const current = Array.isArray(eventsRef.current) ? eventsRef.current : [];
		const hit = current.find((e) => e?.id === id);
		const isFirstSave = !!hit?.isNew;
		setEvents((prev) => {
			const next = prev.map((e) =>
				e.id === id
					? {
						...e,
						title: draft.title.trim(),
						time: draft.time.trim(),
						category: normalizeCategory(draft.category),
						note: String(draft.note ?? "").trim(),
						isNew: false,
					}
					: e
			);
			persistEvents(next);
			return next;
		});
		setEditingId(null);
		setDraft({ title: "", time: "", category: "practice", note: "" });
		showToast(isFirstSave ? "Note created successfully" : "Note edited successfully");
	}

	function removeEvent(id) {
		const current = Array.isArray(eventsRef.current) ? eventsRef.current : [];
		const removed = current.find((e) => String(e?.id ?? "") === String(id));
		if (!removed) return;
		const moved = moveNoteToBin(removed);
		if (!moved?.ok) {
			showToast("Could not move note to Bin");
			return;
		}

		if (editingId === id) {
			setEditingId(null);
			setDraft({ title: "", time: "", category: "practice", note: "" });
		}
		setMenuOpenId(null);
		setEvents((prev) => {
			const next = prev.filter((e) => e.id !== id);
			persistEvents(next);
			return next;
		});
		showToast("Note moved to Bin");
	}

	function toggleCompleted(id) {
		setMenuOpenId(null);
		const current = Array.isArray(eventsRef.current) ? eventsRef.current : [];
		const hit = current.find((e) => e?.id === id);
		const willComplete = hit ? !hit.completed : true;
		setEvents((prev) => {
			const next = prev.map((e) =>
				e.id === id
					? {
						...e,
						completed: !e.completed,
					}
					: e
			);
			persistEvents(next);
			return next;
		});
		showToast(willComplete ? "Note completed successfully" : "Note marked as incomplete");
	}

	const toastNode = toast ? (
		<div className="kl-schedule-notice" aria-live="polite">
			<style>{`
				.kl-schedule-notice{
					position:fixed;
					top:14px;
					left:50%;
					transform:translateX(-50%);
					width:min(560px, calc(100vw - 24px));
					z-index:120;
					pointer-events:none;
				}
				.kl-schedule-noticeCard{
					pointer-events:auto;
					display:flex;
					align-items:center;
					justify-content:space-between;
					gap:12px;
					padding:12px 12px;
					border-radius:16px;
					animation:klScheduleToastIn 260ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) both;
				}
				.kl-schedule-noticeCard.is-closing{animation:klScheduleToastOut 200ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) both}
				@keyframes klScheduleToastIn{from{opacity:0;transform:translate3d(0,-10px,0) scale(.985)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
				@keyframes klScheduleToastOut{from{opacity:1;transform:translate3d(0,0,0) scale(1)}to{opacity:0;transform:translate3d(0,-8px,0) scale(.985)}}
				.kl-schedule-noticeLeft{display:flex;align-items:center;gap:10px;min-width:0}
				.kl-schedule-noticeMsg{font-weight:900;font-size:13px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
				.kl-schedule-noticeBtn{border:0;background:transparent;padding:6px;border-radius:999px;cursor:pointer}
				.kl-schedule-noticeBtn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(var(--accent-green-soft-rgb, 187,247,208),0.45)}
			`}</style>

			<div
				key={toastKey}
				className={`kl-schedule-noticeCard ${toastClosing ? "is-closing" : ""}`.trim()}
				role="status"
				style={{
					border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.12)",
					background: darkMode ? "rgba(2,6,23,0.72)" : "rgba(255,255,255,0.92)",
					color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
					backdropFilter: "blur(12px)",
					boxShadow: darkMode ? "0 18px 52px rgba(0,0,0,0.45)" : "0 18px 52px rgba(15,23,42,0.14)",
				}}
			>
				<div className="kl-schedule-noticeLeft">
					<IconCheck
						className=""
						style={{ width: 18, height: 18, color: darkMode ? "var(--accent-green-soft)" : "var(--accent-green)" }}
					/>
					<div className="kl-schedule-noticeMsg">{toast.message}</div>
				</div>

				<button type="button" className="kl-schedule-noticeBtn" onClick={dismissToast} aria-label="Dismiss notification" title="Dismiss">
					<IconX className="" style={{ width: 18, height: 18, opacity: 0.85 }} />
				</button>
			</div>
		</div>
	) : null;

	function onPickDay(date) {
		if (!date) return;
		setSelectedISO(toISODateLocal(date));
	}

	/* =========================
	   UI
	========================= */

	if (!twReady) {
		const border = darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)";
		const panelBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.92)";
		const fg = darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)";
		const muted = darkMode ? "rgba(226,232,240,0.70)" : "rgba(71,85,105,0.90)";
		const accentRgb = "var(--accent-green-rgb, 22,163,74)";
		const accentSoftRgb = "var(--accent-green-soft-rgb, 187,247,208)";

		return (
			<>
				<span ref={twProbeRef} className="hidden" />
				{toastNode}
				<div style={{ height: "100%", width: "100%", minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
					<div style={{ borderRadius: 18, padding: "14px 16px", border, background: panelBg, color: fg, backdropFilter: "blur(10px)" }}>
						<div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>Schedule</div>
						<div style={{ marginTop: 4, fontWeight: 750, fontSize: 12, color: muted }}>Pick a day and plan your sessions.</div>
					</div>

					<div style={{ flex: "1 1 auto", minHeight: 0, borderRadius: 22, border, background: panelBg, backdropFilter: "blur(14px)", overflow: "hidden" }}>
						<div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", height: "100%" }}>
							<div style={{ padding: 16, minHeight: 0, height: "100%", display: "flex", flexDirection: "column" }}>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
									<div style={{ fontWeight: 950, fontSize: 18 }}>{monthLabel}</div>
									<div style={{ display: "flex", gap: 8 }}>
										<button type="button" onClick={() => goMonth(-1)} style={{ padding: "8px 10px", borderRadius: 999, border, background: "transparent", color: fg, fontWeight: 900 }}>Prev</button>
										<button type="button" onClick={goToday} style={{ padding: "8px 10px", borderRadius: 999, border, background: "transparent", color: fg, fontWeight: 900 }}>Today</button>
										<button type="button" onClick={() => goMonth(1)} style={{ padding: "8px 10px", borderRadius: 999, border, background: "transparent", color: fg, fontWeight: 900 }}>Next</button>
									</div>
								</div>

								<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8, color: muted, fontWeight: 850, fontSize: 12 }}>
									{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
										<div key={d}>{d}</div>
									))}
								</div>

								<div
									style={{
										flex: "1 1 auto",
										minHeight: 0,
										display: "grid",
										gridTemplateColumns: "repeat(7, 1fr)",
										gridTemplateRows: "repeat(6, minmax(0, 1fr))",
										gap: 6,
									}}
								>
									{monthGrid.map((date, idx) => {
										if (!date) {
											// Blank spacer to keep alignment (no visible "bubble")
											return <div key={`empty-${idx}`} style={{ width: "100%", height: "100%" }} />;
										}

										const iso = toISODateLocal(date);
										const isSelected = iso === selectedISO;
										const hasEvents = events.some((e) => e.date === iso);

										return (
											<button
												key={iso}
												type="button"
												onClick={() => onPickDay(date)}
												onMouseEnter={() => setHoveredISO(iso)}
												onMouseLeave={() => setHoveredISO((prev) => (prev === iso ? null : prev))}
												style={{
													width: "100%",
													height: "100%",
													borderRadius: 12,
													border,
													background: isSelected
															? darkMode
															? `rgba(${accentSoftRgb},0.12)`
															: `rgba(${accentRgb},0.12)`
														: hoveredISO === iso
																? darkMode
																? `rgba(${accentSoftRgb},0.08)`
																: `rgba(${accentRgb},0.08)`
															: "transparent",
														boxShadow: isSelected
															? darkMode
															? `0 0 0 2px rgba(${accentSoftRgb},0.45)`
															: `0 0 0 2px rgba(${accentRgb},0.35)`
															: hoveredISO === iso
																? darkMode
																? `0 0 0 2px rgba(${accentSoftRgb},0.18)`
																: `0 0 0 2px rgba(${accentRgb},0.18)`
																: "none",
													color: fg,
													fontWeight: isSelected ? 950 : 800,
													position: "relative",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
														transition: "background 120ms ease, box-shadow 120ms ease",
													cursor: "pointer",
												}}
											>
												{date.getDate()}
															{hasEvents && (
																<span
																	style={{
																		position: "absolute",
																		bottom: 6,
																		left: "50%",
																		transform: "translateX(-50%)",
																		width: 6,
																		height: 6,
																		borderRadius: 999,
																		background: darkMode ? `rgba(${accentSoftRgb},0.95)` : `rgba(${accentRgb},0.95)`,
																	}}
																/>
															)}
											</button>
										);
									})}
								</div>
							</div>

							<div style={{ padding: 16, borderLeft: border, display: "flex", flexDirection: "column", minHeight: 0 }}>
								<div style={{ fontWeight: 950, fontSize: 16, marginBottom: 10, color: fg }}>{selectedLabel}</div>
								<div style={{ fontWeight: 800, fontSize: 12, color: muted, marginBottom: 10 }}>Notes</div>

								<div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", paddingRight: 4 }}>
									{selectedEvents.length === 0 ? (
										<div style={{ fontWeight: 800, fontSize: 13, color: muted }}>No notes planned.</div>
									) : (
																		<div style={{ display: "grid" }}>
																			{selectedEvents.map((e) => {
												const isEditing = editingId === e.id;
																				const isCompleted = !!e.completed;
												return (
																					<div
																						key={e.id}
																						style={{
																							padding: "12px 12px",
																							borderBottom: border,
																							borderRadius: 14,
																								background: isCompleted
																									? darkMode
																										? `rgba(${accentSoftRgb},0.06)`
																										: `rgba(${accentRgb},0.06)`
																									: "transparent",
																								transition: "background 180ms ease",
																						}}
																					>
																							<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
																								<div style={{ flex: "1 1 auto", minWidth: 0 }}>
															{isEditing ? (
																<div style={{ display: "grid", gap: 8 }}>
																	<input
																		type="text"
																		value={draft.title}
																		onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
																		placeholder="Note title"
																		style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border, background: "transparent", color: fg, fontWeight: 850 }}
																	/>
																	<input
																		type="text"
																		value={draft.time}
																		onChange={(ev) => setDraft((d) => ({ ...d, time: ev.target.value }))}
																		placeholder="Time (e.g. 09:00 - 10:30)"
																		style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border, background: "transparent", color: fg, fontWeight: 800 }}
																	/>
																											<select
																												value={draft.category}
																												onChange={(ev) => setDraft((d) => ({ ...d, category: ev.target.value }))}
																												aria-label="Category"
																												style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border, background: "transparent", color: fg, fontWeight: 850 }}
																											>
																												{NOTE_CATEGORIES.map((c) => (
																													<option key={c.key} value={c.key}>
																														{c.label}
																													</option>
																												))}
																											</select>
																											<textarea
																													ref={noteTextareaRef}
																													value={draft.note}
																													onChange={(ev) => {
																													setDraft((d) => ({ ...d, note: ev.target.value }));
																													autoGrowTextarea(ev.target);
																												}}
																													placeholder="Extra note (optional)"
																													rows={3}
																													style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border, background: "transparent", color: fg, fontWeight: 750, overflow: "hidden", resize: "none" }}
																												/>
																</div>
															) : (
																										<div>
																											<div
																												style={{
																													fontWeight: 950,
																													fontSize: 13,
																													color: fg,
																													whiteSpace: "nowrap",
																													overflow: "hidden",
																														textOverflow: "ellipsis",
																														textDecoration: isCompleted ? "line-through" : "none",
																														opacity: isCompleted ? 0.72 : 1,
																														transition: "opacity 180ms ease",
																													}}
																											>
																												{e.title || "(untitled)"}
																											</div>
																												<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2, opacity: isCompleted ? 0.55 : 1, transition: "opacity 180ms ease" }}>
																													<div style={{ fontWeight: 850, fontSize: 12, color: muted }}>{e.time || ""}</div>
																													<div
																														style={{
																															padding: "4px 10px",
																															borderRadius: 999,
																															border,
																															fontSize: 10,
																															fontWeight: 950,
																															letterSpacing: 0.7,
																															textTransform: "uppercase",
																															color: darkMode ? `rgba(${accentSoftRgb},0.92)` : `rgba(${accentRgb},0.92)`,
																															background: darkMode ? `rgba(${accentSoftRgb},0.10)` : `rgba(${accentRgb},0.08)`,
																														}}
																													>
																														{categoryLabel(e.category)}
																													</div>
																												</div>
																											{typeof e.note === "string" && e.note.trim() ? (
																												<>
																												<button
																													type="button"
																													onClick={() =>
																														setOpenNoteById((prev) => ({
																															...prev,
																															[e.id]: !prev[e.id],
																														}))
																												}
																													aria-expanded={!!openNoteById[e.id]}
																													aria-controls={`schedule-note-${e.id}`}
																													style={{
																													marginTop: 8,
																														padding: 0,
																														border: 0,
																														background: "transparent",
																															color: muted,
																															fontWeight: 900,
																															fontSize: 12,
																															cursor: "pointer",
																															textDecoration: "underline",
																														}}
																												>
																														{openNoteById[e.id] ? "Hide note" : "Open note"}
																													</button>
																														{openNoteById[e.id] ? (
																															<div
																																id={`schedule-note-${e.id}`}
																																style={{
																																	marginTop: 8,
																																	fontSize: 12,
																																	fontWeight: 750,
																																	color: muted,
																																	whiteSpace: "pre-wrap",
																																	lineHeight: 1.35,
																																	opacity: isCompleted ? 0.7 : 1,
																																	maxHeight: 140,
																																	overflow: "auto",
																																	overflowWrap: "anywhere",
																																	wordBreak: "break-word",
																																	paddingRight: 6,
																																}}
																															>
																																{e.note}
																															</div>
																														) : null}
																												</>
																											) : null}
																										</div>
															)}
														</div>

																								<div style={{ flex: "0 0 auto", display: "flex", gap: 8 }} onMouseDown={(ev) => ev.stopPropagation()}>
															{isEditing ? (
																<>
																	<button
																		type="button"
																		onClick={() => saveEdit(e.id)}
																		aria-label="Save"
																		style={{ width: 38, height: 38, borderRadius: 12, border, background: `rgba(${accentRgb},0.14)`, color: fg, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
																	>
																		<IconCheck style={{ width: 18, height: 18 }} />
																	</button>
																	<button
																		type="button"
																		onClick={cancelEdit}
																		aria-label="Cancel"
																		style={{ width: 38, height: 38, borderRadius: 12, border, background: "transparent", color: muted, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
																	>
																		<IconX style={{ width: 18, height: 18 }} />
																	</button>
																</>
															) : (
																<>
																											<button
																												type="button"
																												onClick={() => toggleCompleted(e.id)}
																												aria-label={isCompleted ? "Mark as not completed" : "Mark as completed"}
																												aria-pressed={isCompleted}
																												style={{
																													width: 38,
																													height: 38,
																													borderRadius: 12,
																													border,
																													background: isCompleted ? (darkMode ? "var(--accent-green-soft)" : "var(--accent-green)") : "rgba(255,255,255,0.04)",
																													color: isCompleted ? (darkMode ? "#0f172a" : "white") : fg,
																													transition: "background 180ms ease, color 180ms ease",
																													display: "flex",
																													alignItems: "center",
																													justifyContent: "center",
																													cursor: "pointer",
																												}}
																												>
																													<IconCheck style={{ width: 18, height: 18 }} />
																												</button>
																			<button
																				type="button"
																				onClick={() => startEdit(e)}
																				aria-label="Edit"
																				style={{ width: 38, height: 38, borderRadius: 12, border, background: "rgba(255,255,255,0.04)", color: fg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
																			>
																				<IconPencil style={{ width: 18, height: 18 }} />
																			</button>
																			<button
																				type="button"
																				onClick={(ev) => {
																					ev.stopPropagation();
																					setMenuOpenId((prev) => (prev === e.id ? null : e.id));
																				}}
																				aria-label="More"
																				style={{ width: 38, height: 38, borderRadius: 12, border, background: "rgba(255,255,255,0.04)", color: fg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
																			>
																				<IconDotsVertical style={{ width: 18, height: 18 }} />
																			</button>
																</>
															)}
														</div>
																								</div>

																								{!isEditing && menuOpenId === e.id && (
																									<div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }} onMouseDown={(ev) => ev.stopPropagation()}>
																										<button
																											type="button"
																											onClick={() => removeEvent(e.id)}
																											style={{ padding: "10px 14px", borderRadius: 999, border, background: "transparent", color: fg, fontWeight: 950, cursor: "pointer" }}
																										>
																											Remove
																										</button>
																									</div>
																							)}
													</div>
												);
											})}
										</div>
									)}
								</div>

												<div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
													<button
														type="button"
														onClick={addMockEvent}
														style={{
															padding: "12px 16px",
															borderRadius: 14,
															border: 0,
																	background: darkMode ? "var(--accent-green-soft)" : "var(--accent-green)",
															color: darkMode ? "#0f172a" : "white",
															fontWeight: 950,
															cursor: "pointer",
														}}
													>
														+ Add a new note
													</button>
												</div>
							</div>
						</div>
					</div>
				</div>
			</>
		);
	}

	const panelClasses = darkMode
		? "border-white/10 bg-white/5"
		: "border-slate-200 bg-white/80";
	const subPanelClasses = darkMode
		? "bg-white/5"
		: "bg-slate-50";
	const textMuted = darkMode ? "text-slate-300/70" : "text-slate-600";
	const textPrimary = darkMode ? "text-white" : "text-slate-900";

	return (
		<>
			<span ref={twProbeRef} className="hidden" />
			{toastNode}

			<div className="h-full w-full min-h-0 flex flex-col gap-4">
				<div
					className={[
						"rounded-2xl border backdrop-blur-md",
						"px-4 py-3 sm:px-5 sm:py-4",
						panelClasses,
					].join(" ")}
				>
					<div className="flex items-center justify-between gap-3">
						<div>
							<div className={["text-[15px] sm:text-[16px] font-extrabold tracking-tight", textPrimary].join(" ")}>Schedule</div>
							<div className={["mt-0.5 text-xs font-semibold", textMuted].join(" ")}>Pick a day and plan your sessions.</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => goMonth(-1)}
								className={[
									"px-3 py-2 rounded-full text-xs font-extrabold border",
									darkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50",
									textPrimary,
								].join(" ")}
							>
								Prev
							</button>

							<button
								type="button"
								onClick={goToday}
								className={[
									"px-3 py-2 rounded-full text-xs font-extrabold border",
								darkMode
									? "border-white/10 bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.14)] hover:bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.22)]"
									: "border-[rgba(var(--accent-green-rgb,22,163,74),0.25)] bg-[rgba(var(--accent-green-rgb,22,163,74),0.10)] hover:bg-[rgba(var(--accent-green-rgb,22,163,74),0.14)]",
								darkMode ? "text-[var(--accent-green-soft)]" : "text-[var(--accent-green)]",
								].join(" ")}
							>
								Today
							</button>

							<button
								type="button"
								onClick={() => goMonth(1)}
								className={[
									"px-3 py-2 rounded-full text-xs font-extrabold border",
									darkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-slate-200 bg-white hover:bg-slate-50",
									textPrimary,
								].join(" ")}
							>
								Next
							</button>
						</div>
					</div>
				</div>

				<div className={["flex-1 min-h-0 rounded-[22px] border overflow-hidden backdrop-blur-md", panelClasses].join(" ")}>
					<div className="h-full grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
							<div className="p-4 sm:p-5 h-full min-h-0 flex flex-col">
							<div className="flex items-center justify-between gap-3 mb-4">
								<div className={["text-lg sm:text-xl font-extrabold tracking-tight", textPrimary].join(" ")}>{monthLabel}</div>
								<div className={["text-xs font-semibold", textMuted].join(" ")}>Click a date to view sessions</div>
							</div>

							<div className={["grid grid-cols-7 gap-2 text-[11px] font-extrabold tracking-wide uppercase", textMuted].join(" ")}>
								{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
									<div key={d} className="py-1">{d}</div>
								))}
							</div>

							<div className="mt-2 flex-1 min-h-0 grid grid-cols-7 grid-rows-6 gap-2">
								{monthGrid.map((date, idx) => {
									if (!date) {
										// Blank spacer to keep alignment (no visible "bubble")
										return <div key={`empty-${idx}`} className="w-full h-full" />;
									}

									const iso = toISODateLocal(date);
									const isSelected = iso === selectedISO;
									const hasEvents = events.some((e) => e.date === iso);
															const dayBase = darkMode
																? "bg-white/0 hover:bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.10)] hover:border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.25)] hover:text-[rgba(var(--accent-green-soft-rgb,187,247,208),0.95)] hover:ring-2 hover:ring-[rgba(var(--accent-green-soft-rgb,187,247,208),0.20)]"
																: "bg-white/0 hover:bg-[rgba(var(--accent-green-rgb,22,163,74),0.08)] hover:border-[rgba(var(--accent-green-rgb,22,163,74),0.25)] hover:text-[rgba(var(--accent-green-rgb,22,163,74),0.95)] hover:ring-2 hover:ring-[rgba(var(--accent-green-rgb,22,163,74),0.18)]";

									return (
										<button
											key={iso}
											type="button"
											onClick={() => onPickDay(date)}
											className={[
												"relative w-full h-full flex items-center justify-center rounded-xl border text-sm font-extrabold transition",
												dayBase,
												darkMode ? "border-white/10" : "border-slate-200",
												isSelected
													? darkMode
														? "bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.12)] border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.30)] text-[rgba(var(--accent-green-soft-rgb,187,247,208),0.95)] ring-2 ring-[rgba(var(--accent-green-soft-rgb,187,247,208),0.35)]"
														: "bg-[rgba(var(--accent-green-rgb,22,163,74),0.10)] border-[rgba(var(--accent-green-rgb,22,163,74),0.25)] text-[rgba(var(--accent-green-rgb,22,163,74),0.95)] ring-2 ring-[rgba(var(--accent-green-rgb,22,163,74),0.20)]"
													: textPrimary,
											].join(" ")}
											aria-label={iso}
										>
											<span>{date.getDate()}</span>
											{hasEvents && (
												<span
													className={[
														"absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
															darkMode ? "bg-[var(--accent-green-soft)]" : "bg-[var(--accent-green)]",
													].join(" ")}
												/>
											)}
									</button>
									);
								})}
							</div>
						</div>

						<div className={["border-t lg:border-t-0 lg:border-l", darkMode ? "border-white/10" : "border-slate-200"].join(" ")}>
							<div className={"h-full min-h-0 flex flex-col " + subPanelClasses}>
								<div className="p-4 sm:p-5">
															<div className={["text-base sm:text-lg font-extrabold tracking-tight", darkMode ? "text-[var(--accent-green-soft)]" : "text-[var(--accent-green)]"].join(" ")}>{selectedLabel}</div>
									<div className={["mt-1 text-xs font-semibold", textMuted].join(" ")}>Notes for the selected day</div>
								</div>

								<div className="flex-1 min-h-0 px-4 sm:px-5 pb-4 sm:pb-5 overflow-auto">
									<div className="grid gap-3">
										{selectedEvents.length === 0 ? (
											<div className={["rounded-2xl border px-4 py-4 text-sm font-semibold", darkMode ? "border-white/10 text-slate-300/70" : "border-slate-200 text-slate-500"].join(" ")}>No notes planned.</div>
										) : (
											<div className={["rounded-2xl border overflow-hidden", darkMode ? "border-white/10" : "border-slate-200"].join(" ")}>
																						{selectedEvents.map((e, idx) => {
																							const isEditing = editingId === e.id;
																							const isCompleted = !!e.completed;
													return (
														<div
															key={e.id}
															className={[
																											"px-4 py-4 transition-colors",
																											darkMode
																												? isCompleted
																													? "bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.06)]"
																														: "bg-white/0"
																												: isCompleted
																												? "bg-[rgba(var(--accent-green-rgb,22,163,74),0.06)]"
																												: "bg-white",
																idx === 0 ? "" : darkMode ? "border-t border-white/10" : "border-t border-slate-200",
														].join(" ")}
													>
																										<div className="flex items-start justify-between gap-3">
																										<div className="min-w-0 flex-1">
															{isEditing ? (
																<div className="grid gap-2">
																	<input
																		type="text"
																		value={draft.title}
																		onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
																		placeholder="Note title"
																		className={[
																		"w-full rounded-xl border px-3 py-2 text-sm font-extrabold outline-none",
																		darkMode ? "border-white/10 bg-white/5 text-white placeholder:text-slate-400" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
																	].join(" ")}
																	/>
																	<input
																		type="text"
																		value={draft.time}
																		onChange={(ev) => setDraft((d) => ({ ...d, time: ev.target.value }))}
																		placeholder="Time (e.g. 09:00 - 15:30)"
																		className={[
																		"w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none",
																		darkMode ? "border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-400" : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400",
																	].join(" ")}
																	/>
																				<select
																					value={draft.category}
																					onChange={(ev) => setDraft((d) => ({ ...d, category: ev.target.value }))}
																					aria-label="Category"
																					className={[
																					"w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none",
																					darkMode ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200 bg-white text-slate-700",
																				].join(" ")}
																				>
																					{NOTE_CATEGORIES.map((c) => (
																						<option key={c.key} value={c.key}>
																							{c.label}
																						</option>
																					))}
																				</select>
																				<textarea
																						ref={noteTextareaRef}
																						value={draft.note}
																						onChange={(ev) => {
																						setDraft((d) => ({ ...d, note: ev.target.value }));
																						autoGrowTextarea(ev.target);
																					}}
																						placeholder="Extra note (optional)"
																						rows={3}
																						className={[
																						"w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none resize-none overflow-hidden",
																						darkMode ? "border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-400" : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400",
																					].join(" ")}
																					/>
																</div>
															) : (
																										<div>
																												<div
																													className={[
																														"font-extrabold text-sm truncate transition-opacity",
																															textPrimary,
																															isCompleted ? "line-through opacity-70" : "opacity-100",
																														].join(" ")}
																													>
																														{e.title || "(untitled)"}
																													</div>
																													<div className={["mt-1 flex items-center gap-2 flex-wrap", isCompleted ? "opacity-60" : "opacity-100"].join(" ")}>
																														<div className={["text-xs font-semibold transition-opacity", textMuted].join(" ")}>{e.time || ""}</div>
																														<div
																															className={[
																															"px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider",
																																darkMode
																																? "border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.24)] bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.10)] text-[rgba(var(--accent-green-soft-rgb,187,247,208),0.92)]"
																																: "border-[rgba(var(--accent-green-rgb,22,163,74),0.25)] bg-[rgba(var(--accent-green-rgb,22,163,74),0.08)] text-[rgba(var(--accent-green-rgb,22,163,74),0.92)]",
																														].join(" ")}
																														>
																															{categoryLabel(e.category)}
																														</div>
																													</div>
																													{typeof e.note === "string" && e.note.trim() && (
																														<>
																															<button
																																type="button"
																																onClick={() =>
																																	setOpenNoteById((prev) => ({
																																		...prev,
																																		[e.id]: !prev[e.id],
																																	}))
																																}
																																aria-expanded={!!openNoteById[e.id]}
																																aria-controls={`schedule-note-${e.id}`}
																																className={[
																															"mt-2 text-[11px] font-extrabold underline underline-offset-2",
																															textMuted,
																															isCompleted ? "opacity-60" : "opacity-100",
																														].join(" ")}
																														>
																																{openNoteById[e.id] ? "Hide note" : "Open note"}
																															</button>
																															{openNoteById[e.id] && (
																																	<div
																																			id={`schedule-note-${e.id}`}
																																				className={[
																																					"mt-2 text-xs font-semibold whitespace-pre-wrap leading-snug max-h-36 overflow-auto pr-2 [overflow-wrap:anywhere]",
																																			textMuted,
																																			isCompleted ? "opacity-60" : "opacity-100",
																																		].join(" ")}
																																		>
																																			{e.note}
																																		</div>
																																	)}
																														</>
																													)}
																											</div>
															)}
														</div>

																												<div className="shrink-0 flex items-start gap-2" onMouseDown={(ev) => ev.stopPropagation()}>
															{isEditing ? (
																<>
																	<button
																		type="button"
																		onClick={() => saveEdit(e.id)}
																		className={[
																		"w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-extrabold transition",
																			darkMode
																			? "border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.24)] bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.14)] text-[rgba(var(--accent-green-soft-rgb,187,247,208),0.92)] hover:bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.22)]"
																			: "border-[rgba(var(--accent-green-rgb,22,163,74),0.25)] bg-[rgba(var(--accent-green-rgb,22,163,74),0.10)] text-[rgba(var(--accent-green-rgb,22,163,74),0.92)] hover:bg-[rgba(var(--accent-green-rgb,22,163,74),0.14)]",
																	].join(" ")}
																					aria-label="Save"
																	>
																					<IconCheck className="w-4 h-4" />
																	</button>
																	<button
																		type="button"
																		onClick={cancelEdit}
																		className={[
																		"w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-extrabold transition",
																		darkMode ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
																	].join(" ")}
																					aria-label="Cancel"
																	>
																					<IconX className="w-4 h-4" />
																	</button>
																</>
															) : (
																<>
																												<button
																													type="button"
																													onClick={() => toggleCompleted(e.id)}
																													aria-label={isCompleted ? "Mark as not completed" : "Mark as completed"}
																													aria-pressed={isCompleted}
																													className={[
																													"w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-extrabold transition-colors",
																														isCompleted
																															? darkMode
																																? "border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.35)] bg-[var(--accent-green-soft)] text-slate-900 hover:bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.92)]"
																																: "border-[rgba(var(--accent-green-rgb,22,163,74),0.40)] bg-[var(--accent-green)] text-white hover:bg-[rgba(var(--accent-green-rgb,22,163,74),0.92)]"
																															: darkMode
																															? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-[rgba(var(--accent-green-soft-rgb,187,247,208),0.25)]"
																															: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-[rgba(var(--accent-green-rgb,22,163,74),0.25)]",
																													].join(" ")}
																												>
																													<IconCheck className="w-4 h-4" />
																												</button>
																	<button
																		type="button"
																		onClick={() => startEdit(e)}
																		className={[
																		"w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-extrabold transition",
																		darkMode ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
																	].join(" ")}
																					aria-label="Edit"
																	>
																					<IconPencil className="w-4 h-4" />
																	</button>
																	<button
																		type="button"
																					onClick={(ev) => {
																					ev.stopPropagation();
																					setMenuOpenId((prev) => (prev === e.id ? null : e.id));
																				}}
																		className={[
																					"w-9 h-9 rounded-lg border flex items-center justify-center text-[10px] font-extrabold transition",
																		darkMode ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
																	].join(" ")}
																					aria-label="More"
																	>
																					<IconDotsVertical className="w-4 h-4" />
																	</button>
																</>
															)}
														</div>
																											</div>

																											{!isEditing && menuOpenId === e.id && (
																												<div className="mt-3 flex justify-end" onMouseDown={(ev) => ev.stopPropagation()}>
																													<button
																														type="button"
																														onClick={() => removeEvent(e.id)}
																														className={[
																														"px-4 py-2 rounded-full border text-xs font-extrabold transition",
																														darkMode ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
																													].join(" ")}
																													>
																														Remove
																													</button>
																												</div>
																											)}
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>

								<div className="p-4 sm:p-5 pt-0 flex justify-end">
									<button
										type="button"
										onClick={addMockEvent}
										className={[
											"px-5 py-3 rounded-xl font-extrabold shadow-sm transition",
										darkMode
											? "bg-[var(--accent-green-soft)] hover:bg-[rgba(var(--accent-green-soft-rgb,187,247,208),0.92)] text-slate-900"
											: "bg-[var(--accent-green)] hover:bg-[rgba(var(--accent-green-rgb,22,163,74),0.92)] text-white",
										].join(" ")}
									>
										+ Add a new note
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
