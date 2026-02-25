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

function AboutBlock({ title, items, defaultExpanded = false }) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const visibleItems = expanded ? items : items.slice(0, 3);
	const canToggle = items.length > 3;

	return (
		<GlowCard className={expanded ? "is-expanded" : ""}>
			<div className="kl-about-cardHead">
				<div className="kl-about-cardTitle">{title}</div>
				{canToggle && (
					<button
						type="button"
						className="kl-about-more"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
					>
						{expanded ? "Show less" : "Show more"}
					</button>
				)}
			</div>

			<ul className="kl-about-list">
				{visibleItems.map((text) => (
					<li key={text} className="kl-about-li">
						{text}
					</li>
				))}
			</ul>

			{canToggle && !expanded && (
				<div className="kl-about-fade" aria-hidden="true" />
			)}
		</GlowCard>
	);
}

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

async function safeCopy(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.setAttribute("readonly", "");
			ta.style.position = "fixed";
			ta.style.left = "-9999px";
			document.body.appendChild(ta);
			ta.select();
			document.execCommand("copy");
			document.body.removeChild(ta);
			return true;
		} catch {
			return false;
		}
	}
}

function QuoteWall() {
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
	const [copied, setCopied] = useState(false);
	const [animKey, setAnimKey] = useState(0);

	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1200);
		return () => clearTimeout(t);
	}, [copied]);

	const quote = quotes[idx % Math.max(1, quotes.length)] || "";
	const next = () => {
		setIdx((v) => (quotes.length ? (v + 1) % quotes.length : 0));
		setAnimKey((k) => k + 1);
	};
	const prev = () => {
		setIdx((v) => (quotes.length ? (v - 1 + quotes.length) % quotes.length : 0));
		setAnimKey((k) => k + 1);
	};
	const shuffle = () => {
		if (quotes.length <= 1) return;
		let nextIdx = idx;
		for (let i = 0; i < 8 && nextIdx === idx; i += 1) {
			nextIdx = Math.floor(Math.random() * quotes.length);
		}
		setIdx(nextIdx);
		setAnimKey((k) => k + 1);
	};

	const copy = async () => {
		const ok = await safeCopy(quote);
		setCopied(!!ok);
	};

	return (
		<GlowCard className="kl-about-quotes" role="region" aria-label="Quote wall">
			<div className="kl-about-cardHead">
				<div className="kl-about-cardTitle">Quote wall</div>
				<div className="kl-about-quoteActions">
					<button type="button" className="kl-about-more" onClick={prev} aria-label="Previous quote">
						Prev
					</button>
					<button type="button" className="kl-about-more" onClick={next} aria-label="Next quote">
						Next
					</button>
					<button type="button" className="kl-about-more" onClick={shuffle} aria-label="Shuffle quote">
						Shuffle
					</button>
					<button type="button" className="kl-about-more" onClick={copy} aria-label="Copy quote">
						Copy
					</button>
				</div>
			</div>

			<div className="kl-about-quoteStack" aria-hidden="true">
				<div className="kl-about-quoteCard" />
				<div className="kl-about-quoteCard" />
			</div>

			<div className="kl-about-quote" key={`q-${idx}-${animKey}`}>
				“{quote}”
			</div>

			<div className={`kl-about-quoteToast ${copied ? "is-on" : ""}`.trim()} aria-live="polite">
				{copied ? "Copied" : ""}
			</div>

			<div className="kl-about-quoteHint">Tip: Put your own quotes in localStorage key “{QUOTES_STORAGE_KEY}” as a JSON array.</div>
		</GlowCard>
	);
}

const FAQ_ITEMS = [
	{
		id: "private",
		q: "Is this a diary or a training log?",
		a: "Both. Treat KickLog like a lightweight logbook: diary when you need clarity, training log when you need progress.",
	},
	{
		id: "consistent",
		q: "How do I stay consistent?",
		a: "Make the bar ridiculously low: 1 sentence counts. When your brain says ‘skip’, write 1 line and you still win.",
	},
	{
		id: "miss",
		q: "What if I miss a few days?",
		a: "Don’t backfill. Just continue from today. The streak is not the goal — the habit is.",
	},
	{
		id: "review",
		q: "What’s the fastest way to get value?",
		a: "Write + review. Spend 30 seconds reading yesterday before you write today. That’s where patterns show up.",
	},
];

function FaqAccordion() {
	const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null);

	return (
		<GlowCard className="kl-about-faq" role="region" aria-label="FAQ">
			<div className="kl-about-cardHead">
				<div className="kl-about-cardTitle">FAQ</div>
				<div className="kl-about-faqTip">Click a question</div>
			</div>

			<div className="kl-about-accList">
				{FAQ_ITEMS.map((it) => {
					const isOpen = openId === it.id;
					return (
						<div key={it.id} className={`kl-about-acc ${isOpen ? "is-open" : ""}`.trim()}>
							<button
								type="button"
								className="kl-about-accBtn"
								onClick={() => setOpenId((v) => (v === it.id ? null : it.id))}
								aria-expanded={isOpen}
							>
								<span className="kl-about-accQ">{it.q}</span>
								<span className="kl-about-accIcon" aria-hidden="true" />
							</button>
							<div className="kl-about-accBody">
								<div className="kl-about-accInner">{it.a}</div>
							</div>
						</div>
					);
				})}
			</div>
		</GlowCard>
	);
}

export default function MainAbout({ darkMode }) {
	return (
		<div className="kl-about-root" data-theme={darkMode ? "dark" : "light"}>
			<style>{`
				@keyframes klAboutIn{0%{opacity:0;transform:translate3d(0,10px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
				@keyframes klAboutPop{0%{transform:scale(.92)}55%{transform:scale(1.06)}100%{transform:scale(1)}}
				@keyframes klAboutFadeUp{0%{opacity:0;transform:translate3d(0,6px,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
				@keyframes klQuoteFloat{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-4px,0)}100%{transform:translate3d(0,0,0)}}
				.kl-about-root{
					height:100%;width:100%;min-height:0;overflow:auto;box-sizing:border-box;
					padding:8px;
				}
				.kl-about-wrap{width:min(100%, 980px);margin:0 auto;padding:6px 6px 14px;position:relative}
				.kl-about-hero{
					--mx: 50%;
					--my: 50%;
					--kl-ga: 0;
					border-radius:24px;padding:18px 18px 16px;border:1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background:color-mix(in srgb, #ffffff 90%, var(--accent-green-soft, #bbf7d0) 10%);
					box-shadow:0 18px 52px rgba(15,23,42,0.10);
					position:relative;overflow:hidden;isolation:isolate}
				.kl-about-hero{animation:klAboutIn 720ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) both}
				.kl-about-root[data-theme="dark"] .kl-about-hero{
					background:color-mix(in srgb, var(--kl-bg, #0b1220) 76%, transparent);
					box-shadow:0 18px 52px rgba(0,0,0,0.36);
				}
				.kl-about-hero::before{
					content:"";position:absolute;inset:-2px;z-index:0;pointer-events:none;
					opacity:.92;filter:blur(18px) saturate(1.35);
					animation:klAboutDrift 16s var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) infinite;
					background:
						radial-gradient(560px 220px at 8% 0%, color-mix(in srgb, var(--accent-green, #16a34a) 42%, transparent), transparent 60%),
						radial-gradient(620px 240px at 96% 20%, color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 44%, transparent), transparent 64%),
						radial-gradient(520px 260px at 18% 120%, color-mix(in srgb, color-mix(in srgb, var(--accent-green, #16a34a) 70%, var(--accent-green-soft, #bbf7d0)) 30%, transparent), transparent 66%);
				}
				/* Welcome-style cursor-follow outline */
				.kl-about-hero::after{
					content:"";
					position:absolute;
					inset:0;
					border-radius:inherit;
					padding:3px;
					background:
						radial-gradient(
							190px circle at var(--mx, 50%) var(--my, 50%),
							color-mix(in srgb, var(--accent-green, #16a34a) 62%, #ffffff) 0%,
							transparent 58%
						);
					opacity:calc(var(--kl-ga, 0) * 1);
					transition:opacity 260ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
					pointer-events:none;
					z-index:0;
					-webkit-mask:
						linear-gradient(#000 0 0) content-box,
						linear-gradient(#000 0 0);
					-webkit-mask-composite:xor;
					mask-composite:exclude;
				}
				@keyframes klAboutDrift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(12px,-10px,0) scale(1.02)}100%{transform:translate3d(0,0,0) scale(1)}}
				.kl-about-heroInner{position:relative;z-index:1}
				.kl-about-title{font-weight:950;font-size:30px;line-height:1.1;letter-spacing:-.02em;color:color-mix(in srgb, var(--kl-fg, #0f172a) 92%, transparent)}
				.kl-about-sub{margin-top:10px;font-weight:750;font-size:15px;line-height:1.6;color:color-mix(in srgb, var(--kl-fg, #0f172a) 62%, transparent);max-width:78ch}
				.kl-about-divider{margin-top:12px;height:4px;width:140px;border-radius:999px;
					background:linear-gradient(90deg, color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 70%, #ffffff), color-mix(in srgb, var(--accent-green, #16a34a) 86%, #ffffff));
					box-shadow:0 12px 26px rgba(15,23,42,0.12)}
				.kl-about-root[data-theme="dark"] .kl-about-divider{box-shadow:0 12px 26px rgba(0,0,0,0.35)}

				.kl-about-grid{margin-top:14px;display:grid;grid-template-columns:1fr;gap:12px}
				@media(min-width: 880px){.kl-about-grid{grid-template-columns:1fr 1fr 1fr}}
				.kl-about-extra{margin-top:12px;display:grid;grid-template-columns:1fr;gap:12px}
				@media(min-width: 880px){.kl-about-extra{grid-template-columns:1.08fr .92fr;align-items:start}}
				.kl-about-span2{grid-column:1/-1}

				.kl-about-card{
					--mx: 50%;
					--my: 50%;
					--kl-ga: 0;
					border-radius:22px;
					padding:14px;
					border:1px solid color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);
					background:color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%);
					box-shadow:0 18px 52px rgba(15,23,42,0.08);
					position:relative;
					isolation:isolate;
					overflow:hidden;
					transform:translateZ(0);
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)),
						border-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)),
						background-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
				}
				.kl-about-card > *{position:relative;z-index:1}
				.kl-about-grid > .kl-about-card{animation:klAboutIn 760ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) both}
				.kl-about-grid > .kl-about-card:nth-child(2){animation-delay:90ms}
				.kl-about-grid > .kl-about-card:nth-child(3){animation-delay:180ms}
				.kl-about-root[data-theme="dark"] .kl-about-card{
					background:color-mix(in srgb, var(--kl-bg, #0b1220) 76%, transparent);
					box-shadow:0 18px 52px rgba(0,0,0,0.32);
				}
				/* Cursor-follow outline highlight (same style as Welcome cards) */
				.kl-about-card::before{
					content:"";
					position:absolute;
					inset:0;
					border-radius:inherit;
					padding:3px;
					background:
						radial-gradient(
							190px circle at var(--mx, 50%) var(--my, 50%),
							color-mix(in srgb, var(--accent-green, #16a34a) 62%, #ffffff) 0%,
							transparent 58%
						);
					opacity:calc(var(--kl-ga, 0) * 1);
					transition:opacity 260ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
					pointer-events:none;
					z-index:0;
					-webkit-mask:
						linear-gradient(#000 0 0) content-box,
						linear-gradient(#000 0 0);
					-webkit-mask-composite:xor;
					mask-composite:exclude;
				}
				.kl-about-card:hover{
					transform:translateY(-2px);
					box-shadow:0 22px 64px rgba(15,23,42,0.12);
					border-color:color-mix(in srgb, var(--accent-green, #16a34a) 18%, color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent));
				}
				.kl-about-root[data-theme="dark"] .kl-about-card:hover{box-shadow:0 22px 64px rgba(0,0,0,0.42)}

				.kl-about-cardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
				.kl-about-cardTitle{font-weight:950;font-size:14px;letter-spacing:.12em;text-transform:uppercase;opacity:.86;color:color-mix(in srgb, var(--kl-fg, #0f172a) 90%, transparent)}
				.kl-about-more{border:none;background:transparent;padding:6px 10px;border-radius:999px;font-weight:900;font-size:12px;letter-spacing:.02em;
					color:color-mix(in srgb, var(--kl-fg, #0f172a) 62%, transparent);
					transition:transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), background-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
					cursor:pointer}
				.kl-about-more:hover{transform:translateY(-1px);background:color-mix(in srgb, #ffffff 70%, var(--accent-green-soft, #bbf7d0) 30%);color:color-mix(in srgb, var(--accent-green, #16a34a) 60%, var(--kl-fg, #0f172a))}
				.kl-about-root[data-theme="dark"] .kl-about-more:hover{background:color-mix(in srgb, var(--kl-bg, #0b1220) 76%, transparent)}
				.kl-about-more:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 55%, transparent)}

				.kl-about-list{margin:10px 0 0;padding-left:18px;display:grid;gap:8px}
				.kl-about-li{font-weight:750;font-size:14px;line-height:1.55;color:color-mix(in srgb, var(--kl-fg, #0f172a) 74%, transparent);
					transition:transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1))}
				.kl-about-li::marker{color:color-mix(in srgb, var(--accent-green, #16a34a) 62%, transparent)}
				.kl-about-li:hover{transform:translateX(2px);color:color-mix(in srgb, var(--accent-green, #16a34a) 38%, var(--kl-fg, #0f172a))}
				.kl-about-root[data-theme="dark"] .kl-about-li{color:color-mix(in srgb, var(--kl-fg, #ffffff) 80%, transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-li:hover{color:color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 40%, var(--kl-fg, #ffffff))}

				.kl-about-fade{position:absolute;left:0;right:0;bottom:0;height:48px;
					background:linear-gradient(180deg, transparent, color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%));
					pointer-events:none}
				.kl-about-root[data-theme="dark"] .kl-about-fade{background:linear-gradient(180deg, transparent, color-mix(in srgb, var(--kl-bg, #0b1220) 86%, transparent))}

				.kl-about-quoteActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
				.kl-about-quoteStack{position:relative;margin-top:10px;height:38px}
				.kl-about-quoteCard{position:absolute;left:0;right:0;top:0;height:34px;border-radius:18px;
					border:1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 10%, transparent);
					background:color-mix(in srgb, #ffffff 84%, transparent);
					box-shadow:0 18px 52px rgba(15,23,42,0.06);
					transform:translateY(0)}
				.kl-about-quoteStack .kl-about-quoteCard:nth-child(1){transform:translate3d(0,6px,0) scale(.98);opacity:.6}
				.kl-about-quoteStack .kl-about-quoteCard:nth-child(2){transform:translate3d(0,2px,0) scale(.99);opacity:.78}
				.kl-about-root[data-theme="dark"] .kl-about-quoteCard{background:color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);border-color:color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);box-shadow:0 18px 52px rgba(0,0,0,0.26)}
				.kl-about-quote{margin-top:10px;border-radius:18px;padding:12px 12px;
					border:1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 10%, transparent);
					background:color-mix(in srgb, #ffffff 86%, transparent);
					font-weight:950;font-size:15px;line-height:1.45;letter-spacing:-.01em;
					color:color-mix(in srgb, var(--kl-fg, #0f172a) 88%, transparent);
					animation:klAboutFadeUp 720ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)) both, klQuoteFloat 6.4s ease-in-out infinite}
				.kl-about-root[data-theme="dark"] .kl-about-quote{background:color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);border-color:color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent);color:color-mix(in srgb, var(--kl-fg, #ffffff) 88%, transparent)}
				.kl-about-quoteToast{margin-top:8px;height:18px;font-weight:950;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:0;
					color:color-mix(in srgb, var(--accent-green, #16a34a) 62%, var(--kl-fg, #0f172a));
					transform:translate3d(0,4px,0);
					transition:opacity 380ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), transform 380ms var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1))}
				.kl-about-quoteToast.is-on{opacity:1;transform:translate3d(0,0,0)}
				.kl-about-quoteHint{margin-top:8px;font-weight:800;font-size:12.5px;line-height:1.4;opacity:.68}

				/* Progress pulse moved to Profile */

				.kl-about-faqTip{font-weight:950;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.62}
				.kl-about-accList{margin-top:10px;display:grid;gap:8px}
				.kl-about-acc{border-radius:18px;border:1px solid color-mix(in srgb, var(--kl-fg, #0f172a) 10%, transparent);
					background:color-mix(in srgb, #ffffff 88%, transparent);overflow:hidden}
				.kl-about-root[data-theme="dark"] .kl-about-acc{background:color-mix(in srgb, var(--kl-bg, #0b1220) 78%, transparent);border-color:color-mix(in srgb, var(--kl-fg, #ffffff) 12%, transparent)}
				.kl-about-accBtn{width:100%;text-align:left;border:none;background:transparent;padding:10px 10px;
					display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer}
				.kl-about-accBtn:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 55%, transparent)}
				.kl-about-accQ{font-weight:950;font-size:13.5px;line-height:1.3;color:color-mix(in srgb, var(--kl-fg, #0f172a) 86%, transparent)}
				.kl-about-root[data-theme="dark"] .kl-about-accQ{color:color-mix(in srgb, var(--kl-fg, #ffffff) 88%, transparent)}
				.kl-about-accIcon{width:18px;height:18px;border-radius:999px;position:relative;flex:0 0 auto;
					border:1.5px solid color-mix(in srgb, var(--kl-fg, #0f172a) 22%, transparent);
					transition:transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), border-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1))}
				.kl-about-root[data-theme="dark"] .kl-about-accIcon{border-color:color-mix(in srgb, var(--kl-fg, #ffffff) 26%, transparent)}
				.kl-about-accIcon::before,.kl-about-accIcon::after{content:"";position:absolute;left:50%;top:50%;width:10px;height:2px;border-radius:999px;
					background:color-mix(in srgb, var(--accent-green, #16a34a) 70%, var(--kl-fg, #0f172a));transform:translate(-50%,-50%)}
				.kl-about-accIcon::after{transform:translate(-50%,-50%) rotate(90deg)}
				.kl-about-acc.is-open .kl-about-accIcon{transform:rotate(45deg);border-color:color-mix(in srgb, var(--accent-green, #16a34a) 38%, transparent)}
				.kl-about-accBody{display:grid;grid-template-rows:0fr;transition:grid-template-rows var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1))}
				.kl-about-acc.is-open .kl-about-accBody{grid-template-rows:1fr}
				.kl-about-accInner{overflow:hidden;padding:0 10px 0;font-weight:800;font-size:13px;line-height:1.5;
					color:color-mix(in srgb, var(--kl-fg, #0f172a) 70%, transparent);
					opacity:0;transform:translate3d(0,-4px,0);
					transition:opacity var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), padding var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1))}
				.kl-about-root[data-theme="dark"] .kl-about-accInner{color:color-mix(in srgb, var(--kl-fg, #ffffff) 76%, transparent)}
				.kl-about-acc.is-open .kl-about-accInner{opacity:1;transform:translate3d(0,0,0);padding:0 10px 12px}

				@media (prefers-reduced-motion: reduce){
					.kl-about-hero::before{animation:none !important}
					.kl-about-hero,.kl-about-grid > .kl-about-card{animation:none !important}
					.kl-about-quote{animation:none !important}
					.kl-about-card,.kl-about-more,.kl-about-li,.kl-about-accBody,.kl-about-accInner,.kl-about-accIcon,.kl-about-quoteToast{transition-duration:0ms !important}
				}
			`}</style>

			<GlowGrid className="kl-about-wrap">
				<GlowTarget className="kl-about-hero">
					<div className="kl-about-heroInner">
						<div className="kl-about-title">About KickLog</div>
						<div className="kl-about-divider" />
						<div className="kl-about-sub">
							KickLog is a simple place to write things down, track your progress, and keep your head clear.
							Use it as a daily diary, a training log, or a “reset button” when the day gets noisy.
						</div>
					</div>
				</GlowTarget>

				<div className="kl-about-grid">
					<AboutBlock
						title="How to use it"
						items={[
							"Start a new diary entry when something matters — big or small.",
							"Be honest and short: a few lines is enough to build consistency.",
							"Use titles, dates, and clear notes so you can find things later.",
							"If you miss a day, don’t “catch up” — just continue from today.",
						]}
						defaultExpanded
					/>
					<AboutBlock
						title="Why you should use it"
						items={[
							"You remember patterns better when you write them down.",
							"Small improvements compound — tracking makes that visible.",
							"A log turns motivation into a plan and a plan into results.",
						]}
					/>
					<AboutBlock
						title="A little motivation"
						items={[
							"You don’t need a perfect day — you need the next good decision.",
							"Consistency beats intensity. Show up, even if it’s just one sentence.",
							"Future you will thank you for leaving a trail.",
						]}
					/>
				</div>

				<div className="kl-about-extra">
					<QuoteWall />
					<FaqAccordion />
				</div>
			</GlowGrid>
		</div>
	);
}

