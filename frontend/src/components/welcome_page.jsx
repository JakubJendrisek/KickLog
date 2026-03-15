import React, { useContext, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import bg from '../images/welcome_page_dark.jpg'

const GlowGridContext = React.createContext(null)

function GlowGrid({ children, threshold = 64, className = '' }) {
	const rootRef = useRef(null)
	const cardsRef = useRef(new Set())
	const rafRef = useRef(0)
	const lastPointRef = useRef({ x: 0, y: 0 })

	const ctx = useMemo(() => {
		return {
			register(el) {
				if (!el) return () => {}
				cardsRef.current.add(el)
				return () => cardsRef.current.delete(el)
			},
		}
	}, [])

	const updateAll = (clientX, clientY) => {
		cardsRef.current.forEach((el) => {
			const rect = el.getBoundingClientRect()
			const x = clientX - rect.left
			const y = clientY - rect.top

			const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0
			const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0
			const dist = Math.sqrt(dx * dx + dy * dy)

			if (dist > threshold) {
				el.style.setProperty('--kl-ga', '0')
				return
			}

			const clampedX = Math.max(0, Math.min(rect.width, x))
			const clampedY = Math.max(0, Math.min(rect.height, y))
			const glowAmount = Math.max(0, Math.min(1, 1 - dist / threshold))

			el.style.setProperty('--mx', `${clampedX}px`)
			el.style.setProperty('--my', `${clampedY}px`)
			el.style.setProperty('--kl-ga', glowAmount.toFixed(3))
		})
	}

	const handleMove = (e) => {
		lastPointRef.current = { x: e.clientX, y: e.clientY }
		if (rafRef.current) return
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0
			updateAll(lastPointRef.current.x, lastPointRef.current.y)
		})
	}

	const handleLeave = () => {
		if (rafRef.current) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = 0
		}
		cardsRef.current.forEach((el) => {
			el.style.setProperty('--kl-ga', '0')
		})
	}

	return (
		<GlowGridContext.Provider value={ctx}>
			<div ref={rootRef} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
				{children}
			</div>
		</GlowGridContext.Provider>
	)
}

function GlowCard({ className = '', children, ...props }) {
	const cardRef = useRef(null)
	const rafRef = useRef(0)
	const grid = useContext(GlowGridContext)

	useEffect(() => {
		if (!grid) return
		const el = cardRef.current
		if (!el) return
		const unregister = grid.register(el)
		return () => {
			try {
				unregister?.()
			} catch {
				// no-op
			}
		}
	}, [grid])

	const handleMove = (e) => {
		if (grid) return
		const el = cardRef.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		if (rafRef.current) cancelAnimationFrame(rafRef.current)
		rafRef.current = requestAnimationFrame(() => {
			el.style.setProperty('--mx', `${x}px`)
			el.style.setProperty('--my', `${y}px`)
			el.style.setProperty('--kl-ga', '1')
		})
	}

	const handleLeave = () => {
		if (grid) return
		const el = cardRef.current
		if (!el) return
		el.style.setProperty('--kl-ga', '0')
	}

	return (
		<div
			ref={cardRef}
			className={`kl-card ${className}`.trim()}
			onMouseMove={handleMove}
			onMouseLeave={handleLeave}
			{...props}
		>
			{children}
		</div>
	)
}

export default function WelcomePage() {
	const navigate = useNavigate()

	return (
		<>
			<style>{`
				.kl-welcome-page {
					min-height: 100vh;
					width: 100%;
					background: #ffffff;
					color: #0f172a;
				}

				.kl-container {
					width: min(100% - 48px, 1120px);
					margin-left: auto;
					margin-right: auto;
				}

				.kl-hero {
					position: relative;
					min-height: 92vh;
					width: 100%;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 0 24px;
					color: white;
					overflow: hidden;
				}

				.kl-hero-media {
					position: absolute;
					inset: 0;
					z-index: 0;
				}

				.kl-hero-media img {
					width: 100%;
					height: 100%;
					object-fit: cover;
					object-position: 50% 52%;
					transform: scale(1.03);
					filter: saturate(1.02) contrast(1.02);
				}

				.kl-hero-overlay {
					position: absolute;
					inset: 0;
					z-index: 1;
					background: linear-gradient(180deg, rgba(0,0,0,0.52), rgba(0,0,0,0.66));
				}

				.kl-hero-inner {
					text-align: left;
					width: min(100%, 980px);
					position: relative;
					z-index: 2;
				}

				.kl-divider {
					height: 4px;
					width: 144px;
					border-radius: 9999px;
					margin-top: 14px;
					background: linear-gradient(90deg, rgba(190, 242, 100, 1), rgba(52, 211, 153, 1), rgba(34, 211, 238, 1));
					box-shadow: 0 10px 24px rgba(0,0,0,0.35);
				}

				.kl-hero-lead {
					margin-top: 22px;
					font-weight: 900;
					letter-spacing: -0.01em;
					color: rgba(255,255,255,0.92);
					text-shadow: 0 8px 30px rgba(0,0,0,0.55);
					font-size: clamp(18px, 2.2vw, 32px);
					line-height: 1.25;
				}

				.kl-hero-sub {
					margin-top: 10px;
					max-width: 720px;
					font-weight: 700;
					color: rgba(255,255,255,0.80);
					line-height: 1.55;
					font-size: clamp(13px, 1.15vw, 16px);
				}

				.kl-hero-cta {
					margin-top: 28px;
					display: flex;
					align-items: center;
					justify-content: flex-start;
				}

				.kl-section {
					width: 100%;
					padding: 64px 0;
				}

				.kl-section--white { background: #ffffff; color: #0f172a; }
				.kl-section--muted { background: rgba(248, 250, 252, 1); color: #0f172a; }

				.kl-info-btn {
					position: fixed;
					right: 18px;
					bottom: 18px;
					width: 46px;
					height: 46px;
					border-radius: 9999px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-weight: 1000;
					font-size: 18px;
					line-height: 1;
					color: rgba(15, 23, 42, 0.9);
					background: color-mix(in srgb, #ffffff 88%, var(--accent-green-soft, #bbf7d0));
					border: 1.5px solid color-mix(in srgb, rgba(226, 232, 240, 1) 65%, var(--accent-green, #16a34a));
					box-shadow: 0 18px 52px rgba(2, 6, 23, 0.14);
					-webkit-backdrop-filter: blur(10px);
					backdrop-filter: blur(10px);
					z-index: 90;
					cursor: pointer;
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						border-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
				}

				.kl-info-btn:hover {
					transform: translateY(-4px);
					border-color: color-mix(in srgb, var(--accent-green, #16a34a) 45%, rgba(226, 232, 240, 1));
					box-shadow:
						0 22px 64px rgba(2, 6, 23, 0.16),
						0 0 0 8px rgba(22, 163, 74, 0.12);
				}

				.kl-info-btn:focus-visible {
					outline: none;
					box-shadow:
						0 22px 64px rgba(2, 6, 23, 0.16),
						0 0 0 4px rgba(187, 247, 208, 0.62),
						0 0 0 10px rgba(22, 163, 74, 0.18);
				}

				.kl-section-head {
					text-align: left;
				}
				.kl-section-title {
					margin: 0;
					font-weight: 900;
					letter-spacing: -0.02em;
					font-size: clamp(26px, 3.2vw, 40px);
					line-height: 1.15;
				}
				.kl-section-sub {
					margin-top: 10px;
					margin-bottom: 0;
					font-weight: 700;
					color: rgba(71, 85, 105, 1);
					max-width: 760px;
					line-height: 1.6;
				}

				.kl-grid {
					display: grid;
					grid-template-columns: 1fr;
					gap: 18px;
					margin-top: 28px;
				}
				@media (min-width: 860px) {
					.kl-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
					.kl-grid--2-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
				}
				@media (min-width: 620px) and (max-width: 859px) {
					.kl-grid--2-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
				}

				.kl-card {
					--kl-glow: rgba(34, 197, 94, 0.70);
					--kl-glow2: rgba(34, 197, 94, 0.85);
					--kl-ga: 0;
					position: relative;
					border-radius: 26px;
					background: rgba(255, 255, 255, 0.92);
					border: 1px solid rgba(226, 232, 240, 1);
					box-shadow: 0 18px 50px rgba(2, 6, 23, 0.08);
					padding: 26px;
					isolation: isolate;
					overflow: hidden;
					transition:
						transform var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						box-shadow var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1)),
						border-color var(--theme-dur, 820ms) var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
				}

				/* Cursor-follow border highlight */
				.kl-card::before {
					content: '';
					position: absolute;
					inset: 0;
					border-radius: inherit;
					padding: 3px;
					background:
						radial-gradient(
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

				.kl-card > * {
					position: relative;
					z-index: 1;
				}

				.kl-card:hover {
					transform: translateY(-6px);
					box-shadow: 0 26px 70px rgba(2, 6, 23, 0.12);
				}

				/* opacity is driven by --kl-ga (hover or proximity) */

				.kl-card-top {
					display: flex;
					align-items: center;
					gap: 12px;
				}
				.kl-badge {
					width: 40px;
					height: 40px;
					border-radius: 9999px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-weight: 900;
					color: rgba(15, 23, 42, 0.95);
					background: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 86%, white);
					border: 1px solid color-mix(in srgb, var(--accent-green, #16a34a) 22%, rgba(226, 232, 240, 1));
				}
				.kl-card-title {
					margin: 0;
					font-weight: 900;
					font-size: 18px;
					letter-spacing: -0.01em;
				}
				.kl-card-text {
					margin: 14px 0 0;
					font-weight: 650;
					color: rgba(71, 85, 105, 1);
					line-height: 1.65;
					font-size: 14px;
				}

				@media (max-width: 640px) {
					.kl-container { width: min(100% - 32px, 1120px); }
					.kl-section { padding: 52px 0; }
					.kl-hero { padding: 0 18px; }
					.kl-hero-media img { object-position: 62% 50%; }
				}

				@media (min-width: 641px) and (max-width: 1024px) {
					.kl-hero-media img { object-position: 55% 52%; }
				}

				@media (min-width: 1025px) {
					.kl-hero-media img { object-position: 50% 50%; }
				}

				@media (prefers-reduced-motion: reduce) {
					.kl-card, .kl-enter-btn { transition: none !important; }
					.kl-card:hover { transform: none; }
					.kl-card::before,
					.kl-card::after { display: none; }
					.kl-info-btn { transition: none !important; }
					.kl-info-btn:hover { transform: none; }
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

			<div className="kl-welcome-page">
				<button
					type="button"
					className="kl-info-btn"
					onClick={() => {}}
					aria-label="Privacy & Policy"
					title="Privacy & Policy"
				>
					!
				</button>

				{/* Hero */}
				<section
					className="kl-hero"
				>
					<div className="kl-hero-media" aria-hidden="true">
						<img src={bg} alt="" />
					</div>
					<div className="kl-hero-overlay" aria-hidden="true" />

					<div className="kl-hero-inner">
						<h1
							className="kl-brand-title"
							data-text="KickLog"
							style={{ fontSize: 'clamp(54px, 11vw, 124px)', lineHeight: 1.08, letterSpacing: '0.015em' }}
						>
							KickLog
						</h1>
						<div className="kl-divider" />
						<p className="kl-hero-lead">
							Train. Log sessions. Analyze your progress.
						</p>
						<p className="kl-hero-sub">
							A simple football diary that keeps your training, matches, and improvement in one place.
						</p>

						<div className="kl-hero-cta">
							<button
								type="button"
								onClick={() => navigate('/auth')}
								className="kl-enter-btn"
							>
								<span>Enter KickLog</span>
							</button>
						</div>
					</div>
				</section>

				{/* White Steps Section */}
				<section className="kl-section kl-section--white">
					<div className="kl-container">
						<div className="kl-section-head">
							<h2 className="kl-section-title">How it works</h2>
							<p className="kl-section-sub">
								Get value in minutes — keep it lightweight, then go deeper when you want.
							</p>
						</div>

						<GlowGrid className="kl-grid kl-grid--3" threshold={76}>
							<GlowCard>
								<div className="kl-card-top">
									<span className="kl-badge">1</span>
									<h3 className="kl-card-title">Train</h3>
								</div>
								<p className="kl-card-text">
									Capture what you did — drills, intensity, notes, and what you want to improve next session.
								</p>
							</GlowCard>
							<GlowCard>
								<div className="kl-card-top">
									<span className="kl-badge">2</span>
									<h3 className="kl-card-title">Log your sessions</h3>
								</div>
								<p className="kl-card-text">
									Build a consistent diary of training and matches so you can spot patterns that actually matter.
								</p>
							</GlowCard>
							<GlowCard>
								<div className="kl-card-top">
									<span className="kl-badge">3</span>
									<h3 className="kl-card-title">Analyze</h3>
								</div>
								<p className="kl-card-text">
									See progress over time and stay motivated with clear, simple stats.
								</p>
							</GlowCard>
						</GlowGrid>
					</div>
				</section>

				{/* Feature Grid */}
				<section className="kl-section kl-section--muted">
					<div className="kl-container">
						<div className="kl-section-head">
							<h2 className="kl-section-title" style={{ fontSize: 'clamp(22px, 2.4vw, 32px)' }}>What you get</h2>
							<p className="kl-section-sub">
								Everything you need to stay consistent — without feeling like extra work.
							</p>
						</div>

						<GlowGrid className="kl-grid kl-grid--2-3" threshold={72}>
							<GlowCard>
								<h3 className="kl-card-title">Training diary</h3>
								<p className="kl-card-text">Log drills, duration, and notes in seconds.</p>
							</GlowCard>
							<GlowCard>
								<h3 className="kl-card-title">Match memories</h3>
								<p className="kl-card-text">Keep key moments and takeaways from every game.</p>
							</GlowCard>
							<GlowCard>
								<h3 className="kl-card-title">Consistency</h3>
								<p className="kl-card-text">Build momentum with a clear habit-friendly flow.</p>
							</GlowCard>
							<GlowCard>
								<h3 className="kl-card-title">Progress snapshots</h3>
								<p className="kl-card-text">Quickly review what changed week to week.</p>
							</GlowCard>
							<GlowCard>
								<h3 className="kl-card-title">Simple stats</h3>
								<p className="kl-card-text">Focus on the metrics that help you improve.</p>
							</GlowCard>
							<GlowCard>
								<h3 className="kl-card-title">Private by default</h3>
								<p className="kl-card-text">Your log stays yours — sign in to access it.</p>
							</GlowCard>
						</GlowGrid>
					</div>
				</section>

			</div>
		</>
	)
}
