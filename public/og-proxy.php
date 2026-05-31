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

$requestUri = str_replace("\0", '', $_SERVER['REQUEST_URI'] ?? '/');
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$path = str_replace("\0", '', $path);
$decodedPath = str_replace("\0", '', rawurldecode($path));

$hasUnsafePath = (
    strpos($decodedPath, '@') !== false ||
    strpos($decodedPath, '//') !== false ||
    strpos($decodedPath, '..') !== false ||
    strpos($decodedPath, '\\') !== false
);

$allowedRoutes = [
    '#^/$#',
    '#^/products/?$#',
    '#^/products/[^/]+/?$#',
    '#^/categories/?$#',
    '#^/categories/[^/]+/?$#',
    '#^/sellers/?$#',
    '#^/sellers/[^/]+/?$#',
    '#^/blog/?$#',
    '#^/blog/[^/]+/?$#',
    '#^/(faq|shipping|seller-guidelines|bulk-order-tool|product-comparison|compare|pricing|about-us|terms|help|legal|privacy-policy|return-policy|contact|local-deals|order-tracking|track-order)/?$#',
];

$isAllowedRoute = false;
foreach ($allowedRoutes as $pattern) {
    if (preg_match($pattern, $decodedPath)) {
        $isAllowedRoute = true;
        break;
    }
}

if ($hasUnsafePath || !$isAllowedRoute) {
    readfile(__DIR__ . '/index.html');
    exit;
}

$queryParams = [];
parse_str(str_replace("\0", '', $_SERVER['QUERY_STRING'] ?? ''), $queryParams);
$safeQuery = '';
if (isset($queryParams['lang']) && in_array($queryParams['lang'], ['en', 'my'], true)) {
    $safeQuery = '?' . http_build_query(['lang' => $queryParams['lang']]);
}

$apiUrl = 'https://api.pyonea.com' . $path . $safeQuery;

$context = stream_context_create([
    'http' => [
        'timeout' => 5,
        'header' => [
            'User-Agent: OGProxy/1.0',
            'Accept: text/html',
        ],
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
