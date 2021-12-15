const FileSystemService = require("./FileSystemService")
const DatabaseKeys = require("./DatabaseKeys");

async function UpdateDatabase(){
    FileSystemService.CopyFile(
        DatabaseKeys.DatabaseDirectory + DatabaseKeys.DatabaseName,
        DatabaseKeys.AppProjectDatabasePath + DatabaseKeys.DatabaseName);
}

module.exports = { UpdateDatabase };