import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from 'firebase/auth';
import type {User} from 'firebase/auth';

const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY as string|undefined,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string|undefined,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID as string|undefined,appId:import.meta.env.VITE_FIREBASE_APP_ID as string|undefined};
export const authConfigured=Object.values(config).every(Boolean);
const auth=authConfigured?getAuth(getApps()[0]??initializeApp(config)):null;
export const observeUser=(callback:(user:User|null)=>void)=>auth?onAuthStateChanged(auth,callback):(()=>{});
export const googleSignIn=async()=>{if(!auth)throw new Error('Firebase belum dikonfigurasi.');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,provider)};
export const googleSignOut=async()=>{if(auth)await signOut(auth)};
export type {User};
