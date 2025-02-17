//////////////////////////////////////////////////////////////////////////////////////////
//   _  _ ____ _  _ ___  ____                                                           //
//   |_/  |__| |\ | |  \ |  |    This file belongs to Kando, the cross-platform         //
//   | \_ |  | | \| |__/ |__|    pie menu. Read more on github.com/kando-menu/kando     //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
// SPDX-License-Identifier: MIT

import { IBackendInfo, IVec2, IMenuItem, IAppSettings, IMenuSettings } from '../common';

// Declare the API to the host process. See preload.ts for more information on the exposed
// functions. The API has to be declared here again, because the TypeScript compiler
// does not know about preload.ts.
declare global {
  interface Window {
    api: {
      appSettings: {
        get: <K extends keyof IAppSettings>(key: K) => Promise<IAppSettings[K]>;
        set: <K extends keyof IAppSettings>(key: K, value: IAppSettings[K]) => void;
        onChange: <K extends keyof IAppSettings>(
          key: K,
          callback: (newValue: IAppSettings[K], oldValue: IAppSettings[K]) => void
        ) => void;
      };
      menuSettings: {
        get: () => Promise<IMenuSettings>;
        set: (data: IMenuSettings) => void;
        getCurrentMenu: () => Promise<number>;
      };
      getBackendInfo: () => Promise<IBackendInfo>;
      inhibitShortcuts: () => void;
      uninhibitShortcuts: () => void;
      showDevTools: () => void;
      movePointer: (dist: IVec2) => void;
      log: (message: string) => void;
      showMenu: (
        func: (root: IMenuItem, menuPosition: IVec2, windowSize: IVec2) => void
      ) => void;
      showEditor: (func: () => void) => void;
      hoverItem: (path: string) => void;
      unhoverItem: (path: string) => void;
      selectItem: (path: string) => void;
      cancelSelection: () => void;
    };
  }

  // These are set by webpack in webpack.plugins.ts so that we can use them in the
  // renderer process.
  declare const cIsMac: boolean;
  declare const cIsWindows: boolean;
  declare const cIsLinux: boolean;
}
