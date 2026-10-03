/* 장별 출처: 메모리(l-memory), 디스크(l-disk), 데이터베이스(l-db)
   본문·표와 시뮬레이션 ladder·gc·leak·disk·dbpool의 근거 */
Object.assign(DATA.secRefs, {
  'l-memory': [
    { t: 'Designs, Lessons and Advice from Building Large Distributed Systems (LADIS 2009 keynote)', u: 'https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf', p: 'Google', n: '숫자 감각 표의 바탕: L1 캐시 0.5ns, L2 7ns, 메인 메모리 100ns, 같은 데이터센터 왕복 0.5ms, 디스크 탐색 10ms(2009년 기준, 표의 캐시 수치는 이와 조금 다른 어림값)' },
    { t: 'Solidigm™ D7-P5520 and D7-P5620 Product Brief', u: 'https://www.solidigm.com/products/data-center/product-briefs/d7-p5520-p5620-product-brief.html', p: 'Solidigm', n: '서버용 NVMe SSD의 99.99% 지연(four-nines latency) 130µs: 표의 SSD 읽기·스왑 되읽기가 100µs 안팎이라는 근거' },
    { t: 'IP Sysctl', u: 'https://docs.kernel.org/networking/ip-sysctl.html', p: 'Linux kernel', n: 'tcp_rto_min_us 기본 200,000µs: 리눅스 TCP 재전송 최소 대기 200ms(표의 TCP 재전송 줄)' },
    { t: 'What is NUMA?', u: 'https://docs.kernel.org/mm/numa.html', p: 'Linux kernel', n: '다른 CPU 쪽(원격) 메모리는 로컬보다 접근이 느리고 대역폭이 낮음(표의 NUMA 줄)' },
    { t: 'JEP 439: Generational ZGC', u: 'https://openjdk.org/jeps/439', p: 'OpenJDK', n: 'G1 멈춤은 수 ms~수 초, ZGC 멈춤은 1ms 이하(본문의 힙 전체 GC 수백 ms~수 초, 표의 큰 힙 GC 1초)' },
    { t: 'Available Collectors', u: 'https://docs.oracle.com/en/java/javase/25/gctuning/available-collectors.html', p: 'Oracle', n: 'ZGC는 처리량을 조금 내주고 최대 멈춤을 1ms 미만으로, 멈춤은 힙 크기와 무관' },
    { t: 'Garbage Collector Implementation', u: 'https://docs.oracle.com/en/java/javase/25/gctuning/garbage-collector-implementation.html', p: 'Oracle', n: '세대별 수집: Young만 도는 minor 수집은 짧고 힙 전체를 도는 major 수집은 훨씬 오래 걸림(GC 실험의 세대별 모드)' },
    { t: 'The Z Garbage Collector', u: 'https://docs.oracle.com/en/java/javase/25/gctuning/z-garbage-collector1.html', p: 'Oracle', n: 'ZGC는 비싼 일을 동시에 해 1ms 넘게 멈추지 않지만 회수가 모자라면 애플리케이션이 GC를 기다리며 멈출 수 있음(GC 실험의 동시 수행 모드)' },
    { t: 'A Guide to the Go Garbage Collector', u: 'https://go.dev/doc/gc-guide', p: 'Go', n: 'GC 표시 단계가 CPU의 25%를 써서 그동안 프로그램이 느려지고 할당이 많으면 고루틴이 GC를 돕느라(assist) 지연(GC 실험의 동시 수행 모드)' },
    { t: 'Go 1.8 Release Notes', u: 'https://go.dev/doc/go1.8', p: 'Go', n: 'Go GC 멈춤은 보통 100µs 미만' },
    { t: 'Debug a memory leak in .NET', u: 'https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak', p: '.NET', n: 'GC가 있어도 더는 필요 없는 객체를 계속 참조하면 누수가 생김' },
    { t: 'Concepts overview', u: 'https://docs.kernel.org/admin-guide/mm/concepts.html', p: 'Linux kernel', n: '메모리가 모자라면 페이지 캐시·스왑 가능한 페이지를 회수하고 그래도 안 되면 OOM 킬러가 프로세스를 강제 종료(누수 실험)' },
  ],
  'l-disk': [
    { t: 'Exos X18 Data Sheet', u: 'https://www.seagate.com/www-content/datasheets/pdfs/exos-x18-mango-DS2045-1N-2007US-en_US.pdf', p: 'Seagate', n: '7,200rpm HDD의 4K 무작위 읽기 170 IOPS, 평균 회전 지연 4.16ms(본문의 HDD 150번 남짓, 디스크 실험의 HDD)' },
    { t: 'D3-S4520 SSD', u: 'https://www.solidigm.com/products/data-center/d3/s4520.html', p: 'Solidigm', n: 'SATA SSD 4KB 무작위 읽기·쓰기 최대 92K/48K IOPS(본문의 SSD 수만 번)' },
    { t: 'Solidigm™ D7-P5520 and D7-P5620 Product Brief', u: 'https://www.solidigm.com/products/data-center/product-briefs/d7-p5520-p5620-product-brief.html', p: 'Solidigm', n: 'NVMe SSD 무작위 읽기·쓰기 1,000K/200K IOPS(본문의 수십만 번)' },
    { t: 'Amazon EBS General Purpose SSD volumes', u: 'https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html', p: 'AWS', n: 'gp3 기본 3,000 IOPS, gp2는 I/O 크레딧으로 3,000 IOPS까지 버스트하다 크레딧이 떨어지면 기준 성능으로' },
    { t: 'Amazon EBS-optimized instance types', u: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html', p: 'AWS', n: '작은 인스턴스는 EBS 최대 성능을 24시간에 한 번 30분만 내고 기준 성능으로 돌아감(예: t4g.2xlarge 기준 4,000·최대 15,700 IOPS, 디스크 실험의 클라우드 버스트형 가정)' },
    { t: 'Managed disk bursting', u: 'https://learn.microsoft.com/en-us/azure/virtual-machines/disk-bursting', p: 'Microsoft Azure', n: '작은 디스크·VM은 크레딧으로 최대 30분 버스트' },
    { t: 'Concepts overview', u: 'https://docs.kernel.org/admin-guide/mm/concepts.html', p: 'Linux kernel', n: '파일에 쓴 데이터는 페이지 캐시에 먼저 담기고 dirty로 표시된 뒤 나중에 디스크로 기록' },
    { t: 'Documentation for /proc/sys/vm/', u: 'https://docs.kernel.org/admin-guide/sysctl/vm.html', p: 'Linux kernel', n: '밀린 쓰기가 dirty_ratio에 닿으면 쓰는 프로세스가 직접 디스크 기록을 떠맡음(디스크 실험의 OS 쓰기 한도)' },
    { t: 'fsync(2) — Linux manual page', u: 'https://man7.org/linux/man-pages/man2/fsync.2.html', p: 'Linux man-pages', n: 'fsync는 장치가 기록 완료를 알릴 때까지 블록' },
  ],
  'l-db': [
    { t: 'How MySQL Uses Indexes', u: 'https://dev.mysql.com/doc/refman/8.4/en/mysql-indexes.html', p: 'MySQL', n: '인덱스가 없으면 첫 행부터 테이블 전체를 읽음(풀 스캔)' },
    { t: 'InnoDB Locking', u: 'https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html', p: 'MySQL', n: '행 잠금을 잡은 트랜잭션이 끝날 때까지 같은 행을 고치려는 요청은 대기(핫 로우)' },
    { t: 'Number Of Database Connections', u: 'https://wiki.postgresql.org/wiki/Number_Of_Database_Connections', p: 'PostgreSQL', n: 'DB 자원을 다 쓴 뒤에는 연결을 늘려도 처리량이 떨어짐(DB 실험에서 풀을 키워도 CPU 코어가 모자라면 모두 느려지는 근거)' },
    { t: 'WAL Configuration (PostgreSQL Documentation)', u: 'https://www.postgresql.org/docs/current/wal-configuration.html', p: 'PostgreSQL', n: '체크포인트는 기본 5분 또는 WAL 1GB마다 더티 페이지를 몰아 쓰는 비싼 작업, 쓰기를 나눠 I/O 폭주를 피함' },
    { t: 'Semisynchronous Replication', u: 'https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html', p: 'MySQL', n: '비동기 복제에서 주 DB가 죽으면 커밋된 트랜잭션이 예비 DB에 없을 수 있음(전환 뒤 롤백)' },
    { t: 'Log-Shipping Standby Servers (PostgreSQL Documentation)', u: 'https://www.postgresql.org/docs/current/warm-standby.html', p: 'PostgreSQL', n: '스트리밍 복제는 기본 비동기라 커밋과 복제본 반영 사이에 지연이 있음(복제본에서 방금 쓴 내용이 안 보임)' },
    { t: 'Asynchronous Commit (PostgreSQL Documentation)', u: 'https://www.postgresql.org/docs/current/wal-async-commit.html', p: 'PostgreSQL', n: '기록을 모아 늦게 내리면 빨라지는 대신 장애 때 최근 변경을 잃는 맞바꿈(몇 분마다 저장하는 게임 서버와 같은 구조)' },
  ],
});
