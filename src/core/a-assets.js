var ANode = require("./a-node");
var registerElement = require("./a-register-element").registerElement;

// TODO we only use a-assets as a container for NAF templates, it can be removed once we move those out
module.exports = registerElement("a-assets", {
  prototype: Object.create(ANode.prototype, {
    attachedCallback: {
      value: function () {
        // HACK There are some strange intermittent startup race conditions caused by making this sync.
        // Having a delay here (as there was before with content loading) seems to eliminate them. 0 does not.
        setTimeout(() => this.load(), 500);
      },
    },
  }),
});
