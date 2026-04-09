import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openaiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || '';

  const openaiProxy = openaiKey
    ? {
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${openaiKey}`);
            });
          },
        },
      }
    : {};

  return {
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: openaiProxy,
    },
    preview: {
      proxy: openaiProxy,
    },
  };
});
