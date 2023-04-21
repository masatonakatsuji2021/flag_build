const fs = require("fs");
const filePath = require("path");

module.exports = function(option){

    const uniqId = function(){

        var str = "";

        var lbn = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for(var n = 0 ; n < 32; n++){
            var s = lbn[parseInt(Math.random() * 1000) % lbn.length];
            str + s;
        }

        return str;
    }

    const setScript = function(name, contents){
        return "flag.setFn(\"" + name + "\", function(){\n" + contents + "});\n";
    };

    const setContent = function(name, path){
        var content = fs.readFileSync(path).toString();
        content = Buffer.from(content).toString('base64'); 
        return "flag.setFn(\"" + name + "\", function(){ return \"" + content + "\"});\n";
    };

    const deepSearch = function(path){

        var glob = fs.readdirSync(path);
    
        var res = {
            dir:[],
            file:[],
        };
    
        for(var n = 0 ; n < glob.length ; n++){
            var g_ = path + "/" + glob[n];
    
            if(fs.statSync(g_).isDirectory()){
                res.dir.push(g_);
                var buffer = deepSearch(g_);
                for(var n2 = 0 ; n2 < buffer.dir.length ; n2++){
                    res.dir.push(buffer.dir[n2]);
                }
                for(var n2 = 0 ; n2 < buffer.file.length ; n2++){
                    res.file.push(buffer.file[n2]);
                }
            }
            else{
                res.file.push(g_);
            }
        }
    
        return res;
    };

    const notCommentout = function(string){

        var buff = string.split("/*");
        var buff2 = [];
        for(var n = 0 ; n < buff.length ; n++){
            var b_ = buff[n];
    
            if(n == 0){
                buff2.push(b_);
                continue;
            }
    
            b_ = b_.split("*/");
            b_.shift();
            buff2.push(b_.join(""));        
        }
    
        var stringBuff = buff2.join("");

        var buff = stringBuff.split("// ");
        var buff2 = [];
        for(var n = 0 ; n < buff.length ; n++){
            var b_ = buff[n];
    
            if(n == 0){
                buff2.push(b_);
                continue;
            }
    
            b_ = b_.split("\n");
            b_.shift();
            buff2.push(b_.join(""));
        }
    
        var stringBuff = buff2.join("");
    
        var buff = stringBuff.split("\n");
        var buff2 = [];
        for(var n = 0 ; n < buff.length ; n++){
            var b_ = buff[n];
            buff2.push(b_.trim());
        }
    
        var stringBuff = buff2.join("");
    
        var buff = stringBuff.split("\r");
        var buff2 = [];
        for(var n = 0 ; n < buff.length ; n++){
            var b_ = buff[n];
            buff2.push(b_.trim());
        }
        var stringBuff = buff2.join("");
    
        return stringBuff;
    };
    

    if(option == undefined){
        option = {};
    }    

    if(option.root == undefined){
        option.root = "src";
    }

    if(option.build == undefined){
        option.build = "__build";
    }

    var getFiles = deepSearch(option.root);

    fs.mkdirSync(option.build, {
        recursive : true,
    });
    console.log("[mkdir]".padEnd(17) + option.build);

    var scriptStr = "(function(){\n";

    if(option.const){

        var columns = Object.keys(option.const);
        for(var n = 0 ; n < columns.length ; n++){
            var key = columns[n];
            var val = option.const[key];
            scriptStr += "const " + key + " = " + JSON.stringify(val) +";\n";
            console.log("[const]".padEnd(17) + key);
        }
    }

    scriptStr += fs.readFileSync(__dirname + "/bin/build_header.js").toString() + "\n";

    for(var n = 0 ; n < getFiles.dir.length ; n++){
        var dir = getFiles.dir[n];

        if(dir.indexOf(option.root + "/app") === 0){
            continue;
        }
        else if(option.contents){
            if(dir.indexOf(option.root + "/" + option.contents) === 0){
                continue;
            }
        }

        fs.mkdirSync(option.build + "/" + dir.substring(option.root.length + 1),{
            recursive: true,
        });

        console.log("[mkdir]".padEnd(17) + option.build + "/" + dir.substring(option.root.length + 1));
    }

    if(option.core){
        var columns = Object.keys(option.core);
        for(var n = 0 ; n < columns.length ; n++){
            var name = columns[n]
            var contents = option.core[name];
            scriptStr += setScript(name, contents);
            console.log("[read core]".padEnd(17) + name);
        }
    }

    if(option.contents){
        var search = deepSearch(option.root + "/" + option.contents);
        for(var n = 0 ; n < search.file.length ; n++){
            var contentPath = search.file[n];
            var contentname = contentPath.substring((option.root + "/" + option.contents).length);
            if(contentname.substring(0,1)=="/"){
                contentname = contentname.substring(1);
            }
            scriptStr += setContent(contentname, contentPath);

            console.log("[read content]".padEnd(17) + contentname);
        }
    }

    for(var n = 0 ; n < getFiles.file.length ; n++){
        var file = getFiles.file[n];

        if(file.indexOf(option.root + "/app") === 0){
            scriptStr += setScript(file.substring(option.root.length + 1) , fs.readFileSync(file).toString());
            console.log("[read script]".padEnd(17) + file.substring(option.root.length + 1));
        }
        else{

            if(option.contents){
                if(file.indexOf(option.root + "/" + option.contents) === 0){
                    continue;
                }
            }

            fs.copyFileSync(file, option.build + "/" + file.substring(option.root.length + 1));
            console.log("[copy]".padEnd(17) + file.substring(option.root.length + 1));
        }
    }

    if(option.startCallback){
        scriptStr += "flag.start(" + option.startCallback.toString() + ");\n";  
    }
    else{
        scriptStr += "flag.start();\n";
    }
    
    scriptStr += "})();"

    if(!option.Uncompressed){
        scriptStr = notCommentout(scriptStr);
    }

    fs.writeFileSync(option.build + "/index.min.js",scriptStr);
    console.log("[copy]".padEnd(17) + file.substring(option.root.length + 1));
};