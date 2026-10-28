import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json';
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


const word=new THREE.Group();scene.add(word);
const font=new FontLoader().parse(fontData);
const glass=new THREE.MeshPhysicalMaterial({color:0xe5f0ff,roughness:.065,transmission:1,thickness:.24,ior:1.46,clearcoat:1,envMapIntensity:1.4,transparent:true,opacity:.25,depthWrite:false});
const liquidColors={light:0x16784a,dark:0x62d09a};
const waterUniforms={level:{value:-.6},time:{value:0}};
const liquidMat=new THREE.MeshPhysicalMaterial({color:liquidColors.dark,roughness:.16,clearcoat:.7,transmission:.06,thickness:.2,ior:1.333,envMapIntensity:.5,side:THREE.DoubleSide,toneMapped:false});
liquidMat.onBeforeCompile=shader=>{
 shader.uniforms.uLevel=waterUniforms.level;shader.uniforms.uTime=waterUniforms.time;
 shader.vertexShader='varying vec3 vLiquidPosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLiquidPosition=position;');
 shader.fragmentShader='uniform float uLevel; uniform float uTime; varying vec3 vLiquidPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat wave=uLevel+0.026*sin(vLiquidPosition.x*7.0-uTime*8.0+vLiquidPosition.z*4.0)+0.011*sin(vLiquidPosition.x*17.0+uTime*11.0); if(vLiquidPosition.y>wave) discard; float meniscus=1.0-smoothstep(0.0,0.032,wave-vLiquidPosition.y);');
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(diffuseColor.rgb,outgoingLight,0.12); outgoingLight=mix(outgoingLight,vec3(0.78,1.0,0.87),meniscus*0.42);\n#include <opaque_fragment>');
};
// Individual letter cavities preserve spacing and the holes in the e.
let cursor=0;const letters=[];
for(const char of 'success'){
 const shapes=font.generateShapes(char,.86);
 const geo=new THREE.ExtrudeGeometry(shapes,{depth:.22,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:.028,bevelThickness:.028,curveSegments:20});
 geo.computeBoundingBox();const box=geo.boundingBox;
 const cx=(box.min.x+box.max.x)/2,cy=(box.min.y+box.max.y)/2;
 const liquidGeo=new THREE.ExtrudeGeometry(shapes,{depth:.12,bevelEnabled:true,bevelSegments:3,bevelSize:.008,bevelThickness:.008,curveSegments:20});
 liquidGeo.translate(-cx,-cy,-.06);liquidGeo.scale(.88,.88,1);liquidGeo.translate(cursor+cx,cy,0);
 geo.translate(cursor,0,-.11);
 letters.push({geo,liquidGeo});cursor+=font.data.glyphs[char].ha*.86/font.data.resolution+.035;
}
const totalBox=new THREE.Box3();for(const {geo} of letters){geo.computeBoundingBox();totalBox.union(geo.boundingBox);}
const rimMat=new THREE.LineBasicMaterial({color:0xe3f5ff,transparent:true,opacity:.24,depthWrite:false});
let rimCursor=0;const contours=[];
for(const char of 'success'){
 for(const shape of font.generateShapes(char,.86)){
  for(const curve of [shape,...shape.holes]){
   const points=curve.getPoints(50).map(p=>new THREE.Vector3(p.x+rimCursor,p.y,.139));
   contours.push(points);
  }
 }
 rimCursor+=font.data.glyphs[char].ha*.86/font.data.resolution+.035;
}
const center=totalBox.getCenter(new THREE.Vector3());const width=totalBox.max.x-totalBox.min.x;
for(const {geo,liquidGeo} of letters){
 geo.translate(-center.x,-center.y,0);liquidGeo.translate(-center.x,-center.y,0);
 const shell=new THREE.Mesh(geo,glass);shell.renderOrder=3;word.add(shell);
 word.add(new THREE.Mesh(liquidGeo,liquidMat));
}
// A finite shower of softly bevelled green checks falls above and around the word.
for(const points of contours){points.forEach(p=>{p.x-=center.x;p.y-=center.y;});const rim=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),rimMat);rim.renderOrder=4;word.add(rim);}
const checkShape=new THREE.Shape();[[-.5,0],[-.34,.16],[-.12,-.06],[.4,.46],[.56,.3],[-.12,-.38]].forEach(([x,y],i)=>i?checkShape.lineTo(x,y):checkShape.moveTo(x,y));checkShape.closePath();
const checkGeo=new THREE.ExtrudeGeometry(checkShape,{depth:.07,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025});checkGeo.center();
const rain=Array.from({length:28},(_,i)=>{
 const mat=new THREE.MeshPhysicalMaterial({color:liquidColors.dark,roughness:.2,clearcoat:1,metalness:.05,transparent:true,depthWrite:false});
 const mesh=new THREE.Mesh(checkGeo,mat);scene.add(mesh);
 const scale=.1+(i%5)*.018;mesh.scale.setScalar(scale);
 return {mesh,x:((i*17%29)/28-.5)*(width+1.2),delay:.22+(i*11%29)/29*.95,life:1.25+(i%4)*.15,phase:i*2.4};
});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');const duration=3.2;
let time=reducedMotion.matches?duration:0,last=performance.now(),lightTheme=false;
function setTheme(light){lightTheme=light;document.body.classList.toggle('light',light);const color=light?liquidColors.light:liquidColors.dark;liquidMat.color.set(color);rain.forEach(p=>p.mesh.material.color.set(color));document.querySelector('#theme').textContent=light?'Тёмный фон':'Светлый фон';}
setTheme(false);document.querySelector('#theme').onclick=()=>setTheme(!lightTheme);document.querySelector('#replay').onclick=()=>{time=reducedMotion.matches?duration:0;};reducedMotion.addEventListener('change',e=>{if(e.matches)time=duration;});
new ResizeObserver(()=>{const {width:w,height:h}=host.getBoundingClientRect();renderer.setSize(w,h);camera.aspect=w/h;camera.position.set(0,.45,Math.max(7,(width+1.0)/(2*Math.tan(THREE.MathUtils.degToRad(17.5))*camera.aspect)));camera.lookAt(0,.05,0);camera.updateProjectionMatrix();}).observe(host);
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!document.hidden)time=Math.min(duration,time+dt);
 const grow=1-Math.pow(1-THREE.MathUtils.clamp(time/.4,0,1),3);word.scale.setScalar(.12+.88*grow);
 const fill=THREE.MathUtils.smoothstep(time,.35,1.7);waterUniforms.level.value=-.46+fill*.95;waterUniforms.time.value=time;
 for(const p of rain){const t=(time-p.delay)/p.life;p.mesh.visible=t>0&&t<1&&!reducedMotion.matches;if(!p.mesh.visible)continue;p.mesh.position.set(p.x+.13*Math.sin(t*5+p.phase),2.05-3.8*t*t,-.1+Math.sin(p.phase)*.4);p.mesh.rotation.set(.3*Math.sin(t*6+p.phase),.6*Math.sin(t*5+p.phase),.3*Math.sin(t*5+p.phase));p.mesh.material.opacity=THREE.MathUtils.smoothstep(t,0,.12)*(1-THREE.MathUtils.smoothstep(t,.72,1));}
 renderer.render(scene,camera);
}requestAnimationFrame(frame);
