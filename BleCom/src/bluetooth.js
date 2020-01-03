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
  Button,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { ScrollView } from 'react-native-gesture-handler';


const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const service = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const rwn_characteristic = '49535343-1e4d-4bd9-ba61-23c647249616';

export default class Bluetooth extends Component {
  constructor() {
    super();

    this.state = {
      scanning: false,
      peripherals: new Map(),
      appState: '',
      isConnected: false,
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

  responseToServer() {
    console.log('I have been Called By The Map');
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
    this.hexdump(data.value, 16);
    var strValue  = (this.HexString(data.value));
    console.log('This is the Value: ' + strValue);
    return strValue;
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
      for (var i = 0; i < results.length; i++) {
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
      console.log(lines.join('\n'));
      return byteCode;
  }

  test(peripheral) {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.stopNotification(
          peripheral.id,
          service,
          rwn_characteristic,
        );
        BleManager.disconnect(peripheral.id, false);
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            let peripherals = this.state.peripherals;
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
              this.setState({peripherals});
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
                        this.setState({isConnected: true});
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
            console.log('Connection error', error);
          });
      }
    }
  }

  playWithData(strs, data) {
    console.log('This is the Value: ' + strs);
    if (strs.startsWith('a5') && strs.endsWith('00')) {
      setTimeout(() => {
      BleManager.write(data.peripheral, service, rwn_characteristic, [166, 2, 208, 1]).then(() => {
        console.log('Writed Communication');
      },300);
      });
    }
    else if (strs.startsWith('a5') && strs.endsWith('da')) {
      setTimeout(() => {
      BleManager.write(data.peripheral, service, rwn_characteristic, [166, 2, 211, 1]).then(() => {
      });
        },300);
    }
  }

  renderItem(item) {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => this.test(item) }>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    const list = Array.from(this.state.peripherals.values());
    if (!this.state.isConnected) {
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
      <TouchableHighlight style={{marginTop: 0,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.retrieveConnected() }>
          <Text>Retrieve connected peripherals</Text>
      </TouchableHighlight>
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
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  },
  row: {
    margin: 10,
  },
});
