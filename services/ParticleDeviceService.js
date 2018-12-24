var Buffer = require("buffer").Buffer;
var RSAKey = require("react-native-rsa");
import { decode as atob, encode as btoa } from "base-64";
import AppConfig from "../config";

const deviceUrl = "http://192.168.0.1";

class ParticleDeviceService {
  static async fetchDeviceId() {
    console.log("getting device id:");
    try {
      const response = await fetch(deviceUrl + "/device-id", {
        method: "GET",
        dataType: "JSON"
      });
      const data = await response.json();
      //response format: {"id":"280020008761353136383631","c":"1"}
      await this.connectToNetwork();
      return data.id;
    } catch (err) {
      return "Hmm...Couldn't find your device. Did you connect to it's Wi-Fi network?";
      console.log(err);
    }
  }

  static async connectToNetwork() {
    try {
      const response = await fetch(deviceUrl + "/connect-ap", {
        method: "POST",
        body: JSON.stringify({ idx: 0 }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  static async scanAP() {
    try {
      const response = await fetch(deviceUrl + "/scan-ap", {
        method: "GET",
        dataType: "JSON"
      });
      const data = await response.json();
      //response format:
      // {
      //   "scans":[{
      //       "ssid":"ssidName","rssi":-73,"sec":4194308,"ch":11,"mdr":144400},
      //       {"ssid":"ssidName","rssi":-67,"sec":4194310,"ch":11,"mdr":216700}
      //    }]
      // }
      return data.scans;
    } catch (err) {
      console.log(err);
    }
  }

  static async getPublicKey() {
    try {
      //console.log("getting public key...");
      const response = await fetch(deviceUrl + "/public-key", {
        method: "GET",
        dataType: "JSON"
      });
      const data = await response.json();
      const publicKey = data.b;
      return publicKey;
    } catch (err) {
      console.log(err);
    }
  }

  static encryptPassword(derKey, password) {
    //derKey is the device public key, which is in DER
    //react-native-rsa needs to take in a public key object with
    //with members n = modulus, and e = exponent
    //DER key modulus is encoded at hex bytes 28 - 156. It's a hex number string, so we have to double to go to proper spot.
    //standard exponent is 0x10001.
    //both modulus and exponent need to be passed in as hex strings
    //for more info on decoding DER keys - see this post:
    //https://crypto.stackexchange.com/a/35105
    const keyModString = derKey.slice(28 * 2, 157 * 2);
    let rsa = new RSAKey();
    const publicKey = {
      n: keyModString,
      e: "10001"
    };
    console.log(`N: ${publicKey.n}, e: ${publicKey.e}`);
    publicKeyString = JSON.stringify(publicKey);
    rsa.setPublicString(publicKeyString); //expects JSON string object with modulus field (n) and exponent field (e)
    let encryptedPassword = rsa.encrypt(password);
    return encryptedPassword;
  }

  static async configureAP(network, password) {
    try {
      console.log(`received password ${password}`);
      const key = await this.getPublicKey();
      console.log(`got public key: ${key}`);
      const encryptedPass = this.encryptPassword(key, password);
      console.log("encrypted password");

      const setupInfo = JSON.stringify({
        idx: 0,
        ssid: network.ssid,
        sec: network.sec,
        ch: network.ch,
        pwd: encryptedPass
      });
      console.log(`sending network info to device: ${setupInfo}`);

      const response = await fetch(deviceUrl + "/configure-ap", {
        method: "POST",
        body: setupInfo,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const data = await response.json();
      console.log(`response from device: ${JSON.stringify(data)}`);
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  static async createClaimCode() {
    try {
      let result = await fetch("https://api.particle.io/oauth/token", {
        body: "grant_type=client_credentials",
        headers: {
          Authorization:
            "Basic " + btoa(AppConfig.clientId + ":" + AppConfig.clientSecret),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
      });

      const response = await result.json();
      const data = JSON.stringify(response);
      console.log(data);
    } catch (err) {
      console.log(err);
    }
  }
}

export default ParticleDeviceService;
