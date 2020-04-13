
//根据DOM元素的id构造出一个编辑器
var editor=CodeMirror.fromTextArea(document.getElementById("code"),{
    mode:"text/c-mysql", //实现Java代码高亮
    lineNumbers:true,
    theme:"default",
    keyMap: "default",
    extraKeys:{"Tab":"autocomplete"},
    hint: CodeMirror.hint.sql,
    lineWrapping: true,         //是否换行
    foldGutter: true,           //是否折叠
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"], //添加行号栏，折叠栏
    hintOptions: {
        tables: tablewords

    }

});

editor.on("keyup", function (cm, event) {
    //所有的字母和'$','{','.'在键按下之后都将触发自动完成
    if (!cm.state.completionActive &&
        ((event.keyCode >= 65 && event.keyCode <= 90 ) || event.keyCode == 52 || event.keyCode == 219 || event.keyCode == 190)) {
        CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
    }
});

/**
 * 根据sql编辑框动态高度，设置表格的高度
 */
function setDatalistHeight() {

    if($('.right-card .layui-tab').css("display")==="none"){// 第一次执行代码
        $("#handle").show();
        $('.right-card .layui-tab').show();
        editor.setSize('height','200px');
    }
    var allH =  parseInt( $('.card').height());
    var sqlDivHeight = parseInt( $('.right-card .sql-div').height());
    var toolsDivHeight = parseInt( $('.right-card .tools').height());
    var datalistH = allH -sqlDivHeight- toolsDivHeight-32;
    $('.right-card .data-div').height(datalistH +'px');
    if($(".data-list .datagrid").length>0){// 数据表格存在是高度适用
        $('#sqldata').datagrid('resize', {
            height :datalistH-33+"px"
        })
    }

}

/**
 * 加载中...
 */
function loading() {
    $("#stopImg").attr("src","image/stop1.png");
    $("#loading").show();
}

/**
 * 完成
 */
function complete() {
    $("#loading").hide();
    $("#stopImg").attr("src","image/stop0.png");
}
var exeAjax;// 当前ajax请求;
// 异步加载数据
function loadData(exeSql, page, pageSize,callback) {
    exeAjax= $.ajax({
                type : "POST",
                url :baseUrl+'sqleditor/execute',
                data:{sql:exeSql,page:page,rows:pageSize},
                dataType : "json",
                //async:false,
                beforeSend: function() {
                    loading();
                },
                success: function(r){
                    complete();
                    callback(r);
                },
                error : function (r){
                    complete();
                    if(r.readyState == '0' && r.status == '0' && r.statusText!="abort"){
                        layer.alert('对不起，无法连接服务器，请检查您的计算机硬件以及网络连接是否正常！');
                    }
                }
            });
}
//如若上一次AJAX请求未完成，则中止请求
function stopLoadData() {
    if(exeAjax) {
        exeAjax.abort();
    }

}
// layui组件相关的
layui.use(['element','layer'], function(){
    var element = layui.element;
    var layer = layui.layer;
    var allH =  parseInt( $('.card').height());

    // 初始化sql编辑框
    var toolsDivHeight = parseInt( $('.right-card .tools').height());
    editor.setSize('height',allH-toolsDivHeight-5+'px');


    // 代码执行
    $('#execute').click(function () {
        var exeSql="";
        var allSql = editor.getValue();
        if($.trim(allSql)===""){
            return false;
        }
        var selectedSql = editor.getSelection();
        if(selectedSql!==""){
            exeSql =selectedSql;
        }else{
            exeSql = allSql;
        }
        setDatalistHeight();
        // 获取输入的值
        console.log(exeSql);
        var initPageSize = 100;
       loadData(exeSql,1,initPageSize,function(r){
            if(!r){
                layer.msg("执行中止");
                return false;
            }
            if(r.zxxx){// 提示信息
                $("#resultCode").text("> "+r.zxxx.code);
                $("#resultMsg").text("> "+r.zxxx.msg);
                $("#resultTime").text("> 时间："+r.zxxx.time+"s");
            }

            if(r.success){
                if(r.zxjg && r.zxjg!=null){
                    element.tabChange('result', 'data');
                    $('#sqldata').datagrid({
                        rownumbers: true,
                        fit: true,
                        singleSelect: true,
                        striped: true,
                        pagination: true,
                        pageSize: initPageSize,
                        pageList: [ 100, 200, 500, 1000, 5000, 10000, 100000],
                        loadMsg: "查询中，请稍后...",
                        columns: r.columns,
                        data:r.zxjg

                    });

                    var p = $('#sqldata').datagrid('getPager');
                    if (p) {
                        $(p).pagination({
                            beforePageText: '第',
                            afterPageText: '页 共 {pages}页',
                            total:r.zxjg.count,
                            displayMsg: '查询时间：'+r.zxxx.time+'s  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 显示 {from}到{to} ,共 {total}条记录',
                            onSelectPage: function (page, pageSize) {
                                loadData(exeSql,page,pageSize,function(r2){
                                    if(r2.success){
                                        if(r2.zxjg && r2.zxjg!=null){
                                            var gridOpts = $('#sqldata').datagrid('options');
                                            gridOpts.pageNumber = page;
                                            gridOpts.pageSize = pageSize;
                                            $('#sqldata').datagrid('loadData',r2.zxjg.rows);

                                            $(p).pagination('refresh',{	// 改变选项并刷新分页栏信息
                                                total: r2.zxjg.count,
                                                pageNumber:page
                                            });


                                        }
                                    }
                                });

                            },
                            onChangePageSize:function (pageSize) {
                                loadData(exeSql,1,pageSize,function (r2) {
                                    if(r2.success){
                                        if(r2.zxjg && r2.zxjg!=null){
                                            $('#sqldata').datagrid('loadData',r2.zxjg.rows);
                                            $(p).pagination('refresh',{	// 改变选项并刷新分页栏信息
                                                total: r2.zxjg.count,
                                                pageNumber:1
                                            });
                                        }
                                    }
                                });

                            }
                        });
                    }
                }

            }else{
                element.tabChange('result', 'info');
            }

        });

    });

    $("#save").click(function () {
        var allSql = editor.getValue();
        if(allSql===""){
            layer.msg("无保存内容");
            return false;
        }
        layer.open({
            type:1,
            title: '分析基本信息'
            ,area: ['500px', '300px']
            ,content: $('#save_div')
            ,btn: ['保存', '取消' ]
            ,yes: function(index, layero){
                var params =  {
                    "ghBh":$('#save_div input[name="ghBh"]').val(),
                    "name":$('#save_div input[name="name"]').val(),
                    "desc":$('#save_div textarea[name="desc"]').val(),
                    "sql":allSql
                };
                if($.trim(params.name)===""){
                    layer.msg("名称不能为空");
                    return false;
                }
                console.log(JSON.stringify(params));
                layer.alert(JSON.stringify(params));
                  
            }
            ,bt2: function(index, layero){

                //return false 开启该代码可禁止点击该按钮关闭
            }
        });
    });
    //…
});

//editor.setSize('height','200px');
// 最小高度
var MIN_HEIGHT = 100;

//对编辑器这个node添加鼠标事件
var editorNode = document.getElementById('code');

var hahahha = document.getElementsByClassName('CodeMirror-wrap')[0];
console.log('初始值：' + hahahha.offsetHeight);
//
var dragBar = document.getElementById('handle');

// 返回编辑器的高度
function  getHeight(node){
    var h =  window.getComputedStyle(node, null).height.replace(/px$/, "");
    if(h === 'auto'){
        h = node.offsetHeight;
    }
    return parseInt(h);
}

// 释放鼠标的时候触发的事件
function release(){

    console.log('end');
    // 删除和添加都是使用两个参数的
    document.body.removeEventListener('mousemove', drag);
    window.removeEventListener('mouseup', release);

}

// drag 事件
function drag(e){
/*    console.log('drag');
    console.log('e.y:' + e.y);
    console.log('pos_y:' + pos_y);
    console.log('startHeight:' + startHeight);
    console.log('-----------');
    console.log(startHeight + e.y - pos_y);*/
    editor.setSize('height', Math.max(MIN_HEIGHT, (startHeight + e.y - pos_y)) + "px");
    setDatalistHeight();// 数据表格高度
}

dragBar.addEventListener('mousedown', function (e){
    console.log('start');
    // 开始高度
    startHeight =  getHeight(hahahha);
    console.log('开始高度：' + startHeight);
    pos_x = e.x;
    pos_y = e.y;



    //只有按下鼠标移动的时候才能移动
    document.body.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', release);
});


function getSelectedRange() {
    return { from: editor.getCursor(true), to: editor.getCursor(false) };
}


/**** 初始化***/
// 格式化
$('#format').click(function () {
    // 获取输入的值
    console.log(editor.getValue());
    console.log('范围：' + JSON.stringify(getSelectedRange()));
    var range = getSelectedRange();
    editor.autoFormatRange(range.from, range.to);

    function format() {
        console.time('formatting');

        var str = sqlFormatter.format(editor.getValue(), {language: 'sql'});
        editor.setValue(str);
        console.log('格式化的代码:' + str);
        console.timeEnd('formatting');
    }
    format();

});


// 初始化数据库表树结构
$.ajax({
    type : "get",
    url : baseUrl + 'json/tables.json',
    dataType : "json",
    //async:false,
    success: function(r){
        if(r){
            // 加载待选树
            $('#dstable').tree({

                valueField: 'id',
                textField: 'text',
                loadMsg: '加载中，请稍后...',
                lines: true,
                data:r
            });
            $("#dstable .tree-node").each(function (i,item) {
                $(item).attr("onselectstart","return false;");
                $(item).css("cursor","default");
                $(item ).children(".tree-title").attr("draggable","true");
            });
            /* 拖动目标元素时触发drag事件 */
            document.addEventListener("dragstart", function( e ) {
                e.dataTransfer.setData('text', $(e.target).text());
            }, false);
        }
    },
    error : function (r){
        if(r.readyState == '0' && r.status == '0'){
            layer.alert('对不起，无法连接服务器，请检查您的计算机硬件以及网络连接是否正常！');
        }
    }
});
var tmp = function() {
    editor.refresh();
};
setTimeout(tmp, 100);
 