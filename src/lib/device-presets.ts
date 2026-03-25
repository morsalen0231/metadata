export type DevicePreset = {
  id: string;
  brand: string;
  name: string;
hasGpsVersionId: boolean;

  // identity
  make: string;
  model: string;
  software: string;
  artist?: string;

  // optics
  lensModel: string;
  lensMake?: string;
  focalLength: number;
  fNumber: number;

  // exposure profile
  exposureProgram: string;
  isoRange: [number, number];
  shutterRange: [number, number];

  // image profile
  resolution: [number, number];
  colorSpace: number;

  // behavior
  filenameStyle: "samsung" | "iphone" | "canon";
   iccProfile: "srgb" | "p3";
  hasSubSecTime: boolean;
};

export const devicePresets: DevicePreset[] = [
  {
    id: "samsung-s23-ultra",
    iccProfile: "srgb",
    brand: "Samsung",
    name: "Galaxy S23 Ultra",
    hasGpsVersionId: true,

    make: "Samsung",
    model: "SM-S918B",
    software: "S918BXXS6CXA1",

    lensModel: "Samsung Galaxy S23 Ultra Camera",
    lensMake: "Samsung",
    focalLength: 6.86,
    fNumber: 1.7,

    exposureProgram: "Program AE",
    isoRange: [20, 80],
    shutterRange: [50, 200],

    resolution: [4000, 3000],
    colorSpace: 1,

    filenameStyle: "samsung",
    hasSubSecTime: true,
  },

  {
    id: "samsung-s24-ultra",
    brand: "Samsung",
    name: "Galaxy S24 Ultra",
hasGpsVersionId: true,
iccProfile: "srgb",
    make: "Samsung",
    model: "SM-S928B",
    software: "S928BXXU2AXE4",

    lensModel: "Samsung Galaxy S24 Ultra Camera",
    lensMake: "Samsung",
    focalLength: 6.86,
    fNumber: 1.7,

    exposureProgram: "Program AE",
    isoRange: [20, 70],
    shutterRange: [60, 240],

    resolution: [4000, 3000],
    colorSpace: 1,

    filenameStyle: "samsung",
    hasSubSecTime: true,
  },

  {
    id: "iphone-15-pro-max",
    brand: "Apple",
    name: "iPhone 15 Pro Max",
iccProfile: "p3",
    make: "Apple",
    model: "iPhone 15 Pro Max",
    software: "17.6.1",
    artist: "Apple",

    lensModel: "iPhone 15 Pro Max back triple camera 6.86mm f/1.78",
    lensMake: "Apple",
    focalLength: 6.86,
    fNumber: 1.78,

    exposureProgram: "Program AE",
    isoRange: [20, 50],
    shutterRange: [80, 250],

    resolution: [4032, 3024],
    colorSpace: 1,
hasGpsVersionId: true,
    filenameStyle: "iphone",
    hasSubSecTime: true,
  },

  {
    id: "iphone-14-pro",
    iccProfile: "p3",
    brand: "Apple",
    name: "iPhone 14 Pro",
hasGpsVersionId: true,
    make: "Apple",
    model: "iPhone 14 Pro",
    software: "17.5.1",
    artist: "Apple",

    lensModel: "iPhone 14 Pro back triple camera 6.86mm f/1.78",
    lensMake: "Apple",
    focalLength: 6.86,
    fNumber: 1.78,

    exposureProgram: "Program AE",
    isoRange: [20, 50],
    shutterRange: [80, 250],

    resolution: [4032, 3024],
    colorSpace: 1,

    filenameStyle: "iphone",
    hasSubSecTime: true,
  },

  {
    id: "canon-5d-mark-iv",
    iccProfile: "srgb",
    brand: "Canon",
    name: "EOS 5D Mark IV",
hasGpsVersionId: false,
    make: "Canon",
    model: "Canon EOS 5D Mark IV",
    software: "1.4.0",
    artist: "Canon",

    lensModel: "EF24-70mm f/2.8L II USM",
    lensMake: "Canon",
    focalLength: 35,
    fNumber: 2.8,

    exposureProgram: "Manual",
    isoRange: [100, 800],
    shutterRange: [60, 500],

    resolution: [6720, 4480],
    colorSpace: 1,

    filenameStyle: "canon",
    hasSubSecTime: false,
  },
  {
  id: "samsung-a73",
  iccProfile: "srgb",
  brand: "Samsung",
  name: "Galaxy A73",
hasGpsVersionId: true,
  make: "Samsung",
  model: "SM-A736B",
  software: "A736BXXS6CXA1",

  lensModel: "Samsung Galaxy A73 Camera",
  lensMake: "Samsung",
  focalLength: 5.4,
  fNumber: 1.8,

  exposureProgram: "Program AE",
  isoRange: [50, 400],
  shutterRange: [30, 200],

  resolution: [4000, 3000],
  colorSpace: 1,

  filenameStyle: "samsung",
  hasSubSecTime: true,
},
{
  id: "samsung-s22-ultra",
  iccProfile: "srgb",
  brand: "Samsung",
  name: "Galaxy S22 Ultra",
hasGpsVersionId: true,
  make: "Samsung",
  model: "SM-S908B",
  software: "S908BXXS7DXA1",

  lensModel: "Samsung Galaxy S22 Ultra Camera",
  lensMake: "Samsung",
  focalLength: 6.86,
  fNumber: 1.8,

  exposureProgram: "Program AE",
  isoRange: [20, 100],
  shutterRange: [40, 200],

  resolution: [4000, 3000],
  colorSpace: 1,

  filenameStyle: "samsung",
  hasSubSecTime: true,
},
{
  id: "samsung-s21-ultra",
iccProfile: "srgb",
  brand: "Samsung",
  name: "Galaxy S21 Ultra",
hasGpsVersionId: true,
  make: "Samsung",
  model: "SM-G998B",
  software: "G998BXXS9DXA1",

  lensModel: "Samsung Galaxy S21 Ultra Camera",
  lensMake: "Samsung",
  focalLength: 6.86,
  fNumber: 1.8,

  exposureProgram: "Program AE",
  isoRange: [20, 120],
  shutterRange: [40, 250],

  resolution: [4000, 3000],
  colorSpace: 1,

  filenameStyle: "samsung",
  hasSubSecTime: true,
}
];