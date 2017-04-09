/**
 * Created by kaicui on 17/4/6.
 */

var state={
    socket:undefined
}

export default {
    getState(){
        return state;
    },
    ready(cb){
        console.log("ready exe.")
        
        //如果已经链接，则直接回调
        if(state.socket){
            cb && cb(state.socket);
        }else{
            state.socket = io();
            state.socket.on('connect', function () {
                console.log("connected to server.")
                cb && cb(state.socket);
            });
        }
    }
}