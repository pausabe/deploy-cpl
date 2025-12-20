const DatabaseKeys = require("./DatabaseKeys");
const sqlite3 = require('sqlite3').verbose();
const Logger = require('../Utils/Logger');

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

async function GetDatabaseVersion(databasePath){
    return new Promise((resolve, reject) => {
        try {
            const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    Logger.LogError(Logger.LogKeys.DatabaseService, "GetDatabaseVersion", "Error opening database:", err);
                    resolve({ version: null, error: err.message });
                    return;
                }
            });
            
            db.get("SELECT MAX(date) as lastDate FROM _tables_log", (err, row) => {
                db.close();
                
                if (err) {
                    Logger.LogError(Logger.LogKeys.DatabaseService, "GetDatabaseVersion", "Error querying version:", err);
                    resolve({ version: null, error: err.message });
                } else if (row && row.lastDate) {
                    resolve({ version: row.lastDate, error: null });
                } else {
                    resolve({ version: null, error: "No records found in _tables_log" });
                }
            });
        } catch (err) {
            Logger.LogError(Logger.LogKeys.DatabaseService, "GetDatabaseVersion", err);
            resolve({ version: null, error: err.message });
        }
    });
}

module.exports = { OpenDatabase, CloseDatabase, ExecQuery, GetDatabaseVersion }