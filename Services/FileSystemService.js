const fs = require("fs");

async function MoveFile(oldFilePath, newFilePath){
    return new Promise((resolve, reject) => {
        try {
            if(fs.existsSync(oldFilePath)){
                console.log("Moving file from " + oldFilePath + " to " + newFilePath);
                fs.rename(oldFilePath, newFilePath, () => resolve());
            }
            else{
                console.log("No file to move");
                resolve();
            }
        } 
        catch (error) {
            console.log("Error moving the file:", error);
            resolve();
        }
    });
}

async function CopyFile(originPath, destinationPath){
    return new Promise((resolve, reject) => {
        try {
            if(fs.existsSync(originPath)){
                console.log("Copying file from " + originPath + " to " + destinationPath);
                fs.copyFile(originPath, destinationPath, () => resolve());
            }
            else{
                console.log("No file to move");
                resolve();
            }
        } 
        catch (error) {
            console.log("Error moving the file:", error);
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