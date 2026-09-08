import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../../config/firebase';
import { firebaseHatasiCevir } from '../../config/hataMesajlari';

const BASLIK_MAX = 60;
const TUR_MAX = 30;

export default function PaylasScreen() {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [baslik, setBaslik] = useState('');
  const [tur, setTur] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const fotoSec = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni vermelisin.');
      return;
    }

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!sonuc.canceled) {
      setFotoUri(sonuc.assets[0].uri);
    }
  };

  const fotoCek = async () => {
    const izin = await ImagePicker.requestCameraPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf çekmek için kamera izni vermelisin.');
      return;
    }

    const sonuc = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });

    if (!sonuc.canceled) {
      setFotoUri(sonuc.assets[0].uri);
    }
  };

  const paylas = async () => {
    if (!fotoUri) {
      Alert.alert('Eksik', 'Önce bir fotoğraf seç veya çek.');
      return;
    }
    if (!baslik.trim()) {
      Alert.alert('Eksik', 'Lütfen bir başlık yaz.');
      return;
    }
    if (!auth.currentUser) return;

    setYukleniyor(true);
    try {
      // Boyut kontrolü: 8 MB üzeri dosyaları reddet (kalite 0.5 ile normalde bu sınıra
      // yaklaşılmaz ama çok yüksek çözünürlüklü orijinal fotoğraflarda önlem olsun)
      const response = await fetch(fotoUri);
      const blob = await response.blob();

      const MAKS_BOYUT_MB = 8;
      if (blob.size > MAKS_BOYUT_MB * 1024 * 1024) {
        Alert.alert(
          'Fotoğraf çok büyük',
          `Seçtiğin fotoğraf ${MAKS_BOYUT_MB} MB sınırını aşıyor. Lütfen daha küçük bir fotoğraf seç.`
        );
        setYukleniyor(false);
        return;
      }

      // Paylaşan kişinin güncel profil bilgisini al (Akış'ta göstermek için)
      const profilSnap = await getDoc(doc(db, 'kullanicilar', auth.currentUser.uid));
      const profilData = profilSnap.exists() ? profilSnap.data() : {};

      const dosyaAdi = `${auth.currentUser.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `gonderiler/${dosyaAdi}`);
      await uploadBytes(storageRef, blob);
      const fotoUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'gonderiler'), {
        kullaniciId: auth.currentUser.uid,
        kullaniciEmail: auth.currentUser.email,
        kullaniciAdi: profilData.kullaniciAdi || 'İsimsiz Kullanıcı',
        kullaniciFotoUrl: profilData.profilFotoUrl || null,
        fotoUrl,
        baslik: baslik.trim(),
        tur: tur.trim(),
        begeniSayisi: 0,
        yorumSayisi: 0,
        olusturulmaTarihi: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'Fotoğrafın paylaşıldı!');
      setFotoUri(null);
      setBaslik('');
      setTur('');
    } catch (error: any) {
  Alert.alert('Hata', firebaseHatasiCevir(error.code));
}finally {
      setYukleniyor(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fotoğraf Paylaş</Text>

      {fotoUri ? (
        <Image source={{ uri: fotoUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Henüz fotoğraf seçilmedi</Text>
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={fotoCek}>
          <Text style={styles.secondaryButtonText}>📷 Çek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={fotoSec}>
          <Text style={styles.secondaryButtonText}>🖼️ Galeriden Seç</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Başlık (örn. Bahçemdeki kedi)"
        value={baslik}
        onChangeText={setBaslik}
        maxLength={BASLIK_MAX}
      />
      <Text style={styles.karakterSayaci}>
        {baslik.length}/{BASLIK_MAX}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Hayvan türü (örn. Kedi)"
        value={tur}
        onChangeText={setTur}
        maxLength={TUR_MAX}
      />
      <Text style={styles.karakterSayaci}>
        {tur.length}/{TUR_MAX}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={paylas}
        disabled={yukleniyor}
      >
        <Text style={styles.buttonText}>
          {yukleniyor ? 'Paylaşılıyor...' : 'Paylaş'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  placeholder: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  karakterSayaci: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 3,
    marginBottom: 9,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
