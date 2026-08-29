import { Composition, type CalculateMetadataFunction } from 'remotion';
import { AppStorePreview } from './compositions/AppStorePreview';
import { SocialPromo } from './compositions/SocialPromo';
import { buildAppStoreBeats, buildBeats } from './lib/beats';
import './lib/fonts';
import { probeAudio, type AppStoreProps, type PromoProps } from './lib/props';
import { loadTimeline } from './lib/timeline';

const socialMetadata: CalculateMetadataFunction<PromoProps> = async ({ props }) => {
  const timeline = await loadTimeline(props.take);
  const beats = buildBeats(timeline, props);
  const audioFiles = props.audio ? await probeAudio() : null;
  return { durationInFrames: beats.total, props: { ...props, timeline, audioFiles } };
};

const appStoreMetadata: CalculateMetadataFunction<AppStoreProps> = async ({ props }) => {
  const timeline = await loadTimeline(props.take);
  const beats = buildAppStoreBeats(timeline);
  console.log(`[beats] AppStorePreview ${beats.total}f, posterFrame=${beats.posterFrame}`);
  const audioFiles = props.audio ? await probeAudio() : null;
  return { durationInFrames: beats.total, props: { ...props, timeline, audioFiles } };
};

/** 既定で読むテイク。`--props='{"take":"m2"}'` で差し替えられる。 */
const TAKE = 'm2';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="AppStorePreview"
        component={AppStorePreview}
        durationInFrames={750}
        fps={30}
        width={886}
        height={1920}
        defaultProps={{ take: TAKE, audio: true, timeline: null, audioFiles: null }}
        calculateMetadata={appStoreMetadata}
      />
      <Composition
        id="SocialPromo"
        component={SocialPromo}
        durationInFrames={880}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ take: TAKE, hook: true, endCard: true, audio: true, timeline: null, audioFiles: null }}
        calculateMetadata={socialMetadata}
      />
    </>
  );
};
