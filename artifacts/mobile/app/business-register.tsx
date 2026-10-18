import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessFields, type BusinessFormValues } from '@/components/BusinessFields';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PrimaryButton } from '@/components/Ui';
import { useColors } from '@/hooks/useColors';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';
import {
  getListMyBusinessesQueryKey,
  useCreateBusiness,
  useListMyBusinesses,
  useUpdateMyBusiness,
} from '@workspace/api-client-react';
import type { BusinessRecord } from '@workspace/api-client-react';

const blankValues: BusinessFormValues = {
  ownerName: '',
  name: '',
  category: 'Ovqatlanish',
  phone: '',
  address: '',
  description: '',
  hours: '',
};

export default function BusinessRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const businessId = Array.isArray(id) ? id[0] : id;
  const editQuery = useListMyBusinesses({
    query: {
      queryKey: getListMyBusinessesQueryKey(),
      enabled: isLoaded && Boolean(isSignedIn) && Boolean(businessId),
    },
  });
  const createMutation = useCreateBusiness();
  const updateMutation = useUpdateMyBusiness();
  const [error, setError] = useState('');
  const record = businessId ? editQuery.data?.find((item) => item.id === businessId) : undefined;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const submit = async (values: BusinessFormValues) => {
    setError('');
    const validationError = validateBusinessForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...values,
      ownerName: values.ownerName.trim(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      description: values.description.trim(),
      hours: values.hours.trim(),
    };
    try {
      if (businessId) {
        await updateMutation.mutateAsync({ businessId, data: payload });
      } else {
        await createMutation.mutateAsync({ data: payload });
      }
      await queryClient.invalidateQueries({ queryKey: getListMyBusinessesQueryKey() });
      router.replace('/business-account');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    }
  };

  if (!isLoaded) {
    return <View style={[styles.state, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!isSignedIn) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name="lock" size={34} color={colors.primary} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>Avval hisobga kiring</Text>
        <Text style={[styles.stateCopy, { color: colors.mutedForeground }]}>Biznes arizasi tasdiqlangan email hisobiga bog‘lanadi.</Text>
        <PrimaryButton title="Kirish yoki ro‘yxatdan o‘tish" icon="log-in" onPress={() => router.push('/business-auth')} style={styles.stateButton} />
      </View>
    );
  }

  if (businessId && editQuery.isPending) {
    return <View style={[styles.state, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (businessId && (editQuery.isError || !record)) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background, paddingHorizontal: 24 }]}>
        <Feather name={editQuery.isError ? 'wifi-off' : 'search'} size={34} color={colors.mutedForeground} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>{editQuery.isError ? 'Ma’lumotlarni yuklab bo‘lmadi' : 'Biznes topilmadi'}</Text>
        {editQuery.isError ? (
          <PrimaryButton title="Qayta urinish" icon="refresh-cw" onPress={() => void editQuery.refetch()} style={styles.stateButton} />
        ) : null}
        <Pressable onPress={() => router.replace('/business-account')} style={styles.backAction}>
          <Text style={[styles.backActionText, { color: colors.primary }]}>Hisobga qaytish</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <BusinessEditor
      key={record?.id ?? 'new'}
      record={record}
      insets={insets}
      error={error}
      isSaving={isSaving}
      onBack={() => router.back()}
      onSubmit={submit}
      onDismissError={() => setError('')}
    />
  );
}

function BusinessEditor({
  record,
  insets,
  error,
  isSaving,
  onBack,
  onSubmit,
  onDismissError,
}: {
  record?: BusinessRecord;
  insets: ReturnType<typeof useSafeAreaInsets>;
  error: string;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (values: BusinessFormValues) => Promise<void>;
  onDismissError: () => void;
}) {
  const colors = useColors();
  const [values, setValues] = useState<BusinessFormValues>(() => record ? {
    ownerName: record.ownerName,
    name: record.name,
    category: record.category,
    phone: record.phone,
    address: record.address,
    description: record.description,
    hours: record.hours,
  } : blankValues);

  const onTextChange = (field: Exclude<keyof BusinessFormValues, 'category'>, text: string) => {
    onDismissError();
    setValues((current) => ({ ...current, [field]: text }));
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topContentInset(insets.top) + 14,
        paddingBottom: bottomContentInset(insets.bottom) + 26,
        paddingHorizontal: 20,
      }}
      bottomOffset={24}
    >
      <View style={styles.header}>
        <Pressable accessibilityLabel="Ortga" onPress={onBack} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{record ? 'Biznesni tahrirlash' : 'Biznes qo‘shish'}</Text>
        <View style={{ width: 42 }} />
      </View>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Ma’lumotlaringiz admin tomonidan tekshiriladi. Tasdiqlangach, biznesingiz mobil katalogda ko‘rinadi.</Text>
      <BusinessFields
        value={values}
        onTextChange={onTextChange}
        onCategoryChange={(category) => {
          onDismissError();
          setValues((current) => ({ ...current, category }));
        }}
        disabled={isSaving}
      />
      <View style={[styles.notice, { backgroundColor: colors.softBlue }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>Telefon va manzil katalogda ko‘rsatiladi. Tahrirlash arizani qayta ko‘rib chiqishga yuboradi.</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <PrimaryButton
        title={isSaving ? 'Yuborilmoqda…' : record ? 'O‘zgarishlarni saqlash' : 'So‘rov yuborish'}
        icon={record ? 'save' : 'send'}
        onPress={() => void onSubmit(values)}
        disabled={isSaving}
        style={styles.submit}
      />
    </KeyboardAwareScrollViewCompat>
  );
}

function validateBusinessForm(values: BusinessFormValues) {
  if (values.ownerName.trim().length < 2) return 'Mas’ul shaxsning ism-familiyasini kiriting.';
  if (values.name.trim().length < 2) return 'Biznes nomini kiriting.';
  if (values.phone.trim().length < 7) return 'Telefon raqamini to‘liq kiriting.';
  if (values.address.trim().length < 3) return 'Biznes manzilini kiriting.';
  if (values.description.trim().length > 2000) return 'Ta’rif 2 000 belgidan oshmasligi kerak.';
  if (values.hours.trim().length > 120) return 'Ish vaqti 120 belgidan oshmasligi kerak.';
  return '';
}

function getRequestErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return error instanceof Error ? error.message : 'So‘rovni yuborib bo‘lmadi. Qayta urinib ko‘ring.';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 25, textAlign: 'center', marginTop: 8 },
  stateCopy: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stateButton: { width: '100%', marginTop: 9 },
  backAction: { paddingVertical: 14, paddingHorizontal: 10 },
  backActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 24 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 22 },
  notice: { borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 2, marginBottom: 14 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  submit: { width: '100%' },
});