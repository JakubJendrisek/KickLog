import React, { useEffect, useRef, useState } from "react";
import MainFolder from "./main_folder.jsx";
import MainDiary from "./main_diary.jsx";

export default function MainContent({
	darkMode,
	activeKey,
	sidebarCollapsed = false,
	onNavigate,
	lastNonDiaryKey = "profile",
}) {
	// Tailwind detection (same idea as MainSidebar)
	const twProbeRef = useRef(null);
	const [twReady, setTwReady] = useState(false);
	const [diaryMode, setDiaryMode] = useState("chooser"); // chooser | new | load
	useEffect(() => {
		const el = twProbeRef.current;
		if (!el) return;
		setTwReady(window.getComputedStyle(el).display === "none");
	}, []);

	useEffect(() => {
		if (activeKey !== "diary") setDiaryMode("chooser");
	}, [activeKey]);

	const transitionStyle = {
		transitionProperty: "background-color, color, border-color, box-shadow",
		transitionDuration: "var(--theme-dur)",
		transitionTimingFunction: "var(--theme-ease)",
		willChange: "background-color, color",
	};

	const sectionTitle =
		{
			profile: "Profile",
			diary: "Diary",
			folder: "Diary Folder",
			schedule: "Schedule",
			privacy: "Privacy Policy",
			bin: "Bin",
		}[activeKey] ?? "Section";

	const diaryChooser = (
		<div
			className="kl-diary-chooser"
			data-theme={darkMode ? "dark" : "light"}
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				textAlign: "center",
				padding: 14,
			}}
		>
			<style>{`
				.kl-diary-chooser {
					--kl-green: var(--accent-green, #16a34a);
					--kl-green-soft: var(--accent-green-soft, #bbf7d0);
				}
				.kl-diary-card {
					position: relative;
					width: min(640px, 100%);
					border-radius: 22px;
					padding: 22px 20px;
					border: 1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 58%, transparent);
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 92%, transparent);
					backdrop-filter: blur(14px);
					transform: translateZ(0);
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, ease),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, ease),
						border-color var(--theme-dur, 820ms) var(--theme-ease, ease),
						background-color var(--theme-dur, 820ms) var(--theme-ease, ease);
					box-shadow: 0 22px 64px rgba(0, 0, 0, 0.22);
				}
				.kl-diary-chooser[data-theme="light"] .kl-diary-card {
					box-shadow: 0 22px 64px rgba(15, 23, 42, 0.10);
				}
				.kl-diary-inner { position: relative; z-index: 1; }
				.kl-diary-title {
					font-weight: 900;
					font-size: 28px;
					line-height: 1.1;
					letter-spacing: -0.02em;
					margin-bottom: 10px;
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 94%, transparent);
				}
				.kl-diary-sub {
					font-weight: 750;
					font-size: 15px;
					margin-bottom: 18px;
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 76%, transparent);
				}
				.kl-diary-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
				.kl-btn {
					min-width: 190px;
					padding: 12px 16px;
					border-radius: 16px;
					font-weight: 850;
					letter-spacing: 0.01em;
					cursor: pointer;
					transform: translateZ(0);
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, ease),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, ease),
						background-color var(--theme-dur, 820ms) var(--theme-ease, ease),
						border-color var(--theme-dur, 820ms) var(--theme-ease, ease);
				}
				.kl-btn:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(22,163,74,0.22); }
				.kl-btn:hover { transform: translateY(-2px) scale(1.02); }
				.kl-btn:active { transform: translateY(0px) scale(0.99); }
				.kl-btn-primary {
					border: 1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 14%, transparent);
					color: #ffffff;
					background: linear-gradient(
						90deg,
						color-mix(in srgb, var(--kl-green) 94%, #ffffff),
						color-mix(in srgb, var(--kl-green) 76%, var(--kl-green-soft))
					);
				}
				.kl-btn-secondary {
					border: 1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 16%, transparent);
					color: color-mix(in srgb, var(--kl-fg, #ffffff) 90%, transparent);
					background: color-mix(in srgb, var(--kl-bg, #0b1220) 76%, transparent);
				}
				.kl-btn-primary:hover { box-shadow: 0 18px 44px rgba(22,163,74,0.22); }
				.kl-btn-secondary:hover { box-shadow: 0 18px 44px rgba(15,23,42,0.14); }
				.kl-diary-card:hover { transform: none; }
				@media (prefers-reduced-motion: reduce) {
					.kl-diary-card, .kl-btn { transition-duration: 0ms !important; }
				}
			`}</style>

			<div className="kl-diary-card">
				<div className="kl-diary-inner">
					<div className="kl-diary-title">
						Diary
					</div>
					<div className="kl-diary-sub">
						Start fresh or pick up where you left off.
					</div>

					<div className="kl-diary-actions">
						<button
							type="button"
							onClick={() => setDiaryMode("new")}
							className="kl-btn kl-btn-primary"
							aria-label="New Diary"
						>
							New Diary
						</button>

						<button
							type="button"
							onClick={() => setDiaryMode("load")}
							className="kl-btn kl-btn-secondary"
							aria-label="Load Diary"
						>
							Load Diary
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	const diaryContent =
		diaryMode === "chooser" ? (
			diaryChooser
		) : (
			<div style={{ height: "100%", width: "100%" }}>
				<MainDiary
					key={diaryMode}
					darkMode={darkMode}
					initialView={diaryMode === "new" ? "create" : "load"}
					onBack={() => setDiaryMode("chooser")}
				/>
			</div>
		);

	const content =
		activeKey === "diary" ? (
			diaryContent
		) : activeKey === "folder" ? (
			<MainFolder darkMode={darkMode} />
		) : (
			<div className="h-full w-full flex items-center justify-center text-center">
				<div style={{ maxWidth: 520 }}>
					<div
						style={{
							fontWeight: 900,
							fontSize: 26,
							lineHeight: 1.15,
							color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
							marginBottom: 10,
						}}
					>
						{sectionTitle}
					</div>
					<div
						style={{
							fontWeight: 700,
							fontSize: 15,
							color: darkMode ? "rgba(226,232,240,0.78)" : "rgba(71,85,105,0.90)",
						}}
					>
						Select a section in the sidebar to view it here.
					</div>
				</div>
			</div>
		);

	// ===== Fallback (no Tailwind loaded) =====
	if (!twReady) {
		const gutter = 18;
		const panelStyle = {
			height: `calc(100vh - ${gutter * 2}px)`,
			width: "100%",
			borderRadius: 24,
			border: darkMode
				? "2px solid color-mix(in srgb, rgba(255,255,255,0.12) 70%, var(--accent-green) 30%)"
				: "2px solid color-mix(in srgb, #e5e7eb 70%, var(--accent-green-soft) 30%)",
			background: darkMode ? "#0b1220" : "#ffffff",
			boxShadow: darkMode ? "0 18px 48px rgba(0,0,0,0.35)" : "0 18px 48px rgba(15,23,42,0.08)",
			padding: 18,
			boxSizing: "border-box",
			...transitionStyle,
		};

		return (
			<>
				<span ref={twProbeRef} className="hidden" />
				<div style={{ flex: 1, minWidth: 0, padding: gutter, ...transitionStyle }}>
					<main
						aria-label="Main content"
						style={{ ...panelStyle, position: "relative", overflow: "hidden", isolation: "isolate" }}
					>
						<div style={{ position: "relative", zIndex: 1, height: "100%", width: "100%" }}>
							{content}
						</div>
					</main>
				</div>
			</>
		);
	}

	// ===== Tailwind version =====
	return (
		<>
			<span ref={twProbeRef} className="hidden" />

			<div className="flex-1 min-w-0 p-4 sm:p-5" style={{ flex: 1, minWidth: 0, ...transitionStyle }}>
				<main
					aria-label="Main content"
					style={transitionStyle}
					className={[
						"h-[calc(100vh-2rem)] sm:h-[calc(100vh-2.5rem)]",
						"w-full rounded-[24px] border",
						"relative overflow-hidden isolate",
						darkMode ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white",
						"shadow-[0_18px_48px_rgba(15,23,42,0.10)]",
						"p-4 sm:p-5",
					].join(" ")}
					data-active={activeKey}
					data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
				>
					<div className="relative z-[1] h-full w-full">{content}</div>
				</main>
			</div>
		</>
	);
}

