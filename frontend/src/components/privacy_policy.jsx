import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function PrivacyPolicyModal({ open, onClose, onConfirm }) {
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		if (!open) return;
		setChecked(false);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e) => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [open, onClose]);

	const policySections = useMemo(
		() => [
			{
				title: 'What we store',
				items: [
					'Account data: name, email.',
					'Your training diary data you create inside the app.',
					'A sign-in token saved in your browser (localStorage) to keep you logged in.',
				],
			},
			{
				title: 'Password security',
				items: ['Passwords are not stored in plain text. They are stored as a secure hash on the server.'],
			},
			{
				title: 'How we use it',
				items: [
					'To create and manage your account.',
					'To keep you signed in and enable the app features.',
				],
			},
		],
		[]
	);

	if (!open) return null;

	return (
		<div
			className="kl-pp-overlay"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose?.();
			}}
		>
			<style>{`
				.kl-pp-overlay{
					position:fixed;inset:0;z-index:9999;
					background:rgba(2,6,23,.58);
					backdrop-filter:blur(10px);
					display:flex;align-items:center;justify-content:center;
					padding:18px;
				}
				.kl-pp-modal{
					width:min(92vw,560px);
					border-radius:22px;
					border:1px solid rgba(255,255,255,.14);
					background:color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%);
					box-shadow:0 28px 90px rgba(0,0,0,.55);
					color:#0f172a;
					position:relative;
				}
				.kl-pp-head{padding:16px 16px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px}
				.kl-pp-title{margin:0;font-weight:950;font-size:18px;letter-spacing:-.01em}
				.kl-pp-close{border:none;background:transparent;cursor:pointer;
					width:36px;height:36px;border-radius:12px;
					display:inline-flex;align-items:center;justify-content:center;
					color:rgba(15,23,42,.72);
					transition:background-color var(--theme-dur,820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
				}
				.kl-pp-close:hover{background:rgba(15,23,42,.06)}
				.kl-pp-body{padding:0 16px 16px}
				.kl-pp-lead{margin:0 0 12px;font-weight:850;font-size:13px;line-height:1.5;color:rgba(15,23,42,.78)}
				.kl-pp-section{border:1px solid rgba(15,23,42,.08);border-radius:16px;padding:12px 12px;margin-top:10px;background:rgba(255,255,255,.62)}
				.kl-pp-st{margin:0 0 6px;font-weight:950;font-size:12px;letter-spacing:.10em;text-transform:uppercase;opacity:.85}
				.kl-pp-list{margin:0;padding-left:18px;display:grid;gap:6px}
				.kl-pp-list li{font-weight:800;font-size:13px;line-height:1.5;color:rgba(15,23,42,.80)}
				.kl-pp-actions{margin-top:14px;display:flex;flex-direction:column;gap:10px}
				.kl-pp-check{display:flex;align-items:flex-start;gap:10px}
				.kl-pp-check input{margin-top:3px;width:16px;height:16px;accent-color:var(--accent-green, #16a34a)}
				.kl-pp-check label{font-weight:900;font-size:13px;line-height:1.45;color:rgba(15,23,42,.84)}
				.kl-pp-confirm{width:100%;padding:14px 18px;border:none;border-radius:999px;cursor:pointer;
					font-weight:900;letter-spacing:.10em;font-size:12px;text-transform:uppercase;color:white;
					background:linear-gradient(135deg,
						color-mix(in srgb, var(--accent-green, #16a34a) 78%, #0b1220),
						color-mix(in srgb, var(--accent-green, #16a34a) 58%, #0b1220));
					box-shadow:0 18px 52px rgba(0,0,0,.28);
					transition:transform var(--theme-dur,820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1)), filter var(--theme-dur,820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
				}
				.kl-pp-confirm:disabled{cursor:not-allowed;opacity:.65;filter:saturate(.9)}
				.kl-pp-confirm:not(:disabled):hover{transform:translateY(-1px);filter:saturate(1.06)}
				@media (prefers-reduced-motion: reduce){
					.kl-pp-confirm{transition:none !important}
				}
			`}</style>

			<div
				className="kl-pp-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Privacy policy"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="kl-pp-head">
					<h2 className="kl-pp-title">Privacy policy</h2>
					<button type="button" className="kl-pp-close" onClick={onClose} aria-label="Close privacy policy" title="Close">
						<FaTimes size={16} aria-hidden="true" />
					</button>
				</div>
				<div className="kl-pp-body">
					<p className="kl-pp-lead">
						This is a short summary of how KickLog uses data so you can make an informed choice.
					</p>

					{policySections.map((s) => (
						<div key={s.title} className="kl-pp-section">
							<p className="kl-pp-st">{s.title}</p>
							<ul className="kl-pp-list">
								{s.items.map((it) => (
									<li key={it}>{it}</li>
								))}
							</ul>
						</div>
					))}

					<div className="kl-pp-actions">
						<div className="kl-pp-check">
							<input
								id="kl-pp-agree"
								type="checkbox"
								checked={checked}
								onChange={(e) => setChecked(e.target.checked)}
							/>
							<label htmlFor="kl-pp-agree">I have read and agree to the privacy policy.</label>
						</div>
						<button
							type="button"
							className="kl-pp-confirm"
							disabled={!checked}
							onClick={() => {
								onConfirm?.();
								onClose?.();
							}}
						>
							Confirm
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

