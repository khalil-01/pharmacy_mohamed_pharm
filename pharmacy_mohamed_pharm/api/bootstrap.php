<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

$settings = runMysqlJsonQuery(
    "SELECT JSON_OBJECT(
        'pharmacyName', pharmacy_name,
        'currency', currency,
        'todayDate', CAST(CURDATE() AS CHAR),
        'lastSyncAt', last_sync_at,
        'pendingOperations', pending_operations
    )
    FROM settings
    WHERE id = 1
    LIMIT 1"
);

$branches = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'branchNumber', branch_number,
                'name', name,
                'city', city,
                'status', status
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, branch_number, name, city, status
        FROM branches
        ORDER BY branch_number ASC
    ) ordered_branches"
);

$users = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'name', name,
                'username', username,
                'role', role,
                'branchId', branch_id
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, name, username, role, branch_id
        FROM users
        ORDER BY FIELD(role, 'manager', 'stock', 'seller'), username ASC
    ) ordered_users"
);

$categories = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'name', name
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, name
        FROM categories
        ORDER BY name ASC
    ) ordered_categories"
);

$products = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'name', name,
                'categoryId', category_id,
                'baseUnit', base_unit,
                'purchasePrice', purchase_price,
                'wholesalePrice', wholesale_price,
                'salePrice', sale_price,
                'stockQty', stock_qty,
                'lowStockThreshold', low_stock_threshold,
                'expiryDate', CAST(expiry_date AS CHAR),
                'branchId', branch_id,
                'supplierName', supplier_name,
                'notes', notes
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, name, category_id, base_unit, purchase_price, wholesale_price, sale_price, stock_qty, low_stock_threshold, expiry_date, branch_id, supplier_name, notes
        FROM products
        ORDER BY branch_id IS NULL DESC, branch_id ASC, name ASC
    ) ordered_products"
);

$stockEntries = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'branchId', branch_id,
                'productId', product_id,
                'categoryId', category_id,
                'unit', unit,
                'quantity', quantity,
                'purchasePrice', purchase_price,
                'supplierName', supplier_name,
                'referenceNumber', reference_number,
                'notes', notes,
                'createdAt', CAST(created_at AS CHAR)
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, branch_id, product_id, category_id, unit, quantity, purchase_price, supplier_name, reference_number, notes, created_at
        FROM stock_entries
        ORDER BY created_at DESC, id DESC
    ) ordered_stock_entries"
);

$salesInvoices = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(invoice_json),
        JSON_ARRAY()
    )
    FROM (
        SELECT JSON_OBJECT(
            'id', si.id,
            'invoiceNumber', si.invoice_number,
            'branchId', si.branch_id,
            'sellerId', si.seller_id,
            'invoiceType', si.invoice_type,
            'total', si.total,
            'profit', si.profit,
            'createdAt', CAST(si.created_at AS CHAR),
            'items', (
                SELECT COALESCE(
                    JSON_ARRAYAGG(item_json),
                    JSON_ARRAY()
                )
                FROM (
                    SELECT JSON_OBJECT(
                        'productId', sii.product_id,
                        'productName', sii.product_name,
                        'saleType', sii.sale_type,
                        'quantity', sii.quantity,
                        'salePrice', sii.sale_price,
                        'profit', sii.profit
                    ) AS item_json
                    FROM sales_invoice_items sii
                    WHERE sii.invoice_id = si.id
                    ORDER BY sii.id ASC
                ) ordered_items
            )
        ) AS invoice_json
        FROM sales_invoices si
        ORDER BY si.created_at DESC, si.invoice_number DESC
    ) ordered_invoices"
);

$debts = runMysqlJsonQuery(
    "SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'customerName', customer_name,
                'phone', phone,
                'amount', amount,
                'invoiceId', invoice_id,
                'branchId', branch_id,
                'status', status,
                'notes', notes,
                'createdAt', CAST(created_at AS CHAR)
            )
        ),
        JSON_ARRAY()
    )
    FROM (
        SELECT id, customer_name, phone, amount, invoice_id, branch_id, status, notes, created_at
        FROM debts
        ORDER BY created_at DESC, id DESC
    ) ordered_debts"
);

echo json_encode([
    'success' => true,
    'settings' => $settings,
    'pharmacy' => $settings ? [
        'id' => 'pharmacy-001',
        'name' => $settings['pharmacyName'] ?? null,
        'currency' => $settings['currency'] ?? null,
        'todayDate' => $settings['todayDate'] ?? null,
        'lastSyncAt' => $settings['lastSyncAt'] ?? null,
    ] : null,
    'branches' => $branches,
    'users' => $users,
    'categories' => $categories,
    'products' => $products,
    'stockEntries' => $stockEntries,
    'salesInvoices' => $salesInvoices,
    'debts' => $debts,
], JSON_UNESCAPED_UNICODE);
