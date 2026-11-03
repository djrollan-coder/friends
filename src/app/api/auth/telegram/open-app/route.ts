import { NextResponse } from "next/server";

function siteOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}

export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const t = new URL(request.url).searchParams.get("t")?.trim();
  if (!t) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const friends = `friends://auth?t=${encodeURIComponent(t)}`;
  const web = `${origin}/login/telegram?t=${encodeURIComponent(t)}`;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Friends</title>
  <meta http-equiv="refresh" content="0;url=${friends}" />
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#eee;font-family:-apple-system,system-ui,sans-serif}
    a{color:#c4784a}
    p{margin:8px 0;text-align:center}
  </style>
  <script>
    location.replace(${JSON.stringify(friends)});
    setTimeout(function () { location.replace(${JSON.stringify(web)}); }, 900);
  </script>
</head>
<body>
  <div>
    <p>Открываем Friends…</p>
    <p><a href="${friends}">Открыть приложение</a></p>
    <p><a href="${web}">Продолжить в браузере</a></p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
