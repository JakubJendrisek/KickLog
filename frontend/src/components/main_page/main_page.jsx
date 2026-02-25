import React, { useEffect, useMemo, useState } from "react";
import MainSidebar from "./main_sidebar.jsx";
import MainContent from "./main_content.jsx";

const THEME_STORAGE_KEY = "kicklog.theme.v1";
const DEFAULT_THEME = { primary: "#16a34a", secondary: "#bbf7d0" };

const TEXT_STORAGE_KEY = "kicklog.text.v1";
const DEFAULT_TEXT_PREFS = { contrast: "normal", font: "default" }; // contrast: normal|high, font: default|mono

function safeParseJSON(raw, fallback) {
	try {
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function normalizeHex(value, fallback) {
	const v = String(value || "").trim();
	return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function hexToRgbTriplet(hex, fallbackTriplet) {
	const v = normalizeHex(hex, "");
	if (!v) return fallbackTriplet;
	const r = Number.parseInt(v.slice(1, 3), 16);
	const g = Number.parseInt(v.slice(3, 5), 16);
	const b = Number.parseInt(v.slice(5, 7), 16);
	if (![r, g, b].every((n) => Number.isFinite(n))) return fallbackTriplet;
	return `${r},${g},${b}`;
}

function readStoredTheme() {
	try {
		const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
		const parsed = safeParseJSON(raw, null);
		if (!parsed || typeof parsed !== "object") return DEFAULT_THEME;
		return {
			primary: normalizeHex(parsed.primary, DEFAULT_THEME.primary),
			secondary: normalizeHex(parsed.secondary, DEFAULT_THEME.secondary),
		};
	} catch {
		return DEFAULT_THEME;
	}
}

function readStoredTextPrefs() {
	try {
		const raw = window.localStorage.getItem(TEXT_STORAGE_KEY);
		const parsed = safeParseJSON(raw, null);
		if (!parsed || typeof parsed !== "object") return DEFAULT_TEXT_PREFS;
		const contrast = parsed.contrast === "high" ? "high" : "normal";
		const font = parsed.font === "mono" ? "mono" : "default";
		return { contrast, font };
	} catch {
		return DEFAULT_TEXT_PREFS;
	}
}

export default function MainPage() {
	// Layout shell: sidebar + empty content area (content comes later)
	const [darkMode, setDarkMode] = useState(false);
	const [activeKey, setActiveKey] = useState("diary");
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [lastNonDiaryKey, setLastNonDiaryKey] = useState("profile");
	const [theme, setTheme] = useState(() => readStoredTheme());
	const [textPrefs, setTextPrefs] = useState(() => readStoredTextPrefs());

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

	useEffect(() => {
		const refreshTheme = () => setTheme(readStoredTheme());
		refreshTheme();
		window.addEventListener("kicklog:themeChanged", refreshTheme);
		window.addEventListener("storage", refreshTheme);
		return () => {
			window.removeEventListener("kicklog:themeChanged", refreshTheme);
			window.removeEventListener("storage", refreshTheme);
		};
	}, []);

	useEffect(() => {
		const refreshText = () => setTextPrefs(readStoredTextPrefs());
		refreshText();
		window.addEventListener("kicklog:textChanged", refreshText);
		window.addEventListener("storage", refreshText);
		return () => {
			window.removeEventListener("kicklog:textChanged", refreshText);
			window.removeEventListener("storage", refreshText);
		};
	}, []);

	useEffect(() => {
		try {
			const root = document.documentElement;
			root.style.setProperty("--accent-green", theme.primary);
			root.style.setProperty("--accent-green-soft", theme.secondary);
			root.style.setProperty("--accent-green-rgb", hexToRgbTriplet(theme.primary, "22,163,74"));
			root.style.setProperty("--accent-green-soft-rgb", hexToRgbTriplet(theme.secondary, "187,247,208"));
		} catch {
			// ignore
		}
	}, [theme]);

	const transitionStyle = {
		transitionProperty: "background-color, color, border-color",
		transitionDuration: "var(--theme-dur)",
		transitionTimingFunction: "var(--theme-ease)",
		willChange: "background-color, color",
	};

	return (
		<div
			data-page="main"
			data-theme={darkMode ? "dark" : "light"}
			data-contrast={textPrefs?.contrast === "high" ? "high" : "normal"}
			data-font={textPrefs?.font || "default"}
			data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
			className={darkMode ? "min-h-screen bg-slate-950 text-white" : "min-h-screen bg-white text-slate-900"}
			style={{
				// Single source of truth for theme animation timing:
				"--theme-dur": "820ms", // was 320ms
				"--theme-ease": "cubic-bezier(0.2, 0.8, 0.2, 1)",
				"--collapse-dur": "320ms", // NEW: sidebar collapse/expand animation speed
				"--collapse-ease": "var(--theme-ease)",
				"--accent-green": theme.primary, // strong
				"--accent-green-soft": theme.secondary, // soft
				// Strong borders for panels + active item glow source
				"--kl-sidebar-border-strong": darkMode
					? "color-mix(in srgb, rgba(255,255,255,0.14) 74%, var(--accent-green-soft) 26%)"
					: "color-mix(in srgb, #e5e7eb 68%, var(--accent-green) 32%)",
				"--kl-content-border-strong": darkMode
					? "color-mix(in srgb, rgba(255,255,255,0.12) 70%, var(--accent-green) 30%)"
					: "color-mix(in srgb, #e5e7eb 70%, var(--accent-green-soft) 30%)",
				"--kl-active-accent": "var(--kl-content-border-strong)",
				"--kl-bg": darkMode
					? "color-mix(in srgb, #0b1220 90%, var(--accent-green) 10%)"
					: "color-mix(in srgb, #ffffff 96%, var(--accent-green-soft) 4%)",
				"--kl-fg": darkMode ? "#ffffff" : "#0f172a",
				"--kl-fg-rgb": darkMode ? "255,255,255" : "15,23,42",
				// Contrast tuning: keep High noticeably crisper, and make Normal clearly softer.
				"--kl-text-a": textPrefs?.contrast === "high" ? "0.99" : "0.84",
				"--kl-text-strong-a": textPrefs?.contrast === "high" ? "1" : "0.93",
				"--kl-text-muted-a": textPrefs?.contrast === "high" ? "0.90" : "0.58",
				"--kl-text": "rgba(var(--kl-fg-rgb), var(--kl-text-a))",
				"--kl-text-strong": "rgba(var(--kl-fg-rgb), var(--kl-text-strong-a))",
				"--kl-text-muted": "rgba(var(--kl-fg-rgb), var(--kl-text-muted-a))",
				"--kl-font-family":
					textPrefs?.font === "mono"
						? 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
						: "inherit",
				minHeight: "100vh",
				background: "var(--kl-bg)",
				color: "var(--kl-text)",
				fontFamily: "var(--kl-font-family)",
				...transitionStyle,
			}}
		>
			{/* Sync sidebar + rest of UI: same duration/ease everywhere (theme-related props only). */}
			<style>{`
				[data-page="main"] {
					font-family: var(--kl-font-family, inherit);
				}
				[data-page="main"][data-font="mono"] {
					font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
				}
				[data-page="main"][data-contrast="high"] {
					text-rendering: geometricPrecision;
				}
				[data-page="main"] .kl-muted {
					color: var(--kl-text-muted);
				}

				/* Windows/Browser native <select> popup fix (dark mode): keep options readable */
				[data-page="main"][data-theme="dark"] select {
					color-scheme: light;
				}
				[data-page="main"][data-theme="dark"] select option,
				[data-page="main"][data-theme="dark"] select optgroup {
					color: rgba(15,23,42,0.92) !important;
					background: rgba(255,255,255,0.98) !important;
				}

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
				[data-page="main"] main[aria-label="Main content"],
				[data-page="main"] main[aria-label="Main content"] {
					transition-timing-function: var(--theme-ease) !important;
				}

				/* Theme transition: animate only the large containers (much cheaper than animating every child). */
				[data-page="main"] aside[aria-label="Main sidebar"],
				[data-page="main"] main[aria-label="Main content"] {
					transition-property: background-color, color, border-color !important;
					transition-duration: var(--theme-dur) !important;
					transition-timing-function: var(--theme-ease) !important;
				}

				/* Sidebar CONTAINER: width/transform use collapse duration; colors use theme duration */
				[data-page="main"] aside[aria-label="Main sidebar"] {
					transition-property: width, transform, background-color, color, border-color !important;
					transition-duration:
						var(--collapse-dur),
						var(--collapse-dur),
						var(--theme-dur),
						var(--theme-dur),
						var(--theme-dur) !important;
					transition-timing-function:
						var(--collapse-ease),
						var(--collapse-ease),
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
					[data-page="main"] main[aria-label="Main content"] {
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
