export function activityDate(value) {
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)) {
  const [year,month,day]=value.split('-').map(Number);const parsed=new Date(year,month-1,day);
  return parsed.getFullYear()===year&&parsed.getMonth()===month-1&&parsed.getDate()===day?parsed:new Date(NaN);
 }
 return new Date(value);
}
export function milesBetween(lat1, lon1, lat2, lon2) {
 const rad=Math.PI/180,dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
 const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
 return 3958.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
}
export function filterActivities(items, filters, visited = [], now = new Date()) {
 return items.filter(a => {
  if(!a.personal && a.source==='OpenStreetMap' && filters.mood==='romantic' && a.classificationVersion!==2)return false;
  if (filters.category !== 'all' && a.category !== filters.category) return false;
  if (filters.mood !== 'anything' && !a.moods.includes(filters.mood)) return false;
  if (filters.newOnly && (visited.includes(a.id) || a.visited)) return false;
  if (a.distance != null && a.distance > filters.radius) return false;
  if (filters.budget < 200 && (a.price == null || a.price > filters.budget)) return false;
  if (filters.dining !== 'any' && (a.category !== 'food' || !a.dining?.includes(filters.dining))) return false;
  if (filters.indoor !== 'any' && a.indoor !== (filters.indoor === 'indoor')) return false;
  if (filters.accessible && a.accessible !== true) return false;
  if (filters.query && !`${a.title} ${a.description} ${a.address || ''}`.toLowerCase().includes(filters.query.toLowerCase())) return false;
  if (a.date) {
   const start = activityDate(a.date), end = a.endDate ? activityDate(a.endDate) : new Date(start);
   if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<start)return false;
   if(!a.endDate&&/^\d{4}-\d{2}-\d{2}$/.test(a.date))end.setHours(23,59,59,999);
   if (end.getTime() < now.getTime()) return false;
   if (filters.date === 'today') {
    const today=new Date(now);today.setHours(0,0,0,0);const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);
    if(start>=tomorrow||end<today)return false;
   }
   if (filters.date === 'weekend') {
    const saturday = new Date(now); saturday.setHours(0,0,0,0); saturday.setDate(now.getDate() + (now.getDay() === 0 ? -1 : (6-now.getDay()+7)%7));
    const monday = new Date(saturday); monday.setDate(saturday.getDate()+2);
    if (end < saturday || start >= monday) return false;
   }
  } else if (a.category === 'events' && filters.date !== 'any') return false;
  return true;
 });
}
export function pickActivity(items, previousId, random = Math.random) {
 const pool = items.length > 1 ? items.filter(a => a.id !== previousId) : items;
 return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : null;
}
