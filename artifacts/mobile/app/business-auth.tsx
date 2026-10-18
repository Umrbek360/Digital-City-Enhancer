import { useAuth, useClerk, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { useRequestDemoOtp, useVerifyDemoOtp } from '@workspace/api-client-react';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PrimaryButton } from '@/components/Ui';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomContentInset, topContentInset } from '@/hooks/usePlatformInsets';

WebBrowser.maybeCompleteAuthSession();

export default function BusinessAuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const authParams = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const requestedReturnTo = Array.isArray(authParams.returnTo) ? authParams.returnTo[0] : authParams.returnTo;
  const returnDestination = requestedReturnTo && /^\/business\/[A-Za-z0-9_-]+\/book$/.test(requestedReturnTo)
    ? requestedReturnTo
    : '/business-mode';
  const returningToBooking = returnDestination !== '/business-mode';
  const requestDemoOtp = useRequestDemoOtp();
  const verifyDemoOtp = useVerifyDemoOtp();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [verificationMode, setVerificationMode] = useState<'sign-up' | 'sign-in' | null>(null);
  const [demoOtpStep, setDemoOtpStep] = useState<'phone' | 'verify' | null>(null);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [verificationSessionId, setVerificationSessionId] = useState('');
  const [demoOtpDigits, setDemoOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [expiresAt, setExpiresAt] = useState('');
  const [resendAt, setResendAt] = useState('');
  const [clockNow, setClockNow] = useState(Date.now());
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const otpRequestLock = useRef(false);
  const otpVerifyLock = useRef(false);
  const authActionLock = useRef(false);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [passwordResetStep, setPasswordResetStep] = useState<'verify' | 'new-password' | null>(null);
  const [passwordResetCode, setPasswordResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [ssoPending, setSsoPending] = useState(false);

  const demoOtpPending = requestDemoOtp.isPending || verifyDemoOtp.isPending;
  const isBusy =
    ssoPending ||
    signInFetchStatus === 'fetching' ||
    signUpFetchStatus === 'fetching' ||
    demoOtpPending;
  const resendSeconds = Math.max(
    0,
    Math.ceil(
      (new Date(resendAt).getTime() - (clockNow + serverTimeOffsetMs)) / 1000,
    ) || 0,
  );
  const expirySeconds = Math.max(
    0,
    Math.ceil(
      (new Date(expiresAt).getTime() - (clockNow + serverTimeOffsetMs)) / 1000,
    ) || 0,
  );
  const otpComplete = demoOtpDigits.length === 6 && demoOtpDigits.every(Boolean);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  useEffect(() => {
    if (isSignedIn) router.replace(returnDestination as never);
  }, [isSignedIn, returnDestination]);

  useEffect(() => {
    if (demoOtpStep === null) return;
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [demoOtpStep]);

  useEffect(() => {
    if (demoOtpStep !== 'verify' || !expiresAt) return;
    const timer = setTimeout(() => otpInputRefs.current[0]?.focus(), 180);
    return () => clearTimeout(timer);
  }, [demoOtpStep, expiresAt]);

  const finishSignUp = async () => {
    await signUp.finalize({
      navigate: () => router.replace(returnDestination as never),
    });
  };

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: () => router.replace(returnDestination as never),
    });
  };

  const submitCredentials = async () => {
    if (authActionLock.current || isBusy) return;
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      if (mode === 'sign-up') {
        const { error: signUpError } = await signUp.password({
          emailAddress: emailAddress.trim(),
          password,
        });
        if (signUpError) {
          setError(getClerkErrorMessage(signUpError));
          return;
        }
        const { error: codeError } = await signUp.verifications.sendEmailCode();
        if (codeError) {
          setError(getClerkErrorMessage(codeError));
          return;
        }
        setVerificationMode('sign-up');
        return;
      }

      const { error: signInError } = await signIn.password({
        emailAddress: emailAddress.trim(),
        password,
      });
      if (signInError) {
        setError(getClerkErrorMessage(signInError));
        return;
      }
      if (signIn.status === 'complete') {
        await finishSignIn();
      } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === 'email_code',
        );
        if (!emailCodeFactor) {
          setError('Hisobingiz qo‘shimcha tasdiqlashni talab qiladi. Boshqa tasdiqlash usulidan foydalaning.');
          return;
        }
        const { error: codeError } = await signIn.mfa.sendEmailCode();
        if (codeError) {
          setError(getClerkErrorMessage(codeError));
          return;
        }
        setVerificationMode('sign-in');
      } else {
        setError('Kirishni yakunlash uchun qo‘shimcha ma’lumot kerak.');
      }
    } catch (requestError) {
      setError(getClerkErrorMessage(requestError));
    } finally {
      authActionLock.current = false;
    }
  };

  const verifyEmailCode = async () => {
    if (authActionLock.current || isBusy) return;
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      if (verificationMode === 'sign-up') {
        const { error: verificationError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
        if (verificationError) {
          setError(getClerkErrorMessage(verificationError));
          return;
        }
        if (signUp.status === 'complete') {
          await finishSignUp();
        } else {
          setError('Hisob yaratish uchun qo‘shimcha ma’lumot talab qilindi. Qayta urinib ko‘ring.');
        }
        return;
      }

      const { error: verificationError } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (verificationError) {
        setError(getClerkErrorMessage(verificationError));
        return;
      }
      if (signIn.status === 'complete') {
        await finishSignIn();
      } else {
        setError('Tasdiqlash yakunlanmadi. Kodni tekshirib, qayta urinib ko‘ring.');
      }
    } catch (requestError) {
      setError(getClerkErrorMessage(requestError));
    } finally {
      authActionLock.current = false;
    }
  };

  const continueWithGoogle = async () => {
    setError('');
    setStatusMessage('');
    setSsoPending(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({
          scheme: 'digital-city',
          path: 'sso-callback',
        }),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: () => router.replace(returnDestination as never),
        });
        return;
      }
      setError('Google orqali kirish qo‘shimcha tasdiqlashni talab qilmoqda. Email va parol bilan kirib ko‘ring.');
    } catch (ssoError) {
      setError(getClerkErrorMessage(ssoError));
    } finally {
      setSsoPending(false);
    }
  };

  const startDemoPhoneSignIn = () => {
    setError('');
    setStatusMessage('');
    setDemoCode('');
    setDemoOtpStep('phone');
    setDemoOtpDigits(Array(6).fill(''));
  };

  const requestDemoCode = async () => {
    if (otpRequestLock.current || phoneDigits.length !== 9) return;
    otpRequestLock.current = true;
    setError('');
    setStatusMessage('');
    const requestStartedAt = Date.now();
    try {
      const result = await requestDemoOtp.mutateAsync({
        data: {
          phone: `+998${phoneDigits}`,
          ...(verificationSessionId ? { verificationSessionId } : {}),
        },
      });
      setDemoCode(result.demoCode);
      setVerificationSessionId(result.verificationSessionId);
      setExpiresAt(result.expiresAt);
      setResendAt(result.resendAt);
      setDemoOtpDigits(Array(6).fill(''));
      setFocusedOtpIndex(null);
      const responseReceivedAt = Date.now();
      setClockNow(responseReceivedAt);
      setServerTimeOffsetMs(
        new Date(result.serverTime).getTime() -
          (requestStartedAt + responseReceivedAt) / 2,
      );
      setDemoOtpStep('verify');
    } catch (requestError) {
      const retryAt = readRetryAt(requestError);
      if (retryAt) setResendAt(retryAt);
      const errorCode = readApiErrorCode(requestError);
      if (errorCode !== 'OTP_RATE_LIMIT' && errorCode !== 'OTP_COOLDOWN') {
        setDemoCode('');
        setExpiresAt('');
        setDemoOtpDigits(Array(6).fill(''));
        if (errorCode === 'OTP_SESSION_MISMATCH') {
          setVerificationSessionId('');
        }
      }
      setError(getDemoOtpErrorMessage(requestError));
    } finally {
      otpRequestLock.current = false;
    }
  };

  const submitDemoCode = async (submittedCode?: string) => {
    const codeToVerify = submittedCode ?? demoOtpDigits.join('');
    if (
      otpVerifyLock.current ||
      codeToVerify.length !== 6 ||
      !verificationSessionId ||
      expirySeconds === 0
    ) return;
    otpVerifyLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const result = await verifyDemoOtp.mutateAsync({
        data: {
          phone: `+998${phoneDigits}`,
          verificationSessionId,
          code: codeToVerify,
        },
      });
      await setActive({
        session: result.sessionId,
        navigate: () => router.replace(returnDestination as never),
      });
    } catch (verifyError) {
      const retryAt = readRetryAt(verifyError);
      if (retryAt) setResendAt(retryAt);
      setError(getDemoOtpErrorMessage(verifyError));
    } finally {
      otpVerifyLock.current = false;
    }
  };

  const changeDemoOtpDigit = (index: number, value: string) => {
    setError('');
    setStatusMessage('');
    const pastedDigits = value.replace(/\D/g, '').slice(0, 6);
    if (pastedDigits.length > 1) {
      const startAt = pastedDigits.length === 6 ? 0 : index;
      const next = Array(6).fill('');
      pastedDigits.split('').forEach((digit, offset) => {
        if (startAt + offset < 6) next[startAt + offset] = digit;
      });
      setDemoOtpDigits(next);
      const nextIndex = Math.min(startAt + pastedDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      if (next.every(Boolean)) void submitDemoCode(next.join(''));
      return;
    }

    const next = [...demoOtpDigits];
    next[index] = pastedDigits;
    setDemoOtpDigits(next);
    if (pastedDigits && index < 5) otpInputRefs.current[index + 1]?.focus();
    if (next.every(Boolean)) void submitDemoCode(next.join(''));
  };

  const beginPasswordReset = async () => {
    if (authActionLock.current || isBusy) return;
    const identifier = emailAddress.trim();
    if (!identifier) {
      setError('Parolni tiklash uchun avval email manzilingizni kiriting.');
      return;
    }
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const { error: createError } = await signIn.create({ identifier });
      if (createError) {
        setError('Email manzilini tekshiring va qayta urinib ko‘ring.');
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError('Agar bu manzil hisobga ulangan bo‘lsa, tiklash kodi yuboriladi. Email manzilini tekshiring.');
        return;
      }
      setPasswordResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordResetStep('verify');
    } catch {
      setError('Parolni tiklash hozircha amalga oshmadi. Qayta urinib ko‘ring.');
    } finally {
      authActionLock.current = false;
    }
  };

  const verifyPasswordResetCode = async () => {
    if (
      authActionLock.current ||
      isBusy ||
      !passwordResetCode.trim()
    ) return;
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const { error: verificationError } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: passwordResetCode.trim(),
        });
      if (verificationError) {
        setError(getClerkErrorMessage(verificationError));
        return;
      }
      setPasswordResetStep('new-password');
    } catch (requestError) {
      setError(getClerkErrorMessage(requestError));
    } finally {
      authActionLock.current = false;
    }
  };

  const submitNewPassword = async () => {
    if (authActionLock.current || isBusy) return;
    if (!newPassword || newPassword !== confirmNewPassword) {
      setError('Yangi parollar mos kelmadi.');
      return;
    }
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const { error: resetError } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password: newPassword,
        });
      if (resetError) {
        setError(getClerkErrorMessage(resetError));
        return;
      }
      if (signIn.status === 'complete') {
        await finishSignIn();
      } else {
        setPasswordResetStep(null);
        setPassword('');
        setStatusMessage('Parol yangilandi. Email va yangi parol bilan kiring.');
      }
    } catch (requestError) {
      setError(getClerkErrorMessage(requestError));
    } finally {
      authActionLock.current = false;
    }
  };

  const resendEmailVerificationCode = async () => {
    if (authActionLock.current || isBusy) return;
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const result = verificationMode === 'sign-up'
        ? await signUp.verifications.sendEmailCode()
        : await signIn.mfa.sendEmailCode();
      if (result.error) setError(getClerkErrorMessage(result.error));
    } catch (requestError) {
      setError(getClerkErrorMessage(requestError));
    } finally {
      authActionLock.current = false;
    }
  };

  const resendPasswordResetCode = async () => {
    if (authActionLock.current || isBusy) return;
    authActionLock.current = true;
    setError('');
    setStatusMessage('');
    try {
      const { error: sendError } =
        await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError('Agar bu email hisobga ulangan bo‘lsa, tiklash kodi yuboriladi. Qayta urinib ko‘ring.');
      } else {
        setStatusMessage('Agar bu email hisobga ulangan bo‘lsa, tiklash kodi yuboriladi.');
      }
    } catch {
      setError('Tiklash kodini qayta yuborib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      authActionLock.current = false;
    }
  };

  const cancelPasswordReset = () => {
    setPasswordResetStep(null);
    setPasswordResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    setStatusMessage('');
    signIn.reset();
  };

  if (!isLoaded) {
    return (
      <View style={[styles.authLoading, { backgroundColor: colors.background }]} accessibilityRole="progressbar">
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.authLoadingText, { color: colors.mutedForeground }]}>Hisob tekshirilmoqda…</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignSelf: 'center',
        width: '100%',
        maxWidth: 520,
        paddingTop: topContentInset(insets.top) + 18,
        paddingBottom: bottomContentInset(insets.bottom) + 24,
        paddingHorizontal: 22,
      }}
      bottomOffset={24}
    >
      <Pressable accessibilityLabel="Ortga" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <Text style={[styles.backArrow, { color: colors.foreground }]}>‹</Text>
      </Pressable>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{returningToBooking ? 'DIGITAL CITY · SO‘ROV' : 'DIGITAL CITY · BIZNES'}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {passwordResetStep
            ? passwordResetStep === 'verify' ? 'Emailni tasdiqlang' : 'Yangi parol yarating'
            : verificationMode
            ? 'Emailni tasdiqlang'
            : demoOtpStep === 'verify'
              ? 'Telefonni tasdiqlang'
              : demoOtpStep === 'phone'
                ? 'Telefon orqali kirish'
                : returningToBooking && mode === 'sign-in'
                  ? 'Hisobingizga kiring'
                  : mode === 'sign-up'
                  ? 'Biznes hisobini yarating'
                  : 'Biznes hisobiga kiring'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {passwordResetStep
            ? passwordResetStep === 'verify'
              ? `Agar ${emailAddress} hisobga ulangan bo‘lsa, tiklash kodi keladi.`
              : 'Hisobingiz uchun yangi, kuchli parol tanlang.'
            : verificationMode
            ? `Tasdiqlash kodi ${emailAddress} manziliga yuborildi.`
            : demoOtpStep === 'verify'
              ? `+998 ${formatPhoneDigits(phoneDigits)} raqamiga berilgan kodni kiriting.`
              : demoOtpStep === 'phone'
                ? 'Faqat tasdiqlangan telefon raqami mavjud hisoblar uchun.'
                : returningToBooking
                  ? 'Uchrashuv so‘rovini biznesga yuborish uchun hisobingizga kiring. Kirgandan so‘ng shu so‘rovga qaytasiz.'
                  : 'Arizani yuborish va biznesingiz holatini ko‘rish uchun hisobingizga kiring.'}
        </Text>
      </View>

      {verificationMode ? (
        <>
          <Field
            label="Tasdiqlash kodi"
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setError('');
            }}
            placeholder="Emailga kelgan kod"
            keyboardType="number-pad"
            colors={colors}
          />
          <PrimaryButton title="Emailni tasdiqlash" icon="check" onPress={verifyEmailCode} disabled={isBusy || !code.trim()} />
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void resendEmailVerificationCode()}
            style={styles.textAction}
          >
            <Text style={[styles.textActionLabel, { color: isBusy ? colors.mutedForeground : colors.primary }]}>Kodni qayta yuborish</Text>
          </Pressable>
        </>
      ) : passwordResetStep === 'verify' ? (
        <>
          <Field
            label="Email kodi"
            value={passwordResetCode}
            onChangeText={(value) => {
              setPasswordResetCode(value);
              setError('');
            }}
            placeholder="Emailga kelgan kod"
            keyboardType="number-pad"
            colors={colors}
          />
          <PrimaryButton
            title="Kodni tekshirish"
            icon="check"
            onPress={() => void verifyPasswordResetCode()}
            disabled={isBusy || !passwordResetCode.trim()}
          />
          {isBusy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void resendPasswordResetCode()}
            style={styles.textAction}
          >
            <Text style={[styles.textActionLabel, { color: isBusy ? colors.mutedForeground : colors.primary }]}>
              Kodni qayta yuborish
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={isBusy} onPress={cancelPasswordReset} style={styles.textAction}>
            <Text style={[styles.textActionLabel, { color: isBusy ? colors.mutedForeground : colors.primary }]}>Kirishga qaytish</Text>
          </Pressable>
        </>
      ) : passwordResetStep === 'new-password' ? (
        <>
          <Field
            label="Yangi parol"
            value={newPassword}
            onChangeText={(value) => {
              setNewPassword(value);
              setError('');
            }}
            placeholder="Yangi parol"
            secureTextEntry={!newPasswordVisible}
            showPasswordToggle
            onTogglePassword={() => setNewPasswordVisible((visible) => !visible)}
            colors={colors}
          />
          <Field
            label="Yangi parolni takrorlang"
            value={confirmNewPassword}
            onChangeText={(value) => {
              setConfirmNewPassword(value);
              setError('');
            }}
            placeholder="Parolni takrorlang"
            secureTextEntry={!newPasswordVisible}
            showPasswordToggle
            onTogglePassword={() => setNewPasswordVisible((visible) => !visible)}
            colors={colors}
          />
          <PrimaryButton
            title="Parolni yangilash"
            icon="check"
            onPress={() => void submitNewPassword()}
            disabled={isBusy || !newPassword || !confirmNewPassword}
          />
          {isBusy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          <Pressable accessibilityRole="button" disabled={isBusy} onPress={cancelPasswordReset} style={styles.textAction}>
            <Text style={[styles.textActionLabel, { color: isBusy ? colors.mutedForeground : colors.primary }]}>Kirishga qaytish</Text>
          </Pressable>
        </>
      ) : demoOtpStep === 'phone' ? (
        <>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Telefon raqami</Text>
            <View style={[styles.phoneInput, { backgroundColor: colors.white, borderColor: phoneFocused ? colors.primary : colors.input }]}>
              <Text style={[styles.countryPrefix, { color: colors.foreground }]}>+998</Text>
              <TextInput
                accessibilityLabel="O‘zbekiston telefon raqami"
                testID="demo-otp-phone-input"
                value={formatPhoneDigits(phoneDigits)}
                onChangeText={(value) => {
                  const nextPhoneDigits = normalizePhoneDigits(value);
                  setPhoneTouched(true);
                  if (nextPhoneDigits !== phoneDigits) {
                    setPhoneDigits(nextPhoneDigits);
                    setDemoCode('');
                    setVerificationSessionId('');
                    setExpiresAt('');
                    setResendAt('');
                    setError('');
                    setStatusMessage('');
                  }
                }}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => {
                  setPhoneFocused(false);
                  setPhoneTouched(true);
                }}
                placeholder="(90) 123-45-67"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                autoComplete="tel-national"
                textContentType="telephoneNumber"
                autoCorrect={false}
                editable={!demoOtpPending}
                style={[styles.phoneTextInput, { color: colors.foreground }]}
              />
            </View>
            {phoneTouched && phoneDigits.length !== 9 ? (
              <Text style={[styles.validationHint, { color: colors.error }]}>
                9 xonali raqamni kiriting. Masalan: +998 (90) 123-45-67.
              </Text>
            ) : null}
          </View>
          <PrimaryButton
            title="Demo kodini olish"
            icon="send"
            onPress={() => void requestDemoCode()}
            disabled={demoOtpPending || phoneDigits.length !== 9 || resendSeconds > 0}
          />
          {resendSeconds > 0 && (
            <Text style={[styles.otpExpiry, { color: colors.mutedForeground }]}>
              Yangi kodni {formatCountdown(resendSeconds)} dan keyin so‘rashingiz mumkin.
            </Text>
          )}
          {demoOtpPending && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          <Pressable
            accessibilityRole="button"
            disabled={demoOtpPending}
            onPress={() => {
              setDemoOtpStep(null);
              setError('');
            }}
            style={styles.textAction}
          >
            <Text style={[styles.textActionLabel, { color: colors.primary }]}>Email orqali kirish</Text>
          </Pressable>
        </>
      ) : demoOtpStep === 'verify' ? (
        <>
          <View style={[styles.demoModeNotice, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Text style={[styles.demoModeLabel, { color: colors.accentForeground }]}>DEMO MODE · SMS YUBORILMAYDI</Text>
            <Text
              accessibilityLabel={`Demo tasdiqlash kodi ${demoCode.split('').join(' ')}`}
              testID="demo-otp-visible-code"
              selectable
              style={[styles.demoCode, { color: colors.foreground }]}
            >
              {demoCode}
            </Text>
            <Text style={[styles.demoModeHint, { color: colors.mutedForeground }]}>
              Bu kod faqat ishlab chiqish muhitida ko‘rsatiladi.
            </Text>
          </View>
          <Text style={[styles.label, { color: colors.foreground }]}>6 xonali tasdiqlash kodi</Text>
          <View style={styles.otpRow}>
            {demoOtpDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(input) => {
                  otpInputRefs.current[index] = input;
                }}
                accessibilityLabel={`Tasdiqlash kodi ${index + 1}-raqami`}
                testID={`demo-otp-digit-${index + 1}`}
                value={digit}
                onChangeText={(value) => changeDemoOtpDigit(index, value)}
                onKeyPress={(event) => {
                  const key = event.nativeEvent.key;
                  if (key === 'Backspace' && !demoOtpDigits[index] && index > 0) {
                    otpInputRefs.current[index - 1]?.focus();
                  } else if (key === 'ArrowLeft' && index > 0) {
                    otpInputRefs.current[index - 1]?.focus();
                  } else if (key === 'ArrowRight' && index < 5) {
                    otpInputRefs.current[index + 1]?.focus();
                  }
                }}
                onFocus={() => setFocusedOtpIndex(index)}
                onBlur={() => {
                  setFocusedOtpIndex((current) => current === index ? null : current);
                }}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoCorrect={false}
                selectTextOnFocus
                editable={!demoOtpPending && expirySeconds > 0}
                style={[
                  styles.otpDigit,
                  {
                    backgroundColor: colors.white,
                    borderColor: focusedOtpIndex === index || digit ? colors.primary : colors.input,
                    color: colors.foreground,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.otpExpiry, { color: expirySeconds > 0 ? colors.mutedForeground : colors.error }]}>
            {expirySeconds > 0
              ? `Kod ${formatCountdown(expirySeconds)} da tugaydi.`
              : 'Kod muddati tugadi. Yangi kod so‘rang.'}
          </Text>
          <PrimaryButton
            title="Tasdiqlash va kirish"
            icon="check"
            onPress={() => void submitDemoCode()}
            disabled={demoOtpPending || !otpComplete || expirySeconds === 0}
          />
          {demoOtpPending && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: demoOtpPending || resendSeconds > 0 }}
            onPress={() => void requestDemoCode()}
            disabled={demoOtpPending || resendSeconds > 0}
            style={styles.textAction}
          >
            <Text style={[styles.textActionLabel, { color: demoOtpPending || resendSeconds > 0 ? colors.mutedForeground : colors.primary }]}>
              {resendSeconds > 0 ? `Kodni qayta so‘rash · ${formatCountdown(resendSeconds)}` : 'Yangi kod so‘rash'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDemoOtpStep('phone');
              setDemoCode('');
              setDemoOtpDigits(Array(6).fill(''));
              setError('');
            }}
            style={styles.textAction}
          >
            <Text style={[styles.textActionLabel, { color: colors.primary }]}>Raqamni o‘zgartirish</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Field
            label="Email"
            value={emailAddress}
            onChangeText={(value) => {
              setEmailAddress(value);
              setError('');
              setStatusMessage('');
            }}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
          />
          <Field
            label="Parol"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
              setStatusMessage('');
            }}
            placeholder="Parolingiz"
            secureTextEntry={!passwordVisible}
            showPasswordToggle
            onTogglePassword={() => setPasswordVisible((visible) => !visible)}
            colors={colors}
          />
          <PrimaryButton
            title={mode === 'sign-up' ? 'Hisob yaratish' : 'Kirish'}
            icon={mode === 'sign-up' ? 'user-plus' : 'log-in'}
            onPress={submitCredentials}
            disabled={isBusy || !emailAddress.trim() || !password}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void continueWithGoogle()}
            disabled={isBusy}
            style={[styles.googleButton, { backgroundColor: colors.white, borderColor: colors.border, opacity: isBusy ? 0.6 : 1 }]}
          >
            <Text style={[styles.googleMark, { color: colors.primary }]}>G</Text>
            <Text style={[styles.googleLabel, { color: colors.foreground }]}>Google orqali davom etish</Text>
          </Pressable>
          <View nativeID="clerk-captcha" />
          {isBusy && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
          {mode === 'sign-in' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void beginPasswordReset()}
              disabled={isBusy}
              style={styles.textAction}
            >
              <Text style={[styles.textActionLabel, { color: isBusy ? colors.mutedForeground : colors.primary }]}>
                Parolni unutdingizmi?
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => {
              setError('');
              setStatusMessage('');
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            }}
            style={styles.textAction}
          >
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              {mode === 'sign-in' ? 'Hisobingiz yo‘qmi? ' : 'Hisobingiz bormi? '}
              <Text style={[styles.textActionLabel, { color: colors.primary }]}>
                {mode === 'sign-in' ? 'Ro‘yxatdan o‘ting' : 'Kirish'}
              </Text>
            </Text>
          </Pressable>
          {__DEV__ && mode === 'sign-in' && (
            <Pressable
              accessibilityRole="button"
              testID="demo-otp-open"
              onPress={startDemoPhoneSignIn}
              style={styles.textAction}
            >
              <Text style={[styles.textActionLabel, { color: colors.primary }]}>
                Telefon raqami bilan kirish · DEMO
              </Text>
            </Pressable>
          )}
        </>
      )}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.softRose }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : statusMessage ? (
        <View style={[styles.errorBox, { backgroundColor: colors.accent }]}>
          <Text style={[styles.errorText, { color: colors.accentForeground }]}>{statusMessage}</Text>
        </View>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  const nationalDigits = digits.startsWith('998') && digits.length > 9
    ? digits.slice(3)
    : digits;
  return nationalDigits.slice(0, 9);
}

function formatPhoneDigits(value: string): string {
  if (value.length <= 2) return value;
  if (value.length <= 5) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2, 5)}-${value.slice(5)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 5)}-${value.slice(5, 7)}-${value.slice(7, 9)}`;
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function readRetryAt(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const retryAt = (data as { retryAt?: unknown }).retryAt;
  return typeof retryAt === 'string' ? retryAt : null;
}

function readApiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function getDemoOtpErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const code = (data as { code?: unknown }).code;
      if (code === 'OTP_INVALID') return 'Tasdiqlash kodi noto‘g‘ri. Qayta tekshirib ko‘ring.';
      if (code === 'OTP_EXPIRED' || code === 'OTP_USED') return 'Kod eskirgan yoki ishlatilgan. Yangi kod so‘rang.';
      if (code === 'OTP_COOLDOWN') return 'Yangi kod so‘rashdan oldin biroz kuting.';
      if (code === 'OTP_RATE_LIMIT') return 'Urinishlar soni chegaralandi. Birozdan keyin qayta urinib ko‘ring.';
      if (code === 'OTP_SESSION_MISMATCH') return 'Tasdiqlash sessiyasi mos kelmadi. Biroz kutib, yangi kod so‘rang.';
      if (code === 'ACCOUNT_NOT_FOUND') {
        return 'Bu raqam tasdiqlangan hisobga ulanmagan. Email orqali kiring yoki hisob yarating.';
      }
      if (code === 'ACCOUNT_AMBIGUOUS') return 'Bu raqam bir nechta hisobga ulangan. Email orqali kiring.';
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    const fallback = (error as { message?: unknown }).message;
    if (typeof fallback === 'string') return fallback;
  }
  return 'Demo orqali kirib bo‘lmadi. Qayta urinib ko‘ring.';
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry = false,
  showPasswordToggle = false,
  onTogglePassword,
  autoCapitalize,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'email-address' | 'number-pad';
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  autoCapitalize?: 'none';
  colors: ReturnType<typeof useColors>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: colors.white,
            borderColor: focused ? colors.primary : colors.input,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[styles.inputText, { color: colors.foreground }]}
        />
        {showPasswordToggle && onTogglePassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secureTextEntry ? 'Parolni ko‘rsatish' : 'Parolni yashirish'}
            onPress={onTogglePassword}
            style={styles.passwordToggle}
          >
            <Text style={[styles.passwordToggleText, { color: colors.primary }]}>
              {secureTextEntry ? 'Ko‘rsat' : 'Yashirish'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getClerkErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const details = error as { message?: unknown; errors?: Array<{ longMessage?: string; message?: string }> };
    const clerkMessage = details.errors?.map((item) => item.longMessage || item.message).filter(Boolean).join(' ');
    if (clerkMessage) return clerkMessage;
    if (typeof details.message === 'string') return details.message;
  }
  return error instanceof Error ? error.message : 'Kirish amalga oshmadi. Qayta urinib ko‘ring.';
}

const styles = StyleSheet.create({
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  authLoadingText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  screen: { flex: 1 },
  back: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  backArrow: { fontFamily: 'Inter_400Regular', fontSize: 30, lineHeight: 34, marginTop: -4 },
  header: { marginBottom: 28 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 15, letterSpacing: 1.2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 34, marginTop: 7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 8 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17, marginBottom: 7 },
  inputShell: { minHeight: 52, borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' },
  inputText: { flex: 1, height: 52, paddingVertical: 0, fontFamily: 'Inter_400Regular', fontSize: 13 },
  passwordToggle: { minHeight: 44, justifyContent: 'center', paddingLeft: 10, paddingRight: 2 },
  passwordToggleText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  phoneInput: { height: 52, borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryPrefix: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  phoneTextInput: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', fontSize: 14 },
  demoModeNotice: { borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, marginBottom: 20 },
  demoModeLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  demoCode: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 7, marginTop: 6, marginLeft: 7 },
  demoModeHint: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: 4 },
  otpRow: { flexDirection: 'row', gap: 8, marginTop: 5, marginBottom: 9 },
  otpDigit: { flex: 1, minWidth: 0, height: 55, borderRadius: 10, borderWidth: 1.5, textAlign: 'center', paddingHorizontal: 0, fontFamily: 'Inter_700Bold', fontSize: 21 },
  otpExpiry: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginBottom: 14 },
  validationHint: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 6 },
  googleButton: { minHeight: 52, borderRadius: 8, borderWidth: 1, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleMark: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  googleLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  textAction: { alignItems: 'center', paddingVertical: 16 },
  textActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  switchText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  errorBox: { borderRadius: 8, padding: 12, marginTop: 4 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 },
  spinner: { marginTop: 8 },
});
