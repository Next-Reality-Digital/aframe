var registerComponent = require('../core/component').registerComponent;

module.exports.Component = registerComponent('dummy', {
  schema: {
    foo: {default: 'bar'}
  },
  init() {
    console.log("Dummy component initialized");
  },
});