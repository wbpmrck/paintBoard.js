/**
 * Created by kaicui on 17/4/6.
 */

// 注意:size*scale最好不要超过12000，容易浏览器卡死。
module.exports={
    size:{width:200,heigth:200},
    scaleLimit:{min:1,max:20}, //缩放比例限制范围
    scaleMode:"canvas",//canvas效果好，但是耗费性能。css效果差，但是快
    scaleDefault:8 //默认缩放比例
}

