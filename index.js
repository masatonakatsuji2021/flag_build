const cli = require("@flag/cli");
const fs = require("fs");
const { execSync } = require("child_process");

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
        if(option.typeScript){
            contents = "let exports;\n" + contents + "\nreturn exports;";
        }
        return "flag.setFn(\"" + name + "\", function(){\n" + contents + "});\n";
    };

    const setContent = function(name, content){
//        var content = fs.readFileSync(path).toString();
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
    
    cli
        .indent(2)
        .outn()
        .outn("Frag Build ... SPA(SIngle-Page-Action) Builder...")
        .outn("Build Start!!")
        .outn()
        .outn()
    ;

    const padEnd = 22;

    if(option == undefined){
        option = {};
    }    

    if(option.rootPath == undefined){
        option.rootPath = "./src";
    }

    if(option.buildPath == undefined){
        option.buildPath = "./__build";
    }

    if(option.sourceMap){
        var maps = {
            version: 3,
            sources: [],
            names: [],
            mappings: "",
            file: "index.min.js",
            sourcesContent: [],
        };
    }

    var getFiles = deepSearch(option.rootPath);

    var scriptStr = "(function(){\n";

    if(option.const){

        var columns = Object.keys(option.const);
        for(var n = 0 ; n < columns.length ; n++){
            var key = columns[n];
            var val = option.const[key];
            scriptStr += "const " + key + " = " + JSON.stringify(val) +";\n";
            cli.green("#").outn("set construct ".padEnd(padEnd) + key);
        }
    }

    scriptStr += fs.readFileSync(__dirname + "/bin/build_header.js").toString() + "\n";

    if(option.core){
        var columns = Object.keys(option.core);
        for(var n = 0 ; n < columns.length ; n++){
            var name = columns[n]
            var contents = option.core[name];
            scriptStr += setScript(name, contents);
            cli.green("#").outn("Set Core ".padEnd(padEnd) + name);
            if(option.sourceMap){
                maps.sources.push("Flag Native/" + name);
                maps.sourcesContent.push(contents);
            }
        }
    }

    if(option.coreHtml){
        var columns = Object.keys(option.coreHtml);
        for(var n = 0 ; n < columns.length ; n++){
            var name = columns[n]
            var contents = option.coreHtml[name];
            scriptStr += setContent(name, contents);
            cli.green("#").outn("Set Core(HTML) ".padEnd(padEnd) + name);
        }
    }

    if(option.contents){
        var search = deepSearch(option.rootPath + "/" + option.contents);
        for(var n = 0 ; n < search.file.length ; n++){
            var contentPath = search.file[n];
            var contentname = contentPath.substring((option.rootPath + "/" + option.contents).length);
            if(contentname.substring(0,1)=="/"){
                contentname = contentname.substring(1);
            }
            var content = fs.readFileSync(contentPath).toString();
            scriptStr += setContent(contentname, content);

            cli.green("#").outn("Set Content(HTML) ".padEnd(padEnd) + contentname);
        }
    }

    fs.mkdirSync(option.buildPath, {
        recursive : true,
    });
    
    cli.green("#").outn("Mkdir ".padEnd(padEnd) + option.buildPath);
    
    for(var n = 0 ; n < getFiles.dir.length ; n++){
        var dir = getFiles.dir[n];

        if(dir.indexOf(option.rootPath + "/app") === 0){
            continue;
        }
        else if(option.contents){
            if(dir.indexOf(option.rootPath + "/" + option.contents) === 0){
                continue;
            }
        }

        fs.mkdirSync(option.buildPath + "/" + dir.substring(option.rootPath.length + 1),{
            recursive: true,
        });

        cli.green("#").outn("Mkdir  ".padEnd(padEnd) + option.buildPath + "/" + dir.substring(option.rootPath.length + 1));
    }

    for(var n = 0 ; n < getFiles.file.length ; n++){
        var file = getFiles.file[n];

        if(file.indexOf(option.rootPath + "/app") === 0){
            var fileName = file.substring(option.rootPath.length + 1).slice(0, -3);
            var contents = fs.readFileSync(file).toString();
            scriptStr += setScript(fileName , contents);
            cli.green("#").outn("Set Content(JS) ".padEnd(padEnd) + fileName);
            if(option.sourceMap){
                maps.sources.push(fileName);
                maps.sourcesContent.push(contents);
            }
        }
        else{

            if(option.contents){
                if(file.indexOf(option.rootPath + "/" + option.contents) === 0){
                    continue;
                }
            }

            fs.copyFileSync(file, option.buildPath + "/" + file.substring(option.rootPath.length + 1));
            cli.green("#").outn("CopyFile " .padEnd(padEnd) + file.substring(option.rootPath.length + 1));
        }
    }

    if(option.startCallback){
        scriptStr += "flag.start(" + option.startCallback.toString() + ");\n";  
    }
    else{
        scriptStr += "flag.start();\n";
    }
    
    scriptStr += "})();"

    if(!option.uncompressed){
        scriptStr = notCommentout(scriptStr);
        cli.green("#").outn("code Compress...");
    }

    if(option.typeScript){
        scriptStr = "// @ts-nocheck\n" + scriptStr;
        fs.writeFileSync(option.buildPath + "/index.min.ts",scriptStr);
        cli.green("#").outn("Build ".padEnd(padEnd) + option.buildPath + "/index.min.ts");
        cli.green("#").outn("Trans Complie..");
        try{
            execSync("tsc " + option.buildPath + "/index.min.ts");
        }catch(error){
            // console.log(error);
        }

        var scriptStr = fs.readFileSync(option.buildPath + "/index.min.js").toString();

        if(!option.uncompressed){
            scriptStr = notCommentout(scriptStr);
            cli.green("#").outn("code Re-compress...");
        }
        
        if(option.sourceMap){
            scriptStr = "//# sourceMappingURL=index.min.map\n" + scriptStr;
        }
        
        fs.writeFileSync(option.buildPath + "/index.min.js", scriptStr);
        
        cli.green("#").outn("ReCompress ".padEnd(padEnd) + option.buildPath + "/index.min.js");
        if(option.sourceMap){
            fs.writeFileSync(option.buildPath + "/index.min.map", JSON.stringify(maps));
            cli.green("#").outn("MakeMap ".padEnd(padEnd) + option.buildPath + "/index.min.map");
        }
    }
    else{
        fs.writeFileSync(option.buildPath + "/index.min.js",scriptStr);
        cli.green("#").outn("Build ".padEnd(padEnd) + option.buildPath + "/index.min.js");
    }

    cli
        .outn()
        .outn()
        .green("..... Build Complete!")
        .outn()
    ;

};