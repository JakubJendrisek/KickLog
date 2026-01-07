import React, { useEffect, useRef, useState } from "react";
import {
	FaUser,
	FaBook,
	FaFolder,
	FaCalendar,
	FaShieldAlt,
	FaTrash,
	FaTimes,
} from "react-icons/fa";

// correct location: frontend/src/images/KickLog-logo-green.png
import KickLogLogoGreen from "../../images/KickLog-logo-green.png";

function SidebarRow({ icon: Icon, label, onClick, active, darkMode, collapsed }) {
	const activeGlowStyle = active
		? {
			boxShadow: darkMode
				? "0 0 0 2px color-mix(in srgb, var(--kl-active-accent, var(--accent-green-soft)) 55%, transparent), 0 14px 34px rgba(0,0,0,0.28)"
				: "0 0 0 2px color-mix(in srgb, var(--kl-active-accent, var(--accent-green)) 55%, transparent), 0 14px 34px rgba(15,23,42,0.10)",
		}
		: undefined;

	return (
		<button
			type="button"
			onClick={onClick}
			style={activeGlowStyle}
			className={[
				// keep layout identical to avoid icon "jump" on collapse/expand
				"w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
				darkMode
					? [
						"text-slate-200 hover:bg-white/5 hover:text-white",
						active ? "bg-white/5 text-white" : "",
					].join(" ")
					: [
						"text-slate-900 hover:bg-slate-50",
						active ? "bg-slate-50" : "",
					].join(" "),
			].join(" ")}
			aria-label={collapsed ? label : undefined}
			title={collapsed ? label : undefined}
		>
			{/* fixed icon box => icon never shifts */}
			<span
				className={[
					"w-6 shrink-0 flex items-center justify-center",
					"transition-[transform,color]",
					active ? "scale-[1.06]" : "scale-100",
				].join(" ")}
			>
				<Icon className="text-current transition-colors" size={18} />
			</span>

			{/* always render; animate show/hide */}
			<span
				className={[
					"sidebar-label overflow-hidden whitespace-nowrap text-[13px] font-semibold",
					"transition-[max-width,opacity,transform,color]",
					collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100",
					active ? "translate-x-0.5" : "translate-x-0",
				].join(" ")}
			>
				{label}
			</span>

			{collapsed && <span className="sr-only">{label}</span>}
		</button>
	);
}

export default function MainSidebar({
	darkMode,
	onToggleDarkMode,
	activeKey,
	onSelect,
	open,
	setOpen,
	collapsed = false,
	onToggleCollapsed,
}) {
	const [hoveredKey, setHoveredKey] = useState(null);

	const menuItems = [
		{ key: "profile", icon: FaUser, label: "Profile" },
		{ key: "diary", icon: FaBook, label: "Diary" },
		{ key: "folder", icon: FaFolder, label: "Diary Folder" },
		{ key: "schedule", icon: FaCalendar, label: "Schedule" },
		{ key: "privacy", icon: FaShieldAlt, label: "Privacy Policy" },
		{ key: "bin", icon: FaTrash, label: "Bin" },
	];

	const isControlled = typeof setOpen === "function";
	const isOpen = open ?? true;

	// Tailwind detection
	const twProbeRef = useRef(null);
	const [twReady, setTwReady] = useState(false);
	useEffect(() => {
		const el = twProbeRef.current;
		if (!el) return;
		setTwReady(window.getComputedStyle(el).display === "none");
	}, []);

	const isCollapsed = !!collapsed;

	// tiny arrow icon (avoids extra deps)
	const ArrowLeftIcon = ({ className, size = 16 }) => (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			className={className}
			style={{ display: "block" }}
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M15 18l-6-6 6-6" />
		</svg>
	);

	// ===== Fallback (no Tailwind loaded) – match screenshot =====
	if (!twReady) {
		const expandedWidth = 280;
		const collapsedWidth = 72;
		const gutter = 18;

		const padTop = 18;
		const logoSize = 44;
		const chevronSize = 18;

		const wrapperStyle = {
			width: isCollapsed ? collapsedWidth : expandedWidth,
			height: isControlled ? "100vh" : `calc(100vh - ${gutter * 2}px)`,
			minHeight: isControlled ? "100vh" : `calc(100vh - ${gutter * 2}px)`,
			margin: isControlled ? 0 : `${gutter}px 0 ${gutter}px ${gutter}px`,
			position: isControlled ? "fixed" : "relative",
			top: isControlled ? 0 : undefined,
			bottom: isControlled ? 0 : undefined,
			left: isControlled ? 0 : undefined,
			transform: isControlled ? (isOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
			transition: [
				"transform var(--collapse-dur, 320ms) var(--collapse-ease, ease)",
				"width var(--collapse-dur, 320ms) var(--collapse-ease, ease)",
			].join(", "),
			zIndex: 50,
		};

		const asideStyle = {
			width: "100%",
			height: "100%",
			background: darkMode ? "#0b1220" : "#ffffff",
			color: darkMode ? "#ffffff" : "#0f172a",
			border: darkMode
				? "2px solid color-mix(in srgb, rgba(255,255,255,0.14) 74%, var(--accent-green-soft) 26%)"
				: "2px solid color-mix(in srgb, #e5e7eb 68%, var(--accent-green) 32%)",
			borderRadius: isControlled ? 0 : 24,
			boxShadow: darkMode ? "0 18px 48px rgba(0,0,0,0.35)" : "0 18px 48px rgba(15,23,42,0.08)",
			boxSizing: "border-box",
			overflow: "hidden",
			padding: isCollapsed ? `${padTop}px 10px 14px` : `${padTop}px 18px 14px`,
			transition: [
				"background-color var(--theme-dur, 820ms) var(--theme-ease, ease)",
				"color var(--theme-dur, 820ms) var(--theme-ease, ease)",
				"border-color var(--theme-dur, 820ms) var(--theme-ease, ease)",
				"box-shadow var(--theme-dur, 820ms) var(--theme-ease, ease)",
			].join(", "),
		};

		const overlayStyle = {
			position: "fixed",
			inset: 0,
			background: "rgba(15, 23, 42, 0.35)",
			zIndex: 40,
			opacity: isOpen ? 1 : 0,
			pointerEvents: isOpen ? "auto" : "none",
			transition: "opacity var(--collapse-dur, 320ms) var(--collapse-ease, ease)",
		};

		const logoWrap = {
			width: 44,
			height: 44,
			borderRadius: 999,
			padding: 0, // changed (was 4)
			display: "grid",
			placeItems: "center",
			overflow: "hidden",
			background: darkMode ? "#0b1220" : "#ffffff",
			border: darkMode ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e5e7eb",
			boxSizing: "border-box",
			flex: "0 0 auto",
		};

		const logoInner = {
			width: "100%",
			height: "100%",
			display: "block",
			objectFit: "cover", // changed (was contain)
			objectPosition: "center",
		};

		// keep item layout identical; only hide label
		const itemBtn = (active, hovered) => ({
			width: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "flex-start", // always
			gap: 10, // always
			padding: "8px 10px", // always
			borderRadius: 14,
			border: "none",
			background: (active || hovered) ? (darkMode ? "rgba(255,255,255,0.08)" : "#f3f4f6") : "transparent",
			boxShadow: active
				? darkMode
					? "0 0 0 2px color-mix(in srgb, var(--kl-active-accent, var(--accent-green-soft)) 55%, transparent), 0 12px 28px rgba(0,0,0,0.28)"
					: "0 0 0 2px color-mix(in srgb, var(--kl-active-accent, var(--accent-green)) 55%, transparent), 0 12px 28px rgba(15,23,42,0.10)"
				: "none",
			color: darkMode ? "#fff" : "#111827",
			cursor: "pointer",
			textAlign: "left",
		});

		const itemIconStyle = (active) => ({
			width: 24,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			flex: "0 0 auto",
			transition: "transform var(--collapse-dur, 320ms) var(--collapse-ease, ease)",
			transform: active ? "scale(1.06)" : "scale(1)",
		});

		const itemLabelStyle = (collapsedNow, active) => ({
			fontWeight: 700,
			fontSize: 13,
			...labelStyle(collapsedNow),
			transition:
				"max-width var(--collapse-dur, 320ms) var(--theme-ease, ease), opacity var(--collapse-dur, 320ms) var(--theme-ease, ease), transform var(--collapse-dur, 320ms) var(--collapse-ease, ease)",
			transform: active ? "translateX(2px)" : "translateX(0)",
		});

		const labelStyle = (collapsedNow) => ({
			display: "inline-block",
			overflow: "hidden",
			whiteSpace: "nowrap",
			maxWidth: collapsedNow ? 0 : 180,
			opacity: collapsedNow ? 0 : 1,
			// use the same vars as the page
			transition:
				"max-width var(--collapse-dur, 320ms) var(--theme-ease, ease), opacity var(--collapse-dur, 320ms) var(--theme-ease, ease)",
		});

		// tighter row sizing to free header space
		const footerBtn = {
			width: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: isCollapsed ? "center" : "space-between",
			gap: 12,
			padding: isCollapsed ? "8px 0" : "10px 10px",
			borderRadius: 14,
			border: "none",
			background: "transparent",
			cursor: "pointer",
			color: darkMode ? "#fff" : "#111827",
			marginTop: 10,
		};

		// reverse switch track colors: dark => soft, light => strong
		const switchTrack = {
			width: 44,
			height: 26,
			borderRadius: 999,
			background: darkMode ? "#bbf7d0" : "#16a34a", // was darkMode ? "#16a34a" : "#bbf7d0"
			position: "relative",
			flex: "0 0 auto",
			boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
		};

		const switchKnob = {
			width: 22,
			height: 22,
			borderRadius: 999,
			background: "#0f172a",
			position: "absolute",
			top: 2,
			left: darkMode ? 20 : 2,
			transition: "left var(--theme-dur, 820ms) var(--theme-ease, ease)", // was 200ms
		};

		const chevronBtnStyle = {
			position: "absolute",
			top: padTop + (logoSize - chevronSize) / 2, // centered to brand row
			right: 0,
			transform: isCollapsed ? "translateX(calc(50% + var(--kl-content-pad, 16px)))" : "translateX(50%)",
			width: chevronSize,
			height: chevronSize,
			borderRadius: 999,
			border: "1px solid rgba(0,0,0,0.10)",
			// reverse button colors: dark => soft, light => strong
			background: darkMode
				? "var(--accent-green-soft, #bbf7d0)"
				: "var(--accent-green, #16a34a)",
			color: darkMode ? "#0f172a" : "#ffffff", // keep arrow readable
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			lineHeight: 0, // NEW: removes any text-line centering drift
			boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
			cursor: "pointer",
			zIndex: 60,
		};

		// Center brand content horizontally (expanded & collapsed)
		const brandRow = {
			display: "flex",
			alignItems: "center",
			gap: isCollapsed ? 0 : 10,
			justifyContent: "center",
			width: "100%",
			minWidth: 0,
		};

		return (
			<>
				<span ref={twProbeRef} className="hidden" />

				{isControlled && <div style={overlayStyle} onClick={() => setOpen(false)} />}

				<div style={wrapperStyle}>
					<aside aria-label="Main sidebar" style={asideStyle}>
						<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
						{/* header */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
							<div style={brandRow}>
								<div style={logoWrap}>
									<img src={KickLogLogoGreen} alt="KickLog" style={logoInner} />
								</div>

								{/* always render; animate */}
								<span
									className="sidebar-title"
									style={{
										fontWeight: 900,
										fontSize: 28,
										lineHeight: 1.05,
										...labelStyle(isCollapsed),
										minWidth: 0,
										maxWidth: isCollapsed ? 0 : 220,
									}}
								>
									KickLog
								</span>
							</div>

							{isControlled && (
								<button
									type="button"
									onClick={() => setOpen(false)}
									aria-label="Close sidebar"
									style={{
										// NEW: absolute so it doesn't affect centering
										position: "absolute",
										right: 0,
										top: "50%",
										transform: "translateY(-50%)",
										border: "none",
										background: "transparent",
										cursor: "pointer",
										padding: 8,
									}}
								>
									<FaTimes size={16} />
								</button>
							)}
						</div>

						<nav style={{ marginTop: 14, display: "grid", gap: 6, flex: 1 }}>
							{menuItems.map((item) => {
								const isActive = activeKey === item.key;
								const isHovered = hoveredKey === item.key;
								return (
									<button
										key={item.key}
										type="button"
										onMouseEnter={() => setHoveredKey(item.key)}
										onMouseLeave={() => setHoveredKey(null)}
										onClick={() => {
											onSelect?.(item.key);
											setOpen?.(false);
										}}
										style={itemBtn(isActive, isHovered)}
										aria-label={isCollapsed ? item.label : undefined}
										title={isCollapsed ? item.label : undefined}
									>
											<span style={itemIconStyle(isActive)}>
											<item.icon size={18} />
										</span>

											<span className="sidebar-label" style={itemLabelStyle(isCollapsed, isActive)}>
											{item.label}
										</span>
									</button>
								);
							})}
						</nav>

						<button
							type="button"
							onClick={onToggleDarkMode}
							aria-label="Toggle dark mode"
							aria-pressed={!!darkMode}
							style={footerBtn}
							title={isCollapsed ? "Dark mode" : undefined}
						>
							<div style={{ display: "flex", alignItems: "center", gap: isCollapsed ? 0 : 12 }}>
								<span style={switchTrack}>
									<span style={switchKnob} />
								</span>

								{/* always render; animate */}
								<span className="sidebar-dark-label" style={{ fontWeight: 700, fontSize: 15, ...labelStyle(isCollapsed), maxWidth: isCollapsed ? 0 : 140 }}>
									Dark mode
								</span>
							</div>
						</button>
					</div>
					</aside>

					{/* toggle collapse (outside panel so it can't be clipped) */}
					<button
						type="button"
						aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						onClick={() => onToggleCollapsed?.(!isCollapsed)}
						style={chevronBtnStyle}
					>
						<ArrowLeftIcon size={16} className={isCollapsed ? "" : ""} />
						<span style={{ display: "none" }} />
					</button>
				</div>

				{/* rotate arrow when collapsed (simple, no CSS file): */}
				<style>{`
					/* noop for bundlers that allow it; safe if ignored */
				`}</style>
			</>
		);
	}

	// ===== Tailwind version =====
	return (
		<>
			<span ref={twProbeRef} className="hidden" />

			{/* overlay only when controlled (mobile slide-over) */}
			{isControlled && (
				<div
					className={[
						"fixed inset-0 z-40 lg:hidden transition",
						darkMode ? "bg-black/60" : "bg-slate-900/30",
						isOpen ? "opacity-100" : "pointer-events-none opacity-0",
					].join(" ")}
					onClick={() => setOpen(false)}
				/>
			)}

			<div
				className={[
					"relative",
					"fixed inset-y-0 left-0 z-50 lg:static lg:z-auto",
					isCollapsed ? "w-16" : "w-[280px]",
					"rounded-none lg:rounded-[24px]",
					"lg:my-4 lg:ml-4",
					"lg:h-[calc(100vh-2rem)]",
					"transition-[width,transform] duration-300",
					isControlled
						? isOpen
							? "translate-x-0"
							: "-translate-x-full lg:translate-x-0"
						: "translate-x-0",
				].join(" ")}
			>
				<aside
					className={[
						"h-full w-full",
						"relative overflow-hidden isolate",
						darkMode
							? "bg-slate-950 text-white border border-white/10"
							: "bg-white text-slate-900 border border-slate-200",
						"rounded-none lg:rounded-[24px]",
						"lg:shadow-[0_18px_48px_rgba(15,23,42,0.10)]",
					].join(" ")}
					aria-label="Main sidebar"
				>
					<div
						className={[
							"relative z-[1] flex h-full flex-col pt-5 pb-4",
							isCollapsed ? "px-2" : "px-5",
						].join(" ")}
					>
						{/* Brand */}
						<div className="relative flex items-center justify-between">
							<div className={["w-full flex items-center justify-center min-w-0", isCollapsed ? "" : "gap-3"].join(" ")}>
								<div
									className={[
										"size-11 shrink-0 rounded-full overflow-hidden grid place-items-center border",
										darkMode ? "bg-slate-950 border-white/10" : "bg-white border-slate-200",
									].join(" ")}
								>
									<img src={KickLogLogoGreen} alt="KickLog" className="h-full w-full object-cover object-center" />
								</div>

								<div
									className={[
										"sidebar-title min-w-0 overflow-hidden whitespace-nowrap text-3xl font-extrabold tracking-tight",
										"transition-[max-width,opacity]",
										isCollapsed ? "max-w-0 opacity-0" : "max-w-[240px] opacity-100",
									].join(" ")}
								>
									KickLog
								</div>
							</div>

							{isControlled && (
								<button
									type="button"
									className={[
										"absolute right-0 top-1/2 -translate-y-1/2",
										"lg:hidden inline-flex items-center justify-center rounded-xl p-2 ring-1 transition",
										darkMode ? "text-slate-200 hover:bg-white/5 ring-white/10" : "text-slate-700 hover:bg-slate-100 ring-slate-200",
									].join(" ")}
									onClick={() => setOpen(false)}
									aria-label="Close sidebar"
								>
									<FaTimes size={16} />
								</button>
							)}
						</div>

						{/* Nav */}
						<nav className="mt-4 flex-1 space-y-1">
							{menuItems.map((item) => (
								<SidebarRow
									key={item.key}
									icon={item.icon}
									label={item.label}
									active={activeKey === item.key}
									darkMode={darkMode}
									collapsed={isCollapsed}
									onClick={() => {
										onSelect?.(item.key);
										setOpen?.(false);
									}}
								/>
							))}
						</nav>

						<button
							type="button"
							onClick={onToggleDarkMode}
							aria-label="Toggle dark mode"
							aria-pressed={!!darkMode}
							title={isCollapsed ? "Dark mode" : undefined}
							className={[
								"mt-2 w-full rounded-xl transition",
								isCollapsed ? "flex items-center justify-center px-0 py-2" : "flex items-center justify-between px-3 py-2",
								darkMode ? "hover:bg-white/5" : "hover:bg-slate-50",
							].join(" ")}
						>
							<div className={["flex items-center", isCollapsed ? "" : "gap-3"].join(" ")}>
								<span
									className={[
										"relative h-6 w-11 rounded-full transition",
										darkMode ? "bg-emerald-200" : "bg-emerald-600",
									].join(" ")}
								>
									<span
										className={[
											"absolute top-0.5 size-5 rounded-full transition-transform",
											"bg-slate-900",
											darkMode ? "translate-x-5" : "translate-x-0.5",
										].join(" ")}
									/>
								</span>

								<span
									className={[
										"sidebar-dark-label overflow-hidden whitespace-nowrap text-[15px] font-semibold",
										"transition-[max-width,opacity]",
										isCollapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100",
									].join(" ")}
								>
									Dark mode
								</span>
							</div>
						</button>
					</div>
				</aside>

				{/* toggle collapse (outside panel so it can't be clipped) */}
				<button
					type="button"
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					onClick={() => onToggleCollapsed?.(!isCollapsed)}
					className={[
						"absolute top-5 right-0 z-[60]",
						"flex items-center justify-center leading-none size-5 rounded-full shadow-lg",
						"ring-1 ring-black/10",
						darkMode ? "bg-emerald-200 text-slate-900" : "bg-emerald-600 text-white",
					].join(" ")}
					style={{
						transform: isCollapsed ? "translateX(calc(50% + var(--kl-content-pad, 16px)))" : "translateX(50%)",
					}}
				>
					<span className={isCollapsed ? "rotate-180" : ""}>
						<ArrowLeftIcon className="size-4" />
					</span>
				</button>
			</div>
		</>
	);
}
