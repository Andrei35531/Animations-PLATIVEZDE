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

const coin=new THREE.Group();scene.add(coin);
const outline=[[-.85,0],[-.61,.24],[-.22,-.15],[.65,.72],[.9,.47],[-.22,-.65]];
const cavity=outline.map(([x,y])=>[x*.91,y*.91]);
const shape=new THREE.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
const shellGeo=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelSegments:8,bevelSize:.055,bevelThickness:.055});shellGeo.translate(0,0,-.12);
const glass=new THREE.MeshPhysicalMaterial({color:0xe5f0ff,metalness:0,roughness:.065,transmission:1,thickness:.3,ior:1.46,clearcoat:1,envMapIntensity:1.2,transparent:true,opacity:.38,depthWrite:false});
const shell=new THREE.Mesh(shellGeo,glass);shell.renderOrder=3;coin.add(shell);
// Vertical intersections keep every liquid slice inside the check's cavity.
function bounds(x){const ys=[];for(let i=0;i<cavity.length;i++){const a=cavity[i],b=cavity[(i+1)%cavity.length];if(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&a[0]!==b[0])ys.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));}return ys.length?[Math.min(...ys),Math.max(...ys)]:[0,0];}
const liquidGeo=new THREE.BufferGeometry();
// PLATIVEZDE CTA fills: light 3:44346 (#1473E6), dark 100:12632 (#579CFF).
const liquidColors = Object.freeze({ light: 0x16784a, dark: 0x62d09a });
const liquidMat=new THREE.MeshPhysicalMaterial({color:liquidColors.dark,metalness:0,roughness:.16,clearcoat:.6,transmission:.08,thickness:.35,ior:1.333,side:THREE.DoubleSide,envMapIntensity:.45});
// Keep the CTA base colour stable under studio lights; retain subtle 3D shading.
liquidMat.toneMapped = false;
liquidMat.onBeforeCompile = shader => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    'outgoingLight = mix(diffuseColor.rgb, outgoingLight, 0.1);\n#include <opaque_fragment>'
  );
};
const liquid=new THREE.Mesh(liquidGeo,liquidMat);coin.add(liquid);
const N=180,D=.09;
const minX=Math.min(...cavity.map(v=>v[0])),maxX=Math.max(...cavity.map(v=>v[0]));
const positions=new Float32Array(N*72);liquidGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
// A thin translucent meniscus follows the rolling surface on both faces.
const crestGeo=new THREE.BufferGeometry();
const crestPositions=new Float32Array(N*36);
crestGeo.setAttribute('position',new THREE.BufferAttribute(crestPositions,3));
const crestMaterial=new THREE.MeshBasicMaterial({color:0x9eafc2,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
const crest=new THREE.Mesh(crestGeo,crestMaterial);crest.renderOrder=2;coin.add(crest);
function waterSurface(x,z,level,t){
  const strength=1-THREE.MathUtils.smoothstep(t,1.25,1.6);
  return level+strength*(.035*Math.sin(x*6-t*9+z*3)+.012*Math.sin(x*13+t*11-z*4)+.005*Math.sin(x*23-t*15));
}
// Small air bubbles rise through the cavity, sharing the animation clock.
const bubbleGeometry = new THREE.SphereGeometry(1, 32, 24);
const bubbles = Array.from({length: 22}, (_, i) => {
  const radius = .014 + ((i * 7) % 11) * .0023;
  // Clear centre, Fresnel outline and a small studio-light crescent.
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
  const mesh = new THREE.Mesh(bubbleGeometry, material);
  mesh.renderOrder = 2;
  coin.add(mesh);
  return {mesh, radius, x: -.86 + ((i * 13) % 23) / 22 * 1.72,
    phase: ((i * 17) % 29) / 29, speed: .12 + (i % 5) * .018};
});
function updateBubbles(level,t){for(const [i,b] of bubbles.entries()){
 const x=b.x+.009*Math.sin(t*3+i),z=((i%3)-1)*.045;
 const [bottom,ceiling]=bounds(x);
 const y=bottom+.02+((t*.18+b.phase*.7)%.8);
 const top=Math.min(ceiling,waterSurface(x,z,level,t));
 const fade=THREE.MathUtils.clamp((Math.min(y-bottom,top-y)-b.radius)/.045,0,1)*(1-THREE.MathUtils.smoothstep(t,1.3,1.6));
 const left=bounds(x-b.radius),right=bounds(x+b.radius);
 b.mesh.visible=fade>0&&y-b.radius>=Math.max(left[0],right[0])&&y+b.radius<=Math.min(left[1],right[1]);
 b.mesh.position.set(x,y,z);b.mesh.scale.setScalar(b.radius*.75);b.mesh.material.uniforms.uFade.value=fade;
}}
function water(level,t) {
  let k=0,c=0;
  const add=(x,y,z)=>{positions[k++]=x;positions[k++]=y;positions[k++]=z;};
  const tri=(a,b,c)=>{add(...a);add(...b);add(...c);};
  const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
  const crestQuad=(a,b,d,e)=>{for(const v of [a,b,d,a,d,e])for(const n of v)crestPositions[c++]=n;};
  const bottom=x=>bounds(x)[0];
  const ceiling=x=>bounds(x)[1];
  const top=(x,z)=>THREE.MathUtils.clamp(waterSurface(x,z,level,t),bottom(x),ceiling(x));
  const depth=x=>Math.max(waterSurface(x,D,level,t),waterSurface(x,-D,level,t))-bottom(x);
  for(let i=0;i<N;i++) {
    let x1=minX+(maxX-minX)*i/N,x2=minX+(maxX-minX)*(i+1)/N;
    const wet1=depth(x1)>0,wet2=depth(x2)>0;
    if(!wet1&&!wet2) continue;
    if(wet1!==wet2) {
      let dry=wet1?x2:x1,wet=wet1?x1:x2;
      for(let j=0;j<16;j++){const mid=(dry+wet)/2;if(depth(mid)>0)wet=mid;else dry=mid;}
      if(wet1)x2=(dry+wet)/2;else x1=(dry+wet)/2;
    }
    const b1=bottom(x1),b2=bottom(x2);
    const f1=top(x1,D),f2=top(x2,D),r1=top(x1,-D),r2=top(x2,-D);
    quad([x1,b1,D],[x2,b2,D],[x2,f2,D],[x1,f1,D]);
    quad([x2,b2,-D],[x1,b1,-D],[x1,r1,-D],[x2,r2,-D]);
    quad([x1,f1,D],[x2,f2,D],[x2,r2,-D],[x1,r1,-D]);
    quad([x2,b2,D],[x1,b1,D],[x1,b1,-D],[x2,b2,-D]);
    for(const z of [-D,D]) {
      const y1=top(x1,z),y2=top(x2,z);
      // Hide the meniscus against the ceiling or on dry sections.
      if(y1<=b1+.001&&y2<=b2+.001)continue;
      if(waterSurface(x1,z,level,t)>=ceiling(x1)&&waterSurface(x2,z,level,t)>=ceiling(x2))continue;
      const band=x=>.025+.014*(.5+.5*Math.sin(x*6+t*Math.PI));
      const face=z+Math.sign(z)*.002;
      crestQuad([x1,Math.max(b1,y1-band(x1)),face],[x2,Math.max(b2,y2-band(x2)),face],[x2,y2,face],[x1,y1,face]);
    }
  }
  liquidGeo.setDrawRange(0,k/3);liquid.visible=k>0;
  liquidGeo.attributes.position.needsUpdate=true;
  liquidGeo.computeVertexNormals();liquidGeo.computeBoundingSphere();
  crestGeo.setDrawRange(0,c/3);crest.visible=c>0;
  crestGeo.attributes.position.needsUpdate=true;crestGeo.computeBoundingSphere();
}
// First grow the empty glass, then fill quickly and hold the success state.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');const duration=1.6;
let time=reducedMotion.matches?duration:0,last=performance.now(),lightTheme=false;
function setTheme(light){lightTheme=light;document.body.classList.toggle('light',light);liquidMat.color.set(light?liquidColors.light:liquidColors.dark);crestMaterial.color.set(light?0xa5e7bf:0xc3f5dc);document.querySelector('#theme').textContent=light?'Тёмный фон':'Светлый фон';}
setTheme(false);document.querySelector('#theme').onclick=()=>setTheme(!lightTheme);document.querySelector('#replay').onclick=()=>{time=reducedMotion.matches?duration:0;};reducedMotion.addEventListener('change',e=>{if(e.matches)time=duration;});
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=width<500?8.3:6.8;camera.updateProjectionMatrix();}).observe(host);
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!document.hidden)time=Math.min(duration,time+dt);
 const grow=1-Math.pow(1-THREE.MathUtils.clamp(time/.35,0,1),3);coin.scale.setScalar(.08+.92*grow);
 const fill=THREE.MathUtils.smoothstep(time,.36,1.48);const level=-.68+fill*1.42;
 water(level,time);updateBubbles(level,time);renderer.render(scene,camera);
}requestAnimationFrame(frame);
