const CACHE_NAME = 'read-assistant-v1';
const CORE_URLS = [
  '/index.html',
  '/manifest.json'
];

// 安装：缓存核心页面资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_URLS).catch((err) => {
        console.log('SW 缓存核心资源失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求：优先从缓存读取，失败则走网络
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只缓存同源请求，跨域 API（翻译/词典）走网络，不缓存
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        // 只缓存成功的 GET 请求
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // 离线且无缓存时，返回核心页面（兜底）
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
