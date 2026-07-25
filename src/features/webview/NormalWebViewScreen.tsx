import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';

import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NormalWebView'>;

// 汎用WebView(PP/EULA/問い合わせ/通報フォーム)。旧NormalWebView相当
export function NormalWebViewScreen({ route }: Props) {
  return <WebView source={{ uri: route.params.url }} />;
}
