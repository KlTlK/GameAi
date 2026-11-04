import './style.css';
import * as THREE from 'three';

const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = n => n === 0 ? 'green' : redNumbers.has(n) ? 'red' : 'black';
const colorName = { red: 'красное', black: 'чёрное', green: 'зеро' };
const $ = selector => document.querySelector(selector);
const format = n => new Intl.NumberFormat('ru-RU').format(n);
const STORAGE = 'velvet-roulette-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORAGE) || '{}') || {}; } catch { /* storage may be unavailable */ }
let balance = Number.isSafeInteger(saved.balance) && saved.balance >= 0 ? saved.balance : 2500;
let history = Array.isArray(saved.history) ? saved.history.filter(n => Number.isInteger(n) && n >= 0 && n <= 36).slice(0, 8) : [];
let stake = 100;
let bet = 'red';
let spinning = false;
const persist = () => { try { localStorage.setItem(STORAGE, JSON.stringify({ balance, history })); } catch { /* game still works without storage */ } };
function renderUI() {
  $('#balance').textContent = format(balance);
  $('#stake').textContent = format(stake);
  $('#history').replaceChildren();
  if (!history.length) {
    const empty = document.createElement('span'); empty.className = 'empty-history'; empty.textContent = 'Здесь появятся результаты игры'; $('#history').append(empty);
  }
  history.forEach(n => { const item = document.createElement('span'); item.className = `history-ball ${colorOf(n)}`; item.textContent = n; item.title = `${n} — ${colorName[colorOf(n)]}`; $('#history').append(item); });
  document.querySelectorAll('.bet-option').forEach(button => { const selected = button.dataset.bet === bet; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); button.disabled = spinning; });
  document.querySelectorAll('.chip').forEach(button => { const selected = Number(button.dataset.stake) === stake; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); button.disabled = spinning; });
  $('#spin').disabled = spinning;
  $('#reset').disabled = spinning;
}
function message(text, type = '') { $('#message').textContent = text; $('#message').className = `game-message ${type}`; }
document.querySelectorAll('.bet-option').forEach(button => button.addEventListener('click', () => { bet = button.dataset.bet; renderUI(); }));
document.querySelectorAll('.chip').forEach(button => button.addEventListener('click', () => { stake = Number(button.dataset.stake); renderUI(); }));
$('#reset').addEventListener('click', () => { balance = 2500; persist(); renderUI(); message('Баланс восстановлен до 2 500 фишек.'); });
$('#rules-open').addEventListener('click', () => $('#rules').showModal());
$('#rules-close').addEventListener('click', () => $('#rules').close());
$('#rules-ok').addEventListener('click', () => $('#rules').close());
$('#rules').addEventListener('click', e => { if (e.target === $('#rules')) $('#rules').close(); });

// Everything in the scene is generated locally: no models or external assets are required.
const canvas = $('#scene');
let renderer, scene, camera, wheel, ball, animateSpin;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xe5e6c9, 0x19271b, 2.1));
  const key = new THREE.DirectionalLight(0xffe5ac, 3.1); key.position.set(-3, 8, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8d8c2, 1.5); rim.position.set(5, 5, -5); scene.add(rim);
  const mat = (color, metalness = 0, roughness = .5) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const gold = mat(0xb48b4b, .8, .25), goldLight = mat(0xe5c785, .75, .2), darkWood = mat(0x3c2119, .25, .34), wood = mat(0x74432a, .2, .35), felt = mat(0x203f31, 0, .95), dark = mat(0x1d2822, .1, .5), red = mat(0x9d382d, .15, .45), green = mat(0x286449, .1, .5);
  function cylinder(radiusTop, radiusBottom, height, material, y, parent = scene, segments = 96) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material); mesh.position.y = y; parent.add(mesh); return mesh; }
  function torus(radius, tube, material, y, parent = scene) { const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 120), material); mesh.rotation.x = Math.PI / 2; mesh.position.y = y; parent.add(mesh); return mesh; }
  // A velvet table and a layered, polished wooden bowl give the wheel its depth.
  cylinder(4.4, 4.4, .20, darkWood, -.70);
  cylinder(4.25, 4.25, .07, felt, -.58);
  torus(4.22, .055, gold, -.52);
  cylinder(2.45, 2.30, .25, darkWood, -.36);
  cylinder(2.43, 2.43, .09, gold, -.20);
  cylinder(2.37, 2.37, .17, wood, -.10);
  torus(2.31, .08, goldLight, .01);
  cylinder(2.21, 2.21, .08, darkWood, .01);
  torus(2.18, .035, gold, .07);
  wheel = new THREE.Group(); scene.add(wheel);
  cylinder(2.10, 2.10, .08, wood, .06, wheel);
  cylinder(1.99, 1.99, .035, dark, .115, wheel);
  // Each pocket and its label share the same angle as the eventual ball target.
  const step = Math.PI * 2 / numbers.length;
  numbers.forEach((number, i) => {
    const theta = i * step;
    const wedge = new THREE.Mesh(new THREE.RingGeometry(1.30, 1.91, 8, 1, theta, step), colorOf(number) === 'red' ? red : colorOf(number) === 'green' ? green : dark);
    wedge.rotation.x = -Math.PI / 2; wedge.position.y = .14; wheel.add(wedge);
    const separator = new THREE.Mesh(new THREE.BoxGeometry(.61, .022, .012), gold);
    separator.position.set(Math.cos(theta) * 1.605, .16, -Math.sin(theta) * 1.605); separator.rotation.y = theta; wheel.add(separator);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 128; labelCanvas.height = 128;
    const context = labelCanvas.getContext('2d'); context.fillStyle = '#fff5de'; context.font = 'bold 64px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(number), 64, 66);
    const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(.24, .24), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    const mid = theta + step / 2; label.rotation.x = -Math.PI / 2; label.position.set(Math.cos(mid) * 1.76, .17, -Math.sin(mid) * 1.76); wheel.add(label);
  });
  torus(1.93, .025, goldLight, .17, wheel); torus(1.29, .035, goldLight, .18, wheel);
  cylinder(1.25, 1.25, .07, gold, .15, wheel);
  cylinder(1.18, 1.18, .11, wood, .21, wheel);
  cylinder(.92, 1.13, .25, darkWood, .36, wheel);
  cylinder(.72, .91, .10, wood, .52, wheel);
  torus(.72, .025, goldLight, .58, wheel);
  cylinder(.20, .28, .19, gold, .64, wheel);
  cylinder(.10, .16, .28, goldLight, .83, wheel);
  const spindle = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), goldLight); spindle.position.y = 1.01; wheel.add(spindle);
  for (let i = 0; i < 4; i++) { const spoke = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.2, 12), goldLight); spoke.rotation.z = Math.PI / 2; spoke.rotation.y = i * Math.PI / 2; spoke.position.y = .91; wheel.add(spoke); const tip = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), goldLight); tip.position.set(Math.cos(i * Math.PI / 2) * .6, .91, -Math.sin(i * Math.PI / 2) * .6); wheel.add(tip); }
  ball = new THREE.Mesh(new THREE.SphereGeometry(.085, 24, 16), mat(0xfff6df, .1, .2)); wheel.add(ball); ball.position.set(1.57, .25, 0);
  // A few decorative stacks on the felt make the table feel inhabited.
  const chipColors = [mat(0xb94d3c), mat(0xdec99b), mat(0x324c3e)];
  [[-2.8,-.8,0],[-2.9,-.8,1],[-3,-.8,2],[2.85,-1,2],[2.95,-1,0]].forEach(([x,z,c], i) => { const chip = new THREE.Group(); chip.position.set(x, -.51 + (i < 3 ? i * .055 : (i-3)*.055), z); cylinder(.30,.30,.05,chipColors[c],0,chip,40); torus(.25,.012,goldLight,.03,chip); scene.add(chip); });
  function resize() { const width = canvas.clientWidth, height = canvas.clientHeight; if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.position.set(0, 7.5, 9.5); camera.lookAt(-.45, 0, -.5); camera.fov = width < 700 ? 46 : 35; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  let previous = performance.now();
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min((now - previous) / 1000, .05); previous = now; if (animateSpin) animateSpin(now); else wheel.rotation.y += dt * .035; renderer.render(scene, camera); }
  requestAnimationFrame(frame); $('#loading').remove();
} catch (error) {
  console.error('WebGL initialization failed:', error);
  $('#loading').textContent = '3D не поддерживается вашим браузером';
}

function randomIndex(max) {
  // Rejection sampling avoids modulo bias when crypto is available.
  if (globalThis.crypto?.getRandomValues) { const limit = Math.floor(0x100000000 / max) * max; const value = new Uint32Array(1); do { crypto.getRandomValues(value); } while (value[0] >= limit); return value[0] % max; }
  return Math.floor(Math.random() * max);
}
$('#spin').addEventListener('click', () => {
  if (spinning) return;
  if (stake > balance) { message('Недостаточно фишек. Выберите ставку поменьше или пополните баланс.', 'lose'); return; }
  spinning = true; balance -= stake; persist(); renderUI(); message('Колесо вращается. Удачи!');
  const index = randomIndex(numbers.length), result = numbers[index], chosenBet = bet, chosenStake = stake;
  const finish = () => {
    const won = colorOf(result) === chosenBet;
    const payout = won ? chosenStake * (chosenBet === 'green' ? 36 : 2) : 0;
    balance += payout; history.unshift(result); history = history.slice(0, 8); spinning = false; persist(); renderUI();
    message(won ? `${result} · ${colorName[colorOf(result)]}. Вы выиграли ${format(payout)} фишек!` : `${result} · ${colorName[colorOf(result)]}. В этот раз не повезло.`, won ? 'win' : 'lose');
  };
  if (!wheel || !ball) { setTimeout(finish, 1000); return; }
  const start = performance.now(), duration = 6000, initialRotation = wheel.rotation.y;
  const startAngle = Math.atan2(-ball.position.z, ball.position.x);
  const targetAngle = (index + .5) * Math.PI * 2 / numbers.length;
  const angleDistance = ((targetAngle - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * 9;
  animateSpin = now => {
    const t = Math.min((now - start) / duration, 1), ease = 1 - Math.pow(1 - t, 3);
    wheel.rotation.y = initialRotation + Math.PI * 2 * 6 * ease;
    const angle = startAngle + angleDistance * ease;
    const radius = 1.57 + .43 * (1 - ease);
    ball.position.set(Math.cos(angle) * radius, .25 + .08 * (1 - ease), -Math.sin(angle) * radius);
    if (t >= 1) { animateSpin = null; finish(); }
  };
});
renderUI();
