/* eslint-disable no-return-assign */
/* eslint-disable no-fallthrough */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-control-regex */
/* eslint-disable no-bitwise */
/* eslint-disable prettier/prettier */
import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  AppState,
  TouchableHighlight,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { ScrollView } from 'react-native-gesture-handler';
import { scale } from './utils/scaling';


const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const service = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const rwn_characteristic = '49535343-1e4d-4bd9-ba61-23c647249616';
let peripheralObject = '';
const request = 'Req';
const response = 'Res';
export default class Bluetooth extends Component {
  constructor() {
    super();


    this.state = {
      scanning: false,
      peripherals: new Map(),
      appState: '',
      isConnected: false,
      bleData: '',
      receivedData: '',
      dataOnScreen: [],
      reqResp: 'Req',
    };
    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(
      this,
    );
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(
      this,
    );
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
    BleManager.start({showAlert: false});

    this.handlerDiscover = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.handleDiscoverPeripheral,
    );
    this.handlerStop = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      this.handleStopScan,
    );
    this.handlerDisconnect = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      this.handleDisconnectedPeripheral,
    );
    this.handlerUpdate = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this.handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.requestPermission(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ).then(permission_result => {
            if (permission_result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }
  }


  handleAppStateChange(nextAppState) {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App has come to the foreground!');
      BleManager.getConnectedPeripherals([]).then(peripheralsArray => {
        console.log('Connected peripherals: ' + peripheralsArray.length);
      });
    }
    this.setState({appState: nextAppState});
  }

  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
    this.handlerUpdate.remove();
  }


  handleDisconnectedPeripheral(data) {
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      this.setState({peripherals}, {isConnected: false});
    }
    console.log('Disconnected from ' + data.peripheral);
  }

  hexToAscii(str1) {
    const hex = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
      str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
  }
  hexStringToByte(str) {
    if (!str) {
      return new Uint8Array();
    }

    var a = [];
    for (var i = 0, len = str.length; i < len; i += 2) {
      a.push(parseInt(str.substr(i,2),16));
    }

    return new Uint8Array(a);
  }

  handleUpdateValueForCharacteristic(data) {
    console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    if (data.value !== null) {
    this.hexdump(data.value, 16);
    var strValue  = (this.HexString(data.value));
    console.log('This is the Value: ' + strValue);
    this.setState({receivedData: strValue});
    return strValue;
    } else {
      Alert.alert('Invalid Request or Response');
    }
}

  HexString(byteArray) {
    return Array.from(byteArray, function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
  }

  handleStopScan() {
    console.log('Scan is stopped');
    this.setState({scanning: false});
  }

  startScan() {
    if (!this.state.scanning) {
      //this.setState({peripherals: new Map()});

      BleManager.scan([], 6, true).then(() => {
        console.log('Scanning...');
        this.setState({scanning: true});
      });
    }
  }

  retrieveConnected() {
    BleManager.getConnectedPeripherals([]).then(results => {
      if (results.length === 0) {
        console.log('No connected peripherals');
      }
      console.log(results);
      var peripherals = this.state.peripherals;
      for (var i = 0; i < results.length; i += 1) {
        var peripheral = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        this.setState({peripherals});
      }
    });
  }

  handleDiscoverPeripheral(peripheral) {
    var peripherals = this.state.peripherals;
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    this.setState({peripherals});
  }

  hexdump(buffer, blockSize) {

    if (typeof buffer === 'string'){
      console.log('buffer is string');
      //do nothing
    } else if (buffer instanceof ArrayBuffer && buffer.byteLength !== undefined){
      console.log('buffer is ArrayBuffer');
      buffer = String.fromCharCode.apply(String, [].slice.call(new Uint8Array(buffer)));
    } else if (Array.isArray(buffer)){
      buffer = String.fromCharCode.apply(String, buffer);
    } else if (buffer.constructor === Uint8Array) {
      console.log('buffer is Uint8Array');
      buffer = String.fromCharCode.apply(String, [].slice.call(buffer));
    } else {
      console.log('Error: buffer is unknown...');
      return false;
    }


    blockSize = blockSize || 16;
      var lines = [];
      var byteCode = [];
      var hex = '0123456789ABCDEF';
      for (var b = 0; b < buffer.length; b += blockSize) {
          var block = buffer.slice(b, Math.min(b + blockSize, buffer.length));
          var addr = ('0000' + b.toString(16)).slice(-4);
          var codes = block.split('').map(function (ch) {
              var code = ch.charCodeAt(0);
              return ' ' + hex[(0xF0 & code) >> 4] + hex[0x0F & code];
          }).join('');
          codes += '   '.repeat(blockSize - block.length);
          var chars = block.replace(/[\x00-\x1F\x20]/g, '.');
          chars +=  ' '.repeat(blockSize - block.length);
          lines.push(addr + ' ' + codes + '  ' + chars);
          byteCode.push(codes);
        }
      let messages = [];
      messages.push(this.state.dataOnScreen);
      messages.push(lines.join('\n').split(','));
      this.setState({dataOnScreen: messages + '\n'});
      return byteCode;
  }

  test(peripheral) {
    peripheralObject = peripheral;
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.stopNotification(
          peripheral.id,
          service,
          rwn_characteristic,
        );
        BleManager.disconnect(peripheral.id);
      } else {
        this.setState({scanning: true});
        BleManager.connect(peripheral.id)
          .then(() => {
            let peripherals = this.state.peripherals;
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
              this.setState({peripherals, scanning: false});
              this.setState({isConnected: true});

            }
            console.log('Connected to ' + peripheral.id);
            setTimeout(() => {
              BleManager.retrieveServices(peripheral.id).then(
                peripheralInfo => {
                  console.log(peripheralInfo);
                  setTimeout(() => {
                    BleManager.startNotification(
                      peripheral.id,
                      service,
                      rwn_characteristic,
                    )
                      .then(() => {
                        console.log('Started notification on ' + peripheral.id);
                      })
                      .catch(error => {
                        console.log('Notification error', error);
                      });
                  }, 200);
                },
              );
            }, 900);
          })
          .catch(error => {
            this.setState({scanning: false});
            console.log('Connection error', error);
          });
      }
    }
  }


  writeToApp(hexString) {
    console.log('This is the Value: ' + peripheralObject + hexString);
    let decValue = [];
    if (this.state.reqResp === request){
      hexString = 'A5' + hexString;
    } else {
      hexString = 'A6' + hexString;
    }

    while (hexString.length !== 0) {
      decValue.push(parseInt(hexString.slice(0,2),16));
      console.log('-----' + decValue);
      hexString = hexString.slice(2);
      console.log('This is Hex: ',hexString);
     }
    console.log('This is the Decimal: ' + decValue);
      setTimeout(() => {
      BleManager.write(peripheralObject.id, service, rwn_characteristic, decValue ).then(() => {
        console.log('Writed Communication');
      },300);
      });
  }

  renderItem(item) {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => this.test(item)  }>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 18, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

 handleData = (text) => {
    this.setState({ bleData: text });
 }
 login = (dataToSend) => {
  if (dataToSend.includes('D0') || dataToSend.includes('D1') || dataToSend.includes('D2') || dataToSend.includes('D3') || dataToSend.includes('D4') || dataToSend.includes('D5') || dataToSend.includes('D6') || dataToSend.includes('D7') || dataToSend.includes('D8') || dataToSend.includes('D9') || dataToSend.includes('DA')){
   let logs = [];
   logs.push(this.state.dataOnScreen);
    this.writeToApp(dataToSend);
    logs.push(dataToSend);
    this.setState({dataOnScreen: logs + '\n'});
  } else {
    Alert.alert('Didnt Match Any Function Codes');
  }
  }

  updateButton = () => {
    if (this.state.reqResp === request) {
    this.setState({reqResp: response});
    } else {
      this.setState({reqResp: request});
    }
  }


  render() {
    const list = Array.from(this.state.peripherals.values());
    let mac_address = peripheralObject.id;
    if (this.state.scanning){
      return (
        <View style={[styles.containerAcvt, styles.horizontal]}>
          <ActivityIndicator size="large" color="#0000ff"/>
        </View>
      );
    } else if (!this.state.isConnected) {
    return (
      <View style={styles.container}>
        <TouchableHighlight style={{marginTop: 40,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.startScan() }>
          <Text>Scan Bluetooth ({this.state.scanning ? 'on' : 'off'})</Text>
        </TouchableHighlight>
        <TouchableHighlight style={{marginTop: 0,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.retrieveConnected() }>
          <Text>Retrieve connected peripherals</Text>
        </TouchableHighlight>
        <ScrollView style={styles.scroll}>
          {(list.length === 0) &&
            <View style={{flex:1, margin: 20}}>
              <Text style={{textAlign: 'center'}}>No peripherals</Text>
            </View>
          }
          <FlatList
            data={list}
            renderItem={({ item }) => this.renderItem(item) }
            keyExtractor={item => item.id}
          />

        </ScrollView>
      </View>
    );
  } else {
    return (
    <View style={styles.container}>
      <View style={styles.container2}>
        <ScrollView style={styles.scroll} ref={ref => this.scrollView = ref}
    onContentSizeChange={(contentWidth, contentHeight)=>{
        this.scrollView.scrollToEnd({animated: true});
    }}>
          <Text style={{textAlign: 'center'}}>Connected to {mac_address}</Text>
          {console.log('I am Length: ' + this.state.dataOnScreen.length)}
          <Text style={{textAlign: 'center', color: '#ff0000'}}>{this.state.dataOnScreen}</Text>
        </ScrollView>
      </View>
        {/* <KeyboardAvoidingView style={{ flexDirection: 'column'}} behavior="position" enabled keyboardVerticalOffset={100}> */}
        <ScrollView >
          <View style={styles.buttonContainer}>
            <View style={{ flex: 1, width: 5, height: 5}}>
              <TouchableOpacity onPress={this.updateButton}>
                <Text style={{ fontSize: 18}}>{this.state.reqResp}</Text>
              </TouchableOpacity>
            </View>
            <TextInput style = {styles.button}
               underlineColorAndroid = "transparent"
               placeholder = "Length FunctionCode RemainingBytes"
               placeholderTextColor = "#9a73ef"
               autoCapitalize = "characters"
               backgroundColor = "#a9a9a9"
               onChangeText = {this.handleData}/>
              <View style={{ flex: 1, width: 20, height: 20}}>
                <TouchableOpacity
                  onPress = {
                  () => this.login(this.state.bleData)
                  }><Image
                  style={{width: scale(15), height: scale(15), margin: scale(5)}}
                  source={require('../assets/send.png')}
                />
                </TouchableOpacity>
               </View>
              </View>
              </ScrollView>
            {/* </KeyboardAvoidingView>*/}
          </View>
    );
  }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height,
  },
  container2: {
    width: '100%',
    height: 683,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: scale(10),
    marginBottom: scale(10),
  },
  row: {
    margin: scale(10),
  },
  inputHandler: {
    paddingTop: scale(23),
    flex: 1,
    position: 'absolute',
    bottom: 0,
 },
 input: {
    marginTop: 40,
    marginLeft: 18,
    height: 40,
    width: 200,
    borderColor: '#7a42f4',
    borderWidth: scale(1),
 },
 submitButton: {
    backgroundColor: '#7a42f4',
    padding: scale(10),
    margin: scale(15),
    height: scale(40),
    width: scale(200),

 },
 submitButtonText:{
    color: 'white',
 },
 containerAcvt: {
  flex: 1,
  justifyContent: 'center',
},
horizontal: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  padding: 10,
},
buttonContainer: {
  flex: 1,
  flexDirection: 'row',
  backgroundColor: '#00ff00',
},
button: {
  color: '#7a42f4',
  width: '80%',
  height: 40,
},
});
