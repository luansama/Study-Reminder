/* Service Worker cơ bản cho khả năng cài PWA và cache app shell.
   Không tự lên lịch đánh thức trang để gửi thông báo đúng giờ.
   Push nền thực sự cần server gửi Push API + subscription. */
const CACHE_NAME = "study-reminder-shell-v1";
const ASSETS = ["./","./index.html","./style.css","./storage.js","./notifications.js","./app.js","./manifest.json"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if(response && response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
    }
    return response;
  }).catch(() => caches.match("./index.html"))));
});
self.addEventListener("push", event => {
  let payload = {title:"STUDY REMINDER",body:"Bạn có một việc học tập cần chú ý.",url:"./"};
  try { if(event.data) payload = {...payload,...event.data.json()}; } catch(e) {}
  event.waitUntil(self.registration.showNotification(payload.title,{body:payload.body,icon:"",badge:"",data:{url:payload.url||"./"}}));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url || "./";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients => {
    for(const client of clients) if("focus" in client) {client.navigate(url);return client.focus();}
    return self.clients.openWindow(url);
  }));
});