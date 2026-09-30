#!/usr/bin/env python3
"""게임 렉 백서 빌드 스크립트.

src/ 아래 조각들을 하나의 자급자족 HTML로 합친다.

  python3 build.py                  # index.html (브라우저로 바로 여는 완성본, 글꼴까지 들어 있어 외부 연결 없이 열린다)
  python3 build.py --fragment OUT   # 문서 뼈대(<html>/<head>/<body>) 없는 조각본
  python3 build.py --only SIM_ID    # build/sandbox-SIM_ID.html (시뮬레이션 하나만 띄우는 시험용)
"""
import argparse
import base64
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

# 순서가 중요하다: kit → data → sims → app
CORE_JS = ["js/kit.js", "js/data.js"]  # + causes-*.js, glossary.js (core_js() 참고)
APP_JS = ["js/app.js"]


def read(rel):
    return (SRC / rel).read_text(encoding="utf-8")


# 사이트 주소와 제목. 주소는 package.json의 homepage 하나에만 적는다(본문의 %SITE%도 이 값으로 바뀐다)
SITE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["homepage"].rstrip("/") + "/"
TITLE = "게임 렉 백서"
TITLE_FULL = "게임 렉 백서: 온라인 게임 렉 원인과 해결 담당"
# 파비콘은 파일 하나로도 보이게 페이지 안에 넣는다(배포본의 다른 페이지는 src/site/favicon.svg를 쓴다)
FAVICON = "data:image/svg+xml;base64," + base64.b64encode((SRC / "site" / "favicon.svg").read_bytes()).decode("ascii")


# 검색엔진 소유 확인 태그(Google Search Console 등). 네이버 서치어드바이저 등을 추가할 때 여기에 넣는다
VERIFY = {
    "google-site-verification": "MkGziULldBfP0Ucua6AbX0riN3P2l0pfQvmSfiAtiwI",
}


def seo(head):
    """완성본에만 넣는 검색엔진·AI·링크 미리보기용 정보."""
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)">', head).group(1))
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "@id": SITE + "#website", "url": SITE, "name": TITLE, "alternateName": "Game Lag White Paper", "inLanguage": "ko"},
            {
                "@type": "TechArticle", "@id": SITE + "#article", "url": SITE, "headline": TITLE_FULL,
                "alternativeHeadline": "Game Lag White Paper: an interactive guide to online game lag causes, with MMO case studies",
                "description": desc, "inLanguage": "ko", "isPartOf": {"@id": SITE + "#website"},
                "image": SITE + "og.png", "license": "https://opensource.org/licenses/MIT", "isAccessibleForFree": True,
                "author": {"@type": "Person", "name": "jungrok5", "url": "https://github.com/jungrok5"},
                "about": ["게임 렉", "네트워크 지연", "지터", "패킷 손실", "넷코드", "TCP 재전송", "게임 서버 성능", "MMO"],
                "keywords": "렉 원인, 게임 렉, 핑, 끊김, 순간이동, 고무줄, 입력 지연, 접속 끊김, 서버 렉, 넷코드, TCP 재전송, 게임개발팀, 인프라팀",
            },
        ],
    }
    e = lambda v: html.escape(v, quote=True)
    return "\n".join([
        *[f'<meta name="{k}" content="{e(v)}">' for k, v in VERIFY.items()],
        '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">',
        f'<link rel="canonical" href="{SITE}">',
        f'<link rel="icon" href="{FAVICON}" type="image/svg+xml">',
        f'<link rel="alternate" type="text/markdown" href="{SITE}llms-full.txt" title="{TITLE} 전체 내용(마크다운)">',
        '<meta property="og:type" content="website">',
        '<meta property="og:locale" content="ko_KR">',
        f'<meta property="og:site_name" content="{TITLE}">',
        f'<meta property="og:title" content="{e(TITLE_FULL)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{SITE}">',
        f'<meta property="og:image" content="{SITE}og.png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>",
        # 스크립트가 도는 브라우저에서는 배포본의 정적 사본(.sf)을 처음부터 숨긴다(tools/site.cjs 참고)
        "<script>document.documentElement.classList.add('js')</script>",
    ])


# 글꼴: 완성본은 src/fonts/ 의 woff2를 페이지 안에 넣어 외부 인터넷이 막힌 곳에서도 같은 모양으로 보이게 한다.
# 조각본·시험용은 가볍게 Google Fonts에서 받는다.
FONTS = [
    ("IBM Plex Sans KR", 400, "IBMPlexSansKR-Regular.woff2"),
    ("IBM Plex Sans KR", 500, "IBMPlexSansKR-Medium.woff2"),
    ("IBM Plex Sans KR", 600, "IBMPlexSansKR-SemiBold.woff2"),
    ("IBM Plex Sans KR", 700, "IBMPlexSansKR-Bold.woff2"),
    ("IBM Plex Mono", 400, "IBMPlexMono-Regular.woff2"),
    ("IBM Plex Mono", 500, "IBMPlexMono-Medium.woff2"),
    ("IBM Plex Mono", 600, "IBMPlexMono-SemiBold.woff2"),
    ("Black Han Sans", 400, "BlackHanSans-Regular.woff2"),
]
FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&amp;'
    'family=IBM+Plex+Mono:wght@400;500;600&amp;family=IBM+Plex+Sans+KR:wght@400;500;600;700&amp;display=swap">'
)


FONTS_LICENSE = (
    "글꼴: IBM Plex Sans KR, IBM Plex Mono (Copyright © 2017 IBM Corp. with Reserved Font Name \"Plex\"), "
    "Black Han Sans (Copyright 2015 The Black Han Sans Project Authors). "
    "SIL Open Font License 1.1 (https://openfontlicense.org), 전문은 저장소의 src/fonts/OFL-*.txt"
)
FONTS_NOTICE = f"/* {FONTS_LICENSE} */"


def notice():
    # MIT 라이선스는 사본마다 저작권·허가 문구를 넣으라고 하므로, 파일 하나로 퍼지는 index.html 맨 앞에 넣는다.
    # 페이지 안에 넣은 글꼴은 MIT가 아니라 OFL을 따르므로 함께 적는다.
    return (
        "<!--\n게임 렉 백서\n\n" + (ROOT / "LICENSE").read_text(encoding="utf-8").strip()
        + "\n\n" + FONTS_LICENSE + "\n-->"
    )


def fonts_inline():
    rules = [FONTS_NOTICE]
    for family, weight, name in FONTS:
        data = base64.b64encode((SRC / "fonts" / name).read_bytes()).decode("ascii")
        rules.append(
            f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};font-display:swap;'
            f'src:url(data:font/woff2;base64,{data}) format("woff2")}}'
        )
    return "<style>\n" + "\n".join(rules) + "\n</style>"


def core_js():
    causes = sorted(p.relative_to(SRC).as_posix() for p in (SRC / "js").glob("causes-*.js"))
    refs = sorted(p.relative_to(SRC).as_posix() for p in (SRC / "js").glob("refs-*.js"))
    cases = ["js/cases.js"] if (SRC / "js" / "cases.js").exists() else []
    return CORE_JS + causes + refs + cases + ["js/glossary.js"]


def sim_files():
    return sorted(p.relative_to(SRC).as_posix() for p in (SRC / "sims").glob("*.js"))


def scripts(files):
    # 파일마다 따로 <script> 로 감싼다: 한 시뮬레이션의 문법 오류가 페이지 전체를 멈추지 않도록
    parts = []
    for f in files:
        # </script> 가 문자열 안에 들어가도 태그가 닫히지 않도록
        code = read(f).replace("</script", "<\\/script")
        parts.append(f'<script>\n"use strict";\n/* ==== {f} ==== */\n{code}\n</script>')
    return "\n".join(parts)


def assemble(body, js_files, fragment, embed_fonts=False):
    head = read("head.html")
    full = embed_fonts  # 완성본(index.html)에만 긴 제목과 검색엔진용 정보를 넣는다
    head = (head.replace("<!--TITLE-->", f"<title>{TITLE_FULL if full else TITLE}</title>")
                .replace("<!--SEO-->", seo(head) if full else "")
                .replace("<!--FONTS-->", fonts_inline() if embed_fonts else FONTS_LINK))
    body = body.replace("%SITE%", SITE)
    css = read("style.css")
    js = scripts(js_files)
    inner_head = f"{head}\n<style>\n{css}\n</style>"
    tail = js
    if fragment:
        # 조각본도 다른 페이지에 옮겨 붙이는 사본이라 저작권·허가 문구를 함께 둔다
        return f"{notice()}\n{inner_head}\n{body}\n{tail}\n"
    return (
        f"<!doctype html>\n{notice()}\n<html lang=\"ko\">\n<head>\n"
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f"{inner_head}\n</head>\n<body>\n{body}\n{tail}\n</body>\n</html>\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fragment", metavar="OUT")
    ap.add_argument("--only", metavar="SIM_ID")
    a = ap.parse_args()

    if a.only:
        body = (
            '<main class="sandbox"><div class="sim" data-sim="%s" id="sim-%s"></div></main>'
            % (a.only, a.only)
        )
        files = ["js/kit.js", f"sims/{a.only}.js", "js/sandbox.js"]
        out = ROOT / "build" / f"sandbox-{a.only}.html"
        out.parent.mkdir(exist_ok=True)
        out.write_text(assemble(body, files, False), encoding="utf-8")
        print(out)
        return

    body = read("body.html")
    files = core_js() + sim_files() + APP_JS
    if a.fragment:
        out = pathlib.Path(a.fragment)
        out.write_text(assemble(body, files, True), encoding="utf-8")
    else:
        out = ROOT / "index.html"
        out.write_text(assemble(body, files, False, embed_fonts=True), encoding="utf-8")
    print(out, f"{out.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
