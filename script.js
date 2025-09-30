const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const player = {x:80,y:H-120,w:32,h:48,vy:0,onGround:false,color:'#e60000',isLuigi:false};
const gravity = 0.8;
const keys = {};

const platforms = [
  {x:0,y:H-60,w:W,h:60},
  {x:200,y:H-160,w:160,h:20},
  {x:420,y:H-240,w:160,h:20},
  {x:700,y:H-200,w:160,h:20}
];

let twoPhonesConnected = false;
const luigiFlagEl = document.getElementById('luigiFlag');
const statusEl = document.getElementById('status');
const playerNameEl = document.getElementById('playerName');

function updateLuigiUI(){
  luigiFlagEl.textContent = twoPhonesConnected ? 'Sí — Luigi tiene un detalle especial' : 'No';
}

window.addEventListener('keydown', e=>{keys[e.key.toLowerCase()] = true;
  if(e.key.toLowerCase()==='m'){player.isLuigi=false;playerNameEl.textContent='Mario'}
  if(e.key.toLowerCase()==='l'){player.isLuigi=true;playerNameEl.textContent='Luigi'}
});
window.addEventListener('keyup', e=>{keys[e.key.toLowerCase()] = false});

let touchLeft=false,touchRight=false,touchJump=false;
canvas.addEventListener('touchstart', e=>{e.preventDefault();
  const t = e.touches[0];
  if(t.clientX < window.innerWidth/3) touchLeft=true;
  else if(t.clientX > window.innerWidth*2/3) touchRight=true;
  else touchJump=true;
}, {passive:false});
canvas.addEventListener('touchend', e=>{touchLeft=touchRight=touchJump=false});

function physics(){
  if(keys['arrowleft']||keys['a']||touchLeft) player.x -= 4;
  if(keys['arrowright']||keys['d']||touchRight) player.x += 4;
  if((keys[' ' ]||keys['arrowup']||keys['w']||touchJump) && player.onGround){ player.vy = -14; player.onGround=false; }
  player.vy += gravity; player.y += player.vy;
  player.onGround = false;
  for(const p of platforms){
    if(player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 20 && player.vy >=0){
      player.y = p.y - player.h; player.vy = 0; player.onGround = true;
    }
  }
  if(player.x < 0) player.x = 0;
  if(player.x + player.w > W) player.x = W - player.w;
  if(player.y > H) { player.x=80; player.y=H-120; player.vy=0; }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#87ceeb'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#8b5a2b';
  for(const p of platforms) ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.save();
  if(player.isLuigi){
    ctx.shadowColor = twoPhonesConnected ? 'rgba(0,255,0,0.9)' : 'rgba(0,0,0,0)';
    ctx.shadowBlur = twoPhonesConnected ? 18 : 0;
    ctx.fillStyle = twoPhonesConnected ? '#4CAF50' : '#00a0ff';
  } else { ctx.shadowBlur = 0; ctx.fillStyle = player.color; }
  ctx.fillRect(player.x,player.y,player.w,player.h);
  ctx.fillStyle = '#333'; ctx.fillRect(player.x, player.y-8, player.w, 8);
  ctx.restore();
  ctx.fillStyle = '#000'; ctx.font='16px sans-serif';
  ctx.fillText('Controles: flechas / WASD o toca izquierda/derecha/salto', 10,20);
}

function loop(){ physics(); draw(); requestAnimationFrame(loop); }
loop();

const offerBtn = document.getElementById('offerBtn');
const answerBtn = document.getElementById('answerBtn');
const linkbox = document.getElementById('linkbox');
const sdpArea = document.getElementById('sdpArea');
const copyBtn = document.getElementById('copyBtn');
const pasteBtn = document.getElementById('pasteBtn');
const closeBox = document.getElementById('closeBox');

let pc,dc;

async function createPeerConnection(isOffer){
  pc = new RTCPeerConnection();
  pc.onconnectionstatechange = ()=>{ statusEl.textContent = 'ConnState: '+pc.connectionState; }
  pc.ondatachannel = e=>{ dc = e.channel; setupDC(); };
  if(isOffer){
    dc = pc.createDataChannel('game'); setupDC();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sdpArea.value = JSON.stringify(pc.localDescription);
    linkbox.hidden = false;
  }
  pc.onicecandidate = ()=>{ if(pc.localDescription) sdpArea.value = JSON.stringify(pc.localDescription); }
}

function setupDC(){
  dc.onopen = ()=>{ statusEl.textContent = 'DataChannel abierto'; twoPhonesConnected = true; updateLuigiUI(); };
  dc.onclose = ()=>{ statusEl.textContent = 'DataChannel cerrado'; twoPhonesConnected=false; updateLuigiUI(); };
  dc.onmessage = e=>{ console.log('mensaje p2p', e.data); };
}

offerBtn.onclick = async ()=>{ await createPeerConnection(true); };
answerBtn.onclick = async ()=>{ linkbox.hidden = false; sdpArea.focus(); };
copyBtn.onclick = async ()=>{ try{ await navigator.clipboard.writeText(sdpArea.value); alert('Copiado'); }catch(e){ alert('No se pudo copiar: '+e) } };
pasteBtn.onclick = async ()=>{ try{ const t = await navigator.clipboard.readText(); sdpArea.value = t; }catch(e){ alert('No se pudo pegar: '+e) } };
closeBox.onclick = ()=>{ linkbox.hidden=true };

let processed = false;
sdpArea.addEventListener('input', async ()=>{
  if(processed) return;
  try{
    const obj = JSON.parse(sdpArea.value);
    if(obj && obj.type === 'offer' && !pc){
      processed = true;
      await createPeerConnection(false);
      await pc.setRemoteDescription(obj);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      sdpArea.value = JSON.stringify(pc.localDescription);
    } else if(obj && obj.type === 'answer' && pc && pc.signalingState === 'have-local-offer'){
      await pc.setRemoteDescription(obj);
    }
  }catch(e){ }
});

updateLuigiUI();
statusEl.textContent = 'Pulsa "Crear oferta" en un teléfono y copia el texto. En el otro, pega la oferta y pulsa. Luego copia la respuesta y pégala de vuelta. Cuando el canal abre, Luigi tiene su detalle.';
