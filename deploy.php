<?php
/**
 * Self-deploying script for pharmacy_mohamed_pharm
 * Upload this ONE file to Hostinger File Manager at /public_html/deploy.php
 * Then visit: https://mohammedpharm.com/deploy.php
 * It will download all files from GitHub and import the database.
 * DELETE this file after deployment for security!
 */

set_time_limit(300);
error_reporting(E_ALL);
ini_set('display_errors', 1);

$SECRET_KEY = 'deploy_pharm_2026';
if (!isset($_GET['key']) || $_GET['key'] !== $SECRET_KEY) {
    die('Access denied. Use: deploy.php?key=' . $SECRET_KEY);
}

echo "<pre>\n";
echo "=== Pharmacy Mohamed Pharm - Auto Deploy ===\n\n";

// Config
$repoZipUrl = 'https://github.com/khalil-01/pharmacy_mohamed_pharm/archive/refs/heads/devin/1779720983-hostinger-deploy.zip';
$publicHtml = __DIR__;

// Step 0: Enable maintenance mode
echo "[0/5] Enabling maintenance mode...\n";
$htaccessFile = $publicHtml . '/.htaccess';
if (file_exists($htaccessFile)) {
    $htaccess = file_get_contents($htaccessFile);
    $htaccess = str_replace(
        ['#RewriteCond %{REQUEST_URI} !^/maintenance\\.html$',
         '#RewriteCond %{REQUEST_URI} !^/deploy\\.php$',
         '#RewriteRule ^(.*)$ /maintenance.html [R=302,L]'],
        ['RewriteCond %{REQUEST_URI} !^/maintenance\\.html$',
         'RewriteCond %{REQUEST_URI} !^/deploy\\.php$',
         'RewriteRule ^(.*)$ /maintenance.html [R=302,L]'],
        $htaccess
    );
    file_put_contents($htaccessFile, $htaccess);
    echo "  Maintenance mode ON\n";
}
$dbHost = 'localhost';
$dbName = 'u385651399_pharm';
$dbUser = 'u385651399_mohammed';
$dbPass = '^5um>:+kzQJ>xJ8';

// Step 1: Download repo ZIP from GitHub
echo "[1/5] Downloading files from GitHub...\n";
$zipFile = $publicHtml . '/repo_temp.zip';
$zipData = file_get_contents($repoZipUrl);
if ($zipData === false) {
    die("ERROR: Failed to download from GitHub. Check URL.\n");
}
file_put_contents($zipFile, $zipData);
echo "  Downloaded " . strlen($zipData) . " bytes\n";

// Step 2: Extract files
echo "\n[2/5] Extracting files...\n";
$zip = new ZipArchive;
$res = $zip->open($zipFile);
if ($res !== TRUE) {
    die("ERROR: Failed to open ZIP file (code: $res)\n");
}

$extractDir = $publicHtml . '/repo_temp_extract';
$zip->extractTo($extractDir);
$zip->close();
unlink($zipFile);

// Find the inner pharmacy_mohamed_pharm folder
$extractedItems = scandir($extractDir);
$repoDir = '';
foreach ($extractedItems as $item) {
    if ($item === '.' || $item === '..') continue;
    $repoDir = $extractDir . '/' . $item;
    break;
}

// The files are in repoDir/pharmacy_mohamed_pharm/
$sourceDir = $repoDir . '/pharmacy_mohamed_pharm';
if (!is_dir($sourceDir)) {
    die("ERROR: Could not find pharmacy_mohamed_pharm folder in extracted files\n");
}

echo "  Source: $sourceDir\n";

// Step 3: Copy files to public_html
echo "\n[3/5] Copying files to public_html...\n";
$fileCount = 0;

function copyDirectory($src, $dst) {
    global $fileCount;
    if (!is_dir($dst)) {
        mkdir($dst, 0755, true);
    }
    $dir = opendir($src);
    while (($file = readdir($dir)) !== false) {
        if ($file === '.' || $file === '..') continue;
        $srcPath = $src . '/' . $file;
        $dstPath = $dst . '/' . $file;
        if (is_dir($srcPath)) {
            copyDirectory($srcPath, $dstPath);
        } else {
            copy($srcPath, $dstPath);
            $fileCount++;
            echo "  Copied: $file\n";
        }
    }
    closedir($dir);
}

copyDirectory($sourceDir, $publicHtml);
echo "  Total files copied: $fileCount\n";

// Clean up temp files
function deleteDirectory($dir) {
    if (!is_dir($dir)) return;
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . '/' . $item;
        if (is_dir($path)) {
            deleteDirectory($path);
        } else {
            unlink($path);
        }
    }
    rmdir($dir);
}
deleteDirectory($extractDir);

// Step 4: Import SQL database
echo "\n[4/5] Importing database...\n";
$sqlFile = $publicHtml . '/database/pharmacy_mohamed_pharm.sql';
if (!file_exists($sqlFile)) {
    echo "  WARNING: SQL file not found at $sqlFile\n";
    echo "  Skipping database import.\n";
} else {
    try {
        $pdo = new PDO(
            "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
            $dbUser,
            $dbPass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo "  Database connected successfully!\n";

        $sql = file_get_contents($sqlFile);
        
        // Split by semicolons but respect strings
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        
        // Execute the full SQL dump
        $pdo->exec($sql);
        
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        
        echo "  Database imported successfully!\n";
        
        // Verify tables
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "  Tables created: " . implode(', ', $tables) . "\n";
        
    } catch (PDOException $e) {
        echo "  Database error: " . $e->getMessage() . "\n";
        echo "  Trying alternative import method...\n";
        
        // Try executing statement by statement
        try {
            $sql = file_get_contents($sqlFile);
            $statements = array_filter(
                array_map('trim', 
                    preg_split('/;\s*$/m', $sql)
                )
            );
            
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
            $success = 0;
            $errors = 0;
            foreach ($statements as $stmt) {
                if (empty($stmt) || strpos($stmt, '--') === 0) continue;
                try {
                    $pdo->exec($stmt);
                    $success++;
                } catch (PDOException $e2) {
                    $errors++;
                    if ($errors <= 3) {
                        echo "  Warning: " . substr($e2->getMessage(), 0, 100) . "\n";
                    }
                }
            }
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
            echo "  Executed $success statements ($errors errors)\n";
            
            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            echo "  Tables: " . implode(', ', $tables) . "\n";
            
        } catch (PDOException $e3) {
            echo "  Alternative import also failed: " . $e3->getMessage() . "\n";
        }
    }
}

// Step 5: Disable maintenance mode
echo "\n[5/5] Disabling maintenance mode...\n";
$htaccessFile = $publicHtml . '/.htaccess';
if (file_exists($htaccessFile)) {
    $htaccess = file_get_contents($htaccessFile);
    $htaccess = str_replace(
        ['RewriteCond %{REQUEST_URI} !^/maintenance\\.html$',
         'RewriteCond %{REQUEST_URI} !^/deploy\\.php$',
         'RewriteRule ^(.*)$ /maintenance.html [R=302,L]'],
        ['#RewriteCond %{REQUEST_URI} !^/maintenance\\.html$',
         '#RewriteCond %{REQUEST_URI} !^/deploy\\.php$',
         '#RewriteRule ^(.*)$ /maintenance.html [R=302,L]'],
        $htaccess
    );
    file_put_contents($htaccessFile, $htaccess);
    echo "  Maintenance mode OFF\n";
}

echo "\n=== DEPLOYMENT COMPLETE ===\n";
echo "Website: https://mohammedpharm.com\n";
echo "Login: https://mohammedpharm.com/login.html\n";
echo "\n*** IMPORTANT: Delete this deploy.php file now for security! ***\n";
echo "</pre>";
