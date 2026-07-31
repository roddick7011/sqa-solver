// vite.config.ts
import { defineConfig } from "file:///C:/Users/roddi/WorkBuddy/2026-07-29-14-49-26/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/roddi/WorkBuddy/2026-07-29-14-49-26/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/roddi/WorkBuddy/2026-07-29-14-49-26/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      // MVP: 只生成 manifest，不生成 service worker（避免 ESM dynamic require 問題）
      strategies: "injectManifest",
      srcDir: "dev-dist",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "\u89E3\u984C\u5C0F\u5E6B\u624B \u2014 \u570B\u9AD8\u4E2D\u5EB7\u4E43\u723E\u932F\u984C\u672C",
        short_name: "\u89E3\u984C\u5C0F\u5E6B\u624B",
        description: "\u4E2D\u5B78\u751F\u62CD\u7167\u89E3\u984C\uFF0C\u642D\u914D\u5EB7\u4E43\u723E\u7B46\u8A18\u6CD5\u6574\u7406\u932F\u984C\u3002",
        theme_color: "#6366f1",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          },
          {
            src: "favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        // dev 模式不啟用 SW
        enabled: false
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyb2RkaVxcXFxXb3JrQnVkZHlcXFxcMjAyNi0wNy0yOS0xNC00OS0yNlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccm9kZGlcXFxcV29ya0J1ZGR5XFxcXDIwMjYtMDctMjktMTQtNDktMjZcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3JvZGRpL1dvcmtCdWRkeS8yMDI2LTA3LTI5LTE0LTQ5LTI2L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgLy8gTVZQOiBcdTUzRUFcdTc1MUZcdTYyMTAgbWFuaWZlc3RcdUZGMENcdTRFMERcdTc1MUZcdTYyMTAgc2VydmljZSB3b3JrZXJcdUZGMDhcdTkwN0ZcdTUxNEQgRVNNIGR5bmFtaWMgcmVxdWlyZSBcdTU1NEZcdTk4NENcdUZGMDlcbiAgICAgIHN0cmF0ZWdpZXM6ICdpbmplY3RNYW5pZmVzdCcsXG4gICAgICBzcmNEaXI6ICdkZXYtZGlzdCcsXG4gICAgICBmaWxlbmFtZTogJ3N3LnRzJyxcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5qZWN0UmVnaXN0ZXI6ICdhdXRvJyxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdcdTg5RTNcdTk4NENcdTVDMEZcdTVFNkJcdTYyNEIgXHUyMDE0IFx1NTcwQlx1OUFEOFx1NEUyRFx1NUVCN1x1NEU0M1x1NzIzRVx1OTMyRlx1OTg0Q1x1NjcyQycsXG4gICAgICAgIHNob3J0X25hbWU6ICdcdTg5RTNcdTk4NENcdTVDMEZcdTVFNkJcdTYyNEInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1x1NEUyRFx1NUI3OFx1NzUxRlx1NjJDRFx1NzE2N1x1ODlFM1x1OTg0Q1x1RkYwQ1x1NjQyRFx1OTE0RFx1NUVCN1x1NEU0M1x1NzIzRVx1N0I0Nlx1OEExOFx1NkNENVx1NjU3NFx1NzQwNlx1OTMyRlx1OTg0Q1x1MzAwMicsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzYzNjZmMScsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZjhmYWZjJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnZmF2aWNvbi5zdmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJ2Zhdmljb24uc3ZnJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdmYXZpY29uLnN2ZycsXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgIC8vIGRldiBcdTZBMjFcdTVGMEZcdTRFMERcdTU1NUZcdTc1MjggU1dcbiAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIHBvcnQ6IDUxNzMsXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVSxTQUFTLG9CQUFvQjtBQUM3VixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRXhCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQTtBQUFBLE1BRU4sWUFBWTtBQUFBLE1BQ1osUUFBUTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsY0FBYztBQUFBLE1BQ2QsZ0JBQWdCO0FBQUEsTUFDaEIsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxZQUFZO0FBQUE7QUFBQSxRQUVWLFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
