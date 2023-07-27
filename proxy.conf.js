const bypassFn = function (req, res, proxyOptions) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, HEAD, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    //return 'index.html'
    return res.send('');
  } else {
    return null;
  }
};
const PROXY_CONFIG = {
  '/onecx-document-management-api': {
    target: 'http://onecx-document-management-bff',
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/onecx-document-management-api': '',
    },
    bypass: bypassFn,
  },
  '/portal-api': {
    target: 'http://tkit-portal-server',
    secure: false,
    pathRewrite: {
      '^/portal-api': '',
    },
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
  '/launchpad-api': {
    target: 'http://onecx-document-management-bff',
    secure: false,
    pathRewrite: {
      '^/launchpad-api': '',
    },
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
  '/ahm-api': {
    target: 'http://onecx-document-management-bff',
    secure: false,
    pathRewrite: {
      '^/ahm-api': '',
    },
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
};
module.exports = PROXY_CONFIG;
