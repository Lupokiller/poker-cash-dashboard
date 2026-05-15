module.exports = {
  plugins: {
    // #region agent log
    ...(globalThis.fetch ? (() => { fetch('http://127.0.0.1:7580/ingest/3e01d4d2-a1f2-459a-883b-7a72019fbf62',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8c3db3'},body:JSON.stringify({sessionId:'8c3db3',runId:'post-bom-fix',hypothesisId:'HTW',location:'postcss.config.js:3',message:'Loading PostCSS config',data:{plugin:'@tailwindcss/postcss'},timestamp:Date.now()})}).catch(() => {}); return {}; })() : {}),
    // #endregion
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

