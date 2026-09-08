import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../../config/firebase';

const YORUM_MAX = 200;

type Gonderi = {
  baslik: string;
  tur: string;
  fotoUrl: string;
  kullaniciEmail: string;
  kullaniciId: string;
  begeniSayisi: number;
  yorumSayisi: number;
};

type Yorum = {
  id: string;
  metin: string;
  kullaniciEmail: string;
  kullaniciAdi?: string;
  kullaniciFotoUrl?: string;
};

export default function GonderiDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gonderi, setGonderi] = useState<Gonderi | null>(null);
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [begenildiMi, setBegenildiMi] = useState(false);
  const [yeniYorum, setYeniYorum] = useState('');

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'gonderiler', id), (snap) => {
      if (snap.exists()) setGonderi(snap.data() as Gonderi);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'gonderiler', id, 'yorumlar'), orderBy('tarih', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setYorumlar(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Yorum[]);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id || !uid) return;
    const unsub = onSnapshot(doc(db, 'gonderiler', id, 'begeniler', uid), (snap) => {
      setBegenildiMi(snap.exists());
    });
    return unsub;
  }, [id, uid]);

  const begeniyiDegistir = async () => {
    if (!id || !uid || !gonderi) return;
    const begeniRef = doc(db, 'gonderiler', id, 'begeniler', uid);
    const gonderiRef = doc(db, 'gonderiler', id);
    const sahipRef = doc(db, 'kullanicilar', gonderi.kullaniciId);

    try {
      if (begenildiMi) {
        await deleteDoc(begeniRef);
        await updateDoc(gonderiRef, { begeniSayisi: increment(-1) });
        await setDoc(sahipRef, { puan: increment(-1) }, { merge: true });
      } else {
        await setDoc(begeniRef, { tarih: serverTimestamp() });
        await updateDoc(gonderiRef, { begeniSayisi: increment(1) });
        await setDoc(sahipRef, { puan: increment(1) }, { merge: true });
      }
    } catch (error: any) {
      console.log('BEĞENİ HATASI:', error.message);
    }
  };

  const yorumEkle = async () => {
    if (!id || !uid || !yeniYorum.trim() || !gonderi) return;

    try {
      const profilSnap = await getDoc(doc(db, 'kullanicilar', uid));
      const profilData = profilSnap.exists() ? profilSnap.data() : {};

      await addDoc(collection(db, 'gonderiler', id, 'yorumlar'), {
        metin: yeniYorum.trim().slice(0, YORUM_MAX),
        kullaniciEmail: auth.currentUser?.email,
        kullaniciAdi: profilData.kullaniciAdi || 'İsimsiz Kullanıcı',
        kullaniciFotoUrl: profilData.profilFotoUrl || null,
        tarih: serverTimestamp(),
      });
      await updateDoc(doc(db, 'gonderiler', id), { yorumSayisi: increment(1) });

      const puanKaydiRef = doc(db, 'gonderiler', id, 'yorumPuanlari', uid);
      const puanKaydiSnap = await getDoc(puanKaydiRef);

      if (!puanKaydiSnap.exists()) {
        const sahipRef = doc(db, 'kullanicilar', gonderi.kullaniciId);
        await setDoc(sahipRef, { puan: increment(2) }, { merge: true });
        await setDoc(puanKaydiRef, { tarih: serverTimestamp() });
      }

      setYeniYorum('');
    } catch (error: any) {
      console.log('YORUM HATASI:', error.message);
    }
  };

  const gonderiyiSil = () => {
    Alert.alert('Gönderiyi Sil', 'Bu gönderiyi kalıcı olarak silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!id || !gonderi) return;
          try {
            const yorumlarSnap = await getDocs(collection(db, 'gonderiler', id, 'yorumlar'));
            for (const yorumDoc of yorumlarSnap.docs) {
              await deleteDoc(yorumDoc.ref);
            }
            const begenilerSnap = await getDocs(collection(db, 'gonderiler', id, 'begeniler'));
            for (const begeniDoc of begenilerSnap.docs) {
              await deleteDoc(begeniDoc.ref);
            }
            const yorumPuanlariSnap = await getDocs(
              collection(db, 'gonderiler', id, 'yorumPuanlari')
            );
            const yorumPuanSayisi = yorumPuanlariSnap.size;
            for (const puanDoc of yorumPuanlariSnap.docs) {
              await deleteDoc(puanDoc.ref);
            }

            const geriAlinacakPuan = gonderi.begeniSayisi + yorumPuanSayisi * 2;
            if (geriAlinacakPuan !== 0) {
              const sahipRef = doc(db, 'kullanicilar', gonderi.kullaniciId);
              await setDoc(sahipRef, { puan: increment(-geriAlinacakPuan) }, { merge: true });
            }

            try {
              const fotoRef = ref(storage, gonderi.fotoUrl);
              await deleteObject(fotoRef);
            } catch {
              // Fotoğraf zaten silinmişse veya URL uyuşmazsa hata görmezden gelinir
            }
            await deleteDoc(doc(db, 'gonderiler', id));

            router.back();
          } catch (error: any) {
            console.log('SİLME HATASI:', error.message);
            Alert.alert('Hata', 'Gönderi silinirken bir sorun oluştu.');
          }
        },
      },
    ]);
  };

  if (!gonderi) {
    return (
      <View style={styles.merkez}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={yorumlar}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Image source={{ uri: gonderi.fotoUrl }} style={styles.foto} />
            <View style={styles.bilgiAlani}>
              <Text style={styles.baslik}>{gonderi.baslik}</Text>
              {gonderi.tur ? <Text style={styles.tur}>{gonderi.tur}</Text> : null}
              <Text style={styles.kullanici}>{gonderi.kullaniciEmail}</Text>

              <View style={styles.etkilesimRow}>
                <TouchableOpacity style={styles.begeniButon} onPress={begeniyiDegistir}>
                  <Ionicons
                    name={begenildiMi ? 'heart' : 'heart-outline'}
                    size={24}
                    color={begenildiMi ? '#ef4444' : '#333'}
                  />
                  <Text style={styles.etkilesimText}>{gonderi.begeniSayisi}</Text>
                </TouchableOpacity>
                <View style={styles.begeniButon}>
                  <Ionicons name="chatbubble-outline" size={22} color="#333" />
                  <Text style={styles.etkilesimText}>{gonderi.yorumSayisi}</Text>
                </View>
              </View>

              {uid === gonderi.kullaniciId && (
                <TouchableOpacity style={styles.silButon} onPress={gonderiyiSil}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={styles.silButonText}>Gönderiyi Sil</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.yorumBaslik}>Yorumlar</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.yorumKart}>
            {item.kullaniciFotoUrl ? (
              <Image source={{ uri: item.kullaniciFotoUrl }} style={styles.yorumAvatar} />
            ) : (
              <View style={styles.yorumAvatarPlaceholder}>
                <Text style={styles.yorumAvatarPlaceholderText}>
                  {(item.kullaniciAdi || item.kullaniciEmail)?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.yorumMetinAlani}>
              <Text style={styles.yorumKullanici}>{item.kullaniciAdi || item.kullaniciEmail}</Text>
              <Text style={styles.yorumMetin}>{item.metin}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.bosYorum}>Henüz yorum yok, ilk yorumu sen yap!</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <View style={styles.yorumEkleAlani}>
        <View style={styles.yorumEkleRow}>
          <TextInput
            style={styles.yorumInput}
            placeholder="Bir yorum yaz..."
            value={yeniYorum}
            onChangeText={setYeniYorum}
            maxLength={YORUM_MAX}
            multiline
          />
          <TouchableOpacity style={styles.gonderButon} onPress={yorumEkle}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.karakterSayaci}>
          {yeniYorum.length}/{YORUM_MAX}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  merkez: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 55, paddingHorizontal: 16, paddingBottom: 10 },
  foto: { width: '100%', height: 320 },
  bilgiAlani: { padding: 16 },
  baslik: { fontSize: 20, fontWeight: '700' },
  tur: { fontSize: 14, color: '#2563eb', marginTop: 2 },
  kullanici: { fontSize: 13, color: '#999', marginTop: 4 },
  etkilesimRow: { flexDirection: 'row', gap: 20, marginTop: 14, marginBottom: 10 },
  begeniButon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etkilesimText: { fontSize: 14, color: '#333' },
  yorumBaslik: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  silButon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  silButonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  yorumKart: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  yorumAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  yorumAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yorumAvatarPlaceholderText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 13,
  },
  yorumMetinAlani: {
    flex: 1,
  },
  yorumKullanici: { fontSize: 12, color: '#999' },
  yorumMetin: { fontSize: 14, marginTop: 2 },
  bosYorum: { textAlign: 'center', color: '#999', marginTop: 10 },
  yorumEkleAlani: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 12,
  },
  yorumEkleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  yorumInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  karakterSayaci: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  gonderButon: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
