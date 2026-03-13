// 브라우저 호환성을 위한 전역 AudioContext 및 잔향(Reverb) 버퍼 관리
let audioCtx: AudioContext | null = null;
let sharedReverbBuffer: AudioBuffer | null = null;

// 🌟 배경음악(BGM) 인스턴스 관리용 변수
let titleMusic: HTMLAudioElement | null = null;
let creationMusic: HTMLAudioElement | null = null; // 🌟 캐릭터 생성 BGM 추가

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContext();
  }
  return audioCtx;
};

// --- 타이틀 배경음악 ---
export const playTitleMusic = () => {
  if (!titleMusic) {
    titleMusic = new Audio('/music/Celestial_Overture.mp3'); 
    titleMusic.loop = true;
    titleMusic.volume = 0.4;
  }
  titleMusic.play().catch(() => {});
};

export const stopTitleMusic = () => {
  if (titleMusic) {
    titleMusic.pause();
    titleMusic.currentTime = 0;
  }
};

// --- 🌟 캐릭터 생성 배경음악 추가 ---
export const playCreationMusic = () => {
  if (!creationMusic) {
    creationMusic = new Audio('/music/Character_Create.mp3'); 
    creationMusic.loop = true;
    creationMusic.volume = 0.4;
  }
  creationMusic.play().catch(() => {});
};

export const stopCreationMusic = () => {
  if (creationMusic) {
    creationMusic.pause();
    creationMusic.currentTime = 0;
  }
};

// 동굴 울림(Reverb) 효과
const getReverbBuffer = (ctx: AudioContext) => {
  if (sharedReverbBuffer) return sharedReverbBuffer;
  const rate = ctx.sampleRate;
  const length = rate * 2.5; 
  const impulse = ctx.createBuffer(2, length, rate);
  for (let i = 0; i < 2; i++) {
    const channel = impulse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 4);
    }
  }
  sharedReverbBuffer = impulse;
  return impulse;
};

const createNoiseBuffer = (ctx: AudioContext, duration: number) => {
  const bufferSize = ctx.sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
  return noiseBuffer;
};

// 1. 일반 클릭음
export const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 2.0;
    masterGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = getReverbBuffer(ctx);
    convolver.connect(masterGain);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.8;
    dryGain.connect(masterGain);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.5; 
    wetGain.connect(convolver);

    const inputNode = ctx.createGain();
    inputNode.connect(dryGain);
    inputNode.connect(wetGain);

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = createNoiseBuffer(ctx, 0.15);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(800, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(0.5, time + 0.01); 
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1); 

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(inputNode);

    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(60, time);
    thudOsc.frequency.exponentialRampToValueAtTime(20, time + 0.05);

    thudGain.gain.setValueAtTime(0, time);
    thudGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
    thudGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    thudOsc.connect(thudGain);
    thudGain.connect(inputNode);

    noiseSrc.start(time);
    thudOsc.start(time);
    thudOsc.stop(time + 0.1);
  } catch (e) {}
};

// 2. 마우스 오버음
export const playHoverSound = () => {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(ctx, 0.1);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, time); 
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination); 
    noiseSource.start(time);
  } catch (e) {}
};

// 3. 세계 진입음
export const playStartSound = () => {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 3.0;
    masterGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = getReverbBuffer(ctx);
    convolver.connect(masterGain);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.8;
    dryGain.connect(masterGain);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 1.2;
    wetGain.connect(convolver);

    const inputNode = ctx.createGain();
    inputNode.connect(dryGain);
    inputNode.connect(wetGain);

    const createMetallicImpact = (startTime: number, pitch: number, vol: number) => {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(ctx, 0.3);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(pitch, startTime);
      filter.Q.value = 15;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(inputNode);
      noiseSource.start(startTime);
    };
    createMetallicImpact(time, 800, 4.0);
    createMetallicImpact(time + 0.25, 500, 5.0);
    const dragDuration = 2.5;
    const dragSource = ctx.createBufferSource();
    dragSource.buffer = createNoiseBuffer(ctx, dragDuration);

    const dragFilter = ctx.createBiquadFilter();
    dragFilter.type = 'bandpass'; 
    dragFilter.frequency.setValueAtTime(200, time + 0.4);
    dragFilter.frequency.linearRampToValueAtTime(50, time + dragDuration);
    dragFilter.Q.value = 0.5;

    const dragGain = ctx.createGain();
    dragGain.gain.setValueAtTime(0, time);
    dragGain.gain.setValueAtTime(0, time + 0.4);
    dragGain.gain.linearRampToValueAtTime(2.0, time + 0.7);
    dragGain.gain.exponentialRampToValueAtTime(0.001, time + dragDuration);

    dragSource.connect(dragFilter);
    dragFilter.connect(dragGain);
    dragGain.connect(inputNode);
    dragSource.start(time);

    const thudTime = time + 1.8;
    const thudNoise = ctx.createBufferSource();
    thudNoise.buffer = createNoiseBuffer(ctx, 0.5);

    const thudNoiseFilter = ctx.createBiquadFilter();
    thudNoiseFilter.type = 'lowpass';
    thudNoiseFilter.frequency.setValueAtTime(150, thudTime);

    const thudNoiseGain = ctx.createGain();
    thudNoiseGain.gain.setValueAtTime(0, thudTime);
    thudNoiseGain.gain.linearRampToValueAtTime(8.0, thudTime + 0.02);
    thudNoiseGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.3);

    thudNoise.connect(thudNoiseFilter);
    thudNoiseFilter.connect(thudNoiseGain);
    thudNoiseGain.connect(inputNode);
    thudNoise.start(thudTime);

    const thudOsc = ctx.createOscillator();
    const thudOscGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(60, thudTime);
    thudOsc.frequency.exponentialRampToValueAtTime(30, thudTime + 0.2);
    thudOscGain.gain.setValueAtTime(0, thudTime);
    thudOscGain.gain.linearRampToValueAtTime(6.0, thudTime + 0.02);
    thudOscGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.4);

    thudOsc.connect(thudOscGain);
    thudOscGain.connect(inputNode);
    thudOsc.start(thudTime);
    thudOsc.stop(thudTime + 0.5);
  } catch (e) {}
};

// 4. 세계로 진입하기 버튼 전용
export const playEnterWorldSound = () => {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 5.0; 
    masterGain.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = getReverbBuffer(ctx);
    convolver.connect(masterGain);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.8;
    dryGain.connect(masterGain);

    const wetGain = ctx.createGain();
    wetGain.gain.value = 1.0;
    wetGain.connect(convolver);

    const inputNode = ctx.createGain();
    inputNode.connect(dryGain);
    inputNode.connect(wetGain);

    const createMetallicClick = (t: number, pitch: number, vol: number) => {
      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, 0.1); 

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(pitch, t);
      filter.Q.value = 20;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08); 

      src.connect(filter);
      filter.connect(gain);
      gain.connect(inputNode);
      src.start(t);
    };
    const gearStartTime = time; 
    const gearCount = 25; 
    const gearInterval = 0.035; 
    for (let i = 0; i < gearCount; i++) {
      const t = gearStartTime + (i * gearInterval);
      const pitch = 400 + (Math.random() * 150); 
      createMetallicClick(t, pitch, 5.0);
    }
    const rumbleOsc = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.setValueAtTime(50, gearStartTime);
    rumbleGain.gain.setValueAtTime(0, gearStartTime);
    rumbleGain.gain.linearRampToValueAtTime(2.0, gearStartTime + 0.1);
    rumbleGain.gain.linearRampToValueAtTime(2.0, gearStartTime + (gearCount * gearInterval) - 0.1);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, gearStartTime + (gearCount * gearInterval) + 0.2);
		
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(inputNode);
    rumbleOsc.start(gearStartTime);
    rumbleOsc.stop(gearStartTime + (gearCount * gearInterval) + 0.3);
  } catch (e) {}
};