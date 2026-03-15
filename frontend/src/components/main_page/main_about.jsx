import React, { useEffect, useMemo, useRef, useState } from "react";

const GlowGridContext = React.createContext(null);

function GlowGrid({ children, threshold = 80, className = "" }) {
	const cardsRef = useRef(new Set());
	const rafRef = useRef(0);
	const lastPointRef = useRef({ x: 0, y: 0 });

	const ctx = useMemo(() => {
		return {
			register(el) {
				if (!el) return () => {};
				cardsRef.current.add(el);
				return () => cardsRef.current.delete(el);
			},
		};
	}, []);

	const updateAll = (clientX, clientY) => {
		cardsRef.current.forEach((el) => {
			const rect = el.getBoundingClientRect();
			const x = clientX - rect.left;
			const y = clientY - rect.top;

			const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
			const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > threshold) {
				el.style.setProperty("--kl-ga", "0");
				return;
			}

			const clampedX = Math.max(0, Math.min(rect.width, x));
			const clampedY = Math.max(0, Math.min(rect.height, y));
			const glowAmount = Math.max(0, Math.min(1, 1 - dist / threshold));

			el.style.setProperty("--mx", `${clampedX}px`);
			el.style.setProperty("--my", `${clampedY}px`);
			el.style.setProperty("--kl-ga", glowAmount.toFixed(3));
		});
	};

	const handleMove = (e) => {
		lastPointRef.current = { x: e.clientX, y: e.clientY };
		if (rafRef.current) return;
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0;
			updateAll(lastPointRef.current.x, lastPointRef.current.y);
		});
	};

	const handleLeave = () => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = 0;
		}
		cardsRef.current.forEach((el) => {
			el.style.setProperty("--kl-ga", "0");
		});
	};

	return (
		<GlowGridContext.Provider value={ctx}>
			<div className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
				{children}
			</div>
		</GlowGridContext.Provider>
	);
}

function GlowCard({ className = "", children, ...props }) {
	const cardRef = useRef(null);
	const grid = React.useContext(GlowGridContext);

	useEffect(() => {
		if (!grid) return;
		const el = cardRef.current;
		if (!el) return;
		const unregister = grid.register(el);
		return () => {
			try {
				unregister?.();
			} catch {
				// no-op
			}
		};
	}, [grid]);

	return (
		<div ref={cardRef} className={`kl-about-card ${className}`.trim()} {...props}>
			{children}
		</div>
	);
}

function GlowTarget({ className = "", children, ...props }) {
	const targetRef = useRef(null);
	const grid = React.useContext(GlowGridContext);


	useEffect(() => {
		if (!grid) return;
		const el = targetRef.current;
		if (!el) return;
		const unregister = grid.register(el);
		return () => {
			try {
				unregister?.();
			} catch {
				// no-op
			}
		};
	}, [grid]);

	return (
		<div ref={targetRef} className={className} {...props}>
			{children}
		</div>
	);
}

// ─── Quote Carousel ──────────────────────────────────────────────────────────

const QUOTES_STORAGE_KEY = "kicklog.about.quotes.v1";

const DEFAULT_QUOTES = [
	"Discipline beats motivation.",
	"Small wins. Every day.",
	"You don’t need confidence — you need reps.",
	"Track the work. The results follow.",
	"Consistency is a superpower.",
];
const safeParseJSON = (raw, fallback) => {
	try {
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
};

function QuoteCarousel() {
	const quotes = useMemo(() => {
		try {
			const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
			const parsed = safeParseJSON(raw, null);
			if (Array.isArray(parsed)) {
				const cleaned = parsed.map((q) => String(q || "").trim()).filter(Boolean);
				if (cleaned.length) return cleaned;
			}
		} catch {
			// ignore
		}
		return DEFAULT_QUOTES;
	}, []);

	const [idx, setIdx] = useState(0);
	const [animKey, setAnimKey] = useState(0);
	const total = quotes.length;
	const quote = quotes[idx % Math.max(1, total)] || "";
	const dotCount = Math.min(total, 5);

	const goTo = (i) => {
		setIdx((i + total) % total);
		setAnimKey((k) => k + 1);
	};
	const next = () => goTo(idx + 1);

	return (
		<GlowCard className="kl-about-qcard" role="region" aria-label="Quote carousel">
			<div className="kl-about-qmarks">"</div>
			<div className="kl-about-qtext" key={`q-${idx}-${animKey}`}>{quote}</div>
			<div className="kl-about-qlabel">THE FOUNDATION OF THE ELITE.</div>
			<div className="kl-about-qdots">
				{Array.from({ length: dotCount }).map((_, i) => (
					<button
						key={i}
						type="button"
						className={`kl-about-qdot${i === idx % dotCount ? " is-active" : ""}`}
						onClick={() => goTo(i)}
						aria-label={`Quote ${i + 1}`}
					/>
				))}
				{total > 5 && (
					<button type="button" className="kl-about-qdot-next" onClick={next} aria-label="Next quote">›</button>
				)}
			</div>
		</GlowCard>
	);
}

// ─── Reflex Lab Card ──────────────────────────────────────────────────────────

function ReflexCard() {
	const [value, setValue] = useState("");
	const [flashed, setFlashed] = useState(false);
	const timerRef = useRef(0);

	const submit = () => {
		if (!value.trim()) return;
		setValue("");
		setFlashed(true);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setFlashed(false), 1400);
	};

	useEffect(() => () => clearTimeout(timerRef.current), []);

	return (
		<GlowCard className="kl-about-reflex">
			<div className="kl-about-reflex-badge">
				<span className="kl-about-reflex-dot" aria-hidden="true" />
				REFLEX LAB V2.0
			</div>
			<div className="kl-about-reflex-title">Simulate an Entry.</div>
			<div className="kl-about-reflex-sub">
				Experience the instant reward of self-analysis. One line is all it takes to start.
			</div>
			<div className="kl-about-reflex-row">
				<input
					className="kl-about-reflex-input"
					type="text"
					maxLength={120}
					placeholder="e.g. Scored a volley in today's match..."
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
					aria-label="Simulate a diary entry"
				/>
				<button
					type="button"
					className={`kl-about-reflex-btn${flashed ? " is-flash" : ""}`}
					onClick={submit}
					aria-label="Submit"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
					</svg>
				</button>
			</div>
		</GlowCard>
	);
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function MainAbout({ darkMode }) {
	return (
		<div className="kl-about-root" data-theme={darkMode ? "dark" : "light"}>
			<style>{`
				/* ── Animations ─────────────────────────────────────────── */
				@keyframes klAboutIn{0%{opacity:0;transform:translate3d(0,12px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
				@keyframes klAboutDrift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(10px,-8px,0) scale(1.02)}100%{transform:translate3d(0,0,0) scale(1)}}
				@keyframes klQFadeUp{0%{opacity:0;transform:translate3d(0,6px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
				@keyframes klReflexPulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb, var(--accent-green,#16a34a) 38%, transparent)}50%{box-shadow:0 0 0 6px transparent}}

				/* ── Root & Wrap ────────────────────────────────────────── */
				.kl-about-root{
					height:100%;width:100%;min-height:0;overflow:auto;box-sizing:border-box;padding:8px;
					--kl-about-card-bg:color-mix(in srgb,#f8fafc 92%,var(--accent-green-soft,#bbf7d0) 8%);
					--kl-about-card-border:color-mix(in srgb,var(--kl-fg,#0f172a) 10%,transparent);
					--kl-about-card-shadow:0 4px 24px rgba(15,23,42,.06);
					--kl-about-card-shadow-hover:0 12px 40px rgba(15,23,42,.12);
					--kl-about-hero-bg:color-mix(in srgb,#ffffff 86%,var(--accent-green-soft,#bbf7d0) 14%);
					--kl-about-hero-border:color-mix(in srgb,var(--accent-green,#16a34a) 22%,color-mix(in srgb,var(--kl-fg,#0f172a) 12%,transparent));
					--kl-about-hero-sub:color-mix(in srgb,var(--kl-fg,#0f172a) 62%,transparent);
					--kl-about-hero-metal-1:color-mix(in srgb,#ffffff 82%,var(--accent-green-soft,#bbf7d0) 18%);
					--kl-about-hero-metal-2:color-mix(in srgb,var(--kl-fg,#0f172a) 20%,#ffffff);
					--kl-about-hero-metal-3:color-mix(in srgb,#ffffff 74%,var(--accent-green,#16a34a) 26%);
					transition:background-color var(--theme-dur,820ms) var(--theme-ease,cubic-bezier(.2,.8,.2,1)),color var(--theme-dur,820ms) var(--theme-ease,cubic-bezier(.2,.8,.2,1));
				}
				.kl-about-root[data-theme="light"]{color-scheme:light}
				.kl-about-root[data-theme="dark"]{
					color-scheme:dark;
					--kl-about-card-bg:rgba(255,255,255,0.055);
					--kl-about-card-border:rgba(255,255,255,0.095);
					--kl-about-card-shadow:0 4px 24px rgba(0,0,0,.32);
					--kl-about-card-shadow-hover:0 12px 40px rgba(0,0,0,.50);
					--kl-about-hero-bg:rgba(255,255,255,0.07);
					--kl-about-hero-border:rgba(255,255,255,0.11);
					--kl-about-hero-sub:rgba(255,255,255,.62);
					--kl-about-hero-metal-1:#f1f5f9;
					--kl-about-hero-metal-2:#94a3b8;
					--kl-about-hero-metal-3:#e2e8f0;
				}
				.kl-about-wrap{width:min(100%,980px);margin:0 auto;padding:6px 6px 20px;display:flex;flex-direction:column;gap:10px}

				/* ── Base card ──────────────────────────────────────────── */
				.kl-about-card{
					--mx:50%;--my:50%;--kl-ga:0;
					border-radius:22px;padding:16px;
					border:1px solid var(--kl-about-card-border);
					background:var(--kl-about-card-bg);
					box-shadow:var(--kl-about-card-shadow);
					position:relative;isolation:isolate;overflow:hidden;transform:translateZ(0);
					transition:transform 420ms cubic-bezier(.2,.8,.2,1),box-shadow 420ms cubic-bezier(.2,.8,.2,1),border-color 420ms cubic-bezier(.2,.8,.2,1);
				}
				.kl-about-card>*{position:relative;z-index:1}
				.kl-about-card::before{
					content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;
					background:radial-gradient(180px circle at var(--mx) var(--my),color-mix(in srgb,var(--accent-green,#16a34a) 55%,#fff) 0%,transparent 60%);
					opacity:calc(var(--kl-ga)*1);transition:opacity 240ms;pointer-events:none;z-index:0;
					-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
					-webkit-mask-composite:xor;mask-composite:exclude;
				}
				.kl-about-card:hover{transform:translateY(-2px);box-shadow:var(--kl-about-card-shadow-hover)}

				/* ── Hero ───────────────────────────────────────────────── */
				.kl-about-hero{
					border-radius:26px;padding:26px 24px 22px;
					border:1px solid var(--kl-about-hero-border);
					background:var(--kl-about-hero-bg);
					position:relative;overflow:hidden;isolation:isolate;
					animation:klAboutIn 700ms cubic-bezier(.2,.8,.2,1) both;
				}
				.kl-about-hero::before{
					content:"";position:absolute;inset:-4px;z-index:0;pointer-events:none;
					opacity:.55;filter:blur(22px) saturate(1.2);
					animation:klAboutDrift 18s ease-in-out infinite;
					background:
						radial-gradient(600px 220px at 5% 0%,color-mix(in srgb,var(--accent-green,#16a34a) 36%,transparent),transparent 60%),
						radial-gradient(500px 200px at 95% 30%,color-mix(in srgb,var(--accent-green-soft,#bbf7d0) 28%,transparent),transparent 62%);
				}
				.kl-about-hero::after{
					content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;
					background:radial-gradient(180px circle at var(--mx) var(--my),color-mix(in srgb,var(--accent-green,#16a34a) 55%,#fff) 0%,transparent 60%);
					opacity:calc(var(--kl-ga)*1);transition:opacity 240ms;pointer-events:none;z-index:0;
					-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
					-webkit-mask-composite:xor;mask-composite:exclude;
				}
				.kl-about-hero-inner{position:relative;z-index:1;text-align:center}
				.kl-about-hero-badge{
					display:inline-flex;align-items:center;gap:6px;
					border:1.5px solid color-mix(in srgb,var(--accent-green,#16a34a) 55%,transparent);
					border-radius:999px;padding:4px 12px;
					font-weight:900;font-size:11px;letter-spacing:.14em;color:var(--accent-green,#16a34a);
					background:color-mix(in srgb,var(--accent-green,#16a34a) 8%,transparent);
					margin-bottom:16px;
				}
				.kl-about-hero-title{
					font-weight:950;font-size:clamp(34px,6vw,64px);line-height:1.05;letter-spacing:-.03em;
					background:linear-gradient(175deg,var(--kl-about-hero-metal-1) 18%,var(--kl-about-hero-metal-2) 52%,var(--kl-about-hero-metal-3) 82%);
					-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
					text-shadow:none;
				}
				.kl-about-hero-sub{
					margin-top:12px;font-weight:700;font-size:15px;line-height:1.65;
					color:var(--kl-about-hero-sub);max-width:52ch;margin-left:auto;margin-right:auto;
				}

				/* ── Bento row 1 ────────────────────────────────────────── */
				.kl-about-bento{display:grid;grid-template-columns:1fr;gap:10px}
				@media(min-width:740px){.kl-about-bento{grid-template-columns:1.1fr .9fr}}

				/* Elevate card */
				.kl-about-elevate{display:flex;flex-direction:column;justify-content:space-between;min-height:210px}
				.kl-about-icons{display:flex;gap:8px;margin-bottom:14px}
				.kl-about-icon-chip{
					width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;
					border:1px solid color-mix(in srgb,var(--kl-fg,#0f172a) 10%,transparent);
					background:color-mix(in srgb,#fff 86%,var(--accent-green-soft,#bbf7d0) 14%);
					color:color-mix(in srgb,var(--accent-green,#16a34a) 70%,var(--kl-fg,#0f172a));
				}
				.kl-about-root[data-theme="dark"] .kl-about-icon-chip{
					background:color-mix(in srgb,var(--kl-bg,#0b1220) 70%,var(--accent-green,#16a34a) 12%);
					border-color:color-mix(in srgb,var(--kl-fg,#fff) 12%,transparent);
					color:color-mix(in srgb,var(--accent-green-soft,#bbf7d0) 80%,#fff);
				}
				.kl-about-elevate-title{
					font-weight:950;font-size:clamp(22px,3.5vw,32px);line-height:1.12;letter-spacing:-.02em;
					color:color-mix(in srgb,var(--kl-fg,#0f172a) 94%,transparent);
					flex:1;margin:4px 0 10px;
				}
				.kl-about-elevate-sub{font-size:13px;font-weight:700;line-height:1.6;color:color-mix(in srgb,var(--kl-fg,#0f172a) 58%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-elevate-sub{color:color-mix(in srgb,var(--kl-fg,#fff) 58%,transparent)}
				.kl-about-version{
					margin-top:12px;display:inline-flex;align-items:center;gap:6px;
					font-size:11px;font-weight:900;letter-spacing:.1em;
					color:color-mix(in srgb,var(--accent-green,#16a34a) 70%,var(--kl-fg,#0f172a));
				}
				.kl-about-version-dot{
					width:7px;height:7px;border-radius:50%;
					background:var(--accent-green,#16a34a);
					animation:klReflexPulse 2.4s ease-in-out infinite;
				}

				/* Right sub-column */
				.kl-about-bento-right{display:flex;flex-direction:column;gap:10px}

				/* Reflex card */
				.kl-about-reflex{display:flex;flex-direction:column;gap:6px}
				.kl-about-reflex-badge{
					display:inline-flex;align-items:center;gap:6px;
					font-size:11px;font-weight:900;letter-spacing:.12em;
					color:color-mix(in srgb,var(--accent-green,#16a34a) 72%,var(--kl-fg,#0f172a));
				}
				.kl-about-root[data-theme="dark"] .kl-about-reflex-badge{color:color-mix(in srgb,var(--accent-green-soft,#bbf7d0) 80%,#fff)}
				.kl-about-reflex-dot{
					width:7px;height:7px;border-radius:50%;background:var(--accent-green,#16a34a);
					animation:klReflexPulse 2.4s ease-in-out infinite;
				}
				.kl-about-reflex-title{font-weight:950;font-size:19px;letter-spacing:-.01em;color:color-mix(in srgb,var(--kl-fg,#0f172a) 92%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-reflex-title{color:color-mix(in srgb,var(--kl-fg,#fff) 92%,transparent)}
				.kl-about-reflex-sub{font-size:12.5px;font-weight:700;line-height:1.55;color:color-mix(in srgb,var(--kl-fg,#0f172a) 52%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-reflex-sub{color:color-mix(in srgb,var(--kl-fg,#fff) 52%,transparent)}
				.kl-about-reflex-row{display:flex;gap:8px;margin-top:4px}
				.kl-about-reflex-input{
					flex:1;min-width:0;border-radius:12px;padding:9px 12px;font-size:13px;font-weight:700;
					border:1px solid color-mix(in srgb,var(--kl-fg,#0f172a) 12%,transparent);
					background:color-mix(in srgb,#fff 90%,var(--accent-green-soft,#bbf7d0) 10%);
					color:color-mix(in srgb,var(--kl-fg,#0f172a) 90%,transparent);
					outline:none;transition:border-color 200ms,box-shadow 200ms;
				}
				.kl-about-root[data-theme="dark"] .kl-about-reflex-input{
					background:color-mix(in srgb,var(--kl-bg,#0b1220) 70%,var(--accent-green,#16a34a) 8%);
					border-color:color-mix(in srgb,var(--kl-fg,#fff) 12%,transparent);
					color:color-mix(in srgb,var(--kl-fg,#fff) 90%,transparent);
				}
				.kl-about-reflex-input::placeholder{color:color-mix(in srgb,var(--kl-fg,#0f172a) 36%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-reflex-input::placeholder{color:color-mix(in srgb,var(--kl-fg,#fff) 32%,transparent)}
				.kl-about-reflex-input:focus{border-color:color-mix(in srgb,var(--accent-green,#16a34a) 52%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-green,#16a34a) 16%,transparent)}
				.kl-about-reflex-btn{
					width:38px;height:38px;border-radius:12px;border:none;flex-shrink:0;
					display:flex;align-items:center;justify-content:center;
					background:color-mix(in srgb,var(--accent-green,#16a34a) 90%,#000);
					color:#fff;transition:transform 200ms,background 200ms,box-shadow 200ms;
				}
				.kl-about-reflex-btn:hover{transform:scale(1.06);background:var(--accent-green,#16a34a);box-shadow:0 6px 18px color-mix(in srgb,var(--accent-green,#16a34a) 40%,transparent)}
				.kl-about-reflex-btn.is-flash{background:color-mix(in srgb,var(--accent-green-soft,#bbf7d0) 80%,#fff);color:var(--accent-green,#16a34a)}

				/* Stats row */
				.kl-about-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
				.kl-about-stat{padding:14px}
				.kl-about-stat-icon{
					width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;
					font-size:16px;border:1px solid color-mix(in srgb,var(--kl-fg,#0f172a) 10%,transparent);
					background:color-mix(in srgb,#fff 88%,var(--accent-green-soft,#bbf7d0) 12%);
					margin-bottom:8px;color:color-mix(in srgb,var(--accent-green,#16a34a) 80%,#000);
				}
				.kl-about-root[data-theme="dark"] .kl-about-stat-icon{
					background:color-mix(in srgb,var(--kl-bg,#0b1220) 70%,var(--accent-green,#16a34a) 12%);
					border-color:color-mix(in srgb,var(--kl-fg,#fff) 10%,transparent);
					color:color-mix(in srgb,var(--accent-green-soft,#bbf7d0) 80%,#fff);
				}
				.kl-about-stat-num{font-weight:950;font-size:22px;letter-spacing:-.02em;line-height:1;color:color-mix(in srgb,var(--kl-fg,#0f172a) 92%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-stat-num{color:color-mix(in srgb,var(--kl-fg,#fff) 92%,transparent)}
				.kl-about-stat-label{margin-top:3px;font-weight:900;font-size:12.5px;color:color-mix(in srgb,var(--kl-fg,#0f172a) 82%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-stat-label{color:color-mix(in srgb,var(--kl-fg,#fff) 82%,transparent)}
				.kl-about-stat-desc{margin-top:5px;font-size:11.5px;font-weight:700;line-height:1.5;color:color-mix(in srgb,var(--kl-fg,#0f172a) 48%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-stat-desc{color:color-mix(in srgb,var(--kl-fg,#fff) 46%,transparent)}

				/* ── Bento row 2 ────────────────────────────────────────── */
				.kl-about-bento2{display:grid;grid-template-columns:1fr;gap:10px}
				@media(min-width:580px){.kl-about-bento2{grid-template-columns:1.3fr 1fr 0.8fr}}

				/* Quote card */
				.kl-about-qcard{display:flex;flex-direction:column;gap:0}
				.kl-about-qmarks{font-size:42px;line-height:1;font-weight:950;color:color-mix(in srgb,var(--accent-green,#16a34a) 55%,transparent);margin-bottom:2px}
				.kl-about-qtext{
					font-weight:950;font-size:17px;line-height:1.4;letter-spacing:-.01em;
					color:color-mix(in srgb,var(--kl-fg,#0f172a) 90%,transparent);
					animation:klQFadeUp 560ms cubic-bezier(.2,.8,.2,1) both;flex:1;
				}
				.kl-about-root[data-theme="dark"] .kl-about-qtext{color:color-mix(in srgb,var(--kl-fg,#fff) 90%,transparent)}
				.kl-about-qlabel{
					margin-top:8px;font-weight:900;font-size:11px;letter-spacing:.1em;
					color:var(--accent-green,#16a34a);
				}
				.kl-about-qdots{display:flex;align-items:center;gap:5px;margin-top:10px}
				.kl-about-qdot{
					width:8px;height:8px;border-radius:50%;border:none;padding:0;
					background:color-mix(in srgb,var(--kl-fg,#0f172a) 18%,transparent);
					transition:background 240ms,transform 240ms;
				}
				.kl-about-root[data-theme="dark"] .kl-about-qdot{background:color-mix(in srgb,var(--kl-fg,#fff) 20%,transparent)}
				.kl-about-qdot.is-active{background:var(--accent-green,#16a34a);transform:scale(1.3)}
				.kl-about-qdot-next{border:none;background:transparent;font-size:16px;font-weight:900;padding:0 2px;line-height:1;color:color-mix(in srgb,var(--kl-fg,#0f172a) 42%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-qdot-next{color:color-mix(in srgb,var(--kl-fg,#fff) 42%,transparent)}

				/* Workflow card */
				.kl-about-workflow{display:flex;flex-direction:column;gap:6px}
				.kl-about-workflow-icon{
					width:40px;height:40px;border-radius:16px;display:flex;align-items:center;justify-content:center;
					background:color-mix(in srgb,var(--accent-green,#16a34a) 14%,transparent);
					border:1px solid color-mix(in srgb,var(--accent-green,#16a34a) 28%,transparent);
					color:var(--accent-green,#16a34a);margin-bottom:4px;
				}
				.kl-about-workflow-title{font-weight:950;font-size:16px;letter-spacing:-.01em;color:color-mix(in srgb,var(--kl-fg,#0f172a) 90%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-workflow-title{color:color-mix(in srgb,var(--kl-fg,#fff) 90%,transparent)}
				.kl-about-workflow-sub{font-size:12.5px;font-weight:700;line-height:1.55;color:color-mix(in srgb,var(--kl-fg,#0f172a) 52%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-workflow-sub{color:color-mix(in srgb,var(--kl-fg,#fff) 52%,transparent)}

				/* CTA card */
				.kl-about-cta{
					display:flex;align-items:center;justify-content:center;
					background:color-mix(in srgb,var(--accent-green,#16a34a) 92%,#000);
					border-color:color-mix(in srgb,var(--accent-green,#16a34a) 60%,transparent);
					cursor:default;
				}
				.kl-about-cta:hover{
					transform:translateY(-3px);
					box-shadow:0 14px 40px color-mix(in srgb,var(--accent-green,#16a34a) 38%,transparent);
				}
				.kl-about-root[data-theme="dark"] .kl-about-cta{
					background:color-mix(in srgb,var(--accent-green,#16a34a) 52%,rgba(0,0,0,0.55));
					border-color:color-mix(in srgb,var(--accent-green,#16a34a) 55%,transparent);
					box-shadow:0 4px 24px color-mix(in srgb,var(--accent-green,#16a34a) 28%,transparent),0 4px 24px rgba(0,0,0,.32);
				}
				.kl-about-root[data-theme="dark"] .kl-about-cta:hover{
					box-shadow:0 14px 40px color-mix(in srgb,var(--accent-green,#16a34a) 38%,transparent),0 12px 40px rgba(0,0,0,.50);
				}
				.kl-about-cta-inner{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
				.kl-about-cta-btn{
					width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;
					background:rgba(255,255,255,.18);color:#fff;border:1.5px solid rgba(255,255,255,.32);
				}
				.kl-about-cta-label{font-weight:950;font-size:15px;color:#fff;letter-spacing:-.01em}
				.kl-about-cta-sub{font-size:10.5px;font-weight:900;letter-spacing:.1em;color:rgba(255,255,255,.68)}

				/* ── Footer ─────────────────────────────────────────────── */
				.kl-about-footer{
					display:flex;flex-direction:column;align-items:center;gap:10px;
					padding:10px 0 4px;
				}
				.kl-about-footer-icons{display:flex;align-items:center;gap:8px;color:color-mix(in srgb,var(--kl-fg,#0f172a) 28%,transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-footer-icons{color:color-mix(in srgb,var(--kl-fg,#fff) 24%,transparent)}
				.kl-about-footer-line{width:28px;height:1px;background:currentColor;opacity:.5}
				.kl-about-footer-text{
					font-size:11px;font-weight:900;letter-spacing:.12em;
					color:color-mix(in srgb,var(--kl-fg,#0f172a) 28%,transparent);
				}
				.kl-about-root[data-theme="dark"] .kl-about-footer-text{color:color-mix(in srgb,var(--kl-fg,#fff) 26%,transparent)}

				/* ── Reduced-motion ──────────────────────────────────────── */
				@media(prefers-reduced-motion:reduce){
					.kl-about-hero::before,.kl-about-hero,.kl-about-version-dot,.kl-about-reflex-dot{animation:none !important}
					.kl-about-card,.kl-about-reflex-input,.kl-about-reflex-btn,.kl-about-qdot{transition-duration:0ms !important}
					.kl-about-qtext{animation:none !important}
				}
			`}</style>

			<GlowGrid className="kl-about-wrap">
				{/* ── Hero ──────────────────────────────────────────────── */}
				<GlowTarget className="kl-about-hero">
					<div className="kl-about-hero-inner">
						<div className="kl-about-hero-badge">
							<span aria-hidden="true">⚡</span>
							DESIGNED FOR GREATNESS
						</div>
						<div className="kl-about-hero-title">KickLog</div>
						<div className="kl-about-hero-sub">
							The elite mental dashboard.<br />
							Analyze your performance, track your growth, and out-prepare the competition.
						</div>
					</div>
				</GlowTarget>

				{/* ── Bento row 1 ───────────────────────────────────────── */}
				<div className="kl-about-bento">
					{/* Elevate your game */}
					<GlowCard className="kl-about-elevate">
						<div className="kl-about-icons">
							<span className="kl-about-icon-chip" aria-hidden="true">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
								</svg>
							</span>
							<span className="kl-about-icon-chip" aria-hidden="true">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
								</svg>
							</span>
							<span className="kl-about-icon-chip" aria-hidden="true">
								<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
								</svg>
							</span>
						</div>
						<div className="kl-about-elevate-title">
							Elevate<br />your game.
						</div>
						<div className="kl-about-elevate-sub">
							KickLog synchronizes your matches, training drills, and mental state into one high-performance vault.
						</div>
						<div className="kl-about-version">
							<span className="kl-about-version-dot" aria-hidden="true" />
							VERSION 2.0.4 • STABLE
						</div>
					</GlowCard>

					{/* Right column */}
					<div className="kl-about-bento-right">
						<ReflexCard />
						<div className="kl-about-stats">
							<GlowCard className="kl-about-stat">
								<div className="kl-about-stat-icon" aria-hidden="true">🧠</div>
								<div className="kl-about-stat-num">94%</div>
								<div className="kl-about-stat-label">Retention Rate</div>
								<div className="kl-about-stat-desc">Users who log their technical errors improve 3× faster than peers.</div>
							</GlowCard>
							<GlowCard className="kl-about-stat">
								<div className="kl-about-stat-icon" aria-hidden="true">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
										<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
									</svg>
								</div>
								<div className="kl-about-stat-num">1.0%</div>
								<div className="kl-about-stat-label">Compound Gain</div>
								<div className="kl-about-stat-desc">Small daily adjustments recorded in KickLog lead to massive shifts.</div>
							</GlowCard>
						</div>
					</div>
				</div>

				{/* ── Bento row 2 ───────────────────────────────────────── */}
				<div className="kl-about-bento2">
					<QuoteCarousel />
					<GlowCard className="kl-about-workflow">
						<div className="kl-about-workflow-icon" aria-hidden="true">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
							</svg>
						</div>
						<div className="kl-about-workflow-title">30-Sec Workflow</div>
						<div className="kl-about-workflow-sub">
							Designed for the locker room. Log your fresh thoughts before the adrenaline fades.
						</div>
					</GlowCard>
					<GlowCard className="kl-about-cta" aria-label="Enter Dashboard">
						<div className="kl-about-cta-inner">
							<div className="kl-about-cta-btn" aria-hidden="true">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
								</svg>
							</div>
							<div className="kl-about-cta-label">Enter Dashboard</div>
							<div className="kl-about-cta-sub">AUTHORIZED ACCESS ONLY</div>
						</div>
					</GlowCard>
				</div>

				{/* ── Footer ────────────────────────────────────────────── */}
				<div className="kl-about-footer">
					<div className="kl-about-footer-icons" aria-hidden="true">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
						<div className="kl-about-footer-line" />
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
						<div className="kl-about-footer-line" />
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
					</div>
					<div className="kl-about-footer-text">FORGE YOUR OWN PATH • KICKLOG © 2026</div>
				</div>
			</GlowGrid>
		</div>
	);
}

