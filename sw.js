if(!self.define){let e,i={};const s=(s,r)=>(s=new URL(s+".js",r).href,i[s]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=s,e.onload=i,document.head.appendChild(e)}else e=s,importScripts(s),i()})).then((()=>{let e=i[s];if(!e)throw new Error(`Module ${s} didn’t register its module`);return e})));self.define=(r,n)=>{const o=e||("document"in self?document.currentScript.src:"")||location.href;if(i[o])return;let t={};const l=e=>s(e,o),f={module:{uri:o},exports:t,require:l};i[o]=Promise.all(r.map((e=>f[e]||l(e)))).then((e=>(n(...e),t)))}}define(["./workbox-99f5c7c2"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-04f8bffe.js",revision:null},{url:"assets/index-cb152832.css",revision:null},{url:"assets/pow-worker-2b80afb9.js",revision:null},{url:"assets/worker-3ee0fb63.js",revision:null},{url:"index.html",revision:"2bf82b8a5ce4088d1b6ceda1ebb6326c"},{url:"registerSW.js",revision:"72da3f9bb62b1890b879554c0bd77e27"},{url:"favicon.ico",revision:"83750d8612b9a4df99236629f37b04d7"},{url:"apple-touch-icon.png",revision:"95774594b729b50f85a69e6235e4a54f"},{url:"pwa-192x192.png",revision:"eb10b1f1cbc056c8edf67f26b9dd6f0a"},{url:"pwa-512x512.png",revision:"eb3d6288f970795a6f8b60198c62d36c"},{url:"manifest.webmanifest",revision:"80b57a076a6ed2222191d317528ba3ed"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
