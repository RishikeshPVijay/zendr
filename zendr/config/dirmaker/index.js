const fs =  require('fs');
const path = require('path');


function dirmaker(res, dir, location){

//making the arrays for use
var thisDir = new Array();
var thisFile = new Array();
var DirFile = new Object();
console.log(dir);


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
    res.render('lister', {data : DirFile, path : path, __dirname : __dirname ,location: location, dir: dir});


    return DirFile;












}//end of func


module.exports = dirmaker;