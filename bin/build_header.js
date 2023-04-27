const Flag = function(){

    var __fn = {};
    var __fn_static = {};

    this.setFn = function(name, callback){
        __fn[name] = callback;
    };

    this.getFn = function(name){
        if(__fn_static[name]){
            return __fn_static[name];
        }
        else{
            if(__fn[name]){
                var buffer = __fn[name]();

                if(__fn_static[name] == undefined){
                    __fn_static[name] = buffer;
                }

                return buffer;
            }
            else{
                throw("No data available. Check if the file exists in the source file \"" + name + "\".")
            }
        }
    };

    this.exists = function(name){
        if(__fn[name]){
            return true;
        }

        return false;
    };

    this.start = async function(callback){

        if(callback){
            callback.bind(this)();
        }
        else{
            await use("app/index");
        }
            
    };
};
const use = function(name){
    return flag.getFn(name);
};
const uses = function(names){

    var buffers = {};
    names.forEach((n) => {
        var buff = use(n);
        var name = n.split("/");
        name = name[name.length - 1];
        buffers[name] = buff;
    });

    return buffers;
};
const useExists = function(name){
    return flag.exists(name);
};
var flag = new Flag();
