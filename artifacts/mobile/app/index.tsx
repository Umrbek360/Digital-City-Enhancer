import { Redirect } from 'expo-router';

// Route the bare app URL into the tab navigator explicitly. This also keeps
// the home screen reachable in the Expo web preview, where group-only routes
// may otherwise leave the initial URL without a rendered screen.
export default function IndexRoute() {
  return <Redirect href="/(tabs)" />;
}
