<template>
    <!--底部操作栏-->
    <div id="operation-bar" v-show="!hideBar">
            <button id="color-picker" :style="{backgroundColor:selectedColor.val}" class="jscolor {valueElement:undefined, onFineChange:'onColorChange(this)'}">
                {{selectedColor.val}}
            </button>
        <ul class="pallet">
            <template v-for="color in colors" >
            <li :class="{active:color ===selectedColor}" :style="{backgroundColor:color.val}" :title="color.val" @click="setColor(color)"></li>
            </template>
        </ul>
        {{"缩放比("+scaleLimit.min+"-"+scaleLimit.max+")"}}<input type="text" v-model="selectScale">
    </div>
</template>

<script>

    import boardConfig from '../../../config/board'
    import operationBarConfig from '../../../config/operationBar'
    export default {
        name: 'operation-bar',
        data () {
            return {
                hideBar:false,
                selectScale: boardConfig.scaleDefault,
                scaleLimit: boardConfig.scaleLimit,
                selectedColor:operationBarConfig.colors[0],//选择的颜色
                colors:operationBarConfig.colors
            }
        },
        watch:{
            selectScale:function (val, oldVal) {
                var self = this;
                if(val>boardConfig.scaleLimit.max || val<boardConfig.scaleLimit.min){
                    return;
                }
                self.bus.$emit("selectScaleChange",val)
            }
        },
        methods:{
            //切换是否显示。如果传入参数，则按照参数设置
            toggleShow(isShow){
                if(isShow!==undefined){
                    this.hideBar = !isShow;
                }else{
                    this.hideBar = !this.hideBar;
                }
            },
            /**
             * 设置用户选中的颜色
             * @param color
             */
            setColor(color){
                var self = this;
                this.selectedColor = color;
                self.bus.$emit("selectedColorChange",color);
            }
        },
        created() {
            var self = this;
            console.log("bottom created:" + this.name);

            //先通知外部初始值
            self.bus.$emit("selectedColorChange",this.selectedColor);
            //为了使用jscolor picker,不得不在window里注册回调函数来接收颜色改变的回调
            window.onColorChange=function (picker) {
                self.selectedColor ={name:"chosen",val:picker.toString()};
                console.log("begin selectedColorChange:"+JSON.stringify(self.selectedColor))
                self.bus.$emit("selectedColorChange",self.selectedColor);
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    #operation-bar{
        position: fixed;

        top:0px;
        left: 0px;

        width: 170px;
        height: 100%;

        border: dashed 1px black;
        /*background-color: coral;*/
    }
    #operation-bar .pallet{
        display: inline-block;
        text-align: left;
    }
    #operation-bar .pallet li{
        display: inline-block;
        width: 40px;
        height: 40px;
        border: solid 1px slategrey;
    }
    #operation-bar .pallet li.active{
        border: solid 2px #ff6a59;
    }
    #operation-bar #color-picker-value{
        visibility: hidden;
        height: 0px;
        width: 1px;
    }
    #color-picker{
        display: inline-block;
        width: 80px;
        height: 80px;
    }

</style>
