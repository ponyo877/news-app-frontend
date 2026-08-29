import { Config } from '@remotion/cli/config';

// エントリポイントは src/index.ts（`remotion render <CompositionId>` で省略できる）。
Config.setEntryPoint('src/index.ts');
Config.setOverwriteOutput(true);
// ProRes 中間出力では PNG フレームで画質を落とさない。
Config.setVideoImageFormat('png');
