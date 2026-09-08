import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowDown, ArrowUpRight, AudioLines, Compass, Dices, Heart, Leaf, MapPin, Sparkles, Waves } from 'lucide-react';
import type { Mood } from '../types';

const asset = (name:string) => `${import.meta.env.BASE_URL}images/${name}`;
const worlds = [
 { id: 'anything', name: 'The possibilities', caption: 'A little less ordinary.', image: asset('portal.png'), label: 'FOLLOW YOUR CURIOSITY', icon: Compass },
 { id: 'romantic', name: 'Just the two of us', caption: 'Stay a little longer.', image: asset('dining.jpg'), label: 'A TABLE. A MOMENT. A MEMORY.', icon: Heart },
 { id: 'adventurous', name: 'The scenic route', caption: 'Out of the everyday.', image: asset('coast.jpg'), label: 'TAKE THE LONG WAY HOME', icon: Waves },
 { id: 'fun', name: 'After the sun goes down', caption: 'Be part of the moment.', image: asset('event.jpg'), label: 'GOOD COMPANY. GREAT STORIES.', icon: AudioLines },
] as const;

function Stardust({ reduced }: { reduced: boolean }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const el=canvas.current;if(!el||reduced)return;
  const ctx=el.getContext('2d');if(!ctx)return;
  let width=0,height=0,frame=0,last=0,visible=true;
  const particles=Array.from({length:44},(_,i)=>({x:((i*137.508)%997)/997,y:((i*73.91)%887)/887,r:i%4===0?1.8:.75,speed:.003+(i%7)*.0008}));
  const resize=new ResizeObserver(entries=>{const {width:w,height:h}=entries[0].contentRect;width=w;height=h;const dpr=Math.min(devicePixelRatio,1.5);el.width=w*dpr;el.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);});resize.observe(el);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});intersection.observe(el);
  const draw=(now:number)=>{frame=requestAnimationFrame(draw);if(!visible||document.hidden||now-last<32)return;last=now;ctx.clearRect(0,0,width,height);particles.forEach((p,i)=>{const x=p.x*width+Math.sin(now*.00015+i)*14,y=((p.y-now*.000001*p.speed*100)%1+1)%1*height;ctx.fillStyle=`rgba(208,255,181,${.13+Math.sin(now*.0005+i)**2*.45})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();});};frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();};
 },[reduced]);
 return <canvas ref={canvas} className="stardust" aria-hidden="true"/>;
}

export default function CinematicHero({ mood, onMood, onSurprise, onExplore, reduced, city }: { mood:Mood;onMood:(mood:Mood)=>void;onSurprise:()=>void;onExplore:()=>void;reduced:boolean;city:string }) {
 const active=worlds.find(w=>w.id===mood)||worlds[0];
 const pointerX=useMotionValue(0),pointerY=useMotionValue(0);
 const x=useSpring(pointerX,{stiffness:45,damping:22}),y=useSpring(pointerY,{stiffness:45,damping:22});
 const rotateX=useTransform(y,[-1,1],[2,-2]),rotateY=useTransform(x,[-1,1],[-3,3]);
 const imageX=useTransform(x,[-1,1],[-14,14]),imageY=useTransform(y,[-1,1],[-9,9]);
 return <section className={`cinema-hero world-${active.id}`} aria-label="Find your next adventure" onPointerMove={e=>{if(reduced||e.pointerType!=='mouse')return;const r=e.currentTarget.getBoundingClientRect();pointerX.set((e.clientX-r.left)/r.width*2-1);pointerY.set((e.clientY-r.top)/r.height*2-1);}} onPointerLeave={()=>{pointerX.set(0);pointerY.set(0);}}>
  <div className="hero-world" aria-hidden="true"><AnimatePresence mode="sync"><motion.img key={active.image} src={active.image} className={`world-image ${active.id==='anything'?'portal-image':''}`} initial={reduced?false:{opacity:0,scale:1.09,filter:'blur(10px)'}} animate={{opacity:1,scale:1,filter:'blur(0px)'}} exit={{opacity:0,scale:1.03}} transition={{duration:reduced?0:1.1,ease:[.22,1,.36,1]}} style={{x:reduced?0:imageX,y:reduced?0:imageY}} fetchPriority="high" alt="" /></AnimatePresence><div className="world-vignette"/><div className="world-grid"/></div>
  <Stardust reduced={reduced}/>
  <div className="hero-status"><span><i/> OPEN TO POSSIBILITY</span><span><MapPin size={13}/>{city}</span></div>
  <div className="cinema-copy"><div className="eyebrow"><span className="line-accent"/> THE ART OF GOING SOMEWHERE</div><h1><span className="word-mask"><motion.span initial={reduced?false:{y:'110%'}} animate={{y:0}} transition={{duration:.9,ease:[.22,1,.36,1]}}>A little less</motion.span></span><span className="word-mask"><motion.em initial={reduced?false:{y:'110%'}} animate={{y:0}} transition={{duration:1,delay:.13,ease:[.22,1,.36,1]}}>ordinary.</motion.em></span><span className="title-asterisk" aria-hidden="true">✳</span></h1><motion.p initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.35,duration:.8}}>The unexpected dinner. The perfect escape.<br/>The night you’re still talking about.<br/><span>Your next good story starts here.</span></motion.p><div className="cinema-actions"><button className="portal-cta" onClick={onSurprise}><Dices size={21}/><span>Find my elsewhere</span><ArrowUpRight size={20}/></button><button className="explore-circle" onClick={onExplore} aria-label="Explore activity filters"><ArrowDown size={21}/></button></div></div>
  <motion.div className="world-caption" style={{rotateX:reduced?0:rotateX,rotateY:reduced?0:rotateY}}><span className="caption-orbit"><Sparkles size={20}/></span><div><span className="micro-label">{active.label}</span><AnimatePresence mode="wait"><motion.strong key={active.id} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.3}}>{active.caption}</motion.strong></AnimatePresence></div><ArrowUpRight size={17}/></motion.div>
  <div className="world-selector"><span className="world-selector-label">CHOOSE YOUR<br/><strong>state of mind.</strong></span><div className="world-options">{worlds.map((world,index)=>{const Icon=world.icon;return <button key={world.id} className={active.id===world.id?'current':''} onClick={()=>onMood(world.id)} aria-pressed={active.id===world.id}><span className="world-index">0{index+1}</span><Icon size={16}/><span>{world.name}</span>{active.id===world.id&&<motion.i layoutId="world-underline" transition={{type:'spring',stiffness:350,damping:35}}/>}</button>;})}</div><span className="world-count">0{worlds.indexOf(active)+1}<span>/ 04</span></span></div>
 </section>;
}

