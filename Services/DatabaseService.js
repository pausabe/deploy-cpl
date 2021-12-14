
const DatabaseKeys = require("./DatabaseKeys");
const sqlite3 = require('sqlite3').verbose();

var CPLDataBase = undefined;

function OpenDatabase(){
    if(CPLDataBase == undefined){
        console.log("Opening database: " + DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName);
        CPLDataBase = new sqlite3.Database(DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName);
    }
}

function CloseDatabase(){
    if(CPLDataBase != undefined){
        CPLDataBase.close();
        CPLDataBase = undefined;
    }
}

function ExecQuery(query){
    return new Promise((resolve,reject) => {
        if(CPLDataBase == undefined){
            reject("Call OpenDatabase() first")
        }
        else{
            CPLDataBase.all(query, function(err,rows){
                if(err){ 
                    reject(err); 
                }
                resolve(rows);
            });
        }
    });
}

module.exports = { OpenDatabase, CloseDatabase, ExecQuery };