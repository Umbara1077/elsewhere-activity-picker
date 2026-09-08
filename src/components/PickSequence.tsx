import { motion } from 'motion/react';
import { Compass, Sparkles } from 'lucide-react';
import type { Activity } from '../types';

export default function PickSequence({items,rolling,reduced}:{items:Activity[];rolling:number;reduced:boolean}) {
 const active=items[rolling%items.length];
 const fallbackImage = `${import.meta.env.BASE_URL}images/coast.jpg`;
 return <div className="reveal-sequence"><div className="reveal-coordinates"><span>YOUR MOOD. YOUR MOMENT.</span><span>FINDING THE ONE</span></div><div className="reveal-tunnel" aria-hidden="true">{[0,1,2,3].map(i=><motion.div className="tunnel-ring" key={i} animate={reduced?{}:{scale:[.3,1.8],opacity:[0,.55,0],rotate:[0,50]}} transition={{duration:2.8,repeat:Infinity,delay:i*.7,ease:'linear'}}/>)}<div className="reveal-compass"><Compass size={54}/></div></div><div className="reveal-films" aria-hidden="true">{[-1,0,1].map((offset)=><motion.div key={offset} className={`reveal-film film-${offset}`} animate={reduced?{}:{y:offset===0?[0,-8,0]:[0,8,0],rotate:offset*11}} transition={{duration:2,repeat:Infinity}}><img src={items[(rolling+offset+items.length)%items.length]?.image||fallbackImage} alt=""/><span>ELSEWHERE / {String(rolling+offset+items.length).padStart(2,'0')}</span></motion.div>)}</div><div className="reveal-title"><Sparkles size={17}/><span>{active?.title||'Something unexpected'}</span></div><div className="reveal-progress"><motion.span initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:reduced?.15:3.4,ease:[.22,.4,.2,1]}}/></div><p>Good things happen when you say yes.</p></div>;
}

