(() => {
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '9999';
document.body.appendChild(canvas);

let DPR = Math.max(1, window.devicePixelRatio || 1);
function resize(){
	canvas.width = innerWidth * DPR;
	canvas.height = innerHeight * DPR;
	canvas.style.width = innerWidth + 'px';
	canvas.style.height = innerHeight + 'px';
	ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
window.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('pointerdown', () => mouse.down = true);
window.addEventListener('pointerup', () => mouse.down = false);

let particles = [];
const MAX = Math.floor((innerWidth * innerHeight) / 6000) + 120;
class P {
	constructor(){ this.reset(); }
	reset(){
		this.x = Math.random() * innerWidth;
		this.y = Math.random() * innerHeight;
		const a = Math.random() * Math.PI * 2;
		const s = Math.random() * 1.2 + 0.2;
		this.vx = Math.cos(a) * s;
		this.vy = Math.sin(a) * s;
		this.size = Math.random() * 2.2 + 0.6;
		this.h = Math.random() * 360;
	}
	update(k, audioBoost){
		this.vx += (Math.random() - 0.5) * 0.06 * k;
		this.vy += (Math.random() - 0.5) * 0.06 * k;
		const dx = mouse.x - this.x;
		const dy = mouse.y - this.y;
		const d = Math.hypot(dx, dy) + 0.001;
		const force = (mouse.down ? 0.9 : 0.15) * (1 / d) * 240;
		this.vx += dx * force * 0.0005;
		this.vy += dy * force * 0.0005;
		this.x += this.vx * (1 + audioBoost * 0.5);
		this.y += this.vy * (1 + audioBoost * 0.5);
		this.vx *= 0.985;
		this.vy *= 0.985;
		if(this.x < -50 || this.x > innerWidth + 50 || this.y < -50 || this.y > innerHeight + 50) this.reset();
	}
	draw(ctx){
		ctx.fillStyle = 'hsl(' + this.h + ',80%,' + (30 + this.size * 10) + '%)';
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
	}
}

for(let i = 0; i < MAX; i++) particles.push(new P());

let audioCtx, analyser, dataArray, audioBoost = 0;
async function enableAudio(){
	try{
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const src = audioCtx.createMediaStreamSource(stream);
		analyser = audioCtx.createAnalyser();
		analyser.fftSize = 256;
		src.connect(analyser);
		dataArray = new Uint8Array(analyser.frequencyBinCount);
		return true;
	}catch(e){
		console.warn('Audio failed', e);
		return false;
	}
}

let mode = 0;
function makeUI(){
	const ui = document.createElement('div');
	ui.style.position = 'fixed';
	ui.style.right = '18px';
	ui.style.top = '18px';
	ui.style.zIndex = '10000';
	ui.style.backdropFilter = 'blur(6px)';
	ui.style.background = 'rgba(0,0,0,0.25)';
	ui.style.color = 'white';
	ui.style.padding = '10px';
	ui.style.borderRadius = '10px';
	ui.style.fontFamily = 'system-ui,Segoe UI,Roboto,Arial';
	ui.style.fontSize = '13px';
	const title = document.createElement('div');
	title.textContent = 'Surprise Visuals';
	title.style.fontWeight = '600';
	title.style.marginBottom = '6px';
	ui.appendChild(title);
	const btnAudio = document.createElement('button');
	btnAudio.textContent = 'Enable Mic';
	btnAudio.style.marginRight = '8px';
	btnAudio.onclick = async ()=>{ if(!audioCtx){ btnAudio.textContent = 'Connecting...'; const ok = await enableAudio(); btnAudio.textContent = ok? 'Mic On' : 'Mic Failed'; } };
	ui.appendChild(btnAudio);
	const btnMode = document.createElement('button');
	btnMode.textContent = 'Mode: Particles';
	btnMode.style.marginLeft = '6px';
	btnMode.onclick = ()=>{ mode = (mode + 1) % 3; btnMode.textContent = ['Particles','Flow Field','Starfield'][mode]; };
	ui.appendChild(btnMode);
	const surprise = document.createElement('button');
	surprise.textContent = '✨ Fireworks';
	surprise.style.display = 'block';
	surprise.style.marginTop = '8px';
	surprise.onclick = ()=>{ launchFireworks(); };
	ui.appendChild(surprise);
	document.body.appendChild(ui);
}
makeUI();

let last = performance.now();
function loop(t){
	const dt = Math.min(60, t - last) / 1000; last = t;
	ctx.clearRect(0, 0, innerWidth, innerHeight);
	const g = ctx.createLinearGradient(0, 0, innerWidth, innerHeight);
	g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#001827');
	ctx.fillStyle = g; ctx.fillRect(0, 0, innerWidth, innerHeight);
	if(analyser){ analyser.getByteFrequencyData(dataArray); let sum = 0; for(let i = 0; i < dataArray.length; i++) sum += dataArray[i]; audioBoost = Math.min(1, (sum / dataArray.length) / 160); } else audioBoost = Math.max(0, audioBoost * 0.96);
	if(mode === 0){
		for(let p of particles){ p.update(1, audioBoost); p.draw(ctx); }
		ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.6;
		for(let i = 0; i < particles.length; i += 4){
			const a = particles[i];
			for(let j = i + 1; j < i + 12 && j < particles.length; j++){
				const b = particles[j]; const dx = a.x - b.x, dy = a.y - b.y; const d = dx * dx + dy * dy; if(d < 9000){ ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
			}
		}
	} else if(mode === 1){
		const tscale = t / 2000;
		for(let i = 0; i < particles.length; i++){
			const p = particles[i];
			const angle = Math.sin((p.x * 0.002 + tscale)) * Math.PI * 2 + Math.cos((p.y * 0.002 - tscale)) * Math.PI;
			p.vx += Math.cos(angle) * 0.05; p.vy += Math.sin(angle) * 0.05; p.update(0.4, audioBoost); p.draw(ctx);
		}
	} else {
		ctx.save(); ctx.translate(innerWidth / 2, innerHeight / 2);
		for(let p of particles){ p.x += p.vx * 2 * (1 + audioBoost); p.y += p.vy * 2 * (1 + audioBoost); p.size = Math.max(0.2, p.size + 0.02 * audioBoost); if(Math.hypot(p.x, p.y) > Math.max(innerWidth, innerHeight)) p.reset(); ctx.fillStyle = 'white'; ctx.fillRect(p.x, p.y, p.size, p.size); }
		ctx.restore();
	}
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function launchFireworks(){
	const fwCount = 8;
	for(let i = 0; i < fwCount; i++){
		const cx = Math.random() * innerWidth * 0.8 + innerWidth * 0.1;
		const cy = Math.random() * innerHeight * 0.6 + innerHeight * 0.1;
		createBurst(cx, cy, 100 + Math.floor(Math.random() * 120));
	}
}
function createBurst(x, y, n){
	const sparks = [];
	for(let i = 0; i < n; i++){
		const angle = Math.random() * Math.PI * 2;
		const speed = Math.random() * 4 + 1;
		sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: Math.random() * 1.4 + 0.6, h: Math.random() * 360 });
	}
	let t0 = performance.now();
	function step(now){
		const dt = (now - t0) / 1000; t0 = now;
		ctx.globalCompositeOperation = 'lighter';
		for(let s of sparks){
			s.x += s.vx; s.y += s.vy + 0.03 * (dt * 60);
			s.vx *= 0.99; s.vy *= 0.99; s.life -= dt * 0.8;
			if(s.life > 0){ ctx.fillStyle = 'hsl(' + s.h + ',90%,' + (50 + Math.random() * 10) + '%)'; ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(0.6, s.life * 2), 0, Math.PI * 2); ctx.fill(); }
		}
		for(let i = sparks.length - 1; i >= 0; i--) if(sparks[i].life <= 0) sparks.splice(i, 1);
		if(sparks.length > 0) requestAnimationFrame(step); else ctx.globalCompositeOperation = 'source-over';
	}
	requestAnimationFrame(step);
}

window.addEventListener('keydown', e => {
	if(e.key === 'f') launchFireworks();
	if(e.key === 'm') mode = (mode + 1) % 3;
	if(e.key === 'h') alert('Hints:\n- Click to attract particles\n- Press f for fireworks\n- Enable Mic for audio-reactive visuals');
});

window.addEventListener('resize', ()=>{ particles = []; for(let i=0;i<MAX;i++) particles.push(new P()); });

})();

