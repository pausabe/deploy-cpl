const DatabaseKeys = require("./DatabaseKeys");
const sqlite3 = require('sqlite3').verbose();
import * as Logger from '../Utils/Logger';

let CPLDataBase = undefined;

function OpenDatabase(scriptsDatabaseDirectory){
    if(CPLDataBase === undefined){
        const scriptsDatabasePath = `./${scriptsDatabaseDirectory}/${DatabaseKeys.DatabaseName}`;
        Logger.Log(Logger.LogKeys.DatabaseService, "OpenDatabase", "Opening database:", scriptsDatabasePath);
        CPLDataBase = new sqlite3.Database(scriptsDatabasePath);
    }
}

function CloseDatabase(){
    if(CPLDataBase !== undefined){
        CPLDataBase.close();
        CPLDataBase = undefined;
    }
}

function ExecQuery(query){
    return new Promise((resolve,reject) => {
        if(CPLDataBase === undefined){
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

module.exports = { OpenDatabase, CloseDatabase, ExecQuery }