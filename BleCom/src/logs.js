/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {Text, Button, View} from 'react-native';
import BleManager from 'react-native-ble-manager';

let periObject = '';

const service = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const rwn_characteristic = '49535343-1e4d-4bd9-ba61-23c647249616';

export default class LogScreen extends React.Component {
  constructor(props) {
    super(props);
    periObject = props.navigation.state.params.peripheral;
  }

  componentDidMount() {
    BleManager.start({showAlert: false});
  }

  checkWork(data) {
    console.log('this : ' + periObject);
    console.log('MAchine Id: ' + periObject.id);
    setTimeout(() => {
      BleManager.startNotification(data.peripheral, service, rwn_characteristic)
        .then(() => {
          console.log('Started notification on ' + data.id);
        })
        .catch(error => {
          console.log('Notification error', error);
        });
    }, 200);
    console.log('This is the Data ' + data.value);
  }

  render() {
    return (
      <View style={{flex: 1}}>
        <Text>This is the New Screen</Text>
        <Button title="Touccch Me" onPress={this.checkWork()} />
      </View>
    );
  }
}
