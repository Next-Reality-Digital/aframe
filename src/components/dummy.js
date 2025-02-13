var registerComponent = require("../core/component").registerComponent;

module.exports.Component = registerComponent("dummy", {
  schema: {
    foo: { default: "bar" },
  },
  init() {
    alert("Dummy component initialized v4");
    console.log("Dummy component initialized v4", this.data, this.el);
  },
});
