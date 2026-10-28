import fontData from './fonts/inter-bold.json';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
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


function createAnimation(label,liquidColors){
const root=new THREE.Group();scene.add(root);const word=new THREE.Group();root.add(word);
const font=new FontLoader().parse(fontData);
const glass=new THREE.MeshPhysicalMaterial({color:0xe5f0ff,roughness:.065,transmission:1,thickness:.24,ior:1.46,clearcoat:1,envMapIntensity:1.4,transparent:true,opacity:.25,depthWrite:false});

const waterUniforms={level:{value:-.6},time:{value:0}};
const liquidMat=new THREE.MeshPhysicalMaterial({color:liquidColors.dark,roughness:.16,clearcoat:.7,transmission:.06,thickness:.2,ior:1.333,envMapIntensity:.5,side:THREE.DoubleSide,toneMapped:false});
liquidMat.onBeforeCompile=shader=>{
 shader.uniforms.uLevel=waterUniforms.level;shader.uniforms.uTime=waterUniforms.time;
 shader.vertexShader='varying vec3 vLiquidPosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLiquidPosition=position;');
 shader.fragmentShader='uniform float uLevel; uniform float uTime; varying vec3 vLiquidPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat wave=uLevel+0.026*sin(vLiquidPosition.x*7.0-uTime*8.0+vLiquidPosition.z*4.0)+0.011*sin(vLiquidPosition.x*17.0+uTime*11.0); if(vLiquidPosition.y>wave) discard; float meniscus=1.0-smoothstep(0.0,0.032,wave-vLiquidPosition.y);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(diffuseColor.rgb,outgoingLight,0.12); outgoingLight=mix(outgoingLight,mix(diffuseColor.rgb,vec3(1.0),0.72),meniscus*0.42);\n#include <opaque_fragment>');
};
// Individual letter cavities preserve spacing and the holes in the e.
const letterGap=.065;
let cursor=0;const letters=[];const cavities=[];
// Compare facing contours at the same height: diagonal letters need optical spacing.
function profile(shapes){const points=shapes.map(s=>s.getPoints(100));const rows=new Map();for(let row=-250;row<=750;row++){const y=row*.002,xs=[];for(const polygon of points)for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));}if(xs.length)rows.set(row,[Math.min(...xs),Math.max(...xs)]);}return rows;}
let previousProfile=null,previousOffset=0;
for(const char of label){
 const shapes=font.generateShapes(char,.86);
 const geo=new THREE.ExtrudeGeometry(shapes,{depth:.22,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.028,bevelThickness:.028,curveSegments:20});
 geo.computeBoundingBox();const box=geo.boundingBox;
 const cx=(box.min.x+box.max.x)/2,cy=(box.min.y+box.max.y)/2;
 // Measure the actual glass outline, including its bevel, instead of font advance.
 const currentProfile=profile(shapes);let offset=cursor-box.min.x;
 if(previousProfile){let separation=-Infinity;for(const [row,[left]] of currentProfile){const previous=previousProfile.get(row);if(previous)separation=Math.max(separation,previous[1]-left);}if(Number.isFinite(separation))offset=previousOffset+separation+letterGap+.056;}
 previousProfile=currentProfile;previousOffset=offset;
 const letterWidth=box.max.x-box.min.x;
 const liquidGeo=new THREE.ExtrudeGeometry(shapes,{depth:.12,bevelEnabled:true,bevelSegments:3,bevelSize:.008,bevelThickness:.008,curveSegments:20});
 liquidGeo.translate(-cx,-cy,-.06);liquidGeo.scale(.88,.88,1);liquidGeo.translate(offset+cx,cy,0);
 geo.translate(offset,0,-.11);
 cavities.push(...shapes.map(shape=>({outer:shape.getPoints(64).map(p=>[offset+cx+(p.x-cx)*.88,cy+(p.y-cy)*.88]),holes:shape.holes.map(h=>h.getPoints(64).map(p=>[offset+cx+(p.x-cx)*.88,cy+(p.y-cy)*.88]))})));
 letters.push({geo,liquidGeo,shapes,offset});cursor+=letterWidth+letterGap;
}
const totalBox=new THREE.Box3();for(const {geo} of letters){geo.computeBoundingBox();totalBox.union(geo.boundingBox);}
const rimMat=new THREE.LineBasicMaterial({color:0xe3f5ff,transparent:true,opacity:.24,depthWrite:false});
const contours=[];
for(const {shapes,offset} of letters){
 for(const shape of shapes){
  for(const curve of [shape,...shape.holes]){
   const points=curve.getPoints(50).map(p=>new THREE.Vector3(p.x+offset,p.y,.139));
   contours.push(points);
  }
 }

}
const center=totalBox.getCenter(new THREE.Vector3());const width=totalBox.max.x-totalBox.min.x;
for(const {geo,liquidGeo} of letters){
 geo.translate(-center.x,-center.y,0);liquidGeo.translate(-center.x,-center.y,0);
 const shell=new THREE.Mesh(geo,glass);shell.renderOrder=3;word.add(shell);
 word.add(new THREE.Mesh(liquidGeo,liquidMat));
}
// A finite shower of green confetti falls above and around the word.
for(const points of contours){points.forEach(p=>{p.x-=center.x;p.y-=center.y;});const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),rimMat);rim.renderOrder=4;word.add(rim);}

// Reuse the loader's clear sphere, white Fresnel outline and crescent glint.
let seed=8317;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(const cavity of cavities)for(const polygon of [cavity.outer,...cavity.holes])for(const p of polygon){p[0]-=center.x;p[1]-=center.y;}
function inside(x,y,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function clearance(x,y,cavity){if(!inside(x,y,cavity.outer)||cavity.holes.some(h=>inside(x,y,h)))return 0;let distance=Infinity;for(const polygon of [cavity.outer,...cavity.holes])for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1];const t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}return distance;}
const bubbleGeometry=new THREE.SphereGeometry(1,24,16);
const bubbles=cavities.flatMap(cavity=>{
 const xs=cavity.outer.map(p=>p[0]),ys=cavity.outer.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return Array.from({length:9},()=>{
   const material = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uFade;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        float facing = clamp(dot(n, normalize(vView)), 0.0, 1.0);
        float rim = pow(1.0 - facing, 3.0);
        float crescent = pow(max(dot(normalize(n.xy + vec2(0.0001)), normalize(vec2(-0.65, 0.76))), 0.0), 5.0);
        float glint = pow(max(dot(n, normalize(vec3(-0.4, 0.55, 0.72))), 0.0), 65.0);
        float lowerReflection = pow(max(dot(n, normalize(vec3(0.45, -0.7, 0.5))), 0.0), 24.0);
        float alpha = (0.008 + rim * (0.30 + 0.48 * crescent) + 0.65 * glint + 0.12 * lowerReflection) * uFade;
        gl_FragColor = vec4(vec3(1.0), min(alpha, 0.75));
      }
    `,
  });

 const mesh=new THREE.Mesh(bubbleGeometry,material);mesh.renderOrder=4;word.add(mesh);
 const radius=.012+random()*.012;let x,y;
 for(let attempt=0;attempt<250;attempt++){x=minX+random()*(maxX-minX);y=minY+random()*(maxY-minY);if(clearance(x,y,cavity)>radius+.005)break;}
 return {mesh,cavity,radius,x,startY:y,minY,maxY,speed:.055+random()*.06,phase:random()*Math.PI*2};
 });
});
function updateBubbles(){for(const b of bubbles){
 const x=b.x+.006*Math.sin(time*3+b.phase),y=b.minY+((b.startY-b.minY+time*b.speed)%(b.maxY-b.minY)),z=.078;
 const surface=waterUniforms.level.value+.026*Math.sin(x*7-time*8+z*4)+.011*Math.sin(x*17+time*11);
 const fade=THREE.MathUtils.clamp((Math.min(clearance(x,y,b.cavity),surface-y)-b.radius)/.018,0,1);
 b.mesh.visible=fade>0;b.mesh.position.set(x,y,z);b.mesh.scale.setScalar(b.radius);b.mesh.material.uniforms.uFade.value=fade;
}}

// Thin paper rectangles and short ribbons tumble independently.
const confettiGeometries=[new THREE.BoxGeometry(.6,1,.018),new THREE.BoxGeometry(.85,.85,.018),new THREE.BoxGeometry(.35,1.35,.018)];
const crossShape=new THREE.Shape();
[[-.5,-.16],[-.16,-.16],[-.16,-.5],[.16,-.5],[.16,-.16],[.5,-.16],[.5,.16],[.16,.16],[.16,.5],[-.16,.5],[-.16,.16],[-.5,.16]].forEach(([x,y],i)=>i?crossShape.lineTo(x,y):crossShape.moveTo(x,y));crossShape.closePath();
const crossGeo=new THREE.ExtrudeGeometry(crossShape,{depth:.05,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3});crossGeo.center();crossGeo.rotateZ(Math.PI/4);
const rain=Array.from({length:42},(_,i)=>{
 const mat=new THREE.MeshPhysicalMaterial({color:liquidColors.dark,roughness:.2,clearcoat:1,metalness:.05,transparent:true,depthWrite:false});
 const mesh=new THREE.Mesh(label==='Отказ'?crossGeo:confettiGeometries[i%confettiGeometries.length],mat);root.add(mesh);
 const scale=.065+random()*.105;mesh.scale.setScalar(scale);
 return {mesh,x:(random()-.5)*(width+.8),delay:.08+random()*1.25,life:1.05+random()*.78,phase:random()*Math.PI*2,startY:1.65+random()*.8,drift:(random()-.5)*1.4,sway:.04+random()*.18,spin:(random()-.5)*6,tilt:(random()-.5)*1.8,z:(random()-.5)*.8};
});
return {root,word,width,liquidColors,liquidMat,waterUniforms,rain,updateBubbles};
}
const variants={success:createAnimation('Успех',{light:0x16784a,dark:0x62d09a}),error:createAnimation('Отказ',{light:0xd83242,dark:0xff6978})};
let mode='success';variants.error.root.visible=false;
let {word,width,liquidColors,liquidMat,waterUniforms,rain,updateBubbles}=variants.success;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');const duration=3.2;
let time=reducedMotion.matches?duration:0,last=performance.now(),lightTheme=false;
function setTheme(light){lightTheme=light;document.body.classList.toggle('light',light);const color=light?liquidColors.light:liquidColors.dark;liquidMat.color.set(color);rain.forEach(p=>p.mesh.material.color.set(color));document.querySelector('#theme').textContent=light?'Тёмный фон':'Светлый фон';}
setTheme(false);document.querySelector('#theme').onclick=()=>setTheme(!lightTheme);document.querySelector('#replay').onclick=()=>{time=reducedMotion.matches?duration:0;};reducedMotion.addEventListener('change',e=>{if(e.matches)time=duration;});
function resize(){const {width:w,height:h}=host.getBoundingClientRect();renderer.setSize(w,h);camera.aspect=w/h;camera.position.set(0,.45,Math.max(7,(width+1.0)/(2*Math.tan(THREE.MathUtils.degToRad(17.5))*camera.aspect)));camera.lookAt(0,.05,0);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);
document.querySelector('#variant').onclick=()=>{
 variants[mode].root.visible=false;mode=mode==='success'?'error':'success';
 ({word,width,liquidColors,liquidMat,waterUniforms,rain,updateBubbles}=variants[mode]);
 variants[mode].root.visible=true;rain.forEach(p=>p.mesh.visible=false);setTheme(lightTheme);resize();
 time=reducedMotion.matches?duration:0;
 document.querySelector('#variant').textContent=mode==='success'?'Отказ':'Успех';
 document.querySelector('main').setAttribute('aria-label',mode==='success'?'Успех: зелёная жидкость и конфетти':'Отказ: красная жидкость и крестики');
 document.title='PLATIVEZDE · '+(mode==='success'?'Успех':'Отказ');
};
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(reducedMotion.matches)time=duration;else if(!document.hidden)time=Math.min(duration,time+dt);
 const grow=1-Math.pow(1-THREE.MathUtils.clamp(time/.4,0,1),3);word.scale.setScalar(.12+.88*grow);
 const fill=THREE.MathUtils.smoothstep(time,.35,1.7);waterUniforms.level.value=-.46+fill*.95;waterUniforms.time.value=time;
 for(const p of rain){const t=(time-p.delay)/p.life;p.mesh.visible=t>0&&t<1&&!reducedMotion.matches;if(!p.mesh.visible)continue;p.mesh.position.set(p.x+p.drift*t+p.sway*Math.sin(t*7+p.phase),p.startY-(p.startY+1.6)*(.3*t+.7*t*t),p.z+.12*Math.sin(t*6+p.phase));p.mesh.rotation.set(p.tilt+.45*Math.sin(t*6+p.phase),p.tilt+t*p.spin*.65,p.phase+t*p.spin);p.mesh.material.opacity=THREE.MathUtils.smoothstep(t,0,.12)*(1-THREE.MathUtils.smoothstep(t,.72,1));}
 updateBubbles();renderer.render(scene,camera);
}requestAnimationFrame(frame);

