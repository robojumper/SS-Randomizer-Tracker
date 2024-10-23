!function(){"use strict";var e={7451:function(e,n,t){var r=t(7762),i=t(3324),o=t(9062),u=t(5671),a=t(3144),s=BigInt(1),c=BigInt(0);var f=function(){function e(n,t){(0,u.Z)(this,e),this.data=void 0,this.intSet=void 0,this.data=null!==n&&void 0!==n?n:c,this.intSet=null!==t&&void 0!==t?t:new Set}return(0,a.Z)(e,[{key:"setBit",value:function(e){return this.data|=s<<BigInt(e),this.intSet.add(e),this}},{key:"clearBit",value:function(e){return this.intSet.has(e)&&(this.data=this.data-(s<<BigInt(e)),this.intSet.delete(e)),this}},{key:"and",value:function(n){return new e(n.data&this.data,function(e,n){if(e.size>n.size){var t=e;e=n,n=t}return new Set((0,o.Z)(e).filter((function(e){return n.has(e)})))}(n.intSet,this.intSet))}},{key:"or",value:function(n){return new e(n.data|this.data,(t=n.intSet,r=this.intSet,new Set([].concat((0,o.Z)(t),(0,o.Z)(r)))));var t,r}},{key:"test",value:function(e){return this.intSet.has(e)}},{key:"isSubsetOf",value:function(e){return this.numSetBits<=e.numSetBits&&(this.data|e.data)===e.data}},{key:"equals",value:function(e){return this.data===e.data}},{key:"toString",value:function(e){for(var n="",t=e-1;t>=0;t--)this.data&s<<BigInt(t)?n+="1":n+="0";return n}},{key:"clone",value:function(){return new e(this.data,new Set(this.intSet))}},{key:"isEmpty",value:function(){return 0===this.numSetBits}},{key:"intersects",value:function(e){return Boolean(this.data&e.data)}},{key:"iter",value:function(){return this.intSet.values()}},{key:"getSingleSetBit",value:function(){return this.intSet.values().next().value}},{key:"numSetBits",get:function(){return this.intSet.size}}]),e}(),l=function(){function e(n){(0,u.Z)(this,e),this.conjunctions=void 0,this.conjunctions=n}return(0,a.Z)(e,[{key:"or",value:function(n){return new e([].concat((0,o.Z)(this.conjunctions),n instanceof f?[n]:(0,o.Z)(n.conjunctions)))}},{key:"and",value:function(n){return n instanceof f?new e(v(this.conjunctions,[n])):this.isTriviallyFalse()||n.isTriviallyFalse()?e.false():new e(v(this.conjunctions,n.conjunctions))}},{key:"drop_unless",value:function(n,t){return new e(this.conjunctions.map((function(e){return e.test(t)?e:e.clone().clearBit(n)})))}},{key:"removeDuplicates",value:function(){var n=[];e:for(var t=0;t<this.conjunctions.length;t++){var o,u=this.conjunctions[t],a=[],s=(0,r.Z)(n.entries());try{for(s.s();!(o=s.n()).done;){var c=(0,i.Z)(o.value,2),f=c[0],l=c[1];if(l.isSubsetOf(u))continue e;u.isSubsetOf(l)&&a.push(f)}}catch(p){s.e(p)}finally{s.f()}for(var v=a.length-1;v>=0;v--){var h=a[v];h===n.length-1?n.pop():n[h]=n.pop()}n.push(u)}return new e(n)}},{key:"orExtended",value:function(n){var t=(0,o.Z)(this.conjunctions),r=[],i=!1,u=n.conjunctions;e:for(var a=0;a<u.length;a++){for(var s=u[a],c=0;c<t.length;c++){if(t[c].isSubsetOf(s))continue e}r.push(s),i=!0}return[i,new e([].concat((0,o.Z)(t),r))]}},{key:"eval",value:function(e){return this.conjunctions.some((function(n){return n.isSubsetOf(e)}))}},{key:"isTriviallyFalse",value:function(){return 0===this.conjunctions.length}},{key:"isTriviallyTrue",value:function(){return this.conjunctions.length>0&&this.conjunctions.some((function(e){return e.isEmpty()}))}},{key:"clone",value:function(){return new e(this.conjunctions.map((function(e){return e.clone()})))}}],[{key:"false",value:function(){return new e([])}},{key:"true",value:function(){return new e([new f])}}]),e}();function v(e,n){var t,i=[],o=(0,r.Z)(e);try{for(o.s();!(t=o.n()).done;){var u,a=t.value,s=(0,r.Z)(n);try{for(s.s();!(u=s.n()).done;){var c=u.value;i.push(a.or(c))}}catch(f){s.e(f)}finally{s.f()}}}catch(f){o.e(f)}finally{o.f()}return i}function h(e){var n,t=(0,r.Z)(e.entries());try{for(t.s();!(n=t.n()).done;){var o=(0,i.Z)(n.value,2),u=o[0],a=o[1];a.conjunctions.length>=2&&(e[u]=a.removeDuplicates())}}catch(s){t.e(s)}finally{t.f()}}function p(e,n){var t,o=n.map((function(){return[]})),u=(0,r.Z)(n.entries());try{for(u.s();!(t=u.n()).done;){var a=(0,i.Z)(t.value,2),s=a[0],c=a[1];if(!e.test(s)){var f,l=(0,r.Z)(c.conjunctions);try{for(l.s();!(f=l.n()).done;){var v=f.value;if(1===v.numSetBits){var h=v.getSingleSetBit();if(h===s||e.test(h))continue;o[h].push(s)}}}catch(k){l.e(k)}finally{l.f()}}}}catch(k){u.e(k)}finally{u.f()}for(var p=!1,y=0;y<n.length;y++){var m,g=o[y],Z=(0,r.Z)(g);try{for(Z.s();!(m=Z.n()).done;){d(n,y,m.value)&&(p=!0)}}catch(k){Z.e(k)}finally{Z.f()}}return p}function d(e,n,t){var i=e[n],o=e[t];if(i.conjunctions.length<2||o.conjunctions.length<2)return!1;var u=i.conjunctions.findIndex((function(e){return 1===e.numSetBits&&e.test(t)}));if(-1===u)return!1;if(-1===o.conjunctions.findIndex((function(e){return 1===e.numSetBits&&e.test(n)})))return!1;var a,s=i.conjunctions.slice(),c=s.splice(u,1),f=(0,r.Z)(s);try{for(f.s();!(a=f.n()).done;){var v=a.value;e[t]=e[t].or(v)}}catch(h){f.e(h)}finally{f.f()}return e[n]=new l(c),!0}function y(e,n){for(var t=new f,o=!1,u=0;u<n.length;u++)!e.test(u)&&n[u].conjunctions.length<=1&&t.setBit(u);var a,s=(0,r.Z)(n.entries());try{for(s.s();!(a=s.n()).done;){var c=(0,i.Z)(a.value,2),v=c[0],h=c[1];if(!(h.conjunctions.length>=30)){var p,d=l.false(),y=(0,r.Z)(h.conjunctions);try{for(y.s();!(p=y.n()).done;){var m=p.value;if(m.intersects(t)){o=!0;var g,Z=new f,k=!1,w=(0,r.Z)(m.iter());try{for(w.s();!(g=w.n()).done;){var S=g.value;if(t.test(S)){var B=n[S];if(B.isTriviallyTrue())continue;if(B.isTriviallyFalse()){k=!0;break}Z=Z.or(B.conjunctions[0])}else Z.setBit(S)}}catch(x){w.e(x)}finally{w.f()}k||Z.test(v)||(d=d.or(Z))}else d=d.or(m)}}catch(x){y.e(x)}finally{y.f()}n[v]=d}}}catch(x){s.e(x)}finally{s.f()}return o}var m,g=t(4942),Z=t(763),k=t.n(Z);!function(e){e.And="and",e.Or="or"}(m||(m={}));var w,S=function(){function e(n,t){(0,u.Z)(this,e),this.type=void 0,this.items=void 0,this.items=n,this.type=t}return(0,a.Z)(e,[{key:"isAnd",value:function(){return this.type===m.And}},{key:"isOr",value:function(){return this.type===m.Or}},{key:"reduce",value:function(n){var t=n.andInitialValue,r=n.andReducer,i=n.orInitialValue,o=n.orReducer,u=function(n,u){return e.isExpression(u)?{accumulator:n,item:u.reduce({andInitialValue:t,andReducer:r,orInitialValue:i,orReducer:o}),isReduced:!0}:{accumulator:n,item:u,isReduced:!1}};if(this.isAnd())return k().reduce(this.items,(function(e,n){return r(u(e,n))}),t);if(this.isOr())return k().reduce(this.items,(function(e,n){return o(u(e,n))}),i);throw Error("Invalid type: ".concat(this.type))}},{key:"evaluate",value:function(e){return this.reduce({andInitialValue:!0,andReducer:function(n){var t=n.accumulator,r=n.item,i=n.isReduced;return t&&(i?r:e(r))},orInitialValue:!1,orReducer:function(n){var t=n.accumulator,r=n.item,i=n.isReduced;return t||(i?r:e(r))}})}},{key:"simplify",value:function(e){for(var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:3,t=this.flatten(),r=0;r<n;r++)t=(t=(t=t.removeDuplicateChildren(e)).removeDuplicateExpressions(e)).shiftWeakerTermsUp(e);return t}},{key:"oppositeType",value:function(){if(this.isAnd())return m.Or;if(this.isOr())return m.And;throw Error("Invalid type for boolean expression: ".concat(this.type))}},{key:"isEqualTo",value:function(n,t){if(!e.isExpression(n)||this.type!==n.type||this.items.length!==n.items.length)return!1;var r=k().xorWith(this.items,n.items,(function(n,r){return e.isExpression(n)?n.isEqualTo(r,t):!e.isExpression(r)&&t(n,r)}));return k().isEmpty(r)}},{key:"flatten",value:function(){var n=this,t=this.items.flatMap((function(t){if(!e.isExpression(t))return t;var r=t.flatten();return k().isEmpty(r.items)?[]:r.type===n.type||1===r.items.length?r.items:r}));if(1===t.length){var r=k().first(t);if(e.isExpression(r))return r}return new e(t,this.type)}},{key:"getUpdatedParentItems",value:function(n){return k().mergeWith({},n,(0,g.Z)({},this.type,this.items),(function(n,t){if(k().isArray(n))return k().concat(n,k().filter(t,(function(n){return!e.isExpression(n)})))}))}},{key:"removeDuplicateChildrenHelper",value:function(n,t){var r=this,i=[],o=this.getUpdatedParentItems(t),u=k().get(t,this.type),a=k().get(t,this.oppositeType()),s=!1;if(this.items.forEach((function(t){if(e.isExpression(t)){var c=t.removeDuplicateChildrenHelper(n,o),f=c.expression;if(c.removeParent)return s=!0,!1;i.push(f)}else{if(e.itemIsSubsumed(a,t,r.oppositeType(),n))return s=!0,!1;e.itemIsSubsumed(u,t,r.type,n)||i.push(t)}return!0})),s)return{expression:e.and(),removeParent:!1};var c=e.createFlatExpression(i,this.type);return k().isEmpty(c.items)?{expression:e.and(),removeParent:!0}:{expression:c,removeParent:!1}}},{key:"removeDuplicateChildren",value:function(e){var n;return this.removeDuplicateChildrenHelper(e,(n={},(0,g.Z)(n,m.And,[]),(0,g.Z)(n,m.Or,[]),n)).expression}},{key:"isSubsumedBy",value:function(n,t,r,i){var o=this;return this.isEqualTo(n,(function(e,n){return t(e,n)&&t(n,e)}))?r:n.items.every((function(n){return e.isExpression(n)?o.isSubsumedBy(n,t,!0,i):e.itemIsSubsumed(o.items,n,i,t)}))}},{key:"expressionIsSubsumed",value:function(n,t,r){var i=this,o=!1;return this.items.forEach((function(u,a){return a===t||(s=e.isExpression(u)?u:e.and(u),!n.isSubsumedBy(s,r,a<t,i.oppositeType())||(o=!0,!1));var s})),o}},{key:"removeDuplicateExpressionsInChildren",value:function(n){var t=this.items.map((function(t){return e.isExpression(t)?t.removeDuplicateExpressions(n):t}));return e.createFlatExpression(t,this.type)}},{key:"removeDuplicateExpressions",value:function(n){var t=this.removeDuplicateExpressionsInChildren(n),r=t.items.filter((function(r,i){var o;return o=e.isExpression(r)?r:e.and(r),!t.expressionIsSubsumed(o,i,n)}));if(this.type===m.Or&&r.length>=2&&k().every(k().map(r,e.isExpression))){var i=[],u=r;if(k().forEach(u[0].items,(function(e){k().every(k().map(u,(function(n){return k().includes(n.items,e)})))&&i.push(e)})),i.length)return new e([].concat(i,[new e((0,o.Z)(r.filter((function(e){return!i.includes(e)}))),this.type)]),this.oppositeType())}return e.createFlatExpression(r,this.type)}},{key:"shiftWeakerTermsUp",value:function(n){var t=this.removeDuplicateExpressionsInChildren(n);if(t.isOr()&&t.items.every((function(n){return!e.isExpression(n)||n.isAnd()}))){var i,u=(0,r.Z)(t.items);try{for(u.s();!(i=u.n()).done;){var a=i.value;if(e.isExpression(a)){var s,c=(0,r.Z)(a.items);try{var f=function(){var r=s.value;if(e.isExpression(r)&&t.items.every((function(e,t){return e.expressionIsSubsumed(r,t,n)})))return console.log("blub"),{v:e.and(r,e.or.apply(e,(0,o.Z)(t.items)))}};for(c.s();!(s=c.n()).done;){var l=f();if("object"===typeof l)return l.v}}catch(v){c.e(v)}finally{c.f()}}}}catch(v){u.e(v)}finally{u.f()}}return t}}],[{key:"and",value:function(){for(var n=arguments.length,t=new Array(n),r=0;r<n;r++)t[r]=arguments[r];return new e(t,m.And)}},{key:"or",value:function(){for(var n=arguments.length,t=new Array(n),r=0;r<n;r++)t[r]=arguments[r];return new e(t,m.Or)}},{key:"isExpression",value:function(n){return"object"===typeof n&&n instanceof e}},{key:"createFlatExpression",value:function(n,t){return new e(n,t).flatten()}},{key:"itemIsSubsumed",value:function(e,n,t,r){var i=this,o=!1;return e.forEach((function(e){if(i.isExpression(e))return!0;switch(t){case m.And:if(r(e,n))return o=!0,!1;break;case m.Or:if(r(n,e))return o=!0,!1}return!0})),o}}]),e}(),B=S;function x(e){var n,t=[],i=(0,r.Z)(e);try{for(i.s();!(n=i.n()).done;){var o,u=n.value,a=new f,s=(0,r.Z)(u);try{for(s.s();!(o=s.n()).done;){var c=o.value;a.setBit(c)}}catch(v){s.e(v)}finally{s.f()}t.push(a)}}catch(v){i.e(v)}finally{i.f()}return new l(t)}function b(e){return E(e)}function E(e){if(!B.isExpression(e))return e;switch(e.type){case m.And:return{type:"and",items:e.items.map(E)};case m.Or:return{type:"or",items:e.items.map(E)}}}function j(e){return function(n,t){var r;return n===t||Boolean(null===(r=e.impliedBy[t])||void 0===r?void 0:r.includes(n))}}function I(e,n){if(0===n.length)return B.or();if(1===n.length&&n[0].isEmpty())return B.and();if(1===n.length)return B.and.apply(B,(0,o.Z)((0,o.Z)(n[0].iter()).map((function(n){return e.allItems[n]})))).simplify(j(e));var t,u=new l(n).removeDuplicates().conjunctions,a=(0,r.Z)(u);try{for(a.s();!(t=a.n()).done;)for(var s=t.value,c=0,v=(0,o.Z)(s.iter());c<v.length;c++){var h,p,d=v[c],y=(0,r.Z)(null!==(h=e.impliedBy[e.allItems[d]])&&void 0!==h?h:[]);try{for(y.s();!(p=y.n()).done;){var m=p.value,g=e.itemBits[m];g!==d&&s.test(g)&&s.clearBit(d)}}catch(ue){y.e(ue)}finally{y.f()}}}catch(ue){a.e(ue)}finally{a.f()}var Z,w=new Set(u[0].iter()),S=(0,r.Z)(u);try{for(S.s();!(Z=S.n()).done;){var x=Z.value;w=new Set((0,o.Z)(x.iter()).filter((function(e){return w.has(e)})))}}catch(ue){S.e(ue)}finally{S.f()}var b,E=new Set,D=(0,r.Z)(u);try{for(D.s();!(b=D.n()).done;){var F,A=b.value,C=(0,r.Z)(w);try{for(C.s();!(F=C.n()).done;){var R=F.value;A.clearBit(R)}}catch(ue){C.e(ue)}finally{C.f()}var U,z=(0,r.Z)(A.iter());try{for(z.s();!(U=z.n()).done;){var P=U.value;E.add(P)}}catch(ue){z.e(ue)}finally{z.f()}}}catch(ue){D.e(ue)}finally{D.f()}var _=q(u,(0,o.Z)(E),new f).filter((function(e){return!e.coKernel.isEmpty()})),K=_.reduce((function(e,n){var t,i=(0,r.Z)(n.kernel);try{var o=function(){var n=t.value;e.some((function(e){return n.equals(e)}))||e.push(n)};for(i.s();!(t=i.n()).done;)o()}catch(ue){i.e(ue)}finally{i.f()}return e}),[]),V=_;if(V.length>0&&K.length>0){var H,W=Array(V.length).fill([]).map((function(){return Array(K.length).fill(0)})),M=(0,r.Z)(K.entries());try{var G=function(){var e,n=(0,i.Z)(H.value,2),t=n[0],o=n[1],u=(0,r.Z)(V.entries());try{for(u.s();!(e=u.n()).done;){var a=(0,i.Z)(e.value,2),s=a[0];a[1].kernel.some((function(e){return e.equals(o)}))&&(W[s][t]=1)}}catch(ue){u.e(ue)}finally{u.f()}};for(M.s();!(H=M.n()).done;)G()}catch(ue){M.e(ue)}finally{M.f()}var J=function(e){return V[e].coKernel.numSetBits+1},L=function(e){return K[e].numSetBits},N=function(e,n){return k().sumBy(e,(function(e){return k().sumBy(n,(function(n){return W[e][n]?function(e,n){return V[n].coKernel.or(K[e]).numSetBits}(n,e):0}))}))-k().sumBy(e,J)-k().sumBy(n,L)},Q=[];if(function(e,n,t,i){var o,u=(0,r.Z)(e);try{var a=function(){var r=o.value,u=n.filter((function(e){return t[r][e]}));u.length&&!e.some((function(e){return e!==r&&n.every((function(n){return!u.includes(n)||t[e][n]}))}))&&i([r],u)};for(u.s();!(o=u.n()).done;)a()}catch(ue){u.e(ue)}finally{u.f()}var s,c=(0,r.Z)(n);try{var f=function(){var r=s.value,o=e.filter((function(e){return t[e][r]}));o.length&&!n.some((function(n){return n!==r&&e.every((function(e){return!o.includes(e)||t[e][n]}))}))&&i(o,[r])};for(c.s();!(s=c.n()).done;)f()}catch(ue){c.e(ue)}finally{c.f()}O(e,n,t,0,[],[],i)}(V.map((function(e,n){return n})),K.map((function(e,n){return n})),W,(function(e,n){return Q.push([e,n]),!0})),Q.length){var X=k().maxBy(Q,(function(e){var n=(0,i.Z)(e,2),t=n[0],r=n[1];return N(t,r)})),Y=(0,i.Z)(X,2)[1].map((function(e){return K[e]})),$=T(u,Y),ee=$.quotient,ne=$.remainder,te=new l(ee).removeDuplicates(),re=(0,o.Z)(w).map((function(n){return e.allItems[n]})),ie=B.and(I(e,te.conjunctions),I(e,Y)),oe=B.or(ie,I(e,ne));return B.and.apply(B,(0,o.Z)(re).concat([oe])).simplify(j(e))}}return B.and.apply(B,(0,o.Z)((0,o.Z)(w).map((function(n){return e.allItems[n]}))).concat([B.or.apply(B,(0,o.Z)(u.map((function(n){return function(e,n){return B.and.apply(B,(0,o.Z)((0,o.Z)(n.iter()).map((function(n){return e.allItems[n]}))))}(e,n)}))))])).simplify(j(e))}function O(e,n,t,i,o,u,a){var s,c=(0,r.Z)(n);try{var f=function(){var o=s.value;if(o>=i&&e.filter((function(e){return t[e][o]})).length>=2){var c,f=t.map((function(e,n){return t[n][o]?e.slice():e.map((function(){return 0}))})),l=e.filter((function(e){return t[e][o]})),v=u.slice(),h=!1,p=(0,r.Z)(n);try{var d=function(){var n=c.value;if(e.filter((function(e){return f[e][n]})).length===e.filter((function(e){return t[e][o]})).length){if(n<o)return h=!0,"break";v.push(n);var i,u=(0,r.Z)(e);try{for(u.s();!(i=u.n()).done;){var a=i.value;f[a][n]=0}}catch(s){u.e(s)}finally{u.f()}}};for(p.s();!(c=p.n()).done;){if("break"===d())break}}catch(y){p.e(y)}finally{p.f()}if(!h)a(l,v)||O(e,n,f,o,l,v,a)}};for(c.s();!(s=c.n()).done;)f()}catch(l){c.e(l)}finally{c.f()}}function q(e,n,t){var o,u=arguments.length>3&&void 0!==arguments[3]?arguments[3]:[],a=arguments.length>4&&void 0!==arguments[4]?arguments[4]:0,s=[],c=(0,r.Z)(n.entries());try{var f=function(){var c=(0,i.Z)(o.value,2),f=c[0],l=c[1];if(f<a)return"continue";var v=e.filter((function(e){return e.test(l)}));if(v.length>=2){var h,p=v.reduce((function(e,n){return e.and(n)}),v[0]),d=t.or(p),y=q(T(e,[p]).quotient,n,d,u,f+1),m=(0,r.Z)(y);try{var g=function(){var e=h.value;u.some((function(n){return n.equals(e.coKernel)}))||(u.push(e.coKernel),s.push(e))};for(m.s();!(h=m.n()).done;)g()}catch(Z){m.e(Z)}finally{m.f()}}};for(c.s();!(o=c.n()).done;)f()}catch(l){c.e(l)}finally{c.f()}return u.some((function(e){return e.equals(t)}))||s.push({kernel:e,coKernel:t.clone()}),s}function T(e,n){var t,i,o=(0,r.Z)(n);try{var u=function(){var n=i.value,o=e.filter((function(e){return n.isSubsetOf(e)})).map((function(e){return e.clone()}));if(0===o.length)return{v:{quotient:[],remainder:e}};var u,a=(0,r.Z)(o);try{for(a.s();!(u=a.n()).done;){var s,c=u.value,f=(0,r.Z)(n.iter());try{for(f.s();!(s=f.n()).done;){var l=s.value;c.clearBit(l)}}catch(v){f.e(v)}finally{f.f()}}}catch(v){a.e(v)}finally{a.f()}t=t?t.filter((function(e){return o.some((function(n){return n.equals(e)}))})):o};for(o.s();!(i=o.n()).done;){var a=u();if("object"===typeof a)return a.v}}catch(f){o.e(f)}finally{o.f()}var s=new l(t).and(new l(n)).removeDuplicates(),c=e.filter((function(e){return!s.conjunctions.some((function(n){return n.isSubsetOf(e)}))}));return{quotient:t,remainder:c}}console.log("Hello from worker!"),onmessage=function(e){var n=performance.now();switch(e.data.type){case"initialize":var t,o=new f,u=(0,r.Z)(e.data.opaqueBits);try{for(u.s();!(t=u.n()).done;){var a=t.value;o.setBit(a)}}catch(d){u.e(d)}finally{u.f()}var s=e.data.requirements.map(x);w={logic:e.data.logic,opaqueBits:o,learned:new Set,requirementsForBottomUp:s};do{for(h(w.requirementsForBottomUp);y(w.opaqueBits,w.requirementsForBottomUp);)h(w.requirementsForBottomUp)}while(p(w.opaqueBits,w.requirementsForBottomUp));console.log("worker","initializing and pre-simplifying took",performance.now()-n,"ms");var c=performance.now();!function(e,n){var t,o=n.map((function(n){return new l(n.conjunctions.filter((function(n){return!n.isSubsetOf(e)})))})),u=new f,a=(0,r.Z)(n.entries());try{for(a.s();!(t=a.n()).done;){var s=(0,i.Z)(t.value,2),c=s[0],v=s[1],h=new l(v.conjunctions.filter((function(n){return n.isSubsetOf(e)})));n[c]=h,h.isTriviallyFalse()&&!e.test(c)||u.setBit(c)}}catch(d){a.e(d)}finally{a.f()}for(var p=!0,y=0,m=void 0;p;){y++,p=!1;var g,Z=new f,k=m?m.and(u):u,w=(0,r.Z)(o.entries());try{for(w.s();!(g=w.n()).done;){var S=(0,i.Z)(g.value,2),B=S[0],x=S[1];if(!n[B].isTriviallyTrue()){var b,E=l.false(),j=(0,r.Z)(x.conjunctions);try{for(j.s();!(b=j.n()).done;){var I=b.value;if(I.isSubsetOf(u)&&I.intersects(k)){var O,q=new f,T=l.true(),D=(0,r.Z)(I.iter());try{for(D.s();!(O=D.n()).done;){var F=O.value;if(e.test(F))q.setBit(F);else{var A=n[F];T=T.and(A).removeDuplicates()}}}catch(d){D.e(d)}finally{D.f()}var C,R=(0,r.Z)(T.conjunctions);try{for(R.s();!(C=R.n()).done;){var U=C.value;E=E.or(U.or(q))}}catch(d){R.e(d)}finally{R.f()}}}}catch(d){j.e(d)}finally{j.f()}var z=n[B].orExtended(E),P=(0,i.Z)(z,2),_=P[0],K=P[1];_&&(Z.setBit(B),p=!0,n[B]=K.removeDuplicates(),u.setBit(B))}}}catch(d){w.e(d)}finally{w.f()}m=Z}console.log("bottom-up tooltip requirements took",y,"rounds")}(w.opaqueBits,w.requirementsForBottomUp),console.log("worker","fixpoint propagation took",performance.now()-c,"ms");break;case"analyze":if(!w)throw new Error("needs to be initialized first!!!!");var v=function(e){var n=w.logic.itemBits[e],t=w.requirementsForBottomUp[n].removeDuplicates(),r=performance.now(),i=I(w.logic,t.conjunctions);return console.log("  ","worker","simplifying took",performance.now()-r,"ms"),i}(e.data.checkId);console.log("worker","total time for",e.data.checkId,"was",performance.now()-n,"ms"),postMessage({checkId:e.data.checkId,expression:b(v)})}}}},n={};function t(r){var i=n[r];if(void 0!==i)return i.exports;var o=n[r]={id:r,loaded:!1,exports:{}};return e[r].call(o.exports,o,o.exports,t),o.loaded=!0,o.exports}t.m=e,t.x=function(){var e=t.O(void 0,[361],(function(){return t(7451)}));return e=t.O(e)},function(){var e=[];t.O=function(n,r,i,o){if(!r){var u=1/0;for(f=0;f<e.length;f++){r=e[f][0],i=e[f][1],o=e[f][2];for(var a=!0,s=0;s<r.length;s++)(!1&o||u>=o)&&Object.keys(t.O).every((function(e){return t.O[e](r[s])}))?r.splice(s--,1):(a=!1,o<u&&(u=o));if(a){e.splice(f--,1);var c=i();void 0!==c&&(n=c)}}return n}o=o||0;for(var f=e.length;f>0&&e[f-1][2]>o;f--)e[f]=e[f-1];e[f]=[r,i,o]}}(),t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,{a:n}),n},t.d=function(e,n){for(var r in n)t.o(n,r)&&!t.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:n[r]})},t.f={},t.e=function(e){return Promise.all(Object.keys(t.f).reduce((function(n,r){return t.f[r](e,n),n}),[]))},t.u=function(e){return"static/js/"+e+".2ad77e15.chunk.js"},t.miniCssF=function(e){},t.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"===typeof window)return window}}(),t.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},t.nmd=function(e){return e.paths=[],e.children||(e.children=[]),e},t.p="/SS-Randomizer-Tracker/",function(){var e={451:1};t.f.i=function(n,r){e[n]||importScripts(t.p+t.u(n))};var n=self.webpackChunkss_randomizer_tracker=self.webpackChunkss_randomizer_tracker||[],r=n.push.bind(n);n.push=function(n){var i=n[0],o=n[1],u=n[2];for(var a in o)t.o(o,a)&&(t.m[a]=o[a]);for(u&&u(t);i.length;)e[i.pop()]=1;r(n)}}(),function(){var e=t.x;t.x=function(){return t.e(361).then(e)}}();t.x()}();
//# sourceMappingURL=451.6dc4c03a.chunk.js.map