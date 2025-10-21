import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { pickPhoto, calculateLandArea } from "../utils/landUtils";
import { useRoute } from '@react-navigation/native';
import LandPhotos from "../components/LandPhotos";
import CustomButton from "../components/CustomButton";
import CustomEditButton from "../components/CustomEditButton";
import ConfirmationModal from "../components/ConfirmationModal";
import ReadOnlyArea from "../components/ReadOnlyArea";
import AddMoreLand from "../components/AddMoreLand";
import RoleSelector from "../components/RoleSelector";
import InputField from "../components/InputField";
import { fetchGrowers, fetchLandIDs, fetchLandIdDetails, fetchCrops, fetchFieldOverseers } from "../utils/apiService";
import { useToast } from 'react-native-toast-notifications';
import Dropdown from "../components/DropDown";
import config from "../config/config"; 


const IP_ADDRESS = config.IP_ADDRESS;
const FieldOverseer = ({ navigation }) => {
  const toast = useToast();
  const route = useRoute();
  // const navigation = useNavigation();
  const { userID } = route.params;
  const [fieldOverseerName, setFieldOverseerName] = useState("");
  const [fieldOverseers, setFieldOverseers] = useState([]);
  const [cropType, setCropType] = useState("");
  const [cropCategory, setCropCategory] = useState("");
  const [cropHealth, setCropHealth] = useState("");
  const [cropStage, setCropStage] = useState("");
  const [gatNumber, setGatNumber] = useState("");
  const [expectedWeight, setExpectedWeight] = useState("");
  const [growerName, setGrowerName] = useState("");
  const [growerID, setGrowerID] = useState("");
  const [growers, setGrowers] = useState([]);
  const [landIDs, setLandIDs] = useState([]);
  const [landID, setLandID] = useState("");
  const [landDetails, setLandDetails] = useState("");
  const [crops, setCrops] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [factoryMember, setFactoryMember] = useState("");
  const [addMoreLand, setAddMoreLand] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [totalArea, setTotalArea] = useState({
    hectare: 0,
    acre: 0,
    gunta: 0,
    sqft: 0,
  });
  const [isModalVisible, setModalVisible] = useState(false);

  const handleSelect = (value) => {
    const [name, id] = value.split("_");
    setGrowerName(value);
    setGrowerID(id);
  }
  const handleCropType = (value) => {
    const [name, id] = value.split("_");
    setCropType(name);
  }
  console.log("croptype", cropType);
  console.log("cropcategory", cropCategory);
  useEffect(() => {
    const getCrops = async () => {
      let id = toast.show("Fetching Crop Details...");
      try {
        const data = await fetchCrops();
        setCrops(data);
      } catch (error) {
        toast.show("Failed to fetch Overseers details.", { type: 'danger' });
      }
      finally {
        toast.hide(id);
      }
    };

    const getFieldOverseers = async () => {
      let id = toast.show("Loading...");
      try {
        const data = await fetchFieldOverseers();
        console.log("Fetched getFieldOverseers data:", data);
        console.log("User ID:", userID);
        setFieldOverseers(data);
        const overseer = data.find((g) => g.UserID === userID);
        if (overseer) {
          setFieldOverseerName(overseer.FieldOverseerName);
        } else {
          toast.show("Field overseer not found.", { type: 'danger' });
        }
      } catch (error) {
        toast.show("Failed to fetch Overseers details.", { type: 'danger' });
      }
      finally {
        toast.hide(id);
      }
    };

    getCrops();
    getFieldOverseers();
  }, []);

  useEffect(() => {
    const loadGrowers = async () => {
      let id = toast.show("Loading...");
      try {
        const data = await fetchGrowers();
        setGrowers(data);
      } catch (error) {
        toast.show("Failed to fetch land details.", { type: 'danger' });
      }
      finally {
        toast.hide(id);
      }
    };

    loadGrowers();
  }, []);

  useEffect(() => {
    if (growerID) {
      const loadLandIDs = async () => {
        let id = toast.show("Loading...");
        try {
          const data = await fetchLandIDs(growerID);
          { data && setLandIDs(data); }
        } catch (error) {
          toast.show("Failed to fetch land IDs.", { type: 'danger' });
        }
        finally {
          toast.hide(id);
        }
      };

      loadLandIDs();
    }
  }, [growerID]); // ✅ Fetch Land IDs when `growerID` changes

  useEffect(() => {
    if (landID) {
      const loadLandDetails = async () => {
        let id = toast.show("Loading...");
        try {
          const data = await fetchLandIdDetails(growerID, landID);
          if (!data || data.length === 0) throw new Error("No data received");

          setLandDetails(data[0]);
          setCropType(data[0].CropType);
          setCropCategory(data[0].CropCategory);

          setCoordinates(data[0].Coordinates);

          setTotalArea({
            hectare: data[0].TotalAreaInHectare || 0,
            acre: data[0].TotalAreaInAcre || 0,
            gunta: data[0].TotalAreaInGunta || 0,
            sqft: data[0].TotalAreaInGunta * 1089 || 0,
          });

          console.log("Fetched Land Details:", data);
          console.log("New Crop Type:", data[0].CropType);
          console.log("New Crop Category:", data[0].CropCategory);
          console.log("Updated Total Area:", totalArea);
          console.log("fetched coordinates :", data[0].Coordinates);
        } catch (error) {
          toast.show("Failed to fetch land details.", { type: 'danger' });
        }
        finally {
          toast.hide(id);
        }
      };

      loadLandDetails();
    }
  }, [landID]); // ✅ Fetch Land Details when both `growerID` & `landID` change


  const handlePickPhoto = async () => {
    let id = toast.show("Loading...");
    const result = await pickPhoto(
      photos,
      setPhotos,
      calculateLandArea,
      setTotalArea
    );
    if (!result.success) {
      toast.show(result.message, { type: 'danger' });
    }
    toast.hide(id);
  };

  const buildPayload = (growerID, fieldOverseerName, cropType, cropHealth, cropStage, gatNumber, expectedWeight, cropCategory, factoryMember, totalArea) => ({
    growerID,
    fieldOverseerName,
    cropType,
    cropCategory,
    cropHealth,
    cropStage,
    gatNumber,
    expectedWeight,
    factoryMember,
    totalAreaInHectare: parseFloat(totalArea.hectare),  // Ensure numeric values
    totalAreaInAcre: parseFloat(totalArea.acre),
    totalAreaInGunta: parseFloat(totalArea.gunta),
    coordinates,
  });
  const clearFormData = () => {
    setCropType("");
    setCropCategory("");
    setPhotos([]);
    setTotalArea({ hectare: 0, acre: 0, gunta: 0, sqft: 0 });
    setGatNumber("");
    setAddMoreLand("");
    setFactoryMember("");
    setExpectedWeight("");
    setCropHealth("");
    setCropStage("");
    setExpectedWeight("");
    setLandID("");
  };

  const handleSubmit = async () => {
    console.log("Add more land : ", addMoreLand);

    const payload = buildPayload(growerID, fieldOverseerName, cropType, cropHealth, cropStage, gatNumber, expectedWeight, cropCategory, factoryMember, totalArea,coordinates);

    console.log("payload", payload);

    if (!growerID || !fieldOverseerName || !cropType || !cropCategory || !cropHealth || !cropStage || !factoryMember || !payload.totalAreaInHectare ||
      !payload.totalAreaInAcre || !payload.totalAreaInGunta || !gatNumber || !expectedWeight || !factoryMember) {
      toast.show("Complete all fields before submitting.", { type: 'danger' });
      return;
    }

    let id = toast.show("Updating Details...");
    try {
      const response = await fetch(`${IP_ADDRESS}/api/land-details/update/${landID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json", // Correct Content-Type for JSON payload
          },
          body: JSON.stringify(payload), // Send payload as JSON
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update Land details.");
      }

      const data = await response.json();
      console.log("Response Data:", data);
      toast.show("Grower details updated successfully!", { type: 'success' });
      // console.log("printing ids: ", growerID, userID, growerName)
      console.log("add more land ; ", addMoreLand);
      if (!addMoreLand) {
        navigation.navigate("GenerateSlip", { growerID, userID, growerName });
      }

      // Clear form and photo after successful submission
      // clearFormData();
    } catch (error) {
      console.error("Error:", error);
      toast.show("Failed to submit grower details.", { type: 'danger' });
    }
    finally {
      clearFormData();
      toast.hide(id);
    }

  };


  const handleOpenModal = () => setModalVisible(true);
  const handleCloseModal = () => setModalVisible(false);

  const handleConfirm = () => {
    // navigation.navigate("GrowerProfile");
    // navigation.navigate("GenerateSlip");
    console.log("printing ids: ", growerID, userID, growerName)
    handleSubmit();
    console.log("Confirmed! Submitting data...");
    // Add your submit logic here
  };
  console.log("overseerName", fieldOverseerName);


  const handleNavigate = () => {
    let id = toast.show("Loading...");
    if (growerID) {
      navigation.navigate("GrowerProfile", { growerID, userID });
    }
    else {
      toast.show("Please select Grower Name.", { type: 'danger' });
    }
    toast.hide(id);
  }

  const handleGoogleEarth = () => {
    let id = toast.show("Loading...");
    if (growerID && landID && coordinates) {
      console.log("coordinates to send :", coordinates);
      console.log("userID : ", userID)
      navigation.navigate("MeasureTool", { growerID, landID, userID, mapType: "hybrid" });
    }
    else {
      toast.show("Please select Land ID.", { type: 'danger' });
    }
    toast.hide(id);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Field Overseer Name */}
      <InputField
        label="Field Overseer Name"
        placeholder="Field Overseer Name"
        value={fieldOverseerName}
        onChangeText={setFieldOverseerName}
        editable={false}
      />
      {/* Grower Name Picker */}
      <Dropdown
        label="Select Grower Name"
        items={growers.map((g) => ({ label: g.FullName + "_" + g.GrowerID, value: g.FullName + "_" + g.GrowerID, key: g.GrowerID }))}
        placeholder="Select Grower Name"
        selectedValue={growerName}
        onSelect={handleSelect}
      />

      {/* View/Edit Grower Info */}
      <CustomEditButton title="View/Edit Grower Info" onPress={handleNavigate} />

      {/* Land ID Picker */}
      <Dropdown
        label="Select Land ID"
        items={landIDs.map((g) => ({ label: "Grower Land ID__" + g.LandID, value: g.LandID, key: g.LandID }))}
        placeholder="Select Land ID"
        selectedValue={landID}
        onSelect={setLandID}
      />

      {/* Crop Type Picker */}
      <Dropdown
        label="Crop Type"
        items={crops.map((g) => ({ label: g.CropType + "_" + g.CropID, value: g.CropType + "_" + g.CropID, key: g.CropID }))}
        placeholder="Select Crop Type"
        selectedValue={cropType}
        onSelect={handleCropType}
      />

      {/* Crop Category Picker */}
      <Dropdown
        label="Crop Category"
        items={crops.map((g) => ({ label: g.CropType + "__" + g.CropCategory, value: g.CropCategory, key: g.CropID }))}
        placeholder="Select Crop Category"
        selectedValue={cropCategory}
        onSelect={setCropCategory}
      />

      {/* Crop Health */}
      <RoleSelector
        label="Crop Health"
        roles={["Healthy", "Moderate", "Poor"]}
        selectedRole={cropHealth}
        onSelectRole={setCropHealth}
      />

      {/* Crop Stage */}
      <RoleSelector
        label="Crop Stage"
        roles={["Initial", "Growing", "Harvesting"]}
        selectedRole={cropStage}
        onSelectRole={setCropStage}
      />

      {/* Land Photos */}
      <LandPhotos
        label="Land Photos (3-8 photos)"
        photos={photos}
        setPhotos={setPhotos}
        calculateLandArea={calculateLandArea}
        setTotalArea={setTotalArea}
        pickPhoto={handlePickPhoto}
      />

      {/* Read-Only Area */}
      <ReadOnlyArea
        label="Approximate Total Area of Land"
        totalArea={totalArea}
      />

      <CustomEditButton title="GoogleEarth View" onPress={handleGoogleEarth} />

      {/* Gat Number */}
      <InputField
        label="Gat Number"
        placeholder="Enter Gat Number"
        value={gatNumber}
        onChangeText={setGatNumber}
        keyboardType="numeric"
      // maxLength={6} // Restrict input to 6 digits
      />

      {/* Expected Weight/Tonnage */}
      <InputField
        label="Expected Weight/Tonnage"
        placeholder="Expected Weight"
        value={expectedWeight}
        onChangeText={setExpectedWeight}
      />

      {/* Select Factory Member */}
      <Dropdown
        label="Factory Member"
        items={[
          { label: "Yes", value: "Yes" },
          { label: "No", value: "No" },
        ]}
        placeholder="Select Factory Member"
        selectedValue={factoryMember}
        onSelect={setFactoryMember}
      />

      {/* Add More Land */}
      <AddMoreLand
        label="Add More Land?"
        addMoreLand={addMoreLand}
        setAddMoreLand={setAddMoreLand}
      />

      {/* Submit Button */}
      <CustomButton title="Save Land Details" onPress={handleOpenModal} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        title="Confirm Submission"
        message="Are you sure you want to submit?"
      />
    </ScrollView>
  );
};

export default FieldOverseer;

// Add your styles here
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  modalActions: {
    marginVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  noButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  noButtonText: {
    color: "#000",
    fontSize: 16,
  },
  yesButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  yesButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
