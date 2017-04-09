var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var boardConfig = require("./config/board");
var serverConfig = require("./config/server");


/* ---------------------------------
 错误处理
 ---------------------------------*/
process.on('uncaughtException', (err) => {
    console.error(`Caught exception: ${err}`);
});

process.on('SIGHUP', () => {
    console.log('pitaya Received SIGHUP.');
});


app.use(express.static('files'));
// app.get('/', function(req, res){
//     res.send('<h1>Hello world</h1>');
// });

var state={
    // size:{width:100,heigth:100},
    size:boardConfig.size,
    sync:{
        curVersion:0,//当前数据版本
        waitSyncVersion:-1,//当前的客户端等待同步之前的版本
        waitInit:[],//等待被刚连接的client进行初始化的数据块
        waitSync:{} //当前等待同步的数据(未序列化好的) {"1.2":"ff00aa","10.32":"00aa12"} key代表坐标，value代表值
    },
    boardData:undefined//画布数据,二维数组，值为16进制色值,比如:000表示#000. 0a表示#0a0a0a
}

//初始化画板数据
function initBoardData() {
    //创建画板数据结构
    state.boardData = new Array(state.size.width);
    for (var i = 0; i < state.boardData.length; i++) {
        state.boardData[i] = new Array(state.size.heigth);
    }
}

/**
 * 获取进行数据同步的数据格式
 * @param sock
 */
function getSyncData(){
    var pack=[];
    for(var key in state.sync.waitSync){
        axis = key.split(".");
        pack.push([axis[0],axis[1],state.sync.waitSync[key]]);
    }
    return {
        data:pack,
        version:state.sync.curVersion
    };
}

/**
 * 获取当前用于给客户端进行初始化的数据格式
 * 后续准备做成根据数据的情况不同，返回不同格式
 * 暂时只返回下面格式
 * [
             [0,0,"000000"],
             [0,9,"aa2232"],
             [2,3,"8822af"],
 ]
 */
function getInitData(){
    
    var data=[];
    //遍历data
    for(var i=0;i<state.boardData.length;i++){
        var row = state.boardData[i];
        for(var j=0;j<row.length;j++){
            var cell = row[j];
            if(cell!==undefined){
                data.push([i,j,cell]);
            }
        }
    }
    return data;
}

/**
 * 向所有client广播当前数据同步信息
 */
function flushDataToAll(){
    
    var d = getSyncData();
    if(d && d.data.length>0){
        console.log(`flushDataToAll:${state.sync.waitSyncVersion}=>${d.version},data:${JSON.stringify(d.data)}`);
        io.sockets.emit("sync",state.sync.waitSyncVersion,d.version,d.data);
    
        //重置数据
        state.sync.waitInit = getInitData();
        state.sync.waitSyncVersion = d.version;
        state.sync.waitSync ={}; //清空
    }
}

/**
 * 更新1次绘图数据
 * @param pack  [x,y,color]
 */
// function updatePaintData(pack,isBatch){
//     if(pack && pack.length==3){
//         state.boardData[pack[0]][pack[1]]=pack[2];
//
//         state.sync.waitSync[ (pack[0]+"."+pack[1])] = pack[2];//更新需要同步的点
//         if(!isBatch){
//             state.sync.curVersion++;
//         }//增加版本号
//     }
// }
function updatePaintData(pack,color,isBatch){
    console.log(`updatePaintData:${pack}:${color}`)
    if(pack && pack.length==2){
        state.boardData[pack[0]][pack[1]]=color;
    
        state.sync.waitSync[ (pack[0]+"."+pack[1])] = color;//更新需要同步的点
        if(!isBatch){
            state.sync.curVersion++;
        }//增加版本号
    }
}
/**
 * 更新多个绘图数据
 * @param pack  [  [  [x,y], [x,y], [x,y] ]    ,color]
 */
function updatePaintPathData(pack){
    // console.log("updatePaintPathData:"+JSON.stringify(pack))
    // console.log("pack.length:"+pack.length)
    // console.log("pack[0].length:"+pack[0].length)
    if(pack && pack.length==2){
        for(var i=0;i<pack[0].length;i++){
            updatePaintData(pack[0][i],pack[1],true); //单个像素的处理
        }
    }
    state.sync.curVersion++;
}


/**
 * 初始化服务器逻辑
 */
function initAppLogic(){
    initBoardData();
    //todo:开启定时轮询
    setInterval(function () {
        flushDataToAll();
    },3000)
}


io.on('connection', function(socket){
    console.log('a user connected');
    
    //链接上就进行init
    socket.emit("init",state.sync.waitSyncVersion,state.sync.waitInit,false)
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    
    //客户端发来的绘图请求
    socket.on('paint', function(data,fn){
        //更新数据
        console.log("recv paint:"+JSON.stringify(data));
        // var pack = JSON.parse(data); //[x,y,colorString]
        var pack = data; //[x,y,colorString]
        updatePaintData(pack)
        //发送数据
        var d = getSyncData();
        fn(d.version,d.data);
    });
    //客户端发来的绘制路径请求
    socket.on('paintPath', function(data,fn){
        //更新数据
        console.log("recv paintPath:"+JSON.stringify(data));
        // var pack = JSON.parse(data); //[x,y,colorString]
        var pack = data; //[x,y,colorString]
        updatePaintPathData(pack)
        //发送数据
        var d = getSyncData();
        fn(d.version,d.data);
    });
});




http.listen(serverConfig.port, function(){
    console.log(`listening on *:${serverConfig.port}`);
    initAppLogic();
});