import React, { useEffect, useRef, useState } from "react";
import MainFolder from "./main_folder.jsx";
import MainDiary from "./main_diary.jsx";
import MainProfile from "./main_profile.jsx";
import MainSchedule from "./main_schedule.jsx";

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
			about: "About",
			bin: "Bin",
		}[activeKey] ?? "Section";

	const handleAboutCardMove = (e) => {
		const el = e.currentTarget;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		el.style.setProperty("--mx", `${x}px`);
		el.style.setProperty("--my", `${y}px`);
		el.style.setProperty("--kl-ga", "1");
	};

	const handleAboutCardLeave = (e) => {
		const el = e.currentTarget;
		if (!el) return;
		el.style.setProperty("--kl-ga", "0");
	};

	const aboutContent = (
		<div
			className="kl-about-root"
			style={{
				height: "100%",
				width: "100%",
				overflow: "auto",
				padding: 8,
				boxSizing: "border-box",
			}}
		>
			<style>{`
				.kl-about-root {
					--kl-glow2: color-mix(
						in srgb,
						color-mix(in srgb, var(--accent-green, #16a34a) 72%, var(--accent-green-soft, #bbf7d0)) 84%,
						transparent
					);
				}

				/* Cursor-follow outline highlight (ported from WelcomePage cards) */
				.kl-about-card {
					--kl-ga: 0;
					position: relative;
					isolation: isolate;
					overflow: hidden;
					transform: translateZ(0);
				}
				.kl-about-card::before {
					content: "";
					position: absolute;
					inset: 0;
					border-radius: inherit;
					padding: 3px;
					background: radial-gradient(
						190px circle at var(--mx, 50%) var(--my, 50%),
						var(--kl-glow2) 0%,
						transparent 58%
					);
					opacity: calc(var(--kl-ga, 0) * 1);
					transition: opacity 260ms var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
					pointer-events: none;
					z-index: 0;
					-webkit-mask:
						linear-gradient(#000 0 0) content-box,
						linear-gradient(#000 0 0);
					-webkit-mask-composite: xor;
					mask-composite: exclude;
				}
				.kl-about-card > * {
					position: relative;
					z-index: 1;
				}

				@media (prefers-reduced-motion: reduce) {
					.kl-about-card::before { display: none; }
				}
			`}</style>

			<div style={{ maxWidth: 860, margin: "0 auto", padding: "6px 6px 14px" }}>
				<div
					style={{
						fontWeight: 950,
						fontSize: 28,
						lineHeight: 1.1,
						letterSpacing: "-0.02em",
						color: darkMode ? "rgba(255,255,255,0.94)" : "rgba(15,23,42,0.92)",
						marginBottom: 10,
					}}
				>
					About KickLog
				</div>

				<div
					style={{
						fontWeight: 700,
						fontSize: 15,
						lineHeight: 1.55,
						color: darkMode ? "rgba(226,232,240,0.78)" : "rgba(71,85,105,0.92)",
						marginBottom: 16,
					}}
				>
					KickLog is a simple place to write things down, track your progress, and keep your head clear.
					Use it as a daily diary, a training log, or a “reset button” when the day gets noisy.
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr",
						gap: 12,
					}}
				>
					{[
						{
							title: "How to use it",
							items: [
								"Start a new diary entry when something matters — big or small.",
								"Be honest and short: a few lines is enough to build consistency.",
								"Use titles, dates, and clear notes so you can find things later.",
								"If you miss a day, don’t “catch up” — just continue from today.",
							],
						},
						{
							title: "Why you should use it",
							items: [
								"You remember patterns better when you write them down.",
								"Small improvements compound — tracking makes that visible.",
								"A log turns motivation into a plan and a plan into results.",
							],
						},
						{
							title: "A little motivation",
							items: [
								"You don’t need a perfect day — you need the next good decision.",
								"Consistency beats intensity. Show up, even if it’s just one sentence.",
								"Future you will thank you for leaving a trail.",
							],
						},
					].map((block) => (
						<div
							key={block.title}
							className="kl-about-card"
							onMouseMove={handleAboutCardMove}
							onMouseLeave={handleAboutCardLeave}
							style={{
								borderRadius: 18,
								padding: 14,
								border: "1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent)",
								background: darkMode
									? "color-mix(in srgb, var(--kl-bg, #0b1220) 76%, transparent)"
									: "color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%)",
							}}
						>
							<div
								style={{
									fontWeight: 900,
									fontSize: 15,
									letterSpacing: "-0.01em",
									color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.92)",
									marginBottom: 8,
								}}
							>
								{block.title}
							</div>
							<ul style={{ margin: 0, paddingLeft: 18 }}>
								{block.items.map((text) => (
									<li
										key={text}
										style={{
											margin: "6px 0",
											fontWeight: 650,
											fontSize: 14,
											lineHeight: 1.5,
											color: darkMode ? "rgba(226,232,240,0.82)" : "rgba(51,65,85,0.94)",
										}}
									>
										{text}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</div>
	);

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
		activeKey === "profile" ? (
			<MainProfile darkMode={darkMode} />
		) : activeKey === "diary" ? (
			diaryContent
		) : activeKey === "folder" ? (
			<MainFolder darkMode={darkMode} />
		) : activeKey === "schedule" ? (
			<MainSchedule darkMode={darkMode} />
		) : activeKey === "about" ? (
			aboutContent
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

