import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../config/firebase';

export default function GirisScreen() {
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [kayitModu, setKayitModu] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  const handleGirisYaKayit = async () => {
    if (!email || !sifre) {
      Alert.alert('Eksik bilgi', 'Lütfen e-posta ve şifre gir.');
      return;
    }
    if (kayitModu && !kullaniciAdi.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen bir kullanıcı adı seç.');
      return;
    }

    setYukleniyor(true);
    try {
      if (kayitModu) {
        const sonuc = await createUserWithEmailAndPassword(auth, email, sifre);
        await setDoc(doc(db, 'kullanicilar', sonuc.user.uid), {
          kullaniciAdi: kullaniciAdi.trim(),
          puan: 0,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, sifre);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐾 Hayvan Fotoğraf</Text>
      <Text style={styles.subtitle}>
        {kayitModu ? 'Yeni hesap oluştur' : 'Hesabına giriş yap'}
      </Text>

      {kayitModu && (
        <TextInput
          style={styles.input}
          placeholder="Kullanıcı adı"
          value={kullaniciAdi}
          onChangeText={setKullaniciAdi}
          autoCapitalize="none"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={sifre}
        onChangeText={setSifre}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleGirisYaKayit}
        disabled={yukleniyor}
      >
        <Text style={styles.buttonText}>
          {yukleniyor ? 'Yükleniyor...' : kayitModu ? 'Kayıt Ol' : 'Giriş Yap'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setKayitModu(!kayitModu)}>
        <Text style={styles.switchText}>
          {kayitModu
            ? 'Zaten hesabın var mı? Giriş yap'
            : 'Hesabın yok mu? Kayıt ol'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
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
  switchText: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});