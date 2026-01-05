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
		const cardStyle = {
			maxWidth: 760,
			margin: "0 auto",
			padding: 18,
			borderRadius: 18,
			border: darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
			background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.02)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
		};

		const inputStyle = {
			flex: "1 1 260px",
			borderRadius: 14,
			border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.14)",
			padding: "12px 12px",
			fontWeight: 800,
			outline: "none",
			background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.95)",
			color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
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
				<div style={{ height: "100%", width: "100%" }}>
					<div style={cardStyle}>
						<div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Diary Folders</div>
						<div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, marginBottom: 14 }}>
							Create and manage folders.
						</div>

						<div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
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
			<div className="h-full w-full">
				<div className="mx-auto max-w-3xl">
					<div
						className={[
							"rounded-[18px] border p-5",
							darkMode ? "border-white/10 bg-white/5 text-white" : "border-slate-200 bg-white text-slate-900",
						].join(" ")}
					>
						<div className="text-xl font-extrabold">Diary Folders</div>
						<div className={darkMode ? "mt-1 text-sm font-semibold text-slate-300" : "mt-1 text-sm font-semibold text-slate-600"}>
							Create and manage folders.
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="New folder name"
								maxLength={40}
								aria-label="New folder name"
								className={[
									"flex-1 min-w-[220px] rounded-xl border px-3 py-2 font-semibold outline-none",
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
									"rounded-full px-4 py-2 font-extrabold",
									newName.trim()
										? "bg-emerald-600 text-white"
										: "bg-emerald-600/50 text-white/80 cursor-not-allowed",
								].join(" ")}
							>
								Create folder
							</button>
						</div>

						{folders.length === 0 ? (
							<div className={darkMode ? "mt-4 text-sm font-semibold text-slate-300" : "mt-4 text-sm font-semibold text-slate-600"}>
								No folders yet.
							</div>
						) : (
							<div className="mt-4 grid gap-2">
								{folders.map((f) => (
									<div
										key={f.id}
										className={[
											"rounded-xl border px-3 py-2",
											darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50",
										].join(" ")}
									>
										<div className="flex items-center justify-between gap-3">
											<div className="font-extrabold">
												{f.name}
												<span className={darkMode ? "ml-2 text-sm font-extrabold text-slate-300" : "ml-2 text-sm font-extrabold text-slate-600"}>
													({diaryCountForFolder(f.id)})
												</span>
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => renameFolder(f.id)}
													className={[
													"rounded-full px-3 py-1.5 text-sm font-extrabold border",
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
													"rounded-full px-3 py-1.5 text-sm font-extrabold border",
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
			</div>
		</>
	);
}

