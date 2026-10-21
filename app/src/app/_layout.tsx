import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useCores } from '@/theme/useCores';

SplashScreen.preventAutoHideAsync();

export default function RaizDoApp() {
  const cores = useCores();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // "always": sem rede a consulta falha (e a tela mostra "sem conexão") em vez de ficar pausada.
          queries: { networkMode: 'always', retry: 1 },
        },
      }),
  );
  const [fontesProntas, erroFontes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  // Se as fontes falharem, o app segue com a fonte do sistema (fallback do guia).
  const pronto = fontesProntas || !!erroFontes;

  useEffect(() => {
    if (pronto) SplashScreen.hide();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
