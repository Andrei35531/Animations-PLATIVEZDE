import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
const host = document.querySelector('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35,1,.1,50);
camera.position.set(0,.65,7.7); camera.lookAt(0,0,0);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:true}); }
catch { document.querySelector('#error').hidden=false; document.querySelector('#error').textContent='Для 3D-предпросмотра включите аппаратное ускорение браузера.'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
host.append(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer);
const room=new RoomEnvironment(); const environment=pmrem.fromScene(room,.04);
scene.environment=environment.texture; room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xc9e4ff,0x28384f,2));
for(const [x,y,z,power] of [[-3,4,4,28],[4,2,-2,36]]){const l=new THREE.PointLight(0xd4e7ff,power);l.position.set(x,y,z);scene.add(l);}

// A single solid glass checkmark, with softly rounded bevels.
const checkShape=new THREE.Shape();
checkShape.moveTo(-.66,.015);checkShape.lineTo(-.48,.195);
checkShape.lineTo(-.19,-.095);checkShape.lineTo(.48,.56);
checkShape.lineTo(.66,.38);checkShape.lineTo(-.19,-.46);checkShape.closePath();
const geometry=new THREE.ExtrudeGeometry(checkShape,{depth:.16,bevelEnabled:true,bevelSegments:8,bevelSize:.055,bevelThickness:.055,curveSegments:32});
geometry.center();
const material=new THREE.MeshPhysicalMaterial({color:0x62d09a,metalness:0,roughness:.085,transmission:.72,thickness:.42,ior:1.46,attenuationColor:0x62d09a,attenuationDistance:1.2,clearcoat:1,envMapIntensity:1.4,transparent:true,opacity:1});
const check=new THREE.Mesh(geometry,material);scene.add(check);
// Local-space reflection sweeps over the glass once, then disappears.
const sheen={position:{value:-2},strength:{value:0}};
material.onBeforeCompile=shader=>{
  shader.uniforms.uSweep=sheen.position;shader.uniforms.uSheen=sheen.strength;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal = position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLocal; uniform float uSweep; uniform float uSheen;').replace('#include <opaque_fragment>','float stripe=exp(-pow((vLocal.x + vLocal.y * 0.35 - uSweep) / 0.085, 2.0)); outgoingLight += vec3(0.65,0.9,0.78)*stripe*uSheen;\n#include <opaque_fragment>');
};
const successColors={light:0x16784a,dark:0x62d09a};
let lightTheme=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const duration=1.65;
let time=reducedMotion.matches?duration:0,last=performance.now();
function setTheme(light){
  lightTheme=light;document.body.classList.toggle('light',light);
  material.color.set(light?successColors.light:successColors.dark);
  material.attenuationColor.copy(material.color);
  document.querySelector('#theme').textContent=light?'Тёмный фон':'Светлый фон';
}
setTheme(false);
document.querySelector('#theme').onclick=()=>setTheme(!lightTheme);
document.querySelector('#replay').onclick=()=>{time=reducedMotion.matches?duration:0;};
reducedMotion.addEventListener('change',e=>{if(e.matches)time=duration;});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=width<500?7.4:6.3;camera.updateProjectionMatrix();}).observe(host);
const easeOut=x=>1-Math.pow(1-THREE.MathUtils.clamp(x,0,1),3);
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;
  if(!document.hidden)time=Math.min(duration,time+dt);
  const reveal=easeOut(time/.85);
  const settle=THREE.MathUtils.clamp(time/1.1,0,1);
  const bounce=.055*Math.sin(settle*Math.PI*2)*Math.pow(1-settle,2);
  check.scale.setScalar(1.35*(.75+.25*reveal+bounce));
  check.rotation.set(.05+.12*(1-reveal),-.18-.8*(1-reveal),-.08*(1-reveal));
  check.position.y=-.14*(1-reveal);
  material.opacity=THREE.MathUtils.smoothstep(time,0,.25);
  const sweep=THREE.MathUtils.clamp((time-.55)/.85,0,1);
  sheen.position.value=-1+2*sweep;
  sheen.strength.value=.6*Math.sin(sweep*Math.PI);
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
