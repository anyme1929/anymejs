"use strict";var t=require("inversify"),e=require("../types/constants.js");module.exports=class{constructor(t){this.container=t}get(n,r){const s=new t.Container({parent:this.container});return s.bind(e.SYMBOLS.ClientIp).toConstantValue(r?.context.ip),s.get(n)}};
//# sourceMappingURL=inversify-adapter.js.map
