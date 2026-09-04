const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('glb')) {
  config.resolver.assetExts.push('glb');
}

/**
 * Una sola resolución de `three` (evita "Multiple instances of Three.js").
 * `require.resolve('three')` apunta a `build/three.cjs`; la raíz del paquete
 * es el directorio padre (no usar `three/package.json`: exports lo bloquea).
 */
const threeEntry = require.resolve('three');
const threeRoot = path.resolve(path.dirname(threeEntry), '..');

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  three: threeRoot,
};

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      filePath: threeEntry,
      type: 'sourceFile',
    };
  }
  if (typeof upstreamResolveRequest === 'function') {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
