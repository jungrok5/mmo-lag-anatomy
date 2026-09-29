/* 장별 출처: 클라이언트 게임 프로세스(l-client-game), 클라이언트 OS와 기기(l-client-os)
   본문·표와 시뮬레이션 frames·cpu의 근거 */
Object.assign(DATA.secRefs, {
  'l-client-game': [
    { t: 'Slow rendering', u: 'https://developer.android.com/topic/performance/vitals/render', p: 'Android (Google)', n: '60FPS를 내려면 한 프레임을 16ms 안에 그려야 하고, 늦으면 프레임을 건너뛰어 끊김으로 보임' },
    { t: 'Interpolation and extrapolation (Netcode for Entities 6.5)', u: 'https://docs.unity3d.com/Packages/com.unity.netcode@6.5/manual/interpolation.html', p: 'Unity', n: '띄엄띄엄 오는 스냅샷 사이를 이어 그리는 보간, 데이터가 늦으면 같은 방향·속도로 이어 가는 외삽과 그 상한' },
    { t: 'Introduction to prediction (Netcode for Entities 6.5)', u: 'https://docs.unity3d.com/Packages/com.unity.netcode@6.5/manual/intro-to-prediction.html', p: 'Unity', n: '클라이언트가 서버 결과를 기다리지 않고 자기 입력으로 먼저 움직이는 예측, 서버와 다르면 보정' },
    { t: 'Peeking into VALORANT\'s Netcode', u: 'https://technology.riotgames.com/news/peeking-valorants-netcode', p: 'Riot Games', n: '들쭉날쭉 오는 데이터를 버퍼로 고르게 만들면 매끄럽지만 그만큼 지연이 늘고, 추측이 틀리면 캐릭터가 튀거나 미끄러짐' },
    { t: 'Garbage collection modes', u: 'https://docs.unity3d.com/Manual/performance-incremental-garbage-collection.html', p: 'Unity', n: '실험의 GC 스파이크: 점진적 GC를 끄면 힙 전체를 검사하는 동안 메인 스레드가 멈춰 16ms 프레임 한도를 넘김' },
    { t: 'Scripting.GarbageCollector.CollectIncremental', u: 'https://docs.unity3d.com/ScriptReference/Scripting.GarbageCollector.CollectIncremental.html', p: 'Unity', n: '실험의 점진적 GC 타임 슬라이스 3ms: incrementalTimeSliceNanoseconds 기본값 3ms' },
    { t: 'Shader loading', u: 'https://docs.unity3d.com/Manual/shader-loading.html', p: 'Unity', n: '실험의 새 지역 로딩: 셰이더 변형을 처음 쓸 때 드라이버가 GPU용으로 만드느라 멈출 수 있음' },
    { t: 'Frame Pacing library', u: 'https://developer.android.com/games/sdk/frame-pacing', p: 'Android (Google)', n: '실험의 V-Sync 경계: 60Hz 화면은 새 프레임이 없으면 이전 프레임을 한 번 더 보여 줌' },
    { t: 'Set fixed timestep to optimize physics simulation frequency', u: 'https://docs.unity3d.com/Manual/physics-optimization-cpu-frequency.html', p: 'Unity', n: '실험의 고정 스텝 따라잡기: 프레임이 스텝 간격보다 길면 한 프레임에 스텝을 여러 번 돌려 부담이 커짐' },
    { t: 'Handling variation in time', u: 'https://docs.unity3d.com/Manual/time-handling-variations.html', p: 'Unity', n: '실험의 따라잡기 상한(실험은 한 프레임에 5번까지): 유니티는 한 프레임의 게임 시간을 최대 1/3초로 묶어 따라잡기 악순환을 막고, 넘친 시간만큼 게임 시계가 늦어짐' },
  ],
  'l-client-os': [
    { t: 'Multitasking', u: 'https://learn.microsoft.com/en-us/windows/win32/procthread/multitasking', p: 'Microsoft', n: '스레드마다 타임 슬라이스(약 20ms, OS·CPU에 따라 다름)를 주고 다 쓰면 다음 스레드로 넘기는 선점형 멀티태스킹' },
    { t: 'Scheduling Priorities', u: 'https://learn.microsoft.com/en-us/windows/win32/procthread/scheduling-priorities', p: 'Microsoft', n: '실행할 수 있는 스레드 중 가장 높은 우선순위의 스레드들이 타임 슬라이스를 차례로(라운드 로빈) 받음' },
    { t: 'Priority Boosts', u: 'https://learn.microsoft.com/en-us/windows/win32/procthread/priority-boosts', p: 'Microsoft', n: '앞에 띄운 창(포그라운드)의 프로세스 우선순위를 백그라운드 프로세스 이상으로 올려 줌' },
    { t: 'socket(7) — Linux manual page', u: 'https://man7.org/linux/man-pages/man7/socket.7.html', p: 'Linux man-pages', n: '소켓마다 수신 버퍼(SO_RCVBUF)가 있고 기본·최대 크기는 시스템 설정으로 정해짐' },
    { t: 'Wi-Fi low-latency mode', u: 'https://source.android.com/docs/core/connect/wifi-low-latency', p: 'Android (Google)', n: '안드로이드 10 이상의 와이파이 저지연 모드에서는 프레임워크가 와이파이 절전(doze)을 명시적으로 끔(앱이 앞에 떠 있고 화면이 켜진 경우)' },
    { t: 'Cached apps freezer', u: 'https://source.android.com/docs/core/perf/cached-apps-freezer', p: 'Android (Google)', n: '안드로이드 14 이상은 캐시 상태 앱을 10초 뒤 동결해 CPU를 못 쓰게 함' },
    { t: 'Extending your app’s background execution time', u: 'https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time', p: 'Apple', n: 'iOS는 백그라운드로 간 앱을 몇 초 뒤 일시 정지' },
    { t: '_WDF_TIMER_CONFIG (wdftimer.h)', u: 'https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdftimer/ns-wdftimer-_wdf_timer_config', p: 'Microsoft', n: '실험의 타이머 15.6ms: 윈도우 시스템 클록 틱 기본 간격 15.6ms' },
    { t: 'timeBeginPeriod function (timeapi.h)', u: 'https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod', p: 'Microsoft', n: '실험의 타이머 1ms: 프로그램이 timeBeginPeriod로 타이머 해상도를 높여 요청할 수 있음' },
    { t: 'Customize the Windows performance power slider', u: 'https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/customize-power-slider', p: 'Microsoft', n: '실험의 절전 모드: 윈도우 전원 모드는 성능을 낮추는 대신 배터리 시간을 늘리는 쪽으로 전원·CPU 설정을 바꿈' },
    { t: 'Thermal API', u: 'https://developer.android.com/games/optimize/adpf/thermal', p: 'Android (Google)', n: '실험의 폰 발열: 기기는 높은 성능을 제한된 시간만 유지하고 그 뒤 발열로 스로틀링됨' },
  ],
});
