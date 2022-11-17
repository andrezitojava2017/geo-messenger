import 'react-native-gesture-handler';
import {useState, useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {NativeBaseProvider, Box} from 'native-base';
import {Loader} from '../components/Loader';
import {AppContext, initialAppState} from './AppContext';
import {requestPermission} from '../geolocation/requestPermission';
import {getCoords} from '../geolocation/getCoords';
import {watchGeolocation} from '../geolocation/watchGeolocation';
import {AppState, UsersPositions} from '../types';
import {AppNavigator} from './AppNavigator';
import {AppStorage} from './AppStorage';
import {syncUserState} from '../messenger/syncUserState';
import {UsersPositionsContext} from '../messenger/UsersPositionsContext';

async function init(): Promise<AppState> {
  const isPermissionGranted = await requestPermission();
  const coords = await getCoords();
  const storage = await AppStorage.getStorage();
  const user = {
    ...storage.user,
    coords: coords ?? storage.user.coords,
  };
  const isLoading = !isPermissionGranted;

  const appState = {
    ...storage,
    user,
    isLoading,
  };

  await AppStorage.setStorage(appState);

  return appState;
}

export function App() {
  const [appState, setAppState] = useState(initialAppState);
  const [usersPositions, setUsersPositions] = useState<UsersPositions>({});
  const clearWatchIdRef = useRef(() => {});
  const clearWatchId = clearWatchIdRef.current;

  useEffect(() => {
    init().then(appState => {
      setAppState(appState);
      const watchResults = watchGeolocation({
        onPositionChange(coords) {
          setAppState({
            ...appState,
            user: {
              ...appState.user,
              coords,
            },
          });
        },
      });

      clearWatchIdRef.current = watchResults.clearWatchId;
    });

    return () => {
      clearWatchId();
    };
  }, []);

  useEffect(() => {
    AppStorage.syncAppStorage(appState);
    syncUserState(appState.user);
  }, [appState]);

  if (appState.isLoading) {
    return <Loader />;
  }

  return (
    <NativeBaseProvider>
      <NavigationContainer>
        <UsersPositionsContext.Provider
          value={{usersPositions, setUsersPositions}}>
          <AppContext.Provider value={{appState, setAppState}}>
            <AppNavigator />
          </AppContext.Provider>
        </UsersPositionsContext.Provider>
      </NavigationContainer>
    </NativeBaseProvider>
  );
}
