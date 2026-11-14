// 후처리: MSAA + 블룸(빛 번짐) + 색 보정/비네트. '높음' 품질에서만 사용
import * as THREE from 'three';
import { G } from './util.js';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

let composer = null;
const Grade = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.2126,.7152,.0722));
      c.rgb=max(mix(vec3(l),c.rgb,1.09),0.);                 // 채도
      c.rgb=mix(c.rgb,c.rgb*c.rgb*(3.-2.*min(c.rgb,1.)),.12); // 약한 대비
      vec2 d=vUv-.5; c.rgb*=1.-dot(d,d)*.5;                   // 비네트
      gl_FragColor=c; }`,
};
export function initPost() {
  const r = G.renderer;
  try {
    if (!r.capabilities.isWebGL2 || !(r.extensions.has('EXT_color_buffer_half_float') || r.extensions.has('EXT_color_buffer_float'))) return false;
    composer = new EffectComposer(r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(G.scene, G.camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .42, .7, 1.0));
    composer.addPass(new ShaderPass(Grade));
    composer.addPass(new OutputPass());
    return true;
  } catch (e) { console.warn('후처리를 사용할 수 없습니다', e); composer = null; return false; }
}
export function resizePost(w, h, pr) { if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); } }
export const renderPost = (dt) => composer.render(dt);
export const hasPost = () => !!composer;
