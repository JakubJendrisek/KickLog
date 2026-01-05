import React, { useEffect, useMemo, useState } from "react";
import MainSidebar from "./main_sidebar.jsx";
import MainContent from "./main_content.jsx";

export default function MainPage() {
	// Layout shell: sidebar + empty content area (content comes later)
	const [darkMode, setDarkMode] = useState(false);
	const [activeKey, setActiveKey] = useState("profile");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [lastNonDiaryKey, setLastNonDiaryKey] = useState("profile");

	const handleSelect = useMemo(() => {
		return (nextKey) => {
			setActiveKey((prev) => {
				if (nextKey === "diary" && prev !== "diary") {
					setLastNonDiaryKey(prev);
				}
				if (nextKey !== "diary") {
					setLastNonDiaryKey(nextKey);
				}
				return nextKey;
			});
		};
	}, []);

	// Smooth the overall feel (also affects native form controls)
	useEffect(() => {
		document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
		return () => {
			document.documentElement.style.colorScheme = "";
		};
	}, [darkMode]);

	const transitionStyle = {
		transitionProperty: "background-color, color, border-color, box-shadow",
		transitionDuration: "var(--theme-dur)",
		transitionTimingFunction: "var(--theme-ease)",
		willChange: "background-color, color",
	};

	return (
		<div
			data-page="main"
			data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
			className={darkMode ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-white text-slate-900"}
			style={{
				// Single source of truth for theme animation timing:
				"--theme-dur": "820ms", // was 320ms
				"--theme-ease": "cubic-bezier(0.2, 0.8, 0.2, 1)",
				"--collapse-dur": "320ms", // NEW: sidebar collapse/expand animation speed
				"--collapse-ease": "var(--theme-ease)",
				"--accent-green": "#16a34a", // strong (emerald-600)
				"--accent-green-soft": "#bbf7d0", // soft (emerald-200)
				minHeight: "100vh",
				background: darkMode ? "#0b1220" : "#ffffff",
				color: darkMode ? "#ffffff" : "#0f172a",
				...transitionStyle,
			}}
		>
			{/* Sync sidebar + rest of UI: same duration/ease everywhere (theme-related props only). */}
			<style>{`
				/* Keep a single easing everywhere */
				[data-page="main"],
				[data-page="main"] aside[aria-label="Main sidebar"],
				[data-page="main"] aside[aria-label="Main sidebar"] *,
				[data-page="main"] main[aria-label="Main content"],
				[data-page="main"] main[aria-label="Main content"] * {
					transition-timing-function: var(--theme-ease) !important;
				}

				/* Sidebar CONTENT colors should follow THEME duration (synced with page) */
				[data-page="main"] aside[aria-label="Main sidebar"] * {
					transition-property: background-color, color, border-color, box-shadow, fill, stroke !important;
					transition-duration: var(--theme-dur) !important;
				}

				/* Main content colors should follow THEME duration (synced with page) */
				[data-page="main"] main[aria-label="Main content"],
				[data-page="main"] main[aria-label="Main content"] * {
					transition-property: background-color, color, border-color, box-shadow, fill, stroke !important;
					transition-duration: var(--theme-dur) !important;
				}

				/* Sidebar CONTAINER: width/transform use collapse duration; colors use theme duration */
				[data-page="main"] aside[aria-label="Main sidebar"] {
					transition-property: width, transform, background-color, color, border-color, box-shadow !important;
					transition-duration:
						var(--collapse-dur),
						var(--collapse-dur),
						var(--theme-dur),
						var(--theme-dur),
						var(--theme-dur),
						var(--theme-dur) !important;
					transition-timing-function:
						var(--collapse-ease),
						var(--collapse-ease),
						var(--theme-ease),
						var(--theme-ease),
						var(--theme-ease),
						var(--theme-ease) !important;
					will-change: width, transform, background-color, color;
				}

				/* Dark-mode switch thumb: keep synced with THEME duration */
				[data-page="main"] [aria-label="Toggle dark mode"] * {
					transition-duration: var(--theme-dur) !important;
					transition-timing-function: var(--theme-ease) !important;
				}
				[data-page="main"] [aria-label="Toggle dark mode"] [style*="left"] {
					transition: left var(--theme-dur) var(--theme-ease) !important;
				}

				/* Collapse arrow rotation uses collapse duration */
				[data-page="main"] button[aria-label*="sidebar"] svg,
				[data-page="main"] button[aria-label*="sidebar"] span {
					transition-property: transform !important;
					transition-duration: var(--collapse-dur) !important;
					transition-timing-function: var(--collapse-ease) !important;
				}

				/* Label/title arrival synced with collapse duration (+delay on expand) */
				[data-page="main"] .sidebar-label,
				[data-page="main"] .sidebar-title,
				[data-page="main"] .sidebar-dark-label {
					transition-duration: var(--collapse-dur) !important;
					transition-timing-function: var(--collapse-ease) !important;
					transition-property: max-width, opacity !important;
				}
				[data-page="main"][data-sidebar-collapsed="false"] .sidebar-label,
				[data-page="main"][data-sidebar-collapsed="false"] .sidebar-title,
				[data-page="main"][data-sidebar-collapsed="false"] .sidebar-dark-label {
					transition-delay: 90ms !important;
				}
				[data-page="main"][data-sidebar-collapsed="true"] .sidebar-label,
				[data-page="main"][data-sidebar-collapsed="true"] .sidebar-title,
				[data-page="main"][data-sidebar-collapsed="true"] .sidebar-dark-label {
					transition-delay: 0ms !important;
				}

				@media (prefers-reduced-motion: reduce) {
					[data-page="main"] aside[aria-label="Main sidebar"],
					[data-page="main"] aside[aria-label="Main sidebar"] *,
					[data-page="main"] main[aria-label="Main content"],
					[data-page="main"] main[aria-label="Main content"] * {
						transition-duration: 0ms !important;
					}
				}
			`}</style>

			<div
				className="flex min-h-screen w-full antialiased"
				style={{ display: "flex", minHeight: "100vh", width: "100%", ...transitionStyle }}
			>
				<MainSidebar
					darkMode={darkMode}
					onToggleDarkMode={() => setDarkMode((v) => !v)}
					activeKey={activeKey}
					onSelect={handleSelect}
					collapsed={sidebarCollapsed}
					onToggleCollapsed={setSidebarCollapsed}
				/>

				<MainContent
					darkMode={darkMode}
					activeKey={activeKey}
					sidebarCollapsed={sidebarCollapsed}
					onNavigate={handleSelect}
					lastNonDiaryKey={lastNonDiaryKey}
				/>
			</div>
		</div>
	);
	
}
