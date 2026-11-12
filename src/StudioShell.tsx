import {useEffect,useState} from 'react';
import type {User} from './auth';
import {authConfigured,googleSignIn,observeUser} from './auth';
import Dashboard from './Dashboard';
import ResizeStudio from './ResizeStudio';
import App from './App';
import {getProject,saveProject} from './projects';
import {useStore} from './store';
import type {VectorDocument} from './model';
type Screen='dashboard'|'resize'|'editor';
export default function StudioShell(){
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(!authConfigured),[error,setError]=useState(''),[screen,setScreen]=useState<Screen>('dashboard'),[projectId,setProjectId]=useState<string|null>(null);
 useEffect(()=>{if(!authConfigured)return;return observeUser(u=>{setUser(u);setReady(true);if(!u){setScreen('dashboard');setProjectId(null)}})},[]);
 const open=async(id:string)=>{if(!user)return;try{const project=await getProject(id,user.uid);if(!project)throw new Error('Project not found');useStore.getState().load(project.doc);setProjectId(id);setScreen('editor')}catch(e){setError(String(e))}};
 useEffect(()=>{if(!user||!projectId||screen!=='editor')return;let timer:ReturnType<typeof setTimeout>|undefined;const unsub=useStore.subscribe(state=>{clearTimeout(timer);timer=setTimeout(()=>{const doc:VectorDocument=state.doc;saveProject({id:projectId,owner:user.uid,name:doc.name,updatedAt:Date.now(),doc}).catch(e=>setError(String(e)))},700)});return()=>{unsub();clearTimeout(timer)}},[projectId,user,screen]);
 if(!ready)return <div className="auth-page">Checking Google sign-in…</div>;
 if(!authConfigured)return <div className="auth-page"><div className="auth-card"><div className="mark">V</div><h1>Vector Studio</h1><p>Google Login needs Firebase configuration before the application can be used.</p><code>VITE_FIREBASE_API_KEY<br/>VITE_FIREBASE_AUTH_DOMAIN<br/>VITE_FIREBASE_PROJECT_ID<br/>VITE_FIREBASE_APP_ID</code><p>Configure these values in Netlify environment variables and enable the Google provider in Firebase Authentication.</p></div></div>;
 if(!user)return <div className="auth-page"><div className="auth-card"><div className="mark">V</div><h1>Vector Studio</h1><p>Sign in with Google to access your design workspace.</p><button className="primary" onClick={()=>googleSignIn().catch(e=>setError(e.message))}>Continue with Google</button>{error&&<p className="error">{error}</p>}</div></div>;
 return <>{screen==='resize'?<ResizeStudio onBack={()=>setScreen('dashboard')}/>:screen==='editor'?<div className="editor-shell"><div className="returnbar"><button onClick={()=>{setScreen('dashboard');setProjectId(null)}}>← Dashboard</button><span>Local project · autosaved to IndexedDB</span></div><App/></div>:<Dashboard user={user} onOpen={open} onResize={()=>setScreen('resize')}/ >}{error&&<div className="toast" role="alert" onClick={()=>setError('')}>{error} ×</div>}</>
}
