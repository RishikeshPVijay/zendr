

const ejs = require('ejs');
const fs =  require('fs');
const path = require('path');


function dirmaker(dir, ip, port){

//making the arrays for use
var thisDir = new Array();
var thisFile = new Array();
var DirFile = new Object();


//read the directory
var files = fs.readdirSync(dir);


//check for folders
for(var i = 0; i < files.length; i++){


    stats = fs.statSync(dir  + files[i]);
   

    if(!stats.isFile()){

        thisDir[i] = dir + files[i] + '/';
        
    }
   else if(stats.isFile()){

        thisFile[i] = dir + files[i];

   }//end of if


    }//end of loop

    thisDir = thisDir.filter(function (val){

        return val != null; 

    });

    thisFile = thisFile.filter(function (val){

        return val != null; 

    });
    
    DirFile = {

        'thisDir' : thisDir,
        'thisFile' : thisFile

    }

    //render the view with it
    let template = fs.readFileSync(__dirname + '/../../' + 'views/serve.ejs', 'utf-8');
    let html = ejs.render(template, {data : DirFile, path : path, __dirname : __dirname , dir: dir});

    return html;













}//end of func


module.exports = dirmaker;