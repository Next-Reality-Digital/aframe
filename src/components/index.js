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
require('./material');
require('./geometry');

stubComponent('hand-controls');
stubComponent('link');
stubComponent('look-controls');
stubComponent('obj-model');
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
