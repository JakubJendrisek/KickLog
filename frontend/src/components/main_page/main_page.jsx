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
			data-theme={darkMode ? "dark" : "light"}
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
				// Strong borders for panels + active item glow source
				"--kl-sidebar-border-strong": darkMode
					? "color-mix(in srgb, rgba(255,255,255,0.14) 74%, var(--accent-green-soft) 26%)"
					: "color-mix(in srgb, #e5e7eb 68%, var(--accent-green) 32%)",
				"--kl-content-border-strong": darkMode
					? "color-mix(in srgb, rgba(255,255,255,0.12) 70%, var(--accent-green) 30%)"
					: "color-mix(in srgb, #e5e7eb 70%, var(--accent-green-soft) 30%)",
				"--kl-active-accent": "var(--kl-content-border-strong)",
				"--kl-bg": darkMode ? "#0b1220" : "#ffffff",
				"--kl-fg": darkMode ? "#ffffff" : "#0f172a",
				minHeight: "100vh",
				background: darkMode ? "#0b1220" : "color-mix(in srgb, #ffffff 96%, var(--accent-green-soft) 4%)",
				color: darkMode ? "#ffffff" : "#0f172a",
				...transitionStyle,
			}}
		>
			{/* Sync sidebar + rest of UI: same duration/ease everywhere (theme-related props only). */}
			<style>{`
				/* Shared layout variables */
				[data-page="main"] {
					/* Matches MainContent wrapper padding: p-4 (16px), sm:p-5 (20px) */
					--kl-content-pad: 16px;
				}
				@media (min-width: 640px) {
					[data-page="main"] { --kl-content-pad: 20px; }
				}

				/* ===== Dynamic accent glow (sidebar + content) ===== */
				[data-page="main"] aside[aria-label="Main sidebar"],
				[data-page="main"] main[aria-label="Main content"] {
					position: relative;
					overflow: hidden;
					isolation: isolate;
				}

				[data-page="main"] aside[aria-label="Main sidebar"]::before,
				[data-page="main"] main[aria-label="Main content"]::before {
					content: "";
					position: absolute;
					inset: -2px;
					pointer-events: none;
					z-index: 0;
					filter: blur(22px) saturate(1.35);
					opacity: 0.92;
					transform: translate3d(0,0,0);
					animation: klPaneDrift 16s var(--theme-ease) infinite;
					background:
						radial-gradient(
							680px 260px at 8% 0%,
							color-mix(in srgb, var(--accent-green) 44%, transparent),
							transparent 62%
						),
						radial-gradient(
							720px 260px at 92% 14%,
							color-mix(in srgb, var(--accent-green-soft) 34%, transparent),
							transparent 64%
						),
						radial-gradient(
							520px 280px at 18% 100%,
							color-mix(in srgb, color-mix(in srgb, var(--accent-green) 70%, var(--accent-green-soft)) 26%, transparent),
							transparent 64%
						);
				}

				/* Theme-tune the glow so it stays colorful (not too dark/light). */
				[data-page="main"][data-theme="dark"] aside[aria-label="Main sidebar"]::before,
				[data-page="main"][data-theme="dark"] main[aria-label="Main content"]::before {
					opacity: 0.98;
					filter: blur(22px) saturate(1.45);
				}
				[data-page="main"][data-theme="light"] aside[aria-label="Main sidebar"]::before,
				[data-page="main"][data-theme="light"] main[aria-label="Main content"]::before {
					opacity: 0.92;
					filter: blur(16px) saturate(1.65);
				}

				/* Light mode: gently tint panel surfaces so the motive isn't "too white" */
				[data-page="main"][data-theme="light"] aside[aria-label="Main sidebar"],
				[data-page="main"][data-theme="light"] main[aria-label="Main content"] {
					background-color: color-mix(in srgb, #ffffff 93%, var(--accent-green-soft) 7%) !important;
					border-color: var(--kl-content-border-strong) !important;
					border-width: 2px !important;
				}

				/* Strong borders: sidebar and content can differ slightly */
				[data-page="main"] aside[aria-label="Main sidebar"] {
					border-width: 2px !important;
					border-color: var(--kl-sidebar-border-strong) !important;
				}
				[data-page="main"] main[aria-label="Main content"] {
					border-width: 2px !important;
					border-color: var(--kl-content-border-strong) !important;
				}

				[data-page="main"][data-theme="light"] aside[aria-label="Main sidebar"]::before,
				[data-page="main"][data-theme="light"] main[aria-label="Main content"]::before {
					background:
						radial-gradient(
							680px 260px at 10% 0%,
							color-mix(in srgb, var(--accent-green) 52%, transparent),
							transparent 62%
						),
						radial-gradient(
							760px 300px at 96% 18%,
							color-mix(in srgb, var(--accent-green-soft) 44%, transparent),
							transparent 66%
						),
						radial-gradient(
							560px 320px at 20% 102%,
							color-mix(in srgb, color-mix(in srgb, var(--accent-green) 72%, var(--accent-green-soft)) 34%, transparent),
							transparent 66%
						);
				}

				/* Slightly different feel between panels */
				[data-page="main"] aside[aria-label="Main sidebar"]::before {
					animation-duration: 18s;
					filter: blur(24px) saturate(1.35);
				}
				[data-page="main"] main[aria-label="Main content"]::before {
					animation-duration: 14s;
					filter: blur(20px) saturate(1.35);
				}

				@keyframes klPaneDrift {
					0% {
						transform: translate3d(0px, 0px, 0) scale(1);
					}
					50% {
						transform: translate3d(14px, -10px, 0) scale(1.02);
					}
					100% {
						transform: translate3d(0px, 0px, 0) scale(1);
					}
				}

				@media (prefers-reduced-motion: reduce) {
					[data-page="main"] aside[aria-label="Main sidebar"]::before,
					[data-page="main"] main[aria-label="Main content"]::before {
						animation: none !important;
					}
				}

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
