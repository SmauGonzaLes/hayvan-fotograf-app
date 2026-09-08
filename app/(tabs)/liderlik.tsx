import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../../config/firebase';

type Kullanici = {
  id: string;
  puan: number;
  kullaniciAdi?: string;
  profilFotoUrl?: string;
};

export default function LiderlikScreen() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'kullanicilar'), orderBy('puan', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const veriler = snap.docs.map((d) => ({
        id: d.id,
        puan: d.data().puan || 0,
        kullaniciAdi: d.data().kullaniciAdi,
        profilFotoUrl: d.data().profilFotoUrl,
      }));
      setKullanicilar(veriler);
      setYukleniyor(false);
    });
    return unsub;
  }, []);

  const madalya = (sira: number) => {
    if (sira === 0) return '🥇';
    if (sira === 1) return '🥈';
    if (sira === 2) return '🥉';
    return `${sira + 1}.`;
  };

  if (yukleniyor) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Liderlik Tablosu</Text>

      {kullanicilar.length === 0 ? (
        <View style={styles.merkez}>
          <Text style={styles.bosMetin}>Henüz kimse puan kazanmadı</Text>
        </View>
      ) : (
        <FlatList
          data={kullanicilar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => {
            const benimSatirim = item.id === auth.currentUser?.uid;
            const gorunenAd = benimSatirim
              ? 'Sen'
              : item.kullaniciAdi || 'İsimsiz Kullanıcı';

            return (
              <View style={[styles.satir, benimSatirim && styles.benimSatirim]}>
                <Text style={styles.sira}>{madalya(index)}</Text>

                {item.profilFotoUrl ? (
                  <Image source={{ uri: item.profilFotoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>
                      {gorunenAd[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}

                <Text style={styles.isim}>{gorunenAd}</Text>
                <Text style={styles.puan}>{item.puan} puan</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  bosMetin: { color: '#999', fontSize: 14 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  benimSatirim: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  sira: { fontSize: 18, fontWeight: '700', width: 30 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  isim: { flex: 1, fontSize: 15, fontWeight: '600' },
  puan: { fontSize: 15, color: '#2563eb', fontWeight: '700' },
});
