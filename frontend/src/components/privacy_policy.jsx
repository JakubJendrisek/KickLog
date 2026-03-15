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
				title: 'At a glance',
				items: [
					'You choose what you enter — your training log stays yours.',
					'We collect the minimum information needed to run KickLog.',
					'We use data to provide features, keep the service secure, and improve reliability.',
					'We do not sell your personal information.',
					'Depending on your location, you may request access, correction, or deletion of your data.',
				],
			},
			{
				title: 'Information you provide',
				items: [
					'Account details: name and email address.',
					'Training content: diary entries, notes, schedules, and other information you add.',
					'Support messages: what you share when you contact us for help.',
				],
			},
			{
				title: 'Information collected automatically',
				items: [
					'Security & operational logs (e.g., IP address, timestamps, basic device/browser info).',
					'Used to protect the service and troubleshoot issues.',
					'Session/authentication data to keep you signed in while you use the app.',
				],
			},
			{
				title: 'How we use your information',
				items: [
					'Provide core KickLog features and maintain your account.',
					'Store and display the content you create (and sync it where available).',
					'Send important service communications (security, account, and support).',
					'Prevent, detect, and investigate abuse, fraud, or unauthorized access.',
					'Improve performance, fix bugs, and develop new features.',
				],
			},
			{
				title: 'When we share information',
				items: [
					'With vendors that help us run KickLog (e.g., hosting/infrastructure).',
					'Only as needed and under confidentiality.',
					'If required by law, regulation, or valid legal process.',
					'During a business transfer (e.g., merger/acquisition), with appropriate safeguards.',
				],
			},
			{
				title: 'Data retention',
				items: [
					'We keep personal data only as long as needed to provide the service.',
					'Some data may be retained longer for legal or security reasons.',
					'If you delete your account or request deletion, we take reasonable steps to delete or anonymize your data (subject to legal requirements and backup cycles).',
					'Security logs may be retained for a limited period.',
				],
			},
			{
				title: 'Security',
				items: [
					'Passwords are stored using a one-way hash (not plain text).',
					'We use reasonable technical and organizational safeguards.',
					'Please use a strong password and keep your credentials private.',
				],
			},
			{
				title: 'Your choices & rights',
				items: [
					'You can update certain account details from within the app where available.',
					'Depending on your location, you may request access to, correction of, or deletion of your personal data.',
					'Depending on your location, you may also object to or restrict certain processing.',
					'Where we rely on consent, you can withdraw it at any time (without affecting processing that already happened).',
				],
			},
			{
				title: 'Questions & updates',
				items: [
					'For privacy questions, contact the person or organization operating your KickLog instance.',
					'We may update this policy as the app evolves; material changes will be communicated in an appropriate way.',
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
					width:min(96vw, 860px);
					max-height:min(92vh, 720px);
					overflow:hidden;
					border-radius:22px;
					border:1px solid rgba(255,255,255,.14);
					background:color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%);
					box-shadow:0 28px 90px rgba(0,0,0,.55);
					color:#0f172a;
					position:relative;
					display:flex;
					flex-direction:column;
				}
				.kl-pp-head{padding:16px 18px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;
					border-bottom:1px solid rgba(15,23,42,.08);
					background:rgba(255,255,255,.55);
					backdrop-filter:blur(10px);
				}
				.kl-pp-title{margin:0;font-weight:950;font-size:20px;letter-spacing:-.015em}
				.kl-pp-close{border:none;background:transparent;cursor:pointer;
					width:36px;height:36px;border-radius:12px;
					display:inline-flex;align-items:center;justify-content:center;
					color:rgba(15,23,42,.72);
					transition:background-color var(--theme-dur,820ms) var(--theme-ease, cubic-bezier(0.2,0.8,0.2,1));
				}
				.kl-pp-close:hover{background:rgba(15,23,42,.06)}
				.kl-pp-body{padding:14px 18px 18px;overflow-y:auto;flex:1;min-height:0}
				.kl-pp-lead{margin:0 0 12px;font-weight:850;font-size:13px;line-height:1.55;color:rgba(15,23,42,.78)}
				.kl-pp-grid{display:grid;grid-template-columns:1fr;gap:10px}
				.kl-pp-section{border:1px solid rgba(15,23,42,.08);border-radius:18px;padding:14px 14px;margin:0;background:rgba(255,255,255,.62)}
				@media (min-width: 760px){
					.kl-pp-grid{grid-template-columns:1fr 1fr;gap:12px}
					.kl-pp-grid .kl-pp-section:first-child{grid-column:1/-1}
				}
				.kl-pp-stRow{display:flex;align-items:center;gap:10px;margin:0 0 8px}
				.kl-pp-secNum{
					width:34px;height:28px;border-radius:12px;
					display:inline-flex;align-items:center;justify-content:center;
					font-weight:950;font-size:12px;letter-spacing:.10em;
					color:rgba(15,23,42,.82);
					background:rgba(15,23,42,.06);
					border:1px solid rgba(15,23,42,.10);
				}
				.kl-pp-st{margin:0;font-weight:950;font-size:12px;letter-spacing:.10em;text-transform:uppercase;opacity:.90}
				.kl-pp-list{margin:0;padding:0;list-style:none;display:grid;gap:8px;counter-reset:kl-pp-item}
				.kl-pp-list li{
					counter-increment:kl-pp-item;
					display:flex;gap:10px;align-items:flex-start;
					font-weight:800;font-size:13px;line-height:1.5;color:rgba(15,23,42,.82)
				}
				.kl-pp-list li::before{
					content: counter(kl-pp-item) ".";
					flex:0 0 auto;
					min-width:18px;
					font-weight:950;
					color:var(--accent-green, #16a34a);
					opacity:.95;
					margin-top:1px;
				}
				.kl-pp-actions{margin-top:14px;padding-top:14px;border-top:1px solid rgba(15,23,42,.08);display:flex;flex-direction:column;gap:10px}
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
						A plain-language summary of how KickLog handles information, so you can make an informed choice.
					</p>

					<div className="kl-pp-grid">
						{policySections.map((s, idx) => (
							<div key={s.title} className="kl-pp-section">
								<div className="kl-pp-stRow">
									<span className="kl-pp-secNum" aria-hidden="true">
										{String(idx + 1).padStart(2, '0')}
									</span>
									<p className="kl-pp-st">{s.title}</p>
								</div>
								<ol className="kl-pp-list">
									{s.items.map((it) => (
										<li key={it}>{it}</li>
									))}
								</ol>
							</div>
						))}
					</div>

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

