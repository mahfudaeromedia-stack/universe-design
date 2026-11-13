import {useEffect,useRef,useState} from 'react';
import type {User} from './auth';
import {authConfigured,googleSignIn,observeUser} from './auth';
import Dashboard from './Dashboard';
import App from './App';
import {getProject,saveProject} from './projects';
import {useStore} from './store';
type Screen='dashboard'|'editor';
export default function StudioShell(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(!authConfigured),[error,setError]=useState(''),[screen,setScreen]=useState<Screen>('dashboard'),[projectId,setProjectId]=useState<string|null>(null);
 const flushProject=useRef<()=>Promise<void>>(async()=>{});
 const [leaving,setLeaving]=useState(false);
 useEffect(()=>{if(!authConfigured)return;return observeUser(u=>{setUser(u);setReady(true);if(!u){setScreen('dashboard');setProjectId(null)}})},[]);
 const open=async(id:string)=>{if(!user)return;try{const project=await getProject(id,user.uid);if(!project)throw new Error('Project not found');useStore.getState().load(project.doc);if(project.doc.items.length===1&&project.doc.items[0].type==='image')useStore.getState().select(project.doc.items[0].id);setProjectId(id);setScreen('editor')}catch(e){setError(String(e))}};
 useEffect(()=>{
  if(!user||!projectId||screen!=='editor')return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let saved=useStore.getState().doc;
  let pending=Promise.resolve();
  const flush=()=>{
   clearTimeout(timer);
   pending=pending.catch(()=>{}).then(async()=>{
    const {doc,interactionBase}=useStore.getState();
    const committed=interactionBase??doc;
    if(committed===saved)return;
    await saveProject({id:projectId,owner:user.uid,name:committed.name,updatedAt:Date.now(),doc:committed});
    saved=committed;
   });
   return pending;
  };
  flushProject.current=flush;
  const unsubscribe=useStore.subscribe((state,previous)=>{
   if(state.interactionBase||state.doc===previous.doc&&!previous.interactionBase)return;
   clearTimeout(timer);
   timer=setTimeout(()=>void flush().catch(cause=>setError(String(cause))),700);
  });
  return()=>{unsubscribe();clearTimeout(timer);flushProject.current=async()=>{}};
 },[projectId,user,screen]);
 const backToDashboard=async()=>{
  setLeaving(true);
  try{
   await flushProject.current();
   setScreen('dashboard');
   setProjectId(null);
  }catch(cause){setError(String(cause))}
  finally{setLeaving(false)}
 };
 if(!ready)return <div className="auth-page">Checking Google sign-in…</div>;
 if(!authConfigured)return <div className="auth-page"><div className="auth-card"><div className="mark">V</div><h1>Vector Studio</h1><p>Google Login needs Firebase configuration before the application can be used.</p><code>VITE_FIREBASE_API_KEY<br/>VITE_FIREBASE_AUTH_DOMAIN<br/>VITE_FIREBASE_PROJECT_ID<br/>VITE_FIREBASE_APP_ID</code><p>Configure these values in Netlify environment variables and enable the Google provider in Firebase Authentication.</p></div></div>;
 if(!user)return <div className="auth-page"><div className="auth-card"><div className="mark">V</div><h1>Vector Studio</h1><p>Sign in with Google to access your design workspace.</p><button className="primary" onClick={()=>googleSignIn().catch(e=>setError(e.message))}>Continue with Google</button>{error&&<p className="error">{error}</p>}</div></div>;
 return <>{screen==='editor'?<div className="editor-shell"><div className="returnbar"><button disabled={leaving} onClick={backToDashboard}>← Dashboard</button><span>Local project · autosaved to IndexedDB</span></div><App/></div>:<Dashboard user={user} onOpen={open}/ >}{error&&<div className="toast" role="alert" onClick={()=>setError('')}>{error} ×</div>}</>
}
