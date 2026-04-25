<?php

declare(strict_types=1);

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

function getMysqlBinaryPath(): string
{
    $matches = glob('C:/laragon/bin/mysql/*/bin/mysql.exe');

    if (!$matches) {
        sendDatabaseError('mysql.exe was not found in Laragon.');
    }

    return str_replace('\\', '/', $matches[0]);
}

function escapeSqlString(string $value): string
{
    return strtr($value, [
        "\\" => "\\\\",
        "'" => "\\'",
        "\0" => "\\0",
        "\n" => "\\n",
        "\r" => "\\r",
        '"' => '\"',
        "\x1a" => "\\Z",
    ]);
}

function runMysqlQuery(string $query, bool $allowEmptyResult = false): ?string
{
    $mysqlBinary = getMysqlBinaryPath();
    $normalizedQuery = preg_replace('/\s+/', ' ', trim($query));

    $command = escapeshellarg($mysqlBinary)
        . ' --default-character-set=utf8mb4 -u root -N -B -D pharmacy_mohamed_pharm -e '
        . escapeshellarg($normalizedQuery ?: '')
        . ' 2>&1';

    $outputLines = [];
    $exitCode = 0;

    exec($command, $outputLines, $exitCode);

    $trimmedOutput = trim(implode(PHP_EOL, $outputLines));

    if ($exitCode !== 0 || str_contains($trimmedOutput, 'ERROR ')) {
        sendDatabaseError('MySQL query failed: ' . $trimmedOutput);
    }

    if ($trimmedOutput === '') {
        if ($allowEmptyResult) {
            return null;
        }

        sendDatabaseError('MySQL query returned no rows.');
    }

    return $trimmedOutput;
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
