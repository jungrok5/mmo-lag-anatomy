/* 장별 출처: 관측으로 판정하기 */
Object.assign(DATA.secRefs, {
  judge: [
    { t: 'Service Level Objectives (Site Reliability Engineering, ch. 4)', u: 'https://sre.google/sre-book/service-level-objectives/', p: 'Google', n: '평균 대신 백분위수(50·95·99번째)로 지연 분포의 모양과 꼬리를 본다' },
    { t: 'The Tail at Scale', u: 'https://research.google/pubs/the-tail-at-scale/', p: 'Google', n: '가끔 생기는 긴 지연(꼬리 지연)이 규모가 커질수록 전체 서비스 체감을 좌우함' },
    { t: 'RFC 3550: RTP, A Transport Protocol for Real-Time Applications', u: 'https://www.rfc-editor.org/rfc/rfc3550', p: 'IETF', n: '도착 간격 지터(interarrival jitter)의 정의와 계산' },
    { t: 'RFC 1812: Requirements for IP Version 4 Routers', u: 'https://www.rfc-editor.org/rfc/rfc1812', p: 'IETF', n: '라우터는 Time Exceeded 등 ICMP 오류 메시지의 발생 빈도를 제한할 수 있어야 하고, Echo Reply도 제한할 수 있음(mtr·ping 해석 주의)' },
    { t: 'IP Sysctl', u: 'https://docs.kernel.org/networking/ip-sysctl.html', p: 'Linux kernel', n: 'icmp_ratelimit·icmp_ratemask: 리눅스는 Time Exceeded·Destination Unreachable 등 ICMP 응답을 기본으로 제한' },
    { t: 'ss(8) — Linux manual page', u: 'https://man7.org/linux/man-pages/man8/ss.8.html', p: 'iproute2', n: 'ss -ti의 rtt(평균 왕복 시간)/rttvar 필드' },
    { t: 'pidstat(1) — Linux manual page', u: 'https://man7.org/linux/man-pages/man1/pidstat.1.html', p: 'sysstat', n: 'pidstat -t: 스레드별 CPU 사용률' },
    { t: 'bcc tools: runqlat examples', u: 'https://raw.githubusercontent.com/iovisor/bcc/master/tools/runqlat_example.txt', p: 'IO Visor', n: '런큐 지연(스레드가 CPU를 기다린 시간) 분포 측정' },
    { t: 'RIPE Atlas documentation', u: 'https://atlas.ripe.net/docs/', p: 'RIPE NCC', n: '전 세계 측정 지점에서 ping·traceroute를 돌리는 공개 합성 측정 도구' },
    { t: 'GeoLite2 Free Geolocation Data', u: 'https://dev.maxmind.com/geoip/geolite2-free-geolocation-data', p: 'MaxMind', n: 'IP 주소에 국가·ASN을 붙이는 공개 데이터베이스' },
    { t: 'View CloudWatch metrics for your instances', u: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html', p: 'AWS', n: '기본 모니터링은 5분, 상세 모니터링은 1분 간격(집계 간격이 짧은 튐을 감춤)' },
  ],
});
