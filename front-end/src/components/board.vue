<template>
  <div>
    <operationBar></operationBar>
    <div id="canvas-container">
      <!--画板-->
      <canvas id="board"></canvas>
    </div>

  </div>
</template>

<script>
    import websocket from '../assets/framework/ws'
    import utils from '../assets/utils/utils'
    import operationBar from '../components/operation-bar.vue'
    import boardConfig from '../../../config/board'
export default {
    name: 'hello',
    components: {
        operationBar
    },
    data () {
        return {
            useColor:{val:"#ffffff"},//当前选择的颜色
            socket:undefined,
            serverDataVersion:false,//数据版本
//            size:{width:100,heigth:100},
            size:boardConfig.size,
            canvas:undefined,

            boardData:undefined,//画布数据,二维数组，值为16进制色值,比如:000表示#000. 0a表示#0a0a0a

            //按键状态
            buttonState:{
                leftDown:false,
                leftMovePath:[],//记录按下过程中的移动轨迹 [ ... [1,2],... ]
//                leftDownPos:undefined,//左键按下的起始位置
//                rightDown:false,
//                rightDownPos:undefined,
            },

            ctx:undefined,
            scale:boardConfig.scaleDefault, //缩放比例
            scaleLimit:boardConfig.scaleLimit, //缩放比例限制范围
            scaleDefault:boardConfig.scaleDefault //默认缩放比例
        }
    },
    watch:{
        //当用户选择的缩放比例变化，自动重新绘制
      scale:function (val) {
          var self = this;
          val = parseFloat(val);
          console.log("scale to:"+val);
          if(boardConfig.scaleMode=='canvas') {
              self.resetBoardStates();
              //画画板
              self.drawBoardData();
          }else{
              self.resetContainerScale();
          }
      }
    },
    methods: {


        //重新设置canvas容器的scale
        resetContainerScale(){
          var self = this;
          var container = document.getElementById("canvas-container");
          container.style="transform:scale("+self.scale+")";
        },
        //弹出loading
        showLoading(){
            //todo:弹出loading,一直到初始化完毕才关闭
        },
        //关闭loading
        closeLoading(){
            //todo:关闭loading
        },

        //发送绘图消息
        sendSinglePaintMsg(x, y, color){
            var self = this;
            if (self.socket && self.socket.connected) {
//            var packet = ['[',x,y,color,']'].join(',')
                var packet = [x, y, color];

                //发送绘图请求，服务端会立刻对该链接回复sync结构，相当于这个client提前同步服务器状态
                self.socket.emit("paint", packet, function (version, data) {
                    console.log("发送成功，收到回复:version[" + version + "],data:" + data);
                    self.syncBoardData(data); //注意这里同步数据，但是不更新本地版本，为了后面能统一定时接收服务端的同步推送
                })
            } else {
                alert("与服务器链接未建立！")
            }
        },
        //发送路径绘图消息
        sendPaintPathMsg(pathArray, color){
            var self = this;
            if (self.socket && self.socket.connected) {
                var packet = [pathArray, color];

                //发送绘图请求，服务端会立刻对该链接回复sync结构，相当于这个client提前同步服务器状态
                self.socket.emit("paintPath", packet, function (version, data) {
                    console.log("发送[paintPath]成功，收到回复:version[" + version + "],data:" + data);
                    self.syncBoardData(data); //注意这里同步数据，但是不更新本地版本，为了后面能统一定时接收服务端的同步推送
                })
            } else {
                alert("与服务器链接未建立！")
            }
        },
//改变缩放比例,返回是否修改成功
        changeScale(scale){
            if (scale >= this.scaleLimit.min && scale <= this.scaleLimit.max) {
                this.scale = scale;
                return true;
            } else {
                return false;
            }

        },
//初始化画板数据
        initBoardData(data, isDataRaw) {

            var self = this;

            //从服务端获取的数据赋值
            //服务端有2种传值方式：
            // 1:只传有值的像素点，此时每个item是[colorX,colorY,color]
            // 2:传所有像素点，(isDataRaw=true)
            if (isDataRaw) {
                self.boardData = data;
            } else {
                //创建画板数据结构
                self.boardData = new Array(self.size.width);
                for (var i = 0; i < self.boardData.length; i++) {
                    self.boardData[i] = new Array(self.size.heigth);
                }
                //填充像素
                for (var i = 0; i < data.length; i++) {
                    var px = data[i];
                    self.boardData[px[0]][px[1]] = px[2];
                }
            }
        },
        //根据输入的px,和当前缩放比例，得到输出px (第二个参数用于决定，是否强制使用scale参数来对px进行处理)
        getPaintPixel(px,forceCalcScale){
            if(forceCalcScale){
                            return parseInt(px * this.scale);
            }else{
//                parseInt(px * this.scale);
                return px;
            }


        },
        //根据点击的坐标和缩放比例，得到实际对应canvas的数据网格地址坐标
        getPixelPos(px){
            return parseInt(px / this.scale);
        },
//增量更新画板像素数据
        syncBoardData(data) {
            //填充像素
            for (var i = 0; i < data.length; i++) {
                var px = data[i];
                this.boardData[px[0]][px[1]] = px[2];
            }
            //重绘像素
            this.drawSyncData(data);
        },

        /**
         * 清空画板
         */
        clearBoard(){

            var ctx = this.ctx;
            var myCanvas = this.canvas;
            ctx.clearRect(0, 0, myCanvas.width, myCanvas.height);
        },
        /**
         * 绘制指定像素
         * [[x,y,color],[x2,y2,color2]]
         */
        drawSyncData(data) {
            var ctx = this.ctx;

            //遍历data,绘制颜色
            for (var i = 0; i < data.length; i++) {
                var cell = data[i];
//                ctx.fillStyle = "#" + cell[2];
                ctx.fillStyle = utils.getColorPresent(cell[2]);
//                console.log("drawSyncData:"+ctx.fillStyle);
//                ctx.fillRect(this.getPaintPixel(cell[0]), this.getPaintPixel(cell[1]), this.scale, this.scale);
                ctx.fillRect(this.getPaintPixel(cell[0]), this.getPaintPixel(cell[1]), 1, 1);
            }
        },
        /**
         * 绘制整个画板像素
         */
        drawBoardData() {

            if (this.boardData) {

                var ctx = this.ctx;

                //遍历data,绘制颜色
                for (var i = 0; i < this.boardData.length; i++) {
                    var row = this.boardData[i];
                    for (var j = 0; j < row.length; j++) {
                        var cell = row[j];

                        if (cell !== undefined) {
//                            ctx.fillStyle = "#" + cell;
                            ctx.fillStyle = utils.getColorPresent(cell);
//                            console.log("drawBoardData:"+ctx.fillStyle);
//                            ctx.fillRect(this.getPaintPixel(i), this.getPaintPixel(j), this.scale, this.scale);
                            ctx.fillRect(this.getPaintPixel(i), this.getPaintPixel(j), 1, 1);
                        }
                    }
                }
            }
        },


        /**
         * 绘制坐标系
         */
        drawCoordinate(isDrawNumber){

            var ctx = this.ctx;
            var myCanvas = this.canvas;

            // 横线与竖线的是距
            var dx = this.getPaintPixel(1);
            var dy = this.getPaintPixel(1);

            // 初始坐标原点
            var x = 0;
            var y = 0;
            var w = myCanvas.width;
            var h = myCanvas.height;

            // 单个步长所表示的长度
            var xy = 1;

            ctx.lineWidth = 1;

            // 画竖线
            while (y < h) {
                y = y + dy;
                ctx.moveTo(x, y);
                ctx.lineTo(w, y);
                ctx.stroke();

                //横坐标的数字
                ctx.font = "1px Calibri";
                isDrawNumber && ctx.fillText(xy, x, y);
                xy += 1;
            }

            // 画横线
            y = 0;
            xy = 1;
            while (x < w) {
                x = x + dx;
                ctx.moveTo(x, y);
                ctx.lineTo(x, h);
                ctx.stroke();
                //纵坐标的数字
                ctx.font = "1px Calibri";
                isDrawNumber && ctx.fillText(xy, x - this.getPaintPixel(0.3), 10); //调整文本位置，使得坐标可以被看到
                xy += 1;
            }
        },


        subscribeMsg(){
            console.log("订阅事件start");
            var self = this;
            websocket.ready( (socket) =>{
                self.socket = socket; //保存引用
                self.socket.on('init',  (version, data, isDataRaw) =>{
                    console.log("收到 init:version[" + version + "],data:" + JSON.stringify(data));
                    self.serverDataVersion = version; //初始化成功
                    if (data) {
                        self.initBoardData(data, isDataRaw);
                        //画画板
                        self.drawBoardData();
                    } else {
                        alert("服务器初始化数据为空!")
                    }
                });
                self.socket.on('sync',  (fromVersion, toVersion, data) =>{
                    console.log("收到 sync:[" + fromVersion + "->" + toVersion + "],data:" + data);
                    if (fromVersion !== undefined && self.serverDataVersion == fromVersion) {
                        self.syncBoardData(data);
                        self.serverDataVersion = toVersion; //同步成功
                    } else {
                        console.error("本地数据版本:" + self.serverDataVersion + ",服务器数据版本:" + fromVersion + ",无法同步数据")
                    }
                });
            });
        },
        //用于处理当鼠标点canvas的某个坐标时的行为
        onClickCanvas(x,y){
          var self = this;
            self.sendSinglePaintMsg(x,y,utils.getColorString(self.useColor.val));
        },
        //用于处理当按键在某个坐标按下时的行为
        onMouseLeftDownCanvas(x,y){
            var self = this;
//            console.log(`onMouseLeftDownCanvas:${x},${y}`);
            self.buttonState.leftDown = true;// 标记左键按下
            self.buttonState.leftMovePath.push([x,y]) ;//标记起始位置
//            console.log("self.buttonState.leftMovePath is:"+self.buttonState.leftMovePath);
        },
        //用于处理当按键在某个坐标抬起时的行为
        onMouseUpCanvas(x,y){
            var self = this;
//            console.log(`onMouseLeftUpCanvas:${x},${y}`);
            if(self.buttonState.leftDown){
                //如果当前记录按下的是左键，则表示松开的是左键
                self.buttonState.leftDown=false;

                var path = self.buttonState.leftMovePath;

                //todo:整理轨迹数据，发送给服务器
                console.log("self.buttonState.leftMovePath is:"+self.buttonState.leftMovePath);
                self.sendPaintPathMsg(path,utils.getColorString(self.useColor.val));
                self.buttonState.leftMovePath = [];//重置path
//                alert(path);
            }
        },
        //用于处理当按键在移动时候的处理
        onMouseMoveCanvas(x,y){
            var self = this;
//            console.log(`onMouseMoveCanvas:${x},${y}`);
            //判断当前位置和前一位置对应canvas的坐标是否一致，如果一致则无需重复写入
            var path = self.buttonState.leftMovePath;
            if(path.length>0){
                if(path[path.length-1][0]==x &&path[path.length-1][1]==y){
                    return;
                }
            }
            path.push([x,y]) ;//记录移动路径
        },
        /**
         * 监听用户事件
         */
        monitUserEvent(){
            var self = this;
//            document.getElementById("canvas-container").addEventListener("click",function (evt) {
//                var relPos = self.canvas.relMouseCoords(evt);
//
////                alert(self.getPixelPos(relPos.x)+","+self.getPixelPos(relPos.y)+"=>"+relPos.x+","+relPos.y);
////                self.sendSinglePaintMsg(self.getPixelPos(relPos.x),self.getPixelPos(relPos.y),utils.getColorString(self.useColor.val));
//                self.onClickCanvas(self.getPixelPos(relPos.x),self.getPixelPos(relPos.y));
//            });
            document.getElementById("canvas-container").addEventListener("mousedown",function (evt) {
//                console.log("catch mousedown:"+evt.buttons);
                if(evt.buttons==1){

                    var relPos = self.canvas.relMouseCoords(evt);
                    utils.checkPointLegal(relPos) && self.onMouseLeftDownCanvas(self.getPixelPos(relPos.x),self.getPixelPos(relPos.y))
                }
            });
            document.getElementById("canvas-container").addEventListener("mouseup",function (evt) {
//                console.log("catch mouseup:"+evt.buttons);
                var relPos = self.canvas.relMouseCoords(evt);
                utils.checkPointLegal(relPos) && self.onMouseUpCanvas(self.getPixelPos(relPos.x),self.getPixelPos(relPos.y))
            });
            document.getElementById("canvas-container").addEventListener("mousemove",function (evt) {
//                console.log("catch mousemove:"+evt.buttons);
                if(evt.buttons==1){
                    var relPos = self.canvas.relMouseCoords(evt);
                    utils.checkPointLegal(relPos) && self.onMouseMoveCanvas(self.getPixelPos(relPos.x),self.getPixelPos(relPos.y))
                }
            });
        },
        //根据当前scale,重新定义canvas大小
        resetCanvasSize(){

            var self = this;
            var myCanvas = self.canvas;

            myCanvas.width = self.getPaintPixel(self.size.width,true);
            myCanvas.height = self.getPaintPixel(self.size.heigth,true);

        },
        //重设画板状态，包括当前scale等
        resetBoardStates(){
          var self = this;

            self.resetCanvasSize();
            //清空
            self.clearBoard();
            self.ctx.scale(self.scale, self.scale);
        },
        initApp () {

            var self = this;
            console.log("initApp");

            self.canvas = document.getElementById('board');
            self.ctx=utils.canvasSupport(self.canvas)?self.canvas.getContext('2d'):undefined;


            var ctx = self.ctx;
            var myCanvas = self.canvas;
            if (!ctx) {
                alert("canvas环境没有准备好!准备返回.");
                return;
            }
            self.resetBoardStates();
//            self.ctx.scale(self.scale,self.scale);

            //画坐标
//            self.drawCoordinate(false);
            //订阅事件
            console.log("订阅事件");
            self.subscribeMsg();

            self.monitUserEvent();

            self.bus.$on("selectedColorChange",function (color) {
                console.log("get selectedColorChange:"+JSON.stringify(color))
                self.useColor = color;
            });
            self.bus.$on("selectScaleChange",function (scale) {
                console.log("get selectScaleChange:"+JSON.stringify(scale))
                self.scale = scale;
            })
        }
    },
    mounted() {
        var self = this;
//        alert("board created!")
        console.log("board created!")
        self.initApp();
        console.log("init finished!")
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

  #canvas-container canvas{
    cursor: crosshair;
    border: solid 1px #2c3e50;
  }
  #canvas-container{

    position: fixed;
    display: inline-block;

    /*width: 100%;*/
    /*height: 100%;*/
    overflow: scroll;
    /*让canvas给bar留出空间*/
    left:173px;
    top:5px;
    right:5px;
    bottom:5px;
    /*margin: 5px 5px 5px 173px;*/


    border: 1px solid black;
    transform-origin: 0 0;
    -moz-transform-origin: 0 0;

    cursor: not-allowed;
  }

</style>
