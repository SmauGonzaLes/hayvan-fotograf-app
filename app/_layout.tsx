import { router, Stack, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebase';

export default function RootLayout() {
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setKullanici(user);
      setYukleniyor(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (yukleniyor) return;

    const girisEkraninda = segments[0] === 'giris';

if (!kullanici && !girisEkraninda) {
  router.replace('/giris');
} else if (kullanici && girisEkraninda) {
  router.replace('/(tabs)');
}
  }, [kullanici, yukleniyor, segments]);

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="giris" />
    </Stack>
  );
}