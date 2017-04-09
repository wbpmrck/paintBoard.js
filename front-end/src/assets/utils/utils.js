/**
 * Created by kaicui on 17/4/5.
 */

//polyfill event api
(function() {
    if (!Event.prototype.preventDefault) {
        Event.prototype.preventDefault=function() {
            this.returnValue=false;
        };
    }
    if (!Event.prototype.stopPropagation) {
        Event.prototype.stopPropagation=function() {
            this.cancelBubble=true;
        };
    }
    if (!Element.prototype.addEventListener) {
        var eventListeners=[];
        
        var addEventListener=function(type,listener /*, useCapture (will be ignored) */) {
            var self=this;
            var wrapper=function(e) {
                e.target=e.srcElement;
                e.currentTarget=self;
                if (typeof listener.handleEvent != 'undefined') {
                    listener.handleEvent(e);
                } else {
                    listener.call(self,e);
                }
            };
            if (type=="DOMContentLoaded") {
                var wrapper2=function(e) {
                    if (document.readyState=="complete") {
                        wrapper(e);
                    }
                };
                document.attachEvent("onreadystatechange",wrapper2);
                eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper2});
                
                if (document.readyState=="complete") {
                    var e=new Event();
                    e.srcElement=window;
                    wrapper2(e);
                }
            } else {
                this.attachEvent("on"+type,wrapper);
                eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper});
            }
        };
        var removeEventListener=function(type,listener /*, useCapture (will be ignored) */) {
            var counter=0;
            while (counter<eventListeners.length) {
                var eventListener=eventListeners[counter];
                if (eventListener.object==this && eventListener.type==type && eventListener.listener==listener) {
                    if (type=="DOMContentLoaded") {
                        this.detachEvent("onreadystatechange",eventListener.wrapper);
                    } else {
                        this.detachEvent("on"+type,eventListener.wrapper);
                    }
                    eventListeners.splice(counter, 1);
                    break;
                }
                ++counter;
            }
        };
        Element.prototype.addEventListener=addEventListener;
        Element.prototype.removeEventListener=removeEventListener;
        if (HTMLDocument) {
            HTMLDocument.prototype.addEventListener=addEventListener;
            HTMLDocument.prototype.removeEventListener=removeEventListener;
        }
        if (Window) {
            Window.prototype.addEventListener=addEventListener;
            Window.prototype.removeEventListener=removeEventListener;
        }
    }
})();

// canvas mouse position catch
function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;
    
    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        // totalOffsetX += currentElement.offsetLeft;
        // totalOffsetY += currentElement.offsetTop;
    }
    while(currentElement = currentElement.offsetParent)
    
    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;
    
    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;
/**
 * 判断是否支持canvas
 * @param e
 * @returns {boolean}
 */
function canvasSupport (e) {
    return !!e.getContext;
}
/**
 * 通过输入的色值，获取其在服务端的表示
 * @param color
 * @returns {*}
 */
function getColorString(color){
    if(color[0]==='#'){
        return color.substr(1);
    }else{
        return color;
    }
}
/**
 * 根据颜色的服务端存储的值，获取其客户端展示形式
 * @param colorVal
 */
function getColorPresent(colorVal){
    console.log("getColorPresent:["+colorVal+"]")
    if(colorVal[0].toString()>='0' && colorVal[0].toString()<='z'){
        return "#"+colorVal;
    }else{
        return colorVal;
    }
}
function checkPointLegal(point){
    return point.x>=0 && point.y >=0
}

export default {
    checkPointLegal,
    canvasSupport,
    getColorPresent,
    getColorString
}
