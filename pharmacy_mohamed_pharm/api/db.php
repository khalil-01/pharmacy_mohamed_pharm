<?php

declare(strict_types=1);

$__pdoInstance = null;

function getDbConnection(): PDO
{
    global $__pdoInstance;

    if ($__pdoInstance !== null) {
        return $__pdoInstance;
    }

    $config = require __DIR__ . '/config.php';

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset']
    );

    try {
        $__pdoInstance = new PDO($dsn, $config['db_user'], $config['db_password'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        sendDatabaseError('Database connection failed: ' . $e->getMessage());
    }

    return $__pdoInstance;
}

function sendDatabaseError(string $message, int $statusCode = 500): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function runMysqlQuery(string $query, bool $allowEmptyResult = false): ?string
{
    $pdo = getDbConnection();

    try {
        $stmt = $pdo->query($query);
        $row = $stmt->fetch(PDO::FETCH_NUM);

        if ($row === false || $row[0] === null) {
            if ($allowEmptyResult) {
                return null;
            }
            sendDatabaseError('MySQL query returned no rows.');
        }

        return (string) $row[0];
    } catch (PDOException $e) {
        sendDatabaseError('MySQL query failed: ' . $e->getMessage());
    }

    return null;
}

function runMysqlJsonQuery(string $query, bool $allowEmptyResult = false)
{
    $rawOutput = runMysqlQuery($query, $allowEmptyResult);
    if ($rawOutput === null) {
        return null;
    }

    $decoded = json_decode($rawOutput, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendDatabaseError('Failed to decode MySQL JSON response.');
    }

    return $decoded;
}

function escapeSqlString(string $value): string
{
    $pdo = getDbConnection();
    $quoted = $pdo->quote($value);
    return substr($quoted, 1, -1);
}
