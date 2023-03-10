import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, Alert, Dimensions, TouchableHighlight } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import AsyncStorage from '@react-native-community/async-storage';
import Geolocation from '@react-native-community/geolocation';
import client from '../constants/client';
import { SPECIAL_PRODUCT } from '../constants/queries';
import { BottomSheet } from 'react-native-btr';
import Moment from 'moment';
import { imagePrefix } from '../constants/utils';
import HMSMap, { HMSMarker, HMSInfoWindow, MapTypes } from "@hmscore/react-native-hms-map";
import ProductSearchInput from '../components/ProductSearchInput';
import CategorySelector from "../components/CategorySelector";
import { connect } from "react-redux";
import { Chip } from "react-native-elements";
import { getBrand } from 'react-native-device-info';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const ProductsMap = ({ navigation, token }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLatitude, setCurrentLatitude] = useState(-28.4793);
  const [currentLongitude, setCurrentLongitude] = useState(24.6727);
  const [specialData, setSpecialData] = useState([]);
  const [selectedSpecialData, setSelectedSpecialData] = useState({});
  const [platformType, setPlatformType] = useState('');
  const [showCategorySelector, setShowCategorySelector] = useState(false); 
  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState([]);

  const isHuawei = getBrand() === "HUAWEI";

  const getLocation = async () => {
    Geolocation.getCurrentPosition(
      position => {
        let latitude = position.coords.latitude;
        let longitude = position.coords.longitude;
        setCurrentLatitude(latitude);
        setCurrentLongitude(longitude);
      },
      error => {
        console.log(error.code, error.message);
        Alert.alert('Please on location', error.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 100000,
      },
    );
  };

  const fetchSpecialProduct = (token) => {
    client
      .query({
        query: SPECIAL_PRODUCT,
        fetchPolicy: 'no-cache',
        variables: {
          productName : keyword,
          domainCategoryIds : categories.join(","),
        },
        context: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
      .then(result => {
        setSpecialData(result.data.getPrdProductList.result ? result.data.getPrdProductList.result : []);
      })
      .catch(err => {
        console.log(err);
      });
  };

  const renderMapView = () => {
    if (!currentLatitude) return <></>;
    return (
      isHuawei ? <HMSMap 
      camera={{
        target: { latitude: parseFloat(currentLatitude), longitude: parseFloat(currentLongitude), },
        zoom: 11,
      }}
      mapType={MapTypes.NORMAL}
      minZoomPreference={1}
      maxZoomPreference={24}
      rotateGesturesEnabled={true}
      tiltGesturesEnabled={true}
      zoomControlsEnabled={true}
      zoomGesturesEnabled={true}
      mapStyle={
        '[{"mapFeature":"all","options":"labels.icon","paint":{"icon-type":"night"}}]'
      }
      myLocationEnabled={true}
      markerClustering={true}
      myLocationButtonEnabled={true}
      scrollGesturesEnabledDuringRotateOrZoom={true}
      onMapReady={(e) => console.log("HMSMap onMapReady: ", e.nativeEvent)}
      onMapClick={(e) => console.log("HMSMap onMapClick: ", e.nativeEvent)}
      onMapLoaded={(e) => console.log("HMSMap onMapLoaded: ", e.nativeEvent)}
      >
        {specialData.length > 0 &&
          specialData.map((marker, index) => {
            let markerImage = '';
            if (marker.mapProductImages.length > 0) {
              markerImage = marker.mapProductImages[0].imagePath;
            } else {
              markerImage = '';
            }
            if (marker?.latitude && marker?.longitude) {
              return (
                <HMSMarker
                  coordinate={{  latitude: parseFloat(marker?.latitude), longitude: parseFloat(marker?.longitude)}}
                  onInfoWindowClose={(e) => console.log("HMSMarker onInfoWindowClose")}
                  icon={{
                    uri : markerImage ? `${imagePrefix}${markerImage}` :Image.resolveAssetSource(require('../assets/NoImage.jpeg')).uri
                  }}
                >
                <HMSInfoWindow>
                  <TouchableHighlight
                    onPress={(e) => console.log("HMSMarker onInfoWindowClick: ", e.nativeEvent)}
                    onLongPress={(e) => console.log("HMSMarker onInfoWindowLongClick: ", e.nativeEvent)}
                  >
                    <View style={{ backgroundColor: "white" }}>
                      <Text style={{ backgroundColor: "white" }}>{marker?.specialName}</Text>
                      <Text>{marker?.specialDescription}</Text>
                    </View>
                  </TouchableHighlight>
                </HMSInfoWindow>
              </HMSMarker>
              );
            } else {
              return <></>;
            }
          })
        }
      </HMSMap> :
        <MapView
          style={styles.mapStyle}
          initialRegion={{
            latitude: parseFloat(currentLatitude),
            longitude: parseFloat(currentLongitude),
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          region={{
            latitude: parseFloat(currentLatitude),
            longitude: parseFloat(currentLongitude),
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          customMapStyle={mapStyle}>
          {specialData.length > 0 &&
            specialData.map((marker, index) => {
              let markerImage = '';
              if (marker.mapProductImages.length > 0) {
                markerImage = marker.mapProductImages[0].imagePath;
              } else {
                markerImage = '';
              }
              if (marker?.latitude && marker?.longitude) {
                return (
                  <Marker
                    key={index}
                    coordinate={{
                      latitude: parseFloat(
                        index == 1 ? currentLatitude : marker?.latitude,
                      ),
                      longitude: parseFloat(
                        index == 1 ? currentLongitude : marker?.longitude,
                      ),
                    }}
                    title={marker?.specialName}
                    description={marker?.specialDescription}
                    image={ markerImage ? { uri: `${imagePrefix}${markerImage}` } : require('../assets/NoImage.jpeg')}
                  >
                    <Callout
                      onPress={e => {
                        if (
                          e.nativeEvent.action ===
                          'marker-inside-overlay-press' ||
                          e.nativeEvent.action === 'callout-inside-press'
                        ) {
                          return;
                        }

                        setSelectedSpecialData(marker);
                        setModalVisible(!modalVisible);
                      }}>
                      <View>
                        <Text>{marker?.specialName}</Text>
                        <Text>{marker?.specialDescription}</Text>
                      </View>
                    </Callout>
                  </Marker>
                );
              } else {
                return <></>;
              }
            })}
        </MapView>
    );
  };

  const specialDataModal = () => {
    return (
      <BottomSheet
        visible={modalVisible}
        onBackButtonPress={() => {
          setModalVisible(!modalVisible);
        }}
        onBackdropPress={() => {
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <TouchableOpacity onPress={() => setModalVisible(!modalVisible)}>
            <Image
              style={{
                height: 30,
                width: 20,
                resizeMode: 'center',
                marginTop: 30,
              }}
              source={require('../assets/Path662.png')}
            />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.main}>
            {/* <Image style={styles.image} source={require('../assets/img/Rectangle.png')}/> */}
            <Text style={styles.text}>{selectedSpecialData?.specialName}</Text>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  paddingTop: 2,
                  paddingBottom: 20,
                  alignSelf: 'center',
                  height: 30,
                }}>
                <Image
                  style={{
                    width: 15,
                    height: 15,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                  source={require('../assets/stargold.png')}
                />
                <Image
                  style={{
                    width: 15,
                    height: 15,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                  source={require('../assets/stargold.png')}
                />
                <Image
                  style={{
                    width: 15,
                    height: 15,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                  source={require('../assets/stargold.png')}
                />
                <Image
                  style={{
                    width: 15,
                    height: 15,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                  source={require('../assets/stargold.png')}
                />
                <Image
                  style={{
                    width: 15,
                    height: 15,
                    marginLeft: 2,
                    marginRight: 2,
                  }}
                  source={require('../assets/stargold.png')}
                />
              </View>

              <Text
                style={{
                  color: '#A8A8A8',
                  fontSize: 11,
                  alignSelf: 'center',
                }}>
                {Moment(selectedSpecialData?.startDate).format('DD-MMM-YYYY')}
              </Text>
              <Text
                style={{
                  color: '#323232',
                  fontSize: 12,
                  alignSelf: 'center',
                  justifyContent: 'center',
                }}>
                {selectedSpecialData?.specialDescription}
              </Text>
            </View>
          </ScrollView>

          {/* <TouchableOpacity
            style={{
              height: 35,
              width: 200,
              backgroundColor: '#9F1D20',
              alignSelf: 'center',
              marginTop: 25,
              borderRadius: 5,
            }}>
            <Text
              style={{
                alignSelf: 'center',
                marginTop: 8,
                color: '#FFFFFF',
                fontSize: 15,
              }}>
              View Specials
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              height: 35,
              width: 200,
              backgroundColor: '#9F1D20',
              alignSelf: 'center',
              marginTop: 25,
              borderRadius: 5,
            }}>
            <Text
              style={{
                alignSelf: 'center',
                marginTop: 8,
                color: '#FFFFFF',
                fontSize: 15,
              }}>
              Show Business
            </Text>
          </TouchableOpacity> */}
        </View>
      </BottomSheet>
    );
  };

  useEffect(() => {
    if (navigation.isFocused()) {
      getLocation();
    }
  }, [navigation.isFocused()]);

  useEffect(() => {
    fetchSpecialProduct(token);
  }, [keyword, categories])

  const _onSelectCategoryDone = (categories) => {
    setShowCategorySelector(false);
    setCategories(categories);
  }

  const _onPressSelectedCategory = (category) => {
    setCategories(prevState => prevState.filter((cat) => cat.categoryId != category.categoryId));
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {specialDataModal()}
        <View style={{ height: '100%' }}>
          <View style={{ top: 0, zIndex: 10}}>
            <ProductSearchInput 
              onChangeText={setKeyword} 
              onPressFilterIcon={() => setShowCategorySelector(true)} 
            />
          </View>
          {categories.length > 0 && <View style={{zIndex: 2, flexDirection: 'row', flexWrap: 'wrap', marginBottom : 20, paddingHorizontal : 10}}>
            {categories.map(item => (
              <Chip 
                title={item.categoryName}
                icon={{
                  name: 'close',
                  type: 'font-awesome',
                  size: 14,
                  color: 'white',
                }}
                onPress={() => _onPressSelectedCategory(item)}
                iconRight
                titleStyle={{ fontSize: 10 }}
                buttonStyle={{ backgroundColor: '#F54D30', marginBottom: 5}}
              />
            ))}
          </View>}
          {renderMapView()}
        </View>

        {/* <TouchableOpacity
          style={{alignSelf: 'center'}}
          onPress={() => setModalVisible(!modalVisible)}>
          <Image
            style={{height: 30, width: 20, resizeMode: 'center', marginTop: -7}}
            source={require('../assets/Down.png')}
          />
        </TouchableOpacity> */}
        <CategorySelector 
          visible={showCategorySelector} 
          onDone={(values) => _onSelectCategoryDone(values)}
        />
      </SafeAreaView>
    </View>
  );
};

const mapStateToProps = (state) =>({
  token: state.user.token
});

export default connect(mapStateToProps, null)(ProductsMap);

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
];

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    marginLeft: 16,
    bottom: 10,
    width: '90%',
    height: 200,
    alignItems: 'center',

    // padding:15
  },
  mapStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // padding:15
  },
  con: {
    // flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    // flexDirection:"row",
    padding: 2,
  },
  centeredView: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    height: '75%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    //   padding: 95,
    height: '190%',
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // justifyContent:"flex-end"
  },
  button: {
    borderRadius: 10,
    // padding: 10,
    // elevation: 2
    height: 40,
    width: 150,
    marginTop: 30,
  },
  buttonClose: {
    backgroundColor: '#9F1D20',
  },

  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  main: {
    borderRadius: 15,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  image: {
    height: 64,
    width: 64,
    marginTop: -75,
    marginLeft: 10,
  },
  text: {
    color: '#323232',
    alignSelf: 'center',
    marginTop: 10,
    fontSize: 15,
    fontWeight: 'bold',
  },
  SectionStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F54D30',
    height: 43,
    borderRadius: 5,
    margin: 15,
  },

  ImageStyle: {
    padding: 10,
    margin: 5,
    height: 20,
    width: 20,
    resizeMode: 'stretch',
    alignItems: 'center',
  },
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(130,4,150, 0.9)',
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(130,4,150, 0.3)',
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(130,4,150, 0.5)',
  },
});
