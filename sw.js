const V='diyar-v2',SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','site.css','site.js','booking.js','hero.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 /* pages, config and code: network first (so updates show immediately), cache as offline fallback */
 const net=r.mode==='navigate'||/(config\.json|admin\.json|\.css|\.js|\.html)$/.test(u.pathname);
 if(net){e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}return x})))});
