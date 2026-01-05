import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import bg from '../images/welcome_page_dark.jpg'

export default function WelcomePage() {
	const navigate = useNavigate()

	// Keep the welcome screen as a fixed, non-scrollable view.
	useEffect(() => {
		const prevHtmlOverflow = document.documentElement.style.overflow
		const prevBodyOverflow = document.body.style.overflow
		const prevOverscroll = document.body.style.overscrollBehavior
		document.documentElement.style.overflow = 'hidden'
		document.body.style.overflow = 'hidden'
		document.body.style.overscrollBehavior = 'none'
		return () => {
			document.documentElement.style.overflow = prevHtmlOverflow
			document.body.style.overflow = prevBodyOverflow
			document.body.style.overscrollBehavior = prevOverscroll
		}
	}, [])

	const quotes = [
		"Goals begin with vision",
		"Master the beautiful game",
		"Every touch matters",
		"Precision over pace",
		"Rise and conquer",
		"Play with purpose",
		"Elevate your game"
	]

	const QUOTES_AT_ONCE = 3
	const ROTATE_INTERVAL_MS = 8000
	const STAGGER_GAP_MS = 2000

	const createQuoteInstance = (text, id, seedDelayMs = 0) => {
		const top = `${Math.random() * 62 + 14}%`
		const left = `${Math.random() * 72 + 14}%`
		// Keep animations comfortably within the rotation interval, even when staggered.
		const durationMs = Math.floor(3000 + Math.random() * 400)
		const delayMs = Math.floor(seedDelayMs)
		return {
			id,
			key: `${id}-${Date.now()}-${Math.random()}`,
			text,
			top,
			left,
			durationMs,
			delayMs,
		}
	}

	const createBatch = (startIndex) => {
		const batch = []
		for (let offset = 0; offset < Math.min(QUOTES_AT_ONCE, quotes.length); offset++) {
			const idx = (startIndex + offset) % quotes.length
			batch.push(createQuoteInstance(quotes[idx], idx, offset * STAGGER_GAP_MS))
		}
		return batch
	}

	const [batchStartIndex, setBatchStartIndex] = useState(0)
	const [quoteInstances, setQuoteInstances] = useState(() => createBatch(0))

	useEffect(() => {
		// Rotate the quote batch at a steady interval (keeps the DOM light and avoids frequent state updates).
		const handle = window.setInterval(() => {
			setBatchStartIndex((prev) => (prev + QUOTES_AT_ONCE) % quotes.length)
		}, ROTATE_INTERVAL_MS)
		return () => window.clearInterval(handle)
	}, [quotes.length])

	useEffect(() => {
		setQuoteInstances(createBatch(batchStartIndex))
	}, [batchStartIndex])

	return (
		<>
			<style>{`
				@keyframes klBtnShine {
					0% { transform: translateX(-140%); }
					100% { transform: translateX(140%); }
				}
				.kl-quotes-layer {
					position: fixed;
					inset: 0;
					pointer-events: none;
					overflow: hidden;
					z-index: 80;
				}
				@keyframes klQuoteGlow {
					0% { opacity: 0; filter: blur(8px); transform: translate(-50%, -50%) scale(0.985); }
					25% { opacity: 0.82; filter: blur(0); transform: translate(-50%, -50%) scale(1); }
					75% { opacity: 0.82; filter: blur(0); transform: translate(-50%, -50%) scale(1); }
					100% { opacity: 0; filter: blur(8px); transform: translate(-50%, -50%) scale(0.985); }
				}
				.kl-quote {
					position: absolute;
					left: var(--kl-left);
					top: var(--kl-top);
					pointer-events: none;
					white-space: nowrap;
					font-weight: 800;
					letter-spacing: 0.02em;
					color: rgba(191, 219, 254, 0.62);
					text-shadow: 0 4px 20px rgba(99, 102, 241, 0.22), 0 10px 36px rgba(0, 0, 0, 0.80);
					opacity: 0;
					animation-name: klQuoteGlow;
					animation-duration: var(--kl-dur);
					animation-delay: var(--kl-delay);
					animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
					animation-fill-mode: both;
					will-change: opacity, transform, filter;
				}
				@media (min-width: 640px) { .kl-quote { font-size: 22px; } }
				@media (max-width: 639px) { .kl-quote { font-size: 16px; } }
				@media (prefers-reduced-motion: reduce) {
					.kl-quote {
						animation: none !important;
						opacity: 0.22;
						filter: none;
						transform: translate(-50%, -50%) scale(1);
					}
				}
				.kl-welcome-bg {
					/* keep simple: no fixed background */
					background-attachment: scroll;
				}

				/* Clean layout structure (avoids repeated inline positioning) */
				.kl-top {
					width: 100%;
					padding-top: 7rem;
					padding-left: 1.5rem;
					padding-right: 1.5rem;
					display: flex;
					justify-content: center;
				}
				.kl-bottom {
					width: 100%;
					padding-bottom: 4rem;
					padding-left: 1.5rem;
					padding-right: 1.5rem;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 1.75rem;
				}

				/* Title styling: fully CSS-driven (no Tailwind dependency) */
				.kl-brand-title {
					--kl-g1: rgba(167, 243, 208, 1); /* emerald-200 */
					--kl-g2: rgba(190, 242, 100, 1); /* lime-200 */
					--kl-g3: rgba(52, 211, 153, 1); /* emerald-400 */
					position: relative;
					display: inline-block;
					isolation: isolate;
					font-weight: 900;
					line-height: 1.12;
					padding-bottom: 0.08em;
					color: transparent;
					background-image: linear-gradient(90deg, var(--kl-g1), var(--kl-g2), var(--kl-g3));
					background-size: 200% 100%;
					background-position: 50% 50%;
					-webkit-background-clip: text;
					background-clip: text;
					text-shadow: 0 10px 34px rgba(0,0,0,0.65);
					filter: drop-shadow(0 8px 22px rgba(34,197,94,0.18));
					/* animations removed (buggy) */
				}
				/* Shine sweep ON THE LETTERS by overlaying same text */
				.kl-brand-title::after { display: none; }

				.kl-enter-btn {
					--kl-accent: var(--accent-green, #16a34a);
					--kl-accent-soft: var(--accent-green-soft, #bbf7d0);
					position: relative;
					overflow: hidden;
					isolation: isolate;
					border-radius: 9999px;
					padding: 16px 44px;
					font-weight: 900;
					letter-spacing: 0.01em;
					color: rgba(187, 247, 208, 0.98); /* emerald-200-ish */
					background: rgba(0, 0, 0, 0.10);
					border: 2px solid rgba(187, 247, 208, 0.70);
					box-shadow:
						0 18px 52px rgba(0, 0, 0, 0.42),
						0 10px 28px rgba(0, 0, 0, 0.25),
						0 0 0 1px rgba(22, 163, 74, 0.18);
					-webkit-backdrop-filter: blur(10px);
					backdrop-filter: blur(10px);
					transform: translateY(0) scale(1);
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						background-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						border-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
				}
				.kl-enter-btn::before {
					content: "";
					position: absolute;
					inset: -2px;
					background: linear-gradient(
						120deg,
						transparent 0%,
						rgba(255,255,255,0) 38%,
						rgba(255,255,255,0.45) 50%,
						rgba(255,255,255,0) 62%,
						transparent 100%
					);
					transform: translateX(-140%);
					transition: transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
					pointer-events: none;
					z-index: 0;
				}
				.kl-enter-btn > span {
					position: relative;
					z-index: 1;
				}
				.kl-enter-btn:hover {
					transform: translateY(-6px) scale(1.02);
					background: rgba(187, 247, 208, 0.10);
					border-color: rgba(187, 247, 208, 0.88);
					box-shadow:
						0 22px 60px rgba(0, 0, 0, 0.48),
						0 12px 32px rgba(0, 0, 0, 0.28),
						0 0 0 2px rgba(187, 247, 208, 0.34),
						0 0 0 10px rgba(22, 163, 74, 0.20);
				}
				.kl-enter-btn:hover::before {
					transform: translateX(140%);
				}
				.kl-enter-btn:active {
					transform: translateY(-2px) scale(0.995);
					background: rgba(187, 247, 208, 0.08);
					box-shadow:
						0 14px 40px rgba(0, 0, 0, 0.45),
						0 8px 20px rgba(0, 0, 0, 0.25),
						0 0 0 1px rgba(187, 247, 208, 0.30);
				}
				.kl-enter-btn:focus-visible {
					outline: none;
					box-shadow:
						0 18px 52px rgba(0, 0, 0, 0.42),
						0 10px 28px rgba(0, 0, 0, 0.25),
						0 0 0 3px rgba(187, 247, 208, 0.52),
						0 0 0 10px rgba(22, 163, 74, 0.24);
				}
			`}</style>

			{/* Floating Quotes */}
			<div className="kl-quotes-layer fixed inset-0 pointer-events-none overflow-hidden z-10" style={{ zIndex: 80 }}>
				{quoteInstances.map((q) => (
					<div
						key={q.key}
						className="kl-quote"
						style={{
							['--kl-top']: q.top,
							['--kl-left']: q.left,
							['--kl-dur']: `${q.durationMs}ms`,
							['--kl-delay']: `${q.delayMs}ms`,
						}}
					>
						{q.text}
					</div>
				))}
			</div>

			{/* Main Container */}
			<div
				className="kl-welcome-bg"
				style={{
					position: 'fixed',
					inset: 0,
					overflow: 'hidden',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'space-between',
					color: 'white',
					background: `linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${bg}) center / cover no-repeat`,
				}}
			>
				{/* Top */}
				<div className="kl-top w-full pt-28 sm:pt-32 px-6 flex justify-center">
					<div className="text-center">
						<h1
							className="kl-brand-title"
							data-text="KickLog"
							style={{ fontSize: 'clamp(52px, 12vw, 120px)', lineHeight: 1.12, letterSpacing: '0.015em', paddingBottom: '0.08em' }}
						>
							KickLog
						</h1>
						<span className="block h-1 w-28 sm:w-36 mx-auto mt-4 rounded-full bg-gradient-to-r from-lime-300 via-emerald-400 to-cyan-400" />
					</div>
				</div>

				{/* Bottom */}
				<div className="kl-bottom w-full pb-14 sm:pb-16 px-6 flex flex-col items-center gap-7">
					<p className="max-w-3xl text-center font-black leading-relaxed">
						<span className="block text-xl sm:text-3xl md:text-4xl bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
							Your football diary: Track every kick, every goal, every moment.
						</span>
						<span className="block mt-4 text-lg sm:text-2xl md:text-3xl font-bold text-white/90">
							Beautiful stats, highlights, and memories — all in one place.
						</span>
					</p>

					<button
						type="button"
						onClick={() => navigate('/auth')}
						className="kl-enter-btn rounded-full px-10 py-4 text-base sm:text-lg font-extrabold"
					>
						<span>Enter KickLog</span>
					</button>
				</div>
			</div>
		</>
	)
}
