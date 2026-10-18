import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { BusinessCategory } from '@/data/businesses';

export type BusinessFormValues = {
  ownerName: string;
  name: string;
  category: BusinessCategory;
  phone: string;
  address: string;
  description: string;
  hours: string;
};

type TextField = Exclude<keyof BusinessFormValues, 'category'>;

export function BusinessFields({
  value,
  onTextChange,
  onCategoryChange,
  disabled = false,
}: {
  value: BusinessFormValues;
  onTextChange: (field: TextField, text: string) => void;
  onCategoryChange: (category: BusinessCategory) => void;
  disabled?: boolean;
}) {
  const colors = useColors();

  return (
    <>
      <Field
        label="Mas’ul shaxs"
        placeholder="Ism va familiya"
        value={value.ownerName}
        onChangeText={(text) => onTextChange('ownerName', text)}
        disabled={disabled}
      />
      <Field
        label="Biznes nomi"
        placeholder="Masalan, Rayhon Coffee"
        value={value.name}
        onChangeText={(text) => onTextChange('name', text)}
        disabled={disabled}
      />
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Toifa</Text>
        <View style={styles.categories}>
          {businessCategories.map((category) => {
            const selected = value.category === category;
            return (
              <Text
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                onPress={disabled ? undefined : () => onCategoryChange(category)}
                style={[
                  styles.categoryChip,
                  {
                    color: selected ? colors.primaryForeground : colors.mutedForeground,
                    backgroundColor: selected ? colors.primary : colors.white,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: disabled ? 0.65 : 1,
                  },
                ]}
              >
                {category}
              </Text>
            );
          })}
        </View>
      </View>
      <Field
        label="Telefon raqami"
        placeholder="+998 90 123 45 67"
        value={value.phone}
        onChangeText={(text) => onTextChange('phone', text)}
        keyboardType="phone-pad"
        disabled={disabled}
      />
      <Field
        label="Manzil"
        placeholder="Ko‘cha, uy raqami"
        value={value.address}
        onChangeText={(text) => onTextChange('address', text)}
        disabled={disabled}
      />
      <Field
        label="Biznes haqida"
        placeholder="Biznes va xizmatlaringizni qisqacha ta’riflang"
        value={value.description}
        onChangeText={(text) => onTextChange('description', text)}
        multiline
        disabled={disabled}
      />
      <Field
        label="Ish vaqti"
        placeholder="Har kuni 09:00–18:00"
        value={value.hours}
        onChangeText={(text) => onTextChange('hours', text)}
        disabled={disabled}
      />
    </>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'phone-pad';
  multiline?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={!disabled}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: colors.white,
            borderColor: colors.input,
            color: colors.foreground,
            opacity: disabled ? 0.65 : 1,
          },
        ]}
      />
    </View>
  );
}

const businessCategories: BusinessCategory[] = [
  'Ovqatlanish',
  'Go‘zallik',
  'Sog‘liq',
  'Ta’lim',
];

const styles = StyleSheet.create({
  field: { marginBottom: 17 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 13 },
  multilineInput: { minHeight: 104, paddingTop: 13, paddingBottom: 13 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { overflow: 'hidden', borderRadius: 8, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9, fontFamily: 'Inter_500Medium', fontSize: 11 },
});
