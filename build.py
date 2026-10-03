#!/usr/bin/env python3
"""게임 렉 백서 빌드 스크립트.

src/ 아래 조각들을 하나의 자급자족 HTML로 합친다.

  python3 build.py                  # index.html (브라우저로 바로 여는 완성본, 글꼴까지 들어 있어 외부 연결 없이 열린다)
  python3 build.py --fragment OUT   # 문서 뼈대(<html>/<head>/<body>) 없는 조각본
  python3 build.py --only SIM_ID    # build/sandbox-SIM_ID.html (시뮬레이션 하나만 띄우는 시험용)
  python3 build.py --lang en        # 번역판: build/i18n/en/index.html (번역은 src/i18n/en/, docs/I18N_GUIDE.md)
  python3 build.py --lang en --only SIM_ID   # 번역판 시험용: build/sandbox-SIM_ID.en.html
"""
import argparse
import base64
import html
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

# 순서가 중요하다: i18n(번역 태그 TR) → kit → data → sims → app
CORE_JS = ["js/i18n.js", "js/kit.js", "js/data.js", "js/sigs.js"]  # + causes-*.js, glossary.js (core_js() 참고)
APP_JS = ["js/app.js"]


def read(rel):
    return (SRC / rel).read_text(encoding="utf-8")


# 사이트 주소와 제목. 주소는 package.json의 homepage 하나에만 적는다(본문의 %SITE%도 이 값으로 바뀐다)
SITE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["homepage"].rstrip("/") + "/"

# ---------- 언어 ----------
# 한국어가 원문이고 사이트 맨 위(/)에 있다. 번역판은 /<dir>/ 에 있다(src/i18n/langs.json).
LANGS = json.loads((SRC / "i18n" / "langs.json").read_text(encoding="utf-8"))
LANG = LANGS[0]
STR = {}  # build.py 문자열의 번역(tools/i18n.cjs pack 의 strings.json)


def available_langs():
    """번역 파일이 있고 아직 작업 중(draft)이 아닌 언어만 링크하고 빌드한다(한국어는 늘)."""
    return [l for l in LANGS if l["code"] == "ko" or ((SRC / "i18n" / l["code"]).is_dir() and not l.get("draft"))]


def lang_of(code):
    for l in LANGS:
        if code in (l["code"], l["dir"]):
            return l
    raise SystemExit(f"모르는 언어: {code}")


def tr(s, *v):
    """build.py 안의 한국어 문자열. 번역판에서는 사전에서 찾는다. {0} 자리에 v를 넣는다."""
    t = STR.get(s, s)
    return re.sub(r"\{(\d+)\}", lambda m: str(v[int(m.group(1))]), t) if v else t


def base(l=None):
    """그 언어판의 사이트 주소(한국어는 맨 위)."""
    l = l or LANG
    return SITE + (l["dir"] + "/" if l["dir"] else "")


def title():
    return tr("게임 렉 백서")


def title_full():
    return tr("게임 렉 백서: 온라인 게임 렉 원인과 해결 담당")
# 파비콘은 파일 하나로도 보이게 페이지 안에 넣는다(배포본의 다른 페이지는 src/site/favicon.svg를 쓴다)
FAVICON = "data:image/svg+xml;base64," + base64.b64encode((SRC / "site" / "favicon.svg").read_bytes()).decode("ascii")


# 검색엔진 소유 확인 태그(Google Search Console 등). 네이버 서치어드바이저 등을 추가할 때 여기에 넣는다
VERIFY = {
    "google-site-verification": "MkGziULldBfP0Ucua6AbX0riN3P2l0pfQvmSfiAtiwI",
}


def hreflang_links(rel=""):
    """같은 페이지의 언어별 주소(검색엔진이 언어판을 서로 잇는다). x-default는 영어판."""
    if len(available_langs()) < 2:
        return []
    out = []
    for l in available_langs():
        for h in [l["hreflang"], *l.get("alsoHreflang", [])]:
            out.append(f'<link rel="alternate" hreflang="{h}" href="{base(l)}{rel}">')
    xd = next((l for l in available_langs() if l.get("xdefault")), LANGS[0])
    out.append(f'<link rel="alternate" hreflang="x-default" href="{base(xd)}{rel}">')
    return out


def og_image(l=None):
    l = l or LANG
    return SITE + ("og.png" if l["code"] == "ko" else f"og-{l['dir']}.png")


def seo(head):
    """완성본에만 넣는 검색엔진·AI·링크 미리보기용 정보."""
    desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)">', head).group(1))
    url = base()
    article = {
        "@type": "TechArticle", "@id": url + "#article", "url": url, "headline": title_full(),
        "alternativeHeadline": "Game Lag White Paper: an interactive guide to online game lag causes, with MMO case studies",
        "description": desc, "inLanguage": LANG["code"], "isPartOf": {"@id": url + "#website"},
        "image": og_image(), "license": "https://opensource.org/licenses/MIT", "isAccessibleForFree": True,
        "author": {"@type": "Person", "name": "jungrok5", "url": "https://github.com/jungrok5"},
        "about": [tr("게임 렉"), tr("네트워크 지연"), tr("지터"), tr("패킷 손실"), tr("넷코드"), tr("TCP 재전송"), tr("게임 서버 성능"), "MMO"],
        "keywords": tr("렉 원인, 게임 렉, 핑, 끊김, 순간이동, 고무줄, 입력 지연, 접속 끊김, 서버 렉, 넷코드, TCP 재전송, 게임개발팀, 인프라팀"),
    }
    if LANG["code"] != "ko":
        # 번역판은 한국어 원문의 번역임을 밝힌다(AI·검색엔진이 원문과 잇는다)
        article["translationOfWork"] = {"@id": SITE + "#article"}
    else:
        article["workTranslation"] = [{"@id": base(l) + "#article"} for l in available_langs() if l["code"] != "ko"]
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebSite", "@id": url + "#website", "url": url, "name": title(), "alternateName": "Game Lag White Paper", "inLanguage": LANG["code"]},
            article,
        ],
    }
    e = lambda v: html.escape(v, quote=True)
    return "\n".join([
        *[f'<meta name="{k}" content="{e(v)}">' for k, v in VERIFY.items()],
        '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">',
        f'<link rel="canonical" href="{url}">',
        *hreflang_links(),
        f'<link rel="icon" href="{FAVICON}" type="image/svg+xml">',
        f'<link rel="alternate" type="text/markdown" href="{url}llms-full.txt" title="{e(tr("{0} 전체 내용(마크다운)", title()))}">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:locale" content="{LANG["og"]}">',
        *[f'<meta property="og:locale:alternate" content="{l["og"]}">' for l in available_langs() if l is not LANG],
        f'<meta property="og:site_name" content="{e(title())}">',
        f'<meta property="og:title" content="{e(title_full())}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{og_image()}">',
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
]
FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
    'family=IBM+Plex+Mono:wght@400;500;600&amp;family=IBM+Plex+Sans+KR:wght@400;500;600;700&amp;display=swap">'
)


FONTS_LICENSE = (
    "글꼴: IBM Plex Sans KR, IBM Plex Mono (Copyright © 2017 IBM Corp. with Reserved Font Name \"Plex\"), "
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
    # 번역판은 한글 글꼴 대신 그 언어의 시스템 글꼴을 쓴다(style.css의 :lang). 숫자·코드용 고정폭 글꼴만 넣는다
    fonts = FONTS if LANG["code"] == "ko" else [f for f in FONTS if f[0] == "IBM Plex Mono"]
    for family, weight, name in fonts:
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


PACK = None  # 번역판 빌드: tools/i18n.cjs pack 이 만든 폴더(ui.json, data.js, body.html, head.html, strings.json)


def pack(l):
    global PACK, STR
    PACK = ROOT / "build" / "i18n" / l["dir"] / "pack"
    subprocess.run(["node", str(ROOT / "tools" / "i18n.cjs"), "pack", l["code"], str(PACK)], check=True)
    STR = json.loads((PACK / "strings.json").read_text(encoding="utf-8"))


def lang_files(files):
    """번역판: 데이터 파일들 대신 번역한 DATA 한 파일(@data), 맨 앞에 화면 글자 사전(@dict)."""
    if LANG["code"] == "ko":
        return files
    data = set(core_js()) - set(CORE_JS) | {"js/data.js"}
    out = ["@dict"]
    for f in files:
        if f in data:
            if "@data" not in out:
                out.append("@data")
        else:
            out.append(f)
    return out


def source(f):
    if f == "@dict":
        ui = json.loads((PACK / "ui.json").read_text(encoding="utf-8"))
        d = {"lang": LANG["code"], "locale": LANG["locale"], "dict": ui["dict"], "scopes": ui["scopes"]}
        return "window.I18N = " + json.dumps(d, ensure_ascii=False) + ";"
    if f == "@data":
        return (PACK / "data.js").read_text(encoding="utf-8")
    return read(f)


def lang_links(absolute=False):
    """언어판 링크. 같은 자리(#…)로 가도록 app.js가 누를 때 주소 끝을 붙인다."""
    items = []
    for l in available_langs():
        href = base(l) if absolute else ("../" if LANG["dir"] else "") + (l["dir"] + "/" if l["dir"] else "")
        cur = ' aria-current="page"' if l is LANG else ""
        items.append(f'<a class="lang-link" href="{href or "./"}" hreflang="{l["hreflang"]}" lang="{l["code"]}"{cur}>{l["name"]}</a>')
    return items


def lang_switch(absolute=False):
    if len(available_langs()) < 2:
        return ""
    globe = ('<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c2 2 2.6 4.2 2.6 6.5S10 12.5 8 14.5M8 1.5C6 3.5 5.4 5.7 5.4 8S6 12.5 8 14.5"/></svg>')
    return (f'<details class="langs" translate="no"><summary aria-label="{html.escape(tr("언어 선택"))}">{globe}<span>{LANG["name"]}</span></summary>'
            f'<ul>{"".join(f"<li>{a}</li>" for a in lang_links(absolute))}</ul></details>')


def scripts(files):
    # 파일마다 따로 <script> 로 감싼다: 한 시뮬레이션의 문법 오류가 페이지 전체를 멈추지 않도록
    parts = []
    for f in lang_files(files):
        # </script> 가 문자열 안에 들어가도 태그가 닫히지 않도록
        code = source(f).replace("</script", "<\\/script")
        parts.append(f'<script>\n"use strict";\n/* ==== {f} ==== */\n{code}\n</script>')
    return "\n".join(parts)


def assemble(body, js_files, fragment, embed_fonts=False):
    head = (PACK / "head.html").read_text(encoding="utf-8") if PACK else read("head.html")
    full = embed_fonts  # 완성본(index.html)에만 긴 제목과 검색엔진용 정보를 넣는다
    head = (head.replace("<!--TITLE-->", f"<title>{html.escape(title_full() if full else title())}</title>")
                .replace("<!--SEO-->", seo(head) if full else "")
                .replace("<!--FONTS-->", fonts_inline() if embed_fonts else FONTS_LINK))
    # 조각본(다른 곳에 옮겨 붙이는 사본)의 언어 링크는 사이트 주소 그대로
    body = (body.replace("%SITE%", base())
                .replace("<!--LANGS-->", lang_switch(absolute=fragment))
                .replace("<!--LANGLIST-->", f'<p class="foot-langs" translate="no">{" · ".join(lang_links(absolute=fragment))}</p>' if len(available_langs()) > 1 else ""))
    css = read("style.css")
    js = scripts(js_files)
    inner_head = f"{head}\n<style>\n{css}\n</style>"
    tail = js
    if fragment:
        # 조각본도 다른 페이지에 옮겨 붙이는 사본이라 저작권·허가 문구를 함께 둔다
        return f"{notice()}\n{inner_head}\n{body}\n{tail}\n"
    return (
        f"<!doctype html>\n{notice()}\n<html lang=\"{LANG['code']}\">\n<head>\n"
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f"{inner_head}\n</head>\n<body>\n{body}\n{tail}\n</body>\n</html>\n"
    )


def main():
    global LANG
    ap = argparse.ArgumentParser()
    ap.add_argument("--fragment", metavar="OUT")
    ap.add_argument("--only", metavar="SIM_ID")
    ap.add_argument("--lang", metavar="CODE", help="번역판 언어(src/i18n/langs.json의 code나 dir)")
    ap.add_argument("--out", metavar="FILE", help="번역판 출력 파일(기본 build/i18n/<dir>/index.html)")
    a = ap.parse_args()
    if a.lang:
        LANG = lang_of(a.lang)
        if LANG["code"] != "ko":
            pack(LANG)

    if a.only:
        body = (
            '<main class="sandbox"><div class="sim" data-sim="%s" id="sim-%s"></div></main>'
            % (a.only, a.only)
        )
        files = ["js/i18n.js", "js/kit.js", f"sims/{a.only}.js", "js/sandbox.js"]
        out = ROOT / "build" / (f"sandbox-{a.only}.html" if LANG["code"] == "ko" else f"sandbox-{a.only}.{LANG['dir']}.html")
        out.parent.mkdir(exist_ok=True)
        out.write_text(assemble(body, files, False), encoding="utf-8")
        print(out)
        return

    body = (PACK / "body.html").read_text(encoding="utf-8") if PACK else read("body.html")
    if LANG["code"] != "ko":
        # 번역판은 한글 글꼴을 넣지 않으므로(아래 embed_fonts), 맺음말의 글꼴 목록도 실제로 넣는 것만 적는다
        body = re.sub(r'(<span class="fontlist">)[^<]*(</span>)', r"\1IBM Plex Mono\2", body)
    files = core_js() + sim_files() + APP_JS
    if LANG["code"] != "ko" and not a.fragment:
        out = pathlib.Path(a.out) if a.out else ROOT / "build" / "i18n" / LANG["dir"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(assemble(body, files, False, embed_fonts=True), encoding="utf-8")
    elif a.fragment:
        out = pathlib.Path(a.fragment)
        out.write_text(assemble(body, files, True), encoding="utf-8")
    else:
        out = ROOT / "index.html"
        out.write_text(assemble(body, files, False, embed_fonts=True), encoding="utf-8")
    print(out, f"{out.stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
