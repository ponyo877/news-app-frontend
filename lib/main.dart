import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:my_app/screens/models/latest_model.dart';
import 'package:path_provider/path_provider.dart' as path_provider;
import 'package:flutter_riverpod/flutter_riverpod.dart';

// import 'contact_page.dart';
import 'screens/models/history_model.dart';
import 'screens/news_list_screen.dart';
import 'package:admob_flutter/admob_flutter.dart';

//void main() => runApp(ProviderScope(child: MyApp()));

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final appDocumentDirectory =
      await path_provider.getApplicationDocumentsDirectory();
  Hive.init(appDocumentDirectory.path);
  Hive.registerAdapter(HistoryModelAdapter());
  Hive.registerAdapter(LatestModelAdapter());
  WidgetsFlutterBinding.ensureInitialized();
  Admob.initialize();
  //await Hive.openBox<LatestModel>('latestData');
  runApp(ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "まとめくん",
      //theme: ThemeData.dark(),
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          // ThemeData.dark(),
          brightness: Brightness.dark,
          // canvasColor: Colors.transparent,
          fontFamily: 'M PLUS Rounded 1c',
          bottomSheetTheme: BottomSheetThemeData(
              backgroundColor: Colors.black.withOpacity(0))),
      home: NewsListScreen(),
    );
  }
}

// void main() {
//   runApp(
//     // Adding ProviderScope enables Riverpod for the entire project
//     const ProviderScope(child: MyApp()),
//   );
// }

// class MyApp extends StatelessWidget {
//   const MyApp({Key key}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(home: Home());
//   }
// }
//
// /// Providers are declared globally and specifies how to create a state
// final counterProvider = StateProvider((ref) => NewsState());
//
// class Home extends StatelessWidget {
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: const Text('Counter example')),
//       body: Center(
//         // Consumer is a widget that allows you reading providers.
//         // You could also use the hook "useProvider" if you uses flutter_hooks
//         child: Consumer(builder: (context, watch, _) {
//           final count = watch(counterProvider).state;
//           return Text('aaa');
//         }),
//       ),
//       floatingActionButton: FloatingActionButton(
//         // The read method is an utility to read a provider without listening to it
//         onPressed: () => context.read(counterProvider).state.getPost(true),
//         child: const Icon(Icons.add),
//       ),
//     );
//   }
//}
