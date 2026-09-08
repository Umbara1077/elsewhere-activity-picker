import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { geocode, getDiscoveries } from './providers.mjs';

const ticketmasterKey=defineString('TICKETMASTER_API_KEY',{default:''});
const placesKey=defineString('GOOGLE_PLACES_API_KEY',{default:''});

export async function discoverHandler(request,response) {
 if(request.method&&request.method!=='GET')return response.status(405).json({error:'Only GET is supported.'});
 const zip=String(request.query.zip||'').trim(),radius=Number(request.query.radius||25);
 if(!/^\d{5}$/.test(zip)||![5,10,25,50,100].includes(radius))return response.status(400).json({error:'Use a five-digit US ZIP code and a supported radius.'});
 try{
  const location=await geocode(zip);
  const result=await getDiscoveries(location,radius,{ticketmaster:ticketmasterKey.value(),google:placesKey.value()});
  return response.json({location,...result});
 }catch{return response.status(502).json({error:'Local sources are unavailable right now. Please retry shortly.'});}
}
export const discover=onRequest({region:'us-east1',cors:false,timeoutSeconds:60,memory:'256MiB',maxInstances:2},discoverHandler);
