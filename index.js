const cli = require("@flagfw/cli");
const fs = require("fs");
const { execSync } = require("child_process");
const filePath = require("path");

const setScript = function(name, contents){
    contents = "var exports = {};\n" + contents + ";\nreturn exports;";
    return "flag.setFn(\"" + name + "\", function(){\n" + contents + "});\n";
};

const setContent = function(name, content){
//        var content = fs.readFileSync(path).toString();
    content = Buffer.from(content).toString('base64'); 
    return "flag.setFn(\"" + name + "\", function(){ return \"" + content + "\"});\n";
};

const deepSearch = function(path){

    var judge = false;
    try{

        if(fs.statSync(path).isDirectory()){
            judge = true;
        }

    }catch(error){
        return null;
    }

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

    var buff = stringBuff.split("    ");
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

module.exports = function(option, cliOption){

    if(!cliOption){
        cliOption = [];
    }

    cli
        .indent(2)
        .outn()
        .outn("Build Start!!")
        .outn()
    ;

    const padEnd = 22;

    if(option == undefined){
        option = {};
    }    

    if(option.rootPath == undefined){
        option.rootPath = "./src";
    }

    if(option.appPath == undefined){
        option.appPath = option.rootPath + "/app";
    }

    if(option.renderingPath == undefined){
        option.renderingPath = option.rootPath + "/rendering";
    }

    if(option.commonPath == undefined){
        option.commonPath = option.rootPath + "/common";
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

    if(option.typeScript){
        cli.green("#").out("TypeScript Complie....");

        try{
            execSync("tsc", {cwd: option.rootPath});
            cli.outn("OK");
        }catch(error){
            cli.red("NG!").outn();
            if(error.stdout){
                cli.red("[TypeScript Error] ").outn(error.stdout.toString());
            }
            else{
                cli.red("[TypeScript Error] ").outn(error.toString());
            }
            return;
        }
    }

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

    var renderingFile = deepSearch(option.renderingPath);

    if(renderingFile){
        for(var n = 0 ; n < renderingFile.file.length ; n++){
            var contentPath = renderingFile.file[n];
            var contentname = contentPath.substring(option.renderingPath.length);
            if(contentname.substring(0,1)=="/"){
                contentname = contentname.substring(1);
            }
            var content = fs.readFileSync(contentPath).toString();
            scriptStr += setContent(contentname, content);

            cli.green("#").outn("Set Content(HTML) ".padEnd(padEnd) + contentname);
        }
    }

    if(option.appPathTsComplied){
        var appFile = deepSearch(option.appPathTsComplied);
    }
    else{
        var appFile = deepSearch(option.appPath);
    }

    if(appFile){
        for(var n = 0 ; n < appFile.file.length ; n++){
            var file = appFile.file[n];

            if(filePath.extname(file) != ".js"){
                continue;
            }

            if(option.appPathTsComplied){
                var fileName = "app/" + file.substring(option.appPathTsComplied.length + 1).slice(0, -3);
            }
            else{
                var fileName = "app/" + file.substring(option.appPath.length + 1).slice(0, -3);
            }
            var contents = fs.readFileSync(file).toString();
            scriptStr += setScript(fileName , contents);
            cli.green("#").outn("Set Content(JS) ".padEnd(padEnd) + fileName);
            if(option.sourceMap){
                maps.sources.push(fileName);
                maps.sourcesContent.push(contents);
            }
        }
    }

    fs.mkdirSync(option.buildPath,{
        recursive: true,
    });
    cli.green("#").outn("Mkdir " + option.buildPath);

    var commonFile = deepSearch(option.commonPath);

    if(commonFile){
        for(var n = 0 ; n < commonFile.dir.length ; n++){
            var dir = commonFile.dir[n];

            fs.mkdirSync(option.buildPath + "/" + dir.substring(option.commonPath.length + 1),{
                recursive: true,
            });
            cli.green("#").outn("Mkdir  ".padEnd(padEnd) + option.buildPath + "/" + dir.substring(option.commonPath.length + 1));
        }
        for(var n = 0 ; n < commonFile.file.length ; n++){
            var file = commonFile.file[n];

            fs.copyFileSync(file, option.buildPath + "/" + file.substring(option.commonPath.length + 1));
            cli.green("#").outn("CopyFile " .padEnd(padEnd) + file.substring(option.commonPath.length + 1));
        }
    }

    fs.copyFileSync(option.rootPath + "/index.html", option.buildPath + "/index.html");
    cli.green("#").outn("CopyFile index.html");

    if(option.startCallback){
        scriptStr += "flag.start(" + option.startCallback.toString() + ");\n";  
    }
    else{
        scriptStr += "flag.start();\n";
    }
    
    scriptStr += "})();"

    if(option.compress){
        scriptStr = notCommentout(scriptStr);
        cli.green("#").outn("code Compress...");
    }

    if(option.sourceMap){
        scriptStr = "//# sourceMappingURL=index.min.map\n" + scriptStr;
    }

    fs.writeFileSync(option.buildPath + "/index.min.js", scriptStr);
    cli.green("#").outn("Build ".padEnd(padEnd) + option.buildPath + "/index.min.js");

    if(option.sourceMap){
        fs.writeFileSync(option.buildPath + "/index.min.map", JSON.stringify(maps));
        cli.green("#").outn("MakeMap ".padEnd(padEnd) + option.buildPath + "/index.min.map");
    }

    if(!cliOption.noExit){
        cli
            .outn()
            .green("..... Build Complete!")
            .outn()
        ;

    }

};