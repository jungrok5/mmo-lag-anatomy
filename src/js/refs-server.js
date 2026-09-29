/* 장별 출처: 서버 게임 프로세스(l-server-proc: 본문·틱 실험·락 실험), 서버 구성과 운영(l-infra: 본문·구성도 실험) */
Object.assign(DATA.secRefs, {
  'l-server-proc': [
    { t: 'VALORANT\'s 128-Tick Servers', u: 'https://www.riotgames.com/en/news/valorants-128-tick-servers', p: 'Riot Games', n: '틱 예산: 128틱이면 한 프레임을 7.8125ms 안에 끝내야 함, 프레임 시간을 하위 시스템별로 재고 예산을 나눠 관리' },
    { t: 'Introducing Time Dilation (TiDi)', u: 'https://www.eveonline.com/news/view/introducing-time-dilation-tidi', p: 'CCP Games', n: 'EVE Online의 물리 시뮬레이션은 1초에 한 번 갱신, 과부하 때 게임 시계를 늦춰 시간에 묶인 부하를 비례해서 줄임' },
    { t: 'HED-GP Technical Retrospective: What a HED-ache', u: 'https://www.eveonline.com/news/view/what-a-hed-ache', p: 'CCP Games', n: 'Time Dilation 하한 10%, n명이 한 행동을 n명에게 알리는 O(n²) 전송이 대규모 전투의 한계 요인' },
    { t: 'Handling variation in time', u: 'https://docs.unity3d.com/Manual/time-handling-variations.html', p: 'Unity', n: '틱 실험의 모델: 고정 간격 진행이 밀리면 따라잡는 단계를 몰아서 돌리고(몰아치기), 한도를 넘긴 시간은 버려 게임 시간이 느려짐(슬로우모션)' },
    { t: 'Comparing Interest Management Algorithms for Massively Multiplayer Games', u: 'https://www.sable.mcgill.ca/~clump/papers/boulanger-06-comparing.pdf', p: 'ACM', n: 'NetGames 2006 논문(저자 공개본). 모든 쌍의 거리 비교는 인원이 늘면 감당하지 못하고, 격자로 나누면 주변 셀만 확인' },
    { t: 'Replication Graph in Unreal Engine', u: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine', p: 'Epic Games', n: '월드를 격자로 나눠 셀별 목록으로 보낼 대상을 고르면 인원·액터가 많아도 서버 CPU를 아낌' },
    { t: 'Amdahl\'s Law in the Multicore Era', u: 'https://research.cs.wisc.edu/multifacet/papers/ieeecomputer08_amdahl_multicore.pdf', p: 'IEEE', n: '락 실험의 처리량 상한: 한 번에 하나만 할 수 있는 비율이 1−f면 속도 향상은 1/(1−f)를 넘지 못함' },
    { t: 'Runtime locking correctness validator', u: 'https://docs.kernel.org/locking/lockdep-design.html', p: 'Linux kernel', n: '락 실험의 데드락: 두 락을 서로 반대 순서로 잡으면 순환 대기로 데드락' },
    { t: 'Liveness, Readiness, and Startup Probes', u: 'https://kubernetes.io/docs/concepts/workloads/pods/probes/', p: 'Kubernetes', n: '락 실험의 워치독: 데드락 상태를 라이브니스 검사로 잡아 재시작, 기본은 10초마다 검사해 3번 연속 실패하면 재시작(약 30초)' },
    { t: 'ASP.NET Core Best Practices', u: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices', p: 'Microsoft', n: '동기 호출: 데이터 접근·I/O는 비동기로 호출, 블로킹 호출은 스레드 풀 고갈과 응답 지연을 부름' },
  ],
  'l-infra': [
    { t: 'Site Reliability Engineering, Chapter 22: Addressing Cascading Failures', u: 'https://sre.google/sre-book/addressing-cascading-failures/', p: 'Google', n: '연쇄 장애: 느린 백엔드가 앞단의 스레드·자원을 붙잡고, 재시도·헬스체크 실패·캐시가 빈 재시작으로 장애가 번지는 과정과 대응' },
    { t: 'Circuit Breaker Pattern', u: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker', p: 'Microsoft Azure', n: '서킷 브레이커의 닫힘·열림·반열림 상태와 실패 횟수 기준, 타임아웃이 길면 차단되기 전까지 스레드가 묶임' },
    { t: 'Bulkhead Pattern', u: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead', p: 'Microsoft Azure', n: '기능·호출 대상별로 자원을 격리해 한 곳의 장애가 번지지 않게 함' },
    { t: 'Timeouts, retries, and backoff with jitter', u: 'https://d1.awsstatic.com/builderslibrary/pdfs/timeouts-retries-and-backoff-with-jitter.pdf', p: 'AWS', n: 'Amazon Builders\' Library. 타임아웃으로 자원을 풀고, 재시도는 횟수를 제한하고 지터를 더함' },
    { t: 'The Unique Architecture behind Amazon Games’ Seamless MMO New World', u: 'https://aws.amazon.com/blogs/gametech/the-unique-architecture-behind-amazon-games-seamless-mmo-new-world/', p: 'AWS', n: 'MMO 서버 구성 예: 입구 서버, 격자별 시뮬레이션 서버(허브), 세션용 공유 서버 풀, 상태 저장 DB' },
    { t: 'Working with DB instance read replicas', u: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html', p: 'AWS', n: '구성도 실험의 복제 지연: 읽기 복제본은 비동기로 갱신돼 옛 데이터를 읽을 수 있음' },
    { t: 'Site Reliability Engineering, Chapter 20: Load Balancing in the Datacenter', u: 'https://sre.google/sre-book/load-balancing-datacenter/', p: 'Google', n: '배포·재시작: lame duck 상태로 새 요청을 돌린 뒤 종료, 재시작 직후 예열' },
    { t: 'Amazon EC2 Auto Scaling lifecycle hooks', u: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html', p: 'AWS', n: '확장·축소 때 인스턴스를 대기 상태로 두고 준비·정리 작업을 마침(기본 1시간까지)' },
    { t: 'systemd.service(5) — Linux manual page', u: 'https://man7.org/linux/man-pages/man5/systemd.service.5.html', p: 'systemd', n: '구성도 실험의 워치독: 살아 있다는 신호가 끊긴 서비스를 종료하고 자동 재시작' },
  ],
});
