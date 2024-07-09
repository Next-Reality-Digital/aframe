// WebVR polyfill
// Check before the polyfill runs.
window.hasNativeWebVRImplementation = !!window.navigator.getVRDisplays ||
                                      !!window.navigator.getVRDevices;

window.hasNativeWebXRImplementation = !!navigator.xr;

var utils = require('./utils/');

// CSS.
if (utils.device.isBrowserEnvironment) {
  require('./style/aframe.css');
  require('./style/rStats.css');
}

// Required before `AEntity` so that all components are registered.
var AScene = require('./core/scene/a-scene').AScene;
var components = require('./core/component').components;
var registerComponent = require('./core/component').registerComponent;
var registerSystem = require('./core/system').registerSystem;
var systems = require('./core/system').systems;
// Exports THREE to window so three.js can be used without alteration.
var THREE = window.THREE = require('./lib/three');

require('./components/index'); // Register standard components.

var ANode = require('./core/a-node');
var AEntity = require('./core/a-entity'); // Depends on ANode and core components.

require('./core/a-assets');
require('./core/a-mixin');

console.log('A-Frame Version: https://github.com/Hubs-Foundation/aframe');
console.log('three Version: https://github.com/Hubs-Foundation/three.js');

module.exports = window.AFRAME = {
  AComponent: require('./core/component').Component,
  AEntity: AEntity,
  ANode: ANode,
  AScene: AScene,
  components: components,
  coreComponents: Object.keys(components),
  registerComponent: registerComponent,
  registerElement: require('./core/a-register-element').registerElement,
  registerSystem: registerSystem,
  scenes: require('./core/scene/scenes'),
  schema: require('./core/schema'),
  systems: systems,
  THREE: THREE,
  utils: utils,
  version: 'hubs/master'
};
