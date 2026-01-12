import React, { useEffect, useRef, useState } from "react";

const FOLDERS_KEY = "kicklog.diary.folders.v1";
const DIARIES_KEY = "kicklog.diary.items.v1";

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

export default function MainFolder({ darkMode }) {
	// Tailwind detection (same idea as MainSidebar/MainContent)
	const twProbeRef = useRef(null);
	const [twReady, setTwReady] = useState(false);
	useEffect(() => {
		const el = twProbeRef.current;
		if (!el) return;
		setTwReady(window.getComputedStyle(el).display === "none");
	}, []);

	const [folders, setFolders] = useState([]);
	const [newName, setNewName] = useState("");
	const [diaries, setDiaries] = useState([]);

	useEffect(() => {
		setFolders(loadFolders());
		setDiaries(loadDiaries());
	}, []);

	useEffect(() => {
		const refresh = () => {
			setFolders(loadFolders());
			setDiaries(loadDiaries());
		};
		window.addEventListener("kicklog:foldersChanged", refresh);
		window.addEventListener("kicklog:diariesChanged", refresh);
		return () => {
			window.removeEventListener("kicklog:foldersChanged", refresh);
			window.removeEventListener("kicklog:diariesChanged", refresh);
		};
	}, []);

	const diaryCountForFolder = (folderId) => diaries.filter((d) => d.folderId === folderId).length;

	const createFolder = () => {
		const trimmed = newName.trim();
		if (!trimmed) return;
		const next = [{ id: String(Date.now()), name: trimmed, createdAt: Date.now() }, ...folders];
		saveFolders(next);
		setFolders(next);
		setNewName("");
	};

	const renameFolder = (id) => {
		const current = folders.find((f) => f.id === id);
		const initial = current?.name ?? "";
		const nextName = window.prompt("Rename folder", initial);
		if (nextName == null) return;
		const trimmed = nextName.trim();
		if (!trimmed) return;
		const next = folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
		saveFolders(next);
		setFolders(next);
	};

	const deleteFolder = (id) => {
		const current = folders.find((f) => f.id === id);
		const ok = window.confirm(`Delete folder "${current?.name ?? "this folder"}"?`);
		if (!ok) return;
		const next = folders.filter((f) => f.id !== id);
		saveFolders(next);
		setFolders(next);
	};

	// ===== Fallback (no Tailwind loaded) =====
	if (!twReady) {
		const shellStyle = {
			height: "100%",
			width: "100%",
			minHeight: 0,
			padding: 14,
			display: "flex",
			flexDirection: "column",
			gap: 12,
		};

		const topBarStyle = {
			borderRadius: 18,
			padding: "14px 16px",
			border: darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
			background: darkMode
				? "color-mix(in srgb, var(--kl-bg, #0b1220) 82%, transparent)"
				: "color-mix(in srgb, #ffffff 88%, var(--accent-green-soft, #bbf7d0) 12%)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
			backdropFilter: "blur(10px)",
		};

		const cardStyle = {
			width: "100%",
			flex: "1 1 auto",
			minHeight: 0,
			padding: 22,
			borderRadius: 22,
			border: darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
			background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.90)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
			backdropFilter: "blur(14px)",
			boxShadow: darkMode ? "0 18px 48px rgba(0,0,0,0.30)" : "0 18px 48px rgba(15,23,42,0.08)",
			overflow: "auto",
		};

		const inputStyle = {
			flex: "1 1 260px",
			borderRadius: 14,
			border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.14)",
			padding: "12px 12px",
			fontWeight: 800,
			outline: "none",
			backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.95)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
			transitionProperty: "background-color, color, border-color, box-shadow",
			transitionDuration: "var(--theme-dur, 820ms)",
			transitionTimingFunction: "var(--theme-ease, ease)",
			transitionDelay: "0ms",
		};

		const primaryBtn = (enabled) => ({
			borderRadius: 999,
			border: 0,
			padding: "12px 16px",
			fontWeight: 900,
			cursor: enabled ? "pointer" : "not-allowed",
			background: "var(--accent-green, #16a34a)",
			color: "white",
			opacity: enabled ? 1 : 0.55,
		});

		const secondaryBtn = {
			borderRadius: 999,
			border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.14)",
			padding: "10px 14px",
			fontWeight: 900,
			cursor: "pointer",
			background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.75)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
		};

		const dangerBtn = {
			...secondaryBtn,
			border: "1px solid rgba(239,68,68,0.35)",
		};

		return (
			<>
				<span ref={twProbeRef} className="hidden" />
				<div style={shellStyle}>
					<div style={topBarStyle}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
							<div>
								<div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>Diary Folders</div>
								<div style={{ marginTop: 4, fontWeight: 750, fontSize: 12, opacity: 0.82 }}>
									Create and manage folders.
								</div>
							</div>
							<div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>{folders.length} total</div>
						</div>
					</div>

					<div style={cardStyle}>
						<div style={{ fontWeight: 950, fontSize: 18, marginBottom: 10 }}>Create folder</div>
						<div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
							<input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="New folder name"
								style={inputStyle}
								maxLength={40}
								aria-label="New folder name"
							/>
							<button
								type="button"
								onClick={createFolder}
								disabled={!newName.trim()}
								style={primaryBtn(!!newName.trim())}
								aria-label="Create folder"
							>
								Create folder
							</button>
						</div>

						<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
							<div style={{ fontWeight: 950, fontSize: 18 }}>Your folders</div>
							<div style={{ fontWeight: 900, fontSize: 12, opacity: 0.75 }}>Click rename/delete to manage</div>
						</div>

						{folders.length === 0 ? (
							<div style={{ fontWeight: 800, fontSize: 13, opacity: 0.8 }}>No folders yet.</div>
						) : (
							<div style={{ display: "grid", gap: 10 }}>
								{folders.map((f) => (
									<div
										key={f.id}
										style={{
											padding: "10px 12px",
											borderRadius: 14,
											border: darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
											background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.75)",
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 10,
										}}
									>
										<div style={{ fontWeight: 900 }}>
											{f.name}
											<span style={{ marginLeft: 10, fontWeight: 800, opacity: 0.7 }}>
												({diaryCountForFolder(f.id)})
											</span>
										</div>
										<div style={{ display: "flex", gap: 8 }}>
											<button type="button" style={secondaryBtn} onClick={() => renameFolder(f.id)} aria-label={`Rename ${f.name}`}>
												Rename
											</button>
											<button type="button" style={dangerBtn} onClick={() => deleteFolder(f.id)} aria-label={`Delete ${f.name}`}>
												Delete
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</>
		);
	}

	// ===== Tailwind version =====
	return (
		<>
			<span ref={twProbeRef} className="hidden" />
			<div className="h-full w-full min-h-0 p-3 sm:p-5 flex flex-col gap-3">
					<style>{`
						.kl-folder-topbar {
							border: 1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 10%, transparent);
							background: color-mix(in srgb, var(--kl-bg, #0b1220) 82%, transparent);
							color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
							backdrop-filter: blur(10px);
						}
						[data-theme="light"] .kl-folder-topbar {
							background: color-mix(in srgb, #ffffff 88%, var(--accent-green-soft, #bbf7d0) 12%);
							color: #0f172a;
							border-color: rgba(15,23,42,0.10);
						}
						.kl-folder-panel {
							border: 1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 10%, transparent);
							background: color-mix(in srgb, var(--kl-bg, #0b1220) 86%, transparent);
							color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
							backdrop-filter: blur(14px);
							box-shadow: 0 18px 48px rgba(0,0,0,0.30);
						}
						[data-theme="light"] .kl-folder-panel {
							background: rgba(255,255,255,0.90);
							color: #0f172a;
							border-color: rgba(15,23,42,0.10);
							box-shadow: 0 18px 48px rgba(15,23,42,0.08);
						}
					`}</style>
				<div className="kl-folder-topbar rounded-2xl px-4 py-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<div className="text-base font-extrabold">Diary Folders</div>
							<div className={darkMode ? "mt-1 text-xs font-semibold text-slate-300" : "mt-1 text-xs font-semibold text-slate-600"}>
								Create and manage folders.
							</div>
						</div>
						<div className={darkMode ? "text-xs font-extrabold text-slate-300" : "text-xs font-extrabold text-slate-600"}>
							{folders.length} total
						</div>
					</div>
				</div>

				<div className="kl-folder-panel flex-1 min-h-0 overflow-auto rounded-[22px] p-6 sm:p-8">
					<div className="text-lg sm:text-xl font-extrabold">Create folder</div>
					<div className={darkMode ? "mt-1 text-sm font-semibold text-slate-300" : "mt-1 text-sm font-semibold text-slate-600"}>
						Give it a short name to organize your diaries.
					</div>

					<div className="mt-4 flex flex-wrap gap-3">
						<input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="New folder name"
							maxLength={40}
							aria-label="New folder name"
							style={{
								transitionProperty: "background-color, color, border-color, box-shadow",
								transitionDuration: "var(--theme-dur, 820ms)",
								transitionTimingFunction: "var(--theme-ease, ease)",
								transitionDelay: "0ms",
							}}
							className={[
								"flex-1 min-w-[280px] rounded-2xl border px-4 py-3 font-semibold outline-none",
								darkMode
									? "border-white/10 bg-white/5 text-white placeholder:text-slate-400"
									: "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
							].join(" ")}
						/>
						<button
							type="button"
							onClick={createFolder}
							disabled={!newName.trim()}
							aria-label="Create folder"
							className={[
								"rounded-2xl px-6 py-3 font-extrabold",
								newName.trim() ? "bg-emerald-600 text-white" : "bg-emerald-600/50 text-white/80 cursor-not-allowed",
							].join(" ")}
						>
							Create folder
						</button>
					</div>

					<div className="mt-8 flex items-baseline justify-between gap-3">
						<div>
							<div className="text-lg sm:text-xl font-extrabold">Your folders</div>
							<div className={darkMode ? "mt-1 text-sm font-semibold text-slate-300" : "mt-1 text-sm font-semibold text-slate-600"}>
								Rename or delete folders anytime.
							</div>
						</div>
					</div>

					{folders.length === 0 ? (
						<div className={darkMode ? "mt-4 text-sm font-semibold text-slate-300" : "mt-4 text-sm font-semibold text-slate-600"}>
							No folders yet.
						</div>
					) : (
						<div className="mt-4 grid gap-3">
							{folders.map((f) => (
								<div
									key={f.id}
									className={[
										"rounded-2xl border px-4 py-4",
										darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50",
									].join(" ")}
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="min-w-[220px]">
											<div className="text-base font-extrabold">
												{f.name}
												<span className={darkMode ? "ml-2 text-sm font-extrabold text-slate-300" : "ml-2 text-sm font-extrabold text-slate-600"}>
													({diaryCountForFolder(f.id)})
												</span>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => renameFolder(f.id)}
												className={[
													"rounded-full px-4 py-2 text-sm font-extrabold border",
													darkMode
														? "border-white/10 bg-white/0 text-white hover:bg-white/5"
														: "border-slate-200 bg-white text-slate-900 hover:bg-slate-100",
												].join(" ")}
												aria-label={`Rename ${f.name}`}
											>
												Rename
											</button>
											<button
												type="button"
												onClick={() => deleteFolder(f.id)}
												className={[
													"rounded-full px-4 py-2 text-sm font-extrabold border",
													"border-red-400/40",
													darkMode ? "text-white hover:bg-white/5" : "text-slate-900 hover:bg-red-50",
												].join(" ")}
												aria-label={`Delete ${f.name}`}
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</>
	);
}

