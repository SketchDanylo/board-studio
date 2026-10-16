// ==UserScript==
// @name         Board Studio for chess.com
// @namespace    https://sketchdanylo.github.io/chess
// @version      5.11.1
// @description  Soft spring-animated arrows, two-color square marks, red "can be taken" move dots, ghost pieces and a restyled sidebar, with a Styles panel.
// @match        https://www.chess.com/*
// @match        https://chess.com/*
// @homepageURL  https://github.com/SketchDanylo/board-studio
// @updateURL    https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js
// @downloadURL  https://raw.githubusercontent.com/SketchDanylo/board-studio/main/board-studio.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // One copy only: two installs (say the loader and an older full script) would each draw
  // their own dots and crosses on top of each other.
  if (window.__boardStudioRunning) return;
  window.__boardStudioRunning = true;

  // (the opening book and Stockfish are not in this file: they are downloaded from assets/ on demand)

  // ---------- bundled legal-move rules ----------
/* chess.js — BSD-2-Clause
Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

*/
var BoardStudioRules=(()=>{var ie=Object.defineProperty;var ss=Object.getOwnPropertyDescriptor;var is=Object.getOwnPropertyNames;var rs=Object.prototype.hasOwnProperty;var ns=(f,t,e)=>t in f?ie(f,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):f[t]=e;var os=(f,t)=>{for(var e in t)ie(f,e,{get:t[e],enumerable:!0})},as=(f,t,e,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of is(t))!rs.call(f,r)&&r!==e&&ie(f,r,{get:()=>t[r],enumerable:!(s=ss(t,r))||s.enumerable});return f};var ls=f=>as(ie({},"__esModule",{value:!0}),f);var y=(f,t,e)=>ns(f,typeof t!="symbol"?t+"":t,e);var xs={};os(xs,{Chess:()=>ae});function fs(f){return f!==null?{comment:f,variations:[]}:{variations:[]}}function hs(f,t,e,s,r){let n={move:f,variations:r};return t&&(n.suffix=t),e&&(n.nag=e),s!==null&&(n.comment=s),n}function cs(...f){let[t,...e]=f,s=t;for(let r of e)r!==null&&(s.variations=[r,...r.variations],r.variations=[],s=r);return t}function us(f,t){if(t.marker&&t.marker.comment){let e=t.root;for(;;){let s=e.variations[0];if(!s){e.comment=t.marker.comment;break}e=s}}return{headers:f,root:t.root,result:(t.marker&&t.marker.result)??void 0}}function _s(f,t){function e(){this.constructor=f}e.prototype=t.prototype,f.prototype=new e}function V(f,t,e,s){var r=Error.call(this,f);return Object.setPrototypeOf&&Object.setPrototypeOf(r,V.prototype),r.expected=t,r.found=e,r.location=s,r.name="SyntaxError",r}_s(V,Error);function pe(f,t,e){return e=e||" ",f.length>t?f:(t-=f.length,e+=e.repeat(t),f+e.slice(0,t))}V.prototype.format=function(f){var t="Error: "+this.message;if(this.location){var e=null,s;for(s=0;s<f.length;s++)if(f[s].source===this.location.source){e=f[s].text.split(/\r\n|\n|\r/g);break}var r=this.location.start,n=this.location.source&&typeof this.location.source.offset=="function"?this.location.source.offset(r):r,c=this.location.source+":"+n.line+":"+n.column;if(e){var h=this.location.end,u=pe("",n.line.toString().length," "),g=e[r.line-1],d=r.line===h.line?h.column:g.length+1,A=d-r.column||1;t+=`
 --> `+c+`
`+u+` |
`+n.line+" | "+g+`
`+u+" | "+pe("",r.column-1," ")+pe("",A,"^")}else t+=`
 at `+c}return t};V.buildMessage=function(f,t){var e={literal:function(g){return'"'+r(g.text)+'"'},class:function(g){var d=g.parts.map(function(A){return Array.isArray(A)?n(A[0])+"-"+n(A[1]):n(A)});return"["+(g.inverted?"^":"")+d.join("")+"]"},any:function(){return"any character"},end:function(){return"end of input"},other:function(g){return g.description}};function s(g){return g.charCodeAt(0).toString(16).toUpperCase()}function r(g){return g.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(d){return"\\x0"+s(d)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(d){return"\\x"+s(d)})}function n(g){return g.replace(/\\/g,"\\\\").replace(/\]/g,"\\]").replace(/\^/g,"\\^").replace(/-/g,"\\-").replace(/\0/g,"\\0").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/[\x00-\x0F]/g,function(d){return"\\x0"+s(d)}).replace(/[\x10-\x1F\x7F-\x9F]/g,function(d){return"\\x"+s(d)})}function c(g){return e[g.type](g)}function h(g){var d=g.map(c),A,p;if(d.sort(),d.length>0){for(A=1,p=1;A<d.length;A++)d[A-1]!==d[A]&&(d[p]=d[A],p++);d.length=p}switch(d.length){case 1:return d[0];case 2:return d[0]+" or "+d[1];default:return d.slice(0,-1).join(", ")+", or "+d[d.length-1]}}function u(g){return g?'"'+r(g)+'"':"end of input"}return"Expected "+h(f)+" but "+u(t)+" found."};function ps(f,t){t=t!==void 0?t:{};var e={},s=t.grammarSource,r={pgn:Qe},n=Qe,c="[",h='"',u="]",g=".",d="O-O-O",A="O-O",p="0-0-0",E="0-0",$="$",T="{",F="}",fe=";",he="(",et=")",Ae="1-0",$e="0-1",ke="1/2-1/2",tt="*",ce=/^[a-zA-Z]/,ye=/^[^"]/,X=/^[0-9]/,Te=/^[.]/,Pe=/^[a-zA-Z1-8\-=]/,st=/^[+#]/,Ne=/^[!?]/,we=/^[^}]/,Ie=/^[^\r\n]/,xe=/^[ \t\r\n]/,it=L("tag pair"),rt=w("[",!1),Oe=w('"',!1),nt=w("]",!1),ot=L("tag name"),ue=q([["a","z"],["A","Z"]],!1,!1),at=L("tag value"),Ke=q(['"'],!0,!1),lt=L("move number"),ee=q([["0","9"]],!1,!1),ft=w(".",!1),Me=q(["."],!1,!1),ht=L("standard algebraic notation"),ct=w("O-O-O",!1),ut=w("O-O",!1),_t=w("0-0-0",!1),pt=w("0-0",!1),Le=q([["a","z"],["A","Z"],["1","8"],"-","="],!1,!1),gt=q(["+","#"],!1,!1),dt=L("suffix annotation"),Re=q(["!","?"],!1,!1),mt=L("NAG"),vt=w("$",!1),bt=L("brace comment"),Et=w("{",!1),qe=q(["}"],!0,!1),St=w("}",!1),Ct=L("rest of line comment"),At=w(";",!1),Fe=q(["\r",`
`],!0,!1),$t=L("variation"),kt=w("(",!1),yt=w(")",!1),Tt=L("game termination marker"),Pt=w("1-0",!1),Nt=w("0-1",!1),wt=w("1/2-1/2",!1),It=w("*",!1),xt=L("whitespace"),De=q([" ","	","\r",`
`],!1,!1),Ot=function(i,a){return us(i,a)},Kt=function(i){return Object.fromEntries(i)},Mt=function(i,a){return[i,a]},Lt=function(i,a){return{root:i,marker:a}},Rt=function(i,a){return cs(fs(i),...a.flat())},qt=function(i,a,l,v,b){return hs(i,a,l,v,b)},Ft=function(i){return i},Dt=function(i){return i.replace(/[\r\n]+/g," ")},Ut=function(i){return i.trim()},Bt=function(i){return i},Qt=function(i,a){return{result:i,comment:a}},o=t.peg$currPos|0,G=[{line:1,column:1}],R=o,te=t.peg$maxFailExpected||[],_=t.peg$silentFails|0,Y;if(t.startRule){if(!(t.startRule in r))throw new Error(`Can't start parsing from rule "`+t.startRule+'".');n=r[t.startRule]}function w(i,a){return{type:"literal",text:i,ignoreCase:a}}function q(i,a,l){return{type:"class",parts:i,inverted:a,ignoreCase:l}}function jt(){return{type:"end"}}function L(i){return{type:"other",description:i}}function Ue(i){var a=G[i],l;if(a)return a;if(i>=G.length)l=G.length-1;else for(l=i;!G[--l];);for(a=G[l],a={line:a.line,column:a.column};l<i;)f.charCodeAt(l)===10?(a.line++,a.column=1):a.column++,l++;return G[i]=a,a}function Be(i,a,l){var v=Ue(i),b=Ue(a),k={source:s,start:{offset:i,line:v.line,column:v.column},end:{offset:a,line:b.line,column:b.column}};return k}function m(i){o<R||(o>R&&(R=o,te=[]),te.push(i))}function Ht(i,a,l){return new V(V.buildMessage(i,a),i,a,l)}function Qe(){var i,a,l;return i=o,a=Gt(),l=Yt(),i=Ot(a,l),i}function Gt(){var i,a,l;for(i=o,a=[],l=je();l!==e;)a.push(l),l=je();return l=K(),i=Kt(a),i}function je(){var i,a,l,v,b,k,Q;return _++,i=o,K(),f.charCodeAt(o)===91?(a=c,o++):(a=e,_===0&&m(rt)),a!==e?(K(),l=Wt(),l!==e?(K(),f.charCodeAt(o)===34?(v=h,o++):(v=e,_===0&&m(Oe)),v!==e?(b=Vt(),f.charCodeAt(o)===34?(k=h,o++):(k=e,_===0&&m(Oe)),k!==e?(K(),f.charCodeAt(o)===93?(Q=u,o++):(Q=e,_===0&&m(nt)),Q!==e?i=Mt(l,b):(o=i,i=e)):(o=i,i=e)):(o=i,i=e)):(o=i,i=e)):(o=i,i=e),_--,i===e&&_===0&&m(it),i}function Wt(){var i,a,l;if(_++,i=o,a=[],l=f.charAt(o),ce.test(l)?o++:(l=e,_===0&&m(ue)),l!==e)for(;l!==e;)a.push(l),l=f.charAt(o),ce.test(l)?o++:(l=e,_===0&&m(ue));else a=e;return a!==e?i=f.substring(i,o):i=a,_--,i===e&&(a=e,_===0&&m(ot)),i}function Vt(){var i,a,l;for(_++,i=o,a=[],l=f.charAt(o),ye.test(l)?o++:(l=e,_===0&&m(Ke));l!==e;)a.push(l),l=f.charAt(o),ye.test(l)?o++:(l=e,_===0&&m(Ke));return i=f.substring(i,o),_--,a=e,_===0&&m(at),i}function Yt(){var i,a,l;return i=o,a=He(),K(),l=ts(),l===e&&(l=null),K(),i=Lt(a,l),i}function He(){var i,a,l,v;for(i=o,a=_e(),a===e&&(a=null),l=[],v=Ge();v!==e;)l.push(v),v=Ge();return i=Rt(a,l),i}function Ge(){var i,a,l,v,b,k,Q,se;if(i=o,K(),zt(),K(),a=Zt(),a!==e){for(l=Jt(),l===e&&(l=null),v=[],b=We();b!==e;)v.push(b),b=We();for(b=K(),k=_e(),k===e&&(k=null),Q=[],se=Ve();se!==e;)Q.push(se),se=Ve();i=qt(a,l,v,k,Q)}else o=i,i=e;return i}function zt(){var i,a,l,v,b,k;for(_++,i=o,a=[],l=f.charAt(o),X.test(l)?o++:(l=e,_===0&&m(ee));l!==e;)a.push(l),l=f.charAt(o),X.test(l)?o++:(l=e,_===0&&m(ee));if(f.charCodeAt(o)===46?(l=g,o++):(l=e,_===0&&m(ft)),l!==e){for(v=K(),b=[],k=f.charAt(o),Te.test(k)?o++:(k=e,_===0&&m(Me));k!==e;)b.push(k),k=f.charAt(o),Te.test(k)?o++:(k=e,_===0&&m(Me));a=[a,l,v,b],i=a}else o=i,i=e;return _--,i===e&&(a=e,_===0&&m(lt)),i}function Zt(){var i,a,l,v,b,k;if(_++,i=o,a=o,f.substr(o,5)===d?(l=d,o+=5):(l=e,_===0&&m(ct)),l===e&&(f.substr(o,3)===A?(l=A,o+=3):(l=e,_===0&&m(ut)),l===e&&(f.substr(o,5)===p?(l=p,o+=5):(l=e,_===0&&m(_t)),l===e&&(f.substr(o,3)===E?(l=E,o+=3):(l=e,_===0&&m(pt)),l===e))))if(l=o,v=f.charAt(o),ce.test(v)?o++:(v=e,_===0&&m(ue)),v!==e){if(b=[],k=f.charAt(o),Pe.test(k)?o++:(k=e,_===0&&m(Le)),k!==e)for(;k!==e;)b.push(k),k=f.charAt(o),Pe.test(k)?o++:(k=e,_===0&&m(Le));else b=e;b!==e?(v=[v,b],l=v):(o=l,l=e)}else o=l,l=e;return l!==e?(v=f.charAt(o),st.test(v)?o++:(v=e,_===0&&m(gt)),v===e&&(v=null),l=[l,v],a=l):(o=a,a=e),a!==e?i=f.substring(i,o):i=a,_--,i===e&&(a=e,_===0&&m(ht)),i}function Jt(){var i,a,l;for(_++,i=o,a=[],l=f.charAt(o),Ne.test(l)?o++:(l=e,_===0&&m(Re));l!==e;)a.push(l),a.length>=2?l=e:(l=f.charAt(o),Ne.test(l)?o++:(l=e,_===0&&m(Re)));return a.length<1?(o=i,i=e):i=a,_--,i===e&&(a=e,_===0&&m(dt)),i}function We(){var i,a,l,v,b;if(_++,i=o,K(),f.charCodeAt(o)===36?(a=$,o++):(a=e,_===0&&m(vt)),a!==e){if(l=o,v=[],b=f.charAt(o),X.test(b)?o++:(b=e,_===0&&m(ee)),b!==e)for(;b!==e;)v.push(b),b=f.charAt(o),X.test(b)?o++:(b=e,_===0&&m(ee));else v=e;v!==e?l=f.substring(l,o):l=v,l!==e?i=Ft(l):(o=i,i=e)}else o=i,i=e;return _--,i===e&&_===0&&m(mt),i}function _e(){var i;return i=Xt(),i===e&&(i=es()),i}function Xt(){var i,a,l,v,b;if(_++,i=o,f.charCodeAt(o)===123?(a=T,o++):(a=e,_===0&&m(Et)),a!==e){for(l=o,v=[],b=f.charAt(o),we.test(b)?o++:(b=e,_===0&&m(qe));b!==e;)v.push(b),b=f.charAt(o),we.test(b)?o++:(b=e,_===0&&m(qe));l=f.substring(l,o),f.charCodeAt(o)===125?(v=F,o++):(v=e,_===0&&m(St)),v!==e?i=Dt(l):(o=i,i=e)}else o=i,i=e;return _--,i===e&&(a=e,_===0&&m(bt)),i}function es(){var i,a,l,v,b;if(_++,i=o,f.charCodeAt(o)===59?(a=fe,o++):(a=e,_===0&&m(At)),a!==e){for(l=o,v=[],b=f.charAt(o),Ie.test(b)?o++:(b=e,_===0&&m(Fe));b!==e;)v.push(b),b=f.charAt(o),Ie.test(b)?o++:(b=e,_===0&&m(Fe));l=f.substring(l,o),i=Ut(l)}else o=i,i=e;return _--,i===e&&(a=e,_===0&&m(Ct)),i}function Ve(){var i,a,l,v;return _++,i=o,K(),f.charCodeAt(o)===40?(a=he,o++):(a=e,_===0&&m(kt)),a!==e?(l=He(),l!==e?(K(),f.charCodeAt(o)===41?(v=et,o++):(v=e,_===0&&m(yt)),v!==e?i=Bt(l):(o=i,i=e)):(o=i,i=e)):(o=i,i=e),_--,i===e&&_===0&&m($t),i}function ts(){var i,a,l;return _++,i=o,f.substr(o,3)===Ae?(a=Ae,o+=3):(a=e,_===0&&m(Pt)),a===e&&(f.substr(o,3)===$e?(a=$e,o+=3):(a=e,_===0&&m(Nt)),a===e&&(f.substr(o,7)===ke?(a=ke,o+=7):(a=e,_===0&&m(wt)),a===e&&(f.charCodeAt(o)===42?(a=tt,o++):(a=e,_===0&&m(It))))),a!==e?(K(),l=_e(),l===e&&(l=null),i=Qt(a,l)):(o=i,i=e),_--,i===e&&(a=e,_===0&&m(Tt)),i}function K(){var i,a;for(_++,i=[],a=f.charAt(o),xe.test(a)?o++:(a=e,_===0&&m(De));a!==e;)i.push(a),a=f.charAt(o),xe.test(a)?o++:(a=e,_===0&&m(De));return _--,a=e,_===0&&m(xt),i}if(Y=n(),t.peg$library)return{peg$result:Y,peg$currPos:o,peg$FAILED:e,peg$maxFailExpected:te,peg$maxFailPos:R};if(Y!==e&&o===f.length)return Y;throw Y!==e&&o<f.length&&m(jt()),Ht(te,R<f.length?f.charAt(R):null,R<f.length?Be(R,R+1):Be(R,R))}var ne=0xffffffffffffffffn;function ge(f,t){return(f<<t|f>>64n-t)&0xffffffffffffffffn}function Ye(f,t){return f*t&ne}function gs(f){return function(){let t=BigInt(f&ne),e=BigInt(f>>64n&ne),s=Ye(ge(Ye(t,5n),7n),9n);return e^=t,t=(ge(t,24n)^e^e<<16n)&ne,e=ge(e,37n),f=e<<64n|t,s}}var le=gs(0xa187eb39cdcaed8f31c4b365b102e01en),ds=Array.from({length:2},()=>Array.from({length:6},()=>Array.from({length:128},()=>le()))),ms=Array.from({length:8},()=>le()),vs=Array.from({length:16},()=>le()),de=le(),O="w",M="b",P="p",Se="n",oe="b",Z="r",B="q",N="k",me="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",W=class{constructor(t,e){y(this,"color");y(this,"from");y(this,"to");y(this,"piece");y(this,"captured");y(this,"promotion");y(this,"flags");y(this,"san");y(this,"lan");y(this,"before");y(this,"after");let{color:s,piece:r,from:n,to:c,flags:h,captured:u,promotion:g}=e,d=I(n),A=I(c);this.color=s,this.piece=r,this.from=d,this.to=A,this.san=t._moveToSan(e,t._moves({legal:!0})),this.lan=d+A,this.before=t.fen(),t._makeMove(e),this.after=t.fen(),t._undoMove(),this.flags="";for(let p in C)C[p]&h&&(this.flags+=j[p]);u&&(this.captured=u),g&&(this.promotion=g,this.lan+=g)}isCapture(){return this.flags.indexOf(j.CAPTURE)>-1}isPromotion(){return this.flags.indexOf(j.PROMOTION)>-1}isEnPassant(){return this.flags.indexOf(j.EP_CAPTURE)>-1}isKingsideCastle(){return this.flags.indexOf(j.KSIDE_CASTLE)>-1}isQueensideCastle(){return this.flags.indexOf(j.QSIDE_CASTLE)>-1}isBigPawn(){return this.flags.indexOf(j.BIG_PAWN)>-1}},x=-1,j={NORMAL:"n",CAPTURE:"c",BIG_PAWN:"b",EP_CAPTURE:"e",PROMOTION:"p",KSIDE_CASTLE:"k",QSIDE_CASTLE:"q",NULL_MOVE:"-"};var C={NORMAL:1,CAPTURE:2,BIG_PAWN:4,EP_CAPTURE:8,PROMOTION:16,KSIDE_CASTLE:32,QSIDE_CASTLE:64,NULL_MOVE:128},Ce={Event:"?",Site:"?",Date:"????.??.??",Round:"?",White:"?",Black:"?",Result:"*"},bs={WhiteTitle:null,BlackTitle:null,WhiteElo:null,BlackElo:null,WhiteUSCF:null,BlackUSCF:null,WhiteNA:null,BlackNA:null,WhiteType:null,BlackType:null,EventDate:null,EventSponsor:null,Section:null,Stage:null,Board:null,Opening:null,Variation:null,SubVariation:null,ECO:null,NIC:null,Time:null,UTCTime:null,UTCDate:null,TimeControl:null,SetUp:null,FEN:null,Termination:null,Annotator:null,Mode:null,PlyCount:null},Es={...Ce,...bs},S={a8:0,b8:1,c8:2,d8:3,e8:4,f8:5,g8:6,h8:7,a7:16,b7:17,c7:18,d7:19,e7:20,f7:21,g7:22,h7:23,a6:32,b6:33,c6:34,d6:35,e6:36,f6:37,g6:38,h6:39,a5:48,b5:49,c5:50,d5:51,e5:52,f5:53,g5:54,h5:55,a4:64,b4:65,c4:66,d4:67,e4:68,f4:69,g4:70,h4:71,a3:80,b3:81,c3:82,d3:83,e3:84,f3:85,g3:86,h3:87,a2:96,b2:97,c2:98,d2:99,e2:100,f2:101,g2:102,h2:103,a1:112,b1:113,c1:114,d1:115,e1:116,f1:117,g1:118,h1:119},ve={b:[16,32,17,15],w:[-16,-32,-17,-15]},ze={n:[-18,-33,-31,-14,18,33,31,14],b:[-17,-15,17,15],r:[-16,1,16,-1],q:[-17,-16,-15,1,17,16,15,-1],k:[-17,-16,-15,1,17,16,15,-1]},Ss=[20,0,0,0,0,0,0,24,0,0,0,0,0,0,20,0,0,20,0,0,0,0,0,24,0,0,0,0,0,20,0,0,0,0,20,0,0,0,0,24,0,0,0,0,20,0,0,0,0,0,0,20,0,0,0,24,0,0,0,20,0,0,0,0,0,0,0,0,20,0,0,24,0,0,20,0,0,0,0,0,0,0,0,0,0,20,2,24,2,20,0,0,0,0,0,0,0,0,0,0,0,2,53,56,53,2,0,0,0,0,0,0,24,24,24,24,24,24,56,0,56,24,24,24,24,24,24,0,0,0,0,0,0,2,53,56,53,2,0,0,0,0,0,0,0,0,0,0,0,20,2,24,2,20,0,0,0,0,0,0,0,0,0,0,20,0,0,24,0,0,20,0,0,0,0,0,0,0,0,20,0,0,0,24,0,0,0,20,0,0,0,0,0,0,20,0,0,0,0,24,0,0,0,0,20,0,0,0,0,20,0,0,0,0,0,24,0,0,0,0,0,20,0,0,20,0,0,0,0,0,0,24,0,0,0,0,0,0,20],Cs=[17,0,0,0,0,0,0,16,0,0,0,0,0,0,15,0,0,17,0,0,0,0,0,16,0,0,0,0,0,15,0,0,0,0,17,0,0,0,0,16,0,0,0,0,15,0,0,0,0,0,0,17,0,0,0,16,0,0,0,15,0,0,0,0,0,0,0,0,17,0,0,16,0,0,15,0,0,0,0,0,0,0,0,0,0,17,0,16,0,15,0,0,0,0,0,0,0,0,0,0,0,0,17,16,15,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,-1,-1,-1,-1,-1,-1,-1,0,0,0,0,0,0,0,-15,-16,-17,0,0,0,0,0,0,0,0,0,0,0,0,-15,0,-16,0,-17,0,0,0,0,0,0,0,0,0,0,-15,0,0,-16,0,0,-17,0,0,0,0,0,0,0,0,-15,0,0,0,-16,0,0,0,-17,0,0,0,0,0,0,-15,0,0,0,0,-16,0,0,0,0,-17,0,0,0,0,-15,0,0,0,0,0,-16,0,0,0,0,0,-17,0,0,-15,0,0,0,0,0,0,-16,0,0,0,0,0,0,-17],As={p:1,n:2,b:4,r:8,q:16,k:32},$s="pnbrqkPNBRQK",Ze=[Se,oe,Z,B],ks=7,ys=6,Ts=1,Ps=0,re={[N]:C.KSIDE_CASTLE,[B]:C.QSIDE_CASTLE},D={w:[{square:S.a1,flag:C.QSIDE_CASTLE},{square:S.h1,flag:C.KSIDE_CASTLE}],b:[{square:S.a8,flag:C.QSIDE_CASTLE},{square:S.h8,flag:C.KSIDE_CASTLE}]},Ns={b:Ts,w:ys},be="--";function H(f){return f>>4}function J(f){return f&15}function Xe(f){return"0123456789".indexOf(f)!==-1}function I(f){let t=J(f),e=H(f);return"abcdefgh".substring(t,t+1)+"87654321".substring(e,e+1)}function z(f){return f===O?M:O}function ws(f){let t=f.split(/\s+/);if(t.length!==6)return{ok:!1,error:"Invalid FEN: must contain six space-delimited fields"};let e=parseInt(t[5],10);if(isNaN(e)||e<=0)return{ok:!1,error:"Invalid FEN: move number must be a positive integer"};let s=parseInt(t[4],10);if(isNaN(s)||s<0)return{ok:!1,error:"Invalid FEN: half move counter number must be a non-negative integer"};if(!/^(-|[abcdefgh][36])$/.test(t[3]))return{ok:!1,error:"Invalid FEN: en-passant square is invalid"};if(/[^kKqQ-]/.test(t[2]))return{ok:!1,error:"Invalid FEN: castling availability is invalid"};if(!/^(w|b)$/.test(t[1]))return{ok:!1,error:"Invalid FEN: side-to-move is invalid"};let r=t[0].split("/");if(r.length!==8)return{ok:!1,error:"Invalid FEN: piece data does not contain 8 '/'-delimited rows"};for(let c=0;c<r.length;c++){let h=0,u=!1;for(let g=0;g<r[c].length;g++)if(Xe(r[c][g])){if(u)return{ok:!1,error:"Invalid FEN: piece data is invalid (consecutive number)"};h+=parseInt(r[c][g],10),u=!0}else{if(!/^[prnbqkPRNBQK]$/.test(r[c][g]))return{ok:!1,error:"Invalid FEN: piece data is invalid (invalid piece)"};h+=1,u=!1}if(h!==8)return{ok:!1,error:"Invalid FEN: piece data is invalid (too many squares in rank)"}}if(t[3][1]=="3"&&t[1]=="w"||t[3][1]=="6"&&t[1]=="b")return{ok:!1,error:"Invalid FEN: illegal en-passant square"};let n=[{color:"white",regex:/K/g},{color:"black",regex:/k/g}];for(let{color:c,regex:h}of n){if(!h.test(t[0]))return{ok:!1,error:`Invalid FEN: missing ${c} king`};if((t[0].match(h)||[]).length>1)return{ok:!1,error:`Invalid FEN: too many ${c} kings`}}return Array.from(r[0]+r[7]).some(c=>c.toUpperCase()==="P")?{ok:!1,error:"Invalid FEN: some pawns are on the edge rows"}:{ok:!0}}function Is(f,t){let e=f.from,s=f.to,r=f.piece,n=0,c=0,h=0;for(let u=0,g=t.length;u<g;u++){let d=t[u].from,A=t[u].to,p=t[u].piece;r===p&&e!==d&&s===A&&(n++,H(e)===H(d)&&c++,J(e)===J(d)&&h++)}return n>0?c>0&&h>0?I(e):h>0?I(e).charAt(1):I(e).charAt(0):""}function U(f,t,e,s,r,n=void 0,c=C.NORMAL){let h=H(s);if(r===P&&(h===ks||h===Ps))for(let u=0;u<Ze.length;u++){let g=Ze[u];f.push({color:t,from:e,to:s,piece:r,captured:n,promotion:g,flags:c|C.PROMOTION})}else f.push({color:t,from:e,to:s,piece:r,captured:n,flags:c})}function Je(f){let t=f.charAt(0);return t>="a"&&t<="h"?f.match(/[a-h]\d.*[a-h]\d/)?void 0:P:(t=t.toLowerCase(),t==="o"?N:t)}function Ee(f){return f.replace(/=/,"").replace(/[+#]?[?!]*$/,"")}var ae=class{constructor(t=me,{skipValidation:e=!1}={}){y(this,"_board",new Array(128));y(this,"_turn",O);y(this,"_header",{});y(this,"_kings",{w:x,b:x});y(this,"_epSquare",-1);y(this,"_halfMoves",0);y(this,"_moveNumber",0);y(this,"_history",[]);y(this,"_comments",{});y(this,"_castling",{w:0,b:0});y(this,"_hash",0n);y(this,"_positionCount",new Map);this.load(t,{skipValidation:e})}clear({preserveHeaders:t=!1}={}){this._board=new Array(128),this._kings={w:x,b:x},this._turn=O,this._castling={w:0,b:0},this._epSquare=x,this._halfMoves=0,this._moveNumber=1,this._history=[],this._comments={},this._header=t?this._header:{...Es},this._hash=this._computeHash(),this._positionCount=new Map,this._header.SetUp=null,this._header.FEN=null}load(t,{skipValidation:e=!1,preserveHeaders:s=!1}={}){let r=t.split(/\s+/);if(r.length>=2&&r.length<6){let h=["-","-","0","1"];t=r.concat(h.slice(-(6-r.length))).join(" ")}if(r=t.split(/\s+/),!e){let{ok:h,error:u}=ws(t);if(!h)throw new Error(u)}let n=r[0],c=0;this.clear({preserveHeaders:s});for(let h=0;h<n.length;h++){let u=n.charAt(h);if(u==="/")c+=8;else if(Xe(u))c+=parseInt(u,10);else{let g=u<"a"?O:M;this._put({type:u.toLowerCase(),color:g},I(c)),c++}}this._turn=r[1],r[2].indexOf("K")>-1&&(this._castling.w|=C.KSIDE_CASTLE),r[2].indexOf("Q")>-1&&(this._castling.w|=C.QSIDE_CASTLE),r[2].indexOf("k")>-1&&(this._castling.b|=C.KSIDE_CASTLE),r[2].indexOf("q")>-1&&(this._castling.b|=C.QSIDE_CASTLE),this._epSquare=r[3]==="-"?x:S[r[3]],this._halfMoves=parseInt(r[4],10),this._moveNumber=parseInt(r[5],10),this._hash=this._computeHash(),this._updateSetup(t),this._incPositionCount()}fen({forceEnpassantSquare:t=!1}={}){let e=0,s="";for(let c=S.a8;c<=S.h1;c++){if(this._board[c]){e>0&&(s+=e,e=0);let{color:h,type:u}=this._board[c];s+=h===O?u.toUpperCase():u.toLowerCase()}else e++;c+1&136&&(e>0&&(s+=e),c!==S.h1&&(s+="/"),e=0,c+=8)}let r="";this._castling[O]&C.KSIDE_CASTLE&&(r+="K"),this._castling[O]&C.QSIDE_CASTLE&&(r+="Q"),this._castling[M]&C.KSIDE_CASTLE&&(r+="k"),this._castling[M]&C.QSIDE_CASTLE&&(r+="q"),r=r||"-";let n="-";if(this._epSquare!==x)if(t)n=I(this._epSquare);else{let c=this._epSquare+(this._turn===O?16:-16),h=[c+1,c-1];for(let u of h){if(u&136)continue;let g=this._turn;if(this._board[u]?.color===g&&this._board[u]?.type===P){this._makeMove({color:g,from:u,to:this._epSquare,piece:P,captured:P,flags:C.EP_CAPTURE});let d=!this._isKingAttacked(g);if(this._undoMove(),d){n=I(this._epSquare);break}}}}return[s,this._turn,r,n,this._halfMoves,this._moveNumber].join(" ")}_pieceKey(t){if(!this._board[t])return 0n;let{color:e,type:s}=this._board[t],r={w:0,b:1}[e],n={p:0,n:1,b:2,r:3,q:4,k:5}[s];return ds[r][n][t]}_epKey(){return this._epSquare===x?0n:ms[this._epSquare&7]}_castlingKey(){let t=this._castling.w>>5|this._castling.b>>3;return vs[t]}_computeHash(){let t=0n;for(let e=S.a8;e<=S.h1;e++){if(e&136){e+=7;continue}this._board[e]&&(t^=this._pieceKey(e))}return t^=this._epKey(),t^=this._castlingKey(),this._turn==="b"&&(t^=de),t}_updateSetup(t){this._history.length>0||(t!==me?(this._header.SetUp="1",this._header.FEN=t):(this._header.SetUp=null,this._header.FEN=null))}reset(){this.load(me)}get(t){return this._board[S[t]]}findPiece(t){let e=[];for(let s=S.a8;s<=S.h1;s++){if(s&136){s+=7;continue}!this._board[s]||this._board[s]?.color!==t.color||this._board[s].color===t.color&&this._board[s].type===t.type&&e.push(I(s))}return e}put({type:t,color:e},s){return this._put({type:t,color:e},s)?(this._updateCastlingRights(),this._updateEnPassantSquare(),this._updateSetup(this.fen()),!0):!1}_set(t,e){this._hash^=this._pieceKey(t),this._board[t]=e,this._hash^=this._pieceKey(t)}_put({type:t,color:e},s){if($s.indexOf(t.toLowerCase())===-1||!(s in S))return!1;let r=S[s];if(t==N&&!(this._kings[e]==x||this._kings[e]==r))return!1;let n=this._board[r];return n&&n.type===N&&(this._kings[n.color]=x),this._set(r,{type:t,color:e}),t===N&&(this._kings[e]=r),!0}_clear(t){this._hash^=this._pieceKey(t),delete this._board[t]}remove(t){let e=this.get(t);return this._clear(S[t]),e&&e.type===N&&(this._kings[e.color]=x),this._updateCastlingRights(),this._updateEnPassantSquare(),this._updateSetup(this.fen()),e}_updateCastlingRights(){this._hash^=this._castlingKey();let t=this._board[S.e1]?.type===N&&this._board[S.e1]?.color===O,e=this._board[S.e8]?.type===N&&this._board[S.e8]?.color===M;(!t||this._board[S.a1]?.type!==Z||this._board[S.a1]?.color!==O)&&(this._castling.w&=-65),(!t||this._board[S.h1]?.type!==Z||this._board[S.h1]?.color!==O)&&(this._castling.w&=-33),(!e||this._board[S.a8]?.type!==Z||this._board[S.a8]?.color!==M)&&(this._castling.b&=-65),(!e||this._board[S.h8]?.type!==Z||this._board[S.h8]?.color!==M)&&(this._castling.b&=-33),this._hash^=this._castlingKey()}_updateEnPassantSquare(){if(this._epSquare===x)return;let t=this._epSquare+(this._turn===O?-16:16),e=this._epSquare+(this._turn===O?16:-16),s=[e+1,e-1];if(this._board[t]!==null||this._board[this._epSquare]!==null||this._board[e]?.color!==z(this._turn)||this._board[e]?.type!==P){this._hash^=this._epKey(),this._epSquare=x;return}let r=n=>!(n&136)&&this._board[n]?.color===this._turn&&this._board[n]?.type===P;s.some(r)||(this._hash^=this._epKey(),this._epSquare=x)}_attacked(t,e,s){let r=[];for(let n=S.a8;n<=S.h1;n++){if(n&136){n+=7;continue}if(this._board[n]===void 0||this._board[n].color!==t)continue;let c=this._board[n],h=n-e;if(h===0)continue;let u=h+119;if(Ss[u]&As[c.type]){if(c.type===P){if(h>0&&c.color===O||h<=0&&c.color===M)if(s)r.push(I(n));else return!0;continue}if(c.type==="n"||c.type==="k")if(s){r.push(I(n));continue}else return!0;let g=Cs[u],d=n+g,A=!1;for(;d!==e;){if(this._board[d]!=null){A=!0;break}d+=g}if(!A)if(s){r.push(I(n));continue}else return!0}}return s?r:!1}attackers(t,e){return e?this._attacked(e,S[t],!0):this._attacked(this._turn,S[t],!0)}_isKingAttacked(t){let e=this._kings[t];return e===-1?!1:this._attacked(z(t),e)}hash(){return this._hash.toString(16)}isAttacked(t,e){return this._attacked(e,S[t])}isCheck(){return this._isKingAttacked(this._turn)}inCheck(){return this.isCheck()}isCheckmate(){return this.isCheck()&&this._moves().length===0}isStalemate(){return!this.isCheck()&&this._moves().length===0}isInsufficientMaterial(){let t={b:0,n:0,r:0,q:0,k:0,p:0},e=[],s=0,r=0;for(let n=S.a8;n<=S.h1;n++){if(r=(r+1)%2,n&136){n+=7;continue}let c=this._board[n];c&&(t[c.type]=c.type in t?t[c.type]+1:1,c.type===oe&&e.push(r),s++)}if(s===2)return!0;if(s===3&&(t[oe]===1||t[Se]===1))return!0;if(s===t[oe]+2){let n=0,c=e.length;for(let h=0;h<c;h++)n+=e[h];if(n===0||n===c)return!0}return!1}isThreefoldRepetition(){return this._getPositionCount(this._hash)>=3}isDrawByFiftyMoves(){return this._halfMoves>=100}isDraw(){return this.isDrawByFiftyMoves()||this.isStalemate()||this.isInsufficientMaterial()||this.isThreefoldRepetition()}isGameOver(){return this.isCheckmate()||this.isDraw()}moves({verbose:t=!1,square:e=void 0,piece:s=void 0}={}){let r=this._moves({square:e,piece:s});return t?r.map(n=>new W(this,n)):r.map(n=>this._moveToSan(n,r))}_moves({legal:t=!0,piece:e=void 0,square:s=void 0}={}){let r=s?s.toLowerCase():void 0,n=e?.toLowerCase(),c=[],h=this._turn,u=z(h),g=S.a8,d=S.h1,A=!1;if(r)if(r in S)g=d=S[r],A=!0;else return[];for(let E=g;E<=d;E++){if(E&136){E+=7;continue}if(!this._board[E]||this._board[E].color===u)continue;let{type:$}=this._board[E],T;if($===P){if(n&&n!==$)continue;T=E+ve[h][0],this._board[T]||(U(c,h,E,T,P),T=E+ve[h][1],Ns[h]===H(E)&&!this._board[T]&&U(c,h,E,T,P,void 0,C.BIG_PAWN));for(let F=2;F<4;F++)T=E+ve[h][F],!(T&136)&&(this._board[T]?.color===u?U(c,h,E,T,P,this._board[T].type,C.CAPTURE):T===this._epSquare&&U(c,h,E,T,P,P,C.EP_CAPTURE))}else{if(n&&n!==$)continue;for(let F=0,fe=ze[$].length;F<fe;F++){let he=ze[$][F];for(T=E;T+=he,!(T&136);){if(!this._board[T])U(c,h,E,T,$);else{if(this._board[T].color===h)break;U(c,h,E,T,$,this._board[T].type,C.CAPTURE);break}if($===Se||$===N)break}}}}if((n===void 0||n===N)&&(!A||d===this._kings[h])){if(this._castling[h]&C.KSIDE_CASTLE){let E=this._kings[h],$=E+2;!this._board[E+1]&&!this._board[$]&&!this._attacked(u,this._kings[h])&&!this._attacked(u,E+1)&&!this._attacked(u,$)&&U(c,h,this._kings[h],$,N,void 0,C.KSIDE_CASTLE)}if(this._castling[h]&C.QSIDE_CASTLE){let E=this._kings[h],$=E-2;!this._board[E-1]&&!this._board[E-2]&&!this._board[E-3]&&!this._attacked(u,this._kings[h])&&!this._attacked(u,E-1)&&!this._attacked(u,$)&&U(c,h,this._kings[h],$,N,void 0,C.QSIDE_CASTLE)}}if(!t||this._kings[h]===-1)return c;let p=[];for(let E=0,$=c.length;E<$;E++)this._makeMove(c[E]),this._isKingAttacked(h)||p.push(c[E]),this._undoMove();return p}move(t,{strict:e=!1}={}){let s=null;if(typeof t=="string")s=this._moveFromSan(t,e);else if(t===null)s=this._moveFromSan(be,e);else if(typeof t=="object"){let n=this._moves();for(let c=0,h=n.length;c<h;c++)if(t.from===I(n[c].from)&&t.to===I(n[c].to)&&(!("promotion"in n[c])||t.promotion===n[c].promotion)){s=n[c];break}}if(!s)throw typeof t=="string"?new Error(`Invalid move: ${t}`):new Error(`Invalid move: ${JSON.stringify(t)}`);if(this.isCheck()&&s.flags&C.NULL_MOVE)throw new Error("Null move not allowed when in check");let r=new W(this,s);return this._makeMove(s),this._incPositionCount(),r}_push(t){this._history.push({move:t,kings:{b:this._kings.b,w:this._kings.w},turn:this._turn,castling:{b:this._castling.b,w:this._castling.w},epSquare:this._epSquare,halfMoves:this._halfMoves,moveNumber:this._moveNumber})}_movePiece(t,e){this._hash^=this._pieceKey(t),this._board[e]=this._board[t],delete this._board[t],this._hash^=this._pieceKey(e)}_makeMove(t){let e=this._turn,s=z(e);if(this._push(t),t.flags&C.NULL_MOVE){e===M&&this._moveNumber++,this._halfMoves++,this._turn=s,this._epSquare=x;return}if(this._hash^=this._epKey(),this._hash^=this._castlingKey(),t.captured&&(this._hash^=this._pieceKey(t.to)),this._movePiece(t.from,t.to),t.flags&C.EP_CAPTURE&&(this._turn===M?this._clear(t.to-16):this._clear(t.to+16)),t.promotion&&(this._clear(t.to),this._set(t.to,{type:t.promotion,color:e})),this._board[t.to].type===N){if(this._kings[e]=t.to,t.flags&C.KSIDE_CASTLE){let r=t.to-1,n=t.to+1;this._movePiece(n,r)}else if(t.flags&C.QSIDE_CASTLE){let r=t.to+1,n=t.to-2;this._movePiece(n,r)}this._castling[e]=0}if(this._castling[e]){for(let r=0,n=D[e].length;r<n;r++)if(t.from===D[e][r].square&&this._castling[e]&D[e][r].flag){this._castling[e]^=D[e][r].flag;break}}if(this._castling[s]){for(let r=0,n=D[s].length;r<n;r++)if(t.to===D[s][r].square&&this._castling[s]&D[s][r].flag){this._castling[s]^=D[s][r].flag;break}}if(this._hash^=this._castlingKey(),t.flags&C.BIG_PAWN){let r;e===M?r=t.to-16:r=t.to+16,!(t.to-1&136)&&this._board[t.to-1]?.type===P&&this._board[t.to-1]?.color===s||!(t.to+1&136)&&this._board[t.to+1]?.type===P&&this._board[t.to+1]?.color===s?(this._epSquare=r,this._hash^=this._epKey()):this._epSquare=x}else this._epSquare=x;t.piece===P?this._halfMoves=0:t.flags&(C.CAPTURE|C.EP_CAPTURE)?this._halfMoves=0:this._halfMoves++,e===M&&this._moveNumber++,this._turn=s,this._hash^=de}undo(){let t=this._hash,e=this._undoMove();if(e){let s=new W(this,e);return this._decPositionCount(t),s}return null}_undoMove(){let t=this._history.pop();if(t===void 0)return null;this._hash^=this._epKey(),this._hash^=this._castlingKey();let e=t.move;this._kings=t.kings,this._turn=t.turn,this._castling=t.castling,this._epSquare=t.epSquare,this._halfMoves=t.halfMoves,this._moveNumber=t.moveNumber,this._hash^=this._epKey(),this._hash^=this._castlingKey(),this._hash^=de;let s=this._turn,r=z(s);if(e.flags&C.NULL_MOVE)return e;if(this._movePiece(e.to,e.from),e.piece&&(this._clear(e.from),this._set(e.from,{type:e.piece,color:s})),e.captured)if(e.flags&C.EP_CAPTURE){let n;s===M?n=e.to-16:n=e.to+16,this._set(n,{type:P,color:r})}else this._set(e.to,{type:e.captured,color:r});if(e.flags&(C.KSIDE_CASTLE|C.QSIDE_CASTLE)){let n,c;e.flags&C.KSIDE_CASTLE?(n=e.to+1,c=e.to-1):(n=e.to-2,c=e.to+1),this._movePiece(c,n)}return e}pgn({newline:t=`
`,maxWidth:e=0}={}){let s=[],r=!1;for(let p in this._header)this._header[p]&&s.push(`[${p} "${this._header[p]}"]`+t),r=!0;r&&this._history.length&&s.push(t);let n=p=>{let E=this._comments[this.fen()];if(typeof E<"u"){let $=p.length>0?" ":"";p=`${p}${$}{${E}}`}return p},c=[];for(;this._history.length>0;)c.push(this._undoMove());let h=[],u="";for(c.length===0&&h.push(n(""));c.length>0;){u=n(u);let p=c.pop();if(!p)break;if(!this._history.length&&p.color==="b"){let E=`${this._moveNumber}. ...`;u=u?`${u} ${E}`:E}else p.color==="w"&&(u.length&&h.push(u),u=this._moveNumber+".");u=u+" "+this._moveToSan(p,this._moves({legal:!0})),this._makeMove(p)}if(u.length&&h.push(n(u)),h.push(this._header.Result||"*"),e===0)return s.join("")+h.join(" ");let g=function(){return s.length>0&&s[s.length-1]===" "?(s.pop(),!0):!1},d=function(p,E){for(let $ of E.split(" "))if($){if(p+$.length>e){for(;g();)p--;s.push(t),p=0}s.push($),p+=$.length,s.push(" "),p++}return g()&&p--,p},A=0;for(let p=0;p<h.length;p++){if(A+h[p].length>e&&h[p].includes("{")){A=d(A,h[p]);continue}A+h[p].length>e&&p!==0?(s[s.length-1]===" "&&s.pop(),s.push(t),A=0):p!==0&&(s.push(" "),A++),s.push(h[p]),A+=h[p].length}return s.join("")}header(...t){for(let e=0;e<t.length;e+=2)typeof t[e]=="string"&&typeof t[e+1]=="string"&&(this._header[t[e]]=t[e+1]);return this._header}setHeader(t,e){return this._header[t]=e??Ce[t]??null,this.getHeaders()}removeHeader(t){return t in this._header?(this._header[t]=Ce[t]||null,!0):!1}getHeaders(){let t={};for(let[e,s]of Object.entries(this._header))s!==null&&(t[e]=s);return t}loadPgn(t,{strict:e=!1,newlineChar:s=`\r?
`}={}){s!==`\r?
`&&(t=t.replace(new RegExp(s,"g"),`
`));let r=ps(t);this.reset();let n=r.headers,c="";for(let g in n)g.toLowerCase()==="fen"&&(c=n[g]),this.header(g,n[g]);if(!e)c&&this.load(c,{preserveHeaders:!0});else if(n.SetUp==="1"){if(!("FEN"in n))throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");this.load(n.FEN,{preserveHeaders:!0})}let h=r.root;for(;h;){if(h.move){let g=this._moveFromSan(h.move,e);if(g==null)throw new Error(`Invalid move in PGN: ${h.move}`);this._makeMove(g),this._incPositionCount()}h.comment!==void 0&&(this._comments[this.fen()]=h.comment),h=h.variations[0]}let u=r.result;u&&Object.keys(this._header).length&&this._header.Result!==u&&this.setHeader("Result",u)}_moveToSan(t,e){let s="";if(t.flags&C.KSIDE_CASTLE)s="O-O";else if(t.flags&C.QSIDE_CASTLE)s="O-O-O";else{if(t.flags&C.NULL_MOVE)return be;if(t.piece!==P){let r=Is(t,e);s+=t.piece.toUpperCase()+r}t.flags&(C.CAPTURE|C.EP_CAPTURE)&&(t.piece===P&&(s+=I(t.from)[0]),s+="x"),s+=I(t.to),t.promotion&&(s+="="+t.promotion.toUpperCase())}return this._makeMove(t),this.isCheck()&&(this.isCheckmate()?s+="#":s+="+"),this._undoMove(),s}_moveFromSan(t,e=!1){let s=Ee(t);if(e||(s==="0-0"?s="O-O":s==="0-0-0"&&(s="O-O-O")),s==be)return{color:this._turn,from:0,to:0,piece:"k",flags:C.NULL_MOVE};let r=Je(s),n=this._moves({legal:!0,piece:r});for(let p=0,E=n.length;p<E;p++)if(s===Ee(this._moveToSan(n[p],n)))return n[p];if(e)return null;let c,h,u,g,d,A=!1;if(h=s.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/),h?(c=h[1],u=h[2],g=h[3],d=h[4],u.length==1&&(A=!0)):(h=s.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/),h&&(c=h[1],u=h[2],g=h[3],d=h[4],u.length==1&&(A=!0))),r=Je(s),n=this._moves({legal:!0,piece:c||r}),!g)return null;for(let p=0,E=n.length;p<E;p++)if(u){if((!c||c.toLowerCase()==n[p].piece)&&S[u]==n[p].from&&S[g]==n[p].to&&(!d||d.toLowerCase()==n[p].promotion))return n[p];if(A){let $=I(n[p].from);if((!c||c.toLowerCase()==n[p].piece)&&S[g]==n[p].to&&(u==$[0]||u==$[1])&&(!d||d.toLowerCase()==n[p].promotion))return n[p]}}else if(s===Ee(this._moveToSan(n[p],n)).replace("x",""))return n[p];return null}ascii(){let t=`   +------------------------+
`;for(let e=S.a8;e<=S.h1;e++){if(J(e)===0&&(t+=" "+"87654321"[H(e)]+" |"),this._board[e]){let s=this._board[e].type,n=this._board[e].color===O?s.toUpperCase():s.toLowerCase();t+=" "+n+" "}else t+=" . ";e+1&136&&(t+=`|
`,e+=8)}return t+=`   +------------------------+
`,t+="     a  b  c  d  e  f  g  h",t}perft(t){let e=this._moves({legal:!1}),s=0,r=this._turn;for(let n=0,c=e.length;n<c;n++)this._makeMove(e[n]),this._isKingAttacked(r)||(t-1>0?s+=this.perft(t-1):s++),this._undoMove();return s}setTurn(t){return this._turn==t?!1:(this.move("--"),!0)}turn(){return this._turn}board(){let t=[],e=[];for(let s=S.a8;s<=S.h1;s++)this._board[s]==null?e.push(null):e.push({square:I(s),type:this._board[s].type,color:this._board[s].color}),s+1&136&&(t.push(e),e=[],s+=8);return t}squareColor(t){if(t in S){let e=S[t];return(H(e)+J(e))%2===0?"light":"dark"}return null}history({verbose:t=!1}={}){let e=[],s=[];for(;this._history.length>0;)e.push(this._undoMove());for(;;){let r=e.pop();if(!r)break;t?s.push(new W(this,r)):s.push(this._moveToSan(r,this._moves())),this._makeMove(r)}return s}_getPositionCount(t){return this._positionCount.get(t)??0}_incPositionCount(){this._positionCount.set(this._hash,(this._positionCount.get(this._hash)??0)+1)}_decPositionCount(t){let e=this._positionCount.get(t)??0;e===1?this._positionCount.delete(t):this._positionCount.set(t,e-1)}_pruneComments(){let t=[],e={},s=r=>{r in this._comments&&(e[r]=this._comments[r])};for(;this._history.length>0;)t.push(this._undoMove());for(s(this.fen());;){let r=t.pop();if(!r)break;this._makeMove(r),s(this.fen())}this._comments=e}getComment(){return this._comments[this.fen()]}setComment(t){this._comments[this.fen()]=t.replace("{","[").replace("}","]")}deleteComment(){return this.removeComment()}removeComment(){let t=this._comments[this.fen()];return delete this._comments[this.fen()],t}getComments(){return this._pruneComments(),Object.keys(this._comments).map(t=>({fen:t,comment:this._comments[t]}))}deleteComments(){return this.removeComments()}removeComments(){return this._pruneComments(),Object.keys(this._comments).map(t=>{let e=this._comments[t];return delete this._comments[t],{fen:t,comment:e}})}setCastlingRights(t,e){for(let r of[N,B])e[r]!==void 0&&(e[r]?this._castling[t]|=re[r]:this._castling[t]&=~re[r]);this._updateCastlingRights();let s=this.getCastlingRights(t);return(e[N]===void 0||e[N]===s[N])&&(e[B]===void 0||e[B]===s[B])}getCastlingRights(t){return{[N]:(this._castling[t]&re[N])!==0,[B]:(this._castling[t]&re[B])!==0}}moveNumber(){return this._moveNumber}};return ls(xs);})();
  // ---------- end legal-move rules ----------

  // ---------- settings ----------

  const STORE_KEY = 'board-studio-settings-v1';
  const DEFAULTS = {
    style: { on: true },
    marks: { on: true, c1: '#7fd6a0b8', c2: '#f0827ab8' },
    arrows: { on: true, color: '#ffaa00cc', aim: true },
    arrowEval: { on: false },
    danger: { on: true, blunders: false },
    book: { on: true },
    crown: { on: true },
    ghosts: { on: true, opacity: 0.25, ai: false },
    global: { on: true }
  };

  const rawSettings = (() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { /* private mode */ }
    const out = {};
    for (const k of Object.keys(DEFAULTS)) out[k] = { ...DEFAULTS[k], ...(saved[k] || {}) };
    // Colors saved before alpha existed get the alpha their look had (marks 72%, arrows 80%).
    ['c1', 'c2'].forEach(k => { if (/^#[0-9a-f]{6}$/i.test(out.marks[k])) out.marks[k] += 'b8'; });
    if (/^#[0-9a-f]{6}$/i.test(out.arrows.color)) out.arrows.color += 'cc';
    return out;
  })();

  // What the script reads. With "Global" off every on/off switch reads as off, so the whole script
  // goes quiet at once; rawSettings still holds what you picked, and the Styles panel shows that.
  const settings = new Proxy(rawSettings, {
    get(target, group) {
      const value = target[group];
      if (group === 'global' || !value || typeof value !== 'object') return value;
      return new Proxy(value, {
        get: (inner, key) => (typeof inner[key] === 'boolean' && !target.global.on ? false : inner[key])
      });
    }
  });

  const listeners = new Set();
  const ARROW_GRADES = {
    brilliant: { label: 'Brilliant', color: '#1baca6' },
    best: { label: 'Best Move', color: '#96bc4b' },
    excellent: { label: 'Excellent', color: '#96bc4b' },
    good: { label: 'Good', color: '#96af8b' },
    book: { label: 'Book Move', color: '#a88865' },
    inaccuracy: { label: 'Inaccuracy', color: '#f7c045' },
    mistake: { label: 'Mistake', color: '#e58f2a' },
    blunder: { label: 'Blunder', color: '#fa412d' },
    missed: { label: 'Missed Win', color: '#dbac1d' }
  };
  function setSetting(group, key, value) {
    rawSettings[group][key] = value;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(rawSettings)); } catch (e) { /* ignore */ }
    applySettings();
    listeners.forEach(fn => fn());
  }

  // ---------- shared helpers ----------

  const NS = 'http://www.w3.org/2000/svg';
  const UNIT = 100;            // one square in the 800x800 arrow space
  const WIDTH = 14;            // shaft width
  const MOVE = /^([a-h])([1-8])([a-h])([1-8])$/;
  const SITE_ORANGE = 'rgb(255, 170, 0)';
  // Chess.com's right-click highlights. Plain right-click is red; shift + right-click is green.
  // Our two mark states ride on those, so chess.com stores, clears and restores them per move.
  const SITE_GREEN = '172, 206, 89';
  const SITE_RED = '235, 97, 80';
  const USER_HIGHLIGHT = /235, 97, 80|172, 206, 89|255, 170, 0|82, 176, 220/;

  // '#rrggbbaa' -> { rgb: '#rrggbb', a: 0..1 }
  function splitColor(hex) {
    const h = /^#[0-9a-f]{8}$/i.test(hex) ? hex : /^#[0-9a-f]{6}$/i.test(hex) ? hex + 'ff' : '#ffaa00cc';
    return { rgb: h.slice(0, 7).toLowerCase(), a: parseInt(h.slice(7, 9), 16) / 255 };
  }

  // requestAnimationFrame, but never stuck: a tab that is not painting still gets the call.
  function nextFrame(fn) {
    let done = false;
    const run = () => { if (!done) { done = true; fn(); } };
    requestAnimationFrame(run);
    setTimeout(run, 60);
  }

  // file/rank are 1-based; returns the square's top-left corner in square units.
  function squareXY(file, rank, flipped) {
    return flipped ? { x: 8 - file, y: rank - 1 } : { x: file - 1, y: 8 - rank };
  }

  function squareClass(el) {
    const m = /(?:^|\s)square-(\d)(\d)(?:\s|$)/.exec(el.className);
    return m ? { f: +m[1] - 1, r: +m[2] - 1 } : null;
  }

  const sqName = s => String.fromCharCode(97 + s.f) + (s.r + 1);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  }

  function hexToHsl(hex) {
    let [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }

  // ---------- page styles ----------

  // Matching path commands let the browser interpolate the actual outline in both
  // directions. A second contour shrinks the capture ring's hole into the cross.
  const hintCircle = radius => Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 60) * Math.PI / 180;
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius];
  });
  function roundedHintPath(points, round) {
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const pair = p => p.map(v => v.toFixed(3)).join(' ');
    let d = `M${pair(mix(points[points.length - 1], points[0], round))}`;
    points.forEach((p, i) => {
      const before = mix(p, points[(i + points.length - 1) % points.length], round);
      const after = mix(p, points[(i + 1) % points.length], round);
      d += ` L${pair(before)} Q${pair(p)} ${pair(after)}`;
    });
    return d + ' Z';
  }
  const hintHole = roundedHintPath(hintCircle(0), .5);
  const hintDotPath = roundedHintPath(hintCircle(16), .5) + hintHole;
  const hintCrossPath = roundedHintPath([[-5,-25],[5,-25],[5,-5],[25,-5],[25,5],[5,5],[5,25],[-5,25],[-5,5],[-25,5],[-25,-5],[-5,-5]].map(([x,y]) => [50 + (x-y)/Math.SQRT2, 50 + (x+y)/Math.SQRT2]), .18) + hintHole;

  const style = document.createElement('style');
  style.textContent = `
    html.bs-arrows svg.arrows polygon.arrow[data-cc] { display: none !important; }
    html.bs-marks .highlight[style*="235, 97, 80"], html.bs-marks .highlight[style*="172, 206, 89"],
    html.bs-marks .highlight[style*="255, 170, 0"], html.bs-marks .highlight[style*="82, 176, 220"] { display: none !important; }
    svg.cc-arrows { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    svg.cc-arrows .cc-arrow { filter: drop-shadow(0 2px 6px rgba(0,0,0,0.22)); }
    svg.cc-arrows .cc-arrow.book { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.18)); }
    svg.cc-arrows .shaft { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    svg.cc-arrows .head { stroke-linejoin: round; }
    svg.cc-arrows stop { transition: stop-color 460ms ease; }
    svg.cc-arrows .head { transition: fill 460ms ease, stroke 460ms ease; }
    svg.arrows polygon.arrow { transition: fill 460ms ease; }
    svg.arrows polygon.arrow[data-bs-grade] { fill: var(--bs-eval-color) !important; }
    @media (prefers-reduced-motion: reduce) {
      svg.cc-arrows stop, svg.cc-arrows .head, svg.arrows polygon.arrow { transition: none; }
    }
    .cc-marks { position: absolute; inset: 0; pointer-events: none; }
    .cc-mark {
      position: absolute; width: 12.5%; height: 12.5%;
      transition: left 420ms cubic-bezier(.34,1.4,.64,1), top 420ms cubic-bezier(.34,1.4,.64,1);
    }
    .cc-mark::before {
      content: ''; position: absolute; inset: 7%; border-radius: 18%;
      background: var(--cc-mark);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--cc-mark) 55%, transparent) inset, 0 2px 10px rgba(0,0,0,0.18);
      transform: scale(1);
      transition: transform 340ms cubic-bezier(.34,1.7,.64,1), opacity 200ms ease, background-color 220ms ease, box-shadow 220ms ease;
    }
    .cc-mark.cc-enter::before, .cc-mark.cc-leave::before { transform: scale(0.45); opacity: 0; }
    .cc-mark.cc-bump::before { transform: scale(1.12); }
    .bs-nav-icon { width: 24px; height: 24px; flex: none; }
    .cc-ghosts { position: absolute; inset: 0; pointer-events: none; }
    .cc-ghost {
      position: absolute; width: 12.5%; height: 12.5%; background-size: 100% 100%; background-repeat: no-repeat;
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.35));
      transition: left 460ms cubic-bezier(.34, 1.25, .64, 1), top 460ms cubic-bezier(.34, 1.25, .64, 1),
                  opacity 260ms ease, transform 300ms cubic-bezier(.34, 1.4, .64, 1);
    }
    .cc-ghost.cc-ghost-leave { transform: scale(0.7); }
    .bs-ghost-ai { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
    .bs-ghost-ai svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .bs-ghost-ai .cc-ghost { filter: drop-shadow(0 0 5px var(--reply-color)); }
    .bs-ghost-ai .cc-ghost, .bs-ghost-ai .cc-ghost.cc-ghost-leave { transition: left 460ms cubic-bezier(.34, 1.25, .64, 1), top 460ms cubic-bezier(.34, 1.25, .64, 1),
                  opacity 320ms ease, transform 320ms cubic-bezier(.34, 1.4, .64, 1); }
    .bs-ghost-ai .reply-arrow { transition: opacity 320ms ease; }
    .bs-ghost-ai .reply-shaft { fill: none; stroke-linecap: round; stroke-linejoin: round; transition: stroke 320ms ease; }
    .bs-ghost-ai .reply-head { stroke-linejoin: round; transition: fill 320ms ease, stroke 320ms ease; }
    @media (prefers-reduced-motion: reduce) {
      .bs-ghost-ai .cc-ghost { transition: none; }
      .bs-ghost-ai .reply-arrow, .bs-ghost-ai .reply-shaft, .bs-ghost-ai .reply-head { transition: none; }
    }
    /* "can be taken" dots: only chess.com's dot color token is swapped for red, so its own
       dot (static or animated: grow in, shrink out) is drawn exactly as usual */
    wc-chess-board > [data-bs-danger], chess-board > [data-bs-danger] {
      --color-transparent-black-14: rgba(220, 45, 45, 0.42) !important;
    }
    [data-bs-blunder] { visibility: hidden !important; }
    .bs-blunder-layer { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
    .bs-blunder-cross {
      position: absolute; width: 12.5%; height: 12.5%; color: rgba(220, 45, 45, .42);
      transition: color 240ms ease;
    }
    .bs-blunder-cross svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
    .bs-blunder-cross path { d: path('${hintCrossPath}'); transition: d 240ms cubic-bezier(.22, 1, .36, 1); }
    .bs-blunder-cross.bs-cross-enter, .bs-blunder-cross.bs-cross-leave { color: var(--bs-dot-color); }
    .bs-blunder-cross.bs-cross-enter path, .bs-blunder-cross.bs-cross-leave path { d: var(--bs-dot-shape); }
    @media (prefers-reduced-motion: reduce) { .bs-blunder-cross, .bs-blunder-cross path { transition: none; } }
    .bs-fallback-hints { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
    .bs-fallback-dot { position: absolute; width: 12.5%; height: 12.5%; --bs-dot: rgba(0, 0, 0, .14); }
    .bs-fallback-dot::before { content: ''; position: absolute; inset: 35%; border-radius: 50%; background: var(--bs-dot); }
    .bs-fallback-dot.bs-danger { --bs-dot: rgba(220, 45, 45, .42); }
    .bs-fallback-dot.bs-capture::before { inset: 5%; background: transparent; border: 6px solid var(--bs-dot); box-sizing: border-box; }
    .bs-duplicate {
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100000;
      max-width: min(520px, calc(100vw - 32px)); padding: 12px 16px; border-radius: 10px;
      background: rgba(30, 28, 26, .94); color: #fff; font: 600 14px/1.4 system-ui, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .4); cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  // Copies older than 5.6.6 lack the one-copy check above and keep painting their own dots
  // (gray where this one paints red). They are found by the page styles they add.
  const warnIfDuplicate = () => {
    const others = [...document.querySelectorAll('style')].filter(s => s !== style && s.textContent.includes('.bs-blunder-layer'));
    if (!others.length || document.querySelector('.bs-duplicate')) return;
    const note = document.createElement('div');
    note.className = 'bs-duplicate';
    note.textContent = 'Two copies of Board Studio are running. Open Tampermonkey, delete every Board Studio script except the loader, then refresh.';
    note.addEventListener('click', () => note.remove());
    document.body.appendChild(note);
  };
  [3000, 10000].forEach(ms => setTimeout(warnIfDuplicate, ms));

  function applySettings() {
    document.documentElement.classList.toggle('bs-arrows', settings.arrows.on);
    document.documentElement.classList.toggle('bs-marks', settings.marks.on);
    document.querySelectorAll('wc-chess-board, chess-board').forEach(b => {
      if (!b.__cc) return;
      b.__cc.syncArrows();
      b.__cc.syncMarks();
      b.__cc.paintHints();
      b.__cc.syncGhosts();
    });
  }

  // ---------- arrow geometry ----------

  // Shaft (rounded stroke from tail through the corner to the head), head (softly rounded
  // triangle) and the gradient line that fades the tail in.
  function geometry(c) {
    const w = c.width;
    const first = Math.hypot(c.cx - c.fx, c.cy - c.fy);
    const last = Math.hypot(c.tx - c.cx, c.ty - c.cy);
    if (first + last < 2) return null;
    const whole = Math.hypot(c.tx - c.fx, c.ty - c.fy) || 1;
    const d1 = first > 0.5 ? [(c.cx - c.fx) / first, (c.cy - c.fy) / first] : [(c.tx - c.fx) / whole, (c.ty - c.fy) / whole];
    const d2 = last > 0.5 ? [(c.tx - c.cx) / last, (c.ty - c.cy) / last] : d1;
    const inset = Math.min(24, first * 0.6 + 2);
    const tip = [c.tx - d2[0] * 12, c.ty - d2[1] * 12];
    const headLength = Math.min(w * 1.9, (last + first) * 0.5);
    const headHalf = w * 1.2;
    const round = w * 0.21;
    const point = [tip[0] - d2[0] * round, tip[1] - d2[1] * round];
    const base = [point[0] - d2[0] * headLength, point[1] - d2[1] * headLength];
    const tail = [c.fx + d1[0] * inset, c.fy + d1[1] * inset];
    const p = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    const shaftEnd = [base[0] + d2[0] * w * 0.3, base[1] + d2[1] * w * 0.3];
    const bend = Math.min(22, first * 0.45, Math.max(0, last - headLength) * 0.6);
    const turn = Math.abs(d1[0] * d2[1] - d1[1] * d2[0]) > 0.2 && bend > 2;
    let shaft;
    if (turn) {
      const before = [c.cx - d1[0] * bend, c.cy - d1[1] * bend];
      const after = [c.cx + d2[0] * bend, c.cy + d2[1] * bend];
      shaft = `M${p(...tail)} L${p(...before)} Q${p(c.cx, c.cy)} ${p(...after)} L${p(...shaftEnd)}`;
    } else {
      shaft = `M${p(...tail)} L${p(...shaftEnd)}`;
    }
    const n = [-d2[1], d2[0]];
    const head = `M${p(...point)} L${p(base[0] + n[0] * headHalf, base[1] + n[1] * headHalf)} L${p(base[0] - n[0] * headHalf, base[1] - n[1] * headHalf)} Z`;
    const fadeEnd = turn ? [c.cx, c.cy] : [tail[0] + (shaftEnd[0] - tail[0]) * 0.75, tail[1] + (shaftEnd[1] - tail[1]) * 0.75];
    return { shaft, head, gradient: [tail[0], tail[1], fadeEnd[0], fadeEnd[1]] };
  }

  // "rgba(255, 170, 0, 0.8)" -> { color: "rgb(255, 170, 0)", alpha: 0.8 }
  function readColor(poly) {
    const fill = poly.style.fill || getComputedStyle(poly).fill || SITE_ORANGE;
    const m = fill.match(/rgba?\(([^)]+)\)/);
    let color = fill;
    let alpha = parseFloat(poly.style.opacity || getComputedStyle(poly).opacity);
    if (m) {
      const parts = m[1].split(',').map(s => s.trim());
      color = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
      if (parts[3] !== undefined) alpha = (isNaN(alpha) ? 1 : alpha) * parseFloat(parts[3]);
    }
    return { color, alpha: isNaN(alpha) ? 0.85 : Math.min(1, alpha) };
  }

  // ---------- "can be taken" check ----------

  // board[f][r] = { c: 'w' | 'b', t: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' } or null, 0-based
  function readBoard(boardEl) {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    boardEl.querySelectorAll(':scope > .piece').forEach(el => {
      const sq = squareClass(el);
      const kind = [...el.classList].find(c => /^[wb][pnbrqk]$/.test(c));
      if (sq && kind) board[sq.f][sq.r] = { c: kind[0], t: kind[1] };
    });
    return board;
  }

  const clone = board => board.map(col => col.slice());
  const inside = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // Squares of `by` pieces that attack (f, r).
  function attackers(board, f, r, by) {
    const out = [];
    const at = (x, y, types) => {
      if (!inside(x, y)) return;
      const p = board[x][y];
      if (p && p.c === by && types.includes(p.t)) out.push({ f: x, r: y });
    };
    const pawnRank = by === 'w' ? r - 1 : r + 1;
    at(f - 1, pawnRank, 'p');
    at(f + 1, pawnRank, 'p');
    KNIGHT.forEach(([dx, dy]) => at(f + dx, r + dy, 'n'));
    KING.forEach(([dx, dy]) => at(f + dx, r + dy, 'k'));
    const slide = (dirs, types) => dirs.forEach(([dx, dy]) => {
      let x = f + dx, y = r + dy;
      while (inside(x, y)) {
        const p = board[x][y];
        if (p) { if (p.c === by && types.includes(p.t)) out.push({ f: x, r: y }); break; }
        x += dx; y += dy;
      }
    });
    slide(ROOK_DIRS, 'rq');
    slide(BISHOP_DIRS, 'bq');
    return out;
  }

  function inCheck(board, color) {
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
      const p = board[f][r];
      if (p && p.c === color && p.t === 'k') return attackers(board, f, r, color === 'w' ? 'b' : 'w').length > 0;
    }
    return false;
  }

  // Could the piece on `s` move to `t` by its movement rules (ignoring checks)?
  function reaches(board, s, t) {
    const p = board[s.f][s.r];
    const dx = t.f - s.f, dy = t.r - s.r;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (!adx && !ady) return false;
    const target = board[t.f][t.r];
    if (p.t === 'n') return (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
    // Castling dots sit two squares over or on the rook.
    if (p.t === 'k') return Math.max(adx, ady) === 1 || (dy === 0 && adx >= 2);
    if (p.t === 'p') {
      const dir = p.c === 'w' ? 1 : -1;
      if (adx === 1) return dy === dir;
      if (dx !== 0 || target) return false;
      return dy === dir || (dy === 2 * dir && s.r === (p.c === 'w' ? 1 : 6) && !board[s.f][s.r + dir]);
    }
    const straight = dx === 0 || dy === 0, diagonal = adx === ady;
    if (!((p.t === 'r' || p.t === 'q') && straight) && !((p.t === 'b' || p.t === 'q') && diagonal)) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let x = s.f + sx, y = s.r + sy; x !== t.f || y !== t.r; x += sx, y += sy) if (board[x][y]) return false;
    return true;
  }

  // After moving from -> to, can the other side legally capture the piece on `to`?
  function canBeTaken(board, from, to) {
    const piece = board[from.f][from.r];
    if (!piece || piece.t === 'k') return false;
    const us = piece.c;
    const them = us === 'w' ? 'b' : 'w';
    const after = clone(board);
    after[from.f][from.r] = null;
    if (piece.t === 'p' && from.f !== to.f && !board[to.f][to.r]) after[to.f][from.r] = null; // our en passant
    const promotes = piece.t === 'p' && to.r === (us === 'w' ? 7 : 0);
    after[to.f][to.r] = { c: us, t: promotes ? 'q' : piece.t };

    for (const a of attackers(after, to.f, to.r, them)) {
      const next = clone(after);
      next[to.f][to.r] = next[a.f][a.r];
      next[a.f][a.r] = null;
      if (!inCheck(next, them)) return true;
    }
    // A double pawn push can be taken en passant.
    if (piece.t === 'p' && Math.abs(to.r - from.r) === 2) {
      const behind = (from.r + to.r) / 2;
      for (const df of [-1, 1]) {
        const f = to.f + df;
        const p = inside(f, to.r) && after[f][to.r];
        if (!p || p.c !== them || p.t !== 'p') continue;
        const next = clone(after);
        next[f][to.r] = null;
        next[to.f][to.r] = null;
        next[to.f][behind] = p;
        if (!inCheck(next, them)) return true;
      }
    }
    return false;
  }

  // ---------- big files (downloaded on demand, not bundled) ----------

  // The opening book and Stockfish live in assets/ beside this script on GitHub. The loader
  // points ASSET_BASE at the same commit it took this script from, so versions always match.
  const ASSET_BASE = window.__boardStudioAssetBase || 'https://raw.githubusercontent.com/SketchDanylo/board-studio/main/assets/';
  const ASSETS_PINNED = /\/[0-9a-f]{40}\//.test(ASSET_BASE);

  // A file at a commit-pinned address never changes, so those stay in Cache Storage after the
  // first download. Unpinned (main) addresses can change and are always asked for.
  async function fetchAsset(name, as) {
    const url = ASSET_BASE + name;
    let cache = null;
    try { cache = ASSETS_PINNED ? await caches.open('board-studio-assets') : null; } catch (e) { /* no Cache Storage */ }
    let response = cache && await cache.match(url);
    if (!response) {
      response = await fetch(url);
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      if (cache) cache.put(url, response.clone()).catch(() => {});
    }
    return as === 'text' ? response.text() : response.arrayBuffer();
  }

  let bookText = null;
  let bookRequested = false;
  function requestBook() {
    if (bookRequested) return;
    bookRequested = true;
    fetchAsset('opening-book.txt', 'text').then(text => {
      bookText = text;
      applySettings(); // redraw so the book arrows show up
    }, e => console.warn('[Board Studio] Opening book unavailable:', e.message));
  }

  let engineFiles = null;   // { script, wasm } once downloaded
  let engineDownload = null;
  function loadEngineFiles() {
    engineDownload = engineDownload || Promise.all([fetchAsset('stockfish.js', 'text'), fetchAsset('stockfish.wasm', 'buffer')])
      .then(([script, wasm]) => (engineFiles = { script, wasm }));
    return engineDownload;
  }

  // Runs use(files) as soon as Stockfish's files are here (immediately when they already are).
  function withEngineFiles(use, onError) {
    if (engineFiles) use(engineFiles);
    else loadEngineFiles().then(use, onError);
  }

  // A Web Worker running Stockfish, built from the downloaded files. Returns { worker, urls }.
  function createEngineWorker({ script, wasm }) {
    const wasmUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
    const scriptUrl = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
    // The wasm address goes in the fragment, without a ",worker" suffix.
    return { worker: new Worker(`${scriptUrl}#${encodeURIComponent(wasmUrl)}`), urls: [wasmUrl, scriptUrl] };
  }

  // ---------- ghosts ----------

  // Every arrow moves a see-through copy of a piece: an arrow from a live piece sends a ghost of
  // it to the arrow's end; an arrow from a ghost moves that ghost on. A ghost landing on another
  // ghost takes it; landing on a live piece it just sits on top. Worked out from the arrows in
  // the order they were drawn, so ghosts come and go exactly with chess.com's own arrows.
  // ---------- opening book ----------

  // Chess Coach's opening book (sketchdanylo.github.io/chess): for each book position, the
  // moves played from it and how often. Keys are Chess Coach's hash of the position (EPD).
  const BOOK_COLOR = '#c4955f';
  let bookMap = null;

  function bookKey(epd) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < epd.length; i++) {
      const c = epd.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
    }
    return h1.toString(36) + (h2 & 0xfffff).toString(36);
  }

  function bookMoves(fen) {
    if (!fen) return [];
    if (bookText === null) { requestBook(); return []; }
    if (!bookMap) {
      bookMap = new Map();
      bookText.split(';').forEach(entry => {
        const i = entry.indexOf('=');
        bookMap.set(entry.slice(0, i), entry.slice(i + 1));
      });
    }
    // Chess Coach writes the en-passant square only when the capture is possible; try both.
    const f = fen.split(' ');
    for (const epd of [f.slice(0, 4).join(' '), [f[0], f[1], f[2], '-'].join(' ')]) {
      const record = bookMap.get(bookKey(epd));
      if (record) {
        return record.split(',').map(item => {
          const [uci, count] = item.split(':');
          return { uci, count: Number(count || 1) };
        });
      }
    }
    return [];
  }

  // Exactly Chess Coach's book arrows: every move with a real share of theory (the top three
  // always), at most ten, thicker and more solid the more often it is played.
  function bookArrows(fen) {
    const all = bookMoves(fen);
    const total = all.reduce((sum, move) => sum + move.count, 0) || 1;
    return all.filter((move, i) => i < 3 || move.count / total >= 0.012).slice(0, 10).map(move => {
      const share = Math.sqrt(move.count / total);
      return { id: `book:${move.uci}`, uci: move.uci, width: 8 + 11 * share, opacity: 0.4 + 0.48 * share };
    });
  }

  const bookAllowed = () => true;

  // Draws the book arrows for this board's position into its arrow layer, under your own arrows.
  function addBookArrows(seen) {
    if (!settings.book.on || !bookAllowed()) return;
    let fen = null;
    try { fen = this.board.game && this.board.game.getFEN(); } catch (e) { /* no game yet */ }
    bookArrows(fen).forEach(spec => {
      const m = MOVE.exec(spec.uci.slice(0, 4));
      if (!m) return;
      seen.add(spec.id);
      const target = this.arrowTarget(m, spec.opacity, spec.width);
      let arrow = this.arrows.get(spec.id);
      if (!arrow) {
        arrow = this.createArrow(spec.id);
        arrow.el.classList.add('book');
        this.overlay.insertBefore(arrow.el, this.defs.nextSibling);
        arrow.cur = { ...target, cx: target.fx, cy: target.fy, tx: target.fx, ty: target.fy, opacity: 0 };
        arrow.vel = { fx: 0, fy: 0, cx: 0, cy: 0, tx: 0, ty: 0 };
        this.arrows.set(spec.id, arrow);
      }
      arrow.target = target;
      arrow.dying = false;
      if (arrow.color !== BOOK_COLOR) {
        arrow.color = BOOK_COLOR;
        arrow.stops.forEach(st => st.setAttribute('stop-color', BOOK_COLOR));
        arrow.head.setAttribute('fill', BOOK_COLOR);
        arrow.head.setAttribute('stroke', BOOK_COLOR);
      }
    });
  }

  // Aim assist: an arrow drawn from a piece snaps to the nearest square that piece could move to
  // by its own pattern (pieces in the way don't matter). Ghosts count as the piece on their
  // square, so a line of arrows keeps aiming from where each ghost landed.
  function canReach(piece, from, to) {
    const dx = to.f - from.f, dy = to.r - from.r;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (!ax && !ay) return false;
    switch (piece.t) {
      case 'n': return (ax === 1 && ay === 2) || (ax === 2 && ay === 1);
      // From its home square a king can also castle: two files over, or onto its rook.
      case 'k': return Math.max(ax, ay) === 1 || (!dy && from.f === 4 && from.r === (piece.c === 'w' ? 0 : 7) && (ax === 2 || ax === 3 || ax === 4));
      case 'r': return !dx || !dy;
      case 'b': return ax === ay;
      case 'q': return !dx || !dy || ax === ay;
      case 'p': {
        const dir = piece.c === 'w' ? 1 : -1;
        if (ax === 1) return dy === dir;
        return !dx && (dy === dir || (dy === 2 * dir && from.r === (piece.c === 'w' ? 1 : 6)));
      }
    }
    return false;
  }
  const sqAt = name => ({ f: name.charCodeAt(0) - 97, r: +name[1] - 1 });
  const nameAt = s => String.fromCharCode(97 + s.f) + (s.r + 1);

  function aimArrows(arrows, position) {
    if (!settings.arrows.on || !settings.arrows.aim) return arrows;
    const ghosts = new Map(); // square -> piece, as the arrows so far have moved them
    return arrows.map(a => {
      if (!a.from || !a.to || a.from === a.to) return a;
      const from = sqAt(a.from);
      const piece = ghosts.get(a.from) || (position[from.f] && position[from.f][from.r]);
      if (!piece) return a;
      let to = sqAt(a.to);
      if (!canReach(piece, from, to)) {
        let best = null, bestD = Infinity;
        for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
          const s = { f, r };
          if (!canReach(piece, from, s)) continue;
          const d = (f - to.f) ** 2 + (r - to.r) ** 2;
          if (d < bestD) { bestD = d; best = s; }
        }
        if (best) to = best;
      }
      const aimed = { ...a, to: nameAt(to) };
      ghosts.delete(a.from);
      ghosts.set(aimed.to, piece);
      return aimed;
    });
  }

  // chess.com draws arrows of its own too (analysis lines, review), and they look exactly like
  // yours. Only an arrow that showed up right after one of your right-clicks counts as drawn by you,
  // so ghosts and replies never react to the site's arrows.
  let lastRightUp = -Infinity;
  window.addEventListener('pointerup', e => { if (e.button === 2) lastRightUp = performance.now(); }, true);
  function drawnByYou(ctl, list) {
    const id = a => a.id ?? a.key;
    const fresh = performance.now() - lastRightUp < 1000;
    const mine = ctl.arrowsMine || new Set(), seen = ctl.arrowsSeen || new Set();
    for (const a of list) if (!seen.has(id(a)) && fresh) mine.add(id(a));
    ctl.arrowsSeen = new Set(list.map(id));
    ctl.arrowsMine = new Set([...mine].filter(i => ctl.arrowsSeen.has(i)));
    return list.filter(a => ctl.arrowsMine.has(id(a)));
  }

  function planGhosts(arrows, position) {
    const ghosts = new Map(); // square -> { id, kind, from }
    arrows.forEach(({ from, to }) => {
      if (!from || !to || from === to) return;
      let ghost = ghosts.get(from);
      if (ghost) {
        ghosts.delete(from);
        ghost = { ...ghost, from };
      } else {
        const s = { f: from.charCodeAt(0) - 97, r: +from[1] - 1 };
        const p = position[s.f] && position[s.f][s.r];
        if (!p) return;
        ghost = { id: from + to, kind: p.c + p.t, from };
      }
      // A king stepping two files from its home square castles, so its rook comes along.
      const castle = ghost.kind[1] === 'k' && from[0] === 'e' && from[1] === to[1] && from[1] === (ghost.kind[0] === 'w' ? '1' : '8') ? ({ g: 'h', h: 'h', c: 'a', a: 'a' })[to[0]] : null;
      // Dragging the king onto its rook is also castling; the king lands on g or c.
      if (castle) to = castle === 'h' ? 'g' + to[1] : 'c' + to[1];
      ghosts.set(to, ghost);
      if (castle) {
        const rookFrom = castle + from[1], rookTo = (castle === 'h' ? 'f' : 'd') + from[1];
        const rook = ghosts.get(rookFrom);
        const live = position[castle.charCodeAt(0) - 97]?.[+from[1] - 1];
        if (rook) { ghosts.delete(rookFrom); ghosts.set(rookTo, { ...rook, from: rookFrom }); }
        else if (live && live.t === 'r' && live.c === ghost.kind[0]) ghosts.set(rookTo, { id: rookFrom + rookTo, kind: live.c + 'r', from: rookFrom });
      }
    });
    return ghosts;
  }

  const pieceImageUrl = (style, kind) => `url("https://images.chesscomfiles.com/chess-themes/pieces/${style || 'neo'}/150/${kind}.png")`;

  class GhostLayer {
    constructor(owner) {
      this.owner = owner;
      this.el = document.createElement('div');
      this.el.className = 'cc-ghosts';
      this.items = new Map(); // ghost id -> { el, square, flipped }
      this.taken = new Set(); // squares a Ghost AI reply captures on: the ghost there goes away
    }

    applyTaken(item) {
      const gone = !!item.square && this.taken.has(item.square);
      item.el.classList.toggle('cc-ghost-leave', gone);
      item.el.style.opacity = gone ? '0' : String(settings.ghosts.opacity);
    }

    take(squares) {
      this.taken = squares;
      this.items.forEach(item => this.applyTaken(item));
    }

    spot(name) {
      const s = squareXY(name.charCodeAt(0) - 96, +name[1], this.owner.flipped);
      return { left: `${s.x * 12.5}%`, top: `${s.y * 12.5}%` };
    }

    sync(arrows, position, imageFor) {
      const plan = settings.ghosts.on ? planGhosts(arrows, position) : new Map();
      const flipped = this.owner.flipped;
      const seen = new Set();
      plan.forEach((ghost, square) => {
        seen.add(ghost.id);
        let item = this.items.get(ghost.id);
        if (!item) {
          // A new ghost slides out of the square it came from.
          const el = document.createElement('div');
          el.className = 'cc-ghost';
          el.style.backgroundImage = imageFor(ghost.kind);
          const start = this.spot(ghost.from);
          el.style.left = start.left;
          el.style.top = start.top;
          el.style.opacity = '0';
          this.el.appendChild(el);
          el.getBoundingClientRect();
          item = { el, square: null, flipped };
          this.items.set(ghost.id, item);
        }
        if (item.square !== square || item.flipped !== flipped) {
          const at = this.spot(square);
          item.el.style.left = at.left;
          item.el.style.top = at.top;
          item.square = square;
          item.flipped = flipped;
        }
        this.applyTaken(item);
      });
      this.items.forEach((item, id) => {
        if (seen.has(id)) return;
        this.items.delete(id);
        item.el.classList.add('cc-ghost-leave');
        item.el.style.opacity = '0';
        setTimeout(() => item.el.remove(), 320);
      });
    }
  }

  // ---------- one board ----------

  class Controller {
    constructor(svg) {
      this.svg = svg;
      this.board = svg.closest('wc-chess-board, chess-board') || svg.parentElement;
      this.board.__cc = this;
      this.arrows = new Map();
      this.marks = new Map();   // 'e4' -> { el, color }
      this.selected = null;     // square the user last pressed, { f, r }
      this.serial = 0;
      this.raf = 0;
      this.lastTime = 0;

      this.overlay = document.createElementNS(NS, 'svg');
      this.overlay.setAttribute('class', 'cc-arrows');
      this.overlay.setAttribute('viewBox', '0 0 800 800');
      this.overlay.setAttribute('aria-hidden', 'true');
      this.defs = document.createElementNS(NS, 'defs');
      this.overlay.appendChild(this.defs);
      svg.after(this.overlay);
      svg.__cc = this.overlay;

      this.layer = document.createElement('div');
      this.layer.className = 'cc-marks';
      this.placeLayer();
      this.ghosts = new GhostLayer(this);
      this.imageCache = {};

      let queued = false;
      this.scheduleArrows = () => {
        if (queued) return;
        queued = true;
        nextFrame(() => { queued = false; this.syncArrows(); });
      };
      new MutationObserver(this.scheduleArrows).observe(svg, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['points', 'style', 'transform', 'data-arrow', 'class']
      });
      // Highlights and move dots: handled before the next paint, so nothing flashes.
      new MutationObserver(records => this.onBoardChange(records)).observe(this.board, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style']
      });
      this.syncArrows();
      this.syncMarks();
    }

    get flipped() { return this.board.classList.contains('flipped'); }

    addBookArrows(seen) { addBookArrows.call(this, seen); }

    onBoardChange(records) {
      let marks = false, hints = false, flip = false;
      for (const rec of records) {
        const t = rec.target;
        if (this.layer.contains(t) || this.overlay.contains(t) || this.ghosts.el.contains(t) || t.closest?.('.bs-blunder-layer, .bs-fallback-hints, .bs-ghost-ai')) continue;
        // Chess.com recycles its highlight elements (class and style rewritten in place), so any
        // change among the board's children may be a highlight coming or going.
        if (rec.type === 'childList') {
          if (t !== this.board) continue;
          marks = true;
          for (const n of [...rec.addedNodes, ...rec.removedNodes]) {
            if (n instanceof Element && (n.classList.contains('hint') || n.classList.contains('capture-hint'))) hints = true;
          }
        } else if (t === this.board) {
          flip = marks = hints = true;
        } else if (t.parentElement === this.board) {
          marks = true;
          // a recycled element may just have stopped being a dot, so any class change counts
          if (rec.attributeName === 'class') hints = true;
        }
      }
      if (marks) { this.syncMarks(); this.syncGhosts(); }
      if (hints) this.paintHints();
      if (flip) this.scheduleArrows();
    }

    // Marks sit under the pieces, like chess.com's own highlights.
    placeLayer() {
      if (this.layer.parentNode === this.board) return;
      const firstPiece = this.board.querySelector(':scope > .piece, :scope > .highlight');
      this.board.insertBefore(this.layer, firstPiece);
    }

    squareAt(clientX, clientY) {
      const r = this.board.getBoundingClientRect();
      const col = Math.floor((clientX - r.left) / (r.width / 8));
      const row = Math.floor((clientY - r.top) / (r.height / 8));
      if (col < 0 || col > 7 || row < 0 || row > 7) return null;
      return this.flipped ? { f: 7 - col, r: row } : { f: col, r: 7 - row };
    }

    siteHighlight(sq) {
      const els = this.board.querySelectorAll(`:scope > .highlight.square-${sq.f + 1}${sq.r + 1}`);
      for (const el of els) {
        const m = (el.getAttribute('style') || '').match(/rgba?\((\d+, \d+, \d+)/);
        if (m && USER_HIGHLIGHT.test(m[1])) return m[1];
      }
      return null;
    }

    // ---------- arrows ----------

    arrowTarget(m, alpha, width = WIDTH) {
      const flipped = this.flipped;
      const a = squareXY(m[1].charCodeAt(0) - 96, +m[2], flipped);
      const b = squareXY(m[3].charCodeAt(0) - 96, +m[4], flipped);
      const fx = (a.x + 0.5) * UNIT, fy = (a.y + 0.5) * UNIT;
      const tx = (b.x + 0.5) * UNIT, ty = (b.y + 0.5) * UNIT;
      const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
      const knight = (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
      // A knight's arrow runs along its long leg first, then turns.
      let cx = (fx + tx) / 2, cy = (fy + ty) / 2;
      if (knight) { if (dy > dx) { cx = fx; cy = ty; } else { cx = tx; cy = fy; } }
      return { fx, fy, cx, cy, tx, ty, width, opacity: alpha };
    }

    createArrow(id) {
      const grad = document.createElementNS(NS, 'linearGradient');
      grad.id = `cc-g${++this.serial}-${Math.random().toString(36).slice(2, 7)}`;
      grad.setAttribute('gradientUnits', 'userSpaceOnUse');
      const stops = [0, 1].map(o => {
        const s = document.createElementNS(NS, 'stop');
        s.setAttribute('offset', String(o));
        s.setAttribute('stop-opacity', o ? '1' : '0.15');
        grad.appendChild(s);
        return s;
      });
      this.defs.appendChild(grad);
      const el = document.createElementNS(NS, 'g');
      el.setAttribute('class', 'cc-arrow');
      const shaft = document.createElementNS(NS, 'path');
      shaft.setAttribute('class', 'shaft');
      shaft.setAttribute('stroke', `url(#${grad.id})`);
      const head = document.createElementNS(NS, 'path');
      head.setAttribute('class', 'head');
      el.append(shaft, head);
      this.overlay.appendChild(el);
      return { id, el, shaft, head, grad, stops };
    }

    // chess.com's arrows in drawing order, with aim assist applied: { id, from, to }
    aimedArrows() {
      const list = [...this.svg.querySelectorAll('polygon.arrow')].map(p => {
        const m = MOVE.exec(p.getAttribute('data-arrow') || '');
        return m ? { id: m[0], from: m[1] + m[2], to: m[3] + m[4] } : null;
      }).filter(Boolean);
      return aimArrows(list, readBoard(this.board));
    }

    syncArrows() {
      const seen = new Set();
      const aimed = new Map(this.aimedArrows().map(a => [a.id, a.to]));
      const inputs = [...this.svg.querySelectorAll('polygon.arrow')].map(p => {
        const m = MOVE.exec(p.getAttribute('data-arrow') || '');
        return m && { id: m[0], from: m[1] + m[2], to: settings.arrows.on ? aimed.get(m[0]) || m[3] + m[4] : m[3] + m[4] };
      }).filter(Boolean);
      const grades = arrowEval.sync(this, inputs);
      this.svg.querySelectorAll('polygon.arrow').forEach(poly => {
        let m = MOVE.exec(poly.getAttribute('data-arrow') || '');
        const base = arrowEval.nativeColor(poly);
        const grade = m && grades.get(m[0]);
        arrowEval.paintNative(poly, !settings.arrows.on ? grade : null);
        if (!settings.arrows.on) { poly.removeAttribute('data-cc'); return; }
        if (!m || (m[1] === m[3] && m[2] === m[4])) return;
        poly.setAttribute('data-cc', '1');
        const id = m[0];
        if (seen.has(id)) return;
        seen.add(id);
        let { color, alpha } = base;
        // Your picked color replaces chess.com's plain orange; shift/ctrl/alt arrows keep theirs.
        if (color === SITE_ORANGE) ({ rgb: color, a: alpha } = splitColor(settings.arrows.color));
        if (grade) color = ARROW_GRADES[grade].color;
        const to = aimed.get(id);
        if (to && to !== m[3] + m[4]) m = MOVE.exec(m[1] + m[2] + to);
        const target = this.arrowTarget(m, alpha);
        let arrow = this.arrows.get(id);
        if (!arrow) {
          arrow = this.createArrow(id);
          // New arrows grow out of their origin square.
          arrow.cur = { ...target, cx: target.fx, cy: target.fy, tx: target.fx, ty: target.fy, opacity: 0 };
          arrow.vel = { fx: 0, fy: 0, cx: 0, cy: 0, tx: 0, ty: 0 };
          this.arrows.set(id, arrow);
        }
        arrow.target = target;
        arrow.dying = false;
        arrowEval.label(arrow.el, grade);
        if (arrow.color !== color) {
          arrow.color = color;
          arrow.stops.forEach(s => s.setAttribute('stop-color', color));
          arrow.head.setAttribute('fill', color);
          arrow.head.setAttribute('stroke', color);
        }
      });
      this.addBookArrows(seen);
      this.arrows.forEach(arrow => {
        if (!seen.has(arrow.id) && !arrow.dying) {
          arrow.dying = true;
          arrow.target = { ...arrow.target, opacity: 0 };
        }
      });
      if (this.arrows.size) this.kick();
      this.syncGhosts();
    }

    // Ghosts sit above the pieces and under the arrows.
    syncGhosts() {
      if (!this.ghosts) return;
      if (this.ghosts.el.parentNode !== this.board || this.ghosts.el.nextSibling !== this.svg) this.svg.before(this.ghosts.el);
      const drawn = drawnByYou(this, this.aimedArrows());
      ghostAI.sync(this, kind => this.imageFor(kind));
      // With the Ghost AI on, the ghosts follow the whole line, the opponent's assumed moves too.
      this.ghosts.sync(this.assumedLine || drawn, readBoard(this.board), kind => this.imageFor(kind));
    }

    // The exact piece image the board shows, so ghosts match the piece set.
    imageFor(kind) {
      if (this.imageCache[kind]) return this.imageCache[kind];
      const live = this.board.querySelector(`:scope > .piece.${kind}`);
      const img = live && getComputedStyle(live).backgroundImage;
      if (img && img !== 'none') return (this.imageCache[kind] = img);
      const style = this.board.game && this.board.game.getOptions && this.board.game.getOptions().pieceStyle;
      return pieceImageUrl(style, kind);
    }

    renderArrow(arrow) {
      const g = geometry(arrow.cur);
      if (!g) { arrow.shaft.setAttribute('d', ''); arrow.head.setAttribute('d', ''); return; }
      arrow.shaft.setAttribute('d', g.shaft);
      arrow.shaft.setAttribute('stroke-width', arrow.cur.width.toFixed(2));
      arrow.head.setAttribute('d', g.head);
      arrow.head.setAttribute('stroke-width', (arrow.cur.width * 0.42).toFixed(2));
      ['x1', 'y1', 'x2', 'y2'].forEach((k, i) => arrow.grad.setAttribute(k, g.gradient[i].toFixed(1)));
      arrow.el.style.opacity = arrow.cur.opacity.toFixed(3);
    }

    kick() {
      if (!this.raf) this.raf = requestAnimationFrame(t => this.step(t));
      // A tab that stops painting never fires the next frame; settle the arrows anyway.
      clearTimeout(this.fallback);
      this.fallback = setTimeout(() => {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.lastTime = 0;
        for (const arrow of [...this.arrows.values()]) {
          Object.assign(arrow.cur, arrow.target);
          if (arrow.dying) { this.dropArrow(arrow); continue; }
          this.renderArrow(arrow);
        }
      }, 400);
    }

    dropArrow(arrow) {
      arrow.el.remove();
      arrow.grad.remove();
      this.arrows.delete(arrow.id);
    }

    // Spring physics on the tail, corner and tip; width and opacity ease.
    step(time) {
      const dt = Math.min(0.034, this.lastTime ? (time - this.lastTime) / 1000 : 0.016);
      this.lastTime = time;
      let moving = false;
      const stiffness = 210;
      const damping = 26;
      for (const arrow of [...this.arrows.values()]) {
        const cur = arrow.cur;
        const target = arrow.target;
        for (const key of ['fx', 'fy', 'cx', 'cy', 'tx', 'ty']) {
          const force = (target[key] - cur[key]) * stiffness - arrow.vel[key] * damping;
          arrow.vel[key] += force * dt;
          cur[key] += arrow.vel[key] * dt;
          if (Math.abs(target[key] - cur[key]) > 0.1 || Math.abs(arrow.vel[key]) > 0.1) moving = true;
          else { cur[key] = target[key]; arrow.vel[key] = 0; }
        }
        cur.width += (target.width - cur.width) * Math.min(1, dt * 14);
        cur.opacity += (target.opacity - cur.opacity) * Math.min(1, dt * 10);
        if (Math.abs(target.width - cur.width) > 0.05 || Math.abs(target.opacity - cur.opacity) > 0.005) moving = true;
        if (arrow.dying && cur.opacity < 0.01) { this.dropArrow(arrow); continue; }
        this.renderArrow(arrow);
      }
      if (moving) {
        this.raf = requestAnimationFrame(t => this.step(t));
        this.kick();
      } else {
        this.raf = 0;
        this.lastTime = 0;
        clearTimeout(this.fallback);
      }
    }

    // ---------- square marks ----------

    // Our marks are a drawing of chess.com's own highlights: green and red become your two
    // colors, so left click clears them and stepping back through moves brings them back.
    syncMarks() {
      this.placeLayer();
      const want = new Map();
      if (settings.marks.on) {
        this.board.querySelectorAll(':scope > .highlight').forEach(el => {
          const sq = squareClass(el);
          const m = (el.getAttribute('style') || '').match(/rgba?\((\d+, \d+, \d+)/);
          if (!sq || !m || !USER_HIGHLIGHT.test(m[1])) return;
          const color = m[1] === SITE_GREEN ? settings.marks.c1 : m[1] === SITE_RED ? settings.marks.c2 : `rgb(${m[1]})`;
          want.set(sqName(sq), color);
        });
      }
      for (const [name, mark] of [...this.marks]) {
        if (want.has(name)) continue;
        this.marks.delete(name);
        mark.el.classList.add('cc-leave');
        setTimeout(() => mark.el.remove(), 260);
      }
      for (const [name, color] of want) {
        const s = squareXY(name.charCodeAt(0) - 96, +name[1], this.flipped);
        const left = `${s.x * 12.5}%`, top = `${s.y * 12.5}%`;
        let mark = this.marks.get(name);
        if (!mark) {
          const el = document.createElement('div');
          el.className = 'cc-mark cc-enter';
          el.style.left = left;
          el.style.top = top;
          mark = { el, color: null };
          this.marks.set(name, mark);
          this.layer.appendChild(el);
          el.getBoundingClientRect(); // commit the small, transparent start so the pop-in transitions
          nextFrame(() => el.classList.remove('cc-enter'));
        } else if (mark.color !== color) {
          // Changing color gives the tile a little bump.
          mark.el.classList.add('cc-bump');
          setTimeout(() => mark.el.classList.remove('cc-bump'), 140);
        }
        if (mark.color !== color) {
          mark.color = color;
          mark.el.style.setProperty('--cc-mark', color);
        }
        if (mark.el.style.left !== left) mark.el.style.left = left;
        if (mark.el.style.top !== top) mark.el.style.top = top;
      }
    }

    // ---------- red move dots ----------

    // Dangerous dots get a data attribute that turns chess.com's dot color red (see the
    // page styles); everything else about the dot stays chess.com's.
    paintHints() {
      // Animated dots linger while they shrink away; they keep whatever color they had.
      const leaving = el => !!el.querySelector('.removing');
      const hints = [...this.board.querySelectorAll(':scope > .hint, :scope > .capture-hint')].filter(el => !leaving(el));
      const targets = hints.map(squareClass);
      const board = hints.length && settings.danger.on ? (settings.danger.blunders ? blunderPosition(this.board) : readBoard(this.board)) : null;
      const from = board && this.movingPiece(board, targets);
      blunderHints.sync(this, from, targets.filter(Boolean));
      hints.forEach((el, i) => {
        const to = targets[i];
        if (to && blunderHints.covers(this, sqName(to))) el.dataset.bsBlunder = '1';
        else if (el.dataset.bsBlunder) delete el.dataset.bsBlunder;
        // Retain the dot's color for when the cross morphs back.
        if (from && to && canBeTaken(board, from, to)) {
          if (el.dataset.bsDanger !== '1') el.dataset.bsDanger = '1';
        } else if (el.dataset.bsDanger) {
          delete el.dataset.bsDanger;
        }
      });
      // Recycled elements that stopped being move dots get theirs back.
      this.board.querySelectorAll(':scope > [data-bs-danger]').forEach(el => {
        if (!el.classList.contains('hint') && !el.classList.contains('capture-hint')) delete el.dataset.bsDanger;
      });
      this.board.querySelectorAll(':scope > [data-bs-blunder]').forEach(el => {
        if ((!el.classList.contains('hint') && !el.classList.contains('capture-hint')) || !settings.danger.on || !settings.danger.blunders) delete el.dataset.bsBlunder;
      });
    }

    // Which piece are these dots for? The square the user pressed is the first guess, but
    // chess.com can draw the dots before we hear about the press, so check that the piece
    // can actually reach every dot, and otherwise look at the highlighted squares, then all.
    movingPiece(board, targets) {
      const fits = s => {
        const p = s && board[s.f][s.r];
        return p && targets.every(t => t && reaches(board, s, t));
      };
      if (fits(this.selected)) return this.selected;
      // The selected piece's square is one of chess.com's (yellow) highlights.
      const lit = [...this.board.querySelectorAll(':scope > .highlight')].map(squareClass).filter(fits);
      if (lit.length) return lit[0];
      const all = [];
      for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if (fits({ f, r })) all.push({ f, r });
      return all.length === 1 ? all[0] : null;
    }
  }

  // ---------- canvas boards ----------

  // With the Arcade / Natural animation types (and real-3D pieces) chess.com draws the whole
  // board on one WebGL <canvas>, so there are no elements to restyle. Instead we sit between
  // chess.com and its renderer (board.game.getRenderer()): every arrow, highlight and move dot
  // passes through these calls, and we change what gets drawn.

  const sqOf = name => ({ f: name.charCodeAt(0) - 97, r: +name[1] - 1 });
  const DANGER_TINT = 0xff4a42;

  // Runs fn while catching every chess.com sprite it creates: their sprite class sets its own
  // `isDestroyed` in the constructor, and a setter on Object.prototype sees that assignment.
  function catchingSprites(fn) {
    const caught = [];
    Object.defineProperty(Object.prototype, 'isDestroyed', {
      configurable: true,
      get() { return undefined; },
      set(v) {
        Object.defineProperty(this, 'isDestroyed', { value: v, writable: true, configurable: true, enumerable: true });
        caught.push(this);
      }
    });
    try {
      return { result: fn(), caught };
    } finally {
      delete Object.prototype.isDestroyed;
    }
  }

  class CanvasController {
    constructor(board) {
      this.board = board;
      this.renderer = board.game.getRenderer();
      board.__cc = this;
      this.arrows = new Map();
      this.serial = 0;
      this.raf = 0;
      this.lastTime = 0;
      this.selected = null;
      this.nativeArrows = new Map(); // key -> item: what chess.com wants drawn
      this.shownArrows = new Map();  // key -> item: what the canvas actually draws
      this.nativeMarks = new Map();
      this.shownMarks = new Map();
      this.hintSprites = [];         // { sprite, danger } for the dots on screen
      this.ctx = null;
      this.ghosts = new GhostLayer(this);
      let queued = false;
      this.scheduleArrows = () => {
        if (queued) return;
        queued = true;
        nextFrame(() => { queued = false; this.syncArrows(); });
      };

      this.overlay = document.createElementNS(NS, 'svg');
      this.overlay.setAttribute('class', 'cc-arrows bs-canvas');
      this.overlay.setAttribute('viewBox', '0 0 800 800');
      this.overlay.setAttribute('aria-hidden', 'true');
      this.defs = document.createElementNS(NS, 'defs');
      this.overlay.appendChild(this.defs);
      board.querySelectorAll(':scope > .cc-marks').forEach(el => el.remove());
      this.place();
      this.hook();
    }

    place() {
      if (this.overlay.parentNode !== this.board || this.overlay.nextSibling) this.board.appendChild(this.overlay);
      if (this.ghosts && this.ghosts.el.nextSibling !== this.overlay) this.board.insertBefore(this.ghosts.el, this.overlay);
    }

    // The renderer knows where squares are, flipped or not.
    get flipped() {
      const a1 = this.renderer.getCoordsFromSquare('a1');
      const h8 = this.renderer.getCoordsFromSquare('h8');
      return a1.x > h8.x;
    }

    squareAt(clientX, clientY) {
      return Controller.prototype.squareAt.call(this, clientX, clientY);
    }

    siteHighlight(sq) {
      const item = this.nativeMarks.get(`analysis|${sqName(sq)}`);
      return item ? item.data.color : null;
    }

    hook() {
      const r = this.renderer;
      const self = this;
      const orig = {};
      ['addArrows', 'removeArrows', 'addHighlights', 'removeHighlights', 'addMoveHints', 'addCaptureHints', 'removeHints']
        .forEach(k => { orig[k] = r[k]; });
      this.orig = orig;

      r.addArrows = function (items, ctx) {
        self.ctx = ctx;
        items.forEach(i => self.nativeArrows.set(i.key, i));
        self.syncArrows();
      };
      r.removeArrows = function (items, ctx) {
        self.ctx = ctx;
        items.forEach(i => self.nativeArrows.delete(i.key));
        self.syncArrows();
      };
      // Only your right-click squares ("analysis") are ours; selection and last move pass through.
      const split = items => [items.filter(i => i.data && i.data.type === 'analysis'), items.filter(i => !(i.data && i.data.type === 'analysis'))];
      r.addHighlights = function (items, ctx) {
        self.ctx = ctx;
        const [mine, rest] = split(items);
        mine.forEach(i => self.nativeMarks.set(i.key, i));
        const out = orig.addHighlights.call(this, rest, ctx);
        if (mine.length) self.syncMarks();
        return out;
      };
      r.removeHighlights = function (items, ctx) {
        self.ctx = ctx;
        const [mine, rest] = split(items);
        mine.forEach(i => self.nativeMarks.delete(i.key));
        const out = orig.removeHighlights.call(this, rest, ctx);
        if (mine.length) self.syncMarks();
        return out;
      };
      ['addMoveHints', 'addCaptureHints'].forEach(k => {
        r[k] = function (squares, from, ctx) {
          const danger = self.dangerSquares(squares, from);
          const { result, caught } = catchingSprites(() => orig[k].call(this, squares, from, ctx));
          // Match each new dot sprite to its square by position.
          const spots = new Map(squares.map(s => {
            const c = r.getCoordsFromSquare(s);
            return [`${Math.round(c.x)},${Math.round(c.y)}`, s];
          }));
          caught.forEach(sprite => {
            const s = spots.get(`${Math.round(sprite.x)},${Math.round(sprite.y)}`);
            if (!s) return;
            self.hintSprites.push({ sprite, square: s, from, danger: danger.has(s) });
          });
          self.paintHints();
          return result;
        };
      });
      r.removeHints = function (squares, ...rest) {
        // These dots play their hide animation (still tinted) and destroy themselves.
        const going = new Set(Array.isArray(squares) ? squares : []);
        self.hintSprites = self.hintSprites.filter(h => Array.isArray(squares) && !going.has(h.square) && !h.sprite._destroyed);
        const result = orig.removeHints.call(this, squares, ...rest);
        self.paintHints();
        return result;
      };
    }

    readPosition() {
      const board = Array.from({ length: 8 }, () => Array(8).fill(null));
      const pieces = this.renderer.getPieces() || {};
      Object.entries(pieces).forEach(([name, p]) => {
        if (!/^[a-h][1-8]$/.test(name) || !p) return;
        const s = sqOf(name);
        const c = p.color === 1 || p.color === 'w' || p.color === 'white' ? 'w' : 'b';
        board[s.f][s.r] = { c, t: String(p.type).toLowerCase() };
      });
      return board;
    }

    dangerSquares(squares, from) {
      const out = new Set();
      if (!settings.danger.on || !from) return out;
      const board = this.readPosition();
      const f = sqOf(from);
      if (!board[f.f][f.r]) return out;
      squares.forEach(s => { if (canBeTaken(board, f, sqOf(s))) out.add(s); });
      return out;
    }

    // Tint is kept by the sprite through every texture swap (grow, hover, shrink), so the
    // dot animates exactly as chess.com made it, only red.
    paintHints() {
      this.hintSprites = this.hintSprites.filter(h => !h.sprite._destroyed);
      const from = this.hintSprites.find(h => h.from)?.from;
      blunderHints.sync(this, from ? sqOf(from) : null, this.hintSprites.map(h => sqOf(h.square)));
      this.hintSprites.forEach(h => {
        if (h.sprite._destroyed) return;
        h.sprite.tint = h.danger && settings.danger.on ? DANGER_TINT : 0xffffff;
        if (blunderHints.covers(this, h.square)) {
          if (!Object.prototype.hasOwnProperty.call(h, 'bsRenderable')) h.bsRenderable = h.sprite.renderable;
          h.sprite.renderable = false;
        } else if (Object.prototype.hasOwnProperty.call(h, 'bsRenderable')) {
          h.sprite.renderable = h.bsRenderable;
          delete h.bsRenderable;
        }
      });
    }

    // What the canvas should draw: nothing while ours are on, chess.com's own otherwise.
    syncArrows() {
      const aimed = new Map(this.aimedArrows().map(a => [a.key, a.to]));
      const inputs = [...this.nativeArrows.values()].map(i => ({ id: i.key, from: i.data?.from, to: settings.arrows.on ? aimed.get(i.key) || i.data?.to : i.data?.to }));
      const grades = arrowEval.sync(this, inputs);
      const colors = arrowEval.canvasColors.get(this);
      if (colors) for (const key of colors.keys()) if (!this.nativeArrows.has(key)) colors.delete(key);
      const want = new Map();
      if (!settings.arrows.on) this.nativeArrows.forEach((item, key) => {
        const color = arrowEval.canvasColor(this, key, item.data?.color || SITE_ORANGE, grades.get(key));
        want.set(key, color ? { ...item, data: { ...item.data, color } } : item);
      });
      const same = (a, b) => a?.data?.color === b?.data?.color && a?.data?.opacity === b?.data?.opacity;
      const gone = [...this.shownArrows.values()].filter(i => !want.has(i.key) || !same(i, want.get(i.key)));
      const added = [...want.values()].filter(i => !this.shownArrows.has(i.key) || !same(i, this.shownArrows.get(i.key)));
      if (gone.length) { this.orig.removeArrows.call(this.renderer, gone, this.ctx); gone.forEach(i => this.shownArrows.delete(i.key)); }
      if (added.length) { this.orig.addArrows.call(this.renderer, added, this.ctx); added.forEach(i => this.shownArrows.set(i.key, i)); }

      const seen = new Set();
      if (settings.arrows.on) {
        this.place();
        this.nativeArrows.forEach(item => {
          const d = item.data || {};
          const m = MOVE.exec(`${d.from}${aimed.get(item.key) || d.to}`);
          if (!m || d.from === d.to) return;
          const id = m[0];
          seen.add(id);
          const rgba = String(d.color || SITE_ORANGE).match(/rgba?\(([^)]+)\)/);
          let color = d.color || SITE_ORANGE;
          let alpha = d.opacity ?? 0.8;
          if (rgba) {
            const p = rgba[1].split(',').map(x => x.trim());
            color = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
          }
          if (color === SITE_ORANGE) ({ rgb: color, a: alpha } = splitColor(settings.arrows.color));
          const grade = grades.get(item.key);
          if (grade) color = ARROW_GRADES[grade].color;
          const target = this.arrowTarget(m, Math.min(1, alpha));
          let arrow = this.arrows.get(id);
          if (!arrow) {
            arrow = this.createArrow(id);
            arrow.cur = { ...target, cx: target.fx, cy: target.fy, tx: target.fx, ty: target.fy, opacity: 0 };
            arrow.vel = { fx: 0, fy: 0, cx: 0, cy: 0, tx: 0, ty: 0 };
            this.arrows.set(id, arrow);
          }
          arrow.target = target;
          arrow.dying = false;
          arrowEval.label(arrow.el, grade);
          if (arrow.color !== color) {
            arrow.color = color;
            arrow.stops.forEach(s => s.setAttribute('stop-color', color));
            arrow.head.setAttribute('fill', color);
            arrow.head.setAttribute('stroke', color);
          }
        });
      }
      if (settings.book.on) this.place();
      addBookArrows.call(this, seen);
      this.arrows.forEach(arrow => {
        if (!seen.has(arrow.id) && !arrow.dying) {
          arrow.dying = true;
          arrow.target = { ...arrow.target, opacity: 0 };
        }
      });
      if (this.arrows.size) this.kick();
      this.syncGhosts();
    }

    aimedArrows() {
      const list = [...this.nativeArrows.values()].map(i => ({ key: i.key, from: i.data && i.data.from, to: i.data && i.data.to }));
      return aimArrows(list, this.readPosition());
    }

    syncGhosts() {
      if (!this.ghosts) return;
      this.place();
      const arrows = drawnByYou(this, this.aimedArrows());
      const style = this.board.game.getOptions().pieceStyle;
      ghostAI.sync(this, kind => pieceImageUrl(style, kind));
      this.ghosts.sync(this.assumedLine || arrows, this.readPosition(), kind => pieceImageUrl(style, kind));
    }

    // Your two square colors replace chess.com's green and red; the canvas draws them under
    // the pieces as usual.
    syncMarks() {
      const want = new Map();
      this.nativeMarks.forEach((item, key) => {
        let data = item.data;
        if (settings.marks.on) {
          const c = String(data.color).toLowerCase();
          const pick = c === '#acce59' ? settings.marks.c1 : c === '#eb6150' ? settings.marks.c2 : null;
          if (pick) { const { rgb, a } = splitColor(pick); data = { ...data, color: rgb, opacity: a }; }
        }
        want.set(key, data === item.data ? item : { ...item, data });
      });
      const same = (a, b) => a.data.color === b.data.color && a.data.opacity === b.data.opacity;
      const gone = [...this.shownMarks.values()].filter(i => !want.has(i.key) || !same(want.get(i.key), i));
      const added = [...want.values()].filter(i => !this.shownMarks.has(i.key) || !same(this.shownMarks.get(i.key), i));
      if (gone.length) { this.orig.removeHighlights.call(this.renderer, gone, this.ctx); gone.forEach(i => this.shownMarks.delete(i.key)); }
      if (added.length) { this.orig.addHighlights.call(this.renderer, added, this.ctx); added.forEach(i => this.shownMarks.set(i.key, i)); }
    }
  }
  ['arrowTarget', 'createArrow', 'renderArrow', 'kick', 'dropArrow', 'step'].forEach(k => {
    CanvasController.prototype[k] = Controller.prototype[k];
  });

  // ---------- pointer handling ----------

  let synthetic = false;
  let down = null;

  const controllerFor = e => {
    const board = e.target instanceof Element && e.target.closest('wc-chess-board, chess-board');
    return board && board.__cc;
  };

  window.addEventListener('pointerdown', e => {
    if (synthetic) return;
    const ctl = controllerFor(e);
    if (!ctl) { down = null; return; }
    const sq = ctl.squareAt(e.clientX, e.clientY);
    if (e.button === 0) {
      ctl.selected = sq;
      setTimeout(() => ctl.paintHints(), 0); // in case chess.com drew the dots before this ran
    }
    down = e.button === 2 ? { ctl, sq } : null;
  }, true);

  // A plain right-click on an empty square becomes chess.com's shift + right-click (green).
  // On green, a plain click turns it red; on red it clears: chess.com does those two itself.
  window.addEventListener('pointerup', e => {
    if (synthetic || e.button !== 2 || !down) return;
    const { ctl, sq } = down;
    down = null;
    if (!settings.marks.on || !sq || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const up = ctl.squareAt(e.clientX, e.clientY);
    if (!up || up.f !== sq.f || up.r !== sq.r || ctl.siteHighlight(sq)) return;
    e.stopImmediatePropagation();
    const copy = new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, composed: true, view: window,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      button: 2, buttons: e.buttons, pointerId: e.pointerId, pointerType: e.pointerType,
      isPrimary: e.isPrimary, shiftKey: true
    });
    synthetic = true;
    try { e.target.dispatchEvent(copy); } finally { synthetic = false; }
  }, true);

  // ---------- custom style (chess.com's sidebar and its menus) ----------

  const SIDEBAR_CSS = `
    html.bs-style #sidebar-main-menu {
      background: linear-gradient(180deg, rgba(46, 44, 41, .58), rgba(20, 19, 17, .54)) !important;
      backdrop-filter: blur(22px) saturate(165%); -webkit-backdrop-filter: blur(22px) saturate(165%);
      border-right: 1px solid rgba(255, 255, 255, .07);
      box-shadow: 10px 0 34px rgba(0, 0, 0, .22), inset -1px 0 0 rgba(255, 255, 255, .03);
    }
    html.bs-style #sidebar-main-menu .sidebar-link {
      position: relative; overflow: hidden; border-radius: 12px !important;
      transition: background-color 240ms ease, color 200ms ease, transform 380ms cubic-bezier(.34, 1.5, .64, 1) !important;
    }
    html.bs-style #sidebar-main-menu .sidebar-link::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; transform: translateX(-130%);
      background: linear-gradient(100deg, transparent 25%, rgba(255, 255, 255, .13) 50%, transparent 75%);
    }
    #sidebar-main-menu .sidebar-link.bs-open { background: rgba(255, 255, 255, .08) !important; }
    html.bs-style #sidebar-main-menu .sidebar-link.bs-open,
    html.bs-style #sidebar-main-menu .sidebar-link:hover {
      background: rgba(255, 255, 255, .085) !important; color: #fff !important; transform: translateX(3px);
    }
    html.bs-style #sidebar-main-menu .sidebar-link:hover::after { animation: bs-sheen 720ms ease; }
    html.bs-style #sidebar-main-menu .sidebar-link .sidebar-link-icon,
    html.bs-style #sidebar-main-menu .sidebar-link > img { transition: transform 420ms cubic-bezier(.34, 1.8, .64, 1); }
    html.bs-style #sidebar-main-menu .sidebar-link:hover .sidebar-link-icon,
    html.bs-style #sidebar-main-menu .sidebar-link:hover > img { transform: scale(1.14) rotate(-7deg); }
    @keyframes bs-sheen { to { transform: translateX(130%); } }

    /* the bar's items flow in, one after another, when the bar shows up */
    html.bs-style.bs-flow #sidebar-main-menu .bs-flow-item {
      animation: bs-flow-in 560ms cubic-bezier(.22, 1, .36, 1) backwards;
      animation-delay: calc(var(--bs-i, 0) * 42ms);
    }
    @keyframes bs-flow-in { from { opacity: 0; transform: translateX(-18px); filter: blur(5px); } }

    /* the menus flow out of the bar */
    html.bs-style .sidebar-sub-menu-container {
      background: linear-gradient(160deg, rgba(48, 46, 43, .7), rgba(22, 21, 19, .66)) !important;
      backdrop-filter: blur(24px) saturate(170%); -webkit-backdrop-filter: blur(24px) saturate(170%);
      border: 1px solid rgba(255, 255, 255, .09); border-left: 0;
      border-radius: 0 18px 18px 0 !important;
      box-shadow: 18px 22px 60px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 255, 255, .07) !important;
      transform-origin: left center;
      animation: bs-sub-in 380ms cubic-bezier(.22, 1.1, .36, 1);
    }
    @keyframes bs-sub-in {
      from { opacity: 0; transform: translateX(-14px); clip-path: inset(0 100% 0 0 round 0 18px 18px 0); }
      to { opacity: 1; transform: none; clip-path: inset(0 0 0 0 round 0 18px 18px 0); }
    }
    html.bs-style .sidebar-sub-menu-container .bs-flow-item {
      animation: bs-flow-in 460ms cubic-bezier(.22, 1, .36, 1) backwards;
      animation-delay: calc(70ms + var(--bs-i, 0) * 32ms);
    }
    html.bs-style .sidebar-sub-menu-container .sub-menu-link-container {
      border-radius: 12px !important;
      transition: background-color 220ms ease, transform 360ms cubic-bezier(.34, 1.5, .64, 1) !important;
    }
    html.bs-style .sidebar-sub-menu-container .sub-menu-link-container:hover {
      background: rgba(255, 255, 255, .085) !important; transform: translateX(4px);
    }
    html.bs-style .sidebar-sub-menu-container .sub-menu-link-container img {
      transition: transform 420ms cubic-bezier(.34, 1.8, .64, 1);
    }
    html.bs-style .sidebar-sub-menu-container .sub-menu-link-container:hover img { transform: scale(1.14) rotate(-7deg); }
    html.bs-style .sidebar-sub-menu-container .sub-menu-header-divider { border-color: rgba(255, 255, 255, .08) !important; }
  `;
  const sidebarStyle = document.createElement('style');
  sidebarStyle.textContent = SIDEBAR_CSS;
  document.head.appendChild(sidebarStyle);

  let flowTimer = 0;
  function playFlow() {
    const root = document.documentElement;
    root.classList.remove('bs-flow');
    void root.offsetWidth;
    root.classList.add('bs-flow');
    clearTimeout(flowTimer);
    flowTimer = setTimeout(() => root.classList.remove('bs-flow'), 1800);
  }

  let styleWasOn = null;
  function applyStyle() {
    document.documentElement.classList.toggle('bs-style', settings.style.on);
    if (settings.style.on && styleWasOn === false) playFlow();
    styleWasOn = settings.style.on;
  }
  listeners.add(applyStyle);

  // Number the bar's items (and a menu's links when it opens) so they flow in one by one.
  function numberItems(items) {
    items.forEach((el, i) => {
      el.classList.add('bs-flow-item');
      if (el.style.getPropertyValue('--bs-i') !== String(i)) el.style.setProperty('--bs-i', String(i));
    });
  }
  let navSeen = null;
  let navWasVisible = false;
  function watchSidebar() {
    const nav = document.getElementById('sidebar-main-menu');
    if (!nav) return;
    numberItems([...nav.querySelectorAll(':scope > a.sidebar-link, .sidebar-pinned-tabs-wrapper > div > [data-pin], :scope > .sidebar-footer-links, :scope > .sidebar-desktop-navbar-search, :scope > .sidebar-footer-auth-buttons')]);
    const visible = nav.getBoundingClientRect().width > 0 && getComputedStyle(nav).visibility !== 'hidden';
    if (visible && !navWasVisible && settings.style.on) playFlow();
    navWasVisible = visible;
    if (navSeen === nav) return;
    navSeen = nav;
    new MutationObserver(records => {
      for (const rec of records) {
        rec.addedNodes.forEach(n => {
          if (!(n instanceof Element)) return;
          const menu = n.matches('.sidebar-sub-menu-container') ? n : n.querySelector('.sidebar-sub-menu-container');
          if (menu) numberItems([...menu.querySelectorAll('.sidebar-sub-menu-menu-header, .sub-menu-link-container')]);
        });
      }
    }).observe(nav, { childList: true, subtree: true });
  }

  // ---------- settings panel ----------

  // A palette with a brush: the "Styles" item.
  const ICON = id => `<svg class="bs-nav-icon cc-icon-img cc-icon-size-24 cc-button-icon sidebar-link-icon" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fd6a0"/><stop offset="1" stop-color="#b794ff"/></linearGradient></defs>
    <path d="M11.5 2.5C6.2 2.5 2.2 6.4 2.2 11.4c0 5 4 9.1 8.9 9.1 1.5 0 2.4-.9 2.4-2.1 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.7 1.8-1.7h2.2c2.8 0 5.2-2.3 5.2-5.1C21.7 5.7 17.2 2.5 11.5 2.5z" fill="url(#${id})"/>
    <circle cx="7.2" cy="11.2" r="1.5" fill="#1f1e1c" opacity=".55"/>
    <circle cx="9.6" cy="7" r="1.5" fill="#1f1e1c" opacity=".55"/>
    <circle cx="14.4" cy="6.6" r="1.5" fill="#1f1e1c" opacity=".55"/>
    <path d="M22.6 14.6l-5.4 5.4c-.5.5-1.2.6-1.7.3l1.6-1.7-.3-.3 5.1-5.2c.6.2.9.9.7 1.5z" fill="#fff"/>
  </svg>`;

  // A chessboard as the transparency backdrop.
  const CHECKER = 'repeating-conic-gradient(#ebecd0 0 25%, #739552 0 50%) 0 0 / 12px 12px';

  // The panel is built like one of chess.com's sidebar menus: flush against the bar at the
  // item, 300px wide, plain rows with a 24px icon and a 14px label. With the custom style on it
  // gets exactly the glass, timing and animations of the restyled menus; with it off it looks
  // like chess.com's own dark menus.
  const PANEL_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .panel {
      display: none; position: fixed; z-index: 2147483000; width: 300px; max-height: calc(100vh - 16px);
      overflow: auto; padding: 8px; border-radius: 0 5px 5px 0;
      background: rgb(38, 36, 33);
      color: rgba(255, 255, 255, .85);
      font: 14px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Helvetica, Arial, sans-serif;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent;
    }
    .panel.open { display: block; }
    .panel { transition: top 320ms cubic-bezier(.22, 1, .36, 1); }
    :host(.styled) .panel {
      background: linear-gradient(160deg, rgba(48, 46, 43, .7), rgba(22, 21, 19, .66));
      backdrop-filter: blur(24px) saturate(170%); -webkit-backdrop-filter: blur(24px) saturate(170%);
      border: 1px solid rgba(255, 255, 255, .09); border-left: 0; border-radius: 0 18px 18px 0;
      box-shadow: 18px 22px 60px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 255, 255, .07);
    }
    :host(.styled) .panel.open { animation: sub-in 380ms cubic-bezier(.22, 1.1, .36, 1); }
    @keyframes sub-in {
      from { opacity: 0; transform: translateX(-14px); clip-path: inset(0 100% 0 0 round 0 18px 18px 0); }
      to { opacity: 1; transform: none; clip-path: inset(0 0 0 0 round 0 18px 18px 0); }
    }
    :host(.styled) .panel.open .flow { animation: flow-in 460ms cubic-bezier(.22, 1, .36, 1) backwards; animation-delay: calc(70ms + var(--i, 0) * 32ms); }
    @keyframes flow-in { from { opacity: 0; transform: translateX(-18px); filter: blur(5px); } }

    hr { height: 1px; margin: 8px 0; border: 0; background: rgba(255, 255, 255, .08); }
    .row {
      display: flex; align-items: center; height: 40px; padding: 8px; border-radius: 5px; cursor: pointer;
      font-weight: 600; line-height: 16px; user-select: none;
      transition: background-color 220ms ease, transform 360ms cubic-bezier(.34, 1.5, .64, 1);
    }
    .row:hover { background: rgba(255, 255, 255, .08); }
    :host(.styled) .row { border-radius: 12px; }
    :host(.styled) .row:hover { background: rgba(255, 255, 255, .085); transform: translateX(4px); }
    .row > svg { flex: none; width: 24px; height: 24px; transition: transform 420ms cubic-bezier(.34, 1.8, .64, 1); }
    :host(.styled) .row:hover > svg { transform: scale(1.14) rotate(-7deg); }
    .row > span { flex: 1; margin-left: 12px; padding-right: 4px; }
    .item.off .row > span, .item.off .row > svg { opacity: .55; }
    .body { padding: 2px 8px 8px 44px; }
    .item.off .body { display: none; }

    .chips { display: flex; gap: 8px; }
    .sub { display: flex; align-items: center; justify-content: space-between; margin: 8px -8px 0 -8px; padding: 6px 8px;
      border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.72);
      transition: background-color 220ms ease, transform 360ms cubic-bezier(.34, 1.5, .64, 1); }
    .sub:hover { background: rgba(255, 255, 255, .08); }
    :host(.styled) .sub { border-radius: 10px; }
    :host(.styled) .sub:hover { background: rgba(255, 255, 255, .085); transform: translateX(3px); }
    .chip { width: 30px; height: 30px; padding: 3px; border-radius: 9px; cursor: pointer;
      border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04);
      transition: border-color 150ms ease, transform 280ms cubic-bezier(.34, 1.7, .64, 1); }
    .chip:hover { transform: scale(1.08); }
    .chip.active { border-color: rgba(255,255,255,.6); }
    .chip i { display: block; width: 100%; height: 100%; border-radius: 6px;
      background: linear-gradient(var(--c), var(--c)), ${CHECKER};
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .slot { display: grid; grid-template-rows: 0fr; margin: 0 -8px 0 -36px;
      transition: grid-template-rows 340ms cubic-bezier(.3, 1.2, .5, 1); }
    .slot.open { grid-template-rows: 1fr; }
    .slot > div { overflow: hidden; }

    .sw { position: relative; flex: none; width: 36px; height: 20px; border-radius: 999px; border: 0; cursor: pointer; padding: 0;
      background: rgba(255,255,255,.16); transition: background 220ms ease, box-shadow 220ms ease; }
    .sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3);
      transition: transform 360ms cubic-bezier(.34, 1.6, .64, 1); }
    .sw[aria-checked="true"] { background: #81b64c; }
    :host(.styled) .sw[aria-checked="true"] { background: linear-gradient(135deg, #7fd6a0, #5fbf8a); box-shadow: 0 0 12px rgba(127,214,160,.3); }
    .sw[aria-checked="true"]::after { transform: translateX(16px); }

    .demo { display: flex; border-radius: 6px; overflow: hidden; width: max-content; }
    .demo span { width: 28px; height: 28px; display: grid; place-items: center; position: relative; }
    .demo span:nth-child(odd) { background: #ebecd0; }
    .demo span:nth-child(even) { background: #739552; }
    .demo b { width: 9px; height: 9px; border-radius: 50%; background: rgba(0,0,0,.14); }
    .demo b.red { background: rgba(220,45,45,.42); }
    .demo .cap { width: 24px; height: 24px; border-radius: 50%; border: 3px solid rgba(220,45,45,.42); }
    .demo .ghost, .demo .live { position: absolute; inset: 2px; background-size: 100% 100%; }

    /* sliders: a chessboard track under a fade to the color */
    .bar { position: relative; height: 18px; margin-top: 10px; border-radius: 999px; cursor: pointer; touch-action: none;
      background: linear-gradient(90deg, transparent, var(--c)), ${CHECKER};
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.18), inset 0 2px 6px rgba(0,0,0,.25); }
    .bar .thumb { position: absolute; top: 50%; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
      background: linear-gradient(var(--k), var(--k)), ${CHECKER}; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.45); pointer-events: none;
      transition: transform 200ms cubic-bezier(.34, 1.7, .64, 1); }
    .bar.drag .thumb { transform: scale(1.18); }

    /* color picker: hue orbit around a chessboard of shades */
    .pk-title { padding: 10px 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: rgba(255,255,255,.5); }
    .pk { padding: 0 4px 6px; }
    .picker { display: flex; gap: 12px; align-items: center; padding-top: 8px; }
    .wheel { position: relative; width: 176px; height: 176px; flex: none; touch-action: none; cursor: crosshair; }
    .ring { position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, hsl(0 85% 60%), hsl(60 85% 60%), hsl(120 85% 55%), hsl(180 85% 55%), hsl(240 85% 65%), hsl(300 85% 62%), hsl(360 85% 60%));
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 14px));
              mask: radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 14px)); }
    .knob { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; pointer-events: none;
      background: var(--hue); border: 3px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,.45);
      transition: transform 160ms ease; }
    .wheel.drag-hue .knob { transform: scale(1.2); }
    .board { position: absolute; left: 50%; top: 50%; width: 104px; height: 104px; margin: -52px 0 0 -52px;
      display: grid; grid-template-columns: repeat(8, 1fr); border-radius: 10px; overflow: hidden;
      box-shadow: 0 4px 18px rgba(0,0,0,.35); }
    .board i { position: relative; transition: transform 160ms cubic-bezier(.34, 1.6, .64, 1); }
    .board i:hover { transform: scale(1.35); z-index: 1; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,.4); }
    .board i.on { z-index: 2; transform: scale(1.45); border-radius: 4px; box-shadow: 0 0 0 2px #fff, 0 3px 10px rgba(0,0,0,.5); }
    .side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .preview { height: 40px; border-radius: 10px; background: linear-gradient(var(--c), var(--c)), ${CHECKER};
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .hex { display: flex; align-items: center; gap: 1px; padding: 5px 6px; border-radius: 8px;
      background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08); color: rgba(255,255,255,.45); font: 11px ui-monospace, Consolas, monospace; }
    .hex input { all: unset; width: 100%; min-width: 0; color: rgba(255,255,255,.9); font: inherit; text-transform: uppercase; }
    .presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .presets button { aspect-ratio: 1; border-radius: 6px; border: 0; cursor: pointer; background: var(--c);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); transition: transform 150ms cubic-bezier(.34, 1.6, .64, 1); }
    .presets button:hover { transform: scale(1.12); }

    .fab { position: fixed; left: 14px; bottom: 14px; z-index: 2147483000; width: 46px; height: 46px; border-radius: 16px;
      border: 1px solid rgba(255,255,255,.14); cursor: pointer; display: none; place-items: center;
      background: rgba(30,29,27,.6); backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,.4); }
    .fab.show { display: grid; }
    .fab svg { width: 24px; height: 24px; }
  `;

  const SAT = [28, 38, 48, 58, 68, 78, 88, 100];
  const LIT = [84, 76, 68, 60, 52, 44, 36, 28];
  const PRESETS = ['#7fd6a0', '#f0827a', '#ffaa00', '#9db8ff', '#b794ff', '#f5d76e', '#5ec8d8', '#ff8fc7'];
  const alphaHex = a => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

  // A slider on a chessboard track: 0..1, drag or click anywhere on it.
  function makeBar(value, color, onChange) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = '<div class="thumb"></div>';
    const thumb = bar.firstElementChild;
    let v = value;
    const paint = () => {
      thumb.style.left = `${v * 100}%`;
      bar.style.setProperty('--c', color());
      thumb.style.setProperty('--k', color(v));
    };
    const handle = e => {
      const r = bar.getBoundingClientRect();
      v = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      paint();
      onChange(v);
    };
    bar.addEventListener('pointerdown', e => {
      try { bar.setPointerCapture(e.pointerId); } catch (err) { /* keeps working without capture */ }
      bar.classList.add('drag');
      handle(e);
    });
    bar.addEventListener('pointermove', e => { if (bar.classList.contains('drag')) handle(e); });
    const end = () => bar.classList.remove('drag');
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    paint();
    return { el: bar, set(next) { v = next; paint(); }, repaint: paint };
  }

  // Hue orbit (drag around the ring) wrapped around an 8x8 board of shades (click a square),
  // with a transparency slider below. Colors are '#rrggbbaa'.
  function makePicker(initial, label, onChange) {
    const el = document.createElement('div');
    el.className = 'pk';
    el.innerHTML = `
      <div class="pk-title">${label}</div>
      <div class="picker">
        <div class="wheel"><div class="ring"></div><div class="board"></div><div class="knob"></div></div>
        <div class="side">
          <div class="preview"></div>
          <label class="hex">#<input maxlength="8" spellcheck="false" aria-label="Hex color"></label>
          <div class="presets">${PRESETS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
        </div>
      </div>`;
    const wheel = el.querySelector('.wheel');
    const boardEl = el.querySelector('.board');
    const knob = el.querySelector('.knob');
    const preview = el.querySelector('.preview');
    const input = el.querySelector('input');
    const tiles = [];
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const t = document.createElement('i');
      t.dataset.i = i; t.dataset.j = j;
      boardEl.appendChild(t);
      tiles.push(t);
    }
    let { rgb, a } = splitColor(initial);
    let { h, s, l } = hexToHsl(rgb);
    const full = () => rgb + alphaHex(a);
    const alpha = makeBar(a, k => (k === undefined ? rgb : rgb + alphaHex(k)), next => { a = next; commit(); });
    el.appendChild(alpha.el);

    const render = () => {
      tiles.forEach(t => { t.style.background = `hsl(${h} ${SAT[t.dataset.i]}% ${LIT[t.dataset.j]}%)`; });
      // the nearest tile to the current color gets the ring, when it is close enough to be "that one"
      let best = null, bestD = 1e9;
      tiles.forEach(t => {
        const d = Math.hypot(SAT[t.dataset.i] - s, (LIT[t.dataset.j] - l) * 1.4);
        if (d < bestD) { bestD = d; best = t; }
      });
      tiles.forEach(t => t.classList.toggle('on', t === best && bestD < 7));
      const ang = (h - 90) * Math.PI / 180, R = 88 - 7.5;
      knob.style.left = `${88 + R * Math.cos(ang)}px`;
      knob.style.top = `${88 + R * Math.sin(ang)}px`;
      knob.style.setProperty('--hue', `hsl(${h} 85% 60%)`);
      preview.style.setProperty('--c', full());
      alpha.set(a);
      if (el.getRootNode().activeElement !== input) input.value = full().slice(1).toUpperCase();
    };
    const commit = () => { render(); onChange(full()); };
    const setRgb = next => { rgb = next; commit(); };

    let mode = null;
    const handle = e => {
      const r = wheel.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      if (!mode) mode = Math.abs(x) <= 52 && Math.abs(y) <= 52 ? 'tile' : 'hue';
      if (mode === 'hue') {
        h = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
        setRgb(hslToHex(h, Math.max(s, 20), l));
      } else {
        const i = Math.floor((x + 52) / 13), j = Math.floor((y + 52) / 13);
        if (i < 0 || i > 7 || j < 0 || j > 7) return;
        s = SAT[i]; l = LIT[j];
        setRgb(hslToHex(h, s, l));
      }
    };
    wheel.addEventListener('pointerdown', e => {
      mode = null;
      try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* keeps working without capture */ }
      handle(e);
      wheel.classList.toggle('drag-hue', mode === 'hue');
    });
    wheel.addEventListener('pointermove', e => { if (mode) handle(e); });
    const end = () => { mode = null; wheel.classList.remove('drag-hue'); };
    wheel.addEventListener('pointerup', end);
    wheel.addEventListener('pointercancel', end);

    input.addEventListener('input', () => {
      const v = input.value.replace(/[^0-9a-f]/gi, '');
      if (v.length !== 6 && v.length !== 8) return;
      ({ rgb, a } = splitColor('#' + v.toLowerCase()));
      ({ h, s, l } = hexToHsl(rgb));
      commit();
    });
    input.addEventListener('blur', render);
    el.querySelectorAll('.presets button').forEach(b => b.addEventListener('click', () => {
      ({ h, s, l } = hexToHsl(b.dataset.c));
      setRgb(b.dataset.c);
    }));
    render();
    return el;
  }

  const ghostPiece = pieceImageUrl('neo', 'wn');

  // Flat, colorful 24px icons in the spirit of chess.com's menu icons.
  const ROW_ICONS = {
    global: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M7.2 6.4a8 8 0 1 0 9.6 0" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/></svg>`,
    style: ICON('bs-grad-row'),
    marks: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="11" height="11" rx="3" fill="#7fd6a0"/><rect x="10.5" y="2.5" width="11" height="11" rx="3" fill="#f0827a" opacity=".92"/><rect x="10.5" y="6" width="3" height="7.5" fill="#c9a98a" opacity=".55"/></svg>`,
    arrows: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.5V11a4 4 0 0 1 4-4h6.5" fill="none" stroke="#ffaa00" stroke-width="3.2" stroke-linecap="round"/><path d="M14.2 2.8L20.6 7l-6.4 4.2z" fill="#ffaa00" stroke="#ffaa00" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    arrowEval: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19L18 5M9 5h10v10" fill="none" stroke="#1baca6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="7" r="3" fill="#96bc4b"/></svg>`,
    danger: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="#739552"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="#e5534b" stroke-width="2.4" opacity=".9"/><circle cx="12" cy="12" r="3" fill="#e5534b"/></svg>`,
    book: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.2c3-.9 6-.6 8.6 1v13.4c-2.6-1.6-5.6-1.9-8.6-1z" fill="#c4955f"/><path d="M21 5.2c-3-.9-6-.6-8.6 1v13.4c2.6-1.6 5.6-1.9 8.6-1z" fill="#e0b47f"/><path d="M14.5 10.5h4M14.5 13.5h4" stroke="#8f6338" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    crown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 8l4.6 3.9L12 4l4.9 7.9L21.5 8l-1.9 9.2H4.4z" fill="#f5b52e" stroke="#c47d12" stroke-width="1" stroke-linejoin="round"/><rect x="4.2" y="16.8" width="15.6" height="2.7" rx="1" fill="#e09a1f"/><circle cx="12" cy="13" r="1.6" fill="#e5534b"/></svg>`,
    ghosts: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c-4.4 0-7.5 3.3-7.5 7.6v10.6l2.5-1.8 2.5 1.8 2.5-1.8 2.5 1.8 2.5-1.8 2.5 1.8V10.1c0-4.3-3.1-7.6-7.5-7.6z" fill="#fff" opacity=".82"/><circle cx="9.3" cy="10.3" r="1.6" fill="#312e2b"/><circle cx="14.7" cy="10.3" r="1.6" fill="#312e2b"/></svg>`
  };

  const host = document.createElement('div');
  host.id = 'board-studio';
  const shadow = host.attachShadow({ mode: 'open' });
  const row = (group, label, i) => `<div class="row flow" style="--i:${i}">${ROW_ICONS[group]}<span>${label}</span><button class="sw" role="switch" type="button" aria-label="${label}"></button></div>`;
  shadow.innerHTML = `<style>${PANEL_CSS}</style>
    <button class="fab" type="button" aria-label="Styles">${ICON('bs-grad-fab')}</button>
    <div class="panel" role="menu" aria-label="Styles">
      <div class="item" data-group="style">${row('style', 'Custom style', 0)}</div>
      <hr class="flow" style="--i:1">
      <div class="item" data-group="marks">${row('marks', 'Double square', 2)}
        <div class="body flow" style="--i:3">
          <div class="chips">
            <button class="chip" type="button" data-key="c1" data-label="First click" aria-label="First click"><i></i></button>
            <button class="chip" type="button" data-key="c2" data-label="Second click" aria-label="Second click"><i></i></button>
          </div>
          <div class="slot"><div></div></div>
        </div>
      </div>
      <div class="item" data-group="arrows">${row('arrows', 'Custom arrows', 4)}
        <div class="body flow" style="--i:5">
          <div class="chips"><button class="chip" type="button" data-key="color" data-label="Arrows" aria-label="Arrows"><i></i></button></div>
          <div class="sub" data-key="aim"><span>Aim assist</span><button class="sw" role="switch" type="button" aria-label="Aim assist"></button></div>
          <div class="slot"><div></div></div>
        </div>
      </div>
      <div class="item" data-group="arrowEval" title="Local engine estimates; Chess.com Game Review labels can differ. Draw a legal move for the side to move.">${row('arrowEval', 'Arrow Eval', 6)}
        <div class="body flow" style="--i:7"><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;padding:4px 0;font-size:11px">${Object.values(ARROW_GRADES).map(g => `<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${g.color};margin-right:6px"></i>${g.label}</span>`).join('')}</div></div>
      </div>
      <div class="item" data-group="book">${row('book', 'Opening book', 6)}</div>
      <div class="item" data-group="crown">${row('crown', 'Winning side', 7)}</div>
      <div class="item" data-group="danger">${row('danger', 'Take squares', 6)}
        <div class="body flow" style="--i:7">
          <div class="sub" data-key="blunders" title="Conservative Stockfish estimates; Chess.com review labels may differ. Keep a piece selected for deeper analysis."><span>Show Blunders</span><button class="sw" role="switch" type="button" aria-label="Show Blunders"></button></div>
          <div class="demo"><span><b></b></span><span><b class="red"></b></span><span><b></b></span><span><i class="cap"></i></span><span><b class="red"></b></span></div>
        </div>
      </div>
      <div class="item" data-group="ghosts">${row('ghosts', 'Ghosts', 8)}
        <div class="body flow" style="--i:9">
          <div class="demo"><span><i class="live" style='background-image:${ghostPiece}'></i></span><span></span><span><i class="ghost" style='background-image:${ghostPiece}'></i></span></div>
          <div class="ghost-bar"></div>
          <div class="sub" data-key="ai" title="After your drawn move, wait for depth 18 to see the opponent's top four replies."><span>Ghost AI</span><button class="sw" role="switch" type="button" aria-label="Ghost AI"></button></div>
          <div style="font-size:10px;line-height:1.7;opacity:.8"><span style="color:#81c45b">1 Green</span> · <span style="color:#f7c045">2 Yellow</span> · <span style="color:#ed8c32">3 Orange</span> · <span style="color:#fa5146">4 Red</span></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(host);

  const panel = shadow.querySelector('.panel');
  // Right-clicking the Styles item opens this small menu with the master switch.
  const gmenu = document.createElement('div');
  gmenu.className = 'panel gmenu'; gmenu.setAttribute('role', 'menu'); gmenu.setAttribute('aria-label', 'Global');
  gmenu.innerHTML = `<div class="item" data-group="global">${row('global', 'Global', 0)}</div>`;
  gmenu.style.width = '200px';
  shadow.appendChild(gmenu);
  const fab = shadow.querySelector('.fab');
  let openPicker = null; // { group, key }

  const ghostDemo = shadow.querySelector('.demo .ghost');
  const ghostBar = makeBar(settings.ghosts.opacity, k => (k === undefined ? '#ffffff' : '#ffffff' + alphaHex(k)), v => {
    ghostDemo.style.opacity = String(v);
    setSetting('ghosts', 'opacity', Math.round(v * 100) / 100);
  });
  shadow.querySelector('.ghost-bar').appendChild(ghostBar.el);
  ghostDemo.style.opacity = String(settings.ghosts.opacity);

  function renderPanel() {
    host.classList.toggle('styled', rawSettings.style.on);
    shadow.querySelectorAll('.item').forEach(item => {
      const g = item.dataset.group;
      item.classList.toggle('off', !rawSettings[g].on);
      item.querySelector('.row .sw').setAttribute('aria-checked', String(rawSettings[g].on));
      item.querySelectorAll('.sub').forEach(sub => sub.querySelector('.sw').setAttribute('aria-checked', String(!!rawSettings[g][sub.dataset.key])));
      item.querySelectorAll('.chip').forEach(chip => {
        chip.querySelector('i').style.setProperty('--c', rawSettings[g][chip.dataset.key]);
        chip.classList.toggle('active', !!openPicker && openPicker.group === g && openPicker.key === chip.dataset.key);
      });
    });
  }

  shadow.querySelectorAll('.item').forEach(item => {
    const g = item.dataset.group;
    // The whole row toggles, like picking an item in chess.com's menus.
    item.querySelector('.row').addEventListener('click', () => setSetting(g, 'on', !rawSettings[g].on));
    item.querySelectorAll('.sub').forEach(sub => sub.addEventListener('click', () => {
      setSetting(g, sub.dataset.key, !rawSettings[g][sub.dataset.key]);
    }));
    const slot = item.querySelector('.slot');
    item.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
      const key = chip.dataset.key;
      const same = openPicker && openPicker.group === g && openPicker.key === key;
      shadow.querySelectorAll('.slot.open').forEach(s => s.classList.remove('open'));
      openPicker = null;
      if (!same) {
        slot.firstElementChild.replaceChildren(makePicker(rawSettings[g][key], chip.dataset.label, hex => setSetting(g, key, hex)));
        slot.classList.add('open');
        openPicker = { group: g, key };
      }
      renderPanel();
      // Once the picker has unfolded (or folded), make sure the menu still fits.
      setTimeout(placePanel, 360);
    }));
  });
  listeners.add(renderPanel);
  renderPanel();

  // Opens exactly where chess.com puts its menus: against the bar's edge, 8px above the item.
  let anchor = null;
  let pinned = false;
  function openPanel(from) {
    anchor = from;
    const nav = document.getElementById('sidebar-main-menu');
    const r = (from || fab).getBoundingClientRect();
    const navRight = nav && nav.getBoundingClientRect().width ? nav.getBoundingClientRect().right : r.right;
    panel.style.left = `${Math.min(navRight, innerWidth - 300)}px`;
    panel.style.transition = 'none';
    panel.classList.add('open');
    placePanel();
    panel.getBoundingClientRect();
    panel.style.transition = '';
    if (anchor) anchor.classList.add('bs-open');
    renderPanel();
  }
  // 8px above the item, like chess.com's menus; nudged up only when it would run off the bottom.
  function placePanel() {
    if (!isOpen()) return;
    const r = (anchor || fab).getBoundingClientRect();
    panel.style.top = `${Math.max(8, Math.min(r.top - 8, innerHeight - panel.offsetHeight - 8))}px`;
  }
  function closePanel() {
    panel.classList.remove('open');
    if (anchor) anchor.classList.remove('bs-open');
    pinned = false;
  }
  const isOpen = () => panel.classList.contains('open');

  // With the custom style on it opens on hover and goes away when the pointer leaves, like
  // chess.com's menus; a short grace lets the pointer cross from the item into the menu.
  let openTimer = 0;
  let closeTimer = 0;
  function hoverIn(from) {
    clearTimeout(closeTimer);
    if (!rawSettings.style.on || isOpen()) return;
    clearTimeout(openTimer);
    openTimer = setTimeout(() => openPanel(from), 60);
  }
  function hoverOut() {
    clearTimeout(openTimer);
    if (!rawSettings.style.on || pinned) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel, 160);
  }
  panel.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  panel.addEventListener('pointerleave', hoverOut);
  // A click keeps it open until a click outside or Escape.
  function clickItem(from) {
    clearTimeout(openTimer);
    if (isOpen() && pinned) { closePanel(); return; }
    if (!isOpen()) openPanel(from);
    pinned = true;
  }

  fab.addEventListener('click', () => clickItem(fab));
  function openGlobalMenu(from, e) {
    e.preventDefault(); e.stopPropagation();
    clearTimeout(openTimer); clearTimeout(closeTimer);
    closePanel();
    const nav = document.getElementById('sidebar-main-menu');
    const r = from.getBoundingClientRect();
    const navRight = nav && nav.getBoundingClientRect().width ? nav.getBoundingClientRect().right : r.right;
    gmenu.style.left = `${Math.min(navRight, innerWidth - 210)}px`;
    gmenu.classList.add('open');
    gmenu.style.top = `${Math.max(8, Math.min(r.top - 8, innerHeight - gmenu.offsetHeight - 8))}px`;
    renderPanel();
  }
  fab.addEventListener('contextmenu', e => openGlobalMenu(fab, e));
  document.addEventListener('pointerdown', e => {
    if (gmenu.classList.contains('open') && !e.composedPath().includes(gmenu)) gmenu.classList.remove('open');
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') gmenu.classList.remove('open'); }, true);
  document.addEventListener('pointerdown', e => {
    if (!isOpen()) return;
    const path = e.composedPath();
    if (path.includes(host) || (anchor && path.includes(anchor))) return;
    closePanel();
  }, true);
  // Keys typed in the panel stay in the panel (chess.com has its own shortcuts).
  ['keydown', 'keyup', 'keypress'].forEach(t => host.addEventListener(t, e => {
    if (t === 'keydown' && e.key === 'Escape') closePanel();
    e.stopPropagation();
  }));

  // The "Styles" item in chess.com's left sidebar, right after "More".
  function ensureNavButton() {
    const more = document.querySelector('[data-interaction="other"]');
    const pin = more && more.closest('[data-pin]');
    const existing = document.querySelector('[data-pin="board-studio"]');
    fab.classList.toggle('show', !pin && !existing);
    if (!pin || existing) return;
    const item = document.createElement('div');
    item.setAttribute('data-pin', 'board-studio');
    item.innerHTML = `<div class="sidebar-link-desktop-wrapper">
      <a href="#" role="button" aria-label="Styles" class="cc-button-component cc-button-ghost cc-bg-ghost cc-button-medium sidebar-link">
        ${ICON('bs-grad-nav')}<span class="sidebar-link-text cc-text-large-bold">Styles</span>
      </a></div>`;
    const link = item.querySelector('a');
    link.addEventListener('click', e => { e.preventDefault(); clickItem(link); });
    link.addEventListener('pointerenter', () => hoverIn(link));
    link.addEventListener('pointerleave', hoverOut);
    link.addEventListener('contextmenu', e => openGlobalMenu(link, e));
    pin.after(item);
  }

  // ---------- progressive blunder hints ----------
  const engineAllowed = () => true;

  function blunderFEN(board) {
    try { return board.game?.getFEN() || board.getAttribute('fen') || board.getAttribute('data-fen') || null; } catch (e) { return null; }
  }

  // Dragging can temporarily remove a piece's DOM square; FEN still describes its origin.
  function blunderPosition(board) {
    const ranks = (blunderFEN(board) || '').split(' ')[0].split('/');
    if (ranks.length !== 8) return readBoard(board);
    const position = Array.from({ length: 8 }, () => Array(8).fill(null));
    ranks.forEach((rank, i) => {
      let f = 0;
      for (const p of rank) {
        if (/[1-8]/.test(p)) f += +p;
        else if (f < 8 && /[prnbqk]/i.test(p)) position[f++][7 - i] = { c: p === p.toUpperCase() ? 'w' : 'b', t: p.toLowerCase() };
      }
    });
    return position;
  }

  // Stockfish's WDL is from the ROOT side to move, including when Black is moving.
  // This is deliberately an estimate, not Chess.com's rating-dependent proprietary model.
  function blunderExpected(score) {
    if (score.mate !== undefined) return score.mate > 0 ? 1 : 0;
    return score.wdl ? (score.wdl[0] + score.wdl[1] / 2) / 1000 : null;
  }

  function isBlunderLoss(best, move) {
    const a = blunderExpected(best), b = blunderExpected(move);
    if (a === null || b === null) return false;
    // WDL rounds to 0 expected points well before every move is equally bad.
    // Still flag a large additional loss (2.5 pawns) in a near-certain loss.
    // Do not treat shortening an already-forced mate as a new blunder, or apply
    // this exception to winning positions where material can be safely returned.
    const cpLoss = best.cp !== undefined && move.cp !== undefined ? best.cp - move.cp : null;
    if (a <= 0.01 && b <= 0.01 && cpLoss !== null && cpLoss >= 250) return true;
    if (a - b < 0.20 - 1e-9) return false;
    // A WDL swing alone can flag small errors in nearly equal engine positions.
    // Require at least two pawns as well, unless the score includes a forced mate.
    return cpLoss === null || cpLoss >= 200;
  }

  class BlunderSearch {
    constructor(fen, onUpdate) {
      this.fen = fen;
      this.onUpdate = onUpdate;
      this.worker = null;
      this.urls = [];
      this.stopped = false;
      this.depth = 0;
      this.publishedDepth = 0;
      this.pvCount = 0;
      this.ready = false;
      this.error = null;
      this.batch = new Map();
      this.moves = new Map();
    }

    start() {
      if (this.worker || this.starting) return;
      this.starting = true;
      withEngineFiles(files => this.launch(files), e => this.fail(`Could not download the engine (${e.message})`));
    }

    launch(files) {
      if (this.stopped || this.worker) return;
      try {
        const { worker, urls } = createEngineWorker(files);
        this.worker = worker;
        this.urls.push(...urls);
        this.worker.onmessage = e => String(e.data).split(/\r?\n/).forEach(line => this.receive(line));
        this.worker.onerror = e => this.fail(e.message || 'Engine worker failed');
        this.watchdog = setTimeout(() => this.fail('Engine startup timed out'), 15000);
        this.send('uci');
      } catch (e) { this.fail(e.message); }
    }

    send(command) { this.worker?.postMessage(command); }

    receive(line) {
      if (this.stopped) return;
      if (line === 'uciok') {
        this.send('setoption name Hash value 32');
        this.send('setoption name Threads value 1');
        this.send('setoption name UCI_ShowWDL value true');
        // Evaluate ALL legal moves, not just this piece: a quiet move can miss the only defense.
        // Stockfish clamps MultiPV to the legal root-move count (at most 218 in standard chess).
        this.send('setoption name MultiPV value 256');
        this.send('isready');
        return;
      }
      if (line === 'readyok') {
        clearTimeout(this.watchdog);
        this.ready = true;
        this.watchdog = setTimeout(() => this.fail('Engine returned no evaluations'), 15000);
        this.send(`position fen ${this.fen}`);
        this.send('go infinite');
        return;
      }
      if (line.startsWith('bestmove')) { this.publish(); return; }
      if (!line.startsWith('info ') || / (lower|upper)bound/.test(line)) return;
      const depth = /\bdepth (\d+)/.exec(line);
      const rank = /\bmultipv (\d+)/.exec(line);
      const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
      const pv = /\bpv ([a-h][1-8][a-h][1-8][qrbn]?)\b/.exec(line);
      if (!depth || !rank || !score || !pv) return;
      clearTimeout(this.watchdog);
      const d = +depth[1], n = +rank[1];
      if (d < this.depth) return; // Ignore the previous-depth lines in a partial UCI update.
      if (d > this.depth) {
        this.publish();
        this.depth = d;
        this.batch = new Map();
      }
      const wdl = /\bwdl (\d+) (\d+) (\d+)/.exec(line);
      this.batch.set(n, { move: pv[1], [score[1]]: +score[2], wdl: wdl ? wdl.slice(1).map(Number) : null });
      this.publish();
    }

    publish() {
      if (this.stopped || !this.batch.has(1)) return;
      this.pvCount = Math.max(this.pvCount, ...this.batch.keys());
      // Publish as each candidate arrives; never wait for a depth floor or a second verdict.
      // Both scores in each comparison still come from THIS depth. Other destinations retain
      // their last result until their own fresh score arrives, so the overlay does not flash.
      const best = this.batch.get(1);
      let changed = false;
      const seen = new Set();
      for (const [, score] of [...this.batch].sort((a, b) => a[0] - b[0])) {
        // During a reordered MultiPV update the new best may still occupy an older rank.
        // Do not let that older duplicate overwrite the best move's current verdict.
        if (seen.has(score.move)) continue;
        seen.add(score.move);
        const bad = isBlunderLoss(best, score);
        const prior = this.moves.get(score.move);
        if (!prior || prior.blunder !== bad) changed = true;
        this.moves.set(score.move, { ...score, depth: this.depth, blunder: bad });
      }
      this.publishedDepth = this.depth;
      if (changed) this.onUpdate();
    }

    fail(message) {
      this.error = message;
      this.stop();
      this.moves.clear();
      console.warn('[Board Studio] Blunder analysis unavailable:', message);
      this.onUpdate();
    }

    stop() {
      this.stopped = true;
      clearTimeout(this.watchdog);
      this.worker?.terminate();
      this.worker = null;
      this.urls.forEach(url => URL.revokeObjectURL(url));
      this.urls = [];
    }
  }

  // ---------- opponent ghost replies ----------

  const GHOST_AI_COLORS = ['#81c45b', '#f7c045', '#ed8c32', '#fa5146'];

  function ghostMove(game, arrow) {
    const move = game.moves({ verbose: true }).find(m => m.from === arrow.from &&
      (m.to === arrow.to || (m.piece === 'k' && ((m.flags.includes('k') && arrow.to === `h${m.from[1]}`) ||
        (m.flags.includes('q') && arrow.to === `a${m.from[1]}`)))) && (!m.promotion || m.promotion === 'q'));
    return move ? game.move(move) : null;
  }

  // Best reply found so far for each position the opponent was to move in, so a drawn line can assume it.
  const ghostBest = new Map();

  function ghostReplyPosition(fen, arrows, need, out) {
    if (!fen || !arrows.length) return null;
    try {
      let game = new BoardStudioRules.Chess(fen);
      // You are whoever owns the first arrow's piece, so drawing while the opponent is still
      // thinking works: their best reply is assumed first, then your move goes on top of it.
      const player = game.get(arrows[0].from)?.color;
      if (!player) return null;
      // Play one arrow. If it is not legal yet and it is the opponent's move, assume their best
      // reply (asking for it to be worked out if it is not known) and try again.
      let line = []; // every move of the line in order, the assumed opponent replies included
      const play = arrow => {
        if (ghostMove(game, arrow)) { line.push({ from: arrow.from, to: arrow.to }); return true; }
        if (game.turn() === player) return false;
        const best = ghostBest.get(game.fen());
        if (!best) { need?.add(game.fen()); return false; }
        if (!game.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }) || !ghostMove(game, arrow)) return false;
        line.push({ from: best.slice(0, 2), to: best.slice(2, 4), assumed: true }, { from: arrow.from, to: arrow.to });
        return true;
      };
      // Follow a legal drawn line. A separate root arrow selects a new variation.
      // An invalid last arrow clears the preview instead of evaluating a made-up position.
      for (const arrow of arrows) {
        if (play(arrow)) continue;
        game = new BoardStudioRules.Chess(fen);
        line = [];
        if (!play(arrow)) return null;
      }
      if (out) out.line = line;
      return game.turn() !== player && !game.isGameOver() ? game.fen() : null;
    } catch (e) { return null; }
  }

  class GhostSearch extends BlunderSearch {
    constructor(fen, onUpdate) {
      super(fen, onUpdate);
      this.count = Math.min(4, new BoardStudioRules.Chess(fen).moves().length);
      this.results = null;
    }
    send(command) {
      super.send(command === 'setoption name MultiPV value 256' ? 'setoption name MultiPV value 4' :
        command === 'go infinite' ? 'go depth 18 movetime 1300' : command);
    }
    publish() {}
    // Replies show from the first depth and are re-ranked as the search deepens; replies that
    // fall clearly behind the best one are dropped.
    receive(line) {
      if (this.stopped) return;
      if (line.startsWith('bestmove')) { this.stop(); return; }
      super.receive(line);
      if (this.batch.size !== this.count || ![...this.batch.keys()].every(r => r >= 1 && r <= this.count)) return;
      const legal = new BoardStudioRules.Chess(this.fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
      const ranked = [...this.batch].sort((a, b) => a[0] - b[0]).map(([, score]) => score);
      if (new Set(ranked.map(m => m.move)).size !== this.count || !ranked.every(m => legal.includes(m.move))) return;
      const value = m => m.mate !== undefined ? Math.sign(m.mate || -1) * (10000 - Math.abs(m.mate)) : m.cp;
      const results = ranked.filter(m => value(ranked[0]) - value(m) <= 80);
      if (this.results && this.results.map(m => m.move).join() === results.map(m => m.move).join()) return;
      this.results = results;
      ghostBest.set(this.fen, results[0].move);
      this.onUpdate();
    }
  }

  const ghostAI = {
    sessions: new Map(),
    stop(board, keepFeeder) {
      const session = this.sessions.get(board);
      session?.search.stop();
      session?.ctl.ghosts?.take(new Set());
      if (!keepFeeder) this.feed({ board }, null);
      session?.layer?.remove();
      this.sessions.delete(board);
    },
    clear() { for (const board of this.sessions.keys()) this.stop(board); },
    feeders: new Map(),
    feed(ctl, fen) {
      const board = ctl.board, old = this.feeders.get(board);
      if (old && old.fen === fen) return;
      old?.search.stop();
      this.feeders.delete(board);
      if (!fen) return;
      const search = new GhostSearch(fen, () => { if (board.isConnected) ctl.syncGhosts(); });
      this.feeders.set(board, { fen, search });
      search.start();
    },
    sync(ctl, imageFor) {
      const board = ctl.board;
      ctl.assumedLine = null;
      // Stepping back through earlier moves (analysis, game review, a running game) is just viewing:
      // replies are only worked out at the end of the line.
      let viewing = false;
      try { viewing = !!board.game?.canMoveForward?.(); } catch (e) { /* no game yet */ }
      if (!settings.ghosts.on || !settings.ghosts.ai || !engineAllowed() || document.hidden || !board.isConnected || viewing) { this.stop(board); return; }
      const all = settings.arrows.on ? ctl.aimedArrows() : ctl.nativeArrows ?
        [...ctl.nativeArrows.values()].map(i => ({ key: i.key, ...i.data })) : [...ctl.svg.querySelectorAll('polygon.arrow')].map(p => {
          const m = MOVE.exec(p.getAttribute('data-arrow') || '');
          return m && { id: m[0], from: m[1] + m[2], to: m[3] + m[4] };
        }).filter(Boolean);
      const arrows = drawnByYou(ctl, all);
      const base = blunderFEN(board), need = new Set(), out = {}, fen = ghostReplyPosition(base, arrows, need, out);
      ctl.assumedLine = fen ? out.line : null;
      // Playing on before the opponent's best reply is known: work it out first, then carry on.
      this.feed(ctl, need.values().next().value);
      if (!fen) { if (!need.size) this.stop(board); return; }
      let session = this.sessions.get(board);
      if (!session || session.fen !== fen || session.base !== base) {
        this.stop(board, true);
        const search = new GhostSearch(fen, () => {
          if (this.sessions.get(board)?.search === search) {
            const current = this.sessions.get(board);
            current.ctl.syncGhosts();
          }
        });
        session = { ctl, base, fen, search, layer: null, signature: null };
        this.sessions.set(board, session);
        search.start();
      }
      session.ctl = ctl;
      if (!session.search.results) return;
      this.paint(session, imageFor);
    },
    // Updates in place: replies that stay slide and recolor to their new rank, new ones grow out of
    // their square, dropped ones fade away. Nothing is rebuilt, so refinements never flicker.
    paint(session, imageFor) {
      const { ctl, search, fen } = session;
      const signature = JSON.stringify([ctl.flipped, settings.ghosts.opacity, search.results]);
      if (session.signature === signature && session.layer?.isConnected) return;
      session.signature = signature;
      if (!session.layer?.isConnected) {
        session.layer?.remove();
        const layer = document.createElement('div');
        layer.className = 'bs-ghost-ai';
        layer.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 800 800');
        layer.appendChild(svg);
        Object.assign(session, { layer, svg, items: new Map() });
        ctl.board.appendChild(layer);
      }
      const { layer, svg, items } = session;
      const spot = square => {
        const s = squareXY(square.charCodeAt(0) - 96, +square[1], ctl.flipped);
        return { left: `${s.x * 12.5}%`, top: `${s.y * 12.5}%` };
      };
      const arrowPath = uci => geometry(Controller.prototype.arrowTarget.call(ctl, MOVE.exec(uci.slice(0, 4)), .8, 17));
      const keep = new Set();
      // Each reply is an alternative, not a four-move continuation.
      search.results.forEach((score, i) => {
        const uci = score.move, color = GHOST_AI_COLORS[i];
        keep.add(uci);
        let item = items.get(uci);
        const fresh = !item;
        if (fresh) {
          const game = new BoardStudioRules.Chess(fen);
          const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
          const parts = [{ from: move.from, to: move.to, kind: move.color + (move.promotion || move.piece) }];
          if (move.flags.includes('k')) parts.push({ from: `h${move.from[1]}`, to: `f${move.from[1]}`, kind: move.color + 'r' });
          if (move.flags.includes('q')) parts.push({ from: `a${move.from[1]}`, to: `d${move.from[1]}`, kind: move.color + 'r' });
          item = { san: move.san, capture: move.captured ? move.to : null, pieces: [], group: null };
          for (const part of parts) {
            const el = document.createElement('div');
            el.className = 'cc-ghost'; el.dataset.square = part.to;
            el.style.backgroundImage = imageFor(part.kind);
            Object.assign(el.style, spot(part.from), { opacity: '0' });
            layer.insertBefore(el, svg); el.getBoundingClientRect();
            item.pieces.push({ el, to: part.to });
          }
          const group = document.createElementNS(NS, 'g');
          group.setAttribute('class', 'reply-arrow'); group.dataset.move = uci; group.style.opacity = '0';
          const title = document.createElementNS(NS, 'title');
          const shaft = document.createElementNS(NS, 'path');
          shaft.setAttribute('class', 'reply-shaft'); shaft.setAttribute('stroke-width', '17');
          const head = document.createElementNS(NS, 'path');
          head.setAttribute('class', 'reply-head'); head.setAttribute('stroke-width', '7');
          group.append(title, shaft, head); svg.appendChild(group);
          Object.assign(item, { group, title, shaft, head });
          items.set(uci, item);
        }
        item.title.textContent = `Opponent reply ${i + 1}: ${item.san}`;
        item.group.dataset.rank = String(i + 1);
        const g = arrowPath(uci);
        if (g) { item.shaft.setAttribute('d', g.shaft); item.head.setAttribute('d', g.head); }
        for (const [el, c] of [[item.shaft, 'stroke'], [item.head, 'fill'], [item.head, 'stroke']]) {
          el.style[c] = color; el.setAttribute(c, color);
        }
        item.group.getBoundingClientRect?.();
        item.group.style.opacity = '.8';
        for (const { el, to } of item.pieces) {
          el.dataset.rank = String(i + 1);
          el.style.setProperty('--reply-color', color);
          el.classList.remove('cc-ghost-leave');
          Object.assign(el.style, spot(to), { opacity: String(settings.ghosts.opacity) });
        }
      });
      // A ghost one of the replies captures goes away, like when you draw the capture yourself.
      ctl.ghosts?.take(new Set([...items.values()].map(i => i.capture).filter(Boolean)));
      for (const [uci, item] of items) {
        if (keep.has(uci)) continue;
        items.delete(uci);
        item.group.style.opacity = '0';
        item.pieces.forEach(({ el }) => { el.style.opacity = '0'; el.classList.add('cc-ghost-leave'); });
        setTimeout(() => { item.group.remove(); item.pieces.forEach(({ el }) => el.remove()); }, 340);
      }
    }
  };
  setInterval(() => {
    for (const [board, session] of ghostAI.sessions) {
      if (!board.isConnected) ghostAI.stop(board);
      else if (blunderFEN(board) !== session.base || (session.layer && !session.layer.isConnected)) session.ctl.syncGhosts();
    }
  }, 150);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ghostAI.clear();
    else document.querySelectorAll('wc-chess-board, chess-board').forEach(b => b.__cc?.syncGhosts());
  });

  // ---------- arrow evaluation ----------

  const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  // Legal static exchanges distinguish a genuine material offer from an equal
  // trade, a pinned defender, or a capture that already wins more material.
  function exchangeGain(game, square, remaining = 5) {
    if (!remaining) return 0;
    let best = 0;
    for (const move of game.moves({ verbose: true }).filter(m => m.to === square && m.captured)) {
      game.move(move);
      const gain = PIECE_VALUE[move.captured] - exchangeGain(game, square, remaining - 1);
      game.undo();
      best = Math.max(best, gain);
    }
    return best;
  }

  function isSoundSacrifice(fen, uci) {
    try {
      const game = new BoardStudioRules.Chess(fen);
      const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!move || move.promotion) return false;
      const captures = game.moves({ verbose: true }).filter(m => m.captured && m.captured !== 'p' && m.captured !== 'k');
      const previous = fen.split(' '); previous[1] = game.turn(); previous[3] = '-';
      const before = new BoardStudioRules.Chess(previous.join(' '));
      const checked = new Set();
      for (const capture of captures) {
        if (checked.has(capture.to)) continue;
        checked.add(capture.to);
        const offered = exchangeGain(game, capture.to) - (PIECE_VALUE[move.captured] || 0);
        const alreadyOffered = capture.to === move.to ? 0 : exchangeGain(before, capture.to);
        if (offered >= 200 && offered - alreadyOffered >= 200) return true;
      }
    } catch (e) { /* Invalid or unsupported positions are never Brilliant. */ }
    return false;
  }

  function arrowGrade(best, score, { book = false, sacrifice = false, completed = null } = {}) {
    if (book) return 'book';
    if (!best || !score) return null;
    const a = blunderExpected(best), b = blunderExpected(score);
    if (a === null || b === null) return null;
    const loss = Math.max(0, a - b);
    const cpLoss = best.cp !== undefined && score.cp !== undefined ? Math.max(0, best.cp - score.cp) : null;
    const nearBest = loss <= .02 && (cpLoss === null || cpLoss <= 40);
    // A real sacrifice may give up a little against the engine's top move and still be Brilliant
    // (chess.com does the same), as long as it stays about level.
    const closeToBest = loss <= .08 && (cpLoss === null || cpLoss <= 70);
    if (closeToBest && b >= .45 && sacrifice && completed && completed.depth >= 12) {
      const candidate = completed.scores.find(s => s.move === score.move);
      const alternatives = completed.scores.filter(s => s.move !== score.move);
      const ca = blunderExpected(completed.best), cb = candidate && blunderExpected(candidate);
      const gap = candidate?.cp !== undefined && completed.best.cp !== undefined ? completed.best.cp - candidate.cp : 0;
      if (candidate && cb !== null && cb >= .45 && ca - cb <= .08 && gap <= 70 && alternatives.length &&
          alternatives.every(s => blunderExpected(s) !== null && blunderExpected(s) < .9)) return 'brilliant';
    }
    if ((best.mate > 0 || a >= .85) && b <= .5 && loss >= .2) return 'missed';
    if (isBlunderLoss(best, score) || loss >= .2) return 'blunder';
    if (loss >= .1) return 'mistake';
    if (loss >= .05) return 'inaccuracy';
    if (loss >= .02) return 'good';
    if (score.move === best.move || (cpLoss === 0 && best.cp !== undefined) ||
        (best.mate !== undefined && score.mate === best.mate)) return 'best';
    return 'excellent';
  }

  class ArrowSearch extends BlunderSearch {
    publish() {
      if (this.stopped || !this.batch.has(1)) return;
      const best = this.batch.get(1), seen = new Set(), scores = [];
      for (const [, score] of [...this.batch].sort((a, b) => a[0] - b[0])) {
        if (seen.has(score.move)) continue;
        seen.add(score.move); scores.push(score);
        this.moves.set(score.move, { ...score, best, depth: this.depth });
      }
      if (scores.length === this.legalCount) this.completed = { best, scores, depth: this.depth };
      this.publishedDepth = this.depth;
      this.onUpdate();
    }
  }

  const arrowEval = {
    sessions: new Map(), nativeColors: new WeakMap(), canvasColors: new WeakMap(), queued: new WeakSet(),
    queue(ctl) {
      if (this.queued.has(ctl)) return;
      this.queued.add(ctl);
      nextFrame(() => { this.queued.delete(ctl); if (ctl.board.isConnected) ctl.syncArrows(); });
    },
    stop(board) {
      this.sessions.get(board)?.search.stop();
      this.sessions.delete(board);
    },
    clear() { for (const board of this.sessions.keys()) this.stop(board); },
    sync(ctl, arrows) {
      const grades = new Map(), board = ctl.board, fen = blunderFEN(board);
      if (!settings.arrowEval.on || !engineAllowed() || document.hidden || !board.isConnected || !fen || !arrows.length) {
        this.stop(board); return grades;
      }
      let session = this.sessions.get(board);
      if (session?.fen !== fen) {
        this.stop(board);
        let game;
        try { game = new BoardStudioRules.Chess(fen); } catch (e) { return grades; }
        const legal = game.moves({ verbose: true });
        const search = new ArrowSearch(fen, () => {
          if (this.sessions.get(board)?.search === search) this.queue(this.sessions.get(board).ctl);
        });
        search.legalCount = legal.length;
        session = { fen, search, ctl, legal, book: new Set(bookMoves(fen).map(m => m.uci)), sacrifices: new Map() };
        this.sessions.set(board, session);
      }
      session.ctl = ctl;
      let usable = 0;
      for (const arrow of arrows) {
        // An arrow has no promotion selector; evaluate queen promotion by default.
        const move = session.legal.find(m => m.from === arrow.from &&
          (m.to === arrow.to || (m.piece === 'k' && ((m.flags.includes('k') && arrow.to === `h${m.from[1]}`) || (m.flags.includes('q') && arrow.to === `a${m.from[1]}`)))) &&
          (!m.promotion || m.promotion === 'q'));
        if (!move) continue;
        usable++;
        const uci = move.from + move.to + (move.promotion || '');
        const book = session.book.has(uci), score = session.search.moves.get(uci);
        let sacrifice = false;
        if (!book && score && session.search.completed?.depth >= 12) {
          const a = blunderExpected(score.best), b = blunderExpected(score);
          if (a !== null && b !== null && b >= .5 && a - b <= .02) {
            if (!session.sacrifices.has(uci)) session.sacrifices.set(uci, isSoundSacrifice(fen, uci));
            sacrifice = session.sacrifices.get(uci);
          }
        }
        const grade = arrowGrade(score?.best, score, { book, sacrifice, completed: session.search.completed });
        if (grade) grades.set(arrow.id, grade);
      }
      if (!usable) this.stop(board);
      else if (!session.search.worker && !session.search.stopped) session.search.start();
      return grades;
    },
    nativeColor(poly) {
      let record = this.nativeColors.get(poly);
      if (!record || record.inline !== poly.style.fill) {
        record = { ...readColor(poly), inline: poly.style.fill };
        this.nativeColors.set(poly, record);
      }
      return record;
    },
    label(el, grade) {
      if (grade) {
        if (el.dataset.bsGrade !== grade) el.dataset.bsGrade = grade;
        let title = el.querySelector(':scope > title.bs-arrow-grade');
        if (!title) { title = document.createElementNS(NS, 'title'); title.setAttribute('class', 'bs-arrow-grade'); el.appendChild(title); }
        const text = `${ARROW_GRADES[grade].label} — local estimate`;
        if (title.textContent !== text) title.textContent = text;
      } else {
        if (el.dataset.bsGrade) delete el.dataset.bsGrade;
        el.querySelector(':scope > title.bs-arrow-grade')?.remove();
      }
    },
    paintNative(poly, grade) {
      const color = grade && ARROW_GRADES[grade].color;
      if (color && poly.style.getPropertyValue('--bs-eval-color') !== color) poly.style.setProperty('--bs-eval-color', color);
      if (!color && poly.style.getPropertyValue('--bs-eval-color')) poly.style.removeProperty('--bs-eval-color');
      this.label(poly, grade);
    },
    canvasColor(ctl, key, base, grade) {
      let colors = this.canvasColors.get(ctl);
      if (!colors) this.canvasColors.set(ctl, colors = new Map());
      const rgb = value => {
        if (/^#[\da-f]{6,8}$/i.test(value)) return hexToRgb(value.slice(0, 7));
        const m = String(value).match(/rgba?\(([^)]+)\)/);
        return m ? m[1].split(',').slice(0, 3).map(Number) : [255, 170, 0];
      };
      const target = rgb(grade ? ARROW_GRADES[grade].color : base), now = performance.now();
      let state = colors.get(key);
      if (!state) colors.set(key, state = { from: rgb(base), to: rgb(base), current: rgb(base), start: now });
      if (state.to.some((c, i) => c !== target[i])) {
        state.from = state.current.slice(); state.to = target; state.start = now;
      }
      const t = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1, (now - state.start) / 460);
      const ease = 1 - (1 - t) ** 3;
      state.current = state.from.map((c, i) => c + (state.to[i] - c) * ease);
      if (t < 1) this.queue(ctl);
      if (!grade && t === 1) { colors.delete(key); return null; }
      return rgbToHex(...state.current.map(Math.round));
    }
  };
  setInterval(() => {
    for (const [board, session] of arrowEval.sessions) {
      if (!board.isConnected) arrowEval.stop(board);
      else if (blunderFEN(board) !== session.fen) session.ctl.syncArrows();
    }
  }, 150);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) arrowEval.clear();
    document.querySelectorAll('wc-chess-board, chess-board').forEach(b => b.__cc?.syncArrows());
  });

  const blunderHints = {
    ctl: null, search: null, layer: null,
    sync(ctl, from, targets) {
      const empty = new Set();
      const fen = blunderFEN(ctl.board);
      const position = blunderPosition(ctl.board);
      const piece = from && position[from.f]?.[from.r];
      if (!engineAllowed() || !ctl.board.isConnected || document.hidden || !settings.danger.on || !settings.danger.blunders || !from || !targets.length || !fen || piece?.c !== fen.split(' ')[1]) {
        if (this.ctl === ctl) this.clear();
        return empty;
      }
      if (this.ctl?.board !== ctl.board || this.search?.fen !== fen) {
        this.clear();
        this.ctl = ctl;
        const search = new BlunderSearch(fen, () => {
          if (this.search === search && this.ctl?.board.isConnected) this.ctl.paintHints();
        });
        this.search = search;
        search.start();
      }
      // Native and fallback renderers share the same position search. Changing the
      // renderer must never discard the scores or restart the worker.
      this.ctl = ctl;
      const source = sqName(from);
      const bad = new Set();
      for (const target of targets) {
        const name = sqName(target);
        // Standard castling may show a hint on the rook instead of the king's landing square.
        const rook = position[target.f]?.[target.r];
        const castle = piece.t === 'k' && from.r === target.r && rook?.c === piece.c && rook.t === 'r';
        const destination = castle ? sqName({ f: target.f > from.f ? 6 : 2, r: from.r }) : name;
        const choices = [...this.search.moves.values()].filter(s => s.move.slice(0, 4) === source + destination);
        // Promotion squares are flagged only when ALL promotion choices blunder.
        const promotion = piece.t === 'p' && (target.r === 0 || target.r === 7);
        if ((!promotion || choices.length === 4) && choices.length && choices.every(s => s.blunder)) bad.add(name);
      }
      this.paint(ctl, bad, from, position);
      return bad;
    },
    covers(ctl, square) {
      return this.layer?.parentElement === ctl.board && !!this.layer.querySelector(`[data-square="${square}"]`);
    },
    paint(ctl, squares, from, position) {
      if (!this.layer) {
        this.layer = document.createElement('div');
        this.layer.className = 'bs-blunder-layer';
        this.layer.setAttribute('aria-hidden', 'true');
        ctl.board.appendChild(this.layer);
      }
      if (this.layer.parentElement !== ctl.board) ctl.board.appendChild(this.layer);
      const old = new Map([...this.layer.children].map(el => [el.dataset.square, el]));
      for (const name of squares) {
        let el = old.get(name);
        old.delete(name);
        if (!el) {
          el = document.createElement('span');
          el.className = 'bs-blunder-cross bs-cross-enter';
          el.dataset.square = name;
          const target = sqOf(name);
          const capture = !!position[target.f]?.[target.r];
          const radius = ctl.board.querySelector(`:scope > .capture-hint.square-${target.f + 1}${target.r + 1}`) ? 50 : 45;
          const ringWidth = Math.min(15, 500 / (ctl.board.getBoundingClientRect().width / 8 || 60));
          const dotPath = capture ? roundedHintPath(hintCircle(radius / .966), .5) + roundedHintPath(hintCircle((radius - ringWidth) / .966), .5) : hintDotPath;
          el.style.setProperty('--bs-dot-shape', `path('${dotPath}')`);
          el.style.setProperty('--bs-dot-color', canBeTaken(position, from, target) ? 'rgba(220,45,45,.42)' : 'rgba(0,0,0,.14)');
          el.innerHTML = '<svg viewBox="0 0 100 100"><path fill="currentColor" fill-rule="evenodd"/></svg>';
          this.layer.appendChild(el);
          // Start as the dot or capture ring, then interpolate its outline into an X.
          el.getBoundingClientRect();
          nextFrame(() => el.classList.remove('bs-cross-enter'));
        } else {
          clearTimeout(el.bsRemoval);
          el.bsRemoval = null;
          el.classList.remove('bs-cross-leave');
        }
        const s = sqOf(name), xy = squareXY(s.f + 1, s.r + 1, ctl.flipped);
        const left = `${xy.x * 12.5}%`, top = `${xy.y * 12.5}%`;
        if (el.style.left !== left) el.style.left = left;
        if (el.style.top !== top) el.style.top = top;
      }
      old.forEach(el => {
        if (el.classList.contains('bs-cross-leave')) return;
        el.classList.add('bs-cross-leave');
        el.bsRemoval = setTimeout(() => {
          el.remove();
          // Hand back to the native dot only after the reverse morph finishes.
          if (this.ctl?.board.isConnected) this.ctl.paintHints();
        }, 240);
      });
    },
    clear() {
      this.search?.stop();
      this.search = null;
      if (this.layer) [...this.layer.children].forEach(el => clearTimeout(el.bsRemoval));
      this.layer?.remove();
      this.layer = null;
      const ctl = this.ctl;
      this.ctl = null;
      ctl?.board.querySelectorAll('[data-bs-blunder]').forEach(el => delete el.dataset.bsBlunder);
      ctl?.hintSprites?.forEach(h => {
        if (Object.prototype.hasOwnProperty.call(h, 'bsRenderable') && !h.sprite._destroyed) h.sprite.renderable = h.bsRenderable;
        delete h.bsRenderable;
      });
    }
  };

  // Selecting a piece must not depend on native move dots or the canvas sprite hooks.
  // The local rules library supplies legal destinations immediately, even with site hints off.
  const fallbackHints = {
    board: null, from: null, fen: null, moves: [], layer: null, adapter: null,
    select(board, from) {
      this.clear();
      if (!settings.danger.on || !from) return;
      const fen = blunderFEN(board);
      if (!fen) return;
      let game;
      try { game = new BoardStudioRules.Chess(fen); } catch (e) {
        return;
      }
      const name = sqName(from);
      if (game.get(name)?.color !== game.turn()) return;
      this.board = board;
      this.from = from;
      this.fen = fen;
      this.moves = [...new Map(game.moves({ square: name, verbose: true }).map(m => [m.to, m])).values()];
      const self = this;
      this.adapter = {
        board,
        get flipped() { return board.__cc ? board.__cc.flipped : board.classList.contains('flipped'); },
        paintHints() { if (self.board === board) self.refresh(); }
      };
      if (!this.moves.length) return;
      this.refresh();
    },
    nativeHints() {
      if (!this.board) return false;
      const domHints = [...this.board.querySelectorAll(':scope > .hint, :scope > .capture-hint')];
      return domHints.some(el => !el.querySelector('.removing') && el.getClientRects().length && getComputedStyle(el).display !== 'none' && (getComputedStyle(el).visibility !== 'hidden' || el.dataset.bsBlunder)) ||
        !!this.board.__cc?.hintSprites?.some(h => !h.sprite._destroyed && h.sprite.visible !== false);
    },
    refresh() {
      if (!this.board) return;
      if (!this.board.isConnected || document.hidden || !settings.danger.on || blunderFEN(this.board) !== this.fen) { this.clear(); return; }
      if (!this.moves.length) return;
      if (this.nativeHints() && this.board.__cc) {
        this.layer?.remove(); this.layer = null;
        this.board.__cc.paintHints();
        return;
      }
      if (!this.layer) {
        this.layer = document.createElement('div');
        this.layer.className = 'bs-fallback-hints';
        this.layer.setAttribute('aria-hidden', 'true');
        for (const move of this.moves) {
          const el = document.createElement('span');
          el.className = 'bs-fallback-dot' + (move.captured ? ' bs-capture' : '');
          el.dataset.square = move.to;
          this.layer.appendChild(el);
        }
        this.board.appendChild(this.layer);
      }
      if (this.layer.parentElement !== this.board) this.board.appendChild(this.layer);
      const targets = this.moves.map(m => sqOf(m.to));
      blunderHints.sync(this.adapter, this.from, targets);
      const position = blunderPosition(this.board);
      [...this.layer.children].forEach(el => {
        const target = sqOf(el.dataset.square);
        const xy = squareXY(target.f + 1, target.r + 1, this.adapter.flipped);
        const left = `${xy.x * 12.5}%`, top = `${xy.y * 12.5}%`;
        if (el.style.left !== left) el.style.left = left;
        if (el.style.top !== top) el.style.top = top;
        el.classList.toggle('bs-danger', canBeTaken(position, this.from, target));
        if (blunderHints.covers(this.adapter, el.dataset.square)) el.dataset.bsBlunder = '1';
        else if (el.dataset.bsBlunder) delete el.dataset.bsBlunder;
      });
    },
    clear() {
      if (this.adapter && blunderHints.ctl === this.adapter) blunderHints.clear();
      this.layer?.remove(); this.layer = null;
      this.board = null; this.from = null; this.fen = null; this.moves = []; this.adapter = null;
    }
  };
  window.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const board = e.target.closest('wc-chess-board, chess-board');
    if (!board) {
      if (!e.composedPath().includes(host)) fallbackHints.clear();
      return;
    }
    const box = board.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const flipped = board.__cc ? board.__cc.flipped : board.classList.contains('flipped');
    const x = Math.floor((e.clientX - box.left) * 8 / box.width);
    const y = Math.floor((e.clientY - box.top) * 8 / box.height);
    const from = flipped ? { f: 7 - x, r: y } : { f: x, r: 7 - y };
    const same = fallbackHints.board === board && fallbackHints.from && sqName(from) === sqName(fallbackHints.from);
    if (same || !inside(from.f, from.r)) fallbackHints.clear();
    else fallbackHints.select(board, from);
    // Native hints may appear later in the same event; let them take over without duplicates.
    setTimeout(() => fallbackHints.refresh(), 0);
  }, true);
  window.addEventListener('pointercancel', () => fallbackHints.clear());
  listeners.add(() => fallbackHints.refresh());
  setInterval(() => {
    fallbackHints.refresh();
    if (!blunderHints.ctl) return;
    if (!blunderHints.ctl.board.isConnected || document.hidden) blunderHints.clear();
    else blunderHints.ctl.paintHints(); // Also catches position changes and canvas board flips.
  }, 150);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { fallbackHints.clear(); blunderHints.clear(); }
    else document.querySelectorAll('wc-chess-board, chess-board').forEach(b => b.__cc?.paintHints());
  });

  // ---------- winning side ----------

  // A crown on the avatar of the favored side. Use the visible evaluation when available,
  // otherwise evaluate the current position locally; an equal score shows no crown.
  const CROWN_SVG = `<svg viewBox="0 0 32 24" aria-hidden="true">
    <defs><linearGradient id="bs-crown-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe58a"/><stop offset=".55" stop-color="#f5b52e"/><stop offset="1" stop-color="#c47d12"/></linearGradient></defs>
    <path d="M3 8.5l6.2 5.2L16 3l6.8 10.7L29 8.5l-2.6 12.3H5.6z" fill="url(#bs-crown-gold)" stroke="#8a5208" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="5.4" y="19.2" width="21.2" height="3.3" rx="1.2" fill="#e09a1f" stroke="#8a5208" stroke-width="1"/>
    <circle cx="3" cy="8.5" r="2" fill="#ffe58a" stroke="#8a5208" stroke-width=".9"/>
    <circle cx="16" cy="3" r="2.2" fill="#ffe58a" stroke="#8a5208" stroke-width=".9"/>
    <circle cx="29" cy="8.5" r="2" fill="#ffe58a" stroke="#8a5208" stroke-width=".9"/>
    <circle cx="16" cy="15" r="2" fill="#e5534b"/><circle cx="10.2" cy="16.6" r="1.3" fill="#7fd6a0"/><circle cx="21.8" cy="16.6" r="1.3" fill="#9db8ff"/>
    <path d="M7.5 12.8l2 1.6" stroke="#fff6cf" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
  </svg>`;

  const crownStyle = document.createElement('style');
  crownStyle.textContent = `
    .bs-crown {
      position: fixed; width: 28px; height: 21px; z-index: 2147482999; pointer-events: none;
      transform: translateX(-50%) rotate(-14deg); filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .45));
      animation: bs-crown-in 560ms cubic-bezier(.34, 1.6, .64, 1) both;
    }
    .bs-crown svg { display: block; width: 100%; height: 100%; }
    .bs-crown.bs-leave { animation: bs-crown-out 280ms ease forwards; }
    @keyframes bs-crown-in { from { opacity: 0; transform: translate(-50%, -16px) rotate(-40deg) scale(.4); } }
    @keyframes bs-crown-out { to { opacity: 0; transform: translate(-50%, -14px) rotate(12deg) scale(.6); } }
  `;
  document.head.appendChild(crownStyle);

  // Render outside the player row: avatar wrappers can clip overflow and sit
  // beneath the board's stacking context, regardless of the crown's own z-index.
  function positionCrowns() {
    document.querySelectorAll('.bs-crown').forEach(crown => {
      const avatar = crown.bsAvatar;
      if (!avatar?.isConnected || !avatar.getClientRects().length) { crown.remove(); return; }
      const rect = avatar.getBoundingClientRect();
      crown.style.left = `${rect.left + rect.width / 2}px`;
      crown.style.top = `${Math.max(4, rect.top - 16)}px`;
    });
  }
  window.addEventListener('scroll', positionCrowns, true);
  window.addEventListener('resize', positionCrowns);

  // 'w', 'b' or null, from the eval bar's score (always from white's side: "+0.3", "-1.2", "M3", "1-0").
  function evalLeader() {
    const bar = document.querySelector('wc-evaluation-bar');
    if (!bar || !bar.getClientRects().length) return null;
    const text = ((bar.querySelector('.evaluation-bar-score') || {}).textContent || '').trim();
    if (text === '1-0') return 'w';
    if (text === '0-1') return 'b';
    const negative = /^[-−]/.test(text);
    if (/M/i.test(text)) return negative ? 'b' : 'w';
    const value = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!value) return null;
    return negative ? 'b' : 'w';
  }


  const engine = {
    worker: null, ready: false, searching: false, fen: null, next: null, result: null,
    start() {
      if (this.worker || this.starting) return;
      this.starting = true;
      withEngineFiles(files => {
        this.starting = false;
        try { this.worker = createEngineWorker(files).worker; } catch (e) { return; }
        this.worker.onmessage = event => this.receive(String(event.data));
        this.send('uci');
      }, () => { this.starting = false; });
    },
    send(command) { if (this.worker) this.worker.postMessage(command); },
    receive(line) {
      if (line === 'uciok') {
        this.send('setoption name Hash value 32');
        this.send('isready');
      } else if (line === 'readyok') {
        this.ready = true;
        if (this.next) this.go();
      } else if (line.startsWith('bestmove')) {
        this.searching = false;
        if (this.next && this.next !== this.fen) this.go();
      } else if (line.startsWith('info ') && this.searching) {
        if (/ (lower|upper)bound/.test(line)) return;
        const depth = line.match(/ depth (\d+)/);
        const score = line.match(/ score (cp|mate) (-?\d+)/);
        if (!depth || !score) return;
        // Scores come from the side to move; keep them from white's side.
        const sign = this.fen.split(' ')[1] === 'w' ? 1 : -1;
        const value = Number(score[2]);
        this.result = score[1] === 'mate'
          ? { depth: +depth[1], mate: value === 0 ? -sign : value * sign }
          : { depth: +depth[1], cp: value * sign };
        syncCrown();
      }
    },
    // Search this position, keeping on going deeper until the position changes.
    analyse(fen) {
      if (!fen || fen === this.next) return;
      this.next = fen;
      this.start();
      if (!this.ready) return;
      if (this.searching) this.send('stop'); // the new search starts once this one reports back
      else this.go();
    },
    go() {
      this.fen = this.next;
      this.result = null;
      this.searching = true;
      this.send(`position fen ${this.fen}`);
      this.send('go depth 60');
    },
    stop() {
      this.next = null;
      if (this.searching) this.send('stop');
    }
  };

  function engineLeader() {
    const board = document.querySelector('wc-chess-board, chess-board');
    let fen = null;
    try { fen = board && board.game && board.game.getFEN(); } catch (e) { /* no game yet */ }
    if (!fen) { engine.stop(); return null; }
    engine.analyse(fen);
    const r = engine.fen === fen ? engine.result : null;
    if (!r) return null;
    if (r.mate !== undefined) return r.mate > 0 ? 'w' : 'b';
    return r.cp > 0 ? 'w' : r.cp < 0 ? 'b' : null;
  }

  function syncCrown() {
    let leader = null;
    if (settings.crown.on) {
      const bar = document.querySelector('wc-evaluation-bar');
      if (bar && bar.getClientRects().length) {
        engine.stop();
        leader = evalLeader();
      } else if (engineAllowed()) {
        leader = engineLeader();
      } else {
        engine.stop();
      }
    } else {
      engine.stop();
    }
    const board = document.querySelector('wc-chess-board, chess-board');
    const flipped = !!board && (board.__cc ? board.__cc.flipped : board.classList.contains('flipped'));
    // Current bot/live layouts use #player-top/bottom; older layouts use
    // #board-layout-player-top/bottom. Pick a visible avatar during layout transitions.
    const avatar = side => {
      const rows = document.querySelectorAll(`#player-${side}, #board-layout-player-${side}`);
      for (const row of rows) {
        for (const element of row.querySelectorAll('.cc-avatar-component, .player-row-avatar, .player-avatar')) {
          if (element.getClientRects().length) {
            return element;
          }
        }
      }
      return null;
    };
    const winner = leader ? avatar((leader === 'w') !== flipped ? 'bottom' : 'top') : null;
    document.querySelectorAll('.bs-crown:not(.bs-leave)').forEach(crown => {
      if (crown.bsAvatar === winner) return;
      crown.classList.add('bs-leave');
      setTimeout(() => crown.remove(), 300);
    });
    if (winner && ![...document.querySelectorAll('.bs-crown:not(.bs-leave)')].some(c => c.bsAvatar === winner)) {
      const crown = document.createElement('span');
      crown.className = 'bs-crown';
      crown.bsAvatar = winner;
      crown.innerHTML = CROWN_SVG;
      document.body.appendChild(crown);
    }
    positionCrowns();
  }
  listeners.add(syncCrown);
  setInterval(syncCrown, 150);

  // ---------- boot ----------

  applySettings();
  applyStyle();
  playFlow();
  const tick = () => {
    document.querySelectorAll('svg.arrows').forEach(svg => { if (!svg.__cc) new Controller(svg); });
    document.querySelectorAll('svg.cc-arrows:not(.bs-canvas)').forEach(o => {
      if (!o.previousElementSibling || !o.previousElementSibling.__cc) o.remove();
    });
    // Canvas boards (Arcade / Natural / 3D): hook the renderer, again whenever chess.com swaps it.
    document.querySelectorAll('wc-chess-board, chess-board').forEach(board => {
      const game = board.game;
      if (!game || typeof game.getRenderer !== 'function' || !board.querySelector(':scope > canvas')) return;
      const renderer = game.getRenderer();
      if (!renderer || typeof renderer.addMoveHints !== 'function') return;
      const ctl = board.__cc;
      if (ctl instanceof CanvasController && ctl.renderer === renderer) { ctl.place(); return; }
      if (ctl instanceof CanvasController) ctl.overlay.remove();
      new CanvasController(board);
    });
    document.querySelectorAll('svg.bs-canvas').forEach(o => {
      const board = o.parentElement;
      if (!board || !board.__cc || board.__cc.overlay !== o) o.remove();
    });
    document.querySelectorAll('wc-chess-board, chess-board').forEach(board => {
      const ctl = board.__cc;
      if (!ctl || !board.game || typeof board.game.getFEN !== 'function') return;
      let fen = null;
      try { fen = board.game.getFEN(); } catch (e) { return; }
      if (fen !== ctl.bookFen) { ctl.bookFen = fen; ctl.scheduleArrows(); }
    });
    ensureNavButton();
    watchSidebar();
  };
  tick();
  setInterval(tick, 500);
  setInterval(() => {
    document.querySelectorAll('wc-chess-board, chess-board').forEach(board => {
      const ctl = board.__cc;
      if (!ctl || !settings.book.on || !board.game || typeof board.game.getFEN !== 'function') return;
      let fen = null;
      try { fen = board.game.getFEN(); } catch (e) { return; }
      if (fen !== ctl.bookFen) { ctl.bookFen = fen; ctl.scheduleArrows(); }
    });
  }, 120);
})();
