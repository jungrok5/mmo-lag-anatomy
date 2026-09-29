# 글꼴

완성본(`python3 build.py` → `index.html`)은 이 폴더의 woff2를 페이지 안에 넣는다. 그래서 외부 인터넷이 막힌 사내망에서도 같은 모양으로 보인다.

| 파일 | 출처 | 라이선스 |
|---|---|---|
| IBMPlexSansKR-{Regular,Medium,SemiBold,Bold}.woff2 | IBM 공식 npm 패키지 `@ibm/plex-sans-kr` 1.1.0 (`fonts/complete/woff2/hinted/`) 그대로 | SIL OFL 1.1, `OFL-IBM-Plex.txt` |
| IBMPlexMono-{Regular,Medium,SemiBold}.woff2 | IBM 공식 npm 패키지 `@ibm/plex-mono` 2.5.0 (`fonts/complete/woff2/`) 그대로 | SIL OFL 1.1, `OFL-IBM-Plex.txt` |
| BlackHanSans-Regular.woff2 | github.com/google/fonts `ofl/blackhansans/BlackHanSans-Regular.ttf`를 fontTools로 woff2 변환(글자 추가·삭제 없음) | SIL OFL 1.1, `OFL-Black-Han-Sans.txt` |

IBM Plex 파일은 IBM이 배포한 파일을 바꾸지 않고 쓴다(“Plex”는 예약 글꼴 이름이라 수정본에는 이 이름을 쓸 수 없다). 굵기를 추가하려면 같은 패키지에서 가져와 `build.py`의 `FONTS` 목록에 넣는다.
