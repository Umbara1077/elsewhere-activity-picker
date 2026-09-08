import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { discoverHandler } from './functions/index.mjs';

// The preview and API start together; no separate backend terminal is required.
function localDiscovery():Plugin {
 const configure=(server:any)=>{
  const env=loadEnv('development','functions','');
  for(const key of ['TICKETMASTER_API_KEY','GOOGLE_PLACES_API_KEY','PUBLIC_EVENT_SOURCES','OVERPASS_URL'])if(env[key])process.env[key]=env[key];
  server.middlewares.use('/api/discover',async(req:any,res:any)=>{
   const url=new URL(req.url||'/','http://127.0.0.1');
   const response={status(code:number){res.statusCode=code;return response;},json(body:unknown){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));}};
   try{await discoverHandler({method:req.method,query:Object.fromEntries(url.searchParams)},response);}catch{response.status(500).json({error:'Nearby discovery is temporarily unavailable.'});}
  });
 };
 return {name:'elsewhere-local-discovery',configureServer:configure,configurePreviewServer:configure};
}
export default defineConfig(({ mode }) => ({ base: mode === 'production' && process.env.GITHUB_PAGES ? '/elsewhere-activity-picker/' : '/', plugins: [react(),localDiscovery()], server: { port: 5173, strictPort: true }, build: { rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] } } } } }));

