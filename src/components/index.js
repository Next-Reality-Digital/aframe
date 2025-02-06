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

stubComponent('cursor');
stubComponent('geometry');
stubComponent('generic-tracked-controller-controls');
stubComponent('hand-controls');
stubComponent('laser-controls');
stubComponent('line');
stubComponent('link');
stubComponent('look-controls');
stubComponent('material');
stubComponent('obj-model');
stubComponent('raycaster');
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
