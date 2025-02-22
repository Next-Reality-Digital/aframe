/* global Promise, screen, CustomEvent */
var re = require('../a-register-element');
var scenes = require('./scenes');
var systems = require('../system').systems;
var THREE = require('../../lib/three');
var utils = require('../../utils/');
// Require after.
var AEntity = require('../a-entity');
var ANode = require('../a-node');

var bind = utils.bind;
var isIOS = utils.device.isIOS();
var isMobile = utils.device.isMobile();
var isWebXRAvailable = utils.device.isWebXRAvailable;
var registerElement = re.registerElement;
var warn = utils.debug('core:a-scene:warn');

/**
 * Scene element, holds all entities.
 *
 * @member {array} behaviors - Component instances that have registered themselves to be
           updated on every tick.
 * @member {object} camera - three.js Camera object.
 * @member {object} canvas
 * @member {bool} isScene - Differentiates as scene entity as opposed to other entites.
 * @member {bool} isMobile - Whether browser is mobile (via UA detection).
 * @member {object} object3D - Root three.js Scene object.
 * @member {object} renderer
 * @member {bool} renderStarted
 * @member {object} systems - Registered instantiated systems.
 * @member {number} time
 */
module.exports.AScene = registerElement('a-scene', {
  prototype: Object.create(AEntity.prototype, {
    createdCallback: {
      value: function () {
        this.isIOS = isIOS;
        this.isMobile = isMobile;
        this.hasWebXR = isWebXRAvailable;
        this.isAR = false;
        this.isScene = true;
        this.object3D = new THREE.Scene();
        var self = this;
        this.object3D.onAfterRender = function (renderer, scene, camera) {
          // THREE may swap the camera used for the rendering if in VR, so we pass it to tock
          if (self.isPlaying) { self.tock(self.time, self.delta, camera); }
        };
        this.systems = {};
        this.systemNames = [];

        this.behaviors = {tick: [], tock: []};
        this.hasLoaded = false;
        this.isPlaying = false;
        this.originalHTML = this.innerHTML;
      }
    },

    addFullScreenStyles: {
      value: function () {
        document.documentElement.classList.add('a-fullscreen');
      }
    },

    removeFullScreenStyles: {
      value: function () {
        document.documentElement.classList.remove('a-fullscreen');
      }
    },

    attachedCallback: {
      value: function () {
        var self = this;

        const { renderer, camera, audioListener } = window.APP.setupRenderer(this);
        this.renderer = renderer;
        this.camera = camera;
        this.canvas = this.renderer.domElement;
        this.audioListener = audioListener;

        // Handler to exit VR (e.g., Oculus Browser back button).
        this.onVRPresentChangeBound = bind(this.onVRPresentChange, this);
        window.addEventListener('vrdisplaypresentchange', this.onVRPresentChangeBound);

        // Bind functions.
        this.enterVRBound = function () { self.enterVR(); };
        this.exitVRBound = function () { self.exitVR(); };
        this.exitVRTrueBound = function () { self.exitVR(true); };
        this.pointerRestrictedBound = function () { self.pointerRestricted(); };
        this.pointerUnrestrictedBound = function () { self.pointerUnrestricted(); };

        if (!isWebXRAvailable) {
          // Exit VR on `vrdisplaydeactivate` (e.g. taking off Rift headset).
          window.addEventListener('vrdisplaydeactivate', this.exitVRBound);

          // Exit VR on `vrdisplaydisconnect` (e.g. unplugging Rift headset).
          window.addEventListener('vrdisplaydisconnect', this.exitVRTrueBound);

          // Register for mouse restricted events while in VR
          // (e.g. mouse no longer available on desktop 2D view)
          window.addEventListener('vrdisplaypointerrestricted', this.pointerRestrictedBound);

          // Register for mouse unrestricted events while in VR
          // (e.g. mouse once again available on desktop 2D view)
          window.addEventListener('vrdisplaypointerunrestricted',
                                  this.pointerUnrestrictedBound);
        }

        this.initSystems();
        this.play();

        scenes.push(this);
      }
    },

    /**
     * Initialize all systems.
     */
    initSystems: {
      value: function () {
        var name;
        for (name in systems) {
          this.initSystem(name);
        }
      }
    },

    /**
     * Initialize a system.
     */
    initSystem: {
      value: function (name) {
        if (this.systems[name]) { return; }
        this.systems[name] = new systems[name](this);
        this.systemNames.push(name);
      }
    },

    /**
     * Shut down scene on detach.
     */
    detachedCallback: {
      value: function () {
        // Remove from scene index.
        var sceneIndex = scenes.indexOf(this);
        scenes.splice(sceneIndex, 1);

        window.removeEventListener('vrdisplaypresentchange', this.onVRPresentChangeBound);
        window.removeEventListener('vrdisplayactivate', this.enterVRBound);
        window.removeEventListener('vrdisplaydeactivate', this.exitVRBound);
        window.removeEventListener('vrdisplayconnect', this.enterVRBound);
        window.removeEventListener('vrdisplaydisconnect', this.exitVRTrueBound);
        window.removeEventListener('vrdisplaypointerrestricted', this.pointerRestrictedBound);
        window.removeEventListener('vrdisplaypointerunrestricted', this.pointerUnrestrictedBound);
      }
    },

    /**
     * Add ticks and tocks.
     *
     * @param {object} behavior - A component.
     */
    addBehavior: {
      value: function (behavior) {
        var behaviorArr;
        var behaviors = this.behaviors;
        var behaviorType;

        // Check if behavior has tick and/or tock and add the behavior to the appropriate list.
        for (behaviorType in behaviors) {
          if (!behavior[behaviorType]) { continue; }
          behaviorArr = this.behaviors[behaviorType];
          if (behaviorArr.indexOf(behavior) === -1) {
            behaviorArr.push(behavior);
          }
        }
      }
    },

    /**
     * For tests.
     */
    getPointerLockElement: {
      value: function () {
        return document.pointerLockElement;
      },
      writable: window.debug
    },

    /**
     * For tests.
     */
    checkHeadsetConnected: {
      value: utils.device.checkHeadsetConnected,
      writable: window.debug
    },

    enterAR: {
      value: function () {
        var errorMessage;
        if (!this.hasWebXR) {
          errorMessage = 'Failed to enter AR mode, WebXR not supported.';
          throw new Error(errorMessage);
        }
        if (!utils.device.checkARSupport()) {
          errorMessage = 'Failed to enter AR, WebXR immersive-ar mode not supported in your browser or device.';
          throw new Error(errorMessage);
        }
        return this.enterVR(true);
      }
    },

    /**
     * Call `requestPresent` if WebVR or WebVR polyfill.
     * Call `requestFullscreen` on desktop.
     * Handle events, states, fullscreen styles.
     *
     * @param {bool?} useAR - if true, try immersive-ar mode
     * @returns {Promise}
     */
    enterVR: {
      value: function (useAR, useOfferSession) {
        var self = this;
        var vrDisplay;
        var vrManager = self.renderer.xr;
        var xrInit;
    
        // Don't enter VR if already in VR.
        if (useOfferSession && (!navigator.xr || !navigator.xr.offerSession)) { return Promise.resolve('OfferSession is not supported.'); }
        if (self.usedOfferSession && useOfferSession) { return Promise.resolve('OfferSession was already called.'); }
        if (this.is('vr-mode')) { return Promise.resolve('Already in VR.'); }
    
        // Has VR.
        if (this.checkHeadsetConnected() || this.isMobile) {
          var rendererSystem = self.getAttribute('renderer');
          vrManager.enabled = true;
    
          if (this.hasWebXR) {
            // XR API.
            if (this.xrSession) {
              this.xrSession.removeEventListener('end', this.exitVRBound);
            }
            var refspace = this.sceneEl.systems.webxr.sessionReferenceSpaceType;
            vrManager.setReferenceSpaceType(refspace);
            var xrMode = useAR ? 'immersive-ar' : 'immersive-vr';
            xrInit = this.sceneEl.systems.webxr.sessionConfiguration;
            return new Promise(function (resolve, reject) {
              var requestSession = useOfferSession ? navigator.xr.offerSession.bind(navigator.xr) : navigator.xr.requestSession.bind(navigator.xr);
              self.usedOfferSession |= useOfferSession;
              requestSession(xrMode, xrInit).then(
                function requestSuccess (xrSession) {
                  if (useOfferSession) {
                    self.usedOfferSession = false;
                  }
    
                  vrManager.layersEnabled = xrInit.requiredFeatures.indexOf('layers') !== -1;
                  vrManager.setSession(xrSession).then(function () {
                    vrManager.setFoveation(rendererSystem.foveationLevel);
                    self.xrSession = xrSession;
                    self.systems.renderer.setWebXRFrameRate(xrSession);
                    xrSession.addEventListener('end', self.exitVRBound);
                    enterVRSuccess(resolve);
                  });
                },
                function requestFail (error) {
                  var useAR = xrMode === 'immersive-ar';
                  var mode = useAR ? 'AR' : 'VR';
                  reject(new Error('Failed to enter ' + mode + ' mode (`requestSession`)', { cause: error }));
                }
              );
            });
          } else {
            vrDisplay = utils.device.getVRDisplay();
            vrManager.setDevice(vrDisplay);
            if (vrDisplay.isPresenting &&
                !window.hasNativeWebVRImplementation) {
              enterVRSuccess();
              return Promise.resolve();
            }
            var presentationAttributes = {
              highRefreshRate: rendererSystem.highRefreshRate
            };
    
            return vrDisplay.requestPresent([{
              source: this.canvas,
              attributes: presentationAttributes
            }]).then(enterVRSuccess, enterVRFailure);
          }
        }
    
        // No VR.
        enterVRSuccess();
        return Promise.resolve();
    
        // Callback that happens on enter VR success or enter fullscreen (any API).
        function enterVRSuccess (resolve) {
          // vrdisplaypresentchange fires only once when the first requestPresent is completed;
          // the first requestPresent could be called from ondisplayactivate and there is no way
          // to setup everything from there. Thus, we need to emulate another vrdisplaypresentchange
          // for the actual requestPresent. Need to make sure there are no issues with firing the
          // vrdisplaypresentchange multiple times.
          var event;
          if (window.hasNativeWebVRImplementation && !window.hasNativeWebXRImplementation) {
            event = new CustomEvent('vrdisplaypresentchange', {detail: {display: utils.device.getVRDisplay()}});
            window.dispatchEvent(event);
          }
    
          if (useAR) {
            self.addState('ar-mode');
          } else {
            self.addState('vr-mode');
          }
          self.emit('enter-vr', {target: self});
          // Lock to landscape orientation on mobile.
          if (!self.hasWebXR && self.isMobile && screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape');
          }
          self.addFullScreenStyles();
    
          // On mobile, the polyfill handles fullscreen.
          // TODO: 07/16 Chromium builds break when `requestFullscreen`ing on a canvas
          // that we are also `requestPresent`ing. Until then, don't fullscreen if headset
          // connected.
          if (!self.isMobile && !self.checkHeadsetConnected()) {
            requestFullscreen(self.canvas);
          }
    
          if (resolve) { resolve(); }
        }
    
        function enterVRFailure (err) {
          self.removeState('vr-mode');
          if (err && err.message) {
            throw new Error('Failed to enter VR mode (`requestPresent`): ' + err.message);
          } else {
            throw new Error('Failed to enter VR mode (`requestPresent`).');
          }
        }
      },
      writable: true
    },
     /**
     * Call `exitPresent` if WebVR / WebXR or WebVR polyfill.
     * Handle events, states, fullscreen styles.
     *
     * @returns {Promise}
     */
    exitVR: {
      value: function () {
        var self = this;
        var vrDisplay;
        var vrManager = this.renderer.xr;

        // Don't exit VR if not in VR.
        if (!this.is('vr-mode') && !this.is('ar-mode')) { return Promise.resolve('Not in immersive mode.'); }

        // Handle exiting VR if not yet already and in a headset or polyfill.
        if (this.checkHeadsetConnected() || this.isMobile) {
          vrManager.enabled = false;
          vrDisplay = utils.device.getVRDisplay();
          if (this.hasWebXR) {
            this.xrSession.removeEventListener('end', this.exitVRBound);
            // Capture promise to avoid errors.
            this.xrSession.end().then(function () {}, function () {});
            this.xrSession = undefined;
          } else {
            if (vrDisplay.isPresenting) {
              return vrDisplay.exitPresent().then(exitVRSuccess, exitVRFailure);
            }
          }
        } else {
          exitFullscreen();
        }

        // Handle exiting VR in all other cases (2D fullscreen, external exit VR event).
        exitVRSuccess();

        return Promise.resolve();

        function exitVRSuccess () {
          self.removeState('vr-mode');
          self.removeState('ar-mode');
          // Lock to landscape orientation on mobile.
          if (self.isMobile && screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
          // Exiting VR in embedded mode, no longer need fullscreen styles.
          if (self.hasAttribute('embedded')) { self.removeFullScreenStyles(); }

          if (self.isIOS) { utils.forceCanvasResizeSafariMobile(self.canvas); }
          self.renderer.setPixelRatio(window.devicePixelRatio);
          self.emit('exit-vr', {target: self});
        }

        function exitVRFailure (err) {
          if (err && err.message) {
            throw new Error('Failed to exit VR mode (`exitPresent`): ' + err.message);
          } else {
            throw new Error('Failed to exit VR mode (`exitPresent`).');
          }
        }
      },
      writable: true
    },

    pointerRestricted: {
      value: function () {
        if (this.canvas) {
          var pointerLockElement = this.getPointerLockElement();
          if (pointerLockElement && pointerLockElement !== this.canvas && document.exitPointerLock) {
            // Recreate pointer lock on the canvas, if taken on another element.
            document.exitPointerLock();
          }

          if (this.canvas.requestPointerLock) {
            this.canvas.requestPointerLock();
          }
        }
      }
    },

    pointerUnrestricted: {
      value: function () {
        var pointerLockElement = this.getPointerLockElement();
        if (pointerLockElement && pointerLockElement === this.canvas && document.exitPointerLock) {
          document.exitPointerLock();
        }
      }
    },

    /**
     * Handle `vrdisplaypresentchange` event for exiting VR through other means than
     * `<ESC>` key. For example, GearVR back button on Oculus Browser.
     */
    onVRPresentChange: {
      value: function (evt) {
        // Polyfill places display inside the detail property
        var display = evt.display || evt.detail.display;
        // Entering VR.
        if (display && display.isPresenting) {
          this.enterVR();
          return;
        }
        // Exiting VR.
        this.exitVR();
      }
    },

    /**
     * Wraps Entity.getAttribute to take into account for systems.
     * If system exists, then return system data rather than possible component data.
     */
    getAttribute: {
      value: function (attr) {
        var system = this.systems[attr];
        if (system) { return system.data; }
        return AEntity.prototype.getAttribute.call(this, attr);
      }
    },

    /**
     * `getAttribute` used to be `getDOMAttribute` and `getComputedAttribute` used to be
     * what `getAttribute` is now. Now legacy code.
     */
    getComputedAttribute: {
      value: function (attr) {
        warn('`getComputedAttribute` is deprecated. Use `getAttribute` instead.');
        this.getAttribute(attr);
      }
    },

    /**
     * Wraps Entity.getDOMAttribute to take into account for systems.
     * If system exists, then return system data rather than possible component data.
     */
    getDOMAttribute: {
      value: function (attr) {
        var system = this.systems[attr];
        if (system) { return system.data; }
        return AEntity.prototype.getDOMAttribute.call(this, attr);
      }
    },

    /**
     * Wrap Entity.setAttribute to take into account for systems.
     * If system exists, then skip component initialization checks and do a normal
     * setAttribute.
     */
    setAttribute: {
      value: function (attr, value, componentPropValue) {
        var system = this.systems[attr];
        if (system) {
          ANode.prototype.setAttribute.call(this, attr, value);
          system.updateProperties(value);
          return;
        }
        AEntity.prototype.setAttribute.call(this, attr, value, componentPropValue);
      }
    },

    /**
     * @param {object} behavior - A component.
     */
    removeBehavior: {
      value: function (behavior) {
        var behaviorArr;
        var behaviorType;
        var behaviors = this.behaviors;
        var index;

        // Check if behavior has tick and/or tock and remove the behavior from the appropriate
        // array.
        for (behaviorType in behaviors) {
          if (!behavior[behaviorType]) { continue; }
          behaviorArr = this.behaviors[behaviorType];
          index = behaviorArr.indexOf(behavior);
          if (index !== -1) { behaviorArr.splice(index, 1); }
        }
      }
    },

    /**
     * Handler attached to elements to help scene know when to kick off.
     * Scene waits for all entities to load.
     */
    play: {
      value: function () {
        var self = this;
        // var sceneEl = this;

        if (this.renderStarted) {
          AEntity.prototype.play.call(this);
          return;
        }

        this.addEventListener('loaded', function () {
          AEntity.prototype.play.call(this);  // .play() *before* render.
        });

        // setTimeout to wait for all nodes to attach and run their callbacks.
        setTimeout(function () {
          AEntity.prototype.load.call(self);
        });
      }
    },

    /**
     * Wrap `updateComponent` to not initialize the component if the component has a system
     * (aframevr/aframe#2365).
     */
    updateComponent: {
      value: function (componentName) {
        if (componentName in systems) { return; }
        AEntity.prototype.updateComponent.apply(this, arguments);
      }
    },

    /**
     * Behavior-updater meant to be called from scene render.
     * Abstracted to a different function to facilitate unit testing (`scene.tick()`) without
     * needing to render.
     */
    tick: {
      value: function (time, timeDelta) {
        var i;
        var systems = this.systems;

        // Components.
        for (i = 0; i < this.behaviors.tick.length; i++) {
          if (!this.behaviors.tick[i].el.isPlaying) { continue; }
          this.behaviors.tick[i].tick(time, timeDelta);
        }

        // Systems.
        for (i = 0; i < this.systemNames.length; i++) {
          if (!systems[this.systemNames[i]].tick) { continue; }
          systems[this.systemNames[i]].tick(time, timeDelta);
        }
      }
    },

    /**
     * Behavior-updater meant to be called after scene render for post processing purposes.
     * Abstracted to a different function to facilitate unit testing (`scene.tock()`) without
     * needing to render.
     */
    tock: {
      value: function (time, timeDelta, camera) {
        var i;
        var systems = this.systems;

        // Components.
        for (i = 0; i < this.behaviors.tock.length; i++) {
          if (!this.behaviors.tock[i].el.isPlaying) { continue; }
          this.behaviors.tock[i].tock(time, timeDelta, camera);
        }

        // Systems.
        for (i = 0; i < this.systemNames.length; i++) {
          if (!systems[this.systemNames[i]].tock) { continue; }
          systems[this.systemNames[i]].tock(time, timeDelta, camera);
        }
      }
    }
  })
});

function requestFullscreen (canvas) {
  var requestFullscreen =
    canvas.requestFullscreen ||
    canvas.webkitRequestFullscreen ||
    canvas.mozRequestFullScreen ||  // The capitalized `S` is not a typo.
    canvas.msRequestFullscreen;
  // Hide navigation buttons on Android.
  requestFullscreen.apply(canvas, [{navigationUI: 'hide'}]);
}

function exitFullscreen () {
  var fullscreenEl =
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement;
  if (!fullscreenEl) { return; }
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

function setupCanvas (sceneEl) {
  var canvasEl;

  canvasEl = document.createElement('canvas');
  canvasEl.classList.add('a-canvas');
  // Mark canvas as provided/injected by A-Frame.
  canvasEl.dataset.aframeCanvas = true;
  sceneEl.appendChild(canvasEl);

  document.addEventListener('fullscreenchange', onFullScreenChange);
  document.addEventListener('mozfullscreenchange', onFullScreenChange);
  document.addEventListener('webkitfullscreenchange', onFullScreenChange);
  document.addEventListener('MSFullscreenChange', onFullScreenChange);

  // Prevent overscroll on mobile.
  canvasEl.addEventListener('touchmove', function (event) { event.preventDefault(); });

  // Set canvas on scene.
  sceneEl.canvas = canvasEl;
  sceneEl.emit('render-target-loaded', {target: canvasEl});
  // For unknown reasons a synchronous resize does not work on desktop when
  // entering/exiting fullscreen.
  setTimeout(bind(sceneEl.resize, sceneEl), 0);

  function onFullScreenChange () {
    var fullscreenEl =
      document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement;
    // No fullscren element === exit fullscreen
    if (!fullscreenEl) { sceneEl.exitVR(); }
    document.activeElement.blur();
    document.body.focus();
  }
}
module.exports.setupCanvas = setupCanvas;  // For testing.
