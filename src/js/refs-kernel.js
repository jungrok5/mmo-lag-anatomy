/* 장별 출처: 서버 NIC(l-nic), 서버 OS(l-server-os), 소켓과 프로토콜(l-socket)
   본문·표와 시뮬레이션 nic·rush·hol·nagle·sndbuf의 근거 */
Object.assign(DATA.secRefs, {
  'l-nic': [
    { t: 'NAPI', u: 'https://docs.kernel.org/networking/napi.html', p: 'Linux kernel', n: '장치가 인터럽트로 새 패킷을 알리면 커널이 NAPI로 꺼내 처리, 인터럽트 묶기(병합)는 보통 장치가 함' },
    { t: 'Scaling in the Linux Networking Stack', u: 'https://docs.kernel.org/networking/scaling.html', p: 'Linux kernel', n: 'RSS로 여러 수신 큐를 여러 코어에 나누는 구조, 큐마다 인터럽트, 해시로 큐 선택' },
    { t: 'Interface statistics', u: 'https://docs.kernel.org/networking/statistics.html', p: 'Linux kernel', n: '버퍼가 없어 장치가 버린 패킷(rx_missed_errors)과 ethtool -S의 드라이버별 통계' },
    { t: 'ethtool(8) — Linux manual page', u: 'https://man7.org/linux/man-pages/man8/ethtool.8.html', p: 'ethtool', n: '링 버퍼(-G), 인터럽트 병합(-C), 수신 해시(-N), 통계(-S) 설정·확인' },
    { t: 'How to receive a million packets per second', u: 'https://blog.cloudflare.com/how-to-receive-a-million-packets/', p: 'Cloudflare', n: '큐 하나·코어 하나로는 초당 약 35만~43만 패킷에서 막히고 큐와 코어를 늘려야 100만 pps를 받는 측정(시뮬레이션은 코어당 처리량을 이보다 넉넉한 70만 pps로 가정)' },
    { t: 'Monitor network performance for ENA settings on your EC2 instance', u: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-network-performance-ena.html', p: 'AWS', n: '클라우드 인스턴스의 대역폭·PPS·연결 추적 한도를 넘으면 인스턴스 밖에서 큐잉 후 폐기, 한도 초과 카운터' },
  ],
  'l-server-os': [
    { t: 'listen(2) — Linux manual page', u: 'https://man7.org/linux/man-pages/man2/listen.2.html', p: 'Linux man-pages', n: '접속 대기열(backlog)과 somaxconn 상한(5.4부터 기본 4,096, 전에는 128)' },
    { t: 'SNMP counter', u: 'https://docs.kernel.org/networking/snmp_counter.html', p: 'Linux kernel', n: '리눅스는 accept 대기열이 가득 차면 접속 요청(SYN)을 버리고 TcpExtListenOverflows를 올림' },
    { t: 'listen function (winsock2.h)', u: 'https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-listen', p: 'Microsoft', n: '윈도우는 대기열이 가득 차면 클라이언트에 WSAECONNREFUSED' },
    { t: 'getrlimit(2) — Linux manual page', u: 'https://man7.org/linux/man-pages/man2/getrlimit.2.html', p: 'Linux man-pages', n: 'RLIMIT_NOFILE: 프로세스가 열 수 있는 fd 수 한도, 넘으면 EMFILE' },
    { t: 'systemd-system.conf(5) — Linux manual page', u: 'https://man7.org/linux/man-pages/man5/systemd-system.conf.5.html', p: 'systemd', n: '서비스의 fd 한도 기본값 1024:524288(시뮬레이션의 fd 1,024 설정 실수)' },
    { t: 'The /proc Filesystem', u: 'https://docs.kernel.org/filesystems/proc.html', p: 'Linux kernel', n: 'OOM 킬러는 메모리 사용량 비율로 매긴 점수(badness)로 죽일 프로세스를 고르고 oom_score_adj로 조정' },
    { t: 'Control Group v2', u: 'https://docs.kernel.org/admin-guide/cgroup-v2.html', p: 'Linux kernel', n: 'memory.max에 닿고 줄일 수 없으면 그 cgroup 안에서 OOM 킬러가 돎, cpu.max로 CPU 한도' },
    { t: 'proc_stat(5) — Linux manual page', u: 'https://man7.org/linux/man-pages/man5/proc_stat.5.html', p: 'Linux man-pages', n: 'steal: 가상화 환경에서 다른 운영체제에 빼앗긴 CPU 시간' },
    { t: 'Exponential Backoff And Jitter', u: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/', p: 'AWS', n: '지수 백오프만으로는 재시도가 몰리고 무작위(지터)를 섞어야 경합이 줄어듦(시뮬레이션의 재시도 방식)' },
  ],
  'l-socket': [
    { t: 'RFC 9293: Transmission Control Protocol (TCP)', u: 'https://www.rfc-editor.org/rfc/rfc9293', p: 'IETF', n: 'TCP는 순서를 지키는 신뢰성 있는 바이트 스트림, Nagle과 지연 ACK의 정의' },
    { t: 'RFC 768: User Datagram Protocol', u: 'https://www.rfc-editor.org/rfc/rfc768', p: 'IETF', n: 'UDP는 전달과 중복 방지를 보장하지 않음' },
    { t: 'RFC 8085: UDP Usage Guidelines', u: 'https://www.rfc-editor.org/rfc/rfc8085', p: 'IETF', n: '신뢰성·순서가 필요한 UDP 앱은 직접 구현해야 함' },
    { t: 'tcp(7) — Linux manual page', u: 'https://man7.org/linux/man-pages/man7/tcp.7.html', p: 'Linux man-pages', n: 'TCP_NODELAY, TCP_USER_TIMEOUT, keepalive 등 TCP 소켓 옵션' },
    { t: 'socket(7) — Linux manual page', u: 'https://man7.org/linux/man-pages/man7/socket.7.html', p: 'Linux man-pages', n: 'SO_SNDBUF·SO_RCVBUF·SO_KEEPALIVE·SO_LINGER 소켓 옵션' },
    { t: 'RFC 5681: TCP Congestion Control', u: 'https://www.rfc-editor.org/rfc/rfc5681', p: 'IETF', n: '중복 ACK 3개로 빠른 재전송, 타이머 재전송 뒤에는 혼잡 윈도우가 1세그먼트(시뮬레이션의 교과서 규칙)' },
    { t: 'RFC 8985: The RACK-TLP Loss Detection Algorithm for TCP', u: 'https://www.rfc-editor.org/rfc/rfc8985', p: 'IETF', n: '중복 ACK 개수 대신 전송 시각으로 손실을 판단하는 RACK' },
    { t: 'RFC 6298: Computing TCP\'s Retransmission Timer', u: 'https://www.rfc-editor.org/rfc/rfc6298', p: 'IETF', n: 'RTO 최소 1초 권고, 만료마다 두 배 백오프' },
    { t: 'IP Sysctl', u: 'https://docs.kernel.org/networking/ip-sysctl.html', p: 'Linux kernel', n: '리눅스 tcp_rto_min_us 기본 200ms, 손실 감지는 RACK(tcp_recovery)' },
    { t: 'include/net/tcp.h (Linux v6.12)', u: 'https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/net/tcp.h?h=v6.12', p: 'Linux kernel', n: '시뮬레이션의 리눅스 지연 ACK 40ms: TCP_DELACK_MIN(HZ/25 = 40ms), 최대 TCP_DELACK_MAX(HZ/5 = 200ms)' },
    { t: 'Design issues - Sending small data segments over TCP with Winsock', u: 'https://learn.microsoft.com/en-us/previous-versions/troubleshoot/windows/win32/data-segment-tcp-winsock', p: 'Microsoft', n: '시뮬레이션의 윈도우 지연 ACK 200ms: 데이터를 받으면 200ms 지연 ACK 타이머를 걸고 Nagle과 맞물리면 작은 패킷이 ACK를 기다림' },
    { t: 'RFC 896: Congestion Control in IP/TCP Internetworks', u: 'https://www.rfc-editor.org/rfc/rfc896', p: 'IETF', n: 'Nagle 규칙의 원래 목적: 키 입력 1바이트마다 41바이트 패킷이 나가던 원격 터미널 문제' },
    { t: 'send(2) — Linux manual page', u: 'https://man7.org/linux/man-pages/man2/send.2.html', p: 'Linux man-pages', n: '송신 버퍼가 가득 차면 블로킹 send()는 반환되지 않음' },
  ],
});
