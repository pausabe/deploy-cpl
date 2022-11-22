import DatabaseKeys from "../Services/DatabaseKeys";

const LogsEnabled = true;
const ExportLog = true;
const MessageCharacterLimit = 500;

let LastLogDay;

export let SessionLogs = "";

const fs = require('fs');

export const LogKeys = {
    DatabaseService: { name: "DatabaseManagerService", enabled: true },
    DeployManagerService: { name: "DeployManagerService", enabled: true },
    FileSystemService: { name: "FileSystemService", enabled: true },
    IndexJS: { name: "IndexJS", enabled: true },
};

export function Log(logKey, methodName, message, param = undefined, limit = MessageCharacterLimit){
    if(logKey.enabled){
        log("[" + logKey.name + " - " + methodName + "]", message, param, limit);
    }
}

export function LogError(logKey, methodName, error = undefined, limit = MessageCharacterLimit) {
    let errorName = "";
    let errorMessage = "";
    let param = "";
    if (error && error.stack && error.name && error.message) {
        errorName = error.name;
        errorMessage = error.message;
        param = error.stack;
        try {
            const errorSplit = param.split("@");
            const method = errorSplit[0];
            const fatherMethodRaw = errorSplit[1].split(":");
            const fatherMethod = fatherMethodRaw[fatherMethodRaw.length - 1].replace(/[^a-zA-Z]+/g, "");
            param = fatherMethod + " > " + method;
        } catch {
        }
    }
    log("[" + logKey.name + " - " + methodName + "] ERROR:", errorName + " " + errorMessage, param, limit);
}

function log(logKey, message, param, limit){
    try {
        if(LogsEnabled){

            cleanSession();

            message = message.substring(0, limit);
            const time = new Date().getHours().toString() + "." +
                new Date().getMinutes().toString() + "." +
                new Date().getSeconds().toString() + "." +
                new Date().getMilliseconds().toString();
            let finalMessageNoParam = time + " " + logKey + " " + message + " | ";
            if(param === undefined){
                finalMessageNoParam += "-";
                SessionLogs += finalMessageNoParam + "\n";
                console.log(finalMessageNoParam);
            }
            else{
                SessionLogs += finalMessageNoParam + param.toString() + "\n";
                console.log(finalMessageNoParam, param);
            }

            if(ExportLog){
                exportLog(SessionLogs);
            }

            LastLogDay = new Date();
        }
    }catch (e) {
        console.log("error trying to log", e);
    }

    function cleanSession(){
        if(!lastLogDateIsToday()){
            SessionLogs = "";
        }
    }

    function lastLogDateIsToday(){
        if(!LastLogDay){
            return true;
        }
        const today = new Date();
        return LastLogDay.getFullYear() === today.getFullYear() &&
            LastLogDay.getMonth() === today.getMonth() &&
            LastLogDay.getDate() === today.getDate();
    }

    function exportLog(message){
        const today = new Date();
        const fileName = today.getDate() + "_" + (today.getMonth() + 1) + "_" + today.getFullYear();
        const exportLogPath = DatabaseKeys.DatabaseBackupDirectory + fileName + ".txt";
        fs.writeFile(exportLogPath, message, (err) => {
            if (err) {
                console.log("error trying to export the log", err);
            }
        });
    }
}