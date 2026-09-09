import { Check, Palette, Sparkles } from 'lucide-react';

export const visualStyles = [
 {id:'midnight',name:'Midnight garden',note:'Emerald shadows. Electric light.',number:'01'},
 {id:'bluehour',name:'Blue hour',note:'Cool skies. A little mystery.',number:'02'},
 {id:'golden',name:'Golden hour',note:'Warm glow. Stay a little longer.',number:'03'},
] as const;
export type VisualStyle = typeof visualStyles[number]['id'];

export default function StyleStudio({value,onChange}:{value:VisualStyle;onChange:(value:VisualStyle)=>void}) {
 return <section className="style-studio" aria-label="Visual style">
  <div className="studio-heading"><div><span className="studio-kicker"><Palette size={13}/> SET THE SCENE</span><h2>Same possibilities.<br/><em>Your kind of atmosphere.</em></h2></div><p>Choose the look that feels like you.</p></div>
  <div className="style-options" role="group" aria-label="Choose a visual style">{visualStyles.map(style=><button key={style.id} className={`style-tile style-${style.id}`} aria-pressed={value===style.id} onClick={()=>onChange(style.id)} aria-label={style.name}>
   <span className="style-scene" aria-hidden="true"><span className="scene-horizon"/><span className="scene-portal"/><span className="scene-sun"/><span className="scene-stars">✧</span><span className="scene-number">{style.number}</span></span>
   <span className="style-tile-copy"><span><strong>{style.name}</strong><small>{style.note}</small></span><span className="style-check" aria-hidden="true">{value===style.id?<Check size={15}/>:<Sparkles size={15}/>}</span></span>
  </button>)}</div>
 </section>;
}
