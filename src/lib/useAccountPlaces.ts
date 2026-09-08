import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { cleanPlaces, readCache, placesKey, hydratePlaces } from './places-state.mjs';
import type { Activity } from '../types';

type Places = {saved:string[];visited:string[];personal:Activity[];savedRecords:Activity[]};
type Session = {uid:string|null;user:User|null;data:Places;dirty:boolean;ready:boolean;revision:number};
const read=(uid:string|null)=>{try{return readCache(localStorage,uid) as {data:Places;dirty:boolean};}catch{return {data:cleanPlaces(null) as Places,dirty:false};}};

export function useAccountPlaces(notify:(message:string)=>void) {
 const [session,setSession]=useState<Session>(()=>({uid:null,user:null,...read(null),ready:!auth,revision:0}));
 const generation=useRef(0),note=useRef(notify),stateRef=useRef(session);
 note.current=notify;stateRef.current=session;
 const cache=(s:Session)=>{try{localStorage.setItem(placesKey(s.uid),JSON.stringify({data:s.data,dirty:s.dirty}));}catch{/* In-memory state still works when storage is unavailable. */}};
 useEffect(()=>{
  if(!auth)return;
  return onAuthStateChanged(auth,user=>{
   const token=++generation.current,uid=user?.uid||null,cached=read(uid);
   setSession({uid,user,...cached,ready:!user,revision:0});
   if(!user||!db)return;
   getDoc(doc(db,'users',user.uid)).then(snapshot=>{
    if(token!==generation.current)return;
    setSession(previous=>{
     if(previous.uid!==uid)return previous;
     const next={...previous,data:hydratePlaces(snapshot.exists()?snapshot.data():null,previous.data,previous.dirty) as Places,ready:true};
     cache(next);return next;
    });
   }).catch(()=>{
    if(token!==generation.current)return;
    setSession(s=>({...s,ready:false}));
    note.current('Your places are saved on this device. Cloud sync is unavailable; try signing in again.');
   });
  });
 },[]);
 useEffect(()=>{cache(session);},[session.uid,session.data,session.dirty]);
 useEffect(()=>{
  if(!session.uid||!session.ready||!session.dirty||!db)return;
  const token=generation.current,revision=session.revision,uid=session.uid;
  const timer=setTimeout(()=>{
   setDoc(doc(db!,'users',uid),JSON.parse(JSON.stringify(session.data))).then(()=>{
    if(token!==generation.current)return;
    setSession(s=>s.uid===uid&&s.revision===revision?{...s,dirty:false}:s);
   }).catch(()=>{if(token===generation.current)note.current('Cloud sync paused. Your changes are saved on this device.');});
  },650);
  return()=>clearTimeout(timer);
 },[session.uid,session.data,session.ready,session.dirty,session.revision]);
 const change=useCallback(<K extends keyof Places>(key:K,value:SetStateAction<Places[K]>)=>{
  setSession(previous=>{
   const nextValue=typeof value==='function'?(value as (x:Places[K])=>Places[K])(previous.data[key]):value;
   const next={...previous,data:{...previous.data,[key]:nextValue},dirty:true,revision:previous.revision+1};cache(next);return next;
  });
 },[]);
 return {user:session.user,...session.data,cloudReady:session.ready,cloudSynced:session.ready&&!session.dirty,setSaved:useCallback((v:SetStateAction<string[]>)=>change('saved',v),[change]),setVisited:useCallback((v:SetStateAction<string[]>)=>change('visited',v),[change]),setPersonal:useCallback((v:SetStateAction<Activity[]>)=>change('personal',v),[change]),setSavedRecords:useCallback((v:SetStateAction<Activity[]>)=>change('savedRecords',v),[change])};
}
