import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:device_info/device_info.dart';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'select_myimage_screen.dart';

class UserConfScreen extends StatefulWidget {
  const UserConfScreen({Key key}) : super(key: key);

  @override
  _UserConfScreen createState() => _UserConfScreen();
}

class _UserConfScreen extends State<UserConfScreen> {
  bool _isEdit = false;
  Future<Map> _future;
  String NameData = "";
  String IconData = "";

  String baseURL = "https://gitouhon-juku-k8s2.ga";

  @override
  void initState() {
    super.initState();
    _future = _getNameData();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
        //margin: EdgeInsets.only(top: 80),
        height: 210,
        decoration: BoxDecoration(
          color: Colors.white10,
          borderRadius: BorderRadius.circular(16.0),
        ),
      child: Align(
        //alignment: Alignment.topCenter,
        alignment: Alignment.topCenter,
        child: FutureBuilder(
          future: _future,
          builder: (BuildContext context, AsyncSnapshot<Map> snapshot) {
            if (!snapshot.hasData) {
              return Center(child: CircularProgressIndicator());
            } else {
              var _controller = TextEditingController(
                  text: NameData.isEmpty ? snapshot.data['Name'] : NameData);
              return
                Column (children: [
                  SizedBox(height: 10),
                  Text("Profile",
                  style: TextStyle(
                  //color: Colors.black,
                  //fontFamily: 'SF Pro',
                  //fontWeight: FontWeight.w700,
                  fontSize: 20.0,
                ),),
                Row (children :[
                    SizedBox(width: 20),
                GestureDetector(
                  onTap: () async {
                    var result = await Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (context) => SelectMyimageScreen(IconData.isEmpty ? snapshot.data['Icon'] : IconData)));
                    // print(result);
                    if (result != null) {
                      setState(() {
                        IconData = result;
                      });
                    }
                  },
                  child: CircleAvatar(
                    radius: 60.0,
                    backgroundColor: Colors.white,
                    child: CircleAvatar(
                      child: Align(
                        alignment: Alignment.bottomRight,
                        child: CircleAvatar(
                          backgroundColor: Colors.white10,
                          radius: 20.0,
                          child: Icon(
                            Icons.camera_alt,
                            size: 40.0,
                            color: Color(0xFF404040),
                          ),
                        ),
                      ),
                      radius: 55.0,
                      backgroundColor: Colors.white,
                      backgroundImage: AssetImage(
                          IconData.isEmpty ? snapshot.data['Icon'] : IconData),
                    ),
                  ),
                ),
                Expanded (
                  child: Center (
                child: Column (
                  children: [Container(
                    padding: EdgeInsets.only(top: 16.0),
                    child: _isEdit
                        ? TextField(
                            controller: _controller,
                            textAlign: TextAlign.center,
                            autofocus: true,
                            maxLength: 10,
                            style: TextStyle(
                              //color: Colors.black,
                              fontFamily: 'SF Pro',
                              fontWeight: FontWeight.w700,
                              fontSize: 20.0,
                            ),
                          )
                        : Text(
                            NameData.isEmpty ? snapshot.data['Name'] : NameData,
                            style: TextStyle(
                              //color: Colors.black,
                              fontFamily: 'SF Pro',
                              fontWeight: FontWeight.w700,
                              fontSize: 20.0,
                            ),
                          ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: TextButton(
                      onPressed: () {
                        print('押した');
                        print(_isEdit);
                        setState(() {
                          if (_isEdit) {
                            print("aaaa");
                            NameData = _controller.text;
                            updateNameData(NameData);
                          }
                          _isEdit = !_isEdit;
                        });
                      },
                      child: Container(
                        padding: EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 8.0),
                        decoration: BoxDecoration(
                          color: Color(0xFFEF476F),
                          borderRadius: BorderRadius.all(Radius.circular(20.0)),
                        ),
                        child: Text(
                          _isEdit ? 'Update Name' : 'Edit Name',
                          style: TextStyle(
                            fontFamily: 'SF Pro',
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                            fontSize: 20.0,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],)
                ),
                ),
              ])]
                );
            }
          },
        ),
      ),
      );
  }

  Future<Map> _getNameData() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    var myNameData = await prefs.getString("Name");
    var myIconData = await prefs.getString("Icon");

    if (myIconData == null) {
      myIconData = 'assets/images/icon/myimage_1.png';
    }
    Map<String, String> myStringData = {
      'Name': myNameData,
      'Icon': myIconData,
    };
    //print("Name: " + myStringData);
    return myStringData;
  }

  updateNameData(String name) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString("Name", name);
    print("UpdateName: " + name);

    setName(name);
  }

  void setName(String name) async {
    var requestURL = baseURL + "/user/put";
    var map = new Map<String, dynamic>();

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    var myStringData = await prefs.getString("devicehash");

    if (myStringData == null) {
      DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
      var deviceId;
      if (Platform.isAndroid) {
        AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.androidId;
      } else if (Platform.isIOS) {
        IosDeviceInfo iosDeviceInfo = await deviceInfo.iosInfo;
        deviceId = iosDeviceInfo.identifierForVendor;
      }
      var bytes = utf8.encode(deviceId); // data being hashed
      var digest = sha1.convert(bytes).toString();
      await prefs.setString("devicehash", digest);
    }

    map["name"] = name;
    map["devicehash"] = myStringData;
    http.Response response = await http.post(requestURL, body: map);
    print(response.statusCode);
  }
}
