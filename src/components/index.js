var registerComponent = require('../core/component').registerComponent;

function stubComponent (name) {
  registerComponent(name, {
    init () {
      console.warn(`The ${name} aframe component no longer exists.`);
    }
  });
}

require('./position');
require('./rotation');
require('./scale');
require('./shadow');
require('./visible');
require('./dummy');
require('./material');
require('./geometry');
require('./line');
require('./laser-controls');
require('./tracked-controls')
require('./gltf-model');
require('./hand-tracking-controls');
require('./hand-tracking-grab-controls');
require('./scene/xr-mode-ui');
require('./tracked-controls-webvr');
require('./tracked-controls-webxr');
require('./grabbable');
require('./obb-collider');
require('./oculus-touch-controls');
require('./raycaster');
require('./cursor');
require('./hp-mixed-reality-controls');
require('./magicleap-controls');
require('./oculus-go-controls');
require('./pico-controls');
require('./valve-index-controls');
require('./vive-controls');
require('./vive-focus-controls');
require('./windows-motion-controls');
require('./generic-tracked-controller-controls');


// stubComponent('cursor');
// stubComponent('generic-tracked-controller-controls');
stubComponent('hand-controls');
stubComponent('link');
stubComponent('look-controls');
stubComponent('obj-model');
// stubComponent('raycaster');
stubComponent('sound');
stubComponent('wasd-controls');
stubComponent('background');
stubComponent('debug');
stubComponent('device-orientation-permission-ui');
stubComponent('embedded');
stubComponent('inspector');
stubComponent('fog');
stubComponent('keyboard-shortcuts');
stubComponent('pool');
stubComponent('screenshot');
stubComponent('stats');
stubComponent('vr-mode-ui');

// creates rStats global
require('../../vendor/rStats');
