<?php
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$crawlers = [
    'facebookexternalhit', 'Facebot', 'Twitterbot', 'WhatsApp',
    'TelegramBot', 'LinkedInBot', 'Slackbot', 'viber', 'vkShare',
    'Pinterest', 'Googlebot', 'bingbot', 'Discordbot', 'Snapchat',
];
$isCrawler = false;
foreach ($crawlers as $bot) {
    if (stripos($userAgent, $bot) !== false) {
        $isCrawler = true;
        break;
    }
}
if (!$isCrawler) {
    readfile(__DIR__ . '/index.html');
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query = $_SERVER['QUERY_STRING'] ?? '';
$apiUrl = 'https://api.pyonea.com' . $path . ($query ? '?' . $query : '');

$context = stream_context_create([
    'http' => [
        'timeout' => 5,
        'header' => [
            'User-Agent: OGProxy/1.0',
            'Accept: text/html',
        ],
    ],
    'ssl' => [
        'verify_peer' => false,
    ],
]);

$html = @file_get_contents($apiUrl, false, $context);

if ($html === false) {
    readfile(__DIR__ . '/index.html');
    exit;
}

header('Content-Type: text/html; charset=UTF-8');
echo $html;
exit;