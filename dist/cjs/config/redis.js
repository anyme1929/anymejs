"use strict";var e=require("ioredis");let r=null;module.exports=i=>{const{enable:t,client:l}=i;if(t)return r||(r=new e.Redis(l),r)};
//# sourceMappingURL=redis.js.map
