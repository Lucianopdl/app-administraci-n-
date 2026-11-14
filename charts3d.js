// Gráficos 3D con three.js: torta (pie) y barras agrupadas (bars).
// Arrastrá para girar; tocá una porción/barra para ver su valor.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

export const PALETTE = ['#b9f34a', '#38bdf8', '#f472b6', '#fbbf24', '#a78bfa', '#4ade80', '#fb923c', '#2dd4bf', '#f87171', '#e879f9', '#94a3b8', '#facc15'];
const money = n => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n || 0)).toLocaleString('es-AR');

function base(el, sway = false) {
  const W = () => el.clientWidth || 300, H = () => el.clientHeight || 260;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  el.appendChild(renderer.domElement);
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true; el.appendChild(tip);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(4, 8, 6); scene.add(dl);
  const group = new THREE.Group(); scene.add(group);

  // Girar arrastrando
  let t = 0, drag = null, auto = true, rx = 0, ry = 0, moved = false;
  const cv = renderer.domElement;
  cv.style.touchAction = 'pan-y';
  cv.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, y: ev.clientY, rx, ry }; moved = false; auto = false; });
  addEventListener('pointerup', up);
  function up(ev) {
    if (drag && !moved && ev.target === cv) pick(ev);
    drag = null;
  }
  cv.addEventListener('pointermove', ev => {
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    ry = drag.ry + dx * 0.01; rx = Math.max(-0.6, Math.min(0.6, drag.rx + dy * 0.005));
  });

  // Tocar para ver el valor
  const ray = new THREE.Raycaster(), p = new THREE.Vector2();
  let hl = null;
  function pick(ev) {
    const r = cv.getBoundingClientRect();
    p.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera);
    const hit = ray.intersectObjects(group.children, true).find(h => h.object.userData.label);
    if (hl) { hl.material.emissive.setHex(0); hl = null; }
    if (!hit) { tip.hidden = true; return; }
    hl = hit.object; hl.material.emissive.setHex(0x333333);
    tip.textContent = hit.object.userData.label; tip.hidden = false;
    tip.style.left = Math.min(ev.clientX - r.left, r.width - 140) + 'px';
    tip.style.top = Math.max(0, ev.clientY - r.top - 40) + 'px';
  }

  // Animar solo cuando está visible
  let visible = true, raf = 0, dead = false;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); });
  io.observe(el);
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); });
  ro.observe(el);
  function loop() {
    cancelAnimationFrame(raf);
    if (dead || !visible) return;
    if (auto) { t += 0.01; ry = sway ? Math.sin(t) * 0.35 : ry + 0.004; }
    group.rotation.y += (ry - group.rotation.y) * 0.15;
    group.rotation.x += (rx - group.rotation.x) * 0.15;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  function dispose() {
    dead = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
    removeEventListener('pointerup', up);
    group.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
    renderer.dispose(); el.innerHTML = '';
  }
  return { scene, camera, group, loop, dispose };
}

const mat = c => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.45, metalness: 0.1 });

// items: [{label, value, color}]
export function pie(el, items) {
  const b = base(el);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let a0 = Math.PI / 2;
  items.forEach((it, i) => {
    const ang = (it.value / total) * Math.PI * 2;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.absarc(0, 0, 2, a0, a0 + ang, false); sh.lineTo(0, 0);
    const h = 0.35 + 0.5 * (it.value / Math.max(...items.map(x => x.value)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: Math.max(4, Math.ceil(ang * 24)) });
    const m = new THREE.Mesh(geo, mat(it.color || PALETTE[i % PALETTE.length]));
    const mid = a0 + ang / 2, off = items.length > 1 ? 0.08 : 0;
    m.position.set(Math.cos(mid) * off, Math.sin(mid) * off, 0);
    m.userData = { label: `${it.label}: ${money(it.value)} (${Math.round(it.value / total * 100)}%)` };
    b.group.add(m);
    a0 += ang;
  });
  b.group.children.forEach(m => m.rotation.x = -Math.PI / 2); // acostar la torta
  b.camera.position.set(0, 4.2, 5.2); b.camera.lookAt(0, 0, 0);
  b.loop();
  return b.dispose;
}

// cats: ['Nov', 'Dic'...], series: [{label, color, values: [...]}]
export function bars(el, cats, series) {
  const b = base(el, true);
  const all = series.flatMap(s => s.values);
  const max = Math.max(1, ...all.map(Math.abs));
  const nS = series.length, bw = 0.42, gap = 0.5;
  const groupW = nS * bw + gap, width = cats.length * groupW;
  const H = 3;
  cats.forEach((c, ci) => series.forEach((s, si) => {
    const v = s.values[ci] || 0, h = Math.max(0.02, Math.abs(v) / max * H);
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, h, bw * 0.9), mat(s.color));
    m.position.set(ci * groupW + si * bw - width / 2 + bw / 2 + gap / 2, v < 0 ? -h / 2 : h / 2, 0);
    m.userData = { label: `${c} · ${s.label}: ${money(v)}` };
    b.group.add(m);
  }));
  const floor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.04, 1.2), new THREE.MeshStandardMaterial({ color: 0x9a9789, transparent: true, opacity: 0.3 }));
  floor.position.y = -0.02; b.group.add(floor);
  const neg = all.some(v => v < 0);
  const span = Math.max(width, 4);
  b.camera.position.set(0, neg ? 1.2 : H * 0.75, span * 1.15 + 1.5);
  b.camera.lookAt(0, neg ? 0 : H * 0.4, 0);
  b.loop();
  return b.dispose;
}
