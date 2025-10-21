import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import MapView, {
  Polyline,
  Polygon,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useRoute } from "@react-navigation/native";
import { getUserLocation } from "../utils/locationUtils";
import { fetchLandIdDetails, updateLandArea } from "../utils/apiService";
import { haversineDistance, calculateLandArea } from "../utils/geoUtils";
import { useToast } from "react-native-toast-notifications";

const MeasureTool = ({ navigation }) => {
  const toast = useToast();
  const route = useRoute();
  const { growerID, landID, userID } = route.params || {};

  const [positions, setPositions] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 15,
    longitudeDelta: 15,
  });
  const [modalVisible, setModalVisible] = useState(false);
  // ADD THIS NEW STATE VARIABLE
  const [totalArea, setTotalArea] = useState({
    hectare: 0,
    acre: 0,
    gunta: 0,
    sqft: 0,
  });

  const mapRef = useRef();

  useEffect(() => {
    if (growerID && landID) {
      (async () => {
        const id = toast.show("Loading...");
        try {
          const data = await fetchLandIdDetails(growerID, landID);
          if (data?.[0]?.Coordinates) {
            const fetchedCoords = JSON.parse(data[0].Coordinates);
            if (Array.isArray(fetchedCoords)) {
              setPositions(fetchedCoords);
              if (
                fetchedCoords.length > 2 &&
                haversineDistance(fetchedCoords[0], fetchedCoords.at(-1)) < 0.01
              ) {
                setIsClosed(true);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching land details:", error);
        } finally {
          toast.hide(id);
        }
      })();
    }
  }, [growerID, landID]);

  useEffect(() => {
    (async () => {
      const id = toast.show("Getting location...");
      const coords = await getUserLocation();
      if (coords) {
        setUserCoords(coords);
        setRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
      toast.hide(id);
    })();
  }, []);

  const addPoint = (newPoint) => {
    if (isClosed) return;
    if (positions.length > 2 && haversineDistance(newPoint, positions[0]) < 0.005) {
      const closedPositions = [...positions, positions[0]];
      setPositions(closedPositions);
      setIsClosed(true);
      // CHANGE THIS LINE: Pass setTotalArea instead of console.log
      calculateLandArea(closedPositions, setTotalArea);
    } else {
      setPositions([...positions, newPoint]);
    }
  };

  const addPointAtCenter = () => {
    addPoint({ latitude: region.latitude, longitude: region.longitude });
  };

  const undoLastPoint = () => {
    if (positions.length === 0 || isClosed) return;
    setPositions((prev) => prev.slice(0, -1));
  };

  const focusOnPolygon = () => {
    if (positions.length === 0 || !mapRef.current) return;

    mapRef.current.fitToCoordinates(positions, {
      edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
      animated: true,
    });
  };



  const handleSave = async () => {
    setModalVisible(false);
    if (positions.length < 3) { // Ensure at least 3 points for a polygon
      return toast.show("Please add at least 3 points to form a polygon.", { type: "danger" });
    }

    // Ensure totalArea is calculated before saving
    calculateLandArea(positions, setTotalArea);

    const id = toast.show("Saving coordinates...", { type: "normal" });
    try {
      const coordsString = JSON.stringify(positions);
      console.log("Saving coordinates:", coordsString); // Log the coordinates for debugging
      const response = await updateLandArea(growerID, landID, coordsString, totalArea);
      console.log("Response for update Land Area :", response); 

      // Check the response for success or failure
      if (response && response.status === "success") {
        toast.hide(id);
        toast.show("Coordinates saved successfully!", { type: "success" });
      } else {
        throw new Error("Failed to update Land Area.");
      }
    } catch (error) {
      console.error("Error saving coordinates:", error); // More detailed error logging
      toast.hide(id);
      toast.show("Failed to save coordinates: " + error.message, { type: "danger" });
    }
  };

  const handleMarkerPress = (index) => {
    setSelectedPointIndex(index);
  };

  // Handler for selecting a point on the map
  const onMapPress = (e) => {
    const newCoordinate = e.nativeEvent.coordinate;
    addPoint(newCoordinate);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType="hybrid"
        style={styles.map}
        region={region}
        showsUserLocation={true}
        onPress={onMapPress} // On map press, add a point
      >
        {positions.map((pos, index) => (
          <Marker
            key={index}
            coordinate={pos}
            pinColor={selectedPointIndex === index ? "green" : "red"}
            onPress={() => handleMarkerPress(index)}
          />
        ))}

        {positions.length > 1 && (
          <Polyline coordinates={positions} strokeColor="red" strokeWidth={6} />
        )}

        {isClosed && (
          <Polygon
            coordinates={positions}
            fillColor="rgba(0,0,255,0.3)"
            strokeWidth={2}
            strokeColor="red"
          />
        )}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={addPointAtCenter}
          disabled={isClosed}
        >
          <Text style={styles.buttonText}>Add Point (Center)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={undoLastPoint}>
          <Text style={styles.buttonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={focusOnPolygon}
          disabled={positions.length === 0}
        >
          <Text style={styles.buttonText}>Focus Area</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>
              Are you sure you want to save these coordinates?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#4285F4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  modalButton: {
    backgroundColor: "#4285F4",
    padding: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
});

export default MeasureTool;
