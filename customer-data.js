// DriveWise customer view — mock data
// Replace these arrays with API/database calls once the MySQL backend is ready.
// Field names follow the DriveWise entities: Location, Owner, Vehicle, Driver, Addon, Customer, Booking.
//
// Dates for owner blocks and sample bookings are stored as DAY OFFSETS from today
// (0 = today, -3 = three days ago, 5 = in five days), so the demo always has
// past, current and upcoming trips whenever you open it.

const DW_LOCATIONS = [
  { id: "LOC01", name: "Dwarka Sector 21", city: "Delhi", lat: 28.5523, lng: 77.0583 },
  { id: "LOC02", name: "Connaught Place", city: "Delhi", lat: 28.6315, lng: 77.2167 },
  { id: "LOC03", name: "Saket", city: "Delhi", lat: 28.5245, lng: 77.2066 },
  { id: "LOC04", name: "Rajouri Garden", city: "Delhi", lat: 28.6492, lng: 77.1226 },
  { id: "LOC05", name: "Noida Sector 18", city: "Noida", lat: 28.5708, lng: 77.3261 },
  { id: "LOC06", name: "Cyber City", city: "Gurugram", lat: 28.4950, lng: 77.0890 },
  { id: "LOC07", name: "Lajpat Nagar", city: "Delhi", lat: 28.5677, lng: 77.2433 },
  { id: "LOC08", name: "IGI Airport T3", city: "Delhi", lat: 28.5562, lng: 77.0870 }
];

// Points of interest used to simulate GPS movement on the tracking map
const DW_LANDMARKS = [
  { name: "India Gate", lat: 28.6129, lng: 77.2295 },
  { name: "Lodhi Garden", lat: 28.5931, lng: 77.2197 },
  { name: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
  { name: "Karol Bagh", lat: 28.6519, lng: 77.1909 },
  { name: "Akshardham", lat: 28.6127, lng: 77.2773 },
  { name: "Aerocity", lat: 28.5503, lng: 77.1205 },
  { name: "Qutub Minar", lat: 28.5245, lng: 77.1855 },
  { name: "Janakpuri", lat: 28.6219, lng: 77.0878 }
];

const DW_OWNERS = [
  { id: "OWN01", type: "company", name: "MetroWheels Rentals", rating: 4.6, trips: 2140, since: 2019, phone: "011 4567 1200" },
  { id: "OWN02", type: "company", name: "Yatra Self Drive", rating: 4.4, trips: 1385, since: 2020, phone: "011 4012 8800" },
  { id: "OWN03", type: "company", name: "Two-Wheel Hub", rating: 4.7, trips: 3902, since: 2018, phone: "011 4300 5566" },
  { id: "OWN04", type: "individual", name: "Rohan Mehta", rating: 4.9, trips: 64, since: 2023, phone: "98110 22345" },
  { id: "OWN05", type: "individual", name: "Simran Kaur", rating: 4.8, trips: 112, since: 2022, phone: "99580 11872" },
  { id: "OWN06", type: "individual", name: "Arjun Nair", rating: 4.5, trips: 37, since: 2024, phone: "98731 50490" },
  { id: "OWN07", type: "company", name: "Highway Cars & Rentals", rating: 4.3, trips: 980, since: 2021, phone: "0124 455 7700" },
  { id: "OWN08", type: "individual", name: "Neha Gupta", rating: 4.7, trips: 89, since: 2022, phone: "97170 66431" }
];

// Chauffeurs who can be assigned when a customer books a car "with driver"
const DW_DRIVERS = [
  { id: "DRV01", name: "Rajesh Kumar", phone: "98100 45127", rating: 4.9, years: 14, languages: ["Hindi", "English", "Punjabi"], locationIds: ["LOC01", "LOC04", "LOC08"] },
  { id: "DRV02", name: "Suresh Yadav", phone: "98717 30018", rating: 4.8, years: 9, languages: ["Hindi", "English"], locationIds: ["LOC02", "LOC07", "LOC03"] },
  { id: "DRV03", name: "Mohammed Irfan", phone: "99991 20774", rating: 4.9, years: 11, languages: ["Hindi", "Urdu", "English"], locationIds: ["LOC05", "LOC07", "LOC02"] },
  { id: "DRV04", name: "Gurpreet Singh", phone: "98184 66503", rating: 4.7, years: 7, languages: ["Punjabi", "Hindi"], locationIds: ["LOC04", "LOC01", "LOC06"] },
  { id: "DRV05", name: "Anil Sharma", phone: "95600 81236", rating: 4.6, years: 5, languages: ["Hindi", "English"], locationIds: ["LOC06", "LOC08", "LOC03"] },
  { id: "DRV06", name: "Vikram Rawat", phone: "88003 19452", rating: 4.8, years: 12, languages: ["Hindi", "Garhwali", "English"], locationIds: ["LOC03", "LOC05", "LOC02"] }
];

// photo = file name on Wikimedia Commons (freely licensed). If a photo can't load,
// the page falls back to a drawn illustration in the vehicle's colour.
// booked = date ranges the owner has blocked, as [startOffset, endOffset] in days from today.
const DW_VEHICLES = [
  // ---------------- Cars ----------------
  { id: "VH101", type: "car", body: "hatchback", make: "Maruti Suzuki", model: "Swift", year: 2024, plate: "DL 3C AW 4521", color: "#C8412F",
    photo: "Suzuki_Swift_(2024)_hybrid_IMG_8820.jpg",
    fuel: "Petrol", transmission: "Manual", seats: 5, pricePerDay: 1499, deposit: 3000, kmLimit: 250, ownerId: "OWN01", locationId: "LOC01",
    features: ["Bluetooth audio", "Rear parking sensors", "6 airbags"], booked: [[3, 5], [19, 21]] },
  { id: "VH102", type: "car", body: "suv", make: "Hyundai", model: "Creta", year: 2024, plate: "DL 8C BX 1190", color: "#E9E4D8",
    photo: "Hyundai_Creta_SU2id_PE_Creamy_White_Pearl_(3).jpg",
    fuel: "Diesel", transmission: "Automatic", seats: 5, pricePerDay: 3299, deposit: 5000, kmLimit: 300, ownerId: "OWN01", locationId: "LOC02",
    features: ["Panoramic sunroof", "Android Auto / CarPlay", "Cruise control", "Ventilated seats"], booked: [[8, 9]] },
  { id: "VH103", type: "car", body: "suv", make: "Mahindra", model: "Thar", year: 2023, plate: "DL 1C CT 7788", color: "#3F5A3A",
    photo: "Mahindra_Thar_Photoshoot_At_Perupalem_Beach_(West_Godavari_District,AP,India_)_Djdavid.jpg",
    fuel: "Diesel", transmission: "Manual", seats: 4, pricePerDay: 3999, deposit: 7000, kmLimit: 300, ownerId: "OWN04", locationId: "LOC03",
    features: ["4x4", "Convertible top", "Touchscreen", "Off-road tyres"], booked: [[6, 8], [13, 14], [27, 29]] },
  { id: "VH104", type: "car", body: "suv", make: "Tata", model: "Nexon EV", year: 2024, plate: "DL 2C EV 3302", color: "#2E6E8E",
    photo: "2020_Tata_Nexon_EV_(India)_front_view.png",
    fuel: "Electric", transmission: "Automatic", seats: 5, pricePerDay: 2799, deposit: 5000, kmLimit: 250, ownerId: "OWN02", locationId: "LOC05",
    features: ["~325 km range", "Fast charging", "Connected car app"], booked: [[1, 2]] },
  { id: "VH105", type: "car", body: "sedan", make: "Honda", model: "City", year: 2022, plate: "DL 4C AF 6610", color: "#8A8F96",
    photo: "2020_Honda_City_1.0_SV_VTEC_Turbo_(05-07-2020)_01.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 5, pricePerDay: 2499, deposit: 4000, kmLimit: 300, ownerId: "OWN05", locationId: "LOC04",
    features: ["Lane watch camera", "Sunroof", "Cruise control"], booked: [[15, 16]] },
  { id: "VH106", type: "car", body: "muv", make: "Toyota", model: "Innova Crysta", year: 2022, plate: "HR 26 DQ 4410", color: "#5B5F66",
    photo: "Toyota_Innova_Crysta_2.4_Z_front_right.jpg",
    fuel: "Diesel", transmission: "Manual", seats: 7, pricePerDay: 4299, deposit: 7000, kmLimit: 350, ownerId: "OWN02", locationId: "LOC06",
    features: ["7 seats", "Rear AC vents", "Large boot"], booked: [[4, 6]] },
  { id: "VH107", type: "car", body: "hatchback", make: "Maruti Suzuki", model: "Baleno", year: 2024, plate: "UP 16 CZ 2087", color: "#1F4E8C",
    photo: "2022_Maruti_Suzuki_Baleno_Alpha_(India)_front_view.jpg",
    fuel: "CNG", transmission: "Manual", seats: 5, pricePerDay: 1599, deposit: 3000, kmLimit: 250, ownerId: "OWN06", locationId: "LOC05",
    features: ["CNG + petrol", "360° camera", "Head-up display"], booked: [[10, 12]] },
  { id: "VH108", type: "car", body: "suv", make: "Kia", model: "Seltos", year: 2023, plate: "HR 26 EK 9013", color: "#A31F34",
    photo: "Kia_Seltos_car_Htx_model_(cropped).jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 5, pricePerDay: 3499, deposit: 5000, kmLimit: 300, ownerId: "OWN01", locationId: "LOC06",
    features: ["Panoramic sunroof", "Bose audio", "Ventilated seats"], booked: [[2, 3], [22, 24]] },
  { id: "VH109", type: "car", body: "suv", make: "MG", model: "ZS EV", year: 2023, plate: "DL 9C EV 5521", color: "#DDE3E8",
    photo: "MG_ZS_EV_Facelift_IMG_5514.jpg",
    fuel: "Electric", transmission: "Automatic", seats: 5, pricePerDay: 3199, deposit: 5000, kmLimit: 300, ownerId: "OWN05", locationId: "LOC03",
    features: ["~460 km range", "Panoramic sunroof", "Air purifier"], booked: [] },
  { id: "VH110", type: "car", body: "hatchback", make: "Hyundai", model: "i20", year: 2023, plate: "DL 10C K 8840", color: "#D8DCE0",
    photo: "Hyundai_i20_(BC3)_IMG_3911.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 5, pricePerDay: 1799, deposit: 3000, kmLimit: 250, ownerId: "OWN08", locationId: "LOC07",
    features: ["Sunroof", "Bose audio", "Wireless charging"], booked: [[5, 7]] },
  { id: "VH111", type: "car", body: "suv", make: "Tata", model: "Punch EV", year: 2024, plate: "DL 12C EV 1104", color: "#3E7CB1",
    photo: "Tata_punch.ev.jpg",
    fuel: "Electric", transmission: "Automatic", seats: 5, pricePerDay: 1999, deposit: 4000, kmLimit: 200, ownerId: "OWN07", locationId: "LOC08",
    features: ["~315 km range", "Fast charging", "Sunroof"], booked: [[0, 1]] },
  { id: "VH112", type: "car", body: "suv", make: "Mahindra", model: "XUV700", year: 2023, plate: "HR 26 FB 7007", color: "#7C8790",
    photo: "2021_Mahindra_XUV700_2.2_AX7_(India)_front_view.png",
    fuel: "Diesel", transmission: "Automatic", seats: 7, pricePerDay: 4499, deposit: 8000, kmLimit: 350, ownerId: "OWN07", locationId: "LOC06",
    features: ["7 seats", "ADAS safety suite", "Panoramic sunroof", "Sony audio"], booked: [[9, 11], [30, 33]] },
  { id: "VH113", type: "car", body: "suv", make: "Toyota", model: "Fortuner", year: 2022, plate: "DL 7C FT 2200", color: "#ECEEF0",
    photo: "2016_Toyota_Fortuner_(frontview).jpg",
    fuel: "Diesel", transmission: "Automatic", seats: 7, pricePerDay: 5999, deposit: 10000, kmLimit: 350, ownerId: "OWN02", locationId: "LOC08",
    features: ["4x4", "7 seats", "Powered tailgate"], booked: [[12, 14]] },
  { id: "VH114", type: "car", body: "muv", make: "Maruti Suzuki", model: "Ertiga", year: 2023, plate: "UP 16 DE 3390", color: "#9A3B2E",
    photo: "2022_Suzuki_Ertiga_GL.jpg",
    fuel: "CNG", transmission: "Manual", seats: 7, pricePerDay: 2299, deposit: 4000, kmLimit: 300, ownerId: "OWN06", locationId: "LOC05",
    features: ["7 seats", "CNG + petrol", "Roof-mounted AC vents"], booked: [] },
  { id: "VH115", type: "car", body: "sedan", make: "Hyundai", model: "Verna", year: 2024, plate: "DL 8C VR 5150", color: "#25303B",
    photo: "Hyundai_Verna_SX_Turbo_03.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 5, pricePerDay: 2699, deposit: 4000, kmLimit: 300, ownerId: "OWN08", locationId: "LOC07",
    features: ["Turbo petrol", "Ventilated seats", "ADAS"], booked: [[7, 8]] },

  // ---------------- Bikes ----------------
  { id: "VH201", type: "bike", body: "bike", make: "Royal Enfield", model: "Classic 350", year: 2023, plate: "DL 5S CH 3501", color: "#2B3138",
    photo: "Royal_Enfield_Classic_350_(2017_Model_Year).jpg",
    fuel: "Petrol", transmission: "Manual", seats: 2, pricePerDay: 999, deposit: 2000, kmLimit: 200, ownerId: "OWN03", locationId: "LOC04",
    features: ["Helmet included", "Dual-channel ABS", "USB charging"], booked: [[2, 4], [16, 17]] },
  { id: "VH202", type: "bike", body: "bike", make: "Bajaj", model: "Pulsar NS200", year: 2022, plate: "DL 7S BP 2004", color: "#C8412F",
    photo: "Bajaj_Pulsar_200_ns_grey_and_red.jpg",
    fuel: "Petrol", transmission: "Manual", seats: 2, pricePerDay: 699, deposit: 1500, kmLimit: 200, ownerId: "OWN03", locationId: "LOC01",
    features: ["Helmet included", "ABS", "Digital console"], booked: [[1, 2]] },
  { id: "VH203", type: "bike", body: "bike", make: "KTM", model: "Duke 200", year: 2023, plate: "HR 26 FA 2501", color: "#E86A10",
    photo: "KTM_DUKE_200.jpg",
    fuel: "Petrol", transmission: "Manual", seats: 2, pricePerDay: 1099, deposit: 3000, kmLimit: 200, ownerId: "OWN04", locationId: "LOC06",
    features: ["LED lights", "Bluetooth console", "Slipper clutch"], booked: [] },
  { id: "VH204", type: "bike", body: "bike", make: "Yamaha", model: "R15", year: 2023, plate: "DL 9S YR 1515", color: "#1F4FA8",
    photo: "2019_Yamaha_YZF-R15.jpg",
    fuel: "Petrol", transmission: "Manual", seats: 2, pricePerDay: 1149, deposit: 3000, kmLimit: 200, ownerId: "OWN08", locationId: "LOC03",
    features: ["Helmet included", "Traction control", "Quickshifter"], booked: [[6, 7]] },

  // ---------------- Scooters ----------------
  { id: "VH301", type: "scooter", body: "scooter", make: "Honda", model: "Activa 6G", year: 2024, plate: "DL 3S DA 6612", color: "#EDEFF1",
    photo: "Honda_Activa_6G.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 2, pricePerDay: 399, deposit: 1000, kmLimit: 150, ownerId: "OWN03", locationId: "LOC02",
    features: ["Helmet included", "Under-seat storage"], booked: [[3, 3]] },
  { id: "VH302", type: "scooter", body: "scooter", make: "Ola", model: "S1 Pro", year: 2023, plate: "DL 6S EV 0101", color: "#2E2E33",
    photo: "OLA_S1_Pro_Gen_1_Electric_Scooter.jpg",
    fuel: "Electric", transmission: "Automatic", seats: 2, pricePerDay: 549, deposit: 1500, kmLimit: 120, ownerId: "OWN03", locationId: "LOC01",
    features: ["~180 km range", "Touchscreen with maps", "Helmet included"], booked: [] },
  { id: "VH303", type: "scooter", body: "scooter", make: "TVS", model: "Jupiter", year: 2023, plate: "UP 16 DS 7712", color: "#2E6E8E",
    photo: "TVS_Jupiter.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 2, pricePerDay: 349, deposit: 1000, kmLimit: 150, ownerId: "OWN06", locationId: "LOC05",
    features: ["Helmet included", "Mobile charger"], booked: [[9, 10]] },
  { id: "VH304", type: "scooter", body: "scooter", make: "Suzuki", model: "Access 125", year: 2023, plate: "DL 4S CS 1250", color: "#5B5F66",
    photo: "Suzuki_Access_125,_2023.jpg",
    fuel: "Petrol", transmission: "Automatic", seats: 2, pricePerDay: 379, deposit: 1000, kmLimit: 150, ownerId: "OWN05", locationId: "LOC07",
    features: ["Helmet included", "Large boot"], booked: [] }
];

// Optional extras offered at checkout (price per day)
const DW_ADDONS = [
  { id: "ADD1", name: "Zero-damage cover", desc: "No charge for dents or scratches", price: 299, appliesTo: ["car", "bike", "scooter"] },
  { id: "ADD2", name: "Extra helmet", desc: "For your pillion rider", price: 49, appliesTo: ["bike", "scooter"] },
  { id: "ADD3", name: "Child seat", desc: "Fits ages 1–4", price: 149, appliesTo: ["car"] },
  { id: "ADD5", name: "FASTag with ₹500 balance", desc: "For tolls on highways", price: 99, appliesTo: ["car"] }
];

const DW_PRICING = {
  taxRate: 0.18,                 // GST (mock)
  driverPerDay: 900,             // chauffeur, up to 12 hours a day
  deliveryFee: { car: 399, bike: 199, scooter: 199 } // drop at your address + collect at the end
};

const DW_DEFAULT_CUSTOMER = {
  id: "CUS1042",
  name: "Riya Sharma",
  email: "riya.sharma@example.com",
  phone: "98765 43210",
  licenseNo: "DL-0420210012345",
  licenseVerified: true,
  city: "Delhi",
  addresses: [
    { id: "ADR1", label: "Home", line: "B-12, Pocket 4, Sector 7, Dwarka, New Delhi 110075", lat: 28.5826, lng: 77.0679 },
    { id: "ADR2", label: "Office", line: "Tower B, 9th floor, DLF Cyber City, Gurugram 122002", lat: 28.4957, lng: 77.0878 },
    { id: "ADR3", label: "Parents", line: "C-44, Lajpat Nagar II, New Delhi 110024", lat: 28.5672, lng: 77.2429 }
  ]
};

// Sample bookings. start/end = day offsets from today, plus clock times.
// Prices are calculated by the app from the vehicle and options, so they always add up.
const DW_SAMPLE_BOOKINGS = [
  { id: "BK2026-1187", vehicleId: "VH102", start: [-1, "18:00"], end: [1, "18:00"], booked: -6,
    addons: ["ADD1"], driverId: "DRV02", delivery: { mode: "door", addressId: "ADR3" }, status: "confirmed" },
  { id: "BK2026-1203", vehicleId: "VH105", start: [4, "10:00"], end: [6, "10:00"], booked: -2,
    addons: ["ADD1"], driverId: null, delivery: { mode: "hub" }, status: "confirmed" },
  { id: "BK2026-1219", vehicleId: "VH301", start: [10, "09:00"], end: [11, "21:00"], booked: -1,
    addons: ["ADD2"], driverId: null, delivery: { mode: "door", addressId: "ADR2" }, status: "confirmed" },
  { id: "BK2026-1224", vehicleId: "VH106", start: [18, "06:00"], end: [21, "20:00"], booked: 0,
    addons: ["ADD5", "ADD3"], driverId: "DRV05", delivery: { mode: "door", addressId: "ADR1" }, status: "confirmed" },
  { id: "BK2026-1031", vehicleId: "VH201", start: [-23, "08:00"], end: [-21, "08:00"], booked: -30,
    addons: ["ADD2"], driverId: null, delivery: { mode: "hub" }, status: "completed" },
  { id: "BK2026-0976", vehicleId: "VH107", start: [-40, "11:00"], end: [-38, "11:00"], booked: -44,
    addons: [], driverId: null, delivery: { mode: "door", addressId: "ADR1" }, status: "completed" },
  { id: "BK2026-0912", vehicleId: "VH104", start: [-61, "09:30"], end: [-60, "19:30"], booked: -63,
    addons: ["ADD1"], driverId: null, delivery: { mode: "hub" }, status: "completed" },
  { id: "BK2026-0855", vehicleId: "VH103", start: [-80, "07:00"], end: [-77, "07:00"], booked: -92,
    addons: ["ADD1", "ADD5"], driverId: null, delivery: { mode: "hub" }, status: "completed" },
  { id: "BK2026-1102", vehicleId: "VH302", start: [-15, "10:00"], end: [-15, "18:00"], booked: -16,
    addons: [], driverId: null, delivery: { mode: "hub" }, status: "completed" },
  { id: "BK2026-0731", vehicleId: "VH113", start: [-100, "05:30"], end: [-97, "22:00"], booked: -110,
    addons: ["ADD5"], driverId: "DRV01", delivery: { mode: "door", addressId: "ADR1" }, status: "completed" },
  { id: "BK2026-0990", vehicleId: "VH102", start: [-45, "09:00"], end: [-44, "09:00"], booked: -50,
    addons: [], driverId: null, delivery: { mode: "hub" }, status: "cancelled" },
  { id: "BK2026-1150", vehicleId: "VH203", start: [-5, "08:00"], end: [-4, "08:00"], booked: -9,
    addons: [], driverId: null, delivery: { mode: "hub" }, status: "cancelled" }
];
