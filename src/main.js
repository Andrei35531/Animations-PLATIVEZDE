import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
const host=document.querySelector('#scene');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(0,.2,7.6);camera.lookAt(0,0,0);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='Для просмотра включите аппаратное ускорение браузера.';throw Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.append(renderer.domElement);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xffffff,0x35475c,1.3));
const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-3,4,5);scene.add(key);
const group=new THREE.Group();scene.add(group);
const accent=new THREE.Color(),success=new THREE.Color();
// A curved transparent centre with a soft, view-dependent glass edge.
const lensMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:.22}},vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 vN;varying vec3 vV;uniform vec3 uColor;uniform float uAlpha;void main(){vec3 n=normalize(vN);float edge=pow(1.-abs(dot(n,normalize(vV))),2.4);float light=.35+.65*max(dot(n,normalize(vec3(-.5,.8,.3))),0.);gl_FragColor=vec4(uColor,edge*light*uAlpha);}`});
const lens=new THREE.Mesh(new THREE.SphereGeometry(1.02,64,32),lensMaterial);lens.scale.z=.22;group.add(lens);
const ringMaterial=new THREE.MeshPhysicalMaterial({color:0x579cff,emissive:0x579cff,emissiveIntensity:.65,metalness:.12,roughness:.16,clearcoat:1,transparent:true,opacity:1});
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.12,.043,20,160),ringMaterial);group.add(ring);
// Soft halo follows the ring in 3D, including its edge-on silhouette.
const haloMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:.2}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uAlpha;void main(){float r=length((vUv-.5)*3.2);float glow=exp(-pow((r-1.12)/.14,2.));gl_FragColor=vec4(uColor,glow*uAlpha);}`});
const halo=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),haloMat);halo.position.z=-.03;group.add(halo);
// The bridge rises from the bottom rim, then thins as the check takes shape.
const bridgeGeometry=new THREE.BufferGeometry();const seg=64;const bridgePos=new Float32Array(seg*18);bridgeGeometry.setAttribute('position',new THREE.BufferAttribute(bridgePos,3));
const bridge=new THREE.Mesh(bridgeGeometry,ringMaterial);bridge.position.z=.065;group.add(bridge);
function updateBridge(amount,split){let k=0;const add=(x,y,z)=>{bridgePos[k++]=x;bridgePos[k++]=y;bridgePos[k++]=z;};const y0=-1.12,y1=-1.1+amount*1.07;for(let i=0;i<seg;i++){const a=i/seg,b=(i+1)/seg;const width=u=>(.13*Math.exp(-u*13)+.018+.13*Math.pow(u,7))*(1-split);const xa=width(a),xb=width(b),ya=y0+(y1-y0)*a,yb=y0+(y1-y0)*b;add(-xa,ya,0);add(xa,ya,0);add(xb,yb,0);add(-xa,ya,0);add(xb,yb,0);add(-xb,yb,0);}bridgeGeometry.attributes.position.needsUpdate=true;bridgeGeometry.computeVertexNormals();bridgeGeometry.computeBoundingSphere();bridge.visible=amount>0&&split<.999;}
const drop=new THREE.Mesh(new THREE.SphereGeometry(.14,32,24),ringMaterial);drop.position.z=.08;group.add(drop);
const shape=new THREE.Shape();shape.moveTo(-.51,.01);shape.lineTo(-.36,.16);shape.lineTo(-.14,-.06);shape.lineTo(.4,.47);shape.lineTo(.55,.32);shape.lineTo(-.14,-.36);shape.closePath();
const checkGeo=new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelSegments:6,bevelSize:.035,bevelThickness:.035});checkGeo.center();
const checkMat=new THREE.MeshPhysicalMaterial({color:0x62d09a,emissive:0x62d09a,emissiveIntensity:.2,metalness:0,roughness:.12,transmission:.35,thickness:.22,ior:1.46,clearcoat:1,transparent:true,opacity:0});
const check=new THREE.Mesh(checkGeo,checkMat);check.position.z=.12;check.renderOrder=3;group.add(check);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');const duration=3.2;let time=reducedMotion.matches?duration:0,last=performance.now(),lightTheme=false;
function setTheme(light){lightTheme=light;document.body.classList.toggle('light',light);accent.set(light?0x1473e6:0x579cff);success.set(light?0x16784a:0x62d09a);ringMaterial.color.copy(accent);ringMaterial.emissive.copy(accent);haloMat.uniforms.uColor.value.copy(accent);haloMat.uniforms.uAlpha.value=light?.13:.28;lensMaterial.uniforms.uColor.value.set(light?0x2d6395:0x9bb7dd);lensMaterial.uniforms.uAlpha.value=light?.16:.32;checkMat.color.copy(success);checkMat.emissive.copy(success);document.querySelector('#theme').textContent=light?'Тёмный фон':'Светлый фон';}
setTheme(false);document.querySelector('#theme').onclick=()=>setTheme(!lightTheme);document.querySelector('#replay').onclick=()=>{time=reducedMotion.matches?duration:0;};reducedMotion.addEventListener('change',e=>{if(e.matches)time=duration;});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=width<500?9:7.6;camera.updateProjectionMatrix();}).observe(host);
const smooth=(a,b)=>THREE.MathUtils.smoothstep(time,a,b);
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!document.hidden)time=Math.min(duration,time+dt);
 const turn=smooth(0,1.45);group.rotation.y=-Math.PI*1.65*(1-turn);group.rotation.x=.16*Math.sin(turn*Math.PI);group.scale.setScalar(.82+.18*smooth(0,.65));
 const grow=smooth(.9,1.8),split=smooth(1.7,2.15),reveal=smooth(1.78,2.4);
 updateBridge(grow,split);drop.visible=grow>0&&split<1;drop.position.y=-1.1+grow*1.07;drop.scale.set(.55+.45*grow,(.7+.6*Math.sin(grow*Math.PI))*(1-.6*split),1);drop.scale.multiplyScalar(1-.95*split);
 check.visible=reveal>0;checkMat.opacity=reveal;check.scale.setScalar(.65+.35*reveal+.025*Math.sin(smooth(2.15,2.7)*Math.PI));
 ringMaterial.opacity=1-.35*smooth(2.2,3.05);ringMaterial.emissiveIntensity=.65-.3*smooth(2.2,3.05);
 renderer.render(scene,camera);
}requestAnimationFrame(frame);
