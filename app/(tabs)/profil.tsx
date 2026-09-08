import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../../config/firebase';

export default function ProfilScreen() {
  const kullanici = auth.currentUser;
  const [puan, setPuan] = useState(0);
  const [profilFotoUrl, setProfilFotoUrl] = useState<string | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [geciciAd, setGeciciAd] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!kullanici) return;
    const unsub = onSnapshot(doc(db, 'kullanicilar', kullanici.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPuan(data.puan || 0);
        setProfilFotoUrl(data.profilFotoUrl || null);
        setKullaniciAdi(data.kullaniciAdi || 'İsimsiz Kullanıcı');
      }
    });
    return unsub;
  }, [kullanici]);

  const profilFotoDegistir = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Profil fotoğrafı seçmek için galeri izni vermelisin.');
      return;
    }

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (sonuc.canceled || !kullanici) return;

    setYukleniyor(true);
    try {
      const response = await fetch(sonuc.assets[0].uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profil-fotolari/${kullanici.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'kullanicilar', kullanici.uid), { profilFotoUrl: url }, { merge: true });
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const duzenlemeyiBaslat = () => {
    setGeciciAd(kullaniciAdi);
    setDuzenlemeModu(true);
  };

  const kullaniciAdiKaydet = async () => {
    if (!kullanici || !geciciAd.trim()) return;
    try {
      await setDoc(
        doc(db, 'kullanicilar', kullanici.uid),
        { kullaniciAdi: geciciAd.trim() },
        { merge: true }
      );
      setDuzenlemeModu(false);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleCikis = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => signOut(auth),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profilim</Text>

      <TouchableOpacity onPress={profilFotoDegistir} style={styles.avatarWrapper}>
        {yukleniyor ? (
          <View style={styles.avatarPlaceholder}>
            <ActivityIndicator />
          </View>
        ) : profilFotoUrl ? (
          <Image source={{ uri: profilFotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>📷</Text>
          </View>
        )}
        <Text style={styles.avatarDegistirText}>Fotoğrafı Değiştir</Text>
      </TouchableOpacity>

      {duzenlemeModu ? (
        <View style={styles.adDuzenleRow}>
          <TextInput
            style={styles.adInput}
            value={geciciAd}
            onChangeText={setGeciciAd}
            placeholder="Kullanıcı adı"
            autoFocus
          />
          <TouchableOpacity onPress={kullaniciAdiKaydet}>
            <Text style={styles.kaydetText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={duzenlemeyiBaslat} style={styles.adRow}>
          <Text style={styles.kullaniciAdiText}>{kullaniciAdi}</Text>
          <Text style={styles.duzenleText}>✏️</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.email}>{kullanici?.email}</Text>
      <Text style={styles.points}>🏆 {puan} puan</Text>

      <TouchableOpacity style={styles.button} onPress={handleCikis}>
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
  },
  avatarDegistirText: {
    color: '#2563eb',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  kullaniciAdiText: {
    fontSize: 20,
    fontWeight: '700',
  },
  duzenleText: {
    fontSize: 14,
  },
  adDuzenleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  adInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    minWidth: 160,
  },
  kaydetText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  points: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
