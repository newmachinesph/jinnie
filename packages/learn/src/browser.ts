/** Observe Next.js push/replace/pop navigation, including Android's SPA history. */
export function navigationScript(): string {
  return `(function(){
    if(window.__jinnieLearnNavigation)return;
    window.__jinnieLearnNavigation=true;
    var key='__jinnieLearnIndex',index=0,sequence=0;
    if(history.state&&Number.isSafeInteger(history.state[key])&&history.state[key]>=0)index=history.state[key];
    function stateWithIndex(state,value){var next=Object.assign({},state||{});next[key]=value;return next;}
    function notify(){
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({
        source:'jinnie-learn',id:'navigation_'+(++sequence),type:'navigation',
        payload:{url:location.href,canGoBack:index>0}
      }));
    }
    var push=history.pushState.bind(history),replace=history.replaceState.bind(history);
    history.pushState=function(state,title,url){push(stateWithIndex(state,index+1),title,url);index+=1;notify();};
    history.replaceState=function(state,title,url){replace(stateWithIndex(state,index),title,url);notify();};
    window.addEventListener('popstate',function(event){
      index=event.state&&Number.isSafeInteger(event.state[key])?Math.max(0,event.state[key]):Math.max(0,index-1);
      notify();
    });
    replace(stateWithIndex(history.state,index),'',location.href);
    notify();
  })();true;`;
}

/** Notify both off-DOM narration and ordinary page audio/video of native visibility. */
export function visibilityScript(hidden: boolean): string {
  return `window.__JINNIE_LEARN_HIDDEN__=${hidden};` +
    `window.dispatchEvent(new CustomEvent('jinnie-learn-visibility',{detail:{hidden:${hidden}}}));` +
    (hidden ? `document.querySelectorAll('video,audio').forEach(function(media){media.pause()});` : '') + 'true;';
}

/** Report scroll direction changes from whichever course element scrolls, so the host can collapse its header. */
export function scrollScript(): string {
  return `(function(){
    if(window.__jinnieLearnScroll)return;
    window.__jinnieLearnScroll=true;
    var scroller=null,last=0,direction='',sequence=0;
    window.__jinnieLearnScrollReset=function(){direction='';last=scroller?scroller.scrollTop:0;};
    document.addEventListener('scroll',function(event){
      var element=event.target===document?document.scrollingElement:event.target;
      if(!element||typeof element.scrollTop!=='number')return;
      if(element!==scroller){scroller=element;last=element.scrollTop;direction='';return;}
      var top=element.scrollTop,delta=top-last;
      last=top;
      // The native bar (about 62dp) reclaims its height when it hides; only report
      // 'down' while that much content is still below, or the clamped scroll jumps back.
      var room=element.scrollHeight-element.clientHeight-top;
      var next=top<=0?'up':Math.abs(delta)<6?direction:delta<0?'up':room>=80?'down':direction;
      if(next===direction)return;
      direction=next;
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({
        source:'jinnie-learn',id:'scroll_'+(++sequence),type:'scroll',payload:{direction:direction,atTop:top<=0}
      }));
    },true);
  })();true;`;
}
