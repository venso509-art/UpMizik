<?php
/**
 * UpMizik - Social Posts & Feed API Endpoint (Hostinger / MySQL)
 */

require_once __DIR__ . '/../config/db.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------
// GET: Rekipere tout piblikasyon sosyal yo ak kòmantè yo
// ----------------------------------------------------------
if ($method === 'GET') {
    $postId = $_GET['id'] ?? null;
    $artistId = $_GET['artistId'] ?? null;

    if ($postId) {
        $stmt = $pdo->prepare("SELECT * FROM social_posts WHERE id = ?");
        $stmt->execute([$postId]);
        $post = $stmt->fetch();
        if ($post) {
            $post['tags'] = !empty($post['tags']) ? json_decode($post['tags'], true) : [];
            $post['isPinned'] = (bool)$post['isPinned'];
            
            $comStmt = $pdo->prepare("SELECT * FROM social_comments WHERE postId = ? ORDER BY created_at ASC");
            $comStmt->execute([$postId]);
            $post['comments'] = $comStmt->fetchAll();

            jsonResponse(['success' => true, 'post' => $post]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Piblikasyon an pa jwenn.'], 404);
        }
    } else {
        $query = "SELECT * FROM social_posts WHERE 1=1";
        $params = [];
        if ($artistId) {
            $query .= " AND artistId = ?";
            $params[] = $artistId;
        }
        $query .= " ORDER BY isPinned DESC, created_at DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $posts = $stmt->fetchAll();

        foreach ($posts as &$p) {
            $p['tags'] = !empty($p['tags']) ? json_decode($p['tags'], true) : [];
            $p['isPinned'] = (bool)$p['isPinned'];
        }

        jsonResponse(['success' => true, 'posts' => $posts, 'count' => count($posts)]);
    }
}

// ----------------------------------------------------------
// POST: Ajoute yon nouvo piblikasyon sosyal oswa kòmantè
// ----------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonInput();
    $action = $data['action'] ?? 'post';

    // A. Kòmantè sou yon post
    if ($action === 'comment') {
        $postId = $data['postId'] ?? null;
        $content = trim($data['content'] ?? '');
        $authorName = trim($data['authorName'] ?? 'Fanatik UpMizik');
        $authorAvatar = $data['authorAvatar'] ?? null;

        if (!$postId || empty($content)) {
            jsonResponse(['success' => false, 'message' => 'postId ak content obligatwa.'], 400);
        }

        $comId = 'com_' . time() . '_' . bin2hex(random_bytes(2));
        $stmt = $pdo->prepare("
            INSERT INTO social_comments (id, postId, authorName, authorAvatar, content, likes)
            VALUES (?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute([$comId, $postId, $authorName, $authorAvatar, $content]);

        // Ogmante kontè kòmantè nan post la
        $pUp = $pdo->prepare("UPDATE social_posts SET commentsCount = commentsCount + 1 WHERE id = ?");
        $pUp->execute([$postId]);

        jsonResponse(['success' => true, 'message' => 'Kòmantè pibliye.', 'commentId' => $comId]);
    }

    // B. Like yon post
    if ($action === 'like') {
        $postId = $data['postId'] ?? null;
        if (!$postId) {
            jsonResponse(['success' => false, 'message' => 'postId obligatwa.'], 400);
        }
        $stmt = $pdo->prepare("UPDATE social_posts SET likes = likes + 1 WHERE id = ?");
        $stmt->execute([$postId]);
        jsonResponse(['success' => true, 'message' => 'Like anrejistre.']);
    }

    // C. Kreye yon nouvo post
    if (empty($data['artistId']) || empty($data['content'])) {
        jsonResponse(['success' => false, 'message' => 'artistId ak kontni obligatwa.'], 400);
    }

    $id = !empty($data['id']) ? $data['id'] : 'post_' . time() . '_' . bin2hex(random_bytes(3));
    $artistId = $data['artistId'];
    $artistName = $data['artistName'] ?? 'Atis';
    $stageName = $data['stageName'] ?? $artistName;
    $artistAvatar = $data['artistAvatar'] ?? null;
    $platform = in_array($data['platform'] ?? 'twitter', ['twitter', 'instagram']) ? $data['platform'] : 'twitter';
    $handle = $data['handle'] ?? ('@' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $stageName)));
    $postUrl = $data['postUrl'] ?? null;
    $content = trim($data['content']);
    $imageUrl = $data['imageUrl'] ?? null;
    $timestamp = $data['timestamp'] ?? 'Kounye a';
    $associatedSongId = $data['associatedSongId'] ?? null;
    $associatedSongTitle = $data['associatedSongTitle'] ?? null;
    $tags = !empty($data['tags']) ? json_encode($data['tags'], JSON_UNESCAPED_UNICODE) : null;
    $isPinned = !empty($data['isPinned']) ? 1 : 0;

    $stmt = $pdo->prepare("
        INSERT INTO social_posts (
            id, artistId, artistName, stageName, artistAvatar, platform, handle,
            postUrl, content, imageUrl, timestamp, associatedSongId, associatedSongTitle,
            tags, isPinned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $id, $artistId, $artistName, $stageName, $artistAvatar, $platform, $handle,
        $postUrl, $content, $imageUrl, $timestamp, $associatedSongId, $associatedSongTitle,
        $tags, $isPinned
    ]);

    jsonResponse(['success' => true, 'message' => 'Piblikasyon kreye avèk siksè.', 'postId' => $id], 201);
}

// ----------------------------------------------------------
// DELETE: Efase yon post
// ----------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'ID post obligatwa.'], 400);
    }
    $stmt = $pdo->prepare("DELETE FROM social_posts WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'Post efase avèk siksè.']);
}
