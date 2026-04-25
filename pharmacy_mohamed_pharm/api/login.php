<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '{}', true);

$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if ($username === '' || $password === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Username and password are required.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$escapedUsername = escapeSqlString($username);
$escapedPassword = escapeSqlString($password);

$user = runMysqlJsonQuery(
    "SELECT JSON_OBJECT(
        'id', id,
        'name', name,
        'username', username,
        'role', role,
        'branchId', branch_id
    )
    FROM users
    WHERE username = '{$escapedUsername}' AND password = '{$escapedPassword}'
    LIMIT 1",
    true
);

if (!$user) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'اسم المستخدم أو كلمة المرور غير صحيحة.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'success' => true,
    'user' => $user,
], JSON_UNESCAPED_UNICODE);
