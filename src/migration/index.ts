// レガシー(Flutter版)データ移行。実装はPhase 6で追加する。
// devicehash/Name/Icon(shared_preferences)とmySkipIDs.csvのみ引き継ぎ、
// Hive(履歴・お気に入り)は初期化する方針。
export async function runLegacyMigrationIfNeeded(): Promise<void> {
  // TODO(Phase 6): FlutterSharedPreferences / NSUserDefaults / mySkipIDs.csv の読み取り
}
