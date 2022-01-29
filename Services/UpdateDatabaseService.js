const FileSystemService = require("./FileSystemService")
const DatabaseKeys = require("./DatabaseKeys");

async function UpdateDatabase(){
    await FileSystemService.CopyFile(
        `./${DatabaseKeys.ScriptsDatabaseDirectoryName}/${DatabaseKeys.DatabaseName}`,
        `./${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`);
}

module.exports = { UpdateDatabase }