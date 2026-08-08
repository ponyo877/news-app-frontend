import { MaterialIcons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useAnimatedValue,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

// convex_bottom_bar v3.2.0 の TabStyle.reactCircle を忠実に再現:
//   バー高さ50 / 凸カーブ80×80(top -25) / 白円60+アイコン40(バー色) /
//   非アクティブ=アイコン24+タイトル14の縦積み / 遷移150ms easeInOut+円のスケールイン
// 凸バンプはバーと同色の円をバー上端から突出させて近似(下半分はバーに溶け込む)
const BAR_HEIGHT = 50;
const CONVEX_SIZE = 80;
const CONVEX_TOP = -25;
const CIRCLE_SIZE = 60;
const CIRCLE_TOP = -18;
const ACTIVE_ICON_SIZE = 40;
const INACTIVE_ICON_SIZE = 24;
const TRANSITION_MS = 150;

export const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Ranking: 'format-list-numbered',
  Search: 'search',
  Home: 'home',
  MyPage: 'person-pin',
  Setting: 'settings',
};

// 表示名のみ日本語(キー=ルート名はGA4 screen_viewの連続性のため不変)
const TAB_TITLES: Record<string, string> = {
  Ranking: 'ランキング',
  Search: '検索',
  Home: 'ホーム',
  MyPage: 'マイページ',
  Setting: '設定',
};

export function ConvexTabBar({ state, navigation, position }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabWidth = width / state.routes.length;
  const scale = useAnimatedValue(1);
  const previousIndex = useRef(state.index);

  // 白円のスケールイン(旧TransitionContainer.scale相当)
  useEffect(() => {
    if (previousIndex.current !== state.index) {
      previousIndex.current = state.index;
      scale.setValue(0);
      Animated.timing(scale, {
        toValue: 1,
        duration: TRANSITION_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, scale]);

  // スワイプ中もバンプと円が連続追従する(旧ConvexAppBarのTabController連動と同じ)
  const centerX = Animated.multiply(position, tabWidth);
  const bumpTransform = [{ translateX: Animated.add(centerX, tabWidth / 2 - CONVEX_SIZE / 2) }];
  const circleTransform = [
    { translateX: Animated.add(centerX, tabWidth / 2 - CIRCLE_SIZE / 2) },
    { scale },
  ];

  const activeRoute = state.routes[state.index];

  return (
    // 旧版はSafeArea(child: ConvexAppBar)のため、下部インセット帯はScaffold背景色(ダーク)
    <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.background }}>
      <View style={styles.bar}>
        {/* 凸バンプ(バー同色・上端から突出) */}
        <Animated.View style={[styles.bump, { transform: bumpTransform }]} />
        {/* タブ列: アクティブ位置は空けておき、白円が浮かぶ(旧_barContentと同じ) */}
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <Pressable
                key={route.key}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityLabel={TAB_TITLES[route.name] ?? route.name}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              >
                {!focused && (
                  <>
                    <MaterialIcons
                      name={TAB_ICONS[route.name] ?? 'circle'}
                      size={INACTIVE_ICON_SIZE}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.title}>{TAB_TITLES[route.name] ?? route.name}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
        {/* アクティブの白円(activeColor既定=白、アイコンはblendでバー色) */}
        <Animated.View style={[styles.circle, { transform: circleTransform }]} pointerEvents="none">
          {activeRoute && (
            <MaterialIcons
              name={TAB_ICONS[activeRoute.name] ?? 'circle'}
              size={ACTIVE_ICON_SIZE}
              color={colors.blueGrey}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: colors.blueGrey,
  },
  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    lineHeight: 16,
  },
  bump: {
    position: 'absolute',
    top: CONVEX_TOP,
    left: 0,
    width: CONVEX_SIZE,
    height: CONVEX_SIZE,
    borderRadius: CONVEX_SIZE / 2,
    backgroundColor: colors.blueGrey,
    shadowColor: colors.black,
    shadowOpacity: 0.38,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: -1 },
  },
  circle: {
    position: 'absolute',
    top: CIRCLE_TOP,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
