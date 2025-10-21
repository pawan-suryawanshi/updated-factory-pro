import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import InputField from "../components/InputField";
import CustomButton from "../components/CustomButton";
import ConfirmationModal from "../components/ConfirmationModal";
import Dropdown from "../components/DropDown";
import { fetchRegions } from "../utils/apiService";
import { useRoute } from '@react-navigation/native';
import { fetchGrowerDetails, updateGrowerDetails } from "../utils/apiService";
import { useToast } from 'react-native-toast-notifications';
import config from "../config/config"; 

const IP_ADDRESS = config.IP_ADDRESS; 

const GrowerProfileScreen = ({ navigation }) => {
    const toast = useToast();
    const route = useRoute();
    const { growerID, userID, role } = route.params || {};
    // const [growerDetails, setGrowerDetails] = useState([]);
    const [photo, setPhotoText] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [fullName, setFullName] = useState("");
    const [address, setAddress] = useState("");
    const [taluka, setTaluka] = useState('');
    const [village, setVillage] = useState('');
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [pinCode, setPinCode] = useState("");
    const [regions, setRegions] = useState([]);
    const [filteredTalukas, setFilteredTalukas] = useState([]);
    const [filteredStates, setFilteredStates] = useState([]);
    const [filteredDistricts, setFilteredDistricts] = useState([]);

    useEffect(() => {

        const loadRegions = async () => {
            try {
                const data = await fetchRegions();
                setRegions(data);
            } catch (error) {
                toast.show("Unable to fetch region details.", { type: 'danger' });
            }
        };

        if (growerID) {
            const loadGrowerDetails = async () => {
                let id = toast.show("Loading...");
                try {
                    const data = await fetchGrowerDetails(growerID);
                    // setGrowerDetails(data)
                    setFullName(data[0].FullName);
                    setAddress(data[0].Grower_Address);
                    setVillage(data[0].Village);
                    setTaluka(data[0].Taluka);
                    setDistrict(data[0].District);
                    setState(data[0].State);
                    setPinCode(data[0].PinCode);
                    setPhotoText(data[0].PhotoUrl);
                } catch (error) {
                    toast.show("Failed to fetch data...!", { type: 'danger' })
                }
                finally {
                    toast.hide(id);
                }
            }

            loadGrowerDetails();
        }

        loadRegions();
    }, []);

    useEffect(() => {
        if (regions.length > 0) {
            const allTalukas = regions.map((g) => g.Taluka);
            setFilteredTalukas([...new Set(allTalukas)]); // ✅ Remove duplicates
            console.log("filteredTalukas :", [...new Set(allTalukas)]); // ✅ Correct log placement
        }
    }, [regions]);

    useEffect(() => {
        console.log("useEffect Triggered - taluka:", taluka);
        if (taluka) {
            // ✅ Filter Districts based on selected Taluka
            const allDistricts = regions.filter((g) => g.Taluka === taluka).map((g) => g.District);

            setFilteredDistricts([...new Set(allDistricts)]); // ✅ Remove duplicates

            console.log("Filtered Districts:", [...new Set(allDistricts)]);
        } else {
            setFilteredDistricts([]); // ✅ Reset when no Taluka is selected
        }
    }, [taluka]);

    useEffect(() => {
        const loadDistricts = async () => {
            if (district) {
                const allStates = regions.filter((g) => g.District === district).map((g) => g.State); // Get district names

                setFilteredStates(Array.from(new Set(allStates)));
                console.log(filteredStates)
            } else {
                setFilteredStates([]);
            }
        };

        loadDistricts();
    }, [district]);


    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "Images",
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            try {
                // Convert the image URI to Base64
                const base64Photo = await FileSystem.readAsStringAsync(result.assets[0].uri,
                    {
                        encoding: FileSystem.EncodingType.Base64,
                    }
                );

                console.log("Base64 String:", base64Photo);

                setPhotoText(base64Photo); // Update state
                toast.show("photo saved...!", { type: 'normal' })
            } catch (error) {
                console.error("Error converting image to Base64:", error);
                toast.show("Image processing failed. Retry.", { type: 'danger' });
            }
        }
    };

    const buildPayload = (fullName, address, village, taluka, district, state, pinCode, photo) => ({
        fullName,
        address,
        village,
        taluka,
        district,
        state,
        pinCode,
        photo,
    });

    const clearFormData = () => {
        setFullName("");
        setAddress("");
        setVillage("");
        setTaluka("");
        setDistrict("");
        setState("");
        setPinCode("");
        setPhotoText("");
    };

    const handleSubmit = async () => {
        if (!fullName || !address || !village || !taluka || !district || !state || !pinCode || !photo) {
            toast.show("Complete all fields before submitting.", { type: 'danger' });
            return;
        }

        let id = toast.show("Saving Details...");

        try {
            const payload = buildPayload(fullName, address, village, taluka, district, state, pinCode, photo);

            console.log("payload :", payload);
            const response = await fetch(`${IP_ADDRESS}/api/grower/add`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json", // Correct Content-Type for JSON payload
                    },
                    body: JSON.stringify(payload), // Send payload as JSON
                }
            );

            if (!response.ok) {
                throw new Error("Failed to submit grower details.");
            }

            const data = await response.json();
            console.log("Response Data:", data);
            toast.show("Grower Details Submitted...!", { type: 'success' })

            // Clear  and photo after successful submission
            navigation.navigate("GrowerLandDetails", { growerID: data.growerID });
        } catch (error) {
            console.error("Error:", error);
            toast.show("Submission failed. Try again.", { type: 'danger' });
        }
        finally {
            clearFormData();
            toast.hide(id);
        }
    };

    const handleUpdate = async () => {
        if (!fullName || !address || !village || !taluka || !district || !state || !pinCode || !photo) {
            toast.show("Complete all fields before submitting.", { type: 'danger' });
            return;
        }

        if (!growerID) {
            toast.show("Grower ID is missing.", { type: 'danger' });
        }

        let id = toast.show("Updating...");

        try {
            const payload = buildPayload(fullName, address, village, taluka, district, state, pinCode, photo);

            // console.log("payload :", payload);

            const data = await updateGrowerDetails(growerID, payload);
            console.log("Response Data:", data);
            toast.update(id, "Updated Successfully..", { type: "success" });

            // Clear  and photo after successful submission
            if (role === "admin") {
                navigation.navigate("Admin", { userID });
            } else {
                navigation.navigate("FieldOverseer", { userID });
            }

        } catch (error) {
            console.error("Error:", error);
            toast.show("updation failed. Try again.", { type: 'danger' });
        }
        finally {
            clearFormData();
            toast.hide(id);
        }
    };

    const handleOpenModal = () => {
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const handleConfirm = () => {
        console.log("Confirmed!");
        { `${growerID ? (handleUpdate()) : (handleSubmit())}` }
        setModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photo Picker */}
                <View style={styles.photoContainer}>
                    {photo ? (
                        <Image
                            source={{ uri: `data:image/jpeg;base64,${photo}` }}
                            style={styles.photo}
                        />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons
                                style={styles.photoPlaceholderText}
                                name="person"
                                color="black"
                            />
                        </View>
                    )}
                    <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                        <FontAwesome6 style={styles.cameraImage} name="camera" />
                        <Text style={styles.photoButtonText}>Take/Upload Photo</Text>
                    </TouchableOpacity>
                </View>

                {/* Grower Full Name */}
                <InputField
                    label="Grower Full Name"
                    placeholder="Enter Your Name"
                    value={fullName}
                    onChangeText={setFullName}
                />
                {/* Grower Address */}
                <InputField
                    label="Address"
                    placeholder="Enter Your Address"
                    value={address}
                    onChangeText={setAddress}
                />

                {/* Grower Village */}
                <InputField
                    label="Village"
                    placeholder="Enter Your Village"
                    value={village}
                    onChangeText={setVillage}
                />

                {/* Taluka Picker */}
                <Dropdown
                    label="Taluka"
                    items={filteredTalukas.map((taluka, index) => ({ label: taluka, value: taluka, key: index.toString(), }))}
                    placeholder="Select Taluka"
                    selectedValue={taluka}
                    onSelect={setTaluka}
                />

                {/* District Picker */}
                <Dropdown
                    label="District"
                    items={filteredDistricts.map((district, index) => ({ label: district, value: district, key: index.toString(), }))}
                    placeholder="Select District"
                    selectedValue={district}
                    onSelect={setDistrict}
                />

                {/* State Picker */}
                <Dropdown
                    label="State"
                    items={filteredStates.map((state, index) => ({ label: state, value: state, key: index.toString(), }))}
                    placeholder="Select State"
                    selectedValue={state}
                    onSelect={setState}
                />

                {/* Grower Zip/Pin Code */}
                <InputField
                    label="Zip/Pin Code"
                    placeholder="Enter 6-digit code"
                    value={pinCode}
                    onChangeText={setPinCode}
                    keyboardType="numeric"
                    maxLength={6} // Restrict input to 6 digits
                />

                {/* Submit Buttons */}
                <CustomButton title={`${growerID ? ("Update") : ("Submit")}`} onPress={handleOpenModal} />

                {/* Confirmation Modal */}
                <ConfirmationModal
                    visible={isModalVisible}
                    onClose={handleCloseModal}
                    onConfirm={handleConfirm}
                    title="Confirm Submission" // You can customize this
                    message="Are you sure, you want to submit?" // You can customize this
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default GrowerProfileScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    photoContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    photo: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: "#ddd",
    },
    photoPlaceholder: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "#eee",
        justifyContent: "center",
        alignItems: "center",
    },
    photoPlaceholderText: {
        color: "#aaa",
        fontSize: 45,
    },
    photoButton: {
        flex: 1,
        flexDirection: "row",
        gap: 8,
        backgroundColor: "#000000",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 10,
    },
    cameraImage: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "bold",
    },
    photoButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "semibold",
    },

});
