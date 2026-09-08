import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDzj7F2LX3Ymqzs1J6ixa2ZtdY_OPcYfrg",
  authDomain: "hayvan-fotograf-app.firebaseapp.com",
  projectId: "hayvan-fotograf-app",
  storageBucket: "hayvan-fotograf-app.firebasestorage.app",
  messagingSenderId: "1012454352364",
  appId: "1:1012454352364:web:696a5854f18df58cf40cc9",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);