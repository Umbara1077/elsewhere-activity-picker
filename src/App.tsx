import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'motion/react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, ChevronDown, Compass, Dices, Heart, MapPin, Mountain, Music2, Plus, Search, SlidersHorizontal, Sparkles, Sun, TreePine, Utensils, Waves, X, LoaderCircle, Clock3, ExternalLink, RotateCcw, Navigation, LogOut, Accessibility, Coffee, MoveUpRight, Ticket, Wallet, Smile } from 'lucide-react';
import { googleSignIn, logOut } from './lib/firebase';
import { useStored } from './lib/storage';
import { filterActivities } from './lib/picker.mjs';
import { initialFilters, photos } from './data';
import type { Activity, Category, Filters, Location, Mood } from './types';
import CinematicHero from './components/CinematicHero';
import PickSequence from './components/PickSequence';
import IdeaOrbit from './components/IdeaOrbit';
import { useAccountPlaces } from './lib/useAccountPlaces';
import { validActivity } from './lib/places-state.mjs';
import { activityDate } from './lib/picker.mjs';
import { discoverLocal, mergeLocalActivities, chooseLocal } from './lib/discovery-client.mjs';

const categories = [{id:'all',label:'A little of everything',icon:Compass},{id:'food',label:'Food & drink',icon:Utensils},{id:'outdoors',label:'The great outdoors',icon:TreePine},{id:'events',label:'Local happenings',icon:Ticket},{id:'culture',label:'Something different',icon:Sparkles},{id:'daytrip',label:'Day trips',icon:Waves}] as const;
const moods = [{id:'anything',label:'Anything goes',icon:Sparkles},{id:'romantic',label:'Romantic',icon:Heart},{id:'fun',label:'Fun & social',icon:Smile},{id:'chill',label:'Chill',icon:Coffee},{id:'adventurous',label:'Adventurous',icon:Mountain},{id:'family',label:'Family time',icon:Sun}] as const;
const categoryName = (c: Category) => categories.find(x=>x.id===c)?.label || 'Activity';
const fallbackImage = (a: Activity) => a.image || (a.category==='food'||a.category==='culture'?photos.dining:a.category==='events'?photos.event:photos.coast);
const priceLabel = (a: Activity) => a.price == null ? 'Check cost' : a.price===0?'Free':`From $${a.price}`;
const whenLabel = (a: Activity) => a.date ? activityDate(a.date).toLocaleDateString(undefined, {month:'short',day:'numeric'}) : a.duration || 'Local place';
function publicLink(value?: string) { try { const u=new URL(value||'');return u.protocol==='https:'||u.protocol==='http:'?u.href:undefined; } catch { return undefined; } }

function Modal({open,onClose,title,children,className=''}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode;className?:string}) {
 return <Dialog.Root open={open} onOpenChange={v=>!v&&onClose()}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className={`dialog-content ${className}`} aria-describedby={undefined}><Dialog.Title className="dialog-title">{title}</Dialog.Title><Dialog.Close className="icon-button close-button" aria-label="Close"><X size={21}/></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export default function App() {
 const [filters,setFilters]=useState<Filters>(initialFilters);
 const [location,setLocation]=useStored<Location|null>('elsewhere-location',null);
 const [zip,setZip]=useState(location?.zip||'08094');

 const [results,setResults]=useState<Activity[]>([]);
 const [view,setView]=useState('discover');

 const [loading,setLoading]=useState(false);
 const [sourceStatus,setSourceStatus]=useState('');
 const [toast,setToast]=useState('');
 const {user,saved,visited,personal,savedRecords,setSaved,setVisited,setPersonal,setSavedRecords,cloudSynced}=useAccountPlaces(setToast);
 const [displayMode,setDisplayMode]=useState<'cards'|'orbit'>('cards');

 const {scrollYProgress}=useScroll();
 const [selected,setSelected]=useState<Activity|null>(null);
 const [picking,setPicking]=useState(false);
 const [rolling,setRolling]=useState(0);
 const [filterOpen,setFilterOpen]=useState(false);
 const [addOpen,setAddOpen]=useState(false);
 const [signInOpen,setSignInOpen]=useState(false);
 const [signingIn,setSigningIn]=useState(false);
 const [showAll,setShowAll]=useState(false);
 const [formError,setFormError]=useState('');
 const [motionPaused,setMotionPaused]=useStored('elsewhere-motion-paused',false);
 const systemReduced=useReducedMotion();
 const reduced=systemReduced||motionPaused;
 const requestId=useRef(0);
 const pickHistory=useRef<string[]>([]);
 const pickRun=useRef(0);
 const [pickItems,setPickItems]=useState<Activity[]>([]);
 const pickTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const searchRef=useRef<HTMLInputElement>(null);
 const allItems=useMemo(()=>mergeLocalActivities(personal,savedRecords,results,location) as Activity[],[personal,results,savedRecords,location]);
 const filtered=useMemo(()=>filterActivities(allItems,filters,visited) as Activity[],[allItems,filters,visited]);
 const displayed=view==='saved'?allItems.filter(a=>(saved.includes(a.id)||a.personal)&&(!filters.query||`${a.title} ${a.description}`.toLowerCase().includes(filters.query.toLowerCase()))):filtered;
 const liveCount=filtered.filter(a=>!a.inspiration&&!a.personal).length;
 const update=<K extends keyof Filters>(k:K,v:Filters[K])=>{setFilters(f=>({...f,[k]:v,...(k==='category'&&v!=='food'?{dining:'any'}:{})}));setShowAll(false);};
 const scrollResults=()=>document.getElementById('discoveries')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});

 useEffect(()=>{ if(!toast)return; const timer=setTimeout(()=>setToast(''),5500); return()=>clearTimeout(timer); },[toast]);
 useEffect(()=>()=>{pickRun.current++;if(pickTimer.current)clearTimeout(pickTimer.current);},[]);
 useEffect(()=>{if(!picking)return;const id=setInterval(()=>setRolling(n=>n+1),140);return()=>clearInterval(id);},[picking]);
 useEffect(()=>{document.documentElement.dataset.motion=reduced?'reduced':'full';},[reduced]);

 useEffect(()=>{
  if(!/^\d{5}$/.test(zip.trim())){setResults([]);setLoading(false);return;}
  setResults([]);setLoading(true);setSourceStatus('');
  const timer=setTimeout(()=>{void discover();},450);
  return()=>{clearTimeout(timer);requestId.current++;pickRun.current++;};
 },[zip,filters.radius]);

 async function discover(event?:FormEvent) {
  event?.preventDefault();
  if(!/^\d{5}$/.test(zip.trim())){setFormError('Enter a valid 5-digit US ZIP code.');searchRef.current?.focus();return null;}
  setFormError('');setLoading(true);setSourceStatus('');
  const current=++requestId.current;
  try {
   const snapshot=await discoverLocal(zip.trim(),filters.radius);
   if(current===requestId.current){setLocation(snapshot.location);setResults(snapshot.activities);setSourceStatus(snapshot.message);}
   return snapshot;
  } catch(error) {
   if(current===requestId.current)setSourceStatus(error instanceof Error?error.message:'Could not load nearby places. Please retry.');
   return null;
  } finally {if(current===requestId.current)setLoading(false);}
 }

 function save(a:Activity) {
  if(saved.includes(a.id)){setSaved(s=>s.filter(id=>id!==a.id));setToast('Removed from your saved places.');}
  else {setSaved(s=>[...s,a.id]);setSavedRecords(s=>[...s.filter(x=>x.id!==a.id),a]);setToast('A good plan for later. Saved!');}
 }
 async function surprise(){
  if(picking)return;
  if(!/^\d{5}$/.test(zip.trim())){setToast('Enter a five-digit ZIP so I can find a real place for you.');return;}
  const token=++pickRun.current;
  setPicking(true);setSelected(null);setPickItems(filtered);
  const started=Date.now();
  const snapshot=await discover();
  if(token!==pickRun.current){setPicking(false);return;}
  const pool=mergeLocalActivities(personal,savedRecords,snapshot?.activities||[],snapshot?.location||location) as Activity[];
  const choice=chooseLocal(pool,filters,visited,pickHistory.current) as Activity|null;
  if(!choice){
   setPicking(false);
   setToast(snapshot?'No verified matches for this combination. Romantic dining requires atmosphere details and confirmed seating. Try a wider radius or another mood.':'I couldn’t reach the local listings. Please retry; I won’t substitute a generic idea.');
   return;
  }
  setPickItems(filterActivities(pool,filters,visited));
  pickHistory.current=[...pickHistory.current,choice.id].slice(-100);
  const delay=reduced?0:Math.max(650,3000-(Date.now()-started));
  pickTimer.current=setTimeout(()=>{if(token===pickRun.current){setPicking(false);setSelected(choice);}},delay);
 }

 async function signIn(){setSigningIn(true);try{await googleSignIn();setSignInOpen(false);setToast('You’re in. Let’s find your next good day.');}catch(e){setToast(e instanceof Error?e.message:'Sign-in could not finish. Please try again.');}finally{setSigningIn(false);}}
 function addPlace(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const data=new FormData(e.currentTarget),category=data.get('category') as Category;
  const item:Activity={id:`personal-${crypto.randomUUID()}`,title:String(data.get('name')).trim(),description:String(data.get('notes')||'One of your own good ideas.'),category,moods:[data.get('mood') as Mood],source:'Your place',personal:true,address:String(data.get('address')||''),url:publicLink(String(data.get('url')||'')),dining:category==='food'?(data.get('dining')==='both'?['sitdown','takeout']:[data.get('dining') as 'sitdown'|'takeout']):undefined,price:data.get('price')!==''?Number(data.get('price')):undefined};
  if(!item.title)return;setPersonal(p=>[item,...p]);setSaved(s=>[...s,item.id]);setAddOpen(false);setToast('Your place is in the mix.');
 }
 const directions=(a:Activity)=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.lat!=null&&a.lon!=null?`${a.lat},${a.lon}`:`${a.title} ${a.address||''}`)}`;
 const acceptPlan=(a:Activity)=>{if(!saved.includes(a.id)){setSaved(ids=>[...ids,a.id]);setSavedRecords(records=>[...records.filter(r=>r.id!==a.id),a]);}setToast(`Your plan: ${a.title}. Saved to My places.`);setSelected(null);};

 return <div className="app-shell">
  <motion.div className="immersive-progress" style={{scaleX:scrollYProgress}} aria-hidden="true"/>
  <a className="skip-link" href="#picker">Skip to activity picker</a>
  <header className="site-header"><button className="brand" onClick={()=>{setView('discover');setFilters(initialFilters);window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}} aria-label="Elsewhere home"><span className="brand-symbol">✳</span> elsewhere<span className="brand-dot">®</span></button>
   <nav aria-label="Main navigation"><button className={view==='discover'?'active':''} onClick={()=>{setView('discover');update('category','all');}}>Discover</button><button className={view==='events'?'active':''} onClick={()=>{setView('events');update('category','events');setTimeout(scrollResults,50);}}>What’s on <span className="nav-dot"/></button><button className={view==='saved'?'active':''} onClick={()=>{setView('saved');setTimeout(scrollResults,50);}}>My places {saved.length>0&&<span className="count-badge">{saved.length}</span>}</button></nav>
   {user?<button className="sign-in" onClick={()=>{logOut().catch(()=>setToast('Could not sign out. Please try again.'));}}><span className="avatar">{user.displayName?.[0]||'Y'}</span><span>{user.displayName?.split(' ')[0]}</span><LogOut size={16}/></button>:<button className="sign-in" onClick={()=>setSignInOpen(true)}><span className="google-g">G</span><span>Sign in</span><ArrowUpRight size={16}/></button>}
  </header>

  <main>
   <CinematicHero mood={filters.mood} onMood={m=>update('mood',m)} onSurprise={surprise} onExplore={()=>document.getElementById('picker')?.scrollIntoView({behavior:reduced?'instant':'smooth'})} reduced={Boolean(reduced)} city={location?`${location.city}, ${location.state}`:'STARTING AT 08094'}/>

   <section className="picker-panel" id="picker" aria-label="Activity picker">
    <div className="category-row" role="group" aria-label="Activity category">{categories.map(({id,label,icon:Icon})=><button key={id} className={`category-tab ${filters.category===id?'selected':''}`} onClick={()=>{update('category',id);setView('discover');}}><Icon size={18}/>{label}</button>)}</div>
    <div className="picker-body"><div className="quick-plans" role="group" aria-label="Quick plans"><span>Start with a plan</span>{[{label:'Date-night dinner',values:{category:'food',mood:'romantic',dining:'sitdown'}},{label:'Rainy-day fun',values:{category:'culture',mood:'fun',indoor:'indoor'}},{label:'Family outing',values:{category:'all',mood:'family'}},{label:'Shore escape',values:{category:'daytrip',mood:'chill',radius:50}},{label:'This weekend',values:{category:'events',date:'weekend'}}].map(p=><button key={p.label} onClick={()=>{setFilters({...initialFilters,...p.values} as Filters);setView('discover');}}>{p.label}</button>)}</div><div className="mood-line"><span className="small-heading">Set the mood</span><div className="mood-options">{moods.map(({id,label,icon:Icon})=><button key={id} aria-pressed={filters.mood===id} className={`mood-chip ${filters.mood===id?'selected':''}`} onClick={()=>update('mood',id)}><Icon size={15}/>{label}</button>)}</div></div>
     <form className="search-row" onSubmit={discover}><label className={`search-field location-field ${formError?'invalid':''}`}><MapPin size={20}/><span><span className="field-caption">STARTING FROM</span><input ref={searchRef} value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,'').slice(0,5))} inputMode="numeric" autoComplete="postal-code" placeholder="Enter your ZIP code" aria-label="US ZIP code" aria-invalid={Boolean(formError)}/></span>{location&&<span className="location-name">{location.city}</span>}</label>
      <label className="search-field"><Navigation size={19}/><span><span className="field-caption">HOW FAR?</span><select value={filters.radius} onChange={e=>update('radius',Number(e.target.value))} aria-label="Search radius">{[5,10,25,50,100].map(n=><option key={n} value={n}>{n} miles</option>)}</select></span></label>
      <label className="search-field when-field"><CalendarDays size={19}/><span><span className="field-caption">WHEN?</span><select value={filters.date} onChange={e=>update('date',e.target.value)} aria-label="Event date"><option value="any">I’m flexible</option><option value="today">Today</option><option value="weekend">This weekend</option></select></span></label>
      <button type="button" className={`more-filters ${filters.budget<200||filters.indoor!=='any'||filters.accessible?'has-filters':''}`} onClick={()=>setFilterOpen(true)} aria-label="More filters"><SlidersHorizontal size={20}/></button>
      <button className="search-button" type="submit" disabled={loading} aria-label="Find nearby places">{loading?<LoaderCircle size={20} className="spin"/>:<Search size={20}/>}</button>
      <button type="button" className="surprise-button" onClick={surprise} disabled={picking}><Dices size={21}/><span>Surprise me</span><ArrowUpRight size={20}/></button>
     </form>{formError&&<p role="alert" className="form-error">{formError}</p>}
     <div className="picker-bottom"><label className="switch-label"><input type="checkbox" checked={filters.newOnly} onChange={e=>update('newOnly',e.target.checked)}/><span className="switch-track"/>Somewhere new to me <Sparkles size={13}/></label><span className="picker-hint">Less “I don’t know.” More “let’s go.”</span></div>
     {filters.category==='food'&&<div className="dining-options"><span>How are we eating?</span>{[{id:'any',label:'Either works'},{id:'sitdown',label:'Sit down'},{id:'takeout',label:'Take out'}].map(o=><button key={o.id} className={filters.dining===o.id?'selected':''} onClick={()=>update('dining',o.id)}>{o.label}</button>)}</div>}
    </div>
   </section>

   <section className="discoveries" id="discoveries">
    <div className="section-top"><div><div className="eyebrow">{view==='saved'?'YOUR EVER-GROWING GOOD-IDEA LIST':location?`AROUND ${location.city.toUpperCase()}, ${location.state}`:'A BREAK FROM THE SAME OLD'}</div><h2>{view==='saved'?'Keep the good ones.':filters.category==='events'?'Be there for it.':filters.mood==='romantic'?'A little time for two.':'Your next “why not?”'}<span className="section-spark">✳</span></h2></div><div className="section-actions"><div className="view-mode" role="group" aria-label="Discovery display"><button className={displayMode==='cards'?'active':''} onClick={()=>setDisplayMode('cards')}>Cards</button><button className={displayMode==='orbit'?'active':''} onClick={()=>setDisplayMode('orbit')}>Idea orbit</button></div><button className="text-button" onClick={()=>setAddOpen(true)}><Plus size={17}/>Add your own</button><button className="view-all" onClick={()=>setShowAll(v=>!v)}>{showAll?'Show less':'Explore all'}<ArrowUpRight size={17}/></button></div></div>
    <div className="results-toolbar"><span>{view==='saved'?`${displayed.length} saved & personal places`:liveCount?`${liveCount} actual places & events`:(loading?'Finding nearby places…':'Local places, chosen for you')}<span className="result-divider">/</span>{view==='saved'?(user?(cloudSynced?'Synced to your account':'Saved here · sync pending'):'Saved on this device'):'Nearby results load automatically'}</span><label className="compact-search"><Search size={15}/><input aria-label="Search discoveries" placeholder="Search local places…" value={filters.query} onChange={e=>update('query',e.target.value)}/></label></div>
    {sourceStatus&&<div className="source-notice"><Compass size={18}/><span>{sourceStatus}</span></div>}
    {loading&&<div className="loading-bar"><span/><p>Looking for the good stuff around you…</p></div>}
    {displayMode==='orbit'?<IdeaOrbit items={displayed} onSelect={setSelected} reduced={Boolean(reduced)}/>:<motion.div layout={!reduced} className="activity-grid"><AnimatePresence mode="popLayout">{displayed.slice(0,showAll?60:6).map((a,i)=><motion.article layout={!reduced} initial={reduced?false:{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.95}} transition={{duration:.35,delay:Math.min(i*.04,.2)}} className="activity-card" key={a.id} onPointerMove={e=>{if(reduced||e.pointerType!=='mouse')return;const rect=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--tilt-x',String((e.clientX-rect.left)/rect.width*2-1));e.currentTarget.style.setProperty('--tilt-y',String((e.clientY-rect.top)/rect.height*2-1));}} onPointerLeave={e=>{e.currentTarget.style.setProperty('--tilt-x','0');e.currentTarget.style.setProperty('--tilt-y','0');}}><button className="card-image-button" onClick={()=>setSelected(a)} aria-label={`View ${a.title}`}><img loading="lazy" src={fallbackImage(a)} alt={a.image&&!a.inspiration?a.title:`Illustrative ${categoryName(a.category).toLowerCase()} photography`} onError={e=>{e.currentTarget.src=photos.coast;}}/><div className="card-gradient"/><span className={`card-tag ${a.category}`}><span/>{a.inspiration?'THE IDEA':a.personal?'YOUR PLACE':a.source}</span><span className="image-category">{a.category==='food'?'Good food, good company':a.category==='events'?'You had to be there':a.category==='culture'?'Follow your curiosity':'A breath of something new'}</span>{a.date&&<span className="date-tag">{activityDate(a.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>}</button><button className={`save-button ${saved.includes(a.id)?'is-saved':''}`} aria-label={saved.includes(a.id)?`Unsave ${a.title}`:`Save ${a.title}`} aria-pressed={saved.includes(a.id)} onClick={()=>save(a)}><Bookmark size={18} fill={saved.includes(a.id)?'currentColor':'none'}/></button><div className="card-copy"><div className="card-meta"><span>{categoryName(a.category)}</span>{visited.includes(a.id)?<span className="visited-tag"><Check size={12}/>Been there</span>:!a.inspiration&&<span>{a.distance!=null?`${a.distance.toFixed(1)} mi away`:'Your pick'}</span>}</div><button className="card-title" onClick={()=>setSelected(a)}>{a.title}<ArrowUpRight size={19}/></button><p>{a.description}</p><div className="card-footer"><span><Clock3 size={14}/>{whenLabel(a)}</span><span>{priceLabel(a)}</span></div></div></motion.article>)}</AnimatePresence></motion.div>}
    {!loading&&displayed.length===0&&<div className="empty-state"><Compass size={36}/><h3>{view==='saved'?'Good plans deserve a bookmark.':'No local matches yet.'}</h3><p>{view==='saved'?'Tap the bookmark on any idea, or add a favorite of your own.':'Your preferences are strict: unknown atmosphere, dining service, prices, and accessibility cannot qualify. Try a wider radius or change one preference. Dated events depend on available organizer listings.'}</p><button className="dark-button" onClick={()=>{setFilters(initialFilters);setView('discover');}}>Reset filters <ArrowRight size={17}/></button></div>}
   </section>

   <section className="happenings-feature"><div className="feature-image"><img src={photos.event} alt="An outdoor festival crowd enjoying live music at dusk — illustrative photo" loading="lazy"/><span className="feature-photo-tag"><Music2 size={15}/> LITTLE MOMENTS. BIG MEMORIES.</span></div><div className="feature-copy"><span className="eyebrow"><span className="green-dot"/> DON’T FIND OUT THE DAY AFTER</span><h2>The best plans<br/>aren’t always<br/><em>on your radar.</em></h2><p>Park concerts. Pop-up markets. That neighborhood festival you almost missed. Find out what’s happening around you, while it’s still happening.</p><button className="dark-button" onClick={()=>{setView('events');update('category','events');scrollResults();}}>Find local happenings<ArrowUpRight size={19}/></button><span className="feature-fineprint">Real sources. Clear dates. More reasons to get out.</span></div></section>
   <section className="last-call"><span className="big-spark">✳</span><div><h2>A good day doesn’t have to be a big plan.</h2><p>Pick a mood. Take a chance. Go make a memory.</p></div><button className="surprise-button" onClick={surprise} disabled={picking}><Dices size={20}/>Pick something for me<ArrowUpRight size={19}/></button></section>
  </main>
  <footer><button className="brand" onClick={()=>window.scrollTo({top:0,behavior:reduced?'instant':'smooth'})}><span className="brand-symbol">✳</span>elsewhere<span className="brand-dot">®</span></button><span>For the days you’ll talk about later.</span><button className="motion-toggle" onClick={()=>setMotionPaused(v=>!v)}>{reduced?'Motion: calm':'Motion: on'}<span className={reduced?'':'green-dot'}/></button><span className="copyright">© {new Date().getFullYear()} Elsewhere</span></footer>

  <div className="mobile-pick-bar"><span>{loading?'Finding your options…':filtered.length+' matching options'}</span><button onClick={surprise} disabled={picking}>Pick our plan</button></div>
  <Modal open={filterOpen} onClose={()=>setFilterOpen(false)} title="Make it your kind of day."><p className="modal-intro">A few details help narrow down the good stuff.</p><div className="filter-fields"><label><span><Wallet size={17}/>Budget per person</span><select value={filters.budget} onChange={e=>update('budget',Number(e.target.value))}><option value={200}>Any budget</option><option value={0}>Free only</option><option value={20}>Up to $20</option><option value={50}>Up to $50</option><option value={100}>Up to $100</option></select></label><label><span><Sun size={17}/>Setting</span><select value={filters.indoor} onChange={e=>update('indoor',e.target.value)}><option value="any">Indoors or outdoors</option><option value="indoor">Indoors / rainy day</option><option value="outdoor">Outdoors</option></select></label><label><span><Utensils size={17}/>Dining style</span><select value={filters.dining} onChange={e=>update('dining',e.target.value)}><option value="any">Either works</option><option value="sitdown">Sit down</option><option value="takeout">Take out</option></select></label><label className="checkbox-field"><input type="checkbox" checked={filters.accessible} onChange={e=>update('accessible',e.target.checked)}/><Accessibility size={18}/>Confirmed wheelchair access</label><p className="muted">Strict filters include only places with known details. Verify access, opening hours, and prices with the venue.</p></div><div className="modal-actions"><button className="text-button" onClick={()=>setFilters(initialFilters)}><RotateCcw size={16}/>Reset</button><button className="dark-button" onClick={()=>setFilterOpen(false)}>Show {filtered.length} ideas<ArrowRight size={17}/></button></div></Modal>

  <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Put a good place in the mix."><p className="modal-intro">Your favorite restaurant, a beach to try, or a plan you’ve been meaning to make.</p><form onSubmit={addPlace} className="add-form"><label>Place or activity name<input name="name" required maxLength={120} placeholder="e.g. Our favorite little Italian place"/></label><div className="form-two"><label>Kind of plan<select name="category">{categories.filter(c=>c.id!=='all').map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>The mood<select name="mood">{moods.filter(c=>c.id!=='anything').map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div><label>Address or area<input name="address" placeholder="Street, town, or ZIP" maxLength={240}/></label><div className="form-two"><label>Dining style<select name="dining"><option value="both">Sit down & take out</option><option value="sitdown">Sit down</option><option value="takeout">Take out</option></select></label><label>Cost per person ($)<input name="price" type="number" min="0" max="10000" placeholder="Optional"/></label></div><label>Website or event link<input name="url" type="url" placeholder="https://…" maxLength={1000}/></label><label>Your notes<textarea name="notes" placeholder="What makes this one worth a visit?" maxLength={1000}/></label><button className="dark-button" type="submit">Add to my places<Plus size={18}/></button></form></Modal>

  <Modal open={signInOpen} onClose={()=>setSignInOpen(false)} title="Your kind of places. Everywhere."><div className="auth-art"><span>✳</span><Bookmark size={38}/><Heart size={27}/></div><p className="modal-intro">Save the places you love, keep track of where you’ve been, and bring your good ideas along on every device.</p><button className="google-button" onClick={signIn} disabled={signingIn}><span className="google-g">G</span>{signingIn?'Signing you in…':'Continue with Google'}</button><p className="auth-note">You can also explore and save on this device without an account.</p></Modal>

  <Modal open={picking||Boolean(selected)} onClose={()=>{pickRun.current++;setSelected(null);setPicking(false);if(pickTimer.current)clearTimeout(pickTimer.current);}} title={picking?'Finding your actual next stop…':selected?.title||'Your next adventure'} className="result-dialog">
   {picking?<PickSequence items={pickItems} rolling={rolling} reduced={Boolean(reduced)}/>:selected&&<><div className="result-image"><img src={fallbackImage(selected)} alt="Activity inspiration"/><span className="result-badge"><Sparkles size={15}/>{selected.inspiration?'YOUR NEXT GOOD IDEA':'DECIDED. HERE’S YOUR NEXT STOP.'}</span></div><div className="result-body"><div className="result-meta"><span><Clock3 size={16}/>{whenLabel(selected)}</span><span>{priceLabel(selected)}</span>{selected.distance!=null&&<span><MapPin size={16}/>{selected.distance.toFixed(1)} miles</span>}</div><p>{selected.description}</p>{selected.address&&<p className="address"><MapPin size={16}/>{selected.address}</p>}{selected.date&&<p className="event-time"><CalendarDays size={17}/>{activityDate(selected.date).toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})}</p>}{selected.hours&&<p className="venue-hours"><Clock3 size={17}/>Hours listed: {selected.hours}</p>}<div className="result-moods">{selected.moods.filter(m=>m!=='anything').map(m=><span key={m}>{moods.find(x=>x.id===m)?.label}</span>)}</div><div className="source-detail">{selected.inspiration?'An outing idea to make your own. Photography is illustrative; this is not a scheduled event or verified local venue.':`Source: ${selected.source}. ${selected.image?'':'Photo is illustrative. '}Confirm current hours and availability with the venue.`}</div><div className="result-actions"><button className="dark-button" onClick={()=>acceptPlan(selected)}>That’s the plan<Check size={17}/></button><button className={`outline-button ${saved.includes(selected.id)?'saved':''}`} onClick={()=>save(selected)}><Bookmark size={17} fill={saved.includes(selected.id)?'currentColor':'none'}/>{saved.includes(selected.id)?'Saved':'Save'}</button></div><div className="result-outbound"><a href={directions(selected)} target="_blank" rel="noopener noreferrer"><Navigation size={15}/>Get directions</a>{publicLink(selected.url)&&<a href={publicLink(selected.url)} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>{selected.category==='events'?'Official event page':'Venue website / source'}</a>}</div><div className="result-bottom"><button className="text-button" onClick={()=>{setVisited(v=>v.includes(selected.id)?v.filter(id=>id!==selected.id):[...v,selected.id]);}}><Check size={16}/>{visited.includes(selected.id)?'Been there ✓':'Mark as visited'}</button><button className="text-button" onClick={surprise}><Dices size={17}/>Roll again</button></div>{selected.personal&&<button className="delete-place" onClick={()=>{setPersonal(p=>p.filter(a=>a.id!==selected.id));setSaved(s=>s.filter(id=>id!==selected.id));setSavedRecords(s=>s.filter(a=>a.id!==selected.id));setSelected(null);setToast('Place removed.');}}>Remove my place</button>}</div></>}
  </Modal>
  <AnimatePresence>{toast&&<motion.div className="toast" role="status" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}><span className="toast-icon"><Sparkles size={17}/></span><p>{toast}</p><button aria-label="Dismiss message" onClick={()=>setToast('')}><X size={16}/></button></motion.div>}</AnimatePresence>
 </div>;
}
