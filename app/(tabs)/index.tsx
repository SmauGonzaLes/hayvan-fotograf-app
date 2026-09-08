import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../config/firebase';

type Gonderi = {
  id: string;
  baslik: string;
  tur: string;
  fotoUrl: string;
  kullaniciEmail: string;
  kullaniciAdi?: string;
  kullaniciFotoUrl?: string;
  begeniSayisi: number;
  yorumSayisi: number;
};

export default function AkisScreen() {
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gonderiler'), orderBy('olusturulmaTarihi', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const veriler = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Gonderi[];
      setGonderiler(veriler);
      setYukleniyor(false);
    });

    return unsubscribe;
  }, []);

  if (yukleniyor) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Akış</Text>

      {gonderiler.length === 0 ? (
        <View style={styles.merkez}>
          <Text style={styles.bosMetin}>Henüz paylaşım yok. İlk paylaşımı sen yap!</Text>
        </View>
      ) : (
        <FlatList
          data={gonderiler}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.kart}
              onPress={() => router.push({ pathname: '/gonderi/[id]', params: { id: item.id } })}
            >
              <Image source={{ uri: item.fotoUrl }} style={styles.foto} />
              <View style={styles.kartIcerik}>
                <Text style={styles.kartBaslik}>{item.baslik}</Text>
                {item.tur ? <Text style={styles.kartTur}>{item.tur}</Text> : null}

                <View style={styles.kullaniciRow}>
                  {item.kullaniciFotoUrl ? (
                    <Image source={{ uri: item.kullaniciFotoUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {(item.kullaniciAdi || item.kullaniciEmail)?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.kartKullanici}>
                    {item.kullaniciAdi || item.kullaniciEmail}
                  </Text>
                </View>

                <View style={styles.etkilesimRow}>
                  <Text style={styles.etkilesimText}>❤️ {item.begeniSayisi}</Text>
                  <Text style={styles.etkilesimText}>💬 {item.yorumSayisi}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  merkez: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bosMetin: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  kart: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  foto: {
    width: '100%',
    height: 220,
  },
  kartIcerik: {
    padding: 12,
  },
  kartBaslik: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  kartTur: {
    fontSize: 13,
    color: '#2563eb',
    marginBottom: 6,
  },
  kullaniciRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 10,
  },
  kartKullanici: {
    fontSize: 12,
    color: '#666',
  },
  etkilesimRow: {
    flexDirection: 'row',
    gap: 16,
  },
  etkilesimText: {
    fontSize: 14,
    color: '#444',
  },
});
