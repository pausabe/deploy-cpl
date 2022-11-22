const fs = require('fs');
import * as Logger from '../Utils/Logger';

async function MoveFile(oldFilePath, newFilePath){
    return new Promise((resolve, reject) => {
        try {
            if(fs.existsSync(oldFilePath)){
                Logger.Log(Logger.LogKeys.FileSystemService, "MoveFile", "Moving file from " + oldFilePath + " to " + newFilePath);
                fs.rename(oldFilePath, newFilePath, (err) => {
                    if(err){
                        Logger.Log(Logger.LogKeys.FileSystemService, "MoveFile", "", err);
                        reject("Error moving the file");
                    }
                    else{
                        resolve()
                    }
                });
            }
            else{
                Logger.Log(Logger.LogKeys.FileSystemService, "MoveFile", "No file to move");
                reject();
            }
        } 
        catch (error) {
            Logger.LogError(Logger.LogKeys.FileSystemService, "MoveFile", error);
            resolve();
        }
    });
}

async function CopyFile(originPath, destinationPath){
    return new Promise((resolve, reject) => {
        try {
            if(fs.existsSync(originPath)){
                Logger.Log(Logger.LogKeys.FileSystemService, "CopyFile", "Copying file from " + originPath + " to " + destinationPath);
                fs.copyFileSync(originPath, destinationPath, (err) => {
                    if(err){
                        Logger.Log(Logger.LogKeys.FileSystemService, "CopyFile", "", err);
                        reject("Error copying the file");
                    }
                    else{
                        Logger.Log(Logger.LogKeys.FileSystemService, "CopyFile", "File copied correctly");
                        resolve()
                    }
                });
            }
            else{
                reject(`Origin file path (${originPath}) doesn't exist`);
            }
        } 
        catch (error) {
            Logger.LogError(Logger.LogKeys.FileSystemService, "CopyFile", error);
            resolve();
        }
    });
}

async function WriteStringInFile(path, content){
    return new Promise((resolve, reject) => {
        fs.writeFile(path, content, () => resolve());
    });
}

module.exports = { MoveFile,  WriteStringInFile, CopyFile};