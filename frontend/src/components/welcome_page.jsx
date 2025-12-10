import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import bg from '../images/welcome_page_dark.jpg'

export default function WelcomePage() {
	const navigate = useNavigate()

	const quotes = [
		"Goals begin with vision",
		"Master the beautiful game",
		"Every touch matters",
		"Precision over pace",
		"Rise and conquer",
		"Play with purpose",
		"Elevate your game"
	]

	// Set background
	useEffect(() => {
		const prev = {
			backgroundImage: document.body.style.backgroundImage,
			backgroundSize: document.body.style.backgroundSize,
			backgroundPosition: document.body.style.backgroundPosition,
			backgroundAttachment: document.body.style.backgroundAttachment,
			backgroundRepeat: document.body.style.backgroundRepeat,
			color: document.body.style.color,
		}
		document.body.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url("${bg}")`
		document.body.style.backgroundSize = 'cover'
		document.body.style.backgroundPosition = 'center'
		document.body.style.backgroundAttachment = 'fixed'
		document.body.style.backgroundRepeat = 'no-repeat'
		document.body.style.color = 'white'
		return () => {
			document.body.style.backgroundImage = prev.backgroundImage
			document.body.style.backgroundSize = prev.backgroundSize
			document.body.style.backgroundPosition = prev.backgroundPosition
			document.body.style.backgroundAttachment = prev.backgroundAttachment
			document.body.style.backgroundRepeat = prev.backgroundRepeat
			document.body.style.color = prev.color
		}
	}, [])

	return (
		<>
			<style>{`
				@keyframes floatUp {
					from { opacity: 0; transform: translateY(14px) scale(0.99); }
					to { opacity: 1; transform: translateY(0) scale(1); }
				}
				@keyframes kickBounce {
					0% { transform: scale(0.98) translateY(-40px) scaleY(0.98); opacity: 0; }
					60% { transform: scale(1.08) translateY(-52px); opacity: 1; }
					80% { transform: scale(0.96) translateY(-36px); }
					100% { transform: scale(1) translateY(-40px); }
				}
				@keyframes underlineGrow {
					from { transform: scaleX(0); opacity: 0; }
					to { transform: scaleX(1); opacity: 1; }
				}
				@keyframes floatingQuote {
					0% { 
						opacity: 0; 
						transform: translateY(1200px) scale(0.6);
						filter: blur(10px);
					}
					5% {
						opacity: 0.3;
					}
					15% {
						opacity: 1;
						transform: translateY(900px) scale(1);
						filter: blur(0px);
					}
					50% {
						opacity: 1;
						transform: translateY(0px) scale(1);
					}
					85% {
						opacity: 1;
						transform: translateY(-900px) scale(1);
						filter: blur(0px);
					}
					95% {
						opacity: 0.3;
					}
					100% { 
						opacity: 0; 
						transform: translateY(-1200px) scale(0.6);
						filter: blur(10px);
					}
				}
				.fade-up {
					animation: floatUp 900ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
				}
				.title-glow {
					text-shadow: 0 8px 32px rgba(0, 0, 0, 0.66), 0 2px 8px rgba(99, 102, 241, 1);
				}
				.underline-anim {
					transform-origin: left;
					animation: underlineGrow 700ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
				}
				.description-glow {
					filter: drop-shadow(0 4px 12px rgba(190, 242, 100, 0.25)) drop-shadow(0 2px 6px rgba(129, 230, 217, 0.2));
				}
				.kick-title {
					animation: kickBounce 1.2s cubic-bezier(0.2, 0.9, 0.3, 1) 0.2s both;
				}
				.kick-btn {
					display: block;
					margin: 0 auto;
					padding: 1.25rem 3rem;
					border-radius: 9999px;
					font-size: 1.375rem;
					font-weight: bold;
					color: white;
					text-align: center;
					white-space: nowrap;
					background: linear-gradient(to right, rgba(99, 102, 241, 0.2), rgba(196, 181, 253, 0.2), rgba(99, 102, 241, 0.2));
					border: 2px solid rgba(196, 181, 253, 0.4);
					box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5);
					transition: all 0.3s cubic-bezier(0.2, 0.9, 0.3, 1);
					cursor: pointer;
					outline: none;
				}
				.kick-btn:hover {
					background: linear-gradient(to right, rgba(99, 102, 241, 0.3), rgba(196, 181, 253, 0.3), rgba(99, 102, 241, 0.3));
					border-color: rgba(196, 181, 253, 0.7);
					box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5), 0 12px 40px rgba(196, 181, 253, 0.4);
					transform: translateY(-6px) scale(1.05);
				}
				.kick-btn:active {
					transform: scale(1);
				}
				.kick-btn:focus {
					outline: none;
					box-shadow: 0 0 0 4px rgba(196, 181, 253, 0.5);
				}
				.floating-quote {
					position: fixed;
					font-size: 1.5rem;
					font-weight: 700;
					color: rgba(196, 181, 253, 0.4);
					text-shadow: 0 4px 20px rgba(99, 102, 241, 0.3), 0 8px 32px rgba(0, 0, 0, 0.8);
					pointer-events: none;
					animation: floatingQuote 12s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
					white-space: nowrap;
					letter-spacing: 0.05em;
				}
				@media (max-width: 768px) {
					.kick-btn {
						padding: 1rem 2.5rem;
						font-size: 1.125rem;
					}
					.kick-btn:hover {
						transform: translateY(-4px) scale(1.03);
					}
				}
				@media (max-width: 640px) {
					.kick-btn {
						padding: 0.875rem 2rem;
						font-size: 1rem;
					}
					.kick-btn:hover {
						transform: translateY(-2px) scale(1.02);
					}
				}
				@media (max-width: 480px) {
					.kick-btn {
						padding: 0.75rem 1.5rem;
						font-size: 0.95rem;
					}
					.kick-btn:hover {
						transform: translateY(-1px) scale(1.01);
					}
					.description-glow {
						filter: drop-shadow(0 2px 8px rgba(190, 242, 100, 0.2)) drop-shadow(0 1px 4px rgba(129, 230, 217, 0.15));
					}
				}
			`}</style>

			{/* Floating Quotes Container */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
				{quotes.map((quote, index) => (
					<div
						key={index}
						className="floating-quote"
						style={{
							left: `${Math.random() * 80 + 10}%`,
							bottom: '-100px',
							animationDelay: `${index * 1.5}s`,
							animationIterationCount: 'infinite'
						}}
					>
						{quote}
					</div>
				))}
			</div>

			{/* Main Container */}
			<div className="w-screen h-screen relative">
				
				{/* TOP SECTION - Title */}
				<div className="absolute top-0 left-0 right-0 text-center w-full flex justify-center" style={{ paddingTop: '8rem' }}>
					<div>
						<h1
							className="font-extrabold bg-gradient-to-r from-green-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent title-glow fade-up kick-title"
							style={{ 
								fontSize: 'clamp(48px, 12vw, 120px)', 
								lineHeight: 1.1,
								letterSpacing: '0.015em',
								margin: '0',
								textAlign: 'center'
							}}
						>
							KickLog
						</h1>
						<span className="block h-0.5 sm:h-1 w-24 sm:w-32 mx-auto mt-4 rounded-full bg-gradient-to-r from-lime-300 via-emerald-400 to-cyan-400 underline-anim" />
					</div>
				</div>

				{/* BOTTOM SECTION - Absolutely positioned at very bottom */}
				<div className="absolute bottom-0 left-0 right-0 w-full flex flex-col items-center gap-6 pb-16 px-4 sm:px-6">
					{/* Description */}
					<p
						className="text-xl sm:text-3xl md:text-4xl font-black fade-up description-glow max-w-3xl"
						style={{
							textAlign: 'center',
							background: 'linear-gradient(135deg, rgba(99, 102, 241, 1) 0%, rgba(168, 85, 247, 1) 50%, rgba(99, 102, 241, 1) 100%)',
							WebkitBackgroundClip: 'text',
							backgroundClip: 'text',
							color: 'transparent',
							animationDelay: '0.3s',
							animationDuration: '1.2s',
							animationFillMode: 'both',
							lineHeight: '1.7',
							letterSpacing: '0.3px'
						}}
					>
						Your football diary: Track every kick, every goal, every moment.
						<br />
						<span className="text-lg sm:text-2xl md:text-3xl font-bold block mt-4 opacity-90">
							Beautiful stats, highlights, and memories — all in one place.
						</span>
					</p>

					{/* Button */}
					<div className="fade-up" style={{ animationDelay: '0.6s', animationDuration: '1.2s', animationFillMode: 'both' }}>
						<button
							className="kick-btn"
							onClick={() => navigate('/auth')}
						>
							Enter KickLog
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
