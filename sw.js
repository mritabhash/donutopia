// Retire the old captured-demo worker. Donutopia no longer needs API interception.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.registration.unregister()));
