// 지형 · 물 · 하늘 · 낮밤 조명
import * as THREE from 'three';
import { G, clamp, lerp, smooth, makeNoise, rng, emit } from './util.js';
import { DECOR_GEO, FOLIAGE, windU } from './geo.js';

export const SIZE = 460, SEG = 230, HALF = SIZE / 2;
const N = SEG + 1, H = new Float32Array(N * N);
const noise = makeNoise(31337), noise2 = makeNoise(77);
const fbm = (x, z, o) => { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += noise(x * f, z * f) * a; n += a; a *= .5; f *= 2; } return s / n; };

function rawHeight(x, z) {
  const d = Math.hypot(x, z);
  let e = 5.5 + fbm(x * .007, z * .007, 4) * 15;
  const m = smooth(.08, .5, fbm(x * .0042 + 31, z * .0042 - 17, 2)) * smooth(75, 140, d);
  const ridge = 1 - Math.abs(noise(x * .011 + 9, z * .011 + 3)) * .9;
  e += m * (8 + ridge * ridge * 32);
  e += noise(x * .06, z * .06) * .35;
  e = lerp(e, 3.2, smooth(48, 10, d) * .92);
  e = lerp(e, -9, smooth(.6, .95, d / HALF + noise(x * .009 + 5, z * .009) * .1));
  return e;
}
export function heightAt(x, z) {
  const fx = clamp((x + HALF) / SIZE * SEG, 0, SEG - .001), fz = clamp((z + HALF) / SIZE * SEG, 0, SEG - .001);
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * N + ix;
  return lerp(lerp(H[i], H[i + 1], tx), lerp(H[i + N], H[i + N + 1], tx), tz);
}
export function slopeAt(x, z) {
  const e = 1.5; return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}
// 기후 지역: [설원 정도, 사막 정도] (0..1). 북쪽(-z)은 설원, 서쪽(-x)은 사막
export function biomeAt(x, z) {
  const n = noise2(x * .01 + 40, z * .01 - 7) * 26, snow = smooth(-58, -98, z + n);
  return [snow, smooth(-70, -110, x + n * .8) * (1 - snow)];
}
export const OUTPOSTS = []; // 마을 위치: { kind, x, y, z, rot }
function findOutposts() {
  // 중심에서 바깥으로 훑으며 '평평하고 물가에 가까운 땅'을 찾는다
  const ray = (a, ok, minD = 45) => { let best = null;
    for (let d = minD; d < 215; d += 2) { const x = Math.sin(a) * d, z = Math.cos(a) * d, h = heightAt(x, z);
      if (h < .2) { if (best) break; continue; }
      if (h > 1.7 && h < 7 && slopeAt(x, z) < .22 && ok(x, z)) { best = { x, z, y: h, rot: a }; if (!ok.shore) break; } }
    return best; };
  const pick = (kind, angles, ok, minD) => { for (const a of angles) { const o = ray(a, ok, minD); if (o && !OUTPOSTS.some(q => Math.hypot(q.x - o.x, q.z - o.z) < 70)) { OUTPOSTS.push({ kind, ...o }); return; } } };
  const grass = (x, z) => { const b = biomeAt(x, z); return b[0] < .2 && b[1] < .2; }, shore = (x, z) => grass(x, z); shore.shore = 1;
  const sweep = (c) => [0, .25, -.25, .5, -.5, .8, -.8, 1.1, -1.1].map(d => c + d);
  pick('fish', sweep(1.2), shore, 45);
  pick('farm', sweep(0), grass, 70);
  pick('lodge', sweep(Math.PI), (x, z) => biomeAt(x, z)[0] > .7, 80);
  pick('bazaar', sweep(-Math.PI / 2), (x, z) => biomeAt(x, z)[1] > .7, 90);
}
export const forestAt = (x, z) => noise2(x * .012, z * .012) + noise2(x * .04, z * .04) * .3;

const cSand = new THREE.Color('#d8c48c'), cGrassA = new THREE.Color('#8fd058'), cGrassB = new THREE.Color('#5fae48'), cForest = new THREE.Color('#4a9a48'),
  cDesert = new THREE.Color('#dfbd78'), cSnowG = new THREE.Color('#edf3f7'),
  cRock = new THREE.Color('#8d8f8c'), cRock2 = new THREE.Color('#a9a79f'), cSnow = new THREE.Color('#f6fafc'), cSea = new THREE.Color('#bfae7c'), tmp = new THREE.Color();
function terrainColor(x, z, h, sl, out) {
  const g = noise(x * .035, z * .035) * .5 + .5, f = smooth(-.05, .3, forestAt(x, z));
  out.copy(cGrassA).lerp(cGrassB, g).lerp(cForest, f * .7);
  const bm = biomeAt(x, z); out.lerp(cDesert, bm[1] * (.82 + g * .18)).lerp(cSnowG, bm[0] * (.86 + g * .14));
  out.lerp(cSand, smooth(1.9, .8, h + g * .5) * (1 - bm[0] * .7));
  if (h < 0) out.lerp(cSea, smooth(0, -3, h));
  tmp.copy(cRock).lerp(cRock2, g);
  out.lerp(tmp, Math.max(smooth(.62, .95, sl), smooth(22, 28, h + g * 3)));
  out.lerp(cSnow, smooth(33, 37, h + g * 3) * smooth(1.2, .6, sl));
  return out;
}

let water, sky, sun, hemi, stars, sunSprite, moonSprite, clouds = [], grassMat;
export let mapCanvas;

export function createWorld() {
  const scene = G.scene;
  // ── 지형
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { H[i] = rawHeight(pos.getX(i), pos.getZ(i)); pos.setY(i, H[i]); }
  findOutposts();
  const col = new Float32Array(pos.count * 3), c = new THREE.Color();
  mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = N;
  const mctx = mapCanvas.getContext('2d'), img = mctx.createImageData(N, N);
  const hTex = new Uint8Array(N * N * 4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = H[i];
    terrainColor(x, z, h, slopeAt(x, z), c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    hTex[i * 4] = clamp((h + 8) / 16, 0, 1) * 255; hTex[i * 4 + 3] = 255;
    if (h < 0) c.setRGB(.18, .5, .72).lerp(tmp.setRGB(.08, .26, .5), smooth(0, -6, h));
    c.convertLinearToSRGB();
    const sh = 1 + clamp((h - (H[i + 1] ?? h)) * .12, -.25, .25);
    img.data[i * 4] = c.r * 255 * sh; img.data[i * 4 + 1] = c.g * 255 * sh; img.data[i * 4 + 2] = c.b * 255 * sh; img.data[i * 4 + 3] = 255;
  }
  mctx.putImageData(img, 0, 0);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // 지형 디테일 질감: 부드러운 얼룩 + 고운 입자 (타일링되도록 가장자리를 감싸 그린다)
  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dx = dc.getContext('2d'), dr = rng(11);
  dx.fillStyle = '#eeeeee'; dx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    const bx = dr() * 256, by = dr() * 256, br = 4 + dr() * 22, lite = dr() < .5;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      const g = dx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, br);
      g.addColorStop(0, lite ? 'rgba(255,255,255,.16)' : 'rgba(90,100,80,.16)'); g.addColorStop(1, 'rgba(128,128,128,0)');
      dx.fillStyle = g; dx.fillRect(bx + ox - br, by + oy - br, br * 2, br * 2);
    }
  }
  const di = dx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < di.data.length; i += 4) { const k = (dr() - .5) * 26; di.data[i] += k; di.data[i + 1] += k; di.data[i + 2] += k; }
  dx.putImageData(di, 0, 0);
  const detail = new THREE.CanvasTexture(dc); detail.wrapS = detail.wrapT = THREE.RepeatWrapping; detail.repeat.set(SIZE / 9, SIZE / 9);
  detail.colorSpace = THREE.SRGBColorSpace; detail.anisotropy = 4;
  for (let i = 0; i < col.length; i++) col[i] *= 1.16;
  const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: detail }));
  terrain.receiveShadow = true; scene.add(terrain);

  // ── 물 (지형 높이맵으로 수심·물거품 표현)
  const ht = new THREE.DataTexture(hTex, N, N, THREE.RGBAFormat);
  ht.magFilter = ht.minFilter = THREE.LinearFilter; ht.needsUpdate = true;
  water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uT: { value: 0 }, uH: { value: null }, uSky: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() },
      uSunCol: { value: new THREE.Color() }, uLight: { value: 1 },
    }]),
    vertexShader: `varying vec3 vW;
#include <fog_pars_vertex>
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT,uLight; uniform sampler2D uH; uniform vec3 uSky,uSunDir,uSunCol; varying vec3 vW;
#include <fog_pars_fragment>
      void main(){
        vec2 uv=(vW.xz+${HALF.toFixed(1)})/${SIZE.toFixed(1)};
        float h=-8.; if(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.) h=texture2D(uH,uv).r*16.-8.;
        float d=max(-h,0.);
        vec3 n=normalize(vec3(sin(vW.x*.5+uT*1.3)*.06+sin(vW.z*1.1-uT)*.04+sin((vW.x+vW.z)*2.3+uT*2.)*.02,1.,cos(vW.z*.45+uT*1.1)*.06+cos(vW.x*.9+uT*.7)*.04));
        vec3 v=normalize(cameraPosition-vW);
        float fres=pow(1.-max(dot(n,v),0.),3.);
        vec3 col=mix(vec3(.25,.82,.78),vec3(.05,.3,.55),smoothstep(0.,4.5,d))*uLight;
        col=mix(col,uSky,fres*.4);
        col+=uSunCol*pow(max(dot(reflect(-uSunDir,n),v),0.),90.)*1.2;
        float foam=smoothstep(.55,.0,d+sin(uT*1.6+d*7.+vW.x*.3)*.18)*step(.001,d+.6);
        foam+=smoothstep(.96,1.,sin(vW.x*.7+uT)*sin(vW.z*.6-uT*.8))*.12;
        col=mix(col,vec3(1.)*uLight,clamp(foam,0.,1.)*.8);
        gl_FragColor=vec4(col,mix(.55,.93,clamp(smoothstep(0.,1.6,d)+fres,0.,1.)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }));
  water.material.uniforms.uH.value = ht; water.position.y = 0; scene.add(water);

  // ── 하늘
  sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uT: { value: 0 }, uNight: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uTop,uHor,uSunDir,uSunCol; uniform float uT,uNight; varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
      float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=vn(p)*a; p=p*2.03+vec2(17.,9.); a*=.5; } return s; }
      void main(){
        vec3 d=normalize(vP); float h=d.y;
        vec3 col=mix(uHor,uTop,pow(clamp(h*1.25+.02,0.,1.),.6));
        float sd=max(dot(d,uSunDir),0.), md=max(dot(d,-uSunDir),0.);
        col+=uSunCol*(pow(sd,5.)*.14+pow(sd,40.)*.4)*(1.-uNight);   // 태양 후광
        col+=vec3(.45,.55,1.)*pow(md,50.)*.22*uNight;                // 달무리
        if(h>.015){                                                  // 높은 새털구름
          vec2 uv=d.xz/(h+.14)*1.3+vec2(uT*.01,uT*.004);
          float c=smoothstep(.45,.8,fbm(uv))*smoothstep(.015,.25,h);
          vec3 cc=mix(uHor*1.1+uSunCol*.25*pow(sd,3.),vec3(1.-uNight*.82),.5)+uSunCol*.08*(1.-uNight);
          col=mix(col,cc,c*(.7-uNight*.35));
        }
        gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  const sp = new Float32Array(900 * 3), r = rng(5);
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, y = r() * .95 + .03, k = Math.sqrt(1 - y * y);
    sp.set([Math.cos(a) * k * 1300, y * 1300, Math.sin(a) * k * 1300], i * 3);
  }
  stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)),
    new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false; scene.add(stars);

  const glow = (inner, outer) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(.22, inner); gr.addColorStop(.3, outer); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    s.material.color.setScalar(2.4); s.scale.setScalar(330); s.renderOrder = -9; scene.add(s); return s;
  };
  sunSprite = glow('rgba(255,250,225,1)', 'rgba(255,215,140,.38)');
  moonSprite = glow('rgba(225,235,255,1)', 'rgba(150,180,255,.22)'); moonSprite.scale.setScalar(200);

  // ── 조명
  hemi = new THREE.HemisphereLight('#cfe8ff', '#6a7a4a', 1); scene.add(hemi);
  sun = new THREE.DirectionalLight('#fff', 2.5); sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = sc.bottom = -46; sc.right = sc.top = 46; sc.near = 1; sc.far = 260;
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .06;
  scene.add(sun, sun.target);
  scene.fog = new THREE.Fog('#bfe3ff', 110, 460);

  // ── 구름
  const cg = DECOR_GEO.cloud(), cm = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .92, fog: false });
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(cg, cm); m.position.set((r() - .5) * 900, 95 + r() * 50, (r() - .5) * 900);
    m.scale.setScalar(1.2 + r() * 2); m.rotation.y = r() * 6; scene.add(m); clouds.push(m);
  }

  // ── 풀 · 꽃 · 덤불 (인스턴스)
  grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (s) => {
    s.uniforms.uTime = windU;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       float ph=instanceMatrix[3].x*.35+instanceMatrix[3].z*.27;
       transformed.x+=sin(uTime*1.8+ph)*.22*position.y; transformed.z+=cos(uTime*1.3+ph*1.3)*.14*position.y;`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal=vec3(0.,1.,0.);');
    // 양면 렌더링에서도 뒷면이 어두워지지 않게 법선 뒤집기를 생략
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', 'vec3 normal=normalize(vNormal); vec3 nonPerturbedNormal=normal;');
  };
  const dm = new THREE.Object3D(), gc = new THREE.Color();
  const scatter = (geo, mat, count, rule, tint, sMin, sMax, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, count); let n = 0, guard = 0;
    while (n < count && guard++ < count * 30) {
      const x = (r() - .5) * SIZE * .92, z = (r() - .5) * SIZE * .92, h = heightAt(x, z);
      if (!rule(x, z, h)) continue;
      dm.position.set(x, h - .03, z); dm.rotation.set(0, r() * 6.28, 0); dm.scale.setScalar(lerp(sMin, sMax, r())); dm.updateMatrix();
      im.setMatrixAt(n, dm.matrix); im.setColorAt(n, tint(gc, r(), x, z)); n++;
    }
    im.count = n; im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return im;
  };
  const meadow = (x, z, h) => { if (!(h > 1.6 && h < 21 && slopeAt(x, z) < .6)) return false; const b = biomeAt(x, z); return b[0] + b[1] < .35 && !OUTPOSTS.some(o => Math.hypot(o.x - x, o.z - z) < 7); };
  scatter(DECOR_GEO.grass(), grassMat, G.settings.quality === 'low' ? 8000 : 24000, (x, z, h) => meadow(x, z, h) && noise(x * .05, z * .05) > -.2,
    (c, t, x, z) => c.set('#6fc24c').lerp(tmp.set('#a4dc62'), t).lerp(tmp.set('#4a9a48'), smooth(-.05, .3, forestAt(x, z)) * .6), .7, 1.5);
  const fcols = ['#ffffff', '#ffd9ec', '#fff1a8', '#c8d8ff', '#ffb3b3'];
  scatter(DECOR_GEO.flower(), FOLIAGE, 1400, (x, z, h) => meadow(x, z, h) && noise2(x * .03, z * .03) > .12, (c, t) => c.set(fcols[(t * 5) | 0]), .9, 1.6);

  // ── 반딧불이(밤) / 떠다니는 꽃가루(낮)
  const fc = document.createElement('canvas'); fc.width = fc.height = 32; const fx2 = fc.getContext('2d'), fg = fx2.createRadialGradient(16, 16, 0, 16, 16, 16);
  fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(.3, 'rgba(255,255,255,.5)'); fg.addColorStop(1, 'rgba(255,255,255,0)'); fx2.fillStyle = fg; fx2.fillRect(0, 0, 32, 32);
  for (let i = 0; i < FLY; i++) flyBase.push(r() * FBOX, .4 + r() * 3.2, r() * FBOX, r() * 6.28);
  flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLY * 3), 3)),
    new THREE.PointsMaterial({ size: .32, map: new THREE.CanvasTexture(fc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false; scene.add(flies);
}
const FLY = 110, FBOX = 64, flyBase = []; let flies;
function updateFlies(focus) {
  const p = flies.geometry.attributes.position, t = G.clock, snowing = biomeAt(focus.x, focus.z)[0] > .5; // 설원에서는 눈송이로 바뀐다
  for (let i = 0; i < FLY; i++) {
    const bx = flyBase[i * 4], bz = flyBase[i * 4 + 2], ph = flyBase[i * 4 + 3];
    // 플레이어 주변 상자 안에서 월드에 고정된 채 반복 배치
    const x = bx + Math.round((focus.x - bx) / FBOX) * FBOX + Math.sin(t * .5 + ph) * 1.5, z = bz + Math.round((focus.z - bz) / FBOX) * FBOX + Math.cos(t * .4 + ph * 1.7) * 1.5;
    p.setXYZ(i, x, Math.max(heightAt(x, z), 0) + (snowing ? 5.5 - ((t * 1.4 + ph * 3) % 5.5) : flyBase[i * 4 + 1] + Math.sin(t * .9 + ph * 2.3) * .5), z);
  }
  p.needsUpdate = true;
  const n = G.night, m = flies.material;
  if (snowing) { m.color.setRGB(1.1, 1.15, 1.25); m.size = .22; m.opacity = .9; return; }
  m.color.setRGB(lerp(.55, 2.2, n), lerp(.55, 2.8, n), lerp(.45, .9, n)); m.size = lerp(.14, .34, n); m.opacity = lerp(.5, 1, n) * (.75 + Math.sin(t * 3) * .25);
}

// ── 낮밤 색상 키프레임: [시각, 하늘 위, 지평선, 태양색, 태양 세기, 환경광 세기]
const K = [
  [0, '#070d2b', '#1a2850', '#8ea6ff', .5, .34], [.2, '#0b1338', '#27325e', '#8ea6ff', .5, .36],
  [.25, '#3a4f96', '#f0916a', '#ffb07a', .9, .55], [.3, '#4f93e0', '#f3d2b0', '#ffd9a8', 2.0, .85],
  [.38, '#3b8fe8', '#a9d8fb', '#fff3de', 2.35, 1.0], [.64, '#3b8fe8', '#a9d8fb', '#fff3de', 2.35, 1.0],
  [.72, '#5674c4', '#ffab70', '#ff9c5c', 1.9, .95], [.77, '#2d3676', '#d9705f', '#ff8a5c', .8, .7],
  [.82, '#0e1640', '#2c3563', '#8ea6ff', .45, .38], [1, '#070d2b', '#1a2850', '#8ea6ff', .5, .34],
].map(k => [k[0], new THREE.Color(k[1]), new THREE.Color(k[2]), new THREE.Color(k[3]), k[4], k[5]]);
const cTop = new THREE.Color(), cHor = new THREE.Color(), cSun = new THREE.Color(), dir = new THREE.Vector3();

export function updateWorld(dt, focus) {
  const t = G.tod; let i = 0; while (K[i + 1][0] < t) i++;
  const a = K[i], b = K[i + 1], f = (t - a[0]) / (b[0] - a[0]);
  cTop.copy(a[1]).lerp(b[1], f); cHor.copy(a[2]).lerp(b[2], f); cSun.copy(a[3]).lerp(b[3], f);
  const sI = lerp(a[4], b[4], f), hI = lerp(a[5], b[5], f);
  G.night = 1 - smooth(.22, .3, t) * smooth(.8, .73, t);

  const ang = (t - .25) * Math.PI * 2;
  dir.set(Math.cos(ang), Math.sin(ang), .35).normalize();
  const day = dir.y > -.05, ld = day ? dir : dir.clone().negate().setZ(.35).normalize();
  sun.color.copy(cSun); sun.intensity = sI * smooth(-.05, .12, Math.abs(dir.y) + (day ? 0 : .1));
  sun.target.position.set(Math.round(focus.x / 4) * 4, focus.y, Math.round(focus.z / 4) * 4);
  sun.position.copy(sun.target.position).addScaledVector(ld, 120);
  hemi.intensity = hI; hemi.color.copy(cTop).lerp(tmp.set('#ffffff'), .55); hemi.groundColor.copy(cHor).multiplyScalar(.45);

  const cam = G.camera.position;
  sky.position.copy(cam); stars.position.copy(cam); stars.material.opacity = G.night * .9; stars.rotation.y = G.clock * .003;
  sky.material.uniforms.uTop.value.copy(cTop); sky.material.uniforms.uHor.value.copy(cHor);
  G.scene.fog.color.copy(cHor);
  sunSprite.position.copy(cam).addScaledVector(dir, 1250); sunSprite.visible = dir.y > -.12;
  moonSprite.position.copy(cam).addScaledVector(dir, -1250); moonSprite.visible = dir.y < .12;

  const wu = water.material.uniforms;
  const su = sky.material.uniforms; su.uSunDir.value.copy(dir); su.uSunCol.value.copy(cSun).multiplyScalar(sI * .45); su.uT.value = G.clock; su.uNight.value = G.night;
  updateFlies(focus);
  wu.uT.value = G.clock; wu.uSky.value.copy(cHor).lerp(cTop, .5); wu.uSunDir.value.copy(ld); wu.uSunCol.value.copy(cSun).multiplyScalar(sI * .4); wu.uLight.value = lerp(.22, 1, 1 - G.night);
  water.position.x = cam.x; water.position.z = cam.z;
  windU.value = G.clock;
  for (const c of clouds) { c.position.x += dt * 1.6; if (c.position.x > 480) c.position.x = -480; }
  clouds[0].material.color.copy(cHor).lerp(tmp.set('#ffffff'), .6 * (1 - G.night)).multiplyScalar(lerp(1, .35, G.night));
}

export function setQuality(q) {
  const low = q === 'low', r = G.renderer;
  // '높음'은 후처리(블룸) 비용이 있어 해상도 배율을 조금 낮춘다
  r.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.25 : q === 'high' ? 1.75 : 2));
  sun.shadow.mapSize.setScalar(low ? 1024 : 2048);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  emit('quality', q);
}
