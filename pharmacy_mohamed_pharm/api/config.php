<?php

declare(strict_types=1);

return [
    'db_host'     => getenv('DB_HOST') ?: 'localhost',
    'db_name'     => getenv('DB_NAME') ?: 'pharmacy_mohamed_pharm',
    'db_user'     => getenv('DB_USER') ?: 'root',
    'db_password' => getenv('DB_PASS') ?: '',
    'db_charset'  => 'utf8mb4',
];
