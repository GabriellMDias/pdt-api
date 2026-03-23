import { Audio } from "expo-av";

let audioModePromise: Promise<void> | null = null;
let successSoundPromise: Promise<Audio.Sound> | null = null;
let errorSoundPromise: Promise<Audio.Sound> | null = null;

async function ensureAudioMode() {
  if (!audioModePromise) {
    audioModePromise = Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch((error) => {
      audioModePromise = null;
      throw error;
    });
  }

  await audioModePromise;
}

async function loadSound(
  source: number,
  volume: number,
): Promise<Audio.Sound> {
  await ensureAudioMode();
  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: false,
    volume,
  });
  await sound.setVolumeAsync(volume);
  return sound;
}

function ensureSuccessSound() {
  if (!successSoundPromise) {
    successSoundPromise = loadSound(
      require("../../../../assets/audio/beep-scanner.mp3"),
      0.7,
    ).catch((error) => {
      successSoundPromise = null;
      throw error;
    });
  }

  return successSoundPromise;
}

function ensureErrorSound() {
  if (!errorSoundPromise) {
    errorSoundPromise = loadSound(
      require("../../../../assets/audio/error-sound.mp3"),
      0.8,
    ).catch((error) => {
      errorSoundPromise = null;
      throw error;
    });
  }

  return errorSoundPromise;
}

async function replaySound(soundPromise: Promise<Audio.Sound>) {
  await ensureAudioMode();
  const sound = await soundPromise;
  await sound.replayAsync();
}

export async function warmupOperationalFeedbackAsync(): Promise<void> {
  try {
    await Promise.all([ensureSuccessSound(), ensureErrorSound()]);
  } catch {
    // Audio feedback is best-effort and should not block collection.
  }
}

export async function playOperationalSuccessAsync(): Promise<void> {
  try {
    await replaySound(ensureSuccessSound());
  } catch {
    // Best-effort operational feedback.
  }
}

export async function playOperationalErrorAsync(): Promise<void> {
  try {
    await replaySound(ensureErrorSound());
  } catch {
    // Best-effort operational feedback.
  }
}
