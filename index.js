const DeployManagerService = require("./Services/DeployManagerService");
const DatabaseKeys = require("./Services/DatabaseKeys");
const DatabaseService = require("./Services/DatabaseService");
const Logger = require("./Utils/Logger")

const fs = require("fs");
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');

const port = 3000;

const cpl_user = process.env.CPL_USER;
const cpl_pass = process.env.CPL_PASS;
const expo_user = process.env.EXPO_USER;
const expo_pass = process.env.EXPO_PASS;
const expo_send = process.env.EXPO_SEND;
const expo_prod_channel = process.env.EXPO_PROD_CHANNEL;
const app_repo_branch_production = process.env.APP_REPO_BRANCH_PRODUCTION;

let webCredentials = {};
webCredentials[cpl_user] = cpl_pass;

// Protección contra ataques de fuerza bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 intentos por ventana (protege contra fuerza bruta pero permite uso normal)
    message: 'Demasiados intentos de login. Por favor, espera 15 minutos antes de volver a intentarlo.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Solo contar intentos fallidos de autenticación
    // Handler para registrar intentos bloqueados
    handler: (req, res) => {
        Logger.LogError(Logger.LogKeys.IndexJS, "RateLimiter", `Demasiados intentos de login desde IP: ${req.ip}`);
        res.status(429).send('Demasiados intentos de login. Por favor, espera 15 minutos antes de volver a intentarlo.');
    }
});

app.use(loginLimiter);
app.use(basicAuth({
        challenge: true,
        users: webCredentials,
    }),
    fileUpload({
        createParentPath: true
    }));

app.get('/', (req, res) => {
    fs.readFile("index.html", 'utf8', (err, data) => {
        if (err) {
            res.send("Unable to load index.html");
            return;
        }
        res.send(data);
    });
});

app.get('/DownloadDatabaseFromProduction', async function (req, res) {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", "Starting Download");
        const dbPath = `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
        
        // Get database version to include in filename
        const versionInfo = await DatabaseService.GetDatabaseVersion(dbPath);
        let filename = DatabaseKeys.DatabaseName; // default: cpl-app.db
        
        if (versionInfo.version) {
            // Format date as YYYY-MM-DD
            const versionDate = new Date(versionInfo.version);
            const dateStr = versionDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const baseName = DatabaseKeys.DatabaseName.replace('.db', '');
            filename = `${baseName}-${dateStr}.db`;
            Logger.Log(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", `Download with version: ${dateStr}`);
        } else {
            Logger.Log(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", "No version info, using default filename");
        }
        
        res.download(dbPath, filename);
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "DownloadDatabaseFromProduction", err);
        res.send('Something went wrong: ' + err);
    }
});

app.get('/DownloadBackup', function (req, res) {
    try {
        const filename = req.query.filename;
        if (!filename) {
            return res.status(400).send('Missing filename parameter');
        }
        
        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            Logger.LogError(Logger.LogKeys.IndexJS, "DownloadBackup", "Invalid filename: " + filename);
            return res.status(400).send('Invalid filename');
        }
        
        const backupPath = `${DatabaseKeys.DatabaseBackupDirectory}${filename}`;
        Logger.Log(Logger.LogKeys.IndexJS, "DownloadBackup", "Downloading backup: " + backupPath);
        
        if (!fs.existsSync(backupPath)) {
            return res.status(404).send('Backup file not found');
        }
        
        res.download(backupPath, filename);
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "DownloadBackup", err);
        res.status(500).send('Error downloading backup: ' + err);
    }
});

app.post('/PublishProduction', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Starting Release in production");
        if (!req.files) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "PublishProduction: cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else {
            const steps = [];
            try {
                steps.push('✅ Base de dades rebuda correctament');
                
                Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Step 1: Moving database");
                await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryName, req.files.db_file);
                steps.push('✅ Base de dades guardada al servidor');
                
                Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Step 2: Backing up database");
                const backupResult = await DeployManagerService.BackUpDatabase(DatabaseKeys.RepositoryDirectoryName);
                if (backupResult.success) {
                    steps.push(`✅ Còpia de seguretat creada: ${backupResult.filename}`);
                } else {
                    steps.push(`⚠️ Advertència: No s'ha pogut crear la còpia de seguretat (${backupResult.error})`);
                }
                
                Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Step 3: Updating repository");
                await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryName, app_repo_branch_production);
                steps.push('✅ Repositori actualitzat');
                
                Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Step 4: Deploying");
                let currentAppBuildNumber = GetCurrentAppBuildNumber(DatabaseKeys.RepositoryDirectoryName);
                let expoReleaseChannel = expo_prod_channel + "_" + currentAppBuildNumber;
                await DeployManagerService.DeployAppProject(expoReleaseChannel, DatabaseKeys.RepositoryDirectoryName, expo_user, expo_pass, expo_send);
                steps.push(`✅ Aplicació publicada al canal: ${expoReleaseChannel}`);
                
                const message = steps.join('\n');
                Logger.Log(Logger.LogKeys.IndexJS, "PublishProduction", "Publicació realitzada correctament");
                res.send(`<pre>${message}\n\n🎉 Publicació completada amb èxit!</pre>`);
            } catch (stepError) {
                steps.push(`❌ Error: ${stepError.message || stepError}`);
                const message = steps.join('\n');
                Logger.LogError(Logger.LogKeys.IndexJS, "PublishProduction", stepError);
                res.status(500).send(`<pre>${message}\n\n⚠️ La publicació ha fallat. Contacta amb l'administrador.</pre>`);
            }
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "PublishProduction", err);
        res.status(500).send(`❌ Error: ${err.message || err}`);
    }
});

app.post('/PublishTest', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "Starting Release in test");
        if (!req.files) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap base de dades introduïda");
            res.send('Error: cap base de dades introduïda');
        } else if (!req.body.repobranch) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap repo introduït");
            res.send('Error: cap repo introduït');
        } else if (!req.body.releasechannel) {
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "cap channel introduït");
            res.send('Error: cap channel introduït');
        } else {
            await PublishDatabaseChangesTest(req.files.db_file, req.body.repobranch, req.body.releasechannel);
            Logger.Log(Logger.LogKeys.IndexJS, "PublishTest", "Publicació realitzada correctament");
            res.send('Publicació realitzada correctament');
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "PublishTest", err);
        res.status(500).send(err);
    }
});

app.post('/UpdateProductionRepository', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "UpdateProductionRepository", "Update Production Repository");
        await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryName, app_repo_branch_production);
        Logger.Log(Logger.LogKeys.IndexJS, "UpdateProductionRepository", "Production repository updated correctly");
        res.send('Production repository updated correctly');
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "UpdateProductionRepository", err);
        res.status(500).send(err);
    }
});

app.get('/SystemStatus', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "SystemStatus", "Getting system status");
        
        const status = {
            usb: { mounted: false, path: DatabaseKeys.DatabaseBackupDirectory, writable: false, backups: [] },
            database: { exists: false, path: '', lastModified: null, size: 0 },
            repository: { path: DatabaseKeys.RepositoryDirectoryName, exists: false }
        };

        // Check USB mount
        try {
            const usbStats = fs.statSync(DatabaseKeys.DatabaseBackupDirectory);
            status.usb.mounted = usbStats.isDirectory();
            try {
                fs.accessSync(DatabaseKeys.DatabaseBackupDirectory, fs.constants.W_OK);
                status.usb.writable = true;
            } catch (e) {
                status.usb.writable = false;
            }
            
            // List backups
            if (status.usb.mounted) {
                const files = fs.readdirSync(DatabaseKeys.DatabaseBackupDirectory);
                status.usb.backups = files
                    .filter(f => f.endsWith('.db'))
                    .map(f => {
                        const filePath = `${DatabaseKeys.DatabaseBackupDirectory}${f}`;
                        const stats = fs.statSync(filePath);
                        return {
                            name: f,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    })
                    .sort((a, b) => b.modified - a.modified);
            }
        } catch (e) {
            status.usb.mounted = false;
            status.usb.error = e.message;
        }

        // Check database
        const dbPath = `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
        status.database.path = dbPath;
        try {
            const dbStats = fs.statSync(dbPath);
            status.database.exists = true;
            status.database.lastModified = dbStats.mtime;
            status.database.size = dbStats.size;
            
            // Get database version from _tables_log
            const versionInfo = await DatabaseService.GetDatabaseVersion(dbPath);
            status.database.version = versionInfo.version;
            status.database.versionError = versionInfo.error;
        } catch (e) {
            status.database.exists = false;
        }

        // Check repository
        try {
            const repoStats = fs.statSync(`./${DatabaseKeys.RepositoryDirectoryName}`);
            status.repository.exists = repoStats.isDirectory();
        } catch (e) {
            status.repository.exists = false;
        }

        res.json(status);
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "SystemStatus", err);
        res.status(500).json({ error: err.message });
    }
});


app.post('/UploadInitialDatabase', async (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "UploadInitialDatabase", "Uploading initial database to production");
        if (!req.files) {
            res.status(400).send('Error: No database file uploaded');
            return;
        }
        
        const steps = [];
        try {
            steps.push('✅ Base de dades rebuda correctament');
            
            Logger.Log(Logger.LogKeys.IndexJS, "UploadInitialDatabase", "Step 1: Moving database");
            await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryName, req.files.db_file);
            steps.push('✅ Base de dades guardada al projecte de producció');
            
            Logger.Log(Logger.LogKeys.IndexJS, "UploadInitialDatabase", "Step 2: Backing up database");
            const backupResult = await DeployManagerService.BackUpDatabase(DatabaseKeys.RepositoryDirectoryName);
            if (backupResult.success) {
                steps.push(`✅ Còpia de seguretat creada: ${backupResult.filename}`);
            } else {
                steps.push(`⚠️ Advertència: No s'ha pogut crear còpia de seguretat (${backupResult.error})`);
            }
            
            const message = steps.join('\n');
            Logger.Log(Logger.LogKeys.IndexJS, "UploadInitialDatabase", "Initial database uploaded successfully");
            res.send(`<pre>${message}\n\n✅ Base de dades inicial pujada correctament!\n\nAra ja pots publicar actualitzacions des de CPL Editorial.</pre>`);
        } catch (stepError) {
            steps.push(`❌ Error: ${stepError.message || stepError}`);
            const message = steps.join('\n');
            Logger.LogError(Logger.LogKeys.IndexJS, "UploadInitialDatabase", stepError);
            res.status(500).send(`<pre>${message}\n\n⚠️ Ha fallat la pujada. Contacta amb l'administrador.</pre>`);
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "UploadInitialDatabase", err);
        res.status(500).send(`❌ Error: ${err.message || err}`);
    }
});

app.get('/SystemLogs', (req, res) => {
    try {
        Logger.Log(Logger.LogKeys.IndexJS, "SystemLogs", "Getting system logs");
        
        const today = new Date();
        const fileName = today.getDate() + "_" + (today.getMonth() + 1) + "_" + today.getFullYear();
        const logPath = DatabaseKeys.DatabaseBackupDirectory + fileName + ".txt";
        
        // Try to read today's log file
        if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim() !== '');
            
            // Return last 100 lines
            const recentLogs = logLines.slice(-100);
            
            res.json({ 
                logs: recentLogs,
                file: fileName + '.txt',
                totalLines: logLines.length
            });
        } else {
            // If no log file exists, provide helpful message
            res.json({ 
                logs: [
                    '⚠️ No logs found for today.',
                    '',
                    'Possible reasons:',
                    '- USB is not mounted (logs are saved to /opt/usb)',
                    '- No logs have been generated yet today',
                    '',
                    'Expected path: ' + logPath
                ],
                file: null,
                totalLines: 0
            });
        }
    } catch (err) {
        Logger.LogError(Logger.LogKeys.IndexJS, "SystemLogs", err);
        res.status(500).json({ 
            error: err.message, 
            logs: ['❌ Error reading logs: ' + err.message]
        });
    }
});

app.listen(port, () => {
    Logger.Log(Logger.LogKeys.IndexJS, "listen", "CPL web at port:", port);
    
    // Check if database exists on startup
    const dbPath = `${__dirname}/${DatabaseKeys.RepositoryDirectoryName}${DatabaseKeys.AppProjectDatabasePath}${DatabaseKeys.DatabaseName}`;
    if (!fs.existsSync(dbPath)) {
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "⚠️⚠️⚠️ WARNING: DATABASE NOT FOUND! ⚠️⚠️⚠️");
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", `Missing database at: ${dbPath}`);
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "You MUST upload an initial database via Admin panel:");
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "1. Go to http://localhost:3000 (or your server URL)");
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "2. Open Admin tab");
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "3. Use 'Dry Run' or 'Upload Initial Database' to add a database");
        Logger.LogError(Logger.LogKeys.IndexJS, "listen", "⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️");
    } else {
        Logger.Log(Logger.LogKeys.IndexJS, "listen", "✅ Database found at:", dbPath);
    }
})

async function PublishDatabaseChangesProduction(databaseFile) {
    await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryName, databaseFile);
    await DeployManagerService.BackUpDatabase(DatabaseKeys.RepositoryDirectoryName);
    await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryName, app_repo_branch_production);
    let currentAppBuildNumber = GetCurrentAppBuildNumber(DatabaseKeys.RepositoryDirectoryName);
    let expoReleaseChannel = expo_prod_channel + "_" + currentAppBuildNumber;
    await DeployManagerService.DeployAppProject(expoReleaseChannel, DatabaseKeys.RepositoryDirectoryName, expo_user, expo_pass, expo_send);
}

async function PublishDatabaseChangesTest(databaseFile, repoBranch, expoTestChannel) {
    await DeployManagerService.MoveDatabaseInsideProject(DatabaseKeys.RepositoryDirectoryNameTest, databaseFile);
    await DeployManagerService.UpdateAppRepository(DatabaseKeys.RepositoryDirectoryNameTest, repoBranch);
    await DeployManagerService.DeployAppProject(expoTestChannel, DatabaseKeys.RepositoryDirectoryNameTest, expo_user, expo_pass, expo_send);
}

function GetCurrentAppBuildNumber(repositoryDirectoryName){
    let appConfigFilePath = `./${repositoryDirectoryName}/app.json`;
    let appConfigFileContentString = fs.readFileSync(appConfigFilePath);
    let appConfigFileContentJson = JSON.parse(appConfigFileContentString.toString());
    return appConfigFileContentJson.expo.ios.buildNumber;
}