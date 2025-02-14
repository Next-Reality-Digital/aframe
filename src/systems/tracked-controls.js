var registerSystem = require('../core/system').registerSystem;

/**
 * Tracked controls system.
 * Maintain list with available tracked controllers.
 */
var System = registerSystem('tracked-controls', {
  init: function () {
    this.controllers = [];
    this.onInputSourcesChange = this.onInputSourcesChange.bind(this);
    this.onEnterVR = this.onEnterVR.bind(this);
    this.el.addEventListener('enter-vr', this.onEnterVR);

    this.onExitVR = this.onExitVR.bind(this);
    this.el.addEventListener('exit-vr', this.onExitVR);
    console.log("Tracked controls system initialized");
  },

  onEnterVR: function () {
    var xrSession = this.el.xrSession;
    if (!xrSession) {
      console.log("No xrSession for tracked controls");
      return; }
    console.log("onEnterVR for tracked controls");
    this.el.xrSession.addEventListener('inputsourceschange', this.onInputSourcesChange);
  },

  onExitVR: function () {
    this.referenceSpace = undefined;
    this.controllers = [];
    this.el.emit('controllersupdated', undefined, false);
  },

  onInputSourcesChange: function (event) {
    var self = this;
    var xrSession = this.el.xrSession;
    var refspace = this.el.sceneEl.systems.webxr.sessionReferenceSpaceType;
    xrSession.requestReferenceSpace(refspace).then(function (referenceSpace) {
      self.referenceSpace = referenceSpace;
    }).catch(function (err) {
      self.el.sceneEl.systems.webxr.warnIfFeatureNotRequested(
          refspace,
          'tracked-controsl uses reference space "' + refspace + '".');
      console.err("Tracked controls system failed to request reference space");
      throw err;
    });

    this.controllers = xrSession.inputSources;
    this.el.emit('controllersupdated', undefined, false);
  }
});

module.exports.System = System;