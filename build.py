#!/usr/bin/env python3
"""렉 해부도감 빌드 스크립트.

src/ 아래 조각들을 하나의 자급자족 HTML로 합친다.

  python3 build.py                  # index.html (브라우저로 바로 여는 완성본, 글꼴까지 들어 있어 외부 연결 없이 열린다)
  python3 build.py --fragment OUT   # 문서 뼈대(<html>/<head>/<body>) 없는 조각본
  python3 build.py --only SIM_ID    # build/sandbox-SIM_ID.html (시뮬레이션 하나만 띄우는 시험용)
"""
import argparse
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

# 순서가 중요하다: kit → data → sims → app
CORE_JS = ["js/kit.js", "js/data.js"]  # + causes-*.js, glossary.js (core_js() 참고)
APP_JS = ["js/app.js"]


def read(rel):
    return (SRC / rel).read_text(encoding="utf-8")


# 글꼴: 완성본은 src/fonts/ 의 woff2를 페이지 안에 넣어 사내망처럼 외부가 막힌 곳에서도 같은 모양으로 보이게 한다.
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


def fonts_inline():
    rules = []
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
    return CORE_JS + causes + refs + ["js/glossary.js"]


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
    head = read("head.html").replace("<!--FONTS-->", fonts_inline() if embed_fonts else FONTS_LINK)
    css = read("style.css")
    js = scripts(js_files)
    inner_head = f"{head}\n<style>\n{css}\n</style>"
    tail = js
    if fragment:
        return f"{inner_head}\n{body}\n{tail}\n"
    return (
        "<!doctype html>\n<html lang=\"ko\">\n<head>\n"
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
