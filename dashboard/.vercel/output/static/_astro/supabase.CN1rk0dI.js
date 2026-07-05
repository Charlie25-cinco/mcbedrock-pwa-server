import{a as v}from"./index.DK-fsZOb.js";var i={exports:{}},t={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _;function y(){if(_)return t;_=1;var m=v(),R=Symbol.for("react.element"),c=Symbol.for("react.fragment"),l=Object.prototype.hasOwnProperty,x=m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,d={key:!0,ref:!0,__self:!0,__source:!0};function s(n,r,f){var e,o={},u=null,p=null;f!==void 0&&(u=""+f),r.key!==void 0&&(u=""+r.key),r.ref!==void 0&&(p=r.ref);for(e in r)l.call(r,e)&&!d.hasOwnProperty(e)&&(o[e]=r[e]);if(n&&n.defaultProps)for(e in r=n.defaultProps,r)o[e]===void 0&&(o[e]=r[e]);return{$$typeof:R,type:n,key:u,ref:p,props:o,_owner:x.current}}return t.Fragment=c,t.jsx=s,t.jsxs=s,t}var a;function O(){return a||(a=1,i.exports=y()),i.exports}var j=O();function q(){return null}export{q as g,j};
