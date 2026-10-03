<?php
declare(strict_types=1);

/* Shared API bootstrap. Update these environment variables only if your XAMPP
 * MySQL credentials differ from the standard local installation. */
const DB_HOST = '127.0.0.1';
const DB_NAME = 'parkflow';
const DB_USER = 'root';
const DB_PASS = '';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
session_name('parkflow_session');
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'
]);

function json_response(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never {
    json_response(['ok' => false, 'message' => $message], $status);
}

function input(): array {
    static $data = null;
    if ($data !== null) return $data;
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return $data = $_POST;
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) fail('Request body must be valid JSON.', 400);
    return $data = $decoded;
}

function value(array $data, string $key, int $maxLength = 0): string {
    $result = trim((string)($data[$key] ?? ''));
    if ($maxLength && mb_strlen($result) > $maxLength) fail("$key is too long.");
    return $result;
}

function notify_user(PDO $pdo, int $userId, string $type, string $title, string $body, ?string $link = null): void {
    if ($userId < 1) return;
    $stmt = $pdo->prepare('INSERT INTO notifications(user_id,type,title,body,link) VALUES(?,?,?,?,?)');
    $stmt->execute([$userId, mb_substr($type, 0, 50), mb_substr($title, 0, 150), mb_substr($body, 0, 1000), $link]);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host=' . (getenv('PARKFLOW_DB_HOST') ?: DB_HOST) . ';dbname=' . (getenv('PARKFLOW_DB_NAME') ?: DB_NAME) . ';charset=utf8mb4',
            getenv('PARKFLOW_DB_USER') ?: DB_USER,
            getenv('PARKFLOW_DB_PASS') ?: DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
        );
    } catch (PDOException $exception) {
        fail('Database connection failed. Import database/parkflow.sql and start MySQL in XAMPP.', 503);
    }
    return $pdo;
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function require_csrf(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) fail('Your session expired. Please refresh and try again.', 419);
}

function current_user(): ?array {
    static $user = false;
    if ($user !== false) return $user;
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) return $user = null;
    $stmt = db()->prepare('SELECT u.id, u.full_name, u.email, u.phone, u.account_status, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?');
    $stmt->execute([(int)$id]);
    $row = $stmt->fetch();
    if (!$row || $row['account_status'] !== 'active') {
        $_SESSION = [];
        return $user = null;
    }
    return $user = $row;
}

function require_login(?array $roles = null): array {
    $user = current_user();
    if (!$user) fail('Please sign in to continue.', 401);
    if ($roles !== null && !in_array($user['role'], $roles, true)) fail('You do not have permission for this action.', 403);
    return $user;
}

function audit(?int $userId, string $action, string $entityType, ?int $entityId = null, ?string $details = null): void {
    $stmt = db()->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $action, $entityType, $entityId, $details, substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45)]);
    if ($entityId) notify_issue_event($action, $entityType, $entityId, $details);
}

function notify_issue_event(string $action, string $entityType, int $entityId, ?string $details = null): void {
    try {
        $pdo = db();
        if ($entityType === 'issue_report' && $action === 'create') {
            $stmt=$pdo->prepare('SELECT i.ticket_code,i.assigned_to_user_id,l.name AS location_name FROM issue_reports i LEFT JOIN parking_locations l ON l.id=i.location_id WHERE i.id=?');$stmt->execute([$entityId]);$issue=$stmt->fetch();
            if ($issue && $issue['assigned_to_user_id']) notify_user($pdo,(int)$issue['assigned_to_user_id'],'driver_issue','New driver parking issue','Report '.$issue['ticket_code'].' needs review at '.($issue['location_name'] ?: 'your assigned location').'.','#violations');
        }
        if ($entityType === 'driver_issue' && in_array($action,['review','resolve','forward'],true)) {
            $stmt=$pdo->prepare('SELECT i.ticket_code,i.driver_user_id,l.name AS location_name FROM issue_reports i LEFT JOIN parking_locations l ON l.id=i.location_id WHERE i.id=?');$stmt->execute([$entityId]);$issue=$stmt->fetch();if(!$issue)return;
            $verb=$action==='review'?'is under manager review':($action==='resolve'?'has been resolved by the manager':'was forwarded to the administrator');
            notify_user($pdo,(int)$issue['driver_user_id'],'issue_update','Your parking issue was updated','Report '.$issue['ticket_code'].' at '.($issue['location_name'] ?: 'the parking location').' '.$verb.'.'.($details ? ' Note: '.$details : ''),'#issues');
            if ($action === 'forward') { $admins=$pdo->query("SELECT u.id FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='admin' AND u.account_status='active'")->fetchAll(); foreach($admins as $admin) notify_user($pdo,(int)$admin['id'],'forwarded_issue','Manager forwarded a driver issue','Report '.$issue['ticket_code'].' requires administrator review.','#violations'); }
        }
        if ($entityType === 'forwarded_driver_report' && $action === 'resolve') {
            $stmt=$pdo->prepare("SELECT i.ticket_code,i.driver_user_id,v.assigned_manager_user_id FROM violations v LEFT JOIN issue_reports i ON v.description LIKE CONCAT('Forwarded driver report ',i.ticket_code,':%') WHERE v.id=?");$stmt->execute([$entityId]);$case=$stmt->fetch();if(!$case)return;
            if($case['driver_user_id']) notify_user($pdo,(int)$case['driver_user_id'],'issue_update','Administrator resolved your parking issue','Forwarded report '.$case['ticket_code'].' has been resolved by ParkFlow administration.'.($details ? ' Note: '.$details : ''),'#issues');
            if($case['assigned_manager_user_id']) notify_user($pdo,(int)$case['assigned_manager_user_id'],'issue_update','Forwarded driver issue resolved','Administrator resolved report '.$case['ticket_code'].'.','#violations');
        }
    } catch (Throwable $ignored) { /* Notifications must never interrupt the original business action. */ }
}

function first_id(string $sql, array $params = []): ?int {
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int)$id;
}

function normalized_vehicle_type(string $type): string {
    $type = strtolower(str_replace([' ', '-'], '_', trim($type)));
    $allowed = ['sedan','suv','hatchback','motorcycle','electric_vehicle','other'];
    return in_array($type, $allowed, true) ? $type : 'other';
}

function dynamic_hourly_rate(PDO $pdo, int $locationId, string $startsAt, float $baseRate): float {
    $when = new DateTimeImmutable($startsAt);
    $time = $when->format('H:i:s');
    $day = (int)$when->format('N');
    $stmt = $pdo->prepare("SELECT adjustment_type,adjustment_value FROM dynamic_pricing_rules WHERE is_active=1 AND (location_id=? OR location_id IS NULL) AND (day_of_week IS NULL OR day_of_week=?) AND ((start_time<=end_time AND ? >= start_time AND ? < end_time) OR (start_time>end_time AND (? >= start_time OR ? < end_time))) ORDER BY id ASC");
    $stmt->execute([$locationId,$day,$time,$time,$time,$time]);
    $rate = $baseRate;
    foreach ($stmt->fetchAll() as $rule) {
        $adjustment = (float)$rule['adjustment_value'];
        $rate = $rule['adjustment_type'] === 'fixed_amount' ? $rate + $adjustment : $rate * (1 + $adjustment / 100);
    }
    return max(0, round($rate, 2));
}

function status_label(string $status): string {
    return ucwords(str_replace('_', ' ', $status));
}
