import { createContext, useContext } from 'react';

/**
 * Ob die mobile Navigation gerade offen ist.
 *
 * Gebraucht von fest positionierten Elementen, die sich über dem Inhalt
 * befinden und der aufgeklappten Navigation sonst im Weg lägen – allen voran
 * der Aktionsknopf unten rechts.
 */
const NavigationContext = createContext({ mobileOpened: false });

export function NavigationProvider({ mobileOpened, children }) {
  return (
    <NavigationContext.Provider value={{ mobileOpened }}>{children}</NavigationContext.Provider>
  );
}

/** True, solange das Navigationsmenü auf schmalen Bildschirmen ausgeklappt ist. */
export function useNavigationOpened() {
  return useContext(NavigationContext).mobileOpened;
}
