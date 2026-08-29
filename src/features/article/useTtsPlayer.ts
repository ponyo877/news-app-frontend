import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { logEvent } from '@/lib/analytics';
import { REVIEW_TTS_MIN_SEGMENTS, notePositiveSignal } from '@/lib/review';
import type { TtsSegment } from '@/scraper/ttsScript';
import { TTS_VOICE_POOL_SIZE } from '@/scraper/ttsScript';

// スレ読み上げの再生制御(expo-speech・端末内TTS)。
// v1は画面表示中のみ(expo-speechは画面ロックで停止する)。
// pause/resumeはOS差があるため「stop+セグメント先頭から再開」で統一する

export const TTS_RATES = [1.0, 1.25, 1.5, 2.0] as const;

// voiceIndexごとの声の差。iOSはja-JPボイスを列挙して充当、
// 足りない分とAndroidはpitch差で「声が変わった」ことを表現する
const VOICE_PITCHES = [1.0, 1.15, 0.85, 1.3];

interface VoiceProfile {
  identifier?: string;
  pitch: number;
}

export type TtsStatus = 'idle' | 'playing' | 'paused' | 'done';

export function useTtsPlayer(segments: TtsSegment[], site: string) {
  const [status, setStatus] = useState<TtsStatus>('idle');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [rate, setRate] = useState<number>(TTS_RATES[0]);
  const voicesRef = useRef<VoiceProfile[] | null>(null);
  // 古いonDoneコールバックが新しい再生を進めないための世代カウンタ
  const generationRef = useRef(0);

  const buildVoicePool = useCallback(async (): Promise<VoiceProfile[]> => {
    if (voicesRef.current) {
      return voicesRef.current;
    }
    let identifiers: string[] = [];
    if (Platform.OS === 'ios') {
      try {
        const available = await Speech.getAvailableVoicesAsync();
        identifiers = available
          // Siri音声はspeechVoices()に含まれるがサードパーティアプリからは再生できず、
          // utteranceは正常に完了するため「進捗だけ進んで無音」になる。
          // 0番=ナレーター(セグメントの大半)に当たると記事のほぼ全部が無音になる。
          // 全部除外されても下のpitch差に縮退するので、鳴らなくなることはない
          .filter((voice) => voice.language.startsWith('ja') && !/siri/i.test(voice.identifier))
          .map((voice) => voice.identifier);
      } catch {
        identifiers = [];
      }
    }
    const pool: VoiceProfile[] = [];
    for (let i = 0; i < TTS_VOICE_POOL_SIZE; i++) {
      pool.push({
        identifier: identifiers[i],
        // ボイスが確保できた枠はpitch補正を弱め、足りない枠はpitchで差を作る
        pitch: identifiers[i] ? 1.0 : (VOICE_PITCHES[i % VOICE_PITCHES.length] ?? 1.0),
      });
    }
    voicesRef.current = pool;
    return pool;
  }, []);

  const speakFrom = useCallback(
    async (startIndex: number, speakRate: number) => {
      const generation = ++generationRef.current;
      const pool = await buildVoicePool();
      const speakNext = (index: number) => {
        if (generation !== generationRef.current) {
          return;
        }
        if (index >= segments.length) {
          setStatus('done');
          logEvent('tts_complete', { site });
          // 最後まで聴き終えた=満足のサイン。数行の記事は対象外(src/lib/review.ts)
          if (segments.length >= REVIEW_TTS_MIN_SEGMENTS) {
            notePositiveSignal('tts_complete');
          }
          return;
        }
        setSegmentIndex(index);
        const segment = segments[index];
        const voice = pool[segment ? segment.voiceIndex % pool.length : 0];
        if (!segment || !voice) {
          speakNext(index + 1);
          return;
        }
        Speech.speak(segment.text, {
          language: 'ja-JP',
          voice: voice.identifier,
          pitch: voice.pitch,
          rate: speakRate,
          // iOSの消音スイッチ対策。既定(true)ではアプリの音声セッションを使うが、本アプリは
          // 音声セッションを設定していないためマナーモードで無音になる(合成自体は進むので
          // 進捗だけが進む)。falseにするとsynthesizerが再生用セッションを自前で持つ。
          // Androidのオプションには無いフィールドなので無視される
          useApplicationAudioSession: false,
          onDone: () => speakNext(index + 1),
          onError: () => speakNext(index + 1),
        });
      };
      speakNext(startIndex);
    },
    [segments, site, buildVoicePool],
  );

  const play = useCallback(() => {
    if (segments.length === 0) {
      return;
    }
    const from = status === 'paused' ? segmentIndex : 0;
    if (status !== 'paused') {
      logEvent('tts_start', { site, segments: segments.length });
    }
    setStatus('playing');
    void speakFrom(from, rate);
  }, [segments.length, status, segmentIndex, rate, site, speakFrom]);

  const pause = useCallback(() => {
    generationRef.current++;
    void Speech.stop();
    setStatus('paused');
  }, []);

  const stop = useCallback(() => {
    generationRef.current++;
    void Speech.stop();
    setStatus('idle');
    setSegmentIndex(0);
  }, []);

  const cycleRate = useCallback(() => {
    const next =
      TTS_RATES[(TTS_RATES.indexOf(rate as (typeof TTS_RATES)[number]) + 1) % TTS_RATES.length] ??
      TTS_RATES[0];
    setRate(next);
    logEvent('tts_rate', { rate: next });
    if (status === 'playing') {
      generationRef.current++;
      void Speech.stop();
      void speakFrom(segmentIndex, next);
    }
  }, [rate, status, segmentIndex, speakFrom]);

  // 画面離脱で必ず停止
  useEffect(() => {
    return () => {
      generationRef.current++;
      void Speech.stop();
    };
  }, []);

  return { status, segmentIndex, total: segments.length, rate, play, pause, stop, cycleRate };
}
