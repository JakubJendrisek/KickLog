import React, { useEffect, useRef, useState } from "react";
import MainFolder from "./main_folder.jsx";
import MainDiary from "./main_diary.jsx";
import MainProfile from "./main_profile.jsx";
import MainSchedule from "./main_schedule.jsx";
import MainAbout from "./main_about.jsx";

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
	useEffect(() => {
		const el = twProbeRef.current;
		if (!el) return;
		setTwReady(window.getComputedStyle(el).display === "none");
	}, []);

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

	const diaryBackTarget = lastNonDiaryKey && lastNonDiaryKey !== "diary" ? lastNonDiaryKey : "profile";

	const content =
		activeKey === "profile" ? (
			<MainProfile darkMode={darkMode} />
		) : activeKey === "diary" ? (
			<div style={{ height: "100%", width: "100%" }}>
				<MainDiary
					darkMode={darkMode}
					initialView="load"
					onBack={() => onNavigate?.(diaryBackTarget)}
				/>
			</div>
		) : activeKey === "folder" ? (
			<MainFolder darkMode={darkMode} />
		) : activeKey === "schedule" ? (
			<MainSchedule darkMode={darkMode} />
		) : activeKey === "about" ? (
			<MainAbout darkMode={darkMode} />
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

