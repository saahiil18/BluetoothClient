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
  FlatList,
  Button,
} from 'react-native';
import BleManager from 'react-native-ble-manager';


const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const service = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const rwn_characteristic = '49535343-1e4d-4bd9-ba61-23c647249616';

const machineEvents = new Map();
const eventString = [
  {
    key: 'A5',
    funcSubCode: 'D0',
  },
];

for (let i = 0; i < eventString.length; i++) {
  machineEvents.set(eventString[i].key, eventString[i]);
}


export default class Bluetooth extends Component {
  constructor() {
    super();

    this.state = {
      scanning: false,
      peripherals: new Map(),
      appState: '',
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

  handleDisconnectedPeripheral() {
    let peripherals = this.state.peripherals;
    let peripheral = peripherals.get('94:65:9C:87:69:E0');
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set('94:65:9C:87:69:E0', peripheral);
      this.setState({peripherals});
    }
    console.log('Disconnected from ' + '94:65:9C:87:69:E0');
  }

  hexToAscii(str1) {
    const hex = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
      str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
  }

  handleUpdateValueForCharacteristic(data) {
    console.log('Received data from ' + '94:65:9C:87:69:E0' + ' characteristic ' + data.characteristic, data.value);
    let arrayBuff = [];
    this.hexdump(data.value, 16);
    arrayBuff.push(this.hexToAscii(data.value));
    console.log('Array: ' + arrayBuff);

  }

  writeToServer(data) {
    console.log('I have Received the Array Buffer' + data);

  }

  startCommunication() {
    const vendekinResponse = [ 166 , 2, 208, 1 ];
    BleManager.write('94:65:9C:87:69:E0', service, rwn_characteristic, vendekinResponse ).then(() => {
      console.log('Write Was Success');
    });
  }



  handleStopScan() {
    console.log('Scan is stopped');
    this.setState({scanning: false});
  }

  startScan() {
    if (!this.state.scanning) {
      //this.setState({peripherals: new Map()});

      BleManager.scan([], 3, true).then(() => {
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
        peripherals.set('94:65:9C:87:69:E0', peripheral);
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
    peripherals.set('94:65:9C:87:69:E0', peripheral);
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
          '94:65:9C:87:69:E0',
          service,
          rwn_characteristic,
        );
        BleManager.disconnect('94:65:9C:87:69:E0');
      } else {
        BleManager.connect('94:65:9C:87:69:E0')
          .then(() => {
            let peripherals = this.state.peripherals;
            let p = peripherals.get('94:65:9C:87:69:E0');
            if (p) {
              p.connected = true;
              peripherals.set('94:65:9C:87:69:E0', p);
              this.setState({peripherals});
            }
            console.log('Connected to ' + '94:65:9C:87:69:E0');

            setTimeout(() => {
              BleManager.retrieveServices('94:65:9C:87:69:E0').then(
                peripheralInfo => {
                  console.log(peripheralInfo);
                  setTimeout(() => {
                    BleManager.startNotification(
                      '94:65:9C:87:69:E0',
                      service,
                      rwn_characteristic,
                    )
                      .then(() => {
                        console.log('Started notification on ' + '94:65:9C:87:69:E0');
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

  renderItem(item) {
    const buttonTitle = item.connected ? 'Disconnect' : 'Connect';
    return (
      <View style={[styles.buttonContainer]}>
      <Button title={buttonTitle} onPress={() => this.test(item)} />
      </View>
    );
  }

  render() {
    const list = Array.from(this.state.peripherals.values());

    return (
      <View style={styles.peripheralContainer}>
        <Button
          onPress={() => this.startScan()}
          title="Scan For Devices">
          <Text>Scan Bluetooth ({this.state.scanning ? 'on' : 'off'})</Text>
        </Button>
        <Button
          onPress={() => this.retrieveConnected()}
          title="Get Connected Peripherals" />
        <View style={styles.scroll}>
        <FlatList
            data={list}
            renderItem={({item}) => this.renderItem(item)}
            keyExtractor={item => item.id}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
  },
  peripheralContainer: {
  flex: 1,
  },
  row: {
    margin: 10,
  },
  buttonContainer: {
    flex: 1,
    alignContent: 'flex-end',
    marginTop: 500,

  },
});
